/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { arrFrom, arrIndexOf, arrSlice, isArray, isFunction, isNumber, isObject, safeGet } from "@nevware21/ts-utils";
import { IAssertScope } from "../interface/IAssertScope";
import { MsgSource } from "../type/MsgSource";
import { ArrayLikeOrSizedIterable } from "../type/ArrayLikeOrIterable";
import { _deepEqual } from "./equal";

/**
 * Helper function to convert a value to an array.
 * Accepts arrays directly, or any object that has a "size" property and is iterable (such as Sets).
 * @param value - The value to convert.
 * @returns The value as an array, or null if it's neither an array nor an iterable object with a size property.
 */
function _toArray(value: any): any[] {
    if (isArray(value)) {
        return value;
    }
    
    // Check if value is ArrayLike (has length property and numeric indices)
    // Note: We only validate that index 0 exists when length > 0 as a minimal check.
    // Array.from will handle sparse/incomplete ArrayLike objects by filling missing
    // indices with undefined, which matches JavaScript's standard behavior for
    // ArrayLike objects (e.g., arguments, NodeList with gaps).
    if (safeGet<boolean>(() => {
        if (!isObject(value) || value === null || !("length" in value) || !isNumber(value.length)) {
            return false;
        }

        // Check for at least one numeric index if length > 0
        // This validates it's ArrayLike, but doesn't require all indices to exist
        if (value.length > 0 && !(0 in value)) {
            return false;
        }

        return true;
    }, false)) {
        return arrFrom(value);
    }
    
    // Check if value is a Set (has a size property and is iterable)
    if (safeGet<boolean>(() => "size" in value && isFunction(value[Symbol.iterator]), false)) {
        return arrFrom(value);
    }
    
    return null;
}

/**
 * Helper function to check if two arrays have the same members (regardless of order).
 * Uses strict equality (===) for comparison.
 * @param actual - The actual array or Set.
 * @param expected - The expected array or Set.
 * @returns True if arrays have same members (regardless of order), false otherwise.
 */
function _hasSameMembers(actual: any[], expected: any[]): boolean {
    if (actual.length !== expected.length) {
        return false;
    }

    // Create a copy of expected to track used items
    let expectedCopy = arrSlice(expected);
    
    for (let i = 0; i < actual.length; i++) {
        let idx = arrIndexOf(expectedCopy, actual[i]);
        if (idx === -1) {
            return false;
        }
        // Remove the matched item so duplicates are handled correctly
        expectedCopy.splice(idx, 1);
    }
    
    return true;
}



/**
 * Helper function to check if two arrays have the same members with deep equality (regardless of order).
 * @param actual - The actual array or Set.
 * @param expected - The expected array or Set.
 * @returns True if arrays have same members (regardless of order) with deep equality, false otherwise.
 */
