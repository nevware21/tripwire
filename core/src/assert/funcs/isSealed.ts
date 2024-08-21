/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { MsgSource } from "../interface/types";
import { IAssertScope } from "../interface/IAssertScope";

export function isSealedFunc<R>(this: IAssertScope, evalMsg?: MsgSource): R {
    let scope = this;
    let context = scope.context;
    context.eval(Object.isSealed(context.value), evalMsg || "expected {value} to be sealed");

    return scope.that;
}