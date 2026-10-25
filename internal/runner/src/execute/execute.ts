/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import * as path from "path";
import * as fs from "fs";
import { builtinModules, createRequire } from "module";
import { bold, brightCyan, cyan, gray, green, red, yellow } from "@nevware21/chromacon";
import { IHookFailure } from "@nevware21/tripwire";
import { _assertReporterTargetSupport, _createReporter } from "./reporter";
import { clearWalkCache, findMatchingFiles } from "../internal/globMatcher";
import { _coverageSrcPatterns } from "../internal/coverageSrc";
import { _applyIgnoredFilePatterns } from "./ignore";
import { _normalizePath } from "../internal/normalizePath";
import { _startServer } from "../server/server";
import { IServer } from "../interfaces/IServer";
import { ITripwireModule } from "../interfaces/ITripwireModule";
import { _preloadModules } from "./preloadModules";
import { _containsTypeScript } from "../internal/containsTypeScript";
import { _installGlobalApi } from "../internal/applyGlobal";
import { createGrepFilter, applyFilters } from "../shared/filters";
import { createBailListener } from "../shared/bailListener";
import { arrForEach, arrMap } from "@nevware21/ts-utils";
import { _resolveServerPolicy } from "../internal/resolveServerPolicy";
import { _createRunnerHost } from "./runnerHost";
import { _loadUxProvider } from "../client/loadUxProvider";
import { _getCompileCacheStatus, _getCompileProvider, _getProjectFileNames, _registerTypeScriptHook, _invalidateTypeScriptTranspileCache, _setGraphTypeCheck } from "./compile";
import { _findUncheckedFiles, _formatTypeCheckScope } from "../internal/typeCheckScope";
import { _isUserError, _userError } from "../internal/userError";
import { _resolveBrowserDependency, _runInteractiveBrowserTarget, IBrowserWorkerModuleGraph, IGraphBuilders } from "./browser";
import { _startBrowserRunnerSession } from "./browserRunner";
import { watchFiles } from "./targetSessionCache";
import { _launchPuppeteerBrowser, _runPuppeteerOnce, _runPuppeteerTarget, _warmUpPuppeteerBrowser } from "./puppeteer";
import { _startGraphWorker } from "./graphWorker";
import { _readPackageName } from "../internal/readPackage";

// This module is ESM (import/export), so there's no bare `require` in scope to read `.cache`
// off of -- createRequire(__filename) gets a real, native require function instead. Its `.cache`
// is Node's single process-wide module cache (the same one every require() in the process reads
// from/writes to, regardless of which require function produced it), which is exactly what the
// node target's `--watch` loop needs to evict from between iterations -- see
// _collectProjectRequireCacheFiles below.
const _nativeRequire = createRequire(__filename);

/**
 * Formats a `(label: Xms, label2: Yms)` timing breakdown, omitting any entry whose value is
 * 0ms so a phase that didn't apply to this run (eg. reporting on a non-coverage run) doesn't
 * clutter the line.
 * @param entries - Ordered `[label, ms]` pairs to render.
 * @returns The formatted breakdown, or an empty string if every entry was 0ms.
 */
function _formatTimingBreakdown(entries: Array<[string, number]>): string {
    const parts = entries.filter((entry) => entry[1] !== 0);
    if (parts.length === 0) {
        return "";
    }

    let result = gray(" (");
    for (let lp = 0; lp < parts.length; lp++) {
        if (lp > 0) {
            result += gray(", ");
        }
        result += gray(parts[lp][0] + ": ") + brightCyan(parts[lp][1] + "ms");
    }
    result += gray(")");

    return result;
}

/**
 * Resolves a run's test-file set: glob-match `patterns` under `cwd`, then drop anything
 * matching `ignore`. Shared by the node and browser/worker execution paths (and the
 * browser/worker companion-target resolution), which otherwise each ran this same
 * find-then-filter pair independently.
 */
function _resolveTestFiles(patterns: string[], ignore: string[], cwd: string): string[] {
    return _applyIgnoredFilePatterns(findMatchingFiles(patterns || [], cwd), cwd, ignore || []);
}

/**
 * The "nothing to run" error, raised identically by the node and both browser/worker discovery
 * paths.
 *
 * Almost always one of three things, none of which the bare pattern echo makes obvious: an
 * unquoted glob the shell already expanded (or failed to), a pattern written relative to
 * somewhere other than where tripwire was actually run from, or an `--ignore` that turned out
 * to cover everything. The hints name all three rather than making the user guess which.
 */
function _noFilesMatchedError(parsed: any, cwd: string): Error {
    const patterns = (parsed.patterns || []);
    const hints = [
        "Quote the pattern so the shell doesn't expand it first: tripwire \"test/**/*.test.ts\"",
        "Patterns are resolved relative to " + _normalizePath(cwd)
    ];

    if (parsed.ignore && parsed.ignore.length) {
        hints.push("Files matching --ignore were excluded: " + parsed.ignore.join(", "));
    }

    return _userError("No files matched: " + patterns.join(", "), hints);
}

/**
 * Prints the "Matched N file(s)" line and, when `--show-files` is set, the per-file listing
 * beneath it. Shared by the node and browser/worker execution paths.
 */
function _reportMatchedFiles(files: string[], showFiles: boolean, cwd: string): void {
    console.log(brightCyan("Matched " + files.length + " file(s)"));
    if (showFiles) {
        arrForEach(files, (file) => {
            console.log("  - " + gray(_normalizePath(path.relative(cwd, file))));
        });
    }
}

/**
 * Says what the compile cache did.
 *
 * Printed rather than kept to `--verbose` because the cache is otherwise entirely invisible: a run
 * that reuses everything and a run that recompiles from scratch produce identical output, differing
 * only in how long they take, which makes "is the cache even working?" impossible to answer from the
 * outside. When it did rebuild, the reason names the first input found to have changed.
 * @internal
 */
function _reportCompileCache(): void {
    const status = _getCompileCacheStatus();

    if (status.state === "reused") {
        // `reason` is set on a reuse only for the one case where reusing was not the whole story:
        // the compiled output was still good, but the run that produced it never type-checked, so
        // this run had to.
        console.log(cyan("Compile cache: ") + green("reused") +
            gray(status.checkSkipped ? " -- nothing changed, type-check skipped" : (status.reason ? " -- nothing changed, but " + status.reason : " -- nothing changed")));
    } else if (status.state === "rebuilt") {
        console.log(cyan("Compile cache: ") + brightCyan("rebuilt") + gray(status.reason ? " -- " + status.reason : ""));
    } else if (status.state === "isolated") {
        // Files have not been required yet when this prints, so there is no hit/miss count to give:
        // each one is reused or compiled as it loads.
        console.log(cyan("Compile cache: ") + green("isolated") + gray(status.reason ? " -- " + status.reason : ""));
    }
}

/**
 * Reconciles what the type-check covered with what the run matched, and says so when they
 * disagree.
 *
 * `--type-check` checks the tsconfig *project*; the run executes whatever the glob matched.
 * Nothing has ever made those agree, so a file outside the project's `include` runs without
 * ever being checked -- and the run still prints `Type-check completed`. Warning is the
 * default because the mismatch is often intentional (a shared helper compiled elsewhere);
 * `--strict-type-check` turns it into a failure for anyone who wants the guarantee the flag
 * name implies.
 *
 * @param files - The files this run resolved.
 * @param parsed - The parsed CLI arguments.
 * @param cwd - The current working directory.
 * @returns How many of the matched files the type-check actually covered, so the caller can
 * avoid announcing a completed check that covered nothing.
 * @throws When files are unchecked and `--strict-type-check` is set.
 */
function _checkTypeCheckScope(files: string[], parsed: any, cwd: string): number {
    const projectPath = path.resolve(cwd, parsed.project || "tsconfig.json");
    const projectFiles = _getProjectFileNames(parsed.project || "tsconfig.json", cwd);
    const strict = !!parsed.strictTypeCheck;
    let checked = 0;
    let lines: string[];

    if (!projectFiles || !projectFiles.length) {
        // A project that cannot be read resolves to no files, so the compile step has nothing to
        // check and returns instantly -- and, until this, still printed "Type-check completed".
        // A mistyped `-p` was therefore indistinguishable from a clean run.
        lines = [
            "the type-check covered no files: " + _normalizePath(path.relative(cwd, projectPath)) +
            (projectFiles ? " resolves to an empty file list." : " could not be read."),
            "Check the --project/-p path, and that its \"include\"/\"files\" match this project's layout."
        ];

        if (!strict) {
            lines.push("Use --strict-type-check to fail the run instead of warning.");
        }
    } else {
        const scope = _findUncheckedFiles(files, projectFiles, _isCaseSensitiveFileSystem());
        checked = scope.checked;

        if (!scope.unchecked.length) {
            return checked;
        }

        lines = _formatTypeCheckScope(scope, projectPath, cwd, strict);
    }

    if (strict) {
        throw _userError("Type-check scope: " + lines[0] + "\n" + lines.slice(1).join("\n"));
    }

    console.warn("");
    console.warn(yellow(bold("Warning: ") + lines[0]));
    for (let lp = 1; lp < lines.length; lp++) {
        console.warn(yellow(lines[lp]));
    }
    console.warn("");

    return checked;
}

/**
 * Whether the filesystem distinguishes case, decided the cheap way: if this file's own path
 * still resolves with its case inverted, it does not. Used only to decide how strictly to
 * compare two path lists, where guessing "insensitive" merely under-reports.
 */
function _isCaseSensitiveFileSystem(): boolean {
    const swapped = __filename.toUpperCase() === __filename ? __filename.toLowerCase() : __filename.toUpperCase();

    try {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        return !fs.existsSync(swapped);
    } catch (e) {
        return false;
    }
}

