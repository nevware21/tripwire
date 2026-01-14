/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { MsgSource } from "../../type/MsgSource";

/**
 * This interface provides methods for checking if the current `actual` value is
 * close to an expected value within a specified delta (tolerance).
 * @template R - The type of the result of the operation.
 * @since 0.1.5
 */
export interface CloseToFn<R> {

    /**
     * Asserts that the value is close to the expected value within the specified delta.
     * @param expected - The expected value to compare against
     * @param delta - The maximum allowed difference between actual and expected. Note: A negative delta will never result in a passing assertion since the absolute difference is always non-negative.
     * @param evalMsg - The message to evaluate if the assertion fails
     * @returns The result of the operation, which will generally be the existing
     * {@link IAssertScope.that} object.
     * @throws An {@link AssertionFailure} if the assertion fails
     */
    (expected: number, delta: number, evalMsg?: MsgSource): R;
}
