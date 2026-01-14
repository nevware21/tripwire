/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IEqualOp } from "./IEqualOp";
import { INotOp } from "./INotOp";
import { IIsTypeOp } from "./ITypeOp";
import { INumericOp } from "./INumericOp";
import { CloseToFn } from "../funcs/CloseToFn";

/**
 * Represents an interface for operations on an assertion scope confirming the type of a value.
 * @template R - The type of the result of the operation.
 */
export interface IIsOp<R> extends INotOp<IIsOp<R>>, IEqualOp<R>, IIsTypeOp<R>, INumericOp<R> {

    /**
     * A decorative / alias operation which returns the current instance, useful for
     * chaining operations to provide a more descriptive description of the operations
     * being performed within your tests.
     * @returns - The current instance.
     * @example
     * ```typescript
     * expect(1).is.a.number();
     * expect(1).to.be.a.number();
     *
     * // This is equivalent to not using this decorator operation
     * expect(1).is.number()
     * expect(1).to.be.number();
     * ```
     */
    a: this;

    /**
     * A decorative / alias operation which returns the current instance, useful for
     * chaining operations to provide a more descriptive description of the operations
     * being performed within your tests.
     * @returns - The current instance.
     * @example
     * ```typescript
     * expect(1).is.an.object();
     * expect(1).to.be.an.array();
     *
     * // This is equivalent to not using this decorator operation
     * expect(1).is.object()
     * expect(1).to.be.array();
     * ```
     */
    an: this;

    /**
     * Asserts that the target is a number close to the given number within a specified delta.
     * This is useful for floating-point comparisons where exact equality is not guaranteed.
     * @param expected - The expected value to compare against.
     * @param delta - The maximum allowed difference between actual and expected. Note: A negative delta will never result in a passing assertion since the absolute difference is always non-negative.
     * @param evalMsg - The message to evaluate if the assertion fails.
     * @returns The result of the operation.
     * @since 0.1.5
     * @example
     * ```typescript
     * import { assert } from "@nevware21/tripwire";
     *
     * expect(1.5).is.closeTo(1.0, 0.5);     // Passes - difference is 0.5
     * expect(10).is.closeTo(20, 20);        // Passes - difference is 10
     * expect(-10).is.closeTo(20, 30);       // Passes - difference is 30
     * expect(2).is.closeTo(1.0, 0.5);       // Fails - difference is 1.0
     * ```
     */
    closeTo: CloseToFn<R>;

    /**
     * Alias for {@link closeTo}. Asserts that the target is a number approximately equal
     * to the given number within a specified delta.
     * @param expected - The expected value to compare against.
     * @param delta - The maximum allowed difference between actual and expected. Note: A negative delta will never result in a passing assertion since the absolute difference is always non-negative.
     * @param evalMsg - The message to evaluate if the assertion fails.
     * @returns The result of the operation.
     * @since 0.1.5
     * @example
     * ```typescript
     * import { assert } from "@nevware21/tripwire";
     *
     * expect(1.5).is.approximately(1.0, 0.5);  // Passes - difference is 0.5
     * expect(10).to.be.approximately(20, 20);  // Passes - difference is 10
     * ```
     */
    approximately: CloseToFn<R>;
}
