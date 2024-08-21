/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IAssertScope } from "../IAssertScope";
import { IPropertyResultOp } from "../ops/IPropertyResultOp";
import { MsgSource } from "../types";

/**
 * Represents a function that defines a symbol assertion for the
 * default symbol.
 * Asserts that the specified symbol property exists on the target object.
 */
export interface SymbolFn {
    /**
     * Asserts that the property exists on the target object.
     * @template T - The type of the property value.
     * @param evalMsg - The evaluation message source.
     * @returns A new assertion instance `this` with the value of the property.
     * @throws {@link AssertionFailure} if the symbol property does not exist.
     * @throws {@link AssertionFailure} if the symbol property value does not match the expected value.
     */
    (this: IAssertScope, evalMsg?: MsgSource): IPropertyResultOp;
}
