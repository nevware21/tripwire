/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { getLength, isArray, isFunction, isObject, isPrimitive, isString, objKeys, safeGet } from "@nevware21/ts-utils";
import { MsgSource } from "../interface/types";
import { IAssertScope } from "../interface/IAssertScope";

/**
 * Assert that the current value is empty, which means it is either null, undefined,
 * is not truthy (zero), has a length of 0 or is an empty object.
 * @param this - The current {@link IAssertScope} object
 * @param evalMsg - The message to display if the value is not empty
 * @returns The current {@link IAssertScope.that} (`this`) object
 */
export function isEmptyFunc<R>(this: IAssertScope, evalMsg: MsgSource): R {
    let scope = this;
    let context = scope.context;
    let value = context.value;
    let isEmpty = false;

    if (isArray(value) || isString(value)) {
        isEmpty = getLength(value) === 0;
    } else if (isPrimitive(value)) {
        this.fail(evalMsg || "unsupported primitive {value}");
    } else if (isFunction(value)) {
        this.fail(evalMsg || "unsupported {value}");
    } else if (safeGet(() => "size" in value, false)) {
        isEmpty = value.size === 0;
    } else if (isObject(value)) {
        isEmpty = objKeys(value).length === 0;
    } else {
        this.fail(evalMsg || "unsupported value {value}");
    }

    context.eval(isEmpty, evalMsg || "expected {value} to be empty");

    return scope.that;
}
