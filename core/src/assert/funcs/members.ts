/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { arrForEach, arrFrom, arrIndexOf } from "@nevware21/ts-utils";
import { IAssertScope } from "../interface/IAssertScope";
import { MsgSource } from "../type/MsgSource";
import { ArrayLikeOrSizedIterable } from "../type/ArrayLikeOrIterable";
import { _deepEqual } from "./equal";
import { _getArrayLikeOrIterableSize, _isArrayLikeOrIterable, _iterateForEachItem } from "../internal/_isArrayLikeOrIterable";
import { IScopeContext } from "../interface/IScopeContext";

function _checkActualAndExpected(context: IScopeContext, value: any, expected: any, evalMsg?: MsgSource): void {
    context.set("expected", expected);

    // Validate that both values conform to ArrayLikeOrSizedIterable
    if (!_isArrayLikeOrIterable(value)) {
        context.fail(evalMsg || "expected {value} to be an array-like or sized iterable");
    }

    if (!_isArrayLikeOrIterable(expected)) {
        context.fail(evalMsg || "expected argument ({expected}) to be an array-like or sized iterable");
    }
}

/**
 * Helper function to check if two arrays have the same members (regardless of order).
 * Uses strict equality (===) for comparison.
 * @param actual - The actual array or Set.
 * @param expected - The expected array or Set.
 * @returns True if arrays have same members (regardless of order), false otherwise.
 */
function _hasSameMembers(actual: ArrayLikeOrSizedIterable<any>, expected: ArrayLikeOrSizedIterable<any>): boolean {
    if (_getArrayLikeOrIterableSize(actual) !== _getArrayLikeOrIterableSize(expected)) {
        return false;
    }

    let result = true;

    // Create a copy of expected to track used items
    // While this will use more memory its faster than searching the expected for each actual item
    let expectedArray: any[] = arrFrom(expected);

    _iterateForEachItem(actual, (actItem) => {
        let idx = arrIndexOf(expectedArray, actItem);
        if (idx === -1) {
            result = false;
            return -1;
        }

        // Remove the matched item so duplicates are handled correctly
        expectedArray.splice(idx, 1);
    });

    return result;
}

/**
 * Helper function to check if two arrays have the same members with deep equality (regardless of order).
 * @param actual - The actual array or Set.
 * @param expected - The expected array or Set.
 * @returns True if arrays have same members (regardless of order) with deep equality, false otherwise.
 */
function _hasSameDeepMembers(actual: ArrayLikeOrSizedIterable<any>, expected: ArrayLikeOrSizedIterable<any>): boolean {
    if (_getArrayLikeOrIterableSize(actual) !== _getArrayLikeOrIterableSize(expected)) {
        return false;
    }

    let result = true;

    // Create a copy of expected to track used items
    // While this will use more memory its faster than searching the expected for each actual item
    let expectedArray: any[] = arrFrom(expected);

    _iterateForEachItem(actual, (actItem) => {
        let found = false;
        arrForEach(expectedArray, (expItem, idx) => {
            if (_deepEqual(actItem, expItem)) {
                expectedArray.splice(idx, 1);
                found = true;
                return -1; // Stop iteration
            }
        });

        if (!found) {
            result = false;
            return -1;
        }
    });
    
    return result;
}

