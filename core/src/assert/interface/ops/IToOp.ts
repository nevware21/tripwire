/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { ThrowFn } from "../funcs/ThrowFn";
import { MsgSource } from "../types";
import { IDeepOp } from "./IDeepOp";
import { IHasOp } from "./IHasOp";
import { IIncludeOp } from "./IIncludeOp";
import { IIsOp } from "./IIsOp";
import { INotOp } from "./INotOp";
import { IStrictlyOp } from "./IStrictlyOp";
import { AssertFn } from "../funcs/AssertFn";

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
}
