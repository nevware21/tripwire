/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { MsgSource } from "../interface/types";
import { IAssertScope } from "../interface/IAssertScope";
import { objIsExtensible } from "@nevware21/ts-utils";

export function isExtensibleFunc<R>(this: IAssertScope, evalMsg?: MsgSource): R {
    let scope = this;
    let context = scope.context;
    let value = context.value;

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/isExtensible
    context.eval(value === Object(value) && objIsExtensible(value), evalMsg || "expected {value} to be extensible");

    return scope.that;
}