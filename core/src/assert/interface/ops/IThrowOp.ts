/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { ThrowFn } from "../funcs/ThrowFn";

/**
 * Represents an interface for validating that the current (`actual`) value is a function that
 * when executed is expected to throw an assertion of the matching type.
 * @template R - The type of the result of the operation.
 */
export interface IThrowOp {

    /**
     * Asserts that the value is a function that when executed will throw an error.
     * @param errorLike - Optional. The error to match.
     * @param msgMatch - Optional. The message to match.
     * @param evalMsg - Optional. The message to display if the assertion fails.
     * @returns The result of the operation.
     * @throws {@link AssertionFailure} - If the function does not throw an error.
     * @throws {@link AssertionError} - If the error thrown does not match the expected error.
     * @throws {@link AssertionError} - If the error message does not match the expected message.
     */
    throws: ThrowFn;
}