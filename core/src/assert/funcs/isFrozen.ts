/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IAssertScope } from "../interface/IAssertScope";
import { MsgSource } from "../interface/types";

export function isFrozenFunc<R>(this: IAssertScope, evalMsg?: MsgSource): R{
    let scope = this;
    let context = scope.context;
    context.eval(Object.isFrozen(context.value), evalMsg || "expected {value} to be frozen");

    return scope.that;
}