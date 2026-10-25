/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import * as fs from "fs";
import { arrForEach } from "@nevware21/ts-utils";
import { CoverageData, CoverageEntry, ICoverageFilter, ICoverageInstrumenter, ICoverageProvider, ICoverageReporter } from "./interfaces";
import { DefaultCoverageFilter } from "./filter";
import { createInstrumenter, extractSourceMap } from "./instrumenter";
import { NycCoverageReporter } from "./reporter";
import { findMatchingFiles } from "../internal/globMatcher";
import { _coverageSrcPatterns } from "../internal/coverageSrc";
import { _getCompileProvider } from "../execute/compile";

function _normalizePath(p: string): string {
    return String(p || "").replace(/\\/g, "/");
}

/**
 * A file with no functions, no branches, and at most one statement (the unavoidable
 * CommonJS module-registration line every transpiled file gets, even one with zero
 * runtime content) has nothing in it that test coverage could ever meaningfully measure --
 * this is the structural signature of a source file whose content is fully *erased* by
 * TypeScript (a pure `interface`/type-only declaration that produces no JavaScript at all).
 * Checking shape rather than matching the transpiler's exact boilerplate string keeps this
 * working across TypeScript versions/targets and alternate coverage instrumenters.
 */
export function _isErasedEntry(entry: CoverageEntry): boolean {
    const fnCount = entry.fnMap ? Object.keys(entry.fnMap).length : 0;
    const branchCount = entry.branchMap ? Object.keys(entry.branchMap).length : 0;
    const stmtCount = entry.statementMap ? Object.keys(entry.statementMap).length : 0;
    return fnCount === 0 && branchCount === 0 && stmtCount <= 1;
}

/**
 * The `"zero"` counterpart to {@link _asFullyCovered}: forces every hit count back to 0.
 * Needed because a genuinely erased (interface/type-only) file that some real module
 * `require()`s still gets a *real* coverage entry -- the transpiled CommonJS module-
 * registration statement actually executes when the module loads, so istanbul reports
 * it as hit (1) even though nothing in the original source could ever run. `"zero"` mode
 * is meant to report erased files at their computed/0% baseline regardless of that
 * incidental load-time hit, matching a never-`require()`d erased file's natural baseline.
 */
export function _asZeroCovered(entry: CoverageEntry): CoverageEntry {
    const zeroed: CoverageEntry = { ...entry };

    const s: { [id: string]: number } = {};
    arrForEach(Object.keys(entry.s || {}), (id) => {
        s[id] = 0;
    });
    zeroed.s = s;

    const f: { [id: string]: number } = {};
    arrForEach(Object.keys(entry.f || {}), (id) => {
        f[id] = 0;
    });
    zeroed.f = f;

    const b: { [id: string]: number[] } = {};
    arrForEach(Object.keys(entry.b || {}), (id) => {
        b[id] = (entry.b[id] || []).map(() => 0);
    });
    zeroed.b = b;

    return zeroed;
}

export function _asFullyCovered(entry: CoverageEntry): CoverageEntry {
    const covered: CoverageEntry = { ...entry };

    const stmtIds = Object.keys(entry.statementMap || {});
    if (stmtIds.length === 0) {
        // A genuinely empty file (nyc's own `--all` zero-fill can produce a completely empty
        // statementMap for some erased files -- not even the module-registration line the
        // browser/worker transpile always emits) has nothing whose hit count "full" mode could
        // flip to covered. istanbul's own reporters display such 0/0 files as 0% regardless of
        // intent (an explicit "isEmpty" override, not the underlying 100%-for-0/0 math) -- so
        // synthesize a single whole-file statement to give "full" mode something real to mark
        // covered, keeping its promise for these files too.
        covered.statementMap = { "0": { start: { line: 1, column: 0 }, end: { line: 1, column: 0 } } };
        covered.s = { "0": 1 };
        covered.fnMap = {};
        covered.f = {};
        covered.branchMap = {};
        covered.b = {};
        return covered;
    }

    const s: { [id: string]: number } = {};
    arrForEach(stmtIds, (id) => {
        s[id] = 1;
    });
    covered.s = s;

    const f: { [id: string]: number } = {};
    arrForEach(Object.keys(entry.f || {}), (id) => {
        f[id] = 1;
    });
    covered.f = f;

    const b: { [id: string]: number[] } = {};
    arrForEach(Object.keys(entry.b || {}), (id) => {
        b[id] = (entry.b[id] || []).map(() => 1);
    });
    covered.b = b;

    return covered;
}

