/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { createCachedValue, ICachedValue } from "@nevware21/ts-utils";
import { compileTypeScript, registerTypeScriptHook, transpileTypeScriptSource, transpileTypeScriptSourceWithMap } from "./tsCompile";
import { ICompileProvider } from "@nevware21/tripwire";

let _provider: ICachedValue<ICompileProvider>;

function _transpile(filePath: string, source: string, cwd: string, generateMap?: boolean, projectPath?: string): string {
    if (generateMap) {
        return transpileTypeScriptSourceWithMap(filePath, source, cwd, projectPath);
    }

    return transpileTypeScriptSource(filePath, source, cwd, projectPath);
}

/**
 * Default {@link ICompileProvider} backed by the TypeScript compiler API.
 */
function createProvider(): ICompileProvider {

    return {
        compile: compileTypeScript,
        registerHook: registerTypeScriptHook,
        transpile: _transpile
    };
}

/**
 * Returns a shared instance of the default TypeScript compile provider.
 */
export function getCompileProvider(): ICompileProvider {
    if (!_provider) {
        _provider = createCachedValue(createProvider());
    }

    return _provider.v;
}
