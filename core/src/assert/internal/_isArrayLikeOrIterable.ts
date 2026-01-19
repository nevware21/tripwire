/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { arrForEach, isArray, isIterable, isNumber, isObject, iterForOf } from "@nevware21/ts-utils";
import { ArrayLikeOrSizedIterable } from "../type/ArrayLikeOrIterable";

/**
 * Helper function to check if a value is ArrayLike or Iterable with size.
 * @param value - The value to check.
 * @returns True if the value is an array, ArrayLike object, or iterable with size property.
 */
export function _isArrayLikeOrIterable(value: any): boolean {
    let result = false;
    if (value) {
        // Most common case first
        if (isArray(value)) {
            result = true;
        } else if (isObject(value)) {
            // Check if value is ArrayLike (has length property and numeric indices)
            let len = (value as ArrayLike<any>).length;
            if (isNumber(len)) {
                // Check for at least one numeric index if length > 0
                // This validates it's ArrayLike, but doesn't require all indices to exist
                if (len === 0 || (0 in value)) {
                    result = true;
                }
            } else if (isNumber(value.size) && isIterable(value)) {
                // Check if value is a Set/Map (has a size property and is iterable)
                result = true;
            }
        }
    }
    
    return result;
}

/**
 * Helper function to iterate over an ArrayLikeOrSizedIterable object.
 * @param value - The value to iterate over (array, ArrayLike, Set, Map, etc.).
 * @param callback - Function called for each item, it can return -1 to stop the iteration early.
 */
export function _iterateForEachItem<T>(value: ArrayLikeOrSizedIterable<T>, callback: (item: T, idx?: number) => number | void): void {

    if (value && callback) {
        if (isArray(value) || (isObject(value) && isNumber((value as ArrayLike<any>).length))) {
            // Most common case first
            arrForEach(value as ArrayLike<any>, callback);
        } else if (isIterable(value)) {
            iterForOf(value, callback);
        }
    }
}

/**
 * Helper function to get the size of an ArrayLikeOrSizedIterable.
 * @param value - The value to get the size of.
 * @returns The size of the array-like or iterable.
 */
export function _getArrayLikeOrIterableSize(value: ArrayLikeOrSizedIterable<any>): number {
    let size = 0;
    if (value) {
        if (isArray(value) || (isObject(value) && isNumber((value as ArrayLike<any>).length))) {
            size = (value as ArrayLike<any>).length;
        } else if (isIterable(value) && isNumber((value as { size: number }).size)) {
            size = (value as { size: number }).size;
        }
    }

    return size;
}
