/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { CoverageData, ICoverageFilter } from "./interfaces";

/**
 * Default {@link ICoverageFilter} that:
 * - Excludes anything whose path looks like a test or spec file.
 * - Excludes files outside the project root (`cwd`).
 * - Excludes files under `node_modules`.
 * - Prefers TypeScript source entries (files under `/src/`) when both JS and TS keys exist.
 */
export class DefaultCoverageFilter implements ICoverageFilter {
    isTestPath(fileName: string): boolean {
        if (!fileName) {
            return false;
        }

        const normalized = String(fileName).replace(/\\/g, "/").toLowerCase();

        if (/\.test\.[cm]?[jt]sx?$/.test(normalized)) {
            return true;
        }

        if (/\.spec\.[cm]?[jt]sx?$/.test(normalized)) {
            return true;
        }

        if (normalized.indexOf("/tests/") !== -1) {
            return true;
        }

        return normalized.indexOf("/test/src/") !== -1
            || normalized.indexOf("/test/build-es5/test/") !== -1;
    }

    /**
     * Matches this project's own `.nycrc`-style `exclude` convention (`**\/src/index.ts`,
     * `**\/src/polyfills.ts`) -- a barrel/re-export file and a polyfill shim are never
     * meaningful coverage targets in their own right. Previously this only mattered for
     * `fillUninstrumentedFiles`' own zero-fill guard (these files were never actually
     * `require()`d by a test, so they simply never appeared in real coverage data at all);
     * now that `--coverage` force-`require()`s every `src/**\/*.ts` file (see coverageOnlyIds
     * in execute.ts) they *do* produce real entries, so this filter needs the same exclusion
     * to keep matching nyc's node-target report and karma's.
     */
    private _isExcludedSourcePath(normalizedKey: string): boolean {
        // Mirrors "**/src/index.ts" / "**/src/polyfills.ts" -- the file's *direct* parent
        // must be a folder literally named "src", not any index.ts/polyfills.ts at any depth
        // (a package could legitimately have a real, non-barrel src/foo/index.ts).
        return /\/src\/(index|polyfills)\.[cm]?[jt]sx?$/.test(normalizedKey);
    }

    /**
     * Under `cwd` and not inside `node_modules` -- the same "does this even belong to the
     * project being tested" check `filter()` applies at report time, hoisted out so
     * `instrumentPayload` (provider.ts) can apply it *before* paying istanbul's cost, not
     * just before printing the result. A dependency's own vendor bundle, or -- for a package
     * that depends on another workspace package for its test globals (eg. a chai/mocha shim
     * depending on this project's own core) -- that package's entire out-of-cwd runtime, is
     * still `require()`d and executed completely normally; it's just never worth
     * instrumenting, since nothing here ever reports coverage for code outside `cwd` anyway.
     * Measured impact on one real shim package's own bundle: 98.5% of the instrumented output
     * (277,000 of 281,000 lines) was exactly this -- vendor/out-of-scope code whose coverage
     * data `filter()` was always discarding, at full istanbul cost, on every single run.
     */
    isInScope(fileName: string, cwd: string): boolean {
        const normalizedKey = String(fileName || "").replace(/\\/g, "/").toLowerCase();
        const normalizedCwd = String(cwd || "").replace(/\\/g, "/").toLowerCase();
        const inCwd = normalizedCwd
            ? normalizedKey.indexOf(normalizedCwd) === 0
            : true;
        const inNodeModules = normalizedKey.indexOf("/node_modules/") !== -1;

        return inCwd && !inNodeModules;
    }

    filter(coverage: CoverageData, cwd: string): CoverageData {
        const filtered: CoverageData = {};
        const tsSourceOnly: CoverageData = {};
        const keys = Object.keys(coverage || {});

        for (let lp = 0; lp < keys.length; lp++) {
            const key = keys[lp];
            const normalizedKey = String(key || "").replace(/\\/g, "/").toLowerCase();

            if (!this.isTestPath(key) && !this._isExcludedSourcePath(normalizedKey) && this.isInScope(key, cwd)) {
                filtered[key] = coverage[key];

                if (/\.tsx?$/.test(normalizedKey) && normalizedKey.indexOf("/src/") !== -1) {
                    tsSourceOnly[key] = coverage[key];
                }
            }
        }

        return Object.keys(tsSourceOnly).length > 0 ? tsSourceOnly : filtered;
    }
}
