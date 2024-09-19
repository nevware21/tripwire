/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { MsgSource } from "../types";

/**
 * Represents a function that performs assertions on a number or a Date value.
 * @template R - The type of the result of the operation.
 */
export interface NumberFn<R> {

    /**
     * Asserts that the current context value (`actual`) is above the specified value.
     * @param value - The value to be asserted.
     * @param evalMsg - The message source for evaluation.
     * @returns The result of the operation, which will generally be the existing
     */
    (value: number | Date, evalMsg?: MsgSource): R;
}
