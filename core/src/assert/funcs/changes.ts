/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { arrSlice, isFunction, isNumber, isObject, isString, isSymbol } from "@nevware21/ts-utils";
import { IAssertScope } from "../interface/IAssertScope";
import { MsgSource } from "../type/MsgSource";
import { _isMsgSource } from "../internal/_isMsgSource";
import { IScopeContext } from "../interface/IScopeContext";
import { changeResultOp } from "../ops/changeResultOp";
import { IChangeResultOp } from "../interface/ops/IChangeResultOp";
import { IChangeResultValue } from "../interface/ops/IChangeResultValue";

/**
 * @internal
 * Internal helper to get the value to monitor.
 * Returns either the result of calling a getter function or the property value from an object.
 */
export function _getTargetValue<T = any>(context: IScopeContext, name: string, target: (() => any) | T, prop?: keyof T): any {
    let result: any;

    if (isFunction(target)) {
        result = target();
    } else if (isObject(target as any)) {
        if (!(prop in (target as any))) {
            context.set("target", target);
            context.fatal("expected {target} to have {property} property");
        }

        result = (target as any)[prop];
    } else {
        result = (target as any)[prop];
    }

    context.set(name, result);

    return result;
}

function _handleChangeFunc<V>(scope: IAssertScope, theArgs: unknown[], callback: (context: IScopeContext, resultValue: IChangeResultValue<V>, evalMsg?: MsgSource) => IChangeResultOp): IChangeResultOp {

    let context = scope.context;
    let fn = context.value;
    let targetOrFn = theArgs[0] as ((() => any) | any);
    let property: (string | symbol | number) = null;
    let theMsg: MsgSource = null;

    if (!targetOrFn) {
        context.set("targetOrFn", targetOrFn);
        scope.fatal("expected {targetOrFn} to be function or an object");
    }

    // Parse arguments
    if (isFunction(targetOrFn)) {
        // Form: changes(func, msg?)
        if (theArgs.length >= 2 && _isMsgSource(theArgs[1])) {
            theMsg = theArgs[1] as MsgSource;
        }
    } else {
        // Form: changes(obj, prop, msg?)
        property = theArgs[1] as (string | symbol | number);
        context.set("property", property);

        if (theArgs.length >= 3 && _isMsgSource(theArgs[2])) {
            theMsg = theArgs[2] as MsgSource;
        }

        if (!(isString(property) || isSymbol(property) || isNumber(property))) {
            scope.fatal("expected property name ({property}) to be a string, symbol or number");
        }
    }

    if (!isFunction(fn)) {
        scope.fatal("expected {value} to be a function");
    }

    // Get the initial value
    let initialValue = _getTargetValue(context, "initial", targetOrFn, property);
    
    // Execute the function
    fn();
    
    // Get the final value
    let finalValue = _getTargetValue(context, "final", targetOrFn, property);

    let result: IChangeResultValue<V> = {
        property: property,
        initial: initialValue,
        value: finalValue
    };

    if (isNumber(initialValue) && isNumber(finalValue)) {
        result.delta = finalValue - initialValue;
        context.set("delta", result.delta);
    }

    return callback(context, result, theMsg);
}

/**
 * Asserts that executing the target function changes the monitored value.
 * @param this - The current {@link IAssertScope} object
 * @param func - A function that returns a value to monitor
 * @param evalMsg - Optional message to display if the assertion fails
 * @returns The current {@link IAssertScope.that} object with optional .by() chaining
 */
export function changesFunc(this: IAssertScope, func: () => any, evalMsg?: MsgSource): IChangeResultOp;

/**
 * Asserts that executing the target function changes the monitored value.
 * @param this - The current {@link IAssertScope} object
 * @param target - An object containing the property to monitor
 * @param prop - The property name to monitor
 * @param evalMsg - Optional message to display if the assertion fails
 * @returns The current {@link IAssertScope.that} object with optional .by() chaining
 */
export function changesFunc<T = any>(this: IAssertScope, target: T, prop: keyof T, evalMsg?: MsgSource): IChangeResultOp;

/**
 * Asserts that executing the target function changes the monitored value.
 * @param this - The current {@link IAssertScope} object
 * @returns The current {@link IAssertScope.that} object with optional .by() chaining
 */