/**
 * Asserts that the target has the same members as the expected value, regardless of order.
 * Uses strict equality (===) for comparison.
 * Both the target and expected values must conform to {@link ArrayLikeOrSizedIterable} but can be different concrete types.
 *
 * **Note on NaN:** Since this function uses strict equality (===), NaN values will NOT match other NaN values
 * (because NaN !== NaN in JavaScript). If you need NaN values to be considered equal, use {@link sameDeepMembersFunc}
 * which uses deep equality comparison.
 *
 * @param this - The assert scope.
 * @param expected - The expected collection to compare against (must be an {@link ArrayLikeOrSizedIterable}).
 * @param evalMsg - The message to display if the assertion fails.
 * @returns - The assert scope.
 * @since 0.1.5
 * @example
 * ```typescript
 * import { assert } from "@nevware21/tripwire";
 *
 * assert([1, 2, 3]).has.include.sameMembers([3, 2, 1]);     // Passes - same members, different order
 * assert([1, 2, 2, 3]).has.include.sameMembers([3, 2, 2, 1]); // Passes - duplicates handled
 * assert([1, 2, 3]).has.include.sameMembers([1, 2]);        // Fails - different length
 * assert([1, 2, 3]).has.include.sameMembers([1, 2, 4]);     // Fails - different members
 * assert(new Set([1, 2, 3])).has.include.sameMembers(new Set([3, 2, 1])); // Passes - different types
 *
 * // NaN behavior with strict equality
 * assert([NaN, 0]).has.include.sameMembers([0, NaN]);       // Fails - NaN !== NaN
 * assert([NaN, 0]).has.include.sameDeepMembers([0, NaN]);   // Passes - deep equality handles NaN
 * ```
 */
export function sameMembersFunc<R>(this: IAssertScope, expected: ArrayLikeOrSizedIterable, evalMsg?: MsgSource): R {
    let context = this.context;
    let value = context.value;

    _checkActualAndExpected(context, value, expected, evalMsg);

    // Check if arrays have the same members
    context.eval(
        _hasSameMembers(value, expected),
        evalMsg || "expected {value} to have the same members as {expected}"
    );

    return this.that;
}

/**
 * Asserts that the target has the same members as the expected value, regardless of order.
 * Uses deep equality for comparison.
 * Both the target and expected values must conform to {@link ArrayLikeOrSizedIterable} but can be different concrete types.
 * @param this - The assert scope.
 * @param expected - The expected collection to compare against (must be an {@link ArrayLikeOrSizedIterable}).
 * @param evalMsg - The message to display if the assertion fails.
 * @returns - The assert scope.
 * @since 0.1.5
 * @example
 * ```typescript
 * import { assert } from "@nevware21/tripwire";
 *
 * assert([{a: 1}, {b: 2}]).has.deep.sameMembers([{b: 2}, {a: 1}]);  // Passes - deep equality
 * assert([[1, 2], [3, 4]]).has.deep.sameMembers([[3, 4], [1, 2]]);  // Passes - nested arrays
 * assert([{a: 1}]).has.deep.sameMembers([{a: 2}]);                  // Fails - different values
 * assert(new Set([{a: 1}])).has.deep.sameMembers([{a: 1}]);         // Passes - different types
 * ```
 */
export function sameDeepMembersFunc<R>(this: IAssertScope, expected: ArrayLikeOrSizedIterable, evalMsg?: MsgSource): R {
    let context = this.context;
    let value = context.value;

    _checkActualAndExpected(context, value, expected, evalMsg);

    // Check if arrays have the same members with deep equality
    context.eval(
        _hasSameDeepMembers(value, expected),
        evalMsg || "expected {value} to have the same deeply equal members as {expected}"
    );

    return this.that;
}

/**
 * Asserts that the target has the same members in the same order as the expected value.
 * Uses strict equality (===) for comparison.
 * Both the target and expected values must conform to {@link ArrayLikeOrSizedIterable} but can be different concrete types.
 * Note: Sets maintain insertion order, so the order of elements matters.
 *
 * **Note on NaN:** Since this function uses strict equality (===), NaN values will NOT match other NaN values.
 * Use {@link sameDeepOrderedMembersFunc} if you need NaN values to be considered equal.
 *
 * @param this - The assert scope.
 * @param expected - The expected collection to compare against (must be an {@link ArrayLikeOrSizedIterable}).
 * @param evalMsg - The message to display if the assertion fails.
 * @returns - The assert scope.
 * @since 0.1.5
 * @example
 * ```typescript
 * import { assert } from "@nevware21/tripwire";
 *
 * assert([1, 2, 3]).has.include.sameOrderedMembers([1, 2, 3]);  // Passes - same order
 * assert([1, 2, 3]).has.include.sameOrderedMembers([3, 2, 1]);  // Fails - different order
 * assert([1, 2, 3]).has.include.sameOrderedMembers([1, 2]);     // Fails - different length
 * assert(new Set([1, 2, 3])).has.include.sameOrderedMembers([1, 2, 3]); // Passes - different types
 * ```
 */
