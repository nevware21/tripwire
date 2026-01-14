/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { MsgSource } from "../../type/MsgSource";

/**
 * This interface provides methods for comparing two values using a comparison operator.
 * Supports operators: ==, ===, <, >, <=, >=, !=, !==
 * @template R - The type of the result of the operation.
 * @since 0.1.5
 */
export interface OperatorFn<R> {

    /**
     * Asserts that the relationship between value and expected using the given operator is true.
     * Note: val1 is obtained from the scoped value (context.value) - the first parameter passed to assert.operator()
     * @param operator - The comparison operator (==, ===, <, >, <=, >=, !=, !==)
     * @param expected - The second value to compare
     * @param evalMsg - The message to evaluate if the assertion fails
     * @returns The result of the operation, which will generally be the existing
     * {@link IAssertScope.that} object.
     * @throws An {@link AssertionFailure} if the assertion fails or if an invalid operator is provided
     */
    (operator: string, expected: any, evalMsg?: MsgSource): R;
}
