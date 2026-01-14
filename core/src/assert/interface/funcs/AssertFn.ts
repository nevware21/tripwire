/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { MsgSource } from "../../type/MsgSource";

/**
 * Represents a function that performs an assertion operation.
 * @template R - The type returned by the function.
 */
export interface AssertFn<R> {

    /**
     * Asserts that the current context value (`actual`) is acceptable based on the implementation
     * of the function based on this signature.
     * @param evalMsg - The message source for evaluation.
     * @returns The type `R` that is returned by the function.
     */
    (evalMsg?: MsgSource): R;
}
