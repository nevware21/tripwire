/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { ThrowFn } from "../funcs/ThrowFn";
import { MsgSource } from "../../type/MsgSource";
import { IDeepOp } from "./IDeepOp";
import { IHasOp } from "./IHasOp";
import { IIncludeOp } from "./IIncludeOp";
import { IIsOp } from "./IIsOp";
import { INotOp } from "./INotOp";
import { IStrictlyOp } from "./IStrictlyOp";
import { AssertFn } from "../funcs/AssertFn";
import { ChangeFn } from "../funcs/ChangeFn";
import { ChangeByFn } from "../funcs/ChangeByFn";

/**
 * Represents an interface for operations that can be performed on an assertion scope.
 * This represents a logical grouping of assertion operations, which is used to provide
 * a descriptive API for assertion operations.
 * @template R - The type of the result of the operation.
 */
export interface IToOp<R> extends INotOp<IToOp<R>> {

    /**
     * Asserts that the target exists (is not null and not undefined).
     *
     * @since 0.1.5
     * @example
     * ```typescript
     * expect(0).to.exist();          // Passes - 0 is not null or undefined
     * expect("").to.exist();         // Passes - empty string exists
     * expect(false).to.exist();      // Passes - false exists
     * expect(null).to.not.exist();   // Passes - null does not exist
     * expect(undefined).to.not.exist(); // Passes - undefined does not exist
     * ```
     */
    exist: AssertFn<R>;

    /**
     * Asserts that the target is falsy or throws the error if it is an Error instance.
     * This is commonly used in Node.js-style callback error handling.
     *
     * - If the value is falsy (null, undefined, false, 0, "", etc.), the assertion passes
     * - If the value is an Error instance, that error is thrown
     * - If the value is truthy but not an Error, an {@link AssertionFailure} is thrown
     *
     * @since 0.1.5
     * @example
     * ```typescript
     * expect(null).to.ifError();          // Passes - null is falsy
     * expect(undefined).to.ifError();     // Passes - undefined is falsy
     * expect(false).to.ifError();         // Passes - false is falsy
     * expect(new Error("fail")).to.ifError(); // Throws the Error itself
     * expect(true).to.ifError();          // Throws AssertionFailure
     * ```
     */
    ifError: AssertFn<R>;

    /**
     * Provides access to operations that can be performed on the assertion scope,
     * based on the {@link IHasOp} interface.
     * @returns The operations that can be performed on the assertion scope.
     */
    have: IHasOp<R>;

    /**
     * Provides access to operations that can be performed on the assertion scope,
     * based on the {@link IIsOp} interface.
     * @returns The operations that can be performed on the assertion scope.
     */
    be: IIsOp<R>;

    /**
     * This operation provides access to operations that will deeplyallows you to assert that the target value deeply equals the expected value.
     * It is useful for comparing objects, arrays, and other complex structures.
     *
     * @example
     * ```typescript
     * import { assert } from "@nevware21/tripwire";
     *
     * assert({ a: 1, b: { c: 2 } }).deep.equal({ a: 1, b: { c: 2 } }); // Passes
     * assert([1, [2, 3]]).deep.equal([1, [2, 3]]); // Passes
     * assert({ a: 1, b: { c: 2 } }).deep.equal({ a: 1, b: { c: 3 } }); // Fails
     * ```
     */
    deep: IDeepOp<this>;

    /**
     * Provides operations for inclusion checks.
     *
     * This operation allows you to assert that the target value includes the specified value(s).
     * It is useful for verifying that an array, string, or object contains certain elements or properties.
     *
     * @example
     * ```typescript
     * import { assert } from "@nevware21/tripwire";
     *
     * const arr = [1, 2, 3];
     * const str = "hello darkness welcome back again";
     * const obj = { a: 1, b: 2, c: 3 };
     *
     * assert(arr).include(2); // Passes
     * assert(str).include("darkness"); // Passes
     * assert(obj).include.all.keys('a', 'b'); // Passes
     * assert(arr).include(4); // Fails
     * assert(str).include("planet"); // Fails
     * assert(obj).include.all.keys('a', 'd'); // Fails
     * ```
     */
    include: IIncludeOp<this>,

    /**
     * Provides operations for inclusion checks.
     *
     * This operation allows you to assert that the target value includes the specified value(s).
     * It is useful for verifying that an array, string, or object contains certain elements or properties.
     *
     * @since 0.1.2
     * @alias include
     * @example
     * ```typescript
     * import { assert } from "@nevware21/tripwire";
     *
     * const arr = [1, 2, 3];
     * const str = "hello darkness welcome back again";
     * const obj = { a: 1, b: 2, c: 3 };
     *
     * assert(arr).includes(2); // Passes
     * assert(str).includes("darkness"); // Passes
     * assert(obj).includes.all.keys('a', 'b'); // Passes
     * assert(arr).includes(4); // Fails
     * assert(str).includes("planet"); // Fails
     * assert(obj).includes.all.keys('a', 'd'); // Fails
     * ```
     */
    includes: IIncludeOp<this>,

