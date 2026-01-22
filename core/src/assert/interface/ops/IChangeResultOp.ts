/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { MsgSource } from "../../type/MsgSource";
import { IAssertInst } from "../IAssertInst";

/**
 * Result type for change assertions that allows chaining .by() to verify the magnitude of change.
 * Returned by change/increase/decrease assertions to enable fluent chaining syntax.
 *
 * @since 0.1.5
 * @group Change
 * @example
 * ```typescript
 * expect(fn).to.change(obj, 'val').by(5);      // Verify it changed by exactly 5
 * expect(fn).to.increase(obj, 'val').by(10);   // Verify it increased by exactly 10
 * expect(fn).to.decrease(obj, 'val').by(3);    // Verify it decreased by exactly 3
 * expect(fn).to.change(obj, 'val').not.by(5);  // Verify it didn't change by 5
 * ```
 */
export interface IChangeResultOp extends IAssertInst {
    /**
     * Negates any performed evaluations in the change assertion chain.
     * When used after change/increase/decrease, the returned value still supports .by()
     * to allow patterns like expect().to.change().not.by(delta)
     */
    not: IChangeResultOp;

    /**
     * Asserts that the change amount (delta) matches the expected delta.
     * @param delta - The expected change amount
     * @param evalMsg - Optional message to display if the assertion fails
     * @returns The assertion result
     * @example
     * ```typescript
     * expect(fn).to.change(obj, 'val').by(5);
     * expect(fn).to.increase(obj, 'val').by(10);
     * expect(fn).to.change(obj, 'val').not.by(5);
     * ```
     */
    by(delta: number, evalMsg?: MsgSource): IAssertInst;

    /**
     * A new {@link IAssertInst} with the resulting value from the change assertion.
     * If monitoring a property, this will be the new value of that property.
     * If monitoring a function, this will be the new return value of that function.
     * @example
     * ```typescript
     * expect(fn).to.change(obj, 'val').value.equals(15);
     * ```
     */
    value: IAssertInst;
}
