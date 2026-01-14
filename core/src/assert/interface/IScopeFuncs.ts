/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IAssertScope } from "./IAssertScope";
import { IAssertInst } from "./IAssertInst";
import { MsgSource } from "../type/MsgSource";

/**
 * Identifies the signature of a function that expects the current scope as the `this` value and
 * any additional arguments that are passed to the function. The function should return the `this`
 * (object) that will be used to chain the next assertion.
 */
export interface IScopeFn {
    <R>(this: IAssertScope, ...args: any[]): R | IAssertInst | void;
}

/**
 * Identifies the signature of a function that expects the current scope as the first argument
 * and no additional argument, these functions are designed to be added as properties to the
 * assertion scope object. And they wll be executed immediately on accessing the bound property.
 * The function should returned value will be used as the `this` for any chained property operation
 * if `undefined` is returned a new {@link IAssertInst} object is created and assigned to the
 * `scope.that` property.
 * @param scope - The current scope object.
 * @param evalMsg - An optional default message to use for the evaluation.
 */
export interface IScopePropFn {
    <T>(scope: IAssertScope, evalMsg?: MsgSource): T;
    <R>(scope: IAssertScope, evalMsg?: MsgSource): R;
}