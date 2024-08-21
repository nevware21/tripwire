/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { MsgSource } from "../types";

/**
 * Represents a function that performs an instance of check.
 * @template R - The type of the result of the operation.
 */
export interface InstanceOfFn<R> {

    /**
     * Asserts that the value is an instance of the specified constructor.
     * @param constructor - The constructor to check against.
     * @param evalMsg - The optional message source for evaluation.
     * @returns The result of the operation, which will generally be the existing
     * {@link IAssertScope.that} object.
     */
    (constructor: any, evalMsg?: MsgSource): R;
}
