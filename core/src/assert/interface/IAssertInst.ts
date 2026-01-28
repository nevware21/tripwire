/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IAssertInstCore } from "./IAssertInstCore";
import { IDeepOp } from "./ops/IDeepOp";
import { IIsOp } from "./ops/IIsOp";
import { IOwnOp } from "./ops/IOwnOp";
import { IScopePropFn, IScopeFn } from "./IScopeFuncs";
import { IStrictlyOp } from "./ops/IStrictlyOp";
import { MsgSource } from "../type/MsgSource";
import { IEqualOp } from "./ops/IEqualOp";
import { IIncludeOp } from "./ops/IIncludeOp";
import { IAllOp } from "./ops/IAllOp";
import { IAnyOp } from "./ops/IAnyOp";
import { IThrowOp } from "./ops/IThrowOp";
import { IToOp } from "./ops/IToOp";
import { ThrowFn } from "./funcs/ThrowFn";
import { INotOp } from "./ops/INotOp";
import { IHasOp } from "./ops/IHasOp";
import { ChangeFn } from "./funcs/ChangeFn";
import { ChangeByFn } from "./funcs/ChangeByFn";

/**
 * Interface for assertion instance operations, this extends the core assertion instance
 * and provides additional operations.
 *
 * This interface extends `IAssertInstCore` and `IEqualOp<IAssertInst>`.
 * It provides various operations for performing assertions on instance.
 *
 * @example
 * ```typescript
 * import { assert } from "@nevware21/tripwire";
 *
 * const inst: IAssertInst = {
 *   not: ...,
 *   deep: ...,
 *   own: ...,
 *   all: ...,
 *   any: ...,
 *   include: ...,
 *   includes: ...,
 *   contain: ...,
 *   contains: ...,
 *   strictly: ...,
 *   is: ...,
 *   ok: ...,
 *   throws: ...,
 *   toThrow: ...,
 *   toThrowError: ...,
 *   match: ...,
 *   hasProperty: ...,
 *   hasOwnProperty: ...
 * };
 * ```
 * @since 0.1.0
 * @group Expect
 */
export interface IAssertInst extends INotOp<IAssertInst>, IAssertInstCore, IEqualOp<IAssertInst>, IThrowOp {
       
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
     * Provides operations for ownership checks.
     *
     * This operation allows you to assert that the target object has its own property with the specified name.
     * It is useful for verifying that an object has a property directly on itself, rather than inheriting it from its prototype chain.
     *
     * @example
     * ```typescript
     * import { assert } from "@nevware21/tripwire";
     *
     * const obj = { a: 1 };
     * const proto = { b: 2 };
     * Object.setPrototypeOf(obj, proto);
     *
     * assert(obj).own.property('a'); // Passes
     * assert(obj).own.property('b'); // Fails
     * ```
     */
    own: IOwnOp<this>;

    /**
     * Provides operations for asserting that all conditions in a chain are met.
     *
     * This operation allows you to assert that all specified conditions are true for the target value.
     * It is useful for combining multiple assertions into a single chain, ensuring that all conditions must pass.
     *
     * @example
     * ```typescript
     * import { assert } from "@nevware21/tripwire";
     *
     * const obj = { a: 1, b: 2, c: 3 };
     *
     * assert(obj).all.keys('a', 'b', 'c'); // Passes
     * assert(obj).all.keys('a', 'b', 'd'); // Fails
     * ```
     */
    all: IAllOp<this>;

    /**
     * Provides operations for asserting that any condition in a chain is met.
     *
     * This operation allows you to assert that at least one of the specified conditions is true for the target value.
     * It is useful for combining multiple assertions into a single chain, ensuring that at least one condition must pass.
     *
     * @example
     * ```typescript
     * import { assert } from "@nevware21/tripwire";
     *
     * const obj = { a: 1, b: 2, c: 3 };
     *
     * assert(obj).any.keys('a', 'x'); // Passes
     * assert(obj).any.keys('x', 'y'); // Fails
     * ```
     */
    any: IAnyOp<this>,

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
     * const str = "hello silence welcome back again";
     * const obj = { a: 1, b: 2, c: 3 };
     *
     * assert(arr).include(2); // Passes
     * assert(str).include("silence"); // Passes
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
     * const str = "hello silence welcome back again";
     * const obj = { a: 1, b: 2, c: 3 };
     *
     * assert(arr).includes(2); // Passes
     * assert(str).includes("silence"); // Passes
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
     * const str = "hello silence welcome back again";
     * const obj = { a: 1, b: 2, c: 3 };
     *
     * assert(arr).contain(2); // Passes
     * assert(str).contain("silence"); // Passes
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
     * const str = "hello silence welcome back again";
     * const obj = { a: 1, b: 2, c: 3 };
     *
     * assert(arr).contains(2); // Passes
     * assert(str).contains("silence"); // Passes
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
     * Provides operations for type and equality checks.
     *
     * This operation allows you to assert that the target value is of the specified type.
     * It is useful for verifying the type of a value, such as a number, string, or object.
     *
     * @example
     * ```typescript
     * import { assert } from "@nevware21/tripwire";
     *
     * assert(1).is.a.number(); // Passes
     * assert("hello").is.a.string(); // Passes
     * assert({ a: 1 }).is.an.object(); // Passes
     * assert(1).is.string(); // Fails
     * assert("hello").is.number(); // Fails
     * assert({ a: 1 }).is.array(); // Fails
     * ```
     */
    is: IIsOp<this>;