export function sameOrderedMembersFunc<R>(this: IAssertScope, expected: ArrayLikeOrSizedIterable, evalMsg?: MsgSource): R {
    let context = this.context;
    let value = context.value;

    _checkActualAndExpected(context, value, expected, evalMsg);

    // Check length first
    if (_getArrayLikeOrIterableSize(value) !== _getArrayLikeOrIterableSize(expected)) {
        context.eval(false, evalMsg || "expected {value} to have the same ordered members as {expected}");
        return this.that;
    }

    let result = true;
    let expectedArray: any[] = arrFrom(expected);

    // Check if all members match in order
    _iterateForEachItem(value, (actItem, index) => {
        if (actItem !== expectedArray[index]) {
            result = false;
            return -1;
        }
    });

    context.eval(result, evalMsg || "expected {value} to have the same ordered members as {expected}");

    return this.that;
}

/**
 * Asserts that the target has the same members in the same order as the expected value.
 * Uses deep equality for comparison.
 * Both the target and expected values must conform to {@link ArrayLikeOrSizedIterable} but can be different concrete types.
 * Note: Sets maintain insertion order, so the order of elements matters.
 * @param this - The assert scope.
 * @param expected - The expected collection to compare against (must be an {@link ArrayLikeOrSizedIterable}).
 * @param evalMsg - The message to display if the assertion fails.
 * @returns - The assert scope.
 * @since 0.1.5
 * @example
 * ```typescript
 * import { assert } from "@nevware21/tripwire";
 *
 * assert([{a: 1}, {b: 2}]).has.deep.sameOrderedMembers([{a: 1}, {b: 2}]);  // Passes - deep equality
 * assert([[1, 2], [3, 4]]).has.deep.sameOrderedMembers([[1, 2], [3, 4]]);  // Passes - nested arrays
 * assert([{a: 1}, {b: 2}]).has.deep.sameOrderedMembers([{b: 2}, {a: 1}]);  // Fails - different order
 * assert(new Set([{a: 1}])).has.deep.sameOrderedMembers([{a: 1}]);         // Passes - different types
 * ```
 */
export function sameDeepOrderedMembersFunc<R>(this: IAssertScope, expected: ArrayLikeOrSizedIterable, evalMsg?: MsgSource): R {
    let context = this.context;
    let value = context.value;

    _checkActualAndExpected(context, value, expected, evalMsg);

    // Check length first
    if (_getArrayLikeOrIterableSize(value) !== _getArrayLikeOrIterableSize(expected)) {
        context.eval(false, evalMsg || "expected {value} to have the same ordered members as {expected}");
        return this.that;
    }

    let result = true;
    let expectedArray: any[] = arrFrom(expected);

    // Check if all members match in order
    _iterateForEachItem(value, (actItem, index) => {
        if (!_deepEqual(actItem, expectedArray[index])) {
            result = false;
            return -1;
        }
    });

    context.eval(result, evalMsg || "expected {value} to have the same ordered members as {expected}");

    return this.that;
}

/**
 * Asserts that the target includes all members of the expected value (order doesn't matter).
 * Uses strict equality (===) for comparison.
 * Both the target and expected values must conform to {@link ArrayLikeOrSizedIterable} but can be different concrete types.
 *
 * **Note on NaN:** Since this function uses strict equality (===), NaN values will NOT match other NaN values.
 * Use {@link includeDeepMembersFunc} if you need NaN values to be considered equal.
 *
 * @param this - The assert scope.
 * @param expected - The expected subset collection to check for (must be an {@link ArrayLikeOrSizedIterable}).
 * @param evalMsg - The message to display if the assertion fails.
 * @returns - The assert scope.
 * @since 0.1.5
 * @example
 * ```typescript
 * import { assert } from "@nevware21/tripwire";
 *
 * assert([1, 2, 3, 4]).includes.members([2, 4]);        // Passes - subset present
 * assert([1, 2, 3, 4]).includes.members([4, 2]);        // Passes - order doesn't matter
 * assert([1, 2, 3]).includes.members([1, 2, 3, 4]);     // Fails - not a subset
 * assert([1, 2, 3]).includes.members([5]);              // Fails - member not found
 * assert(new Set([1, 2, 3, 4])).includes.members([2, 4]); // Passes - different types
 *
 * // NaN behavior
 * assert([NaN, 1, 2]).includes.members([NaN]);          // Fails - NaN !== NaN with strict equality
 * ```
 */