/**
 * Prints the `--fail-on-hook` report for every lifecycle hook that failed or timed out during the
 * run (see IHookFailure): a numbered block per failure, in the same shape the reporters use for
 * failed tests, since a hook failure otherwise leaves no trace in the pass/fail counts at all --
 * it belongs to no test.
 *
 * Without `--fail-on-hook` this stays a single warning line: the failures are still worth
 * surfacing (they used to be invisible), but only the flag makes them fail the run.
 * @returns true if the run should be treated as failed because of them.
 */
function _reportHookFailures(summary: any, failOnHook: boolean): boolean {
    const failures: IHookFailure[] = (summary && summary.hookFailures) || [];
    if (!failures.length) {
        return false;
    }

    const label = failures.length + " hook" + (failures.length === 1 ? "" : "s");

    if (!failOnHook) {
        console.log("");
        console.log(yellow(label + " failed during this run -- run with ") + bold(yellow("--fail-on-hook")) + yellow(" to fail the run on them."));
        return false;
    }

    console.log("");
    console.log(red(bold("  Hook failures (" + label + "):")));
    console.log("");

    for (let lp = 0; lp < failures.length; lp++) {
        const failure = failures[lp];
        const group = failure.group || "hook";
        // Unnamed hooks are recorded under their group's own name -- don't print it twice.
        const where = group + (failure.name && failure.name !== group ? " \"" + failure.name + "\"" : "")
            + (failure.suite ? " in " + failure.suite : "")
            + (failure.test ? " (test: " + failure.test + ")" : "");

        console.error("  " + red((lp + 1) + ") " + where + (failure.timedOut ? " -- timed out" : "")));
        console.error("     " + gray(failure.message));

        if (failure.stack) {
            // Abbreviated stack, matching the reporters' own failure blocks: the first line
            // just repeats the message already printed above.
            const lines = failure.stack.split("\n");
            for (let sl = 1; sl < lines.length && sl <= 5; sl++) {
                console.error("     " + gray(lines[sl]));
            }
        }

        console.log("");
    }

    console.error(red(bold("Run failed: " + label + " failed (--fail-on-hook).")));

    return true;
}

/**
 * Prints the final "Run summary"/"Total elapsed" lines and derives the process exit code.
 * Shared by the node and browser/worker execution paths, which otherwise each ran this same
 * report-then-decide-exit-code logic independently (and could silently drift out of sync with
 * each other, eg. one path's "no tests ran" check being fixed without the other).
 *
 * `summary.total` counts only the tests the run actually considered -- tests an active `--grep`
 * excluded are not counted (see `_countAll` in core's runner), so a `--grep` that matches nothing
 * lands on the `total === 0` check below and fails the run rather than reporting a silent,
 * all-skipped success. A typo'd pattern in CI is then a build failure, not a green run of
 * nothing.
 */
function _reportAndFinalize(summary: any, totalElapsed: number, breakdown: Array<[string, number]>, parsed: any): number {
    console.log("");
    console.log("Run summary: total=" + summary.total + " passed=" + summary.passed + " failed=" + summary.failed + " skipped=" + summary.skipped + " pending=" + summary.pending + " duration=" + summary.duration + "ms");
    console.log(gray("Total elapsed: ") + brightCyan(totalElapsed + "ms") + _formatTimingBreakdown(breakdown));

    // Reported before the "no tests were executed" bail-out below: a `before` hook that threw is
    // itself the most likely reason nothing ran, so it's the more useful message of the two.
    const hookFailed = _reportHookFailures(summary, !!(parsed && parsed.failOnHook));

    if (summary.total === 0) {
        const grep: RegExp[] = (parsed && parsed.grep) || [];
        if (grep.length) {
            // Tests were registered, the filter just matched none of them -- pointing at module
            // resolution here would send the reader looking in entirely the wrong place.
            const patterns = arrMap(grep, (pattern: RegExp) => pattern.source).join(", ");
            console.error("No tests matched " + (parsed.invert ? "--invert " : "") + "--grep " + patterns + ". Check the pattern, or drop it to run the full suite.");
        } else {
            console.error("No tests were executed. Verify imports resolve to the same tripwire runtime and that your files register tests.");
        }

        return 1;
    }

    return (summary.failed > 0 || hookFailed) ? 1 : 0;
}

/**
 * Every currently require()-cached module path under `cwd`, excluding node_modules -- what the
 * node target's `--watch` loop watches for changes, and (see `_executeNode` below) what it evicts
 * from Node's own require cache before each re-run. node_modules is excluded on the assumption
 * that a dependency changing underneath a running watch session isn't something to react to (and
 * including it would make watching e.g. this project's own already-built dist bundle trigger on
 * its own rebuild). The CLI's own entry script is excluded too, and separately from the
 * node_modules check: it's commonly *inside* `cwd` (eg. this project's own `core/bin/tripwire.js`)
 * but is the currently-running bundle itself, not something a test run loaded -- evicting it from
 * the cache would risk it being require()'d (and its whole bootstrap re-executed) if anything
 * ever referenced it again.
 */
function _collectProjectRequireCacheFiles(cwd: string): string[] {
    const cache = _nativeRequire.cache || {};
    const projectRoot = _normalizePath(path.resolve(cwd)).replace(/\/$/, "") + "/";
    const entryScript = process.argv[1] ? _normalizePath(path.resolve(process.argv[1])) : "";

    return Object.keys(cache).filter((filePath) => {
        const normalized = _normalizePath(filePath);
        if (normalized === entryScript) {
            return false;
        }
        return normalized.indexOf(projectRoot) === 0 && normalized.indexOf("/node_modules/") === -1;
    });
}

export async function _execute(tripwire: ITripwireModule, parsed: any) {
    const target = parsed.target || "node";

    // Before anything is compiled, served or launched: a custom reporter module is a node-side
    // require(), and the browser/worker targets build their reporters inside the page/worker.
    _assertReporterTargetSupport(parsed && parsed.reporter, target);

    if (target === "browser" || target === "worker") {
        return _executeBrowserWorker(parsed, target);
    }

    return _executeNode(tripwire, parsed);
}

/**
 * `--watch` for the node target: re-runs the whole one-shot pipeline below from scratch on every
 * change, same "simplest correct design" tradeoff as the browser/worker `--watch` loop (a fresh
 * run each time rather than trying to incrementally patch a live session). Unlike that loop,
 * though, this one stays in the *same* process across iterations -- there's no separate browser
 * page/navigation to isolate each run the way puppeteer.ts gets for free -- so before looping
 * back, every file this iteration actually require()'d gets evicted from Node's own require
 * cache. Without that, the next iteration's require() calls (both `_loadSuiteFiles`'s test files
 * and anything they transitively pull in) would just return what's already cached: the edited
 * file's new content would never be seen, and no describe()/it() would even re-run, since a
 * cached module's top-level code only ever executes on its *first* require().
 */
async function _executeNode(tripwire: ITripwireModule, parsed: any): Promise<number> {
    if (!parsed.watch) {
        return (await _executeNodeOnce(tripwire, parsed)).exitCode;
    }

    for (;;) {
        const result = await _executeNodeOnce(tripwire, parsed);
        console.log("");
        console.log(cyan("Watching ") + brightCyan(result.watchFiles.length + " file(s)") + cyan(" for changes... ") + gray("(Ctrl+C to stop)"));

        await new Promise<void>((resolve) => {
            const watcher = watchFiles(result.watchFiles, () => {
                watcher.close();
                resolve();
            });
        });

        arrForEach(result.watchFiles, (filePath) => {
            delete _nativeRequire.cache[filePath];
        });
    }
}

