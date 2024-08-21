/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { isStrictNullOrUndefined } from "@nevware21/ts-utils";
import { IAssertScope } from "../interface/IAssertScope";
import { MsgSource } from "../interface/types";

export function isIterableFunc<R>(this: IAssertScope, evalMsg?: MsgSource): R{
    let scope = this;
    let context = scope.context;
    
    context.eval(!isStrictNullOrUndefined(context.value) && context.value[Symbol.iterator], evalMsg || "expected {value} to be an iterable");

    return scope.that;
}