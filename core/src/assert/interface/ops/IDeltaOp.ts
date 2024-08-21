/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { DeltaFn } from "../funcs/DeltaFn";

/**
 * Represents the delta operations for the assertion scope.
 * @template R - The type of the result of the operation.
 */
export interface IDeltaOp<R> {
    /**
     * Asserts that the value is greater than the specified delta.
     * @param delta - The delta to compare against
     * @param evalMsg - The message to evaluate
     * @returns The result of the operation
     * @throws {@link AssertionFailure} - If the assertion fails
     */
    by: DeltaFn<R>;
}