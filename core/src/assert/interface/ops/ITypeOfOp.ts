/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { TypeFn } from "../funcs/TypeOfFn";
import { InstanceOfFn } from "../funcs/InstanceOfFn";

/**
 * Represents an interface for operations to validate that the current (`actual`) value
 * is of a specific type.
 * @template R - The type of the result of the operation.
 */
export interface ITypeOp<R> extends TypeFn<R> {

    /**
     * Asserts that the value is a string.
     * @param evalMsg - The custom message to display on evaluation.
     * @returns An object that provides operations to assert the type of the value.
     */
    instanceof: InstanceOfFn<R>;

    /**
     * Asserts that the value is a string.
     * @param evalMsg - The custom message to display on evaluation.
     * @returns An object that provides operations to assert the type of the value.
     */
    instanceOf: InstanceOfFn<R>;
}