/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { ICompileHookOptions, ICompileProvider } from "@nevware21/tripwire";
import { isFunction } from "@nevware21/ts-utils";
import { _loadModule } from "../internal/loadModule";
import { getCompileProvider as _getDefaultCompileProvider } from "../compile/provider";
import { getCompileCacheStatus, getProjectFileNames, ICompileCacheStatus, invalidateTypeScriptProgramCache, setGraphTypeCheck } from "../compile/tsCompile";
import { _userError } from "../internal/userError";

/**
 * Resolves the compile provider to use -- the built-in one (a direct call, so no runtime shape
 * validation is needed) unless `providerName` names a custom override module, in which case it's
 * dynamically loaded and shape-checked since it's untrusted.
 */
export function _getCompileProvider(providerName?: string): ICompileProvider {
    if (!providerName) {
        return _getDefaultCompileProvider();
    }

    const mod = _loadModule<any>(providerName);
    if (!mod) {
        return mod as unknown as ICompileProvider;
    }

    // Support modules that export a getCompileProvider factory
    const provider: ICompileProvider = isFunction(mod.getCompileProvider) ? mod.getCompileProvider() : mod;

    if (!isFunction(provider.compile)) {
        throw _userError("Invalid compile provider '" + providerName + "': missing compile(options).");
    }

    if (!isFunction(provider.registerHook)) {
        throw _userError("Invalid compile provider '" + providerName + "': missing registerHook(options).");
    }

    return provider;
}

export function _registerTypeScriptHook(projectPath: string, cwd: string, checkDiagnostics?: boolean, tsconfigOverrides?: { [key: string]: any }, hookOptions?: ICompileHookOptions) {
    _getCompileProvider().registerHook(projectPath, cwd, checkDiagnostics, tsconfigOverrides, hookOptions);
}

/**
 * The files the TypeScript project resolves to -- what `--type-check` actually checked, as
 * opposed to what the run matched. See `internal/typeCheckScope.ts` for why the difference
 * matters and `getProjectFileNames` for the resolution itself.
 *
 * Specific to the built-in TypeScript compile provider (the only one the CLI can select today);
 * `null` is the "nothing to compare against" answer, which callers treat as "stay quiet".
 * @internal
 */
export function _getCompileCacheStatus(): ICompileCacheStatus {
    return getCompileCacheStatus();
}

export function _getProjectFileNames(projectPath: string, cwd: string): string[] | null {
    try {
        return getProjectFileNames(projectPath, cwd);
    } catch (e) {
        // Resolving the project is best-effort context for a warning -- it must never be the
        // thing that fails a run that would otherwise have succeeded.
        return null;
    }
}

/**
 * Forces the next browser/worker module graph build to transpile every file fresh from disk
 * instead of reusing a `ts.Program` (and its per-file emit cache) built during an earlier
 * rebuild in the same process -- see `invalidateTypeScriptProgramCache`'s own doc comment for why
 * clearing anything less than the whole cached Program can't pick up a source file's actual
 * current content. Specific to the built-in TypeScript compile provider; a no-op (there is
 * nothing to invalidate) when a custom `--compile-provider` is in use, which owns its own
 * caching independently.
 */
export function _invalidateTypeScriptTranspileCache(): void {
    invalidateTypeScriptProgramCache();
}

/**
 * Turns type-error reporting on or off for the browser/worker module-graph transpile.
 *
 * The node target gets its diagnostics from `_registerTypeScriptHook`'s `checkDiagnostics`
 * argument; the graph path has no equivalent argument because it reaches TypeScript through
 * the compile provider's `transpile()` seam, so it is switched on here instead. Diagnostics
 * still run exactly once, against the same `ts.Program` the graph emits from.
 *
 * Specific to the built-in TypeScript compile provider -- a no-op when a custom
 * `--compile-provider` is in use, which owns its own checking.
 * @since 0.2.0
 */
export function _setGraphTypeCheck(enabled: boolean): void {
    setGraphTypeCheck(enabled);
}
