/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { MsgSource } from "../../type/MsgSource";

/**
 * Identifies the signature of the equals function that performs equality checks between
 * the `actual` and `expected` values, throwing an `AssertionFailure` with the given message
 * when the `actual` value is not equal to the `expected` value.
 * The actual equality check is based on the implementation of this signature, and may be
 * either a strict or loose equality check.
 */
export interface EqualFn<R> {
    /**
     * Identifies the signature of the equals function that performs equality checks between
     * the `actual` and `expected` values, throwing an `AssertionFailure` with the given message
     * when the `actual` value is not equal to the `expected` value.
     * The actual equality check is based on the implementation of this signature, and may be
     * either a strict or loose equality check.
     * @typeParam T - The type of the expected value.
     * @param expected - The expected value.
     * @param evalMsg - The message to display if the values are strictly equal.
     * @throws An {@link AssertionFailure} if the `expected` and `actual` values are strictly equal.
     * @example
     * assert.equal(1, 1); // Passes
     * assert.equal("a", "a"); // Passes
     * assert.equal(true, true); // Passes
     * assert.equal(false, false); // Passes
     * assert.equal(null, null); // Passes
     * assert.equal(undefined, undefined); // Passes
     * assert.equal(0, 0); // Passes
     * assert.equal(-0, -0); // Passes
     * assert.equal(+0, +0); // Passes
     * assert.equal(0n, 0n); // Passes
     * assert.equal("", ""); // Passes
     * assert.equal(Symbol(), Symbol()); // Passes
     * assert.equal([], []); // Throws AssertionError
     * assert.equal([1, 2], [1, 2]); // Throws AssertionError
     */
    <T>(expected: T, evalMsg?: MsgSource): R;
}