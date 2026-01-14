/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IStrictlyOp } from "./IStrictlyOp";
import { AssertFn } from "../funcs/AssertFn";
import { ErrorLikeFn } from "../funcs/ErrorLikeFn";
import { MsgSource } from "../../type/MsgSource";
import { InstanceOfFn } from "../funcs/InstanceOfFn";

/**
 * Represents an interface for operations to assert the type of a value.
 */
export interface IIsTypeOp<R> {

    /**
     * Provides access to operations to confirm that the value strictly matches the type
     * based on the used assertion operator.
     * @param evalMsg - The custom message to display on evaluation.
     * @returns An object that provides operations to assert the value
     * is strictly of the specified operation.
     */
    strictly: IStrictlyOp<R>,

    /**
     * Asserts that the value is truthy.
     * @param evalMsg - The custom message to display on evaluation.
     * @returns The current {@link IAssertScope.that} object.
     * @throws An {@link AssertionFailure} if the assertion fails.
     */
    ok: AssertFn<R>;

    /**
     * Asserts that the value is an array.
     * @param evalMsg - The custom message to display on evaluation.
     * @returns The current {@link IAssertScope.that} object.
     * @throws An {@link AssertionFailure} if the assertion fails.
     */
    array: AssertFn<R>;

    /**
     * Asserts that the value is an object.
     * @param evalMsg - The custom message to display on evaluation.
     * @returns The current {@link IAssertScope.that} object.
     * @throws An {@link AssertionFailure} if the assertion fails.
     */
    object: AssertFn<R>;

    /**
     * Asserts that the value is a plain object.
     * @param evalMsg - The custom message to display on evaluation.
     * @returns The current {@link IAssertScope.that} object.
     * @throws An {@link AssertionFailure} if the assertion fails.
     */
    plainObject: AssertFn<R>;

    /**
     * Asserts that the value is a function.
     * @param evalMsg - The custom message to display on evaluation.
     * @returns The current {@link IAssertScope.that} object.
     * @throws An {@link AssertionFailure} if the assertion fails.
     */
    function: AssertFn<R>;

    /**
     * Asserts that the value is a string.
     * @param evalMsg - The custom message to display on evaluation.
     * @returns The current {@link IAssertScope.that} object.
     * @throws An {@link AssertionFailure} if the assertion fails.
     */
    string: AssertFn<R>;

    /**
     * Asserts that the value is a number.
     * @param evalMsg - The custom message to display on evaluation.
     * @returns The current {@link IAssertScope.that} object.
     * @throws An {@link AssertionFailure} if the assertion fails.
     */
    number: AssertFn<R>;

    /**
     * Asserts that the value is a boolean.
     * @param evalMsg - The custom message to display on evaluation.
     * @returns The current {@link IAssertScope.that} object.
     * @throws An {@link AssertionFailure} if the assertion fails.
     */
    boolean: AssertFn<R>;

    /**
     * Asserts that the value is undefined.
     * @param evalMsg - The custom message to display on evaluation.
     * @returns The current {@link IAssertScope.that} object.
     * @throws An {@link AssertionFailure} if the assertion fails.
     */
    undefined: AssertFn<R>;

    /**
     * Asserts that the value is null.
     * @param evalMsg - The custom message to display on evaluation.
     * @returns The current {@link IAssertScope.that} object.
     * @throws An {@link AssertionFailure} if the assertion fails.
     */
    null: AssertFn<R>;

    /**
     * Asserts that the value is truthy.
     * @param evalMsg - The custom message to display on evaluation.
     * @returns The current {@link IAssertScope.that} object.
     * @throws An {@link AssertionFailure} if the assertion fails.
     */
    truthy: AssertFn<R>;

    /**
     * Asserts that the value is true.
     * @param evalMsg - The custom message to display on evaluation.
     * @returns The current {@link IAssertScope.that} object.
     * @throws An {@link AssertionFailure} if the assertion fails.
     */
    true: AssertFn<R>;

    /**
     * Asserts that the value is false.
     * @param evalMsg - The custom message to display on evaluation.
     * @returns The current {@link IAssertScope.that} object.
     * @throws An {@link AssertionFailure} if the assertion fails.
     */
    false: AssertFn<R>;

