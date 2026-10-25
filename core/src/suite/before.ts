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
 * Before all hook
 * @internal
 */
function _beforeFn(hookFunction: HookFn): void;
function _beforeFn(name: string, hookFunction: HookFn): void;
function _beforeFn(nameOrFn: string | HookFn, hookFunction?: HookFn): void {
    const suite = _getCurrentSuite();
    if (isString(nameOrFn) && hookFunction) {
        suite.beforeAllHooks.push({ name: nameOrFn, fn: hookFunction });
    } else if (isFunction(nameOrFn)) {
        suite.beforeAllHooks.push({ fn: nameOrFn });
    }
}

/**
 * Before all hook
 * @since 0.2.0
 */
export const before: IHookDefinitionFn = _beforeFn as IHookDefinitionFn;

/**
 * Jasmine style beforeAll (alias for before)
 * @since 0.2.0
 */
export const beforeAll: IHookDefinitionFn = _beforeFn as IHookDefinitionFn;