/**
 * Default {@link ICoverageProvider} implementation.
 *
 * Wires together a {@link ICoverageInstrumenter}, {@link ICoverageFilter}, and
 * {@link ICoverageReporter} into the full coverage pipeline used by the runner.
 *
 * Any piece can be replaced by constructing a custom provider or by subclassing.
 */
export class DefaultCoverageProvider implements ICoverageProvider {
    readonly instrumenter: ICoverageInstrumenter;
    readonly filter: ICoverageFilter;
    readonly reporter: ICoverageReporter;
    private readonly _parsed: any;

    constructor(
        instrumenter: ICoverageInstrumenter,
        filter: ICoverageFilter,
        reporter: ICoverageReporter,
        parsed?: any
    ) {
        this.instrumenter = instrumenter;
        this.filter = filter;
        this.reporter = reporter;
        this._parsed = parsed;
    }

    instrumentPayload(payload: any, cwd: string, parsed: any): any {
        if (!payload || !payload.modules) {
            return payload;
        }

        // Identify entry points (excluded from instrumentation — they just re-export)
        const entryLookup: { [id: string]: boolean } = {};
        arrForEach(payload.entryIds || [], (entryId: string) => {
            entryLookup[String(entryId)] = true;
        });

        // Walk the dependency graph reachable from the entry points, plus tripwire's own
        // runtime entry (tripwireModuleId, eg. src/index.ts). Test files never literally
        // `require()` the runner/suite/reporter modules themselves -- describe/it/etc. reach
        // them only through the globals this module's own bootstrap installs (see
        // setTripwireGlobals) -- so without also seeding from tripwireModuleId here, this
        // purely-static require()-text walk can never discover runner.ts/suite.ts/
        // consoleReporter.ts/etc. at all: they'd be left un-instrumented (not just "0%
        // covered", genuinely never given coverage counters), and the run-level zero-fill
        // pass (fillUninstrumentedFiles) would then report them as 0% regardless of whether
        // they actually ran -- indistinguishable from a real gap in test coverage.
        // Also seed from coverageOnlyIds (execute.ts's --coverage-only src/**/*.ts enqueue,
        // force-required client-side purely for coverage -- see coverageOnlyIds' doc comment
        // in IRunPayload.ts): without this, a file only reachable via that eager load (never
        // actually require()'d by a test or by tripwireModuleId) would be served un-
        // instrumented, so requiring it still wouldn't produce any coverage counters at all.
        const reachable: { [id: string]: boolean } = {};
        const queue: string[] = [];
        const seedIds = (payload.entryIds || [])
            .concat(payload.tripwireModuleId ? [payload.tripwireModuleId] : [])
            .concat(payload.coverageOnlyIds || []);
        arrForEach(seedIds, (entryId: string) => {
            const id = String(entryId);
            if (!reachable[id]) {
                reachable[id] = true;
                queue.push(id);
            }
        });

        while (queue.length > 0) {
            const moduleId = queue.shift();
            if (!moduleId) {
                continue;
            }
            const source = payload.modules[moduleId];
            if (!source) {
                continue;
            }

            source.replace(
                /require\s*\(\s*["']([^"']+)["']\s*\)/g,
                (_match: string, depId: string) => {
                    const dep = String(depId);
                    if (!reachable[dep]) {
                        reachable[dep] = true;
                        queue.push(dep);
                    }
                    return _match;
                }
            );
        }

        const instrumentedModules: { [id: string]: string } = {};
        const moduleIds = Object.keys(payload.modules);

        for (let lp = 0; lp < moduleIds.length; lp++) {
            const moduleId = moduleIds[lp];
            const source = payload.modules[moduleId];

            if (!reachable[moduleId] || entryLookup[moduleId] || this.filter.isTestPath(moduleId) || !this.filter.isInScope(moduleId, cwd)) {
                instrumentedModules[moduleId] = source;
                continue;
            }

            try {
                const inputSourceMap = extractSourceMap(source, moduleId);
                // A purely type/interface-only file transpiles to little more than a CommonJS
                // module-registration stub with an *empty* `mappings` string (nothing in the
                // original .ts corresponds to it -- same root cause fillUninstrumentedFiles'
                // own doc comment covers for the zero-fill path). istanbul-lib-source-maps
                // can't remap a statement through an empty mapping, so nyc's report doesn't
                // just show the file oddly -- it silently drops the entire file from its
                // output, even though this real, executed coverage entry is genuinely present
                // and correct in coverage-final.json. Only pass the map through when it has
                // something to actually offer; otherwise instrument against the transpiled
                // JS's own positions, same fallback used elsewhere for this exact case.
                instrumentedModules[moduleId] = this.instrumenter.instrument(
                    source,
                    moduleId,
                    (inputSourceMap && inputSourceMap.mappings) ? inputSourceMap : undefined
                );
            } catch (e) {
                instrumentedModules[moduleId] = source;
            }
        }

        return {
            settings: payload.settings,
            tripwireModuleId: payload.tripwireModuleId,
            entryIds: payload.entryIds,
            modules: instrumentedModules
        };
    }

