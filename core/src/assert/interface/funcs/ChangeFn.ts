/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { MsgSource } from "../../type/MsgSource";
import { IChangeResultOp } from "../ops/IChangeResultOp";

/**
 * Function signature for change assertions.
 * Can monitor either a getter function or an object property.
 * @since 0.1.5
 * @group Change
 */
export interface ChangeFn {
    /**
     * Asserts that the target function changes the return value of the getter function.
     * @param func - A function that returns a value to monitor
     * @param evalMsg - Optional message to display if the assertion fails
     * @returns Result that supports .by() chaining
     * @example
     * ```typescript
     * let value = 1;
     * const getValue = () => value;
     * const addOne = () => { value++; };
     *
     * expect(addOne).to.change(getValue);
     * expect(addOne).to.change(getValue).by(1);
     *
     * let count = 0;
     * const getCount = () => count;
     * const increment = () => { count++; };
     *
     * expect(increment).to.increase(getCount);
     * expect(increment).to.increase(getCount).by(1);
     * ```
     */
    (func: () => any, evalMsg?: MsgSource): IChangeResultOp;

    /**
     * Asserts that the target function changes the specified property of the object.
     * @param target - The object containing the property to monitor
     * @param propName - The property name to monitor
     * @param evalMsg - Optional message to display if the assertion fails
     * @returns Result that supports .by() chaining
     * @example
     * ```typescript
     * const obj = { val: 10 };
     * const addTwo = () => { obj.val += 2; };
     *
     * expect(addTwo).to.change(obj, 'val');
     * expect(addTwo).to.change(obj, 'val').by(2);
     *
     * const obj = { count: 5 };
     * const increment = () => { obj.count++; };
     *
     * expect(increment).to.increase(obj, 'count');
     * expect(increment).to.increase(obj, 'count').by(1);
     * ```
     */
    <T>(target: T, propName: keyof T, evalMsg?: MsgSource): IChangeResultOp;
}