export function includeMembersFunc<R>(this: IAssertScope, expected: ArrayLikeOrSizedIterable, evalMsg?: MsgSource): R {
    let context = this.context;
    let value = context.value;

    _checkActualAndExpected(context, value, expected, evalMsg);

    let result = true;
    let valueArray = arrFrom(value);
    
    _iterateForEachItem(expected, (expItem) => {
        let index = arrIndexOf(valueArray, expItem);
        if (index === -1) {
            result = false;
            return -1;
        }

        // Remove the matched element so it can't be matched again
        valueArray.splice(index, 1);
    });

    context.eval(result, evalMsg || "expected {value} to include members {expected}");

    return this.that;
}

/**
 * Asserts that the target includes all members of the expected value as a consecutive ordered subsequence.
 * Uses strict equality (===) for comparison.
 * Both the target and expected values must conform to {@link ArrayLikeOrSizedIterable} but can be different concrete types.
 * @param this - The assert scope.
 * @param expected - The expected subset collection to check for (must be an {@link ArrayLikeOrSizedIterable}).
 * @param evalMsg - The message to display if the assertion fails.
 * @returns - The assert scope.
 * @since 0.1.5
 * @example
 * ```typescript
 * import { assert } from "@nevware21/tripwire";
 *
 * assert([1, 2, 3, 4]).includes.orderedMembers([2, 3]);        // Passes - consecutive subset
 * assert([1, 2, 3, 4]).includes.orderedMembers([1, 2, 3]);     // Passes - consecutive subset at start
 * assert([1, 2, 3, 4]).includes.orderedMembers([2, 4]);        // Fails - not consecutive
 * assert([1, 2, 3, 4]).includes.orderedMembers([3, 2]);        // Fails - wrong order
 * assert([1, 2, 3]).includes.orderedMembers([1, 2, 3, 4]);     // Fails - superset not subset
 * assert(new Set([1, 2, 3, 4])).includes.orderedMembers([2, 3]); // Passes - different types
 * ```
 */
export function includeOrderedMembersFunc<R>(this: IAssertScope, expected: ArrayLikeOrSizedIterable, evalMsg?: MsgSource): R {
    let context = this.context;
    let value = context.value;

    _checkActualAndExpected(context, value, expected, evalMsg);

    // Check if expected array appears as a consecutive subsequence
    if (_getArrayLikeOrIterableSize(expected) === 0) {
        context.eval(true, evalMsg || "expected {value} to include ordered members {expected}");
        return this.that;
    }

    let result = false;
    let valueArray = arrFrom(value);
    let expectedArray: any[] = arrFrom(expected);

    // Check if all expected members are present (with strict equality)
    for (let lp = 0; lp <= valueArray.length - expectedArray.length; lp++) {
        if (valueArray[lp] === expectedArray[0]) {
            let match = true;

            // Check for match starting at this position
            arrForEach(expectedArray, (expItem, idx) => {
                if (valueArray[lp + idx] !== expItem) {
                    match = false;
                    return -1; // Stop iteration
                }
            });

            if (match) {
                result = true;
                break;
            }
        }
    }

    context.eval(result, evalMsg || "expected {value} to include ordered members {expected}");

    return this.that;
}