export function changesFunc(this: IAssertScope): IChangeResultOp {
    let scope = this;

    return _handleChangeFunc(scope, arrSlice(arguments), (context, resultValue, theMsg) => {
        // Check if the value changed
        let changed = resultValue.initial !== resultValue.value;
        
        context.eval(changed, theMsg || (resultValue.property
            ? "expected {value} to change {property} from {initial} to a different value"
            : "expected {value} to change the monitored value from {initial} to a different value"));

        // Create a new scope with the delta for potential .by() chaining
        return changeResultOp(scope, resultValue);
    });
}

/**
 * Asserts that executing the target function increases the monitored value.
 * @param this - The current {@link IAssertScope} object
 * @param getter - A function that returns a value to monitor, or an object containing the property to monitor
 * @param prop - The property name to monitor (only used when first argument is an object)
 * @param evalMsg - Optional message to display if the assertion fails
 * @returns The current {@link IAssertScope.that} object with optional .by() chaining
 */
export function increasesFunc(this: IAssertScope, func: () => any, evalMsg?: MsgSource): IChangeResultOp;

/**
 * Asserts that executing the target function increases the monitored value.
 * @param this - The current {@link IAssertScope} object
 * @param target - An object containing the property to monitor
 * @param prop - The property name to monitor
 * @param evalMsg - Optional message to display if the assertion fails
 * @returns The current {@link IAssertScope.that} object with optional .by() chaining
 */
export function increasesFunc<T = any>(this: IAssertScope, target: T, prop: keyof T, evalMsg?: MsgSource): IChangeResultOp;

/**
 * Asserts that executing the target function increases the monitored value.
 * @param this - The current {@link IAssertScope} object
 * @returns The current {@link IAssertScope.that} object with optional .by() chaining
 */
export function increasesFunc(this: IAssertScope): IChangeResultOp {
    let scope = this;

    return _handleChangeFunc(scope, arrSlice(arguments), (context, resultValue, theMsg) => {
        // Final sanity checks
        if (!isNumber(resultValue.initial)) {
            scope.fatal("expected initial value ({initial}) to be a number");
        }

        if (!isNumber(resultValue.value)) {
            scope.fatal("expected final value ({final}) to be a number");
        }
    
        // Assert if increased
        context.eval(resultValue.delta > 0, theMsg || (resultValue.property
            ? "expected {value} to increase {property} from {initial} but it changed by {delta}"
            : "expected {value} to increase the monitored value from {initial} but it changed by {delta}"));

        // Create a new scope with the delta for potential .by() chaining
        return changeResultOp(scope, resultValue);
    });
}

/**
 * Asserts that executing the target function decreases the monitored value.
 * @param this - The current {@link IAssertScope} object
 * @param func - A function that returns a value to monitor
 * @param evalMsg - Optional message to display if the assertion fails
 * @returns The current {@link IAssertScope.that} object with optional .by() chaining
 */
export function decreasesFunc(this: IAssertScope, func: () => any, evalMsg?: MsgSource): IChangeResultOp;

/**
 * Asserts that executing the target function decreases the monitored value.
 * @param this - The current {@link IAssertScope} object
 * @param target - An object containing the property to monitor
 * @param prop - The property name to monitor
 * @param evalMsg - Optional message to display if the assertion fails
 * @returns The current {@link IAssertScope.that} object with optional .by() chaining
 */
export function decreasesFunc<T = any>(this: IAssertScope, target: T, prop: keyof T, evalMsg?: MsgSource): IChangeResultOp;

/**
 * Asserts that executing the target function decreases the monitored value.
 * @param this - The current {@link IAssertScope} object
 * @returns The current {@link IAssertScope.that} object with optional .by() chaining
 */
export function decreasesFunc(this: IAssertScope): IChangeResultOp {
    let scope = this;

    return _handleChangeFunc(scope, arrSlice(arguments), (context, resultValue, theMsg) => {
        if (!isNumber(resultValue.initial)) {
            scope.fatal("expected initial value ({initial}) to be a number");
        }

        if (!isNumber(resultValue.value)) {
            scope.fatal("expected final value ({final}) to be a number");
        }

        // Assert delta (will be negative for decrease)
        context.eval(resultValue.delta < 0, theMsg || (resultValue.property
            ? "expected {value} to decrease {property} from {initial} but it changed by {delta}"
            : "expected {value} to decrease the monitored value from {initial} but it changed by {delta}"));

        // Invert the delta to be positive for potential .by() chaining
        resultValue.delta = -resultValue.delta;
        
        // Create a new scope with the absolute delta for potential .by() chaining
        return changeResultOp(scope, resultValue);
    });
}
