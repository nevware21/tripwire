/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { isNumber, isNullOrUndefined, mathAbs } from "@nevware21/ts-utils";
import { IAssertScope } from "../interface/IAssertScope";
import { MsgSource } from "../interface/types";

/**
 * Asserts that the target is a number close to the given number within a specified delta.
 * This is useful for floating-point comparisons where exact equality is not guaranteed.
 * @param this - The assert scope.
 * @param expected - The expected number to compare against.
 * @param delta - The maximum allowed difference between actual and expected. Note: A negative delta will never result in a passing assertion since the absolute difference is always non-negative.
 * @param evalMsg - The message to display if the assertion fails.
 * @returns - The assert scope.
 * @since 0.1.5
 * @example
 * ```typescript
 * import { assert } from "@nevware21/tripwire";
 *
 * assert(1.5).is.closeTo(1.0, 0.5);     // Passes - difference is 0.5
 * assert(10).is.closeTo(20, 20);        // Passes - difference is 10
 * assert(-10).is.closeTo(20, 30);       // Passes - difference is 30
 * assert(2).is.closeTo(1.0, 0.5);       // Fails - difference is 1.0
 * assert([1.5]).is.closeTo(1.0, 0.5);   // Fails - not a number
 * ```
 */
export function closeToFunc<R>(this: IAssertScope, expected: number, delta: number, evalMsg?: MsgSource): R {
    let context = this.context;
    let value = context.value;

    context.set("expected", expected);
    context.set("delta", delta);

    // Validate that actual value is a number (and not NaN)
    if (!isNumber(value) || isNaN(value)) {
        context.fail(evalMsg || "expected {value} to be a number");
    }

    // Validate that expected is a number (and not NaN)
    if (!isNumber(expected) || isNaN(expected)) {
        context.fail(evalMsg || "the expected argument ({expected}) must be a number");
    }

    // Validate that delta is a number and not null/undefined or NaN
    if (isNullOrUndefined(delta) || !isNumber(delta) || isNaN(delta)) {
        context.fail(evalMsg || "the delta argument ({delta}) is required and must be a number");
    }

    // Calculate the absolute difference
    let difference = mathAbs(value - expected);
    context.set("difference", difference);

    // Check if the difference is within the delta
    context.eval(
        difference <= delta,
        evalMsg || "expected {value} to be close to {expected} +/- {delta}"
    );

    return this.that;
}