    /**
     * Provides operations for containment checks.
     *
     * This operation allows you to assert that the target value contains the specified value(s).
     * It is useful for verifying that an array, string, or object contains certain elements or properties.
     *
     * @alias include
     * @example
     * ```typescript
     * import { assert } from "@nevware21/tripwire";
     *
     * const arr = [1, 2, 3];
     * const str = "hello darkness welcome back again";
     * const obj = { a: 1, b: 2, c: 3 };
     *
     * assert(arr).contain(2); // Passes
     * assert(str).contain("darkness"); // Passes
     * assert(obj).contain.all.keys('a', 'b'); // Passes
     * assert(arr).contain(4); // Fails
     * assert(str).contain("planet"); // Fails
     * assert(obj).contain.all.keys('a', 'd'); // Fails
     * ```
     */
    contain: IIncludeOp<this>,

    /**
     * Provides operations for containment checks.
     *
     * This operation allows you to assert that the target value contains the specified value(s).
     * It is useful for verifying that an array, string, or object contains certain elements or properties.
     *
     * @alias include
     * @example
     * ```typescript
     * import { assert } from "@nevware21/tripwire";
     *
     * const arr = [1, 2, 3];
     * const str = "hello darkness welcome back again";
     * const obj = { a: 1, b: 2, c: 3 };
     *
     * assert(arr).contains(2); // Passes
     * assert(str).contains("darkness"); // Passes
     * assert(obj).contains.all.keys('a', 'b'); // Passes
     * assert(arr).contains(4); // Fails
     * assert(str).contains("planet"); // Fails
     * assert(obj).contains.all.keys('a', 'd'); // Fails
     * ```
     */
    contains: IIncludeOp<this>,

    /**
     * Provides operations for strict equality checks.
     *
     * This operation allows you to assert that the target value is strictly equal to the expected value.
     * It is useful for comparing values without any type coercion.
     *
     * @example
     * ```typescript
     * import { assert } from "@nevware21/tripwire";
     *
     * assert(1).strictly.equal(1); // Passes
     * assert(1).strictly.equal("1"); // Fails
     * ```
     */
    strictly: IStrictlyOp<this>,

    /**
     * An assertion function that will validate that the `actual` value is a function
     * that when executed will throw an error.
     * @param evalMsg - Optional. The message to display if the assertion fails.
     * @returns The result of the operation.
     * @throws An {@link AssertionFailure} if the function does not throw an error.
     */
    throw: ThrowFn;

    /**
     * Asserts that the current {@link IScopeContext.value} matches the specified regular expression.
     * @param regexp - The regular expression to match against.
     * @param evalMsg - Optional. The message to display if the assertion fails.
     */
    match(regexp: RegExp, evalMsg?: MsgSource): R;

    /**
     * Asserts that executing the target function changes the monitored value.
     * Can monitor either a getter function's return value or an object property.
     * @param getter - A function that returns the value to monitor.
     * @param initMsg - The message to display if the assertion fails.
     * @param target - An object containing the property to monitor.
     * @param prop - The property name to monitor.
     * @since 0.1.5
     * @example
     * ```typescript
     * import { expect } from "@nevware21/tripwire";
     *
     * // With getter function
     * let value = 1;
     * const getValue = () => value;
     * const changeValue = () => { value = 2; };
     * expect(changeValue).to.change(getValue);
     * expect(changeValue).to.change(getValue).by(1);
     *
     * // With object property
     * const obj = { value: 1 };
     * const updateValue = () => { obj.value = 3; };
     * expect(updateValue).to.change(obj, 'value');
     * expect(updateValue).to.change(obj, 'value').by(2);
     * ```
     */
    change: ChangeFn;

    /**
     * Alias for {@link change}.
     * @alias change
     * @since 0.1.5
     */
    changes: ChangeFn;

    /**
     * Asserts that executing the target function changes the monitored value by a specific delta.
     * The sign of the delta is ignored - only the absolute value is compared.
     * This is a direct method that doesn't require chaining with .by().
     * @param getter - A function that returns the value to monitor.
     * @param delta - The expected delta (sign is ignored, only absolute value matters).
     * @param target - An object containing the property to monitor.
     * @param prop - The property name to monitor.
     * @param initMsg - The message to display if the assertion fails.
     * @since 0.1.5
     * @example
     * ```typescript
     * import { expect } from "@nevware21/tripwire";
     *
     * // With getter function
     * let value = 0;
     * const getValue = () => value;
     * const addFive = () => { value += 5; };
     * expect(addFive).to.changeBy(getValue, 5);  // Passes (delta of 5)
     * expect(addFive).to.changeBy(getValue, -5); // Also passes (absolute value of 5)
     *
     * // With object property
     * const obj = { count: 10 };
     * const addFive = () => { obj.count += 5; };
     * expect(addFive).to.changeBy(obj, 'count', 5);  // Passes (delta of 5)
     * expect(addFive).to.changeBy(obj, 'count', -5); // Also passes (absolute value of 5)
     * ```
     */
    changeBy: ChangeByFn;

