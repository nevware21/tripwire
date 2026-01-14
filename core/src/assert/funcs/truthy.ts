/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { MsgSource } from "../type/MsgSource";
import { IAssertScope } from "../interface/IAssertScope";

/**
 * Evaluates if the value is (`loosely`) truthy, it calls {@link IScopeContext.eval}
 * with the result which may throw an {@link AssertionFailure} excetion if the operation
 * evaluates to false.
 * @template R - The type of the current `that` object and what is returned by the function.
 * @param evalMsg - The message to be displayed if the value is not truthy.
 * @returns The current {@link IAssertScope.that} (`this`) object
 */
export function truthyFunc<R>(this: IAssertScope, evalMsg?: MsgSource): R {
    let context = this.context;

    context.eval(!!context.value, evalMsg || "expected {value} to be truthy");

    return this.that;
}

/**
 * Evaluates if the value is (`strictly`) equal to `true`, it calls {@link IScopeContext.eval}
 * with the result which may throw an {@link AssertionFailure} excetion if the operation
 * evaluates to false.
 * @param evalMsg - The message to display if the value is not strictly true.
 * @returns The current {@link IAssertScope.that} (`this`) object
 */
export function strictlyTruthyFunc<R>(this: IAssertScope, evalMsg?: MsgSource): R {
    let context = this.context;

    context.eval(context.value === true, evalMsg || "expected {value} to be strictly true");

    return this.that;
}