    /**
     * Provides syntatic operations for accessing whether the target is of a specific type,
     * has a specific property, or is strictly equal to a specific value.
     *
     * @example
     * ```typescript
     * import { assert } from "@nevware21/tripwire";
     *
     * assert(1).is.a.number(); // Passes
     * assert(1).to.be.a.number(); // Passes
     *
     * assert(1).is.number(); // Passes
     * assert(1).to.be.number(); // Passes
     * ```
     */
    to: IToOp<this>;

    /**
     * Provides operations for checking whether the target value has a specific property.
     *
     * This operation allows you to assert that the target value has the specified property.
     * It is useful for verifying that an object has a certain property.
     *
     * @example
     * ```typescript
     * import { assert } from "@nevware21/tripwire";
     *
     * const obj = { a: 1, b: 2 };
     *
     * assert(obj).has.property('a'); // Passes
     * assert(obj).has.property('c'); // Fail
     * ```
     */
    has: IHasOp<this>;

    ok(evalMsg?: MsgSource): IAssertInst;

    toThrow: ThrowFn;
    toThrowError: ThrowFn;

    match(regexp: RegExp, evalMsg?: MsgSource): IAssertInst;

    hasProperty(name: string, evalMsg?: MsgSource): IAssertInst;
    hasOwnProperty(name: string, evalMsg?: MsgSource): IAssertInst;

    /**
     * Asserts that executing the target function changes the monitored value.
     * Can monitor either a getter function's return value or an object property.
     *
     * @since 0.1.5
     * @example
     * ```typescript
     * import { expect } from "@nevware21/tripwire";
     *
     * // With getter function
     * let value = 10;
     * const getValue = () => value;
     * const addTwo = () => { value += 2; };
     * expect(addTwo).to.change(getValue);
     * expect(addTwo).to.change(getValue).by(2);
     *
     * // With object property
     * const obj = { val: 10 };
     * const increment = () => { obj.val++; };
     * expect(increment).to.change(obj, 'val');
     * expect(increment).to.change(obj, 'val').by(1);
     * ```
     */
    change: ChangeFn;

    /**
     * Alias for {@link change}.
     * @since 0.1.5
     */
    changes: ChangeFn;

    /**
     * Asserts that executing the target function changes the monitored value by a specific delta.
     * This is a direct method that doesn't require chaining with .by().
     * **Important:** The sign of the delta is ignored - only the absolute value is compared.
     * @since 0.1.5
     * @example
     * ```typescript
     * let value = 10;
     * const getValue = () => value;
     * const addFive = () => { value += 5; };
     * const subtractFive = () => { value -= 5; };
     *
     * expect(addFive).to.changeBy(getValue, 5);   // Passes - changed by +5
     * expect(addFive).to.changeBy(getValue, -5);  // Also passes - absolute value is 5
     * expect(subtractFive).to.changeBy(getValue, 5);  // Passes - absolute value is 5
     * ```
     */
    changeBy: ChangeByFn;

    /**
     * Alias for {@link changeBy}.
     * The sign of the delta is ignored - only the absolute value is compared.
     * @since 0.1.5
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
     *
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
     * @since 0.1.5
     */
    increases: ChangeFn;

    /**
     * Asserts that executing the target function increases the monitored value by a specific delta.
     * This is a direct method that doesn't require chaining with .by().
     * The delta value should be a positive number representing the expected increase.
     * @since 0.1.5
     * @example
     * ```typescript
     * let count = 5;
     * const getCount = () => count;
     * const addTen = () => { count += 10; };
     * expect(addTen).to.increaseBy(getCount, 10);  // Passes - increased by exactly 10
     * ```
     */
    increaseBy: ChangeByFn;

    /**
     * Alias for {@link increaseBy}.
     * @since 0.1.5
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
     * When using .by(delta), the delta value should be a positive number as a decrease is expected.
     *
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
     * @since 0.1.5
     */
    decreases: ChangeFn;

    /**
     * Asserts that executing the target function decreases the monitored value by a specific delta.
     * This is a direct method that doesn't require chaining with .by().
     * **Note:** The delta should be specified as a positive value representing the magnitude of the decrease.
     * For example, if a value goes from 10 to 7, use delta of 3, not -3.
     * @since 0.1.5
     * @example
     * ```typescript
     * let count = 10;
     * const getCount = () => count;
     * const subtractThree = () => { count -= 3; };
     * expect(subtractThree).to.decreaseBy(getCount, 3);  // Passes - use positive 3, not -3
     * ```
     */
    decreaseBy: ChangeByFn;

    /**
     * Alias for {@link decreaseBy}.
     * @since 0.1.5
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

export type IExtendedAssertInst<T = any> = IAssertInst & T;

/**
 * Defines the named functions that can be called on the default {@link IAssertInst}
 * created via the {@link createAssertScope} function.
 */
export type AssertScopeFuncDefs<T> = { [name in keyof T]: IAssertScopeFuncDef };

/**
 * Identifies the interface used to add {@link IAssertScope} functions or properties
 * to the {@link IAssertInst} object via the {@link addAssertInstFuncDef} function.
 */
export interface IAssertScopeFuncDef {
    /**
     * The function to call when the property function is invoked.
     * @param this - The current scope object.
     * @param scope - The current scope object.
     * @param evalMsg - An optional default message to use for the evaluation.
     * @returns - The result of the function.
     */
    propFn?: IScopePropFn;

    /**
     * The function to call when the scoped function is invoked.
     * @param this - The current scope object.
     * @param args - The arguments passed to the function.
     * @returns - The result of the function.
     */
    scopeFn?: IScopeFn;

    /**
     * The default message to use when evaluating the operation.
     */
    evalMsg?: MsgSource;
}