    /**
     * Asserts that executing the target function changes the monitored value by a specific delta.
     * The sign of the delta is ignored - only the absolute value is compared.
     * This is a direct method that doesn't require chaining with .by().
     * @param getter - A function that returns the value to monitor.
     * @param delta - The expected delta (sign is ignored, only absolute value matters).
     * @param target - An object containing the property to monitor.
     * @param prop - The property name to monitor.
     * @param initMsg - The message to display if the assertion fails.
     * @alias changeBy
     * @since 0.1.5
     * @example
     * ```typescript
     * import { expect } from "@nevware21/tripwire";
     *
     * const obj = { count: 10 };
     * const addFive = () => { obj.count += 5; };
     * expect(addFive).to.changesBy(obj, 'count', 5);  // Passes (delta of 5)
     * expect(addFive).to.changesBy(obj, 'count', -5); // Also passes (absolute value of 5)
     * ```
     */
    changesBy: ChangeByFn;

    /**
     * Asserts that the value DOES change but NOT by the specified delta after executing the target function.
     * The value MUST change (cannot remain the same), but the change amount must not equal the specified delta.
     * This differs from {@link notChangesBy} which allows the value to remain unchanged.
     * @since 0.1.5
     * @example
     * ```typescript
     * import { expect } from "@nevware21/tripwire";
     *
     * let value = 0;
     * const getValue = () => value;
     * const addTwo = () => { value += 2; };
     * const noOp = () => {};
     * expect(addTwo).to.changesButNotBy(getValue, 5);  // Passes - changed by 2, not by 5
     * expect(addTwo).to.changesButNotBy(getValue, 2);  // Fails - changed by exactly 2
     * expect(noOp).to.changesButNotBy(getValue, 5);    // Fails - no change occurred
     * ```
     */
    changesButNotBy: ChangeByFn;

    /**
     * Asserts that executing the target function increases the monitored numeric value.
     * Can monitor either a getter function's return value or an object property.
     * @param getter - A function that returns the value to monitor.
     * @param initMsg - The message to display if the assertion fails.
     * @param target - An object containing the property to monitor.
     * @param prop - The property name to monitor.
     * @since 0.1.5
     * @example
     * ```typescript
     * import { expect } from "@nevware21/tripwire";
     *
     * // With getter function
     * let count = 0;
     * const getCount = () => count;
     * const increment = () => { count++; };
     * expect(increment).to.increase(getCount);
     * expect(increment).to.increase(getCount).by(1);
     *
     * // With object property
     * const obj = { count: 5 };
     * const addFive = () => { obj.count += 5; };
     * expect(addFive).to.increase(obj, 'count');
     * expect(addFive).to.increase(obj, 'count').by(5);
     * ```
     */
    increase: ChangeFn;

    /**
     * Alias for {@link increase}.
     * @alias increase
     * @since 0.1.5
     */
    increases: ChangeFn;

    /**
     * Asserts that executing the target function increases the monitored value by a specific delta.
     * This is a direct method that doesn't require chaining with .by().
     * @param getter - A function that returns the value to monitor.
     * @param delta - The expected increase delta (must be positive).
     * @param target - An object containing the property to monitor.
     * @param prop - The property name to monitor.
     * @param initMsg - The message to display if the assertion fails.
     * @since 0.1.5
     * @example
     * ```typescript
     * import { expect } from "@nevware21/tripwire";
     *
     * // With getter function
     * let value = 0;
     * const getValue = () => value;
     * const addFive = () => { value += 5; };
     * expect(addFive).to.increaseBy(getValue, 5);
     *
     * // With object property
     * const obj = { count: 10 };
     * const addFive = () => { obj.count += 5; };
     * expect(addFive).to.increaseBy(obj, 'count', 5);
     * ```
     */
    increaseBy: ChangeByFn;

    /**
     * Asserts that executing the target function increases the monitored value by a specific delta.
     * This is a direct method that doesn't require chaining with .by().
     * @param getter - A function that returns the value to monitor.
     * @param delta - The expected increase delta (must be positive).
     * @param target - An object containing the property to monitor.
     * @param prop - The property name to monitor.
     * @param initMsg - The message to display if the assertion fails.
     * @alias increaseBy
     * @since 0.1.5
     * @example
     * ```typescript
     * import { expect } from "@nevware21/tripwire";
     *
     * const obj = { count: 10 };
     * const addFive = () => { obj.count += 5; };
     * expect(addFive).to.increasesBy(obj, 'count', 5);
     * ```
     */
    increasesBy: ChangeByFn;

