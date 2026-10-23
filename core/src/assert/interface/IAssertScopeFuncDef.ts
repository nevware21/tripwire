/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { MsgSource } from "../../types/MsgSource";
import { IScopeFn, IScopePropFn } from "./IScopeFuncs";

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
