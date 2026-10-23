/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IPropertyResultOp } from "../interface/ops/IPropertyResultOp";
import { propertyResultOp } from "../ops/propertyResultOp";
import { SymbolFn } from "../interface/funcs/SymbolFn";
import { isStrictNullOrUndefined, objHasOwnProperty } from "@nevware21/ts-utils";
import { IAssertScope } from "../interface/IAssertScope";
import { MsgSource } from "../../types/MsgSource";

/**
 * Returns a new {@link SymbolFn} that will assert that the current {@link IScopeContext} value
 * has the specified symbol property.
 * @param theSymbol - The symbol property to check.
 * @returns The new "instance" (object) to be used as the `this` for the chained operations.
 * @throws An {@link AssertionFailure} if the current value does not have the specified symbol property.
 */
export function hasSymbolFunc(theSymbol: symbol): SymbolFn {
    return function (this: IAssertScope, evalMsg?: MsgSource): IPropertyResultOp {
        let scope = this;
        let context = scope.context;
        let value = context.value;

        context.eval(!isStrictNullOrUndefined(value) && value[theSymbol], evalMsg || "expected {value} to be an iterable");

        return propertyResultOp(scope, value ? value[theSymbol] : null);
    };
}

/**
 * Returns a new {@link SymbolFn} that will assert that the current {@link IScopeContext} value
 * has the specified own symbol property.
 * @param theSymbol - The symbol property to check.
 * @returns The new "instance" (object) to be used as the `this` for the chained operations.
 * @throws An {@link AssertionFailure} if the current value does not have the specified own property.
 * @throws An {@link AssertionFailure} if the property value does not match the expected value.
 */
export function hasOwnSymbolFunc(theSymbol: symbol): SymbolFn {
    return function (this: IAssertScope, evalMsg?: MsgSource): IPropertyResultOp {
        let scope = this;
        let context = scope.context;
        let value = context.value;

        context.eval(!isStrictNullOrUndefined(value) && objHasOwnProperty(value, theSymbol), evalMsg || "expected {value} to be an iterable");

        return propertyResultOp(scope, value ? value[theSymbol] : value);
    };
}
