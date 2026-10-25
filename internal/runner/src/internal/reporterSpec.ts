/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

/**
 * Explicit "this is a module, not a built-in name" prefix for a `--reporter` value.
 *
 * The shape rules below cover every specifier that carries a `/`, a `.` or a leading `@`, which
 * is every relative path and every scoped package -- but a *bare* package name (`my-reporter`)
 * is indistinguishable from a mistyped built-in, and silently trying to `require()` it would
 * turn "you typo'd `spce`" into a module-resolution failure. This prefix is the escape hatch for
 * that one case: `--reporter module:my-reporter` is unambiguous.
 * @since 0.2.0
 */
export const _REPORTER_MODULE_PREFIX = "module:";

/**
 * Whether a `--reporter` (or config `reporters`) value names a module to load rather than one of
 * the built-in reporters in `REPORTER_NAMES`.
 *
 * Deliberately a *shape* test rather than a "not in the list" test: an unrecognised bare word
 * stays an error naming the built-ins (see `parseArgs.ts`), so a typo is still reported as a
 * typo. Only a value that could not be a built-in name in the first place -- none of them
 * contains `/`, `\`, `.` or `@` -- is treated as a specifier, plus anything explicitly marked
 * with {@link _REPORTER_MODULE_PREFIX}.
 *
 * Pure (no `require`, no `fs`) so `parseArgs.ts` and the browser/worker clients can both ask the
 * question; the loading itself lives in node-only code (`execute/reporter.ts`).
 * @param value - The raw, already-trimmed reporter value.
 * @since 0.2.0
 */
export function _isReporterModuleSpec(value: string): boolean {
    if (!value) {
        return false;
    }

    if (value.substring(0, _REPORTER_MODULE_PREFIX.length) === _REPORTER_MODULE_PREFIX) {
        return true;
    }

    return value.indexOf("/") !== -1 || value.indexOf("\\") !== -1 || value.indexOf(".") !== -1 || value.charAt(0) === "@";
}

/**
 * The module specifier inside a reporter value -- the value itself, with any explicit
 * {@link _REPORTER_MODULE_PREFIX} removed. Returns `""` for a value that is not a specifier at
 * all, so a caller cannot accidentally hand a built-in name to the module loader.
 * @param value - The raw, already-trimmed reporter value.
 * @since 0.2.0
 */
export function _reporterModuleId(value: string): string {
    if (!_isReporterModuleSpec(value)) {
        return "";
    }

    if (value.substring(0, _REPORTER_MODULE_PREFIX.length) === _REPORTER_MODULE_PREFIX) {
        return value.substring(_REPORTER_MODULE_PREFIX.length).trim();
    }

    return value;
}
