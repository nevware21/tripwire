/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { MsgSource } from "../../type/MsgSource";

/**
 * This interface provides methods checking in the current `actual` value is
 * within the provided `start` and `end` range.
 * @template R - The type of the result of the operation.
 */
export interface WithinFn<R> {

    /**
     * Asserts that the value is within the specified range.
     * @param start - The start of the range
     * @param finish - The end of the range
     * @param evalMsg - The message to evaluate
     * @returns The result of the operation, which will generally be the existing
     * {@link IAssertScope.that} object.
     * @throws An {@link AssertionFailure} if the assertion fails
     */
    (start: number, finish: number, evalMsg?: MsgSource): R;

    /**
     * Asserts that the value is within the specified range.
     * @param start - The start of the range
     * @param finish - The end of the range
     * @param evalMsg - The message to evaluate
     * @returns The result of the operation, which will generally be the existing
     * {@link IAssertScope.that} object.
     * @throws An {@link AssertionFailure} if the assertion fails
     */
    (start: Date, finish: Date, evalMsg?: MsgSource): R;
}
