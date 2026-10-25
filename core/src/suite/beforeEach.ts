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
 * Before each hook
 * @internal
 */
function _beforeEachFn(hookFunction: HookFn): void;
function _beforeEachFn(name: string, hookFunction: HookFn): void;
function _beforeEachFn(nameOrFn: string | HookFn, hookFunction?: HookFn): void {
    const suite = _getCurrentSuite();
    if (isString(nameOrFn) && hookFunction) {
        suite.beforeEachHooks.push({ name: nameOrFn, fn: hookFunction });
    } else if (isFunction(nameOrFn)) {
        suite.beforeEachHooks.push({ fn: nameOrFn });
    }
}

/**
 * Before each hook
 * @since 0.2.0
 */
export const beforeEach: IHookDefinitionFn = _beforeEachFn as IHookDefinitionFn;
