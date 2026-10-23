/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { ICompileHookOptions } from "./ICompileHookOptions";

/**
 * Abstraction over TypeScript compilation and transpilation so that the default
 * TypeScript provider can be swapped for a custom one (e.g. esbuild, swc, babel).
 * @since 0.2.0
 */
export interface ICompileProvider {

    /**
     * Compiles the TypeScript project at the specified path.
     * @param projectPath - The path to the TypeScript project.
     * @param cwd - The current working directory.
     */
    compile(projectPath: string, cwd: string): void;

    /**
     * Registers a hook for the TypeScript project at the specified path.
     * @param projectPath - The path to the TypeScript project.
     * @param cwd - The current working directory.
     * @param checkDiagnostics - Optional flag requesting that the hook validate the project
     * (equivalent to a `tsc --noEmit` pass) and throw if it has type errors, instead of the
     * caller running that check separately.
     * @param tsconfigOverrides - Optional compiler options that override whatever the loaded
     * project file (`projectPath`) specifies for those same keys.
     */
    registerHook(projectPath: string, cwd: string, checkDiagnostics?: boolean, tsconfigOverrides?: { [key: string]: any }, hookOptions?: ICompileHookOptions): void;

    /**
     * Transpiles the specified TypeScript file.
     * @param filePath - The path to the TypeScript file.
     * @param source - The source code of the TypeScript file.
     * @param cwd - The current working directory.
     * @param generateMap - Optional flag to indicate if a source map should be generated.
     * @param projectPath - Optional TypeScript project file to use for program-aware transpilation.
     * @returns The transpiled JavaScript code.
     */
    transpile(filePath: string, source: string, cwd: string, generateMap?: boolean, projectPath?: string): string;
}
