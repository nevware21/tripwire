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
 * After each hook
 * @internal
 */
function _afterEachFn(hookFunction: HookFn): void;
function _afterEachFn(name: string, hookFunction: HookFn): void;
function _afterEachFn(nameOrFn: string | HookFn, hookFunction?: HookFn): void {
    const suite = _getCurrentSuite();
    if (isString(nameOrFn) && hookFunction) {
        suite.afterEachHooks.push({ name: nameOrFn, fn: hookFunction });
    } else if (isFunction(nameOrFn)) {
        suite.afterEachHooks.push({ fn: nameOrFn });
    }
}

/**
 * After each hook
 * @since 0.2.0
 */
export const afterEach: IHookDefinitionFn = _afterEachFn as IHookDefinitionFn;
