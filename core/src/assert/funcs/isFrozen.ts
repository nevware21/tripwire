/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2025 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { objIsFrozen } from "@nevware21/ts-utils";
import { IAssertScope } from "../interface/IAssertScope";
import { MsgSource } from "../type/MsgSource";

export function isFrozenFunc<R>(this: IAssertScope, evalMsg?: MsgSource): R{
    let scope = this;
    let context = scope.context;
    context.eval(objIsFrozen(context.value), evalMsg || "expected {value} to be frozen");

    return scope.that;
}