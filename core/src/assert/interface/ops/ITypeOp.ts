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
     * @throws {@link AssertionFailure} - If the assertion fails.
     */
    ok: AssertFn<R>;

    /**
     * Asserts that the value is an array.
     * @param evalMsg - The custom message to display on evaluation.
     * @returns The current {@link IAssertScope.that} object.
     * @throws {@link AssertionFailure} - If the assertion fails.
     */
    array: AssertFn<R>;

    /**
     * Asserts that the value is an object.
     * @param evalMsg - The custom message to display on evaluation.
     * @returns The current {@link IAssertScope.that} object.
     * @throws {@link AssertionFailure} - If the assertion fails.
     */
    object: AssertFn<R>;

    /**
     * Asserts that the value is a plain object.
     * @param evalMsg - The custom message to display on evaluation.
     * @returns The current {@link IAssertScope.that} object.
     * @throws {@link AssertionFailure} - If the assertion fails.
     */
    plainObject: AssertFn<R>;

    /**
     * Asserts that the value is a function.
     * @param evalMsg - The custom message to display on evaluation.
     * @returns The current {@link IAssertScope.that} object.
     * @throws {@link AssertionFailure} - If the assertion fails.
     */
    function: AssertFn<R>;

    /**
     * Asserts that the value is a string.
     * @param evalMsg - The custom message to display on evaluation.
     * @returns The current {@link IAssertScope.that} object.
     * @throws {@link AssertionFailure} - If the assertion fails.
     */
    string: AssertFn<R>;

    /**
     * Asserts that the value is a number.
     * @param evalMsg - The custom message to display on evaluation.
     * @returns The current {@link IAssertScope.that} object.
     * @throws {@link AssertionFailure} - If the assertion fails.
     */
    number: AssertFn<R>;

    /**
     * Asserts that the value is a boolean.
     * @param evalMsg - The custom message to display on evaluation.
     * @returns The current {@link IAssertScope.that} object.
     * @throws {@link AssertionFailure} - If the assertion fails.
     */
    boolean: AssertFn<R>;

    /**
     * Asserts that the value is undefined.
     * @param evalMsg - The custom message to display on evaluation.
     * @returns The current {@link IAssertScope.that} object.
     * @throws {@link AssertionFailure} - If the assertion fails.
     */
    undefined: AssertFn<R>;

    /**
     * Asserts that the value is null.
     * @param evalMsg - The custom message to display on evaluation.
     * @returns The current {@link IAssertScope.that} object.
     * @throws {@link AssertionFailure} - If the assertion fails.
     */
    null: AssertFn<R>;

    /**
     * Asserts that the value is truthy.
     * @param evalMsg - The custom message to display on evaluation.
     * @returns The current {@link IAssertScope.that} object.
     * @throws {@link AssertionFailure} - If the assertion fails.
     */
    truthy: AssertFn<R>;

    /**
     * Asserts that the value is true.
     * @param evalMsg - The custom message to display on evaluation.
     * @returns The current {@link IAssertScope.that} object.
     * @throws {@link AssertionFailure} - If the assertion fails.
     */
    true: AssertFn<R>;

    /**
     * Asserts that the value is false.
     * @param evalMsg - The custom message to display on evaluation.
     * @returns The current {@link IAssertScope.that} object.
     * @throws {@link AssertionFailure} - If the assertion fails.
     */
    false: AssertFn<R>;

    /**
     * Asserts that the value is empty.
     * @param evalMsg - The custom message to display on evaluation.
     * @returns The current {@link IAssertScope.that} object.
     * @throws {@link AssertionFailure} - If the assertion fails.
     */
    empty: AssertFn<R>;

    /**
     * Asserts that the value is sealed.
     * @param evalMsg - The custom message to display on evaluation.
     * @returns The current {@link IAssertScope.that} object.
     * @throws {@link AssertionFailure} - If the assertion fails.
     */
    sealed: AssertFn<R>;

    /**
     * Asserts that the value is frozen.
     * @param evalMsg - The custom message to display on evaluation.
     * @returns The current {@link IAssertScope.that} object.
     * @throws {@link AssertionFailure} - If the assertion fails.
     */
    frozen: AssertFn<R>;

    /**
     * Asserts that the value is an error or matches the provided error constructor.
     * @param errorLike - The error or error constructor to match.
     * @param evalMsg - The custom message to display on evaluation.
     * @returns The current {@link IAssertScope.that} object.
     * @throws {@link AssertionFailure} - If the assertion fails.
     */
    error: ErrorLikeFn<R>;

    /**
     * Asserts that the value is extensible.
     * @param evalMsg - The custom message to display on evaluation.
     * @returns The current {@link IAssertScope.that} object.
     * @throws {@link AssertionFailure} - If the assertion fails.
     */
    extensible: AssertFn<R>,

    /**
     * Asserts that the value is iterable.
     * @param evalMsg - The custom message to display on evaluation.
     * @returns The current {@link IAssertScope.that} object.
     * @throws {@link AssertionFailure} - If the assertion fails.
     */
    iterable: AssertFn<R>,
}
