/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IAssertScope } from "../interface/IAssertScope";
import { MsgSource } from "../type/MsgSource";

/**
 * Asserts that a boolean comparison operation between value and expected using the given operator is true.
 * Supports comparison operators: ==, ===, <, >, <=, >=, !=, !==, typeof
 * The support for typeof is in the form of `typeof XXX` === `"expected"`, where expected is the type name string.
 * @param this - The assert scope.
 * @param operator - The boolean comparison operator to use (or "typeof" for type checking).
 * @param expected - The expected value to compare against (or expected type string for typeof).
 * @param evalMsg - The message to display if the assertion fails.
 * @returns - The assert scope.
 * @since 0.1.5
 * @example
 * ```typescript
 * import { assert } from "@nevware21/tripwire";
 *
 * // Comparison operators
 * assert.operator(1, "<", 2);      // Passes
 * assert.operator(2, ">", 1);      // Passes
 * assert.operator(1, "==", 1);     // Passes
 * assert.operator(1, "===", 1);    // Passes
 * assert.operator(1, "<=", 1);     // Passes
 * assert.operator(1, ">=", 1);     // Passes
 * assert.operator(1, "!=", 2);     // Passes
 * assert.operator(1, "!==", 2);    // Passes
 * assert.operator(1, "!==", "1");  // Passes - type difference
 *
 * // Typeof operator
 * assert.operator("hello", "typeof", "string");  // Passes - simplistic type check
 * assert.operator(123, "typeof", "number");      // Passes
 * assert.operator(true, "typeof", "boolean");    // Passes
 *
 * // Failures
 * assert.operator(2, "<", 1);      // Fails
 * assert.operator(123, "typeof", "string");  // Fails
 * ```
 */
export function operatorFunc<R>(this: IAssertScope, operator: string, expected: any, evalMsg?: MsgSource): R {
    let context = this.context;

    // val1 comes from context.value (the first argument passed to assert.operator)
    let value = context.value;
    let result: boolean;
    
    switch (operator) {
        case "==":
            // eslint-disable-next-line eqeqeq
            result = value == expected;
            break;
        case "===":
            result = value === expected;
            break;
        case "<":
            result = value < expected;
            break;
        case ">":
            result = value > expected;
            break;
        case "<=":
            result = value <= expected;
            break;
        case ">=":
            result = value >= expected;
            break;
        case "!=":
            // eslint-disable-next-line eqeqeq
            result = value != expected;
            break;
        case "!==":
            result = value !== expected;
            break;
        case "typeof":
            result = typeof value === expected;
            break;
        default:
            context.set("operator", operator);
            context.fail(evalMsg || "Invalid operator {operator}");
            return this.that;
    }

    context.set("operator", operator);
    context.set("expected", expected);

    context.eval(
        result,
        evalMsg || ("expected {value} to be " + operator + " {expected}")
    );

    return this.that;
}