/**
 * Asserts that the target includes all members of the expected value (order doesn't matter).
 * Uses deep equality for comparison.
 * Both the target and expected values must conform to {@link ArrayLikeOrSizedIterable} but can be different concrete types.
 * @param this - The assert scope.
 * @param expected - The expected subset collection to check for (must be an {@link ArrayLikeOrSizedIterable}).
 * @param evalMsg - The message to display if the assertion fails.
 * @returns - The assert scope.
 * @since 0.1.5
 * @example
 * ```typescript
 * import { assert } from "@nevware21/tripwire";
 *
 * assert([{a: 1}, {b: 2}, {c: 3}]).has.deep.includeMembers([{b: 2}, {a: 1}]);  // Passes
 * assert([[1, 2], [3, 4]]).has.deep.includeMembers([[1, 2]]);                   // Passes
 * assert([{a: 1}]).has.deep.includeMembers([{a: 2}]);                           // Fails - not found
 * assert(new Set([{a: 1}, {b: 2}])).has.deep.includeMembers([{a: 1}]);          // Passes - different types
 * ```
 */
export function includeDeepMembersFunc<R>(this: IAssertScope, expected: ArrayLikeOrSizedIterable, evalMsg?: MsgSource): R {
    let context = this.context;
    let value = context.value;

    _checkActualAndExpected(context, value, expected, evalMsg);

    // Check if all expected members are present (with deep equality)
    let result = true;
    let valueArray = arrFrom(value);
    let expectedArray: any[] = arrFrom(expected);

    arrForEach(expectedArray, (expItem) => {
        let found = false;

        // Search for a deep equal match in the actual value
        arrForEach(valueArray, (valItem, j) => {
            if (_deepEqual(valItem, expItem)) {
                // Remove the matched element so it can't be matched again
                valueArray.splice(j, 1);
                found = true;
                return -1; // Stop iteration
            }
        });

        if (!found) {
            result = false;
            return -1; // Stop iteration
        }
    });

    context.eval(result, evalMsg || "expected {value} to include deep members {expected}");

    return this.that;
}

/**
 * Asserts that the target includes all members of the expected value as a consecutive ordered subsequence.
 * Uses deep equality for comparison.
 * Both the target and expected values must conform to {@link ArrayLikeOrSizedIterable} but can be different concrete types.
 * @param this - The assert scope.
 * @param expected - The expected subset collection to check for (must be an {@link ArrayLikeOrSizedIterable}).
 * @param evalMsg - The message to display if the assertion fails.
 * @returns - The assert scope.
 * @since 0.1.5
 * @example
 * ```typescript
 * import { assert } from "@nevware21/tripwire";
 *
 * assert([{a: 1}, {b: 2}, {c: 3}]).has.deep.includeOrderedMembers([{b: 2}, {c: 3}]);  // Passes - consecutive
 * assert([{a: 1}, {b: 2}, {c: 3}]).has.deep.includeOrderedMembers([{a: 1}, {c: 3}]);  // Fails - not consecutive
 * assert([{a: 1}, {b: 2}, {c: 3}]).has.deep.includeOrderedMembers([{b: 2}, {a: 1}]);  // Fails - wrong order
 * assert(new Set([{a: 1}, {b: 2}, {c: 3}])).has.deep.includeOrderedMembers([{a: 1}, {b: 2}]); // Passes - different types
 * ```
 */
export function includeDeepOrderedMembersFunc<R>(this: IAssertScope, expected: ArrayLikeOrSizedIterable, evalMsg?: MsgSource): R {
    let context = this.context;
    let value = context.value;
    let result = true;

    _checkActualAndExpected(context, value, expected, evalMsg);

    // Check if expected array appears as a consecutive subsequence with deep equality
    if (_getArrayLikeOrIterableSize(expected) > 0) {
        let valueArray = arrFrom(value);
        let expectedArray: any[] = arrFrom(expected);
        let expLen = expectedArray.length;

        // Assume no match until found
        result = false;

        // Check if all expected members are present (with deep equality)
        for (let lp = 0; lp <= valueArray.length - expLen; lp++) {
            let match = true;

            // Check for match starting at this position
            arrForEach(expectedArray, (expItem, idx) => {
                if (!_deepEqual(valueArray[lp + idx], expItem)) {
                    match = false;
                    return -1; // Stop iteration
                }
            });

            if (match) {
                result = true;
                break;
            }
        }
    }

    context.eval(result, evalMsg || "expected {value} to include deep ordered members {expected}");
    
    return this.that;
}

