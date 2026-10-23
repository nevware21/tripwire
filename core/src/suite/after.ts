/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { isFunction, isString } from "@nevware21/ts-utils";
import { _getCurrentSuite } from "./suite";
import { HookFn } from "../types/HookFn";
import { IHookDefinitionFn } from "../interfaces/suite/IHookDefinitionFn";

/**
 * After all hook
 * @internal
 */
function _afterFn(hookFunction: HookFn): void;
function _afterFn(name: string, hookFunction: HookFn): void;
function _afterFn(nameOrFn: string | HookFn, hookFunction?: HookFn): void {
    const suite = _getCurrentSuite();
    if (isString(nameOrFn) && hookFunction) {
        suite.afterAllHooks.push({ name: nameOrFn, fn: hookFunction });
    } else if (isFunction(nameOrFn)) {
        suite.afterAllHooks.push({ fn: nameOrFn });
    }
}

/**
 * After all hook
 * @since 0.2.0
 */
export const after: IHookDefinitionFn = _afterFn as IHookDefinitionFn;

/**
 * Jasmine style afterAll (alias for after)
 * @since 0.2.0
 */
export const afterAll: IHookDefinitionFn = _afterFn as IHookDefinitionFn;
