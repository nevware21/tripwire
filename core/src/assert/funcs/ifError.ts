/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { isError } from "@nevware21/ts-utils";
import { IAssertScope } from "../interface/IAssertScope";
import { MsgSource } from "../type/MsgSource";

/**
 * Asserts that the target is falsy or throws the error if it is an Error instance.
 * This is commonly used in Node.js-style callback error handling to check for errors.
 * - If the value is falsy (null, undefined, false, 0, "", etc.), the assertion passes
 * - If the value is an Error instance, that error is thrown
 * - If the value is truthy but not an Error, an AssertionFailure is thrown
 *
 * @since 0.1.5
 * @param this - The assert scope.
 * @param evalMsg - The message to display if the assertion fails.
 * @returns - The assert scope.
 * @example
 * ```typescript
 * import { assert } from "@nevware21/tripwire";
 *
 * assert.ifError(null);          // Passes - null is falsy
 * assert.ifError(undefined);     // Passes - undefined is falsy
 * assert.ifError(false);         // Passes - false is falsy
 * assert.ifError(0);             // Passes - 0 is falsy
 * assert.ifError("");            // Passes - empty string is falsy
 *
 * // Throws the error itself
 * assert.ifError(new Error("Something went wrong"));
 *
 * // Throws AssertionFailure
 * assert.ifError(true);          // Truthy but not an Error
 * assert.ifError("error");       // Truthy but not an Error
 * assert.ifError(1);             // Truthy but not an Error
 * ```
 */
export function ifErrorFunc<R>(this: IAssertScope, evalMsg?: MsgSource): R {
    let context = this.context;
    let value = context.value;

    // If the value is an Error, throw it
    if (isError(value)) {
        throw value;
    }

    // If the value is truthy (but not an Error), fail the assertion
    context.eval(
        !value,
        evalMsg || "expected {value} to be falsy or an Error"
    );

    return this.that;
}