/**
 * Asserts that the target starts with the expected members in order (consecutive from the beginning).
 * Uses strict equality (===) for comparison.
 * Both the target and expected values must conform to {@link ArrayLikeOrSizedIterable} but can be different concrete types.
 * @param this - The assert scope.
 * @param expected - The expected starting sequence (must be an {@link ArrayLikeOrSizedIterable}).
 * @param evalMsg - The message to display if the assertion fails.
 * @returns - The assert scope.
 * @since 0.1.5
 * @example
 * ```typescript
 * import { assert } from "@nevware21/tripwire";
 *
 * assert([1, 2, 3, 4]).has.startsWithMembers([1, 2]);        // Passes - starts with [1, 2]
 * assert([1, 2, 3, 4]).has.startsWithMembers([1, 2, 3]);     // Passes - starts with [1, 2, 3]
 * assert([1, 2, 3, 4]).has.startsWithMembers([2, 3]);        // Fails - doesn't start with [2, 3]
 * assert([1, 2, 3, 4]).has.startsWithMembers([1, 3]);        // Fails - not consecutive from start
 * assert(new Set([1, 2, 3, 4])).has.startsWithMembers([1, 2]); // Passes - different types
 * ```
 */
export function startsWithMembersFunc<R>(this: IAssertScope, expected: ArrayLikeOrSizedIterable, evalMsg?: MsgSource): R {
    let context = this.context;
    let value = context.value;
    let result = false;

    _checkActualAndExpected(context, value, expected, evalMsg);

    // Check if value is long enough
    if (_getArrayLikeOrIterableSize(value) >= _getArrayLikeOrIterableSize(expected)) {
        let valueArray = arrFrom(value);
        let expectedArray: any[] = arrFrom(expected);

        // Assume a match until proven otherwise
        result = true;

        // Check if the sequence matches from the start
        arrForEach(expectedArray, (expItem, i) => {
            if (valueArray[i] !== expItem) {
                result = false;
                return -1; // Stop iteration
            }
        });
    }

    context.eval(result, evalMsg || "expected {value} to start with members {expected}");

    return this.that;
}

/**
 * Asserts that the target starts with the expected members in order (consecutive from the beginning).
 * Uses deep equality for comparison.
 * Both the target and expected values must conform to {@link ArrayLikeOrSizedIterable} but can be different concrete types.
 * @param this - The assert scope.
 * @param expected - The expected starting sequence (must be an {@link ArrayLikeOrSizedIterable}).
 * @param evalMsg - The message to display if the assertion fails.
 * @returns - The assert scope.
 * @since 0.1.5
 * @example
 * ```typescript
 * import { assert } from "@nevware21/tripwire";
 *
 * assert([{a: 1}, {b: 2}, {c: 3}]).has.deep.startsWithMembers([{a: 1}, {b: 2}]);  // Passes
 * assert([{a: 1}, {b: 2}, {c: 3}]).has.deep.startsWithMembers([{a: 1}]);          // Passes
 * assert([{a: 1}, {b: 2}, {c: 3}]).has.deep.startsWithMembers([{b: 2}]);          // Fails - doesn't start with {b: 2}
 * assert(new Set([{a: 1}, {b: 2}])).has.deep.startsWithMembers([{a: 1}]);         // Passes - different types
 * ```
 */
export function startsWithDeepMembersFunc<R>(this: IAssertScope, expected: ArrayLikeOrSizedIterable, evalMsg?: MsgSource): R {
    let context = this.context;
    let value = context.value;
    let result = false;

    _checkActualAndExpected(context, value, expected, evalMsg);

    // Check if value is long enough
    if (_getArrayLikeOrIterableSize(value) >= _getArrayLikeOrIterableSize(expected)) {
        let valueArray = arrFrom(value);
        let expectedArray = arrFrom(expected);

        // Assume a match until proven otherwise
        result = true;

        // Check if the sequence matches from the start
        arrForEach(expectedArray, (expItem, i) => {
            if (!_deepEqual(valueArray[i], expItem)) {
                result = false;
                return -1; // Stop iteration
            }
        });
    }

    context.eval(result, evalMsg || "expected {value} to start with deep members {expected}");

    return this.that;
}

