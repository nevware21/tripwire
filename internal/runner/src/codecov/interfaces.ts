/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

/**
 * A map of module-id → instrumented/raw source strings.
 */
export type CoverageModuleMap = { [moduleId: string]: string };

/**
 * An Istanbul-style per-file coverage entry as emitted by istanbul-lib-instrument.
 */
export type CoverageEntry = {
    path: string;
    inputSourceMap?: {
        version?: number;
        sources?: string[];
        sourcesContent?: string[];
        mappings?: string;
        [key: string]: any;
    };
    [key: string]: any;
};

/**
 * Full coverage data map: file-path → CoverageEntry.
 */
export type CoverageData = { [filePath: string]: CoverageEntry };

/*
 * ---------------------------------------------------------------------------
 * Pluggable interfaces
 * ---------------------------------------------------------------------------
 */

/**
 * Instruments a single JS module source string for coverage tracking.
 * Swap this to use a different instrumentation backend (e.g. c8, babel-plugin-istanbul).
 */
export interface ICoverageInstrumenter {
    /**
     * @param source      The transpiled JS source string for the module.
     * @param moduleId    The canonical module ID (used as the coverage key and sourceURL).
     * @param inputSourceMap  Optional source-map object extracted from the transpiled JS so that
     *                        coverage can be remapped back to original TypeScript line numbers.
     * @returns The instrumented JS source string.
     */
    instrument(source: string, moduleId: string, inputSourceMap?: any): string;

    /**
     * Returns the zero-baseline coverage entry (every statement/branch/function count
     * initialized to 0) produced as a side-effect of the most recent `instrument()` call.
     * Lets a file be instrumented purely to register it in the report -- without ever
     * requiring/executing it -- so a module nothing happens to reach during a given run is
     * reported honestly as 0% covered instead of being silently absent from the totals.
     */
    getLastFileCoverage?(): CoverageEntry | null;
}

/**
 * Decides which coverage entries to include in the final report.
 */
export interface ICoverageFilter {
    /**
     * Returns true if the given file path is a test file (should be excluded from reporting).
     */
    isTestPath(fileName: string): boolean;

    /**
     * Returns true if the given file path is within the project's own reportable scope --
     * under `cwd` and not inside `node_modules`. Used *before* instrumentation (not just at
     * final report time) to skip the expensive istanbul pass entirely for anything that
     * `filter()` would only throw away later anyway (a vendor dependency's own bundle, or --
     * for a package like a shim that depends on another workspace package -- that package's
     * own out-of-cwd source, both still `require()`d/executed normally, just never
     * instrumented).
     */
    isInScope(fileName: string, cwd: string): boolean;

    /**
     * Filters and returns only the coverage entries that should appear in the report.
     */
    filter(coverage: CoverageData, cwd: string): CoverageData;
}

/**
 * Writes coverage data to disk and optionally runs a summary reporter.
 */
export interface ICoverageReporter {
    /**
     * @param coverage    The already-filtered coverage data.
     * @param cwd         The project root (absolute path).
     * @param target      "browser" | "worker" — determines the output sub-folder.
     */
    write(coverage: CoverageData, cwd: string, target: string): void;
}

/**
 * High-level provider that bundles instrumenter + filter + reporter into a
 * single replaceable unit.  Consumers can inject a fully custom provider or
 * replace individual pieces via the default implementation.
 */
export interface ICoverageProvider {
    /** The instrumenter used to transform module source before it runs in the browser. */
    readonly instrumenter: ICoverageInstrumenter;
    /** Decides which files to include / exclude. */
    readonly filter: ICoverageFilter;
    /** Writes the final JSON and runs any per-run summary output. */
    readonly reporter: ICoverageReporter;

    /**
     * Instruments every non-test module in `payload.modules` and returns a new
     * payload with the instrumented sources.
     */
    instrumentPayload(payload: any, cwd: string, parsed: any): any;

    /**
     * Writes coverage collected after a Puppeteer run and prints the per-run summary.
     */
    writeCoverage(coverage: CoverageData | null, cwd: string, target: string): void;
}
