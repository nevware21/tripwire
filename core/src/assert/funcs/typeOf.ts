/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { MsgSource } from "../interface/types";
import { IAssertScope } from "../interface/IAssertScope";
import { isArray, isFunction, strLower } from "@nevware21/ts-utils";

/**
 * Checks if the current value's type matches the expected type string.
 * Uses the JavaScript `typeof` operator for type comparison.
 *
 * Valid type strings include:
 * - "string"
 * - "number"
 * - "bigint"
 * - "boolean"
 * - "symbol"
 * - "undefined"
 * - "object" (includes null, arrays, and objects)
 * - "null"
 * - "array"
 * - "function" (includes async, generator, and async generator functions)
 * - "asyncfunction"
 * - "generatorfunction"
 * - "asyncgeneratorfunction"
 *
 * @param this - The current {@link IAssertScope} object
 * @param type - The expected type string (e.g., "string", "number", "function")
 * @param evalMsg - The message to display if the value's type doesn't match
 * @returns The current {@link IAssertScope.that} (`this`) object
 * @since 0.1.5
 */
export function typeOfFunc<R>(this: IAssertScope, type: string, evalMsg?: MsgSource): R {
    let context = this.context;
    let value = context.value;
    let actualType = typeof value;
    let specificType: string;
    
    if (value === null) {
        specificType = "null";
    } else if (isFunction(value)) {
        specificType = value.constructor ? value.constructor.name : actualType;
    } else if (isArray(value)) {
        specificType = "Array";
    }

    context.set("type", type);
    context.set("actualType", actualType);
    if (specificType) {
        context.set("specificType", specificType);
    }

    let lwrType = strLower(type);

    context.eval(
        strLower(actualType) === lwrType || (specificType && strLower(specificType) === lwrType),
        evalMsg || "expected {value} to be of type " + type + " but got " + strLower(specificType || actualType)
    );

    return this.that;
}
