/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { MsgSource } from "../../type/MsgSource";
import { ArrayLikeOrSizedIterable } from "../../type/ArrayLikeOrIterable";

/**
 * Represents a function that checks if a value is a member of a given list.
 * Uses strict equality (===) for comparison.
 * @param list - The array, ArrayLike, Set, Map, or other iterable collection of possible values to check against.
 * @param evalMsg - Optional message to display if the assertion fails.
 * @returns The result of the operation.
 * @since 0.1.5
 */
export type OneOfFn<R> = (list: ArrayLikeOrSizedIterable<any>, evalMsg?: MsgSource) => R;
