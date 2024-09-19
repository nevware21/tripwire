/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { MsgSource } from "./types";

/**
 * The Core Assert isntance interface that all default assert instanceimplement.
 * @since 0.1.0
 * @group Expect
 */
export interface IAssertInstCore {
    /**
     * Throws an {@link AssertionFailure} exception with the given message and optional
     * details which are obtained via the `getDetails` function.
     * @param msg - The message to display.
     * @param details - The details (props) to include in the error
     * @throws {@link AssertionFailure} always
     */
    fail(msg?: MsgSource, details?: any): never;

    /**
     * Generic failure that throws an {@link AssertionFailure} exception with the given
     * message and optional details which are obtained via the `getDetails` function.
     * @param actual - The actual value that was expected
     * @param expected - The expected value that was not found
     * @param failMsg - The message to display.
     * @param operator - The optional operator used in the comparison
     * @throws {@link AssertionFailure} always
     */
    fail(actual: any, expected: any, failMsg?: MsgSource, operator?: string): never;

    /**
     * Throws an {@link AssertionError} exception with the given message and optional
     * details which are obtained via the `getDetails` function.
     * @param msg - The message to display.
     * @param details - The details (props) to include in the error
     * @throws {@link AssertionFailure} always
     */
    fatal(msg: MsgSource, details?: any): never;
}