    writeCoverage(coverage: CoverageData | null, cwd: string, target: string): void {
        if (!coverage || typeof coverage !== "object") {
            return;
        }

        const withZeroCoverage = this.fillUninstrumentedFiles(coverage, cwd);
        const filtered = this.filter.filter(withZeroCoverage, cwd);

        if (!filtered || Object.keys(filtered).length === 0) {
            console.warn(
                "No non-test coverage entries available for " +
                (target === "worker" ? "worker" : "browser") + " report."
            );
            return;
        }

        this.reporter.write(filtered, cwd, target);
    }

    /**
     * A file nothing ever `require()`s during a given run never enters the module graph
     * built for that run, so it never gets a `window.__coverage__` entry at all -- it's
     * simply absent from `coverage`, rather than present with 0% like a genuinely untested
     * file should be. Left alone, that silently drops the file from the "All files" average
     * instead of dragging it down, making the report look better than the real test coverage.
     *
     * karma-typescript avoids this because its preprocessor instruments every file matching
     * its glob up front, whether or not anything ends up requiring it. nyc's own `all: true`
     * (already set in this project's `.nycrc`, used by the node target) does the same thing
     * by instrumenting every included file once at startup. This replicates that for the
     * browser/worker pipeline: any `src/**\/*.ts` file not already a key in `coverage` gets
     * instrumented in isolation -- never executed -- purely to obtain istanbul's zero-baseline
     * statement/branch/function map, which is then merged in so the file is honestly reported
     * as 0% covered instead of quietly omitted.
     */
    fillUninstrumentedFiles(coverage: CoverageData, cwd: string): CoverageData {
        const filled: CoverageData = { ...coverage };
        const existing: { [key: string]: boolean } = {};
        arrForEach(Object.keys(filled), (key) => {
            existing[_normalizePath(key).toLowerCase()] = true;
        });

        const allSrcFiles = findMatchingFiles(_coverageSrcPatterns(this._parsed), cwd);
        arrForEach(allSrcFiles, (filePath) => {
            const normalized = _normalizePath(filePath);
            if (existing[normalized.toLowerCase()]
                || this.filter.isTestPath(filePath)
                || /\/index\.ts$/i.test(normalized)) {
                return;
            }

            try {
                // eslint-disable-next-line security/detect-non-literal-fs-filename
                let source = fs.readFileSync(filePath, "utf8");
                source = _getCompileProvider().transpile(
                    filePath, source, cwd, true,
                    this._parsed && this._parsed.project ? this._parsed.project : undefined
                );

                // Extract and pass the inputSourceMap the same way instrumentPayload does for a
                // file actually reached by the run -- without it, istanbul positions every
                // statement against the *transpiled JS*, not the original .ts, which for a real
                // (non-erased) file is actively misleading: wrong line numbers in "Uncovered
                // Line #s", and a statement count/shape that reflects CommonJS boilerplate
                // structure rather than the source (eg. a small file getting an inflated count
                // from module-registration lines that don't correspond to anything a developer
                // would recognize). Only skipped when the map has nothing useful to offer: a
                // purely type/interface-only file transpiles to little more than a CommonJS
                // module-registration stub with an *empty* `mappings` string (nothing in the
                // original .ts corresponds to it) -- istanbul-lib-source-maps can't remap a
                // statement through an empty mapping, so nyc's own report would silently drop
                // the whole file rather than showing it at 0% -- exactly the opposite of this
                // method's purpose. Those (genuinely erased, guaranteed-0%) files fall back to
                // the transpiled-JS positions, same as before.
                const inputSourceMap = extractSourceMap(source, filePath);
                this.instrumenter.instrument(source, filePath, (inputSourceMap && inputSourceMap.mappings) ? inputSourceMap : undefined);

                const zeroEntry = this.instrumenter.getLastFileCoverage
                    ? this.instrumenter.getLastFileCoverage()
                    : null;
                if (zeroEntry) {
                    filled[normalized] = zeroEntry;
                }
            } catch (e) {
                // Best-effort: a file that only transpiles cleanly within its original
                // tsconfig project context (rather than in isolation) is skipped rather
                // than aborting the whole coverage report over it.
            }
        });

        return this._applyErasedCoverageMode(filled);
    }