/**
 * Checks if an array ends with a specific sequence of members using strict equality.
 *
 * The function verifies that the last N elements of the array match the expected sequence,
 * where N is the length of the expected array. Uses strict equality (`===`) for comparison.
 *
 * @param expected - The expected sequence that should appear at the end of the array
 * @param evalMsg - Optional custom error message
 * @returns The current assertion scope for chaining
 *
 * @example
 * ```typescript
 * assert([1, 2, 3, 4, 5]).has.endsWithMembers([4, 5]);      // Passes
 * assert([1, 2, 3, 4, 5]).has.endsWithMembers([5]);         // Passes
 * assert([1, 2, 3, 4, 5]).has.endsWithMembers([3, 4]);      // Fails - doesn't end with [3, 4]
 * assert([1, 2, 3]).has.endsWithMembers([]);                // Passes - empty sequence
 * assert(new Set([1, 2, 3])).has.endsWithMembers([2, 3]);   // Passes - different types
 * ```
 */
export function endsWithMembersFunc<R>(this: IAssertScope, expected: ArrayLikeOrSizedIterable, evalMsg?: MsgSource): R {
    let context = this.context;
    let value = context.value;
    let result = false;

    _checkActualAndExpected(context, value, expected, evalMsg);

    // Check if value is long enough
    if (_getArrayLikeOrIterableSize(value) >= _getArrayLikeOrIterableSize(expected)) {
        let valueArray = arrFrom(value);
        let expectedArray: any[] = arrFrom(expected);

        // Assume a match until proven otherwise
        result = true;

        // Check if the sequence matches from the end with strict equality
        let offset = valueArray.length - expectedArray.length;
        arrForEach(expectedArray, (expItem, i) => {
            if (valueArray[offset + i] !== expItem) {
                result = false;
                return -1; // Stop iteration
            }
        });
    }

    context.eval(result, evalMsg || "expected {value} to end with members {expected}");

    return this.that;
}

/**
 * Checks if an array ends with a specific sequence of members using deep equality.
 *
 * The function verifies that the last N elements of the array match the expected sequence,
 * where N is the length of the expected array. Uses deep equality for comparison, making it
 * suitable for arrays containing objects or nested structures.
 *
 * @param expected - The expected sequence that should appear at the end of the array
 * @param evalMsg - Optional custom error message
 * @returns The current assertion scope for chaining
 *
 * @example
 * ```typescript
 * assert([{a: 1}, {b: 2}, {c: 3}]).has.deep.endsWithMembers([{b: 2}, {c: 3}]);  // Passes
 * assert([{a: 1}, {b: 2}, {c: 3}]).has.deep.endsWithMembers([{c: 3}]);          // Passes
 * assert([{a: 1}, {b: 2}, {c: 3}]).has.deep.endsWithMembers([{a: 1}]);          // Fails - doesn't end with {a: 1}
 * assert(new Set([{a: 1}, {b: 2}])).has.deep.endsWithMembers([{b: 2}]);         // Passes - different types
 * ```
 */
export function endsWithDeepMembersFunc<R>(this: IAssertScope, expected: ArrayLikeOrSizedIterable, evalMsg?: MsgSource): R {
    let context = this.context;
    let value = context.value;
    let result = false;

    _checkActualAndExpected(context, value, expected, evalMsg);

    // Check if value is long enough
    if (_getArrayLikeOrIterableSize(value) >= _getArrayLikeOrIterableSize(expected)) {
        let valueArray = arrFrom(value);
        let expectedArray = arrFrom(expected);

        // Assume a match until proven otherwise
        result = true;

        // Check if the sequence matches from the end with strict equality
        let offset = valueArray.length - expectedArray.length;
        arrForEach(expectedArray, (expItem, i) => {
            if (!_deepEqual(valueArray[offset + i], expItem)) {
                result = false;
                return -1; // Stop iteration
            }
        });
    }

    context.eval(result, evalMsg || "expected {value} to end with deep members {expected}");

    return this.that;
}

