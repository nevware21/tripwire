/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IAssertInst } from "../IAssertInst";
import { MsgSource } from "../../type/MsgSource";

/**
 * The throw function signatures
 */
export interface ThrowFn {
    /**
     * Asserts that the current value is a function and when executed throws an error where the
     * message matches the `msgMatch` string or regular expression.
     * @param msgMatch - The message to match
     * @param evalMsg - The message to display if the value does not throw an error
     * @returns A new {@link IAssertInst} instance with the same value and context.
     * @throws An {@link AssertionFailure} error if the value is not a function
     * @throws An {@link AssertionFailure} error is not an error instance
     * @throws An {@link AssertionFailure} error if the value does not throw an error
     * @throws An {@link AssertionFailure} error if the message from the thrown error does not
     * include the `string` identified in the `msgMatch`.
     * @throws An {@link AssertionFailure} error if the message from the thrown error does not
     * match the regular expression passed in `msgMatch`.
     */
    (msgMatch?: string | RegExp | null, evalMsg?: MsgSource): IAssertInst;

    /**
     * Asserts that the current value throws an error which matches the errorLike type and optionally
     * also matches the `msgMatch` message
     * @param errorLike - The error to match
     * @param msgMatch - The message to match
     * @param evalMsg - The message to display if the value does not throw an error
     * @returns A new {@link IAssertInst} instance with the same value and context.
     * @throws An {@link AssertionFailure} error if the value is not a function
     * @throws An {@link AssertionFailure} error is not an error instance
     * @throws An {@link AssertionFailure} error if the error thrown does not match the `errorLike`
     * constructor or type.
     * @throws An {@link AssertionFailure} error if the value does not throw an error
     * @throws An {@link AssertionFailure} error if the message from the thrown error does not
     * include the `string` identified in the `msgMatch`.
     * @throws An {@link AssertionFailure} error if the message from the thrown error does not
     * match the regular expression passed in `msgMatch`.
     */
    (errorLike?: ErrorConstructor | Error | null, msgMatch?: string | RegExp | null, evalMsg?: MsgSource): IAssertInst;
}
