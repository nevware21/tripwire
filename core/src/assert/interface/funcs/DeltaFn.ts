/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { MsgSource } from "../types";

/**
 * Represents the delta operations for the assertion scope/context.
 * @template R - The type returned by the function.
 */
export interface DeltaFn<R> {
    /**
     * Asserts that the value is greater than the specified delta.
     * @param delta - The delta to compare against
     * @param evalMsg - The message to evaluate
     * @returns The result of the operation, which will generally be the existing
     * {@link IAssertScope.that} object.
     * @throws An {@link AssertionFailure} if the assertion fails
     */
    (delta: number, evalMsg?: MsgSource): R;
}