async function _executeNodeOnce(tripwire: ITripwireModule, parsed: any): Promise<{ exitCode: number, watchFiles: string[] }> {
    // One iteration of a `--watch` loop is one resolve pass. The cached filesystem walk is shared
    // *within* a pass (several callers resolve the same root); it must not survive into the next
    // one, or a test file created since the last iteration is never discovered -- the whole point
    // of watching. Harmless on the one-shot path, where the cache is empty anyway.
    clearWalkCache();

    const uxProvider = _loadUxProvider(parsed && parsed.uxProvider);
    const target = parsed.target || "node";

    const serverPolicy = _resolveServerPolicy(parsed, target, parsed.browserLaunch || "puppeteer");

    if (serverPolicy.warning) {
        console.warn(serverPolicy.warning);
    }

    const cwd = process.cwd();
    const executeStart = Date.now();

    if (parsed.preload && parsed.preload.length > 0) {
        _preloadModules(parsed.preload, cwd);
    }

    let files = _resolveTestFiles(parsed.patterns, parsed.ignore, cwd);
    if (!files.length) {
        throw _noFilesMatchedError(parsed, cwd);
    }

    _reportMatchedFiles(files, !!parsed.showFiles, cwd);

    const hasTypeScript = _containsTypeScript(files);

    if (hasTypeScript) {
        // `--compile`/`--type-check` used to also run a separate `tsc --noEmit` child process
        // here beforehand (compileTypeScript in ./compile, spawning a whole new Node
        // process to re-parse and re-check the entire project) before registering this same
        // require hook. registerTypeScriptHook now does that check itself, directly against
        // the Program it has to build anyway for emission -- same "fail the run on type
        // errors" behavior, without paying for a redundant second parse/check pass.
        if (parsed.compile) {
            console.log(cyan("Type-checking TypeScript project:") + " " + gray(path.resolve(cwd, parsed.project || "tsconfig.json")));
        }

        const compileStart = Date.now();
        _registerTypeScriptHook(parsed.project || "tsconfig.json", cwd, !!parsed.compile, parsed.tsconfigOverrides, {
            // The files this run matched: with them the type-check is rooted at the code the run can
            // actually reach rather than at every file the tsconfig happens to include.
            scopeFiles: files,
            incremental: parsed.incremental,
            isolatedTranspile: parsed.isolatedTranspile,
            emitCache: parsed.emitCache,
            typeCheckScope: parsed.typeCheckScope
        });

        if (parsed.compile) {
            // Reconcile *before* announcing anything: "Type-check completed" says the project
            // checked clean, which says nothing about whether the project covered the files
            // about to run -- and printing it above a warning that nothing was checked is how
            // a mistyped `-p` used to read as a clean run. See _checkTypeCheckScope.
            const checked = _checkTypeCheckScope(files, parsed, cwd);

            if (checked > 0) {
                console.log(cyan("Type-check completed in ") + brightCyan((Date.now() - compileStart) + "ms"));
            }
        }

        _reportCompileCache();
    }

    // `tripwire` (the parameter) is, by default, the pre-built dist bundle, resolved once at
    // CLI startup -- every test file this run loads, by contrast, is required by relative path
    // (eg. `../../../src/assert/expect`) and goes through the require hook above, transpiled
    // fresh from source, ie. two separately-compiled copies of the same code. Unifying them
    // (see tripwire.ts's `_loadTripwire`, opt-in via TRIPWIRE_PREFER_SOURCE) fixes real
    // coverage gaps in _configHost.ts/formatManager.ts/etc (their one-time init code otherwise
    // runs invisibly inside the untracked dist copy). This project's own suite/runner/
    // idGenerator meta-tests call `resetSuite`/`createSuite`/`_generateId` directly to test
    // those functions' own behavior in isolation, which used to be a hazard once instances were
    // unified: mutating the *same* state driving the overall run. suite.ts's `_context` and
    // idGenerator.ts's collision map now live on a shared global slot (mirroring
    // _configHost.ts's own _gblSlot) specifically so that hazard doesn't require two separate
    // module instances to avoid -- `useSuite()`'s existing save/restore of that slot already
    // isolates a meta-test's temporary suite from the real one regardless of how many copies
    // of suite.ts exist. Confirmed via idGenerator.test.ts/idGeneration.test.ts: the total is
    // the same (and 0 failures) whether or not TRIPWIRE_PREFER_SOURCE unifies the instances.
    const activeTripwire: ITripwireModule = tripwire;

    let sharedServer: IServer | null = null;
    let restoreRunnerConfig: (() => void) | null = null;

    try {
        if (serverPolicy.shouldStartServer) {
            sharedServer = await _startServer({
                logMsg: () => {
                    // Node test runs use this as a shared background API server.
                },
                getHomePageHtml: () => "<html><body>Tripwire Node Runner</body></html>",
                getApiHandler: () => undefined,
                getAsset: () => undefined,
                onComplete: () => {
                    // Not used for node target execution.
                },
                verbose: false,
                bindAddress: parsed.bindAddress,
                fsRoot: parsed.serverRoot ? path.resolve(parsed.serverRoot) : process.cwd(),
                browserStyle: parsed.browserStyle || "classic",
                getFsListingHtml: (style, relativePath, entries, extraHtml) => {
                    return uxProvider.createFsDirListingHtml(style as any, relativePath, entries, extraHtml);
                }
            });
        }

        activeTripwire.resetSuite();
        restoreRunnerConfig = _installGlobalApi(activeTripwire, parsed);

        const suite = activeTripwire.createSuite();
        const prepElapsed = Date.now() - executeStart;

        const compileStart = Date.now();
        await Promise.resolve(activeTripwire.useSuite(suite, () => {
            _loadSuiteFiles(files);
        }));
        const compileElapsed = Date.now() - compileStart;

        const reporterOptions: {
            slowThreshold?: number, showExecution?: boolean,
            console?: { log(msg: string): void, error(msg: string): void, write?(msg: string): void }
        } = {};
        if (parsed.slow !== undefined) {
            reporterOptions.slowThreshold = parsed.slow;
        }

        if (parsed.trace) {
            reporterOptions.showExecution = true;
        }

        // progress/landing/nyan redraw a single line in place via a raw, no-newline `write`
        // (see each reporter's own doc comment) instead of logging a fresh line per update --
        // only meaningful against a real terminal. Piped/non-TTY output (redirected to a file,
        // `| tee`, CI logs, etc.) keeps every reporter's safe default (each update logged as
        // its own line) since raw `\r`/cursor-return sequences would just read as garbled text
        // there, so `write` is only ever supplied when stdout is an actual TTY.
        if (process.stdout && process.stdout.isTTY) {
            reporterOptions.console = {
                log: (msg) => {
                    console.log(msg);
                },
                error: (msg) => {
                    console.error(msg);
                },
                write: (msg) => {
                    process.stdout.write(msg);
                }
            };
        }

        const runner = activeTripwire.createTestRunner(suite, _createRunnerHost(activeTripwire, sharedServer));

        // Both shared with the browser and worker targets (src/shared/) so `--grep`/`--invert`
        // match the same titles and `--bail` aborts on the same condition everywhere.
        applyFilters(runner, [createGrepFilter(parsed.grep, !!parsed.invert)]);

        if (parsed.bail) {
            runner.addListener(createBailListener());
        }

        // Mirrors mocha's --reporter: normally a single choice, but nothing stops registering
        // more than one at once (eg. "spec,xunit" for a human-readable console run that also
        // writes a CI-consumable result file) since every reporter is just an independent
        // IListener and the notification manager already fans events out to as many as are
        // registered.
        // A value that cannot be a built-in name (it carries a `/`, a `.` or a leading `@`, or is
        // explicitly `module:`-prefixed) is a custom reporter to require() from the project --
        // the same seam --ux-provider has, and the reason parseArgs lets such a value through its
        // name-list validation in the first place. See `_createReporter`.
        const reporterNames = (parsed.reporter && parsed.reporter.length) ? parsed.reporter : ["spec"];
        arrForEach(reporterNames, (name: string) => {
            const reporter = _createReporter(name, reporterOptions);
            runner.addListener(reporter.listener);
        });

        const testsStart = Date.now();
        // A `before`/`after` hook that throws doesn't complete the run, it rejects it -- letting
        // that propagate would abandon the run entirely (no summary, no reporter output, no
        // --fail-on-hook report), which is exactly the case those need to describe. Caught here
        // so the reporting below still happens; the run is failed regardless via `runError`.
        let runError: any;
        try {
            await runner.run();
        } catch (e) {
            runError = e;
        }
        const testsElapsed = Date.now() - testsStart;

        if (runError) {
            console.error(red("Run aborted: ") + (runError && runError.stack ? runError.stack : String(runError)));
        }

        const summary = runner.getResults();
        const totalElapsed = Date.now() - executeStart;
        // Coverage collection for the node target is handled externally by `nyc` wrapping this
        // whole process, and its own report is a separate, subsequent `coverage-report` command
        // invocation -- neither is part of this run, so reporting is always 0ms here.
        const reportElapsed = 0;

        const exitCode = _reportAndFinalize(summary, totalElapsed, [
            ["prep", prepElapsed], ["compile", compileElapsed], ["tests", testsElapsed], ["reporting", reportElapsed]
        ], parsed);

        return { exitCode: runError ? 1 : exitCode, watchFiles: _collectProjectRequireCacheFiles(cwd) };
    } finally {
        if (restoreRunnerConfig) {
            restoreRunnerConfig();
        }

        if (sharedServer) {
            await Promise.resolve(sharedServer.stop());
        }
    }
}

async function _executeBrowserWorker(parsed: any, target: string) {
    const browserLaunch = parsed.browserLaunch || "puppeteer";

    // --watch only means anything for the one-shot puppeteer launch -- open/manual already
    // auto-reload on change via the interactive page's own toggle (see targetSessionCache.ts's
    // watch:true wiring above), so there's nothing extra to loop here for those.
    if (parsed.watch && browserLaunch === "puppeteer") {
        return _executeBrowserWorkerPuppeteerWatch(parsed, target);
    }

    return (await _executeBrowserWorkerOnce(parsed, target)).exitCode;
}

/**
 * `--watch` for the one-shot puppeteer launch. A plain (non-watch) puppeteer run builds its
 * module graph eagerly and tears the whole session (server included) down the moment it
 * completes -- fine for a single run, but repeating that every watch iteration means nothing is
 * listening at all in the gaps between runs, so a real browser pointed at the last-printed URL
 * just fails to respond. Instead, this starts *one* long-lived session up front -- the same lazy,
 * staleness-checking machinery `--browser-launch open`/`manual` uses -- and repeatedly visits it
 * with a fresh puppeteer browser per iteration (see puppeteer.ts's `_runPuppeteerOnce`), tearing
 * the session down only when the loop itself ends (Ctrl+C). Because the server stays up the whole
 * time, opening the printed URL manually at any point -- including mid-wait between iterations --
 * works exactly like an interactive session would, rebuilding on request if anything changed.
 */
