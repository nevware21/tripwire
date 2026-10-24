/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

/**
 * Represents a value that can be treated as an array-like collection for member comparison operations.
 * Accepts ArrayLike objects (with length and indexed elements) or Iterables with a size property.
 *
 * **Requirements (one of):**
 * - An array (`T[]`)
 * - ArrayLike with `length` property and numeric indexed elements (e.g., `{length: 2, 0: 'a', 1: 'b'}`)
 * - Object with both `size` property (number) and `Symbol.iterator` implementation
 *
 * **Supported types:**
 * - `Array<T>` - Native JavaScript arrays
 * - `TypedArray` types (Uint8Array, Int32Array, Float64Array, etc.) - ArrayLike with length
 * - `NodeList`, `HTMLCollection` - ArrayLike with length (DOM collections)
 * - `Arguments` object - ArrayLike with length (function arguments)
 * - `Set<T>` - Has size property and is iterable
 * - `Map<K, V>` - Has size property and is iterable (iterates over [key, value] pairs)
 * - Any custom ArrayLike object with `length` property and numeric indices
 * - Any custom object implementing both `size` property and `Symbol.iterator`
 *
 * **NOT supported:**
 * - Plain objects (`{}`) - No length/size or proper structure
 * - Strings - While iterable with length, strings are treated as primitives not collections
 * - Generators and iterables without size/length properties
 * - Objects with only `length` but no numeric indices (e.g., `{length: 5}` with no elements)
 *
 * @template T - The type of elements in the collection
 * @since 0.1.5
 */
export type ArrayLikeOrSizedIterable<T = any> = ArrayLike<T> | ({ size: number; } & Iterable<T>);
