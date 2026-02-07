/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2025 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { MsgSource } from "../../type/MsgSource";

/**
 * Represents a function that asserts that the values exist in the current context value.
 * @since 0.1.2
 * @template R - The type of the result of the operation.
 */
export interface ValuesFn<R> {
    /**
     * Asserts that the current context value has the given value(s).
     * @since 0.1.2
     * @param {...string[]} values - The values to check if they are present within the context value.
     * @returns The result of the operation, which will generally be the existing
     * {@link IAssertScope#that} object.
     */
    (...values: string[]): R;

    /**
     * Asserts that the current context value has the given value(s).
     * @since 0.1.2
     * @param {...string[]} values - An array, iterator or iterable of values to check if they are present within the context value.
     * @param evalMsg - The optional evaluation message.
     * @returns The result of the operation, which will generally be the existing
     * {@link IAssertScope.that} object.
     */
    <T = any>(values: ArrayLike<T> | Iterator<T> | Iterable<T> | Object, evalMsg?: MsgSource): R;
}