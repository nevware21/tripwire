/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { MsgSource } from "../types";

/**
 * Represents an operation that retrieves the keys of an object or an array.
 * @template R - The type of the result of the operation.
 */
export interface KeysFn<R> {
    /**
     * Asserts that the current value has the given keys.
     * @param {...string[]} keys - The keys to retrieve.
     * @returns The result of the operation, which will generally be the existing
     * {@link IAssertScope.that} object.
     */
    (...keys: string[]): R;
    
    /**
     * Asserts that the current value has the given keys.
     * @param {...string[]} keys - A single array of keys or an object containing the expected keys to assert.
     * @param evalMsg - The optional evaluation message.
     * @returns The result of the operation, which will generally be the existing
     * {@link IAssertScope.that} object.
     */
    (keys: readonly any[] | Object, evalMsg?: MsgSource): R;
}