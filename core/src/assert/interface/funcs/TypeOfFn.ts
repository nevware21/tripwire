/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { MsgSource } from "../types";

/**
 * Represents a function that asserts whether the value is of a specific type
 * and an optional evaluation message.
 * @template R - The type of the result of the operation.
 */
export interface TypeFn<R> {

    /**
     * Asserts that the value is of the specified type and an optional evaluation message.
     * @param type - The type to match.
     * @param evalMsg - The optional evaluation message.
     * @returns The result of the operation, which will generally be the existing
     * {@link IAssertScope.that} object.
     * @throws An {@link AssertionFailure} if the value is not of the specified type.
     */
    (type: string, evalMsg?: MsgSource): R;
}