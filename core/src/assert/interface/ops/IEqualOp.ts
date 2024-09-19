/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { EqualFn } from "../funcs/EqualFn";

/**
 * Represents an interface for equality assertion operations.
 * @template R - The type of the result of the operation.
 */
export interface IEqualOp<R> {

    /**
     * Performs a loose equality check (`==`) between the `actual` and `expected` values,
     * throwing an `AssertionFailure` with the given message when the `actual` value is not
     * equal to the `expected` value. To perform a strict equality check (`===`), use the
     * {@link IStrictlyOp.equal} (`strictly.equal`) operations.
     * @typeParam T - The type of the expected value.
     * @param expected - The expected value.
     * @param evalMsg - The message to display if the values are not strictly equal.
     * @throws AssertionFailure - If the `expected` and `actual` values are not strictly equal.
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
    equal: EqualFn<R>;

    /**
     * Performs a loose equality check (`==`) between the `actual` and `expected` values,
     * throwing an `AssertionFailure` with the given message when the `actual` value is not
     * equal to the `expected` value. To perform a strict equality check (`===`), use the
     * {@link IStrictlyOp.equals} (`strictly.equals`) operations.
     * @typeParam T - The type of the expected value.
     * @param expected - The expected value.
     * @param evalMsg - The message to display if the values are strictly equal.
     * @throws AssertionFailure - If the `expected` and `actual` values are strictly equal.
     * @example
     * assert.equals(1, 1); // Passes
     * assert.equals("a", "a"); // Passes
     * assert.equals(true, true); // Passes
     * assert.equals(false, false); // Passes
     * assert.equals(null, null); // Passes
     * assert.equals(undefined, undefined); // Passes
     * assert.equals(0, 0); // Passes
     * assert.equals(-0, -0); // Passes
     * assert.equals(+0, +0); // Passes
     * assert.equals(0n, 0n); // Passes
     * assert.equals("", ""); // Passes
     * assert.equals(Symbol(), Symbol()); // Passes
     * assert.equals([], []); // Throws AssertionError
     * assert.equals([1, 2], [1, 2]); // Throws AssertionError
     */
    equals: EqualFn<R>;
    
    /**
     * Performs a loose equality check (`==`) between the `actual` and `expected` values,
     * throwing an `AssertionFailure` with the given message when the `actual` value is not
     * equal to the `expected` value. To perform a strict equality check (`===`), use the
     * {@link IStrictlyOp.eq} (`strictly.eq`) operations.
     * @typeParam T - The type of the expected value.
     * @param expected - The expected value.
     * @param evalMsg - The message to display if the values are strictly equal.
     * @throws AssertionFailure - If the `expected` and `actual` values are strictly equal.
     * @example
     * assert.eq(1, 1); // Passes
     * assert.eq("a", "a"); // Passes
     * assert.eq(true, true); // Passes
     * assert.eq(false, false); // Passes
     * assert.eq(null, null); // Passes
     * assert.eq(undefined, undefined); // Passes
     * assert.eq(0, 0); // Passes
     * assert.eq(-0, -0); // Passes
     * assert.eq(+0, +0); // Passes
     * assert.eq(0n, 0n); // Passes
     * assert.eq("", ""); // Passes
     * assert.eq(Symbol(), Symbol()); // Passes
     * assert.eq([], []); // Throws AssertionError
     * assert.eq([1, 2], [1, 2]); // Throws AssertionError
     */
    eq: EqualFn<R>;
}