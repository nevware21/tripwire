/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IAssertInstCore } from "./IAssertInstCore";
import { IDeepOp } from "./ops/IDeepOp";
import { IIsOp } from "./ops/IIsOp";
import { IOwnOp } from "./ops/IOwnOp";
import { IScopePropFn, IScopeFn } from "./IScopeFuncs";
import { IStrictlyOp } from "./ops/IStrictlyOp";
import { MsgSource } from "./types";
import { IEqualOp } from "./ops/IEqualOp";
import { IIncludeOp } from "./ops/IIncludeOp";
import { IAllOp } from "./ops/IAllOp";
import { IAnyOp } from "./ops/IAnyOp";
import { IThrowOp } from "./ops/IThrowOp";
import { IToOp } from "./ops/IToOp";
import { ThrowFn } from "./funcs/ThrowFn";
import { INotOp } from "./ops/INotOp";
import { IHasOp } from "./ops/IHasOp";

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
     * const str = "hello darkness my old friend";
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
     * const str = "hello darkness my old friend";
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
     * const str = "hello darkness my old friend";
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
     * const str = "hello darkness my old friend";
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
