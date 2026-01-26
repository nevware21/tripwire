/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IAssertScope } from "../interface/IAssertScope";
import { ArrayLikeOrSizedIterable } from "../type/ArrayLikeOrIterable";
import { MsgSource } from "../type/MsgSource";
import { _isArrayLikeOrIterable, _iterateForEachItem } from "../internal/_isArrayLikeOrIterable";

/**
 * Asserts that the target value is a member of the given list.
 * Uses strict equality (===) to check if the value is in the list.
 * @param this - The assert scope.
 * @param list - The array, ArrayLike, Set, or Map of possible values to check against.
 * @param evalMsg - The message to display if the assertion fails.
 * @returns - The assert scope.
 * @since 0.1.5
 * @example
 * ```typescript
 * import { assert } from "@nevware21/tripwire";
 *
 * assert(1).is.oneOf([1, 2, 3]);                      // Passes
 * assert("a").is.oneOf(["a", "b", "c"]);              // Passes
 * assert(2).is.oneOf(new Set([1, 2, 3]));             // Passes
 * assert("x").is.not.oneOf(["a", "b", "c"]);          // Passes
 * assert(5).is.oneOf([1, 2, 3]);                      // Fails
 * ```
 */
export function oneOfFunc<R>(this: IAssertScope, list: ArrayLikeOrSizedIterable<any>, evalMsg?: MsgSource): R {
    let context = this.context;
    let value = context.value;

    context.set("list", list);

    // Validate that list is ArrayLike or iterable
    if (!_isArrayLikeOrIterable(list)) {
        context.fatal(evalMsg || "the list argument ({list}) must be an array, ArrayLike, or iterable with size");
    }

    let found = false;
    // Check if value is in the list using strict equality
    _iterateForEachItem(list, (item) => {
        if (item === value) {
            found = true;
            return -1; // Stop iteration
        }
    });

    context.eval(
        found,
        evalMsg || "expected {value} to be one of {list}"
    );

    return this.that;
}
