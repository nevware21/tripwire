/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { objIsSealed } from "@nevware21/ts-utils";
import { IAssertScope } from "../interface/IAssertScope";
import { MsgSource } from "../../types/MsgSource";

export function isSealedFunc<R>(this: IAssertScope, evalMsg?: MsgSource): R {
    let scope = this;
    let context = scope.context;
    context.eval(objIsSealed(context.value), evalMsg || "expected {value} to be sealed");

    return scope.that;
}
