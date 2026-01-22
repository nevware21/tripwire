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
 * Function signature for changeBy, increaseBy, and decreaseBy assertions.
 * Can monitor either a getter function or an object property and validate the delta.
 *
 * **Important Behavior Notes:**
 * - `changeBy`/`changesBy`: Sign of delta is ignored - only absolute value matters
 * - `increaseBy`/`increasesBy`: Delta must be positive and value must increase
 * - `decreaseBy`/`decreasesBy`: Delta should be positive (representing magnitude) and value must decrease
 *
 * @since 0.1.5
 * @group Change
 */
export interface ChangeByFn {
    /**
     * Asserts that the target function changes the return value of the getter function by the specified delta.
     *
     * **Behavior varies by assertion type:**
     * - `changeBy`/`changesBy`: Sign is ignored - only absolute value is compared
     * - `increaseBy`/`increasesBy`: Delta must be positive, value must increase
     * - `decreaseBy`/`decreasesBy`: Delta should be positive (magnitude), value must decrease
     *
     * @param func - A function that returns a value to monitor
     * @param delta - The expected change amount (interpretation depends on assertion type)
     * @param evalMsg - Optional message to display if the assertion fails
     * @returns The assertion instance for chaining
     * @example
     * ```typescript
     * let value = 1;
     * const getValue = () => value;
     * const addFive = () => { value += 5; };
     * const subtractThree = () => { value -= 3; };
     *
     * // changeBy - sign agnostic
     * expect(addFive).to.changeBy(getValue, 5);  // passes (delta of 5)
     * expect(addFive).to.changeBy(getValue, -5); // also passes (absolute value of 5)
     *
     * // increaseBy - requires positive change
     * expect(addFive).to.increaseBy(getValue, 5); // passes (increased by 5)
     *
     * // decreaseBy - use positive delta for magnitude
     * expect(subtractThree).to.decreaseBy(getValue, 3); // passes (decreased by 3)
     * ```
     */
    (func: () => number, delta: number, evalMsg?: MsgSource): IAssertInst;

    /**
     * Asserts that the target function changes the specified property of the object by the specified delta.
     *
     * **Behavior varies by assertion type:**
     * - `changeBy`/`changesBy`: Sign is ignored - only absolute value is compared
     * - `increaseBy`/`increasesBy`: Delta must be positive, value must increase
     * - `decreaseBy`/`decreasesBy`: Delta should be positive (magnitude), value must decrease
     *
     * @param target - The object containing the property to monitor
     * @param propName - The property name to monitor
     * @param delta - The expected change amount (interpretation depends on assertion type)
     * @param evalMsg - Optional message to display if the assertion fails
     * @returns The assertion instance for chaining
     * @example
     * ```typescript
     * const obj = { val: 10 };
     * const addTwo = () => { obj.val += 2; };
     * const subtractFive = () => { obj.val -= 5; };
     *
     * // changeBy - sign agnostic
     * expect(addTwo).to.changeBy(obj, 'val', 2);  // passes (delta of 2)
     * expect(addTwo).to.changeBy(obj, 'val', -2); // also passes (absolute value of 2)
     *
     * // increaseBy - requires positive change
     * expect(addTwo).to.increaseBy(obj, 'val', 2); // passes (increased by 2)
     *
     * // decreaseBy - use positive delta for magnitude
     * expect(subtractFive).to.decreaseBy(obj, 'val', 5); // passes (decreased by 5)
     * ```
     */
    <T>(target: T, propName: keyof T, delta: number, evalMsg?: MsgSource): IAssertInst;
}