    /**
     * Applies `erasedCoverageMode` across every entry, not just the synthetic zero-baseline
     * ones `fillUninstrumentedFiles` adds above for files nothing ever `require()`s. With
     * `--coverage`, execute.ts's `coverageOnlyIds` now force-`require()`s every `src/**\/*.ts`
     * file up front (see its own doc comment), so a genuinely erased file almost always
     * already has a *real* entry here -- its transpiled module-registration statement executed
     * on load, reporting hit (1) even though the original source has no runtime content.
     * Without this pass `erasedCoverageMode` would only ever reach the rare file that fails to
     * load at all, leaving the common case (an erased file some real module imports) always
     * reported as covered regardless of the configured mode.
     */
    private _applyErasedCoverageMode(coverage: CoverageData): CoverageData {
        const mode = (this._parsed && this._parsed.erasedCoverageMode) || "zero";
        const result: CoverageData = {};
        const keys = Object.keys(coverage);

        for (let lp = 0; lp < keys.length; lp++) {
            const key = keys[lp];
            const entry = coverage[key];

            if (!_isErasedEntry(entry)) {
                result[key] = entry;
                continue;
            }

            if (mode === "ignore") {
                continue;
            }

            result[key] = mode === "full" ? _asFullyCovered(entry) : _asZeroCovered(entry);
        }

        return result;
    }
}

/*
 * ---------------------------------------------------------------------------
 * Factory helpers
 * ---------------------------------------------------------------------------
 */

/**
 * Creates the default coverage provider using the given instrumenter module name.
 * `parsed` is the {@link ParsedArgs}-like object with `coverageInstrumenter` etc.
 */
export function createDefaultCoverageProvider(cwd: string, parsed: any): ICoverageProvider {
    const instrumenterName: string =
        (parsed && parsed.coverageInstrumenter
            ? String(parsed.coverageInstrumenter)
            : "istanbul-lib-instrument"
        ).trim();

    return new DefaultCoverageProvider(
        createInstrumenter(cwd, instrumenterName),
        new DefaultCoverageFilter(),
        new NycCoverageReporter(parsed && parsed.coverageReporters),
        parsed
    );
}