async function _executeBrowserWorkerPuppeteerWatch(parsed: any, target: string): Promise<never> {
    const cwd = process.cwd();
    const serverPolicy = _resolveServerPolicy(parsed, target, "puppeteer");
    if (serverPolicy.warning) {
        console.warn(serverPolicy.warning);
    }

    if (!serverPolicy.shouldStartServer) {
        throw _userError("--no-server is not supported for " + target + " target when --browser-launch is 'puppeteer'.", [
            "The " + target + " target loads its test modules over HTTP -- there is no other way to reach them.",
            "Drop --no-server, or run this suite against --target node."
        ]);
    }

    const preloadFiles = _resolvePreloadPathsForBrowser(parsed.preload || [], cwd);
    const launchTarget: "browser" | "worker" = target === "worker" ? "worker" : "browser";

    const resolveFilesForTarget = (forTarget: "browser" | "worker"): string[] => {
        const targetPatterns = _getCompanionTargetPatterns(parsed.patterns || [], launchTarget, forTarget);
        let targetFiles = _resolveTestFiles(targetPatterns, parsed.ignore, cwd);
        if (preloadFiles.length > 0) {
            targetFiles = preloadFiles.concat(targetFiles);
        }
        return targetFiles;
    };

    const files = resolveFilesForTarget(launchTarget);
    if (!files.length) {
        throw _noFilesMatchedError(parsed, cwd);
    }

    _reportMatchedFiles(files, !!parsed.showFiles, cwd);

    // Same type-check wiring as the one-shot path below: without it `--type-check --watch` on
    // browser/worker reported nothing and `--strict-type-check` could never fail. The flag is
    // module-level and the checked-program set is cleared with the program cache, so setting it
    // once here covers every rebuild the loop performs.
    const hasTypeScript = _containsTypeScript(files);
    _setGraphTypeCheck(!!parsed.compile && hasTypeScript);
    if (parsed.compile && hasTypeScript) {
        console.log(cyan("Type-checking TypeScript project:") + " " + gray(path.resolve(cwd, parsed.project || "tsconfig.json")));
    }

    console.log(cyan("Launching ") + brightCyan(target) + cyan(" target via Puppeteer (--watch)..."));

    // Lazy, staleness-checking builders -- the same shape the interactive (open/manual) branch
    // above uses, since this session needs to stay correct across many rebuilds, not just build
    // once. watch:false: the loop below already owns "wait for a change, then re-run" via its own
    // watchFiles() call using the freshly built graph's own file list each iteration
    // (session.getWatchFiles) -- a second, independent background watcher over the same files via
    // the cache's own watch:true would just be redundant.
    const sessionBuilders: IGraphBuilders = {
        resolveEntryFiles: (forTarget: "browser" | "worker") => resolveFilesForTarget(forTarget),
        buildGraph: (_forTarget: "browser" | "worker", entryFiles: string[]) => _createBrowserWorkerModuleGraph(entryFiles, cwd, parsed),
        watch: false
    };

    const session = await _startBrowserRunnerSession(sessionBuilders, parsed);

    try {
        for (;;) {
            const iterationStart = Date.now();

            const iterationFiles = resolveFilesForTarget(launchTarget);

            // Build before visiting, so a compile or type error is reported here and the loop
            // keeps watching -- served lazily it reached the page as a bare HTTP 500 and the run
            // never finished. The scope reconciliation sits inside the same guard: under
            // `--strict-type-check` it throws, and in watch mode a newly added out-of-project file
            // should be reported and watched, not end the session. The cache keeps the last good
            // build, so `getWatchFiles` still names the files to wait on; on a first-iteration
            // failure it has nothing yet, and the resolved entry files stand in.
            let built = true;
            try {
                if (parsed.compile && hasTypeScript) {
                    // Re-resolved each iteration: a file added since the last run may sit outside
                    // the project, and that is exactly what this reconciliation reports.
                    _checkTypeCheckScope(iterationFiles, parsed, cwd);
                }

                session.prepare(launchTarget);
            } catch (e) {
                built = false;
                console.log("");
                console.log(red("Compile failed: ") + String(e && (e as any).message ? (e as any).message : e));
            }

            if (built) {
                const result = await _runPuppeteerOnce(session, target, parsed);
                const totalElapsed = Date.now() - iterationStart;

                _reportAndFinalize(result.summary, totalElapsed, [
                    ["tests", result.testMs], ["reporting", result.reportMs]
                ], parsed);
            }

            let filesToWatch = session.getWatchFiles(launchTarget);
            if (!filesToWatch.length) {
                filesToWatch = iterationFiles;
            }
            console.log("");
            console.log(cyan("Watching ") + brightCyan(filesToWatch.length + " file(s)") + cyan(" for changes... ") + gray("(Ctrl+C to stop)"));

            await new Promise<void>((resolve) => {
                const watcher = watchFiles(filesToWatch, () => {
                    watcher.close();
                    resolve();
                });
            });

            // Something on disk just changed, and this session outlives it -- drop the cached walk
            // so the rebuild's `resolveEntryFiles` can see files added since the last iteration.
            clearWalkCache();
        }
    } finally {
        await Promise.resolve(session.server.stop()).catch(() => {
            // Best-effort teardown on the way out (Ctrl+C/unwind) -- nothing left to report to.
        });
        session.dispose();
    }
}

/**
 * Runs the browser/worker target exactly once, end to end (file discovery through report),
 * building a fresh eager graph (puppeteer) or a fresh lazy session (interactive) and tearing it
 * all the way down afterward -- used for every non-watch launch. `--watch` puppeteer runs
 * (`_executeBrowserWorkerPuppeteerWatch` above) deliberately don't call this repeatedly: keeping
 * a *single* long-lived session across iterations (rather than a brand new one every time, which
 * is all this function ever builds) is exactly what keeps the server responsive to a manually-
 * opened browser between iterations.
 */
