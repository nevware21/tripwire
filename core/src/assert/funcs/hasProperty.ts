/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { arrForEach, isArray, isNumber, isObject, isPrimitive, isStrictNullOrUndefined, isString, isSymbol, objGetOwnPropertyDescriptor, objGetPrototypeOf, objHasOwnProperty } from "@nevware21/ts-utils";
import { MsgSource } from "../interface/types";
import { IScopeContext } from "../interface/IScopeContext";
import { deepEqualsFunc, equalsFunc } from "./equal";
import { IAssertScope } from "../interface/IAssertScope";
import { IPropertyResultOp } from "../interface/ops/IPropertyResultOp";
import { propertyResultOp } from "../ops/propertyResultOp";

function _getPropertyDescriptor<T>(target: T, name: string | symbol | number): PropertyDescriptor | undefined {
    let currentObj = target;
    while (!isStrictNullOrUndefined(currentObj)) {
        let descriptor = !isStrictNullOrUndefined(currentObj) ? objGetOwnPropertyDescriptor(currentObj, name) : null;
        if (descriptor) {
            return descriptor;
        }

        currentObj = objGetPrototypeOf(currentObj);
    }

    return undefined;
}

const PROPERTY_DESCRIPTOR_KEYS = ["configurable", "enumerable", "value", "writable", "get", "set"];

function _isPropertyDescriptor(value: any): value is PropertyDescriptor {
    if (!value) {
        return false;
    }

    let result = false;
    arrForEach(PROPERTY_DESCRIPTOR_KEYS, (key) => {
        if (key in value) {
            result = true;
            return -1;
        }
    });

    return result;
}

export function _assertHasProperty(context: IScopeContext, name: string | symbol | number, evalMsg: MsgSource): void {
    let value = context.value;

    context.set("property", name);
    if (!(isString(name) || isSymbol(name) || isNumber(name))) {
        context.fail("expected {property} to be a string, symbol, or number");
    }

    if (isArray(value)) {
        context.eval(name in value, evalMsg || "expected {value} to have a {property} property");
    } else if (isObject(value)) {
        context.eval(name in value, evalMsg || "expected {value} to have a {property} property");
    } else if (name) {
        if (!isPrimitive(value) && !isStrictNullOrUndefined(value)) {
            context.eval(name in value, evalMsg || "expected {value} to have a {property} property");
        } else {
            context.eval(false, evalMsg || "expected {value} to have a {property} property");
        }
    }
}

function _assertHasOwnPropertyDescriptor(context: IScopeContext, name: string | symbol | number, evalMsg: MsgSource): PropertyDescriptor {
    let value = context.value;

    context.set("propertyDescriptor", name);
    if (!(isString(name) || isSymbol(name) || isNumber(name))) {
        context.fail("expected {propertyDescriptor} to be a string, symbol, or number");
    }

    let desc = !isStrictNullOrUndefined(value) ? objGetOwnPropertyDescriptor(value, name) : null;

    context.eval(!!desc, evalMsg || "expected {value} to have it's own {propertyDescriptor} property descriptor");

    return desc;
}

function _assertHasPropertyDescriptor(context: IScopeContext, name: string | symbol | number, evalMsg: MsgSource): PropertyDescriptor {
    context.set("propertyDescriptor", name);

    let desc = _getPropertyDescriptor(context.value, name);
    context.eval(!!desc, evalMsg || "expected {value} to have a {propertyDescriptor} property descriptor");

    return desc;
}

/**
 * @internal
 * @ignore
 * Asserts that the context value has the specified property.
 * @param context - The assertion context.
 * @param name - The name of the property to check.
 * @param evalMsg - The message to display if the assertion fails.
 */
export function _assertHasOwnProperty(context: IScopeContext, name: string | symbol | number, evalMsg: MsgSource): void {
    context.set("property", name);
    context.eval(objHasOwnProperty(context.value, name), evalMsg || "expected {value} to have it's own {property} property");
}

/**
 * Asserts that the current {@link IScopeContext} value has the specified property and
 * its value (`loosly`) equals the expected value.
 * @param this - The current {@link IAssertScope} assertion scope.
 * @param name - The name of the property to check.
 * @param value - The expected value of the property.
 * @param evalMsg - The message to display if the assertion fails.
 * @returns The new "instance" (object) to be used as the `this` for the chained operations.
 * @throws An {@link AssertionFailure} if the current value does not have the specified property.
 * @throws An {@link AssertionFailure} if the property value does not match the expected value.
 */
export function hasPropertyFunc(this: IAssertScope, name: string | symbol | number, value?: any, evalMsg?: MsgSource): IPropertyResultOp {
    let scope = this;
    let context = scope.context;

    _assertHasProperty(context, name, evalMsg);
    if (arguments.length > 1) {
        // Check the value
        scope.newScope(context.value[name]).exec(equalsFunc, [ value, evalMsg ]);
    }

    return propertyResultOp(scope, context.value[name]);
}

/**
 * Asserts that the current {@link IScopeContext} value has the specified own property and
 * its value (`loosly`) equals the expected value.
 * @param this - The current {@link IAssertScope} assertion scope.
 * @param name - The name of the property to check.
 * @param value - The expected value of the property.
 * @param evalMsg - The message to display if the assertion fails.
 * @returns The new "instance" (object) to be used as the `this` for the chained operations.
 * @throws An {@link AssertionFailure} if the current value does not have the specified own property.
 * @throws An {@link AssertionFailure} if the property value does not match the expected value.
 */
