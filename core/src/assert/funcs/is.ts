/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { isArray, isBoolean, isFunction, isNumber, isObject, isPlainObject, isString, isTruthy } from "@nevware21/ts-utils";
import { MsgSource } from "../interface/types";
import { IAssertScope } from "../interface/IAssertScope";

/**
 * Is the current value an array
 * @param this - The current {@link IAssertScope} object
 * @param evalMsg - The message to display if the value is not an array
 * @returns The current {@link IAssertScope.that} (`this`) object
 */
export function isArrayFunc<R>(this: IAssertScope, evalMsg?: MsgSource): R {
    let context = this.context;
    context.eval(isArray(context.value), evalMsg || "expected {value} to be an array");

    return this.that;
}

/**
 * Is the current value an object
 * @param this - The current {@link IAssertScope} object
 * @param evalMsg - The message to display if the value is not an object
 * @returns The current {@link IAssertScope.that} (`this`) object
 */
export function isObjectFunc<R>(this: IAssertScope, evalMsg?: MsgSource): R {
    let context = this.context;
    context.eval(isObject(context.value), evalMsg || "expected {value} to be an Object");

    return this.that;
}

/**
 * Is the current value a plain object
 * @param this - The current {@link IAssertScope} object
 * @param evalMsg - The message to display if the value is not an object
 * @returns The current {@link IAssertScope.that} (`this`) object
 */
export function isPlainObjectFunc<R>(this: IAssertScope, evalMsg?: MsgSource): R {
    let context = this.context;
    context.eval(isPlainObject(context.value), evalMsg || "expected {value} to be a plain Object");

    return this.that;
}

/**
 * Is the current value a function
 * @param this - The current {@link IAssertScope} object
 * @param evalMsg - The message to display if the value is not a function
 * @returns The current {@link IAssertScope.that} (`this`) object
 */
export function isFunctionFunc<R>(this: IAssertScope, evalMsg?: MsgSource): R {
    let context = this.context;
    context.eval(isFunction(context.value), evalMsg || "expected {value} to be a function");

    return this.that;
}

/**
 * Is the current value a string
 * @param this - The current {@link IAssertScope} object
 * @param evalMsg - The message to display if the value is not a string
 * @returns The current {@link IAssertScope.that} (`this`) object
 */
export function isStringFunc<R>(this: IAssertScope, evalMsg?: MsgSource): R {
    let context = this.context;
    context.eval(isString(context.value), evalMsg || "expected {value} to be a string");

    return this.that;
}

/**
 * Is the current value a number
 * @param this - The current {@link IAssertScope} object
 * @param evalMsg - The message to display if the value is not a number
 * @returns The current {@link IAssertScope.that} (`this`) object
 */
export function isNumberFunc<R>(this: IAssertScope, evalMsg?: MsgSource): R {
    let scope = this;
    let context = scope.context;
    context.eval(isNumber(context.value), evalMsg || "expected {value} to be a number");

    return scope.that;
}

/**
 * Is the current value a boolean
 * @param this - The current {@link IAssertScope} object
 * @param evalMsg - The message to display if the value is not a boolean
 * @returns The current {@link IAssertScope.that} (`this`) object
 */
export function isBooleanFunc<R>(this: IAssertScope, evalMsg?: MsgSource): R {
    let context = this.context;
    context.eval(isBoolean(context.value), evalMsg || "expected {value} to be a boolean");

    return this.that;
}

/**
 * Is the current value undefined
 * @param this - The current {@link IAssertScope} object
 * @param evalMsg - The message to display if the value is not undefined
 * @returns The current {@link IAssertScope.that} (`this`) object
 */
export function isUndefinedFunc<R>(this: IAssertScope, evalMsg?: MsgSource): R {
    let context = this.context;
    context.eval(undefined === context.value, evalMsg || "expected {value} to be undefined");

    return this.that;
}

/**
 * Is the current value null
 * @param this - The current {@link IAssertScope} object
 * @param evalMsg - The message to display if the value is not null
 * @returns The current {@link IAssertScope.that} (`this`) object
 */
export function isNullFunc<R>(this: IAssertScope, evalMsg?: MsgSource): R {
    let context = this.context;
    context.eval(null === context.value, evalMsg || "expected {value} to be null");

    return this.that;
}

/**
 * Is the current value truthy
 * @param this - The current {@link IAssertScope} object
 * @param evalMsg - The message to display if the value is not truthy
 * @returns The current {@link IAssertScope.that} (`this`) object
 */
export function isTruthyFunc<R>(this: IAssertScope, evalMsg?: MsgSource): R {
    let context = this.context;
    context.eval(isTruthy(context.value), evalMsg || "expected {value} to be truthy");

    return this.that;
}

/**
 * Is the current value equal to true, the value may be coerced to a boolean
 *
 * @param this - The current {@link IAssertScope} object
 * @param evalMsg - The message to display if the value is not falsy
 * @returns The current {@link IAssertScope.that} (`this`) object
 */
export function isTrueFunc<R>(this: IAssertScope, evalMsg?: MsgSource): R {
    let context = this.context;

    context.eval(context.value == true, evalMsg || "expected {value} to be true");

    return this.that;
}

/**
 * Is the current value equal to false, the value may be coerced to a boolean
 * @param this - The current {@link IAssertScope} object
 * @param evalMsg - The message to display if the value is not falsy
 * @returns The current {@link IAssertScope.that} (`this`) object
 */
export function isFalseFunc<R>(this: IAssertScope, evalMsg?: MsgSource): R {
    let context = this.context;

    context.eval(context.value == false, evalMsg || "expected {value} to be false");

    return this.that;
}
/**
 * Is the current value equal to true, the value must be a boolean and is directly compared to true
 *
 * @param this - The current {@link IAssertScope} object
 * @param evalMsg - The message to display if the value is not falsy
 * @returns The current {@link IAssertScope.that} (`this`) object
 */
export function isStrictTrueFunc<R>(this: IAssertScope, evalMsg?: MsgSource): R {
    let context = this.context;

    context.eval(context.value === true, evalMsg || "expected {value} to be strictly true");

    return this.that;
}

/**
 * Is the current value equal to false, the value may be coerced to a boolean
 * @param this - The current {@link IAssertScope} object
 * @param evalMsg - The message to display if the value is not falsy
 * @returns The current {@link IAssertScope.that} (`this`) object
 */
export function isStrictFalseFunc<R>(this: IAssertScope, evalMsg?: MsgSource): R {
    let context = this.context;

    context.eval(context.value === false, evalMsg || "expected {value} to be strictly false");

    return this.that;
}

/**
 * Is the current value NaN
 * @param this - The current {@link IAssertScope} object
 * @param evalMsg - The message to display if the value is not NaN
 * @returns The current {@link IAssertScope.that} (`this`) object
 */
export function isNaNFunc<R>(this: IAssertScope, evalMsg?: MsgSource): R {
    let context = this.context;
    let value = context.value;

    context.eval(isNumber(value) && isNaN(value), evalMsg || "expected {value} to be NaN");

    return this.that;
}

/**
 * Is the current value a finite number (not NaN, not Infinity, not -Infinity)
 * @param this - The current {@link IAssertScope} object
 * @param evalMsg - The message to display if the value is not a finite number
 * @returns The current {@link IAssertScope.that} (`this`) object
 */
export function isFiniteFunc<R>(this: IAssertScope, evalMsg?: MsgSource): R {
    let context = this.context;
    let value = context.value;

    context.eval(isNumber(value) && isFinite(value), evalMsg || "expected {value} to be finite");

    return this.that;
}
