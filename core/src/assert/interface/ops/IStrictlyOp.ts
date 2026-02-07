/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IEqualOp } from "./IEqualOp";
import { INotOp } from "./INotOp";
import { AssertFn } from "../funcs/AssertFn";

/**
 * Represents an interface that provides assertion operations based on the
 * `strict` comparisons.
 * @template R - The type of the result of the operation.
 */
export interface IStrictlyOp<R> extends INotOp<IStrictlyOp<R>>, IEqualOp<R> {

    /**
     * Asserts that the value is strictly equal to `true`.
     * @param expected - The expected value.
     * @param evalMsg - Optional. The message to display if the assertion fails.
     * @returns The result of the operation, which will generally be the existing
     * {@link IAssertScope.that} object.
     * @throws An {@link AssertionFailure} if the current {@link IScopeContext.value}
     * is not strictly equal to `true`.
     */
    true: AssertFn<R>;

    /**
     * Asserts that the value is strictly equal to `false`.
     * @param expected - The expected value.
     * @param evalMsg - Optional. The message to display if the assertion fails.
     * @returns The result of the operation, which will generally be the existing
     * {@link IAssertScope.that} object.
     * @throws An {@link AssertionFailure} if the current {@link IScopeContext.value}
     * is not strictly equal to `false`.
     */
    false: AssertFn<R>;
}