    /**
     * Asserts that the value DOES increase but NOT by the specified delta after executing the target function.
     * The value MUST increase (must go up), but the increase amount must not equal the specified delta.
     * @since 0.1.5
     * @example
     * ```typescript
     * import { expect } from "@nevware21/tripwire";
     *
     * let count = 5;
     * const getCount = () => count;
     * const addTwo = () => { count += 2; };
     * expect(addTwo).to.increasesButNotBy(getCount, 5);  // Passes - increased by 2, not by 5
     * expect(addTwo).to.increasesButNotBy(getCount, 2);  // Fails - increased by exactly 2
     * ```
     */
    increasesButNotBy: ChangeByFn;

    /**
     * Asserts that executing the target function decreases the monitored numeric value.
     * Can monitor either a getter function's return value or an object property.
     * @param getter - A function that returns the value to monitor.
     * @param initMsg - The message to display if the assertion fails.
     * @param target - An object containing the property to monitor.
     * @param prop - The property name to monitor.
     * @since 0.1.5
     * @example
     * ```typescript
     * import { expect } from "@nevware21/tripwire";
     *
     * // With getter function
     * let count = 10;
     * const getCount = () => count;
     * const decrement = () => { count--; };
     * expect(decrement).to.decrease(getCount);
     * expect(decrement).to.decrease(getCount).by(1);  // delta of 1 (positive) for a decrease
     *
     * // With object property
     * const obj = { count: 10 };
     * const subtractThree = () => { obj.count -= 3; };
     * expect(subtractThree).to.decrease(obj, 'count');
     * expect(subtractThree).to.decrease(obj, 'count').by(3);  // delta of 3 (positive) for a decrease
     * ```
     */
    decrease: ChangeFn;

    /**
     * Alias for {@link decrease}.
     * @alias decrease
     * @since 0.1.5
     */
    decreases: ChangeFn;

    /**
     * Asserts that executing the target function decreases the monitored value by a specific delta.
     * This is a direct method that doesn't require chaining with .by().
     * @param getter - A function that returns the value to monitor.
     * @param delta - The expected decrease delta (should be a positive value as a decrease is expected).
     * @param target - An object containing the property to monitor.
     * @param prop - The property name to monitor.
     * @param initMsg - The message to display if the assertion fails.
     * @since 0.1.5
     * @example
     * ```typescript
     * import { expect } from "@nevware21/tripwire";
     *
     * // With getter function
     * let value = 10;
     * const getValue = () => value;
     * const subtractFive = () => { value -= 5; };
     * expect(subtractFive).to.decreaseBy(getValue, 5);
     *
     * // With object property
     * const obj = { count: 10 };
     * const subtractFive = () => { obj.count -= 5; };
     * expect(subtractFive).to.decreaseBy(obj, 'count', 5);
     * ```
     */
    decreaseBy: ChangeByFn;

    /**
     * Asserts that executing the target function decreases the monitored value by a specific delta.
     * This is a direct method that doesn't require chaining with .by().
     * @param getter - A function that returns the value to monitor.
     * @param delta - The expected decrease delta (should be a positive value as a decrease is expected).
     * @param target - An object containing the property to monitor.
     * @param prop - The property name to monitor.
     * @param initMsg - The message to display if the assertion fails.
     * @alias decreaseBy
     * @since 0.1.5
     * @example
     * ```typescript
     * import { expect } from "@nevware21/tripwire";
     *
     * const obj = { count: 10 };
     * const subtractFive = () => { obj.count -= 5; };
     * expect(subtractFive).to.decreasesBy(obj, 'count', 5);
     * ```
     */
    decreasesBy: ChangeByFn;

    /**
     * Asserts that the value DOES decrease but NOT by the specified delta after executing the target function.
     * The value MUST decrease (must go down), but the decrease amount must not equal the specified delta.
     * The delta value should be a positive number as a decrease is expected.
     * @since 0.1.5
     * @example
     * ```typescript
     * import { expect } from "@nevware21/tripwire";
     *
     * let count = 10;
     * const getCount = () => count;
     * const subtractTwo = () => { count -= 2; };
     * expect(subtractTwo).to.decreasesButNotBy(getCount, 5);  // Passes - decreased by 2, not by 5
     * expect(subtractTwo).to.decreasesButNotBy(getCount, 2);  // Fails - decreased by exactly 2
     * ```
     */
    decreasesButNotBy: ChangeByFn;
}
