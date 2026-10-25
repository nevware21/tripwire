/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

/**
 * Default glob for locating a project's own source files during `--coverage`.
 *
 * Two browser/worker coverage steps have to consider files that *no test imported* -- the
 * force-load pass in `execute.ts` (so an unreferenced-but-real file gets genuine
 * execution-based coverage) and `fillUninstrumentedFiles`' zero-fill in `codecov/provider.ts`
 * (which reports whatever is still missing at 0%). Both need to know where the sources are.
 *
 * This used to be written inline at both sites, which quietly assumed every project keeps its
 * code in `src/`. For any other layout neither step matched anything, so coverage was computed
 * over only the files the tests happened to reach -- *raising* the reported percentage by
 * dropping exactly the untested files the zero-fill exists to expose. Overridable via
 * `ITripwireConfig.coverageSrc` / `--coverage-src`.
 */
export const DEFAULT_COVERAGE_SRC: string[] = ["src/**/*.ts"];

/**
 * The configured coverage source glob(s), or {@link DEFAULT_COVERAGE_SRC} when none was set.
 * @internal
 */
export function _coverageSrcPatterns(parsed: any): string[] {
    const configured = parsed && parsed.coverageSrc;

    return (configured && configured.length) ? configured : DEFAULT_COVERAGE_SRC;
}