function _hasSameDeepMembers(actual: any[], expected: any[]): boolean {
    if (actual.length !== expected.length) {
        return false;
    }

    // Create a copy of expected to track used items
    let expectedCopy = arrSlice(expected);
    
    for (let i = 0; i < actual.length; i++) {
        let found = false;
        for (let j = 0; j < expectedCopy.length; j++) {
            if (_deepEqual(actual[i], expectedCopy[j])) {
                expectedCopy.splice(j, 1);
                found = true;
                break;
            }
        }
        if (!found) {
            return false;
        }
    }
    
    return true;
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

    context.set("expected", expected);

    // Convert sized iterables to arrays for comparison
    let valueArray = _toArray(value);
    let expectedArray = _toArray(expected);

    // Validate that both values conform to ArrayLikeOrSizedIterable
    if (valueArray === null) {
        context.fail(evalMsg || "expected {value} to be an array-like or sized iterable");
    }

    if (expectedArray === null) {
        context.fail(evalMsg || "expected argument ({expected}) to be an array-like or sized iterable");
    }

    // Check if arrays have the same members
    context.eval(
        _hasSameMembers(valueArray, expectedArray),
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

    context.set("expected", expected);

    // Convert sized iterables to arrays for comparison
    let valueArray = _toArray(value);
    let expectedArray = _toArray(expected);

    // Validate that both values conform to ArrayLikeOrSizedIterable
    if (valueArray === null) {
        context.fail(evalMsg || "expected {value} to be an array-like or sized iterable");
    }

    if (expectedArray === null) {
        context.fail(evalMsg || "expected argument ({expected}) to be an array-like or sized iterable");
    }

    // Check if arrays have the same members with deep equality
    context.eval(
        _hasSameDeepMembers(valueArray, expectedArray),
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

    context.set("expected", expected);

    // Convert sized iterables to arrays for comparison
    let valueArray = _toArray(value);
    let expectedArray = _toArray(expected);

    // Validate that both values conform to ArrayLikeOrSizedIterable
    if (valueArray === null) {
        context.fail(evalMsg || "expected {value} to be an array-like or sized iterable");
    }

    if (expectedArray === null) {
        context.fail(evalMsg || "expected argument ({expected}) to be an array-like or sized iterable");
    }

    // Check length first
    if (valueArray.length !== expectedArray.length) {
        context.eval(false, evalMsg || "expected {value} to have the same ordered members as {expected}");
        return this.that;
    }

    // Check if all members match in order
    for (let i = 0; i < valueArray.length; i++) {
        if (valueArray[i] !== expectedArray[i]) {
            context.eval(false, evalMsg || "expected {value} to have the same ordered members as {expected}");
            return this.that;
        }
    }

    context.eval(true, evalMsg || "expected {value} to have the same ordered members as {expected}");

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

    context.set("expected", expected);

    // Convert sized iterables to arrays for comparison
    let valueArray = _toArray(value);
    let expectedArray = _toArray(expected);

    // Validate that both values conform to ArrayLikeOrSizedIterable
    if (valueArray === null) {
        context.fail(evalMsg || "expected {value} to be an array-like or sized iterable");
    }

    if (expectedArray === null) {
        context.fail(evalMsg || "expected argument ({expected}) to be an array-like or sized iterable");
    }

    // Check length first
    if (valueArray.length !== expectedArray.length) {
        context.eval(false, evalMsg || "expected {value} to have the same ordered members as {expected}");
        return this.that;
    }

    // Check if all members match in order with deep equality
    for (let i = 0; i < valueArray.length; i++) {
        if (!_deepEqual(valueArray[i], expectedArray[i])) {
            context.eval(false, evalMsg || "expected {value} to have the same ordered members as {expected}");
            return this.that;
        }
    }

    context.eval(true, evalMsg || "expected {value} to have the same ordered members as {expected}");

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

    context.set("expected", expected);

    // Convert sized iterables to arrays for comparison
    let valueArray = _toArray(value);
    let expectedArray = _toArray(expected);

    // Validate that both values conform to ArrayLikeOrSizedIterable
    if (valueArray === null) {
        context.fail(evalMsg || "expected {value} to be an array-like or sized iterable");
    }

    if (expectedArray === null) {
        context.fail(evalMsg || "expected argument ({expected}) to be an array-like or sized iterable");
    }

    // Check if all expected members are present (using strict equality)
    // Create a copy of value to track used items (handles duplicates correctly)
    let valueCopy = arrSlice(valueArray);
    
    for (let i = 0; i < expectedArray.length; i++) {
        let index = arrIndexOf(valueCopy, expectedArray[i]);
        if (index === -1) {
            context.eval(false, evalMsg || "expected {value} to include members {expected}");
            return this.that;
        }
        // Remove the matched element so it can't be matched again
        valueCopy.splice(index, 1);
    }

    context.eval(true, evalMsg || "expected {value} to include members {expected}");

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

    context.set("expected", expected);

    // Convert sized iterables to arrays for comparison
    let valueArray = _toArray(value);
    let expectedArray = _toArray(expected);

    // Validate that both values conform to ArrayLikeOrSizedIterable
    if (valueArray === null) {
        context.fail(evalMsg || "expected {value} to be an array-like or sized iterable");
    }

    if (expectedArray === null) {
        context.fail(evalMsg || "expected argument ({expected}) to be an array-like or sized iterable");
    }

    // Check if expected array appears as a consecutive subsequence
    if (expectedArray.length === 0) {
        context.eval(true, evalMsg || "expected {value} to include ordered members {expected}");
        return this.that;
    }

    // Search for the consecutive sequence
    for (let i = 0; i <= valueArray.length - expectedArray.length; i++) {
        let match = true;
        for (let j = 0; j < expectedArray.length; j++) {
            if (valueArray[i + j] !== expectedArray[j]) {
                match = false;
                break;
            }
        }
        if (match) {
            context.eval(true, evalMsg || "expected {value} to include ordered members {expected}");
            return this.that;
        }
    }

    context.eval(false, evalMsg || "expected {value} to include ordered members {expected}");
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

    context.set("expected", expected);

    // Convert sized iterables to arrays for comparison
    let valueArray = _toArray(value);
    let expectedArray = _toArray(expected);

    // Validate that both values conform to ArrayLikeOrSizedIterable
    if (valueArray === null) {
        context.fail(evalMsg || "expected {value} to be an array-like or sized iterable");
    }

    if (expectedArray === null) {
        context.fail(evalMsg || "expected argument ({expected}) to be an array-like or sized iterable");
    }

    // Check if all expected members are present (with deep equality)
    // Create a copy of value to track used items (handles duplicates correctly)
    let valueCopy = arrSlice(valueArray);
    
    for (let i = 0; i < expectedArray.length; i++) {
        let found = false;
        for (let j = 0; j < valueCopy.length; j++) {
            if (_deepEqual(valueCopy[j], expectedArray[i])) {
                // Remove the matched element so it can't be matched again
                valueCopy.splice(j, 1);
                found = true;
                break;
            }
        }
        if (!found) {
            context.eval(false, evalMsg || "expected {value} to include deep members {expected}");
            return this.that;
        }
    }

    context.eval(true, evalMsg || "expected {value} to include deep members {expected}");

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

    context.set("expected", expected);

    // Convert sized iterables to arrays for comparison
    let valueArray = _toArray(value);
    let expectedArray = _toArray(expected);

    // Validate that both values conform to ArrayLikeOrSizedIterable
    if (valueArray === null) {
        context.fail(evalMsg || "expected {value} to be an array-like or sized iterable");
    }

    if (expectedArray === null) {
        context.fail(evalMsg || "expected argument ({expected}) to be an array-like or sized iterable");
    }

    // Check if expected array appears as a consecutive subsequence with deep equality
    if (expectedArray.length === 0) {
        context.eval(true, evalMsg || "expected {value} to include deep ordered members {expected}");
        return this.that;
    }

    // Search for the consecutive sequence
    for (let i = 0; i <= valueArray.length - expectedArray.length; i++) {
        let match = true;
        for (let j = 0; j < expectedArray.length; j++) {
            if (!_deepEqual(valueArray[i + j], expectedArray[j])) {
                match = false;
                break;
            }
        }
        if (match) {
            context.eval(true, evalMsg || "expected {value} to include deep ordered members {expected}");
            return this.that;
        }
    }

    context.eval(false, evalMsg || "expected {value} to include deep ordered members {expected}");
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

    context.set("expected", expected);

    // Convert sized iterables to arrays for comparison
    let valueArray = _toArray(value);
    let expectedArray = _toArray(expected);

    // Validate that both values conform to ArrayLikeOrSizedIterable
    if (valueArray === null) {
        context.fail(evalMsg || "expected {value} to be an array-like or sized iterable");
    }

    if (expectedArray === null) {
        context.fail(evalMsg || "expected argument ({expected}) to be an array-like or sized iterable");
    }

    // Check if expected array appears at the start
    if (expectedArray.length === 0) {
        context.eval(true, evalMsg || "expected {value} to start with members {expected}");
        return this.that;
    }

    // Check if value is long enough
    if (valueArray.length < expectedArray.length) {
        context.eval(false, evalMsg || "expected {value} to start with members {expected}");
        return this.that;
    }

    // Check if the sequence matches from the start
    for (let i = 0; i < expectedArray.length; i++) {
        if (valueArray[i] !== expectedArray[i]) {
            context.eval(false, evalMsg || "expected {value} to start with members {expected}");
            return this.that;
        }
    }

    context.eval(true, evalMsg || "expected {value} to start with members {expected}");
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

    context.set("expected", expected);

    // Convert sized iterables to arrays for comparison
    let valueArray = _toArray(value);
    let expectedArray = _toArray(expected);

    // Validate that both values conform to ArrayLikeOrSizedIterable
    if (valueArray === null) {
        context.fail(evalMsg || "expected {value} to be an array-like or sized iterable");
    }

    if (expectedArray === null) {
        context.fail(evalMsg || "expected argument ({expected}) to be an array-like or sized iterable");
    }

    // Check if expected array appears at the start with deep equality
    if (expectedArray.length === 0) {
        context.eval(true, evalMsg || "expected {value} to start with deep members {expected}");
        return this.that;
    }

    // Check if value is long enough
    if (valueArray.length < expectedArray.length) {
        context.eval(false, evalMsg || "expected {value} to start with deep members {expected}");
        return this.that;
    }

    // Check if the sequence matches from the start with deep equality
    for (let i = 0; i < expectedArray.length; i++) {
        if (!_deepEqual(valueArray[i], expectedArray[i])) {
            context.eval(false, evalMsg || "expected {value} to start with deep members {expected}");
            return this.that;
        }
    }

    context.eval(true, evalMsg || "expected {value} to start with deep members {expected}");
    return this.that;
}

