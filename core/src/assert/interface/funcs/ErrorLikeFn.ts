/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { MsgSource } from "../../type/MsgSource";

/**
 * Represents a function that asserts that the value and when `errorLike`
 * is provided will validate that it matches the error `type`.
 * @template R - The type returned by the function.
 */
export interface ErrorLikeFn<R> {
    /**
     * Asserts that the value is an error or matches the provided error constructor.
     * @param errorLike - The error or error constructor to match.
     * @param evalMsg - The custom message to display on evaluation.
     * @returns The result of the operation, which will generally be the existing
     * {@link IAssertScope.that} object.
     */
    (errorLike?: Error | ErrorConstructor, evalMsg?: MsgSource): R;
}