    /**
     * Asserts that the value is empty.
     * @param evalMsg - The custom message to display on evaluation.
     * @returns The current {@link IAssertScope.that} object.
     * @throws An {@link AssertionFailure} if the assertion fails.
     */
    empty: AssertFn<R>;

    /**
     * Asserts that the value is sealed.
     * @param evalMsg - The custom message to display on evaluation.
     * @returns The current {@link IAssertScope.that} object.
     * @throws An {@link AssertionFailure} if the assertion fails.
     */
    sealed: AssertFn<R>;

    /**
     * Asserts that the value is frozen.
     * @param evalMsg - The custom message to display on evaluation.
     * @returns The current {@link IAssertScope.that} object.
     * @throws An {@link AssertionFailure} if the assertion fails.
     */
    frozen: AssertFn<R>;

    /**
     * Asserts that the value is an error or matches the provided error constructor.
     * @param errorLike - The error or error constructor to match.
     * @param evalMsg - The custom message to display on evaluation.
     * @returns The current {@link IAssertScope.that} object.
     * @throws An {@link AssertionFailure} if the assertion fails.
     */
    error: ErrorLikeFn<R>;

    /**
     * Asserts that the value is extensible.
     * @param evalMsg - The custom message to display on evaluation.
     * @returns The current {@link IAssertScope.that} object.
     * @throws An {@link AssertionFailure} if the assertion fails.
     */
    extensible: AssertFn<R>,

    /**
     * Asserts that the value is iterable.
     * @param evalMsg - The custom message to display on evaluation.
     * @returns The current {@link IAssertScope.that} object.
     * @throws An {@link AssertionFailure} if the assertion fails.
     */
    iterable: AssertFn<R>,

    /**
     * Asserts that the value is NaN.
     * @param evalMsg - The custom message to display on evaluation.
     * @returns The current {@link IAssertScope.that} object.
     * @throws An {@link AssertionFailure} if the assertion fails.
     * @since 0.1.5
     */
    nan: AssertFn<R>;

    /**
     * Asserts that the value is a finite number (not NaN, not Infinity, not -Infinity).
     * @param evalMsg - The custom message to display on evaluation.
     * @returns The current {@link IAssertScope.that} object.
     * @throws An {@link AssertionFailure} if the assertion fails.
     * @since 0.1.5
     */
    finite: AssertFn<R>;

    /**
     * Asserts that the value's type matches the expected type string.
     * Uses the JavaScript `typeof` operator for type comparison.
     *
     * Valid type strings include:
     * - "string"
     * - "number"
     * - "bigint"
     * - "boolean"
     * - "symbol"
     * - "undefined"
     * - "object" (includes null, arrays, and objects)
     * - "null"
     * - "array"
     * - "function" (includes async, generator, and async generator functions)
     * - "asyncfunction"
     * - "generatorfunction"
     * - "asyncgeneratorfunction"
     *
     * @param type - The expected type string (e.g., "string", "number", "function")
     * @param evalMsg - The custom message to display on evaluation.
     * @returns The current {@link IAssertScope.that} object.
     * @throws An {@link AssertionFailure} if the assertion fails.
     * @since 0.1.5
     * @example
     * ```typescript
     * expect("hello").is.typeof("string");
     * expect(123).to.be.typeof("number");
     * expect({}).is.typeof("object");
     * expect(() => {}).to.be.typeof("function");
     * ```
     */
    typeOf(type: string, evalMsg?: MsgSource): R;

    /**
     * Asserts that the value is an instance of the specified constructor.
     * @param constructor - The constructor to check against (e.g., Array, Date, Error, custom class).
     * @param evalMsg - The custom message to display on evaluation.
     * @returns The current {@link IAssertScope.that} object.
     * @throws An {@link AssertionFailure} if the assertion fails.
     * @since 0.1.5
     */
    instanceof: InstanceOfFn<R>;

    /**
     * Asserts that the value is an instance of the specified constructor.
     * @param constructor - The constructor to check against (e.g., Array, Date, Error, custom class).
     * @param evalMsg - The custom message to display on evaluation.
     * @returns The current {@link IAssertScope.that} object.
     * @throws An {@link AssertionFailure} if the assertion fails.
     * @since 0.1.5
     */
    instanceOf: InstanceOfFn<R>;
}