async function _executeBrowserWorkerOnce(parsed: any, target: string): Promise<{ exitCode: number }> {
    const cwd = process.cwd();
    const executeStart = Date.now();
    const browserLaunch = parsed.browserLaunch || "puppeteer";
    const serverPolicy = _resolveServerPolicy(parsed, target, browserLaunch);
    if (serverPolicy.warning) {
        console.warn(serverPolicy.warning);
    }

    if (!serverPolicy.shouldStartServer) {
        throw _userError("--no-server is not supported for " + target + " target when --browser-launch is '" + browserLaunch + "'.", [
            "The " + target + " target loads its test modules over HTTP -- there is no other way to reach them.",
            "Drop --no-server, or run this suite against --target node."
        ]);
    }

    // Chrome's launch is a separate OS process with no dependency on file discovery or the
    // module graph build below -- start it immediately so the two overlap instead of running
    // back-to-back. Previously this was only kicked off inside _runPuppeteerTarget, so it only
    // overlapped with _startBrowserRunnerSession's (bundle/coverage) work, missing the much
    // larger file-discovery + module-graph-build phase that runs before it.
    const browserPromise = browserLaunch === "puppeteer" ? _launchPuppeteerBrowser(cwd) : undefined;

    const browserStyle = parsed.browserStyle || "classic";
    // Exactly one of these two is ever populated, depending on the `browserLaunch === "puppeteer"`
    // branch below -- left as `any` (rather than a `| undefined` union needing a non-null
    // assertion at the call site further down) since only one is ever read, and only after the
    // same branch condition that decided which one to set.
    let moduleGraphsByTarget: any;
    let sessionBuilders: any;
    let prepElapsed: number;
    let compileElapsed: number;
    // Both in flight across the module graph build below -- see the ordering note where they start.
    let warmUpPromise: Promise<void> | undefined;
    let graphPromise: Promise<IBrowserWorkerModuleGraph> | null = null;

    try {
        const preloadFiles = _resolvePreloadPathsForBrowser(parsed.preload || [], cwd);

        // The CLI's original --target, fixed for the life of this run -- the glob the CLI was
        // given (eg. test:browser's "!(node|worker)") was written assuming this target, so
        // it's the fixed point every other target's pattern gets derived from below.
        const launchTarget: "browser" | "worker" = target === "worker" ? "worker" : "browser";

        const resolveFilesForTarget = (forTarget: "browser" | "worker"): string[] => {
            const targetPatterns = _getCompanionTargetPatterns(parsed.patterns || [], launchTarget, forTarget);
            let targetFiles = _resolveTestFiles(targetPatterns, parsed.ignore, cwd);
            if (preloadFiles.length > 0) {
                targetFiles = preloadFiles.concat(targetFiles);
            }
            return targetFiles;
        };

        const files = resolveFilesForTarget(launchTarget);

        if (!files.length) {
            throw _noFilesMatchedError(parsed, cwd);
        }

        _reportMatchedFiles(files, !!parsed.showFiles, cwd);

        const hasTypeScript = _containsTypeScript(files);

        // Type errors are reported on this path as well as on node. There is no separate
        // compile to skip: the module graph has to build a ts.Program to emit from anyway,
        // and _setGraphTypeCheck makes the checker walk that same Program once, when it is
        // created. No second parse, no `tsc` child process.
        //
        // This used to print "Skipping pre-run no-emit compile ... module graph transpilation
        // uses project", which was true of the project *walk* and false of the diagnostics --
        // so --type-check --target browser type-checked nothing while reading like an
        // optimisation, and a file with a real type error ran green.
        _setGraphTypeCheck(!!parsed.compile && hasTypeScript);

        if (parsed.compile && hasTypeScript) {
            console.log(cyan("Type-checking TypeScript project:") + " " + gray(path.resolve(cwd, parsed.project || "tsconfig.json")));

            // The project is the unit of compilation, but the run executes whatever the glob
            // matched. A matched file outside the project is transpiled by being appended to
            // the program ad hoc, so it runs with none of the project's checking behind it --
            // same blind spot as the node path, and the same reconciliation.
            _checkTypeCheckScope(files, parsed, cwd);
        }

        if (browserLaunch === "puppeteer") {
            console.log(cyan("Launching ") + brightCyan(target) + cyan(" target via Puppeteer..."));
        } else {
            console.log(cyan("Launching ") + brightCyan(target) + cyan(" target via browser UI (mode: ") + brightCyan(browserLaunch) + cyan(", style: ") + brightCyan(browserStyle) + cyan(")..."));
        }

        /*
          * Three things have to happen before the first test can run: Chrome has to launch, Chrome
          * has to get its one-time first-navigation initialisation over with (~6s, see
          * _warmUpPuppeteerBrowser), and the module graph has to be built (~4s). They are entirely
          * independent, so the run takes as long as the slowest rather than the sum -- but only if
          * this thread is free to start them.
          *
          * That is what `_startGraphWorker` is for. The build is synchronous, and while it runs
          * nothing else here progresses: `puppeteer.launch()` cannot even settle, because finishing
          * it means reading the DevTools endpoint Chrome prints and connecting to it, which is I/O
          * this loop has to service. Measured: a launch taking ~0.7s with a free loop had still not
          * completed after a 3s block, finishing at 4.8s. Moving the build to its own thread leaves
          * the loop free, so the launch settles while the build runs and the warm-up can be chained
          * straight onto it.
          *
          * When a worker is not available the build happens here as before, and the browser is then
          * waited for *first* -- with the loop about to be blocked, starting the warm-up late is
          * worse than giving up the launch's overlap.
          */
        if (browserLaunch === "puppeteer") {
            graphPromise = _startGraphWorker(files, cwd, parsed, !!parsed.compile && hasTypeScript, __filename);
        }

        if (browserPromise) {
            warmUpPromise = graphPromise
                ? browserPromise.then((browser) => _warmUpPuppeteerBrowser(browser))
                : _warmUpPuppeteerBrowser(await browserPromise);

            // Nothing awaits this until after the module graph is built, which with --graph-thread
            // is seconds away -- and if the build throws first, nothing awaits it at all. A rejection
            // in that window (Chrome missing, or crashing during the warm-up) was therefore an
            // unhandledRejection, which kills the process with a raw stack instead of the CLI error
            // _reportCliError would have printed. Marking it handled here changes nothing about the
            // error itself: the await below still sees the same rejection and reports it the normal
            // way, and when there is no await the failure belonged to a launch being abandoned
            // anyway.
            warmUpPromise.catch(() => {
                // Reported by the await below, or deliberately dropped along with the launch.
            });
        }

        prepElapsed = Date.now() - executeStart;

        if (browserLaunch === "puppeteer") {
            // One-shot, single-process launch -- no session to keep fresh afterward, so this stays
            // eager (and keeps overlapping with the browser work started above).
            let primaryGraph: IBrowserWorkerModuleGraph | undefined;

            if (graphPromise) {
                try {
                    primaryGraph = await graphPromise;
                } catch (e) {
                    // A build that failed on its own terms (a type error, most often) is the user's
                    // to see -- rebuilding here would only reach the same error and report it twice.
                    if (_isUserError(e)) {
                        throw e;
                    }

                    // The worker itself failed, which says nothing about the build: do it here.
                    primaryGraph = undefined;
                }
            }

            if (!primaryGraph) {
                primaryGraph = _createBrowserWorkerModuleGraph(files, cwd, parsed);
            }

            moduleGraphsByTarget = {
                browser: primaryGraph,
                worker: primaryGraph
            };
            compileElapsed = primaryGraph.elapsedMs;
        } else {
            // Interactive (open/manual): don't build anything yet. `_runInteractiveBrowserTarget`
            // builds each target lazily, the first time it's actually requested, via a per-target
            // cache (targetSessionCache.ts) that also detects staleness and rebuilds on later
            // requests -- fixes both "open mode never had a worker graph to switch to" and
            // "nothing was ever rebuilt after a source file changed" in one mechanism.
            sessionBuilders = {
                resolveEntryFiles: (forTarget: "browser" | "worker") => {
                    // Each call is a rebuild of a session that outlives filesystem changes -- the
                    // cache detects a *stale graph*, but the file list feeding it has to be re-read
                    // too, or a test file added mid-session never enters the graph at all.
                    clearWalkCache();
                    return resolveFilesForTarget(forTarget);
                },
                buildGraph: (_forTarget: "browser" | "worker", entryFiles: string[]) => _createBrowserWorkerModuleGraph(entryFiles, cwd, parsed),
                // A long-lived interactive session is exactly what background pre-warming
                // exists for -- see targetSessionCache.ts's watch option doc comment.
                watch: true
            } as IGraphBuilders;
            compileElapsed = 0;
        }
    } catch (e) {
        // File discovery/module-graph build failed before _runPuppeteerTarget got a chance to
        // take ownership of (and close) the browser it started above -- close it here instead
        // of leaking a launched-but-never-used Chrome process.
        if (browserPromise) {
            await browserPromise.then((browser) => browser.close(), () => {
                // Launch itself failed -- nothing to close.
            });
        }
        throw e;
    }

    if (warmUpPromise) {
        // Whatever is left of the initialisation after the build -- usually nothing, since the two
        // ran together. Awaited before anything navigates for real, because the warm-up holds the
        // very page the run is about to use.
        await warmUpPromise;
    }

    if (browserLaunch === "puppeteer") {
        console.log(gray("Ready to run tests after ") + brightCyan((prepElapsed + compileElapsed) + "ms")
            + _formatTimingBreakdown([["prep", prepElapsed], ["compile", compileElapsed]]));
    } else {
        console.log(gray("Ready after ") + brightCyan(prepElapsed + "ms") + gray(" -- each target's test modules build on first request."));
    }

    const { summary, testMs, reportMs } = browserLaunch === "puppeteer"
        ? await _runPuppeteerTarget(target, moduleGraphsByTarget, parsed, browserPromise)
        : await _runInteractiveBrowserTarget(target, sessionBuilders, parsed, browserLaunch);
    const totalElapsed = Date.now() - executeStart;

    const exitCode = _reportAndFinalize(summary, totalElapsed, [
        ["prep", prepElapsed], ["compile", compileElapsed], ["tests", testMs], ["reporting", reportMs]
    ], parsed);

    return { exitCode };
}

function _loadSuiteFiles(files: string[]) {
    arrForEach(files, (filePath: string) => {
        try {
            // eslint-disable-next-line security/detect-non-literal-require, @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
            require(filePath);
        } catch (e: any) {
            const msg = (e === null || e === void 0 ? void 0 : e.stack) ? e.stack : String(e);
            // The failure is in the user's own test file and `msg` already carries its stack --
            // the CLI's own frames on top of that would only push it off the screen.
            throw _userError("Failed to load '" + filePath + "'\n" + msg);
        }
    });
}

function _resolvePreloadPathsForBrowser(preloadModules: string[], cwd: string): string[] {
    const preloadFiles: string[] = [];
    arrForEach(preloadModules, (mod) => {
        if (!mod) {
            return;
        }
        if (mod.indexOf(".") === 0 || mod.indexOf("/") === 0 || mod.indexOf("\\") === 0) {
            const resolved = path.resolve(cwd, mod);
            // eslint-disable-next-line security/detect-non-literal-fs-filename
            if (!fs.existsSync(resolved)) {
                throw _userError("Preload file not found: " + resolved, [
                    "--require/--file paths are resolved relative to " + _normalizePath(cwd) + "."
                ]);
            }
            preloadFiles.push(resolved);
            return;
        }
        throw _userError("Browser/worker preload currently supports file paths only. Unsupported preload module: " + mod, [
            "Use a relative path (./setup.ts) rather than a package name for browser/worker runs."
        ]);
    });
    return preloadFiles;
}