export function hasOwnPropertyFunc(this: IAssertScope, name: string | symbol | number, value?: any, evalMsg?: MsgSource): IPropertyResultOp {
    let scope = this;
    let context = scope.context;

    _assertHasOwnProperty(context, name, evalMsg);
    if (arguments.length > 1) {
        // Check the value
        scope.newScope(context.value[name]).exec(equalsFunc, [ value, evalMsg ]);
    }

    return propertyResultOp(scope, context.value[name]);
}

/**
 * Asserts that the current {@link IScopeContext} value has the specified property and
 * its value deeply (`loosly`) equals the expected value.
 * @param this - The current {@link IAssertScope} assertion scope.
 * @param name - The name of the property to check.
 * @param value - The expected value of the property.
 * @param evalMsg - The message to display if the assertion fails.
 * @returns The new "instance" (object) to be used as the `this` for the chained operations.
 * @throws An {@link AssertionFailure} if the current value does not have the specified property.
 * @throws An {@link AssertionFailure} if the property value does not match the expected value.
 */
export function hasDeepPropertyFunc(this: IAssertScope, name: string | symbol | number, value?: any, evalMsg?: MsgSource): IPropertyResultOp {
    let scope = this;
    let context = scope.context;

    _assertHasProperty(context, name, evalMsg);
    if (arguments.length > 1) {
        // Check the value
        scope.newScope(context.value[name]).exec(deepEqualsFunc, [ value, evalMsg ]);
    }

    return propertyResultOp(scope, context.value[name]);
}

/**
 * Asserts that the current {@link IScopeContext} value has the specified own property
 * and its value deeply (`loosly`) equals the expected value.
 * @param this - The current {@link IAssertScope} assertion scope.
 * @param name - The name of the property to check.
 * @param value - The expected value of the property.
 * @param evalMsg - The message to display if the assertion fails.
 * @returns The new "instance" (object) to be used as the `this` for the chained operations.
 * @throws An {@link AssertionFailure} if the current value does not have the specified own property.
 * @throws An {@link AssertionFailure} if the property value does not match the expected value.
 */
export function hasDeepOwnPropertyFunc(this: IAssertScope, name: string | symbol | number, value?: any, evalMsg?: MsgSource): IPropertyResultOp {
    let scope = this;
    let context = scope.context;

    _assertHasOwnProperty(context, name, evalMsg);
    if (arguments.length > 1) {
        // Check the value
        scope.newScope(context.value[name]).exec(deepEqualsFunc, [ value, evalMsg ]);
    }

    return propertyResultOp(scope, context.value[name]);
}

/**
 * Asserts that the current {@link IScopeContext} value has the specified property descriptor.
 * @param this - The current {@link IAssertScope} assertion scope.
 * @param name - The name of the property to check.
 * @param descriptor - The expected property descriptor.
 * @param evalMsg - The message to display if the assertion fails.
 * @returns The new "instance" (object) to be used as the `this` for the chained operations.
 * @throws An {@link AssertionFailure} if the current value does not have the specified property descriptor.
 * @throws An {@link AssertionFailure} if the property descriptor does not match the expected descriptor.
 */
export function hasPropertyDescriptorFunc(this: IAssertScope, name: string | symbol | number, descriptor: PropertyDescriptor, evalMsg?: MsgSource): IPropertyResultOp {
    let scope = this;
    let context = scope.context;

    let desc = _assertHasPropertyDescriptor(context, name, evalMsg);
    if (arguments.length > 1) {
        context.set("descriptor", descriptor);
        context.eval(_isPropertyDescriptor(descriptor), evalMsg || "expected {descriptor} to be a PropertyDescriptor");
        scope.newScope(desc).exec(deepEqualsFunc, [ descriptor, evalMsg || "expected {value} to equal property descriptor {descriptor}" ]);
    }

    return propertyResultOp(scope, desc);
}

/**
 * Asserts that the current {@link IScopeContext} value has the specified own property descriptor.
 * @param this - The current {@link IAssertScope} assertion scope.
 * @param name - The name of the property to check.
 * @param descriptor - The expected property descriptor.
 * @param evalMsg - The message to display if the assertion fails.
 * @returns The new "instance" (object) to be used as the `this` for the chained operations.
 * @throws An {@link AssertionFailure} if the current value does not have the specified own property descriptor.
 * @throws An {@link AssertionFailure} if the property descriptor does not match the expected descriptor.
 */
export function hasOwnPropertyDescriptorFunc(this: IAssertScope, name: string | symbol | number, descriptor: PropertyDescriptor,evalMsg?: MsgSource): IPropertyResultOp {
    let scope = this;
    let context = scope.context;

    let desc = _assertHasOwnPropertyDescriptor(context, name, evalMsg);
    if (arguments.length > 1) {
        context.set("descriptor", descriptor);
        context.eval(_isPropertyDescriptor(descriptor), evalMsg || "expected {descriptor} to be a PropertyDescriptor");
        scope.newScope(desc).exec(deepEqualsFunc, [ descriptor, evalMsg  || "expected {value} to equal property descriptor {descriptor}"]);
    }

    return propertyResultOp(scope, desc);
}