/**
 * Checks if an array contains members in a specific order (non-consecutive) using strict equality.
 *
 * The function verifies that all expected members appear in the array in the specified order,
 * but they don't need to be consecutive - other elements can appear between them.
 * This is subsequence matching. Uses strict equality (`===`) for comparison.
 *
 * @param expected - The expected members that should appear in order (with possible gaps)
 * @param evalMsg - Optional custom error message
 * @returns The current assertion scope for chaining
 *
 * @example
 * ```typescript
 * assert([1, 2, 3, 4, 5]).includes.subsequence([2, 4, 5]);     // Passes - in order with gaps
 * assert([1, 2, 3, 4, 5]).includes.subsequence([1, 3, 5]);     // Passes - in order with gaps
 * assert([1, 2, 3, 4, 5]).includes.subsequence([5, 3, 1]);     // Fails - wrong order
 * assert([1, 2, 3, 4, 5]).includes.subsequence([2, 2]);        // Fails - not enough 2s
 * assert(new Set([1, 2, 3])).includes.subsequence([1, 3]);     // Passes - different types
 * ```
 */
export function subsequenceFunc<R>(this: IAssertScope, expected: ArrayLikeOrSizedIterable, evalMsg?: MsgSource): R {
    let context = this.context;
    let value = context.value;

    _checkActualAndExpected(context, value, expected, evalMsg);

    // Check if all expected members appear in order (non-consecutive)
    let valueArray = arrFrom(value);
    let expectedArray = arrFrom(expected);
    let valueIdx = 0;
    let expectedIdx = 0;

    while (valueIdx < valueArray.length && expectedIdx < expectedArray.length) {
        if (valueArray[valueIdx] === expectedArray[expectedIdx]) {
            expectedIdx++;
        }

        valueIdx++;
    }

    // All expected members were found in order
    let result = expectedIdx === expectedArray.length;

    context.eval(result, evalMsg || "expected {value} to include subsequence {expected}");

    return this.that;
}

/**
 * Checks if an array contains a subsequence using deep equality.
 *
 * The function verifies that all expected members appear in the array in the specified order,
 * but they don't need to be consecutive - other elements can appear between them.
 * This is subsequence matching with deep equality, suitable for arrays containing objects
 * or nested structures.
 *
 * @param expected - The expected members that should appear in order (with possible gaps)
 * @param evalMsg - Optional custom error message
 * @returns The current assertion scope for chaining
 *
 * @example
 * ```typescript
 * assert([{a: 1}, {b: 2}, {c: 3}]).deep.includes.subsequence([{a: 1}, {c: 3}]);  // Passes
 * assert([{a: 1}, {b: 2}, {c: 3}]).deep.includes.subsequence([{b: 2}]);          // Passes
 * assert([{a: 1}, {b: 2}, {c: 3}]).deep.includes.subsequence([{c: 3}, {a: 1}]);  // Fails - wrong order
 * assert(new Set([{a: 1}, {b: 2}])).deep.includes.subsequence([{a: 1}]);         // Passes - different types
 * ```
 */
export function deepSubsequenceFunc<R>(this: IAssertScope, expected: ArrayLikeOrSizedIterable, evalMsg?: MsgSource): R {
    let context = this.context;
    let value = context.value;

    _checkActualAndExpected(context, value, expected, evalMsg);

    // Check if all expected members appear in order (non-consecutive) with deep equality
    let valueArray = arrFrom(value);
    let expectedArray = arrFrom(expected);
    let valueIdx = 0;
    let expectedIdx = 0;

    while (valueIdx < valueArray.length && expectedIdx < expectedArray.length) {
        if (_deepEqual(valueArray[valueIdx], expectedArray[expectedIdx])) {
            expectedIdx++;
        }
        valueIdx++;
    }

    // All expected members were found in order
    let result = expectedIdx === expectedArray.length;

    context.eval(result, evalMsg || "expected {value} to include deep subsequence {expected}");

    return this.that;
}
