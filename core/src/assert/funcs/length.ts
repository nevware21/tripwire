/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { isNullOrUndefined, isObject, isString } from "@nevware21/ts-utils";
import { IAssertScope } from "../interface/IAssertScope";
import { MsgSource } from "../type/MsgSource";

/**
 * Asserts that the target has a length or size property equal to the given number.
 * Works with arrays, strings, Maps, Sets, and any object with a length or size property.
 * @since 0.1.5
 * @param this - The assert scope.
 * @param length - The expected length or size.
 * @param evalMsg - The message to display if the assertion fails.
 * @returns - The assert scope.
 * @example
 * ```typescript
 * import { assert } from "@nevware21/tripwire";
 *
 * assert([1, 2, 3]).has.lengthOf(3);           // Passes - array length is 3
 * assert("hello").has.lengthOf(5);             // Passes - string length is 5
 * assert(new Map([["a", 1]])).has.lengthOf(1); // Passes - Map size is 1
 * assert(new Set([1, 2])).has.lengthOf(2);     // Passes - Set size is 2
 * assert([1, 2]).has.lengthOf(3);              // Fails - array length is 2, not 3
 * ```
 */
export function lengthFunc<R>(this: IAssertScope, length: number, evalMsg?: MsgSource): R {
    let context = this.context;
    let value = context.value;

    context.set("expected", length);

    // Check if the value has a 'length' property
    // For strings and objects (includes arrays, functions, etc.)
    let hasLength = false;
    let hasSize = false;

    if (!isNullOrUndefined(value)) {
        // Strings have length as a property
        if (isString(value)) {
            hasLength = true;
        } else if (isObject(value)) {
            // Use 'in' operator only for objects
            hasLength = "length" in value;
            hasSize = "size" in value;
        }
    }

    if (!hasLength && !hasSize) {
        context.eval(
            false,
            evalMsg || "expected {value} to have property \"length\" or \"size\""
        );
    } else {
        let actualLength = hasLength ? (value as any).length : (value as any).size;
        context.set("length", actualLength);

        if (hasLength) {
            context.eval(
                actualLength === length,
                evalMsg || "expected {value} to have a length of {expected} but got {length}"
            );
        } else {
            context.eval(
                actualLength === length,
                evalMsg || "expected {value} to have a size of {expected} but got {length}"
            );
        }
    }

    return this.that;
}
