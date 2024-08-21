/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

/**
 * Represents an operation that retrieves the keys of an object or an array.
 * @template R - The type of the result of the operation.
 */
export interface INotOp<T> {
    /**
     * Negates any performed evaluations that are performed in the assertion chain.
     *
     * This operation applies a *stateful* change to the evaluation chain, meaning
     * that subsequent operations that would normally fail will pass without the need
     * for them to "implement" any knowledge about the `not` operation. You may call
     * `not` multiple times to negate the negation.
     *
     * @example
     * ```typescript
     * import { assert } from "@nevware21/tripwire";
     *
     * expect(true).not.ok(); // Fails
     * expect(false).not.ok(); // Passes
     * expect(true).not.not.ok(); // Passes
     * expect(false).not.not.ok(); // Fails
     * ```
     */
    not: T;
}