export function _createBrowserWorkerModuleGraph(entryFiles: string[], cwd: string, parsed: any): { modules: Record<string, string>, entryIds: string[], tripwireModuleId: string, coverageOnlyIds: string[], moduleUrls: Record<string, string>, rawAssets: Record<string, string>, elapsedMs: number } {
    // Every call here is either the first build for a target or one targetSessionCache.ts
    // already decided is genuinely needed (a file's mtime or the entry-file list changed) --
    // never a redundant/speculative one -- so unconditionally discarding the TypeScript compile
    // provider's cached Program is exactly scoped to real rebuilds. Without this, a long-lived
    // --watch process would keep re-emitting whatever was transpiled the *first* time a file was
    // seen: the target session cache's own staleness check (mtime-based) still correctly detects
    // the edit and triggers this rebuild, but the actual JS content served afterward would never
    // change, since ts.Program is an immutable snapshot of file content taken when it was first
    // created -- see invalidateTypeScriptProgramCache's doc comment.
    _invalidateTypeScriptTranspileCache();

    const _graphStart = Date.now();
    // Two independent reasons a map might be needed here, with different rules for each:
    //
    // 1. DevTools debugging (a human stepping through real src/*.ts). Pure download+parse
    //    overhead -- measured at ~3-4x the served size of the actual executable code per
    //    module -- for anyone not actually watching, so it's opt-in via
    //    --source-maps/--no-source-maps (default off), and never generated for a puppeteer
    //    (headless, non-interactive) launch regardless of that flag: nobody's DevTools is
    //    even attached to fetch it.
    //
    // 2. Coverage's own line-number attribution. istanbul-lib-instrument, given an
    //    inputSourceMap (see instrumentPayload in codecov/provider.ts, which extracts
    //    whatever map is embedded in this function's transpiled output), embeds it into
    //    each coverage entry's own `inputSourceMap` field -- nyc's report step later uses
    //    *that* to remap statement positions back to the original TypeScript. Without a
    //    map here, coverage is instrumented directly against the transpiled JS, which can
    //    differ substantially in line count/structure from the source it's still labeled
    //    as (eg. a multi-line licence-comment header collapsing away, imports flattening to
    //    single-line requires) -- "Uncovered Line #s" ends up pointing at an invisible,
    //    never-served JS file's lines, not the real source. This is never about DevTools or
    //    live debugging, so the puppeteer exclusion above doesn't apply: whenever --coverage
    //    is on, a map is needed for the report to be meaningful, headless or not.
    const generateSourceMaps = !!(parsed && parsed.coverage)
        || (!!(parsed && parsed.sourceMaps) && parsed.browserLaunch !== "puppeteer");
    const modules: Record<string, string> = {};
    const queued: Record<string, boolean> = {};
    const entryIds: string[] = [];
    const queue: string[] = [];
    // Each module is served as a real, individually-fetchable network resource (a
    // <script>/importScripts URL) rather than eval'd from an inlined JSON payload.
    // moduleUrls maps moduleId (the require()-rewritten id, an absolute fs path or
    // virtual /__tripwire__/... id) -> the URL its wrapped, executable content is served
    // at. rawAssets maps a synthetic URL -> absolute fs path for sibling files (e.g.
    // vendor .js.map files) that need to be served unmodified, by URL, for DevTools to
    // resolve "view original source" -- these are never require()'d, so they only need a
    // URL, not a moduleId.
    const moduleUrls: Record<string, string> = {};
    const rawAssets: Record<string, string> = {};
    // Browser/worker runs consume the pre-built dist bundle rather than resolving
    // tripwire's own runtime from source. Source-first lets module-level singletons
    // (assertConfig, the negation-chain state, the current-host stack in
    // internal/_configHost.ts) be one shared instance across everything, instead of one
    // copy self-contained inside the bundle and a second, independent copy individually
    // loaded for anything a test imports directly by relative path -- which is precisely
    // why assertion notifications didn't reach the browser/worker UI (see
    // core/src/config/assertConfig.ts's addAssertionListener/removeAssertionListener,
    // added as an interim, host-aware way to attach a listener without needing this), and
    // why _configHost.ts/suite.ts/formatManager.ts/_defaultFormatters.ts's own one-time
    // singleton-init code showed as uncovered under coverage -- whichever copy won the
    // race to initialize first "used up" that code path invisibly to whichever copy
    // coverage instrumented.
    //
    // Previously tried twice and reverted both times after what looked like a regression:
    // (1) internal self-references to the package by name
    // (`import { X } from "@nevware21/tripwire"`, used throughout core/src) got
    // re-resolved via require.resolve()'s own package/node_modules lookup, landing back
    // on the dist bundle -- reintroducing the exact split this would be meant to
    // eliminate. Fixed below regardless (redirects every "@nevware21/tripwire" require()
    // straight to the already-resolved tripwireModuleId, harmless whichever way
    // preferSourceTripwire is set). (2) Total test count jumped from 2618 to 2667 and was
    // treated as an unexplained duplication regression. It wasn't: suite.ts's root-suite
    // context (`_context`) and idGenerator.ts's collision map were plain module-scoped
    // `let`s, so the dist copy (bootstrapped for describe/it globals) and the source copy
    // (loaded for anything a test imports by relative path, eg. onlyFilter.test.ts's own
    // `import { describe } from "../../../../src/suite/suite"`) each built an independent,
    // orphaned root-suite tree -- tests registered through whichever copy the runner
    // *wasn't* walking were silently never run at all, not duplicated. The "jump" was
    // those previously-invisible tests becoming visible once both loads shared state.
    // suite.ts and idGenerator.ts now store that state on a shared global slot (mirroring
    // _configHost.ts's own _gblSlot, see their doc comments), fixing the orphaned-tree
    // problem regardless of preferSourceTripwire, which is why re-enabling this is safe.
    const preferSourceTripwire = true;
    const tripwireModuleId = _normalizeModuleId(_resolveTripwireModulePath(cwd, preferSourceTripwire));
    const tripwirePackageName = "@nevware21/tripwire";
    const chromaconBrowserModuleId = _normalizeModuleId(_resolveChromaconBrowserModulePath(cwd));
    const osShimModuleId = "/__tripwire__/browser/os-shim.js";
    // Virtual modules already have a valid, servable URL as their id -- register it
    // directly, since the main loop's `modules[moduleId] !== undefined` fast-path skips
    // URL minting for anything pre-populated here.
    moduleUrls[osShimModuleId] = osShimModuleId;
    modules[osShimModuleId] = [
        "module.exports = {",
        "  EOL: '\\n',",
        "  platform: function() { return 'linux'; },",
        "  type: function() { return 'Linux'; },",
        "  release: function() { return '6.0.0'; },",
        "  arch: function() { return 'x64'; },",
        "  cpus: function() { return []; },",
        "  homedir: function() { return '/home/browser'; },",
        "  tmpdir: function() { return '/tmp'; },",
        "  networkInterfaces: function() { return {}; },",
        "  userInfo: function() { return { username: 'browser' }; }",
        "};"
    ].join("\n");
    function _enqueue(filePath: string): string {
        const id = filePath.indexOf("/__tripwire__/") === 0 ? filePath : _normalizeModuleId(filePath);
        if (!queued[id]) {
            queued[id] = true;
            queue.push(id);
        }
        return id;
    }
    _enqueue(tripwireModuleId);
    arrForEach(entryFiles, (filePath: string) => {
        entryIds.push(_enqueue(filePath));
    });

    // --coverage: enqueue every src/**/*.ts file under cwd, not just what's transitively
    // require()d by an actual test entry point -- mirrors karma-typescript/nyc's `all: true`,
    // which both load every file in their configured scope regardless of whether any test
    // imports it, so an unreferenced-but-real file gets genuine execution-based coverage
    // instead of fillUninstrumentedFiles' synthetic (coverage.ts's own zero-fill, still the
    // fallback for anything that fails to load here) guess. The client force-require()s each
    // of these once at runtime purely to trigger its module-load side effects (see
    // coverageOnlyIds' use in frame-mode.ts/workerRunner.ts); provider.ts's own reachability
    // walk is seeded from this same list so they're actually instrumented, not just fetched.
    const coverageOnlyIds: string[] = [];
    if (parsed && parsed.coverage) {
        const coverageSrcFiles = findMatchingFiles(_coverageSrcPatterns(parsed), cwd);
        arrForEach(coverageSrcFiles, (filePath: string) => {
            coverageOnlyIds.push(_enqueue(filePath));
        });
    }

    let _processed = 0;
    const _isTTY = !!(process.stdout && process.stdout.isTTY);
    if (_isTTY) {
        process.stdout.write(gray("  Processing modules [0 done | " + queue.length + " queued]..."));
    }

    while (queue.length > 0) {
        const moduleId = queue.shift();
        if (!moduleId) {
            continue;
        }

        _processed++;
        if (_isTTY) {
            const _shortId = moduleId.startsWith("/__tripwire__/") ? moduleId : path.relative(cwd, moduleId).replace(/\\/g, "/");
            const _line = "  Processing modules [" + _processed + " done | " + queue.length + " queued] " + _shortId;
            process.stdout.write("\r" + gray(_line) + " ".repeat(Math.max(0, 120 - _line.length)));
        }

        if (modules[moduleId] !== undefined) {
            continue;
        }
        const ext = path.extname(moduleId).toLowerCase();
        if (ext === ".json") {
            // eslint-disable-next-line security/detect-non-literal-fs-filename
            const jsonText = fs.readFileSync(moduleId, "utf8");
            modules[moduleId] = "module.exports = " + jsonText + ";";
            _toModuleAssetUrl(moduleId, cwd, moduleUrls);
            continue;
        }
        if (ext === ".node") {
            throw _userError("Native module is not supported in browser/worker target: " + moduleId, [
                "Run this suite with --target node, or exclude the file that pulls it in with --ignore."
            ]);
        }

        // eslint-disable-next-line security/detect-non-literal-fs-filename
        let source: string = fs.readFileSync(moduleId, "utf8");
        if (ext === ".ts" || ext === ".tsx") {
            /*
             * Emit inline sourcemaps for interactive (open/manual) launches so tests and
             * support files are debuggable in browser DevTools; skipped for puppeteer runs
             * (see generateSourceMaps above).
             */
            source = _transpileTypeScriptSourceWithMap(moduleId, source, cwd, parsed && parsed.project ? parsed.project : undefined, generateSourceMaps);
        }
        source = source.replace(/require\s*\(\s*["']([^"']+)["']\s*\)/g, (_match, spec) => {
            if (spec === tripwirePackageName) {
                // Redirect internal self-references (e.g. core/src/assert/assertClass.ts's
                // own `import { X } from "@nevware21/tripwire"`) straight to the moduleId
                // already resolved above, instead of independently re-resolving the
                // package by name -- which would land back on the dist bundle (or, even if
                // it happened to resolve to the same source file, could disagree on Windows
                // drive-letter casing with the path already computed here) and reintroduce
                // a second, disconnected copy of core's internals. Already enqueued as part
                // of this function's setup, so no _enqueue() call needed here.
                return "require(" + JSON.stringify(tripwireModuleId) + ")";
            }
            if (spec === "@nevware21/chromacon") {
                _enqueue(chromaconBrowserModuleId);
                return "require(" + JSON.stringify(chromaconBrowserModuleId) + ")";
            }
            if (spec === "os") {
                _enqueue(osShimModuleId);
                return "require(" + JSON.stringify(osShimModuleId) + ")";
            }
            if (_isNodeBuiltin(spec)) {
                throw _userError("Node builtin module '" + spec + "' is not supported in browser/worker target (required by " + moduleId + ")", [
                    "Browsers and workers have no '" + spec + "' -- guard the import behind a target check, or run with --target node."
                ]);
            }
            const resolved = _resolveBrowserDependency(spec, moduleId, cwd);
            const depId = _enqueue(resolved);
            return "require(" + JSON.stringify(depId) + ")";
        });

        source = _rewriteModuleDebugUrls(moduleId, source, cwd, rawAssets);
        modules[moduleId] = source;
        _toModuleAssetUrl(moduleId, cwd, moduleUrls);
    }
    if (_isTTY) {
        process.stdout.write("\r" + " ".repeat(120) + "\r");
    }
    const elapsedMs = Date.now() - _graphStart;
    console.log(gray("  Module graph: ") + brightCyan(_processed + " modules") + gray(" processed, ") + brightCyan(Object.keys(modules).length + " unique") + gray(" in graph ") + brightCyan("(" + elapsedMs + "ms)"));

    return {
        modules,
        entryIds,
        tripwireModuleId,
        coverageOnlyIds,
        moduleUrls,
        rawAssets,
        elapsedMs
    };
}

