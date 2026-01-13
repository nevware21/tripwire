/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2025 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { MsgSource } from "../interface/types";
import { IAssertScope } from "../interface/IAssertScope";
import { objIsSealed } from "@nevware21/ts-utils";

export function isSealedFunc<R>(this: IAssertScope, evalMsg?: MsgSource): R {
    let scope = this;
    let context = scope.context;
    context.eval(objIsSealed(context.value), evalMsg || "expected {value} to be sealed");

    return scope.that;
}