function _isNodeBuiltin(request: string): boolean {
    return builtinModules.indexOf(request) !== -1 || builtinModules.indexOf(request.replace(/^node:/, "")) !== -1;
}

/**
 * Converts a glob pattern written for `launchTarget` (the target the CLI/interactive session
 * was originally started with) into the equivalent pattern for `forTarget`, so that switching
 * targets in an interactive session (or building `forTarget`'s own companion graph) resolves
 * *that* target's files instead of silently reusing the launch target's.
 *
 * Many test suites (this repo's own included) separate browser-only and worker-only tests into
 * like-named directories, using a glob exclusion group so each target's run never cross-runs
 * the other's -- eg. `test:browser` passes `"./test/src/!(node|worker)/**\/*.test.ts"` and
 * `test:worker` passes `"./test/src/!(node|browser)/**\/*.test.ts"`. A `--target browser`
 * launch's pattern therefore structurally *excludes* `worker/` by the shape of the glob itself
 * -- no amount of re-resolving that same pattern for the worker target will ever include
 * worker-only tests, since the pattern text has to change, not just be re-evaluated.
 *
 * This only ever swaps a literal occurrence of `forTarget`'s name for `launchTarget`'s name,
 * and only when it appears as one of the pipe-separated alternatives inside a `!(...)`
 * extglob-style negation group -- un-excluding the requested target's own directory and
 * excluding the launch target's instead. Patterns that don't follow this convention (no such
 * group, or the name never appears in one) come back completely unchanged -- this never invents
 * an exclusion that wasn't already there, it only ever swaps an existing one.
 */
function _getCompanionTargetPatterns(patterns: string[], launchTarget: "browser" | "worker", forTarget: "browser" | "worker"): string[] {
    if (launchTarget === forTarget) {
        return patterns.slice(0);
    }

    const swapRe = new RegExp("(!\\([^)]*\\b)" + forTarget + "(\\b[^)]*\\))", "g");
    return patterns.map((pattern) => pattern.replace(swapRe, "$1" + launchTarget + "$2"));
}

function _normalizeModuleId(filePath: string): string {
    return path.resolve(filePath).replace(/\\/g, "/");
}

function _isUnsupportedTripwireBrowserModule(resolvedPath: string): boolean {
    const normalized = String(resolvedPath || "").replace(/\\/g, "/").toLowerCase();
    return normalized.indexOf("/build/es5/mod/") !== -1;
}

function _resolveTripwireModulePath(cwd: string, preferSource: boolean): string {
    if (preferSource) {
        const packageName = _readPackageName(cwd);
        const sourceFirstCandidates = [
            path.resolve(cwd, "core/src/index.ts"),
            path.resolve(__dirname, "../src/index.ts"),
            path.resolve(__dirname, "../../src/index.ts"),
            path.resolve(__dirname, "../../../core/src/index.ts")
        ];

        if (packageName === "@nevware21/tripwire") {
            sourceFirstCandidates.unshift(path.resolve(cwd, "src/index.ts"));
        }

        for (let lp = 0; lp < sourceFirstCandidates.length; lp++) {
            // eslint-disable-next-line security/detect-non-literal-fs-filename
            if (fs.existsSync(sourceFirstCandidates[lp])) {
                return sourceFirstCandidates[lp];
            }
        }
    }

    const packageCandidates = [
        "@nevware21/tripwire",
        "../dist/es5/main/tripwire"
    ];
    for (let lp = 0; lp < packageCandidates.length; lp++) {
        try {
            const resolved = require.resolve(packageCandidates[lp], {
                paths: [cwd]
            });

            if (!_isUnsupportedTripwireBrowserModule(resolved)) {
                return resolved;
            }
        } catch (e) {
            // Try next candidate.
        }
    }
    const localCandidates = [
        path.resolve(cwd, "dist/es5/main/tripwire"),
        path.resolve(cwd, "src/index.ts"),
        path.resolve(cwd, "core/src/index.ts"),
        path.resolve(__dirname, "../src/index.ts"),
        path.resolve(__dirname, "../../src/index.ts"),
        path.resolve(__dirname, "../../../core/dist/es5/main/tripwire"),
        path.resolve(__dirname, "../../../core/src/index.ts")
    ];
    let lastError = null;
    for (let lp = 0; lp < localCandidates.length; lp++) {
        try {
            const resolved = require.resolve(localCandidates[lp]);
            if (!_isUnsupportedTripwireBrowserModule(resolved)) {
                return resolved;
            }
        } catch (e: any) {
            lastError = e;
        }
    }
    const details = lastError && (lastError as any).message ? (lastError as any).message : String(lastError);
    throw _userError("Unable to resolve tripwire module for browser/worker target from '" + cwd + "'. " + details, [
        "npm install --save-dev @nevware21/tripwire"
    ]);
}

function _transpileTypeScriptSourceWithMap(filePath: string, source: string, cwd: string, projectPath?: string, generateMap = true) {
    return _getCompileProvider().transpile(filePath, source, cwd, generateMap, projectPath);
}

/**
 * If `resolvedSourcePath` (a source map's `sources[]` entry, already resolved to an
 * absolute path) points into core's intermediate `build/es5/mod` or `build/es6/mod` stage
 * -- a per-file compiled-JS mirror of `src/*.ts` that core's own two-stage build (tsc then
 * rollup) uses as the bundler's input -- returns the real original `src/*.ts` file it
 * mirrors 1:1 by filename. Returns `null` for anything else (e.g. a vendor package's own
 * sourcemap referencing its own upstream repository).
 */
function _buildModToSrcPath(resolvedSourcePath: string): string | null {
    const normalized = resolvedSourcePath.replace(/\\/g, "/");
    const match = /^(.*)\/build\/es[56]\/mod\/(.+)\.js$/i.exec(normalized);
    return match ? match[1] + "/src/" + match[2] + ".ts" : null;
}

/**
 * Rewrites an external map's `sources[]`/`sourcesContent[]` in place, swapping any entry
 * that resolves into `build/es{5,6}/mod` (see `_buildModToSrcPath`) for the real `src/*.ts`
 * file it mirrors, embedding that file's actual text. Returns whether anything was rewritten
 * -- when nothing was (e.g. a vendor package's own map, untouched), the caller leaves the
 * map as an external, unmodified sibling asset exactly as before.
 */
function _rewriteBuildModSources(mapJson: any, mapFsPath: string, cwd: string): boolean {
    const sources: string[] = mapJson.sources || [];
    const sourcesContent: string[] = mapJson.sourcesContent ? mapJson.sourcesContent.slice(0) : [];
    let rewrote = false;

    for (let lp = 0; lp < sources.length; lp++) {
        const resolvedSourcePath = path.resolve(path.dirname(mapFsPath), sources[lp]);
        const srcPath = _buildModToSrcPath(resolvedSourcePath);
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        if (!srcPath || !fs.existsSync(srcPath)) {
            continue;
        }

        const relToCwd = path.relative(cwd, srcPath).replace(/\\/g, "/");
        sources[lp] = (relToCwd && relToCwd.indexOf("..") !== 0 && relToCwd.indexOf(":") === -1)
            ? "/" + relToCwd
            : srcPath.replace(/\\/g, "/");
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        sourcesContent[lp] = fs.readFileSync(srcPath, "utf8");
        rewrote = true;
    }

    if (rewrote) {
        mapJson.sources = sources;
        mapJson.sourcesContent = sourcesContent;
        mapJson.sourceRoot = "";
    }

    return rewrote;
}

/**
 * Rewrites a module's `//# sourceMappingURL=` comment so DevTools shows real, breakpointable
 * source for pre-built (non-TS-transpiled-by-us) `.js` dependencies, and ensures any sibling
 * file it still needs (an untouched vendor map) is servable by URL.
 *
 * - Inline (`data:`) maps are TS-transpiler output for in-cwd files -- with `inlineSources`
 *   enabled (see `tsCompile.ts`) the original text travels inside the map itself, so there
 *   is no separate file to serve and nothing to rewrite here.
 * - Absolute URLs (`http(s):`, `file:`, `blob:`, already-`/`-rooted) are left untouched.
 * - A bare/relative reference to an external `.js.map` is read and checked for
 *   `build/es{5,6}/mod` entries (core's own two-stage build's intermediate per-file JS,
 *   mirroring `src/*.ts` 1:1 -- see `_buildModToSrcPath`). If found, the map is rewritten to
 *   point at (and embed) the real TypeScript source and re-embedded inline, so DevTools shows
 *   breakpointable `src/*.ts` grouped the same way as every other module in the graph instead
 *   of the intermediate compiled JS under a separate "build/es5/mod" tree. Otherwise (e.g. a
 *   vendor package's own map, like `ts-utils.js.map`, already pointing at its own upstream
 *   repository) the map is left completely untouched and just registered as a raw sibling
 *   asset so the module's own (unmodified) relative reference to it still resolves.
 *
 * The `//# sourceURL=` comment this function used to append is no longer needed at all --
 * once a module is loaded via a real `<script src>`/`importScripts` URL, that URL *is*
 * its DevTools identity.
 */
function _rewriteModuleDebugUrls(moduleId: string, source: string, cwd: string, rawAssets: Record<string, string>): string {
    if (!moduleId || moduleId.indexOf("/__tripwire__/") === 0) {
        return source;
    }

    const moduleFsPath = moduleId.replace(/\\/g, "/");

    return source.replace(/\/\/#[ \t]*sourceMappingURL=([^\r\n]+)/g, (all, mapRefRaw) => {
        const mapRef = String(mapRefRaw || "").trim();
        if (!mapRef || /^(?:https?|file|blob|data):/i.test(mapRef) || mapRef.indexOf("/") === 0) {
            return all;
        }

        const resolvedMapPath = path.resolve(path.dirname(moduleFsPath), mapRef);
        try {
            // eslint-disable-next-line security/detect-non-literal-fs-filename
            if (fs.existsSync(resolvedMapPath)) {
                // eslint-disable-next-line security/detect-non-literal-fs-filename
                const mapJson = JSON.parse(fs.readFileSync(resolvedMapPath, "utf8"));
                if (_rewriteBuildModSources(mapJson, resolvedMapPath, cwd)) {
                    const inlineMap = "data:application/json;base64," + Buffer.from(JSON.stringify(mapJson), "utf8").toString("base64");
                    return "//# sourceMappingURL=" + inlineMap;
                }
            }
        } catch (e) {
            // Malformed/unreadable map -- fall through to registering it as-is.
        }

        _registerRawSiblingAsset(resolvedMapPath, cwd, rawAssets);
        return all;
    });
}

/**
 * Registers a sibling asset (e.g. a vendor dependency's external `.js.map`) that is never
 * `require()`d itself but must still be servable by URL for DevTools to fetch. Deduped by
 * absolute path so the same file referenced from multiple modules only gets one URL.
 */
function _registerRawSiblingAsset(absFsPath: string, cwd: string, rawAssets: Record<string, string>): string {
    const normalized = absFsPath.replace(/\\/g, "/");
    const existingKeys = Object.keys(rawAssets);
    for (let lp = 0; lp < existingKeys.length; lp++) {
        if (rawAssets[existingKeys[lp]] === normalized) {
            return existingKeys[lp];
        }
    }

    const url = _toAssetUrl(normalized, cwd, rawAssets);
    rawAssets[url] = normalized;
    return url;
}

function _resolveChromaconBrowserModulePath(cwd: string): string {
    let packagePath;
    try {
        packagePath = require.resolve("@nevware21/chromacon/package.json", {
            paths: [cwd, __dirname]
        });
    } catch (e) {
        throw _userError("Unable to resolve @nevware21/chromacon from '" + cwd + "'.", [
            "npm install --save-dev @nevware21/chromacon"
        ]);
    }
    const pkgDir = path.dirname(packagePath);
    const candidates = [
        path.resolve(pkgDir, "dist/es5/umd/chromacon.js"),
        path.resolve(pkgDir, "bundle/es5/umd/chromacon.js"),
        path.resolve(pkgDir, "dist/es6/mod/chromacon.js")
    ];
    for (let lp = 0; lp < candidates.length; lp++) {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        if (fs.existsSync(candidates[lp])) {
            return candidates[lp];
        }
    }
    throw _userError("Unable to locate browser-safe chromacon module under: " + pkgDir, [
        "Reinstall @nevware21/chromacon -- its browser build is missing from the installed package."
    ]);
}

/**
 * Walks upward from `absFsPath` to find the nearest ancestor `package.json` with a `name`
 * field. Used only as a fallback for vendor files that don't resolve through an actual
 * `node_modules` directory segment (see `_toNodeModulesUrl`), so they can still be served
 * under a URL that mirrors *a* real package layout (`<pkgName>@<version>/<relPath>`)
 * instead of an opaque numbered placeholder.
 */
function _resolvePackageRelativeAssetPath(absFsPath: string): { pkgName: string, version: string, relPath: string } | null {
    let dir = path.dirname(absFsPath);
    let prevDir = "";
    while (dir && dir !== prevDir) {
        const pkgJsonPath = path.join(dir, "package.json");
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        if (fs.existsSync(pkgJsonPath)) {
            try {
                // eslint-disable-next-line security/detect-non-literal-fs-filename
                const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
                if (pkg && pkg.name) {
                    return {
                        pkgName: pkg.name,
                        version: pkg.version || "0.0.0",
                        relPath: path.relative(dir, absFsPath).replace(/\\/g, "/")
                    };
                }
            } catch (e) {
                // Malformed package.json -- keep walking up.
            }
        }
        prevDir = dir;
        dir = path.dirname(dir);
    }
    return null;
}

/**
 * If `absPath` resolves through an actual `node_modules` directory, returns the URL formed
 * by taking everything from (and including) the *last* `node_modules` segment onward --
 * e.g. `.../common/temp/node_modules/@nevware21/ts-utils/dist/es5/main/ts-utils.js` becomes
 * `/node_modules/@nevware21/ts-utils/dist/es5/main/ts-utils.js`, mirroring exactly the path
 * the file would actually be `require()`d/loaded from. The *last* segment is used so nested
 * `node_modules` resolution (peer-dependency isolation) maps to its innermost, most-specific
 * location. Returns `null` if there is no `node_modules` segment at all.
 */
function _toNodeModulesUrl(absPath: string): string | null {
    const normalized = absPath.replace(/\\/g, "/");
    const idx = normalized.lastIndexOf("/node_modules/");
    return idx === -1 ? null : normalized.substring(idx);
}

/**
 * Assigns the next `_unpackaged/<n>/` index for a given owning registry (`moduleUrls` or
 * `rawAssets`), scoped per registry object so the two keep their own independent numbering,
 * same as before. A plain running counter, rather than re-deriving the count by filtering the
 * registry's existing URLs on every call: nothing other than this fallback branch ever
 * produces a `_unpackaged/` URL, so the count of "how many have been assigned so far" can only
 * ever advance by exactly one per call -- filtering the full URL list every time was doing
 * O(n) work per module to recompute a number that's trivially O(1) to track directly.
 */
const _unpackagedCounters = new WeakMap<object, number>();

function _nextUnpackagedIndex(registry: object): number {
    const next = (_unpackagedCounters.get(registry) || 0);
    _unpackagedCounters.set(registry, next + 1);
    return next;
}

/**
 * Resolves the URL an arbitrary absolute filesystem path should be served at, loaded
 * directly into the root of the test frame rather than nested under a synthetic
 * `/__tripwire__/...` namespace:
 *  - in-cwd files: `/<cwd-relpath>` (the same path the existing bare-root static-file
 *    fallback in `server.ts` already serves raw files at).
 *  - out-of-cwd files resolved through `node_modules`: `/node_modules/<...>`, mirroring
 *    the real path they're loaded from (see `_toNodeModulesUrl`).
 *  - anything else (no `node_modules` segment, e.g. a monorepo package resolved straight
 *    to its source via a symlink): falls back to a package-relative or numbered URL under
 *    `/__tripwire__/vendor/...` -- there's no sensible "real" root-relative path for these.
 *
 * `registry` is the owning `moduleUrls`/`rawAssets` map, used only as a WeakMap key to scope
 * the `_unpackaged/` counter above -- see `_nextUnpackagedIndex`.
 */
function _toAssetUrl(absPath: string, cwd: string, registry: object): string {
    const relPath = path.relative(cwd, absPath).replace(/\\/g, "/").replace(/^\/+/, "");
    if (relPath && relPath.indexOf("..") !== 0 && relPath.indexOf(":") === -1) {
        return "/" + relPath;
    }

    const nodeModulesUrl = _toNodeModulesUrl(absPath);
    if (nodeModulesUrl) {
        return nodeModulesUrl;
    }

    const pkgInfo = _resolvePackageRelativeAssetPath(absPath);
    if (pkgInfo) {
        return "/__tripwire__/vendor/" + pkgInfo.pkgName + "@" + pkgInfo.version + "/" + pkgInfo.relPath;
    }

    const unpackagedPrefix = "/__tripwire__/vendor/_unpackaged/";
    const unpackagedCount = _nextUnpackagedIndex(registry);
    const normalized = absPath.replace(/\\/g, "/");
    const baseName = normalized.substring(normalized.lastIndexOf("/") + 1) || "asset";
    return unpackagedPrefix + unpackagedCount + "/" + baseName;
}

/**
 * Resolves (and registers, deduped by moduleId) the URL a module's wrapped, executable
 * content will be served at (see `_toAssetUrl`).
 *
 * Note: since URLs are no longer namespaced by target, if both `browser` and `worker`
 * targets are served from the same session with `--coverage` (`--browser-launch manual`,
 * both tabs opened), a shared source file's two independently-instrumented variants would
 * contend for the same URL -- whichever target's registry is merged last wins. Accepted
 * tradeoff for URLs that mirror real, predictable paths; narrow edge case in practice.
 */
function _toModuleAssetUrl(moduleId: string, cwd: string, moduleUrls: Record<string, string>): string {
    if (moduleUrls[moduleId]) {
        return moduleUrls[moduleId];
    }

    if (moduleId.indexOf("/__tripwire__/") === 0) {
        moduleUrls[moduleId] = moduleId;
        return moduleId;
    }

    let url = _toAssetUrl(moduleId, cwd, moduleUrls);

    // A module is served as wrapped, transpiled JavaScript (see moduleAssets.ts) even when
    // moduleId itself is a .ts/.tsx source file -- serving that generated JS at a URL still
    // ending .ts makes it indistinguishable, to a browser or DevTools, from the actual
    // authored TypeScript its (external, see moduleAssets.ts) source map claims to map back
    // to. Renamed here rather than in the shared _toAssetUrl above (also used for untouched
    // sibling assets, eg. a vendor's own external .js.map, which must keep their real
    // extension) -- matches how any normal tsc/webpack build serves foo.ts as foo.js.
    url = url.replace(/\.tsx?$/i, ".js");

    moduleUrls[moduleId] = url;
    return url;
}
