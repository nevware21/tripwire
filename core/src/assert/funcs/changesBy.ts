/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { arrSlice, isFunction, isNumber, isString, isSymbol, mathAbs } from "@nevware21/ts-utils";
import { IAssertScope } from "../interface/IAssertScope";
import { MsgSource } from "../type/MsgSource";
import { _isMsgSource } from "../internal/_isMsgSource";
import { _getTargetValue } from "./changes";
import { IScopeContext } from "../..";

interface IChangeDeltaResult {
    property?: string | symbol | number;
    theMsg?: MsgSource;

    expected: number;

    initial: number;
    final: number;
    delta: number;
}

function _handleChangeByFunc<R>(scope: IAssertScope, theArgs: unknown[], callback: (context: IScopeContext, resultDelta: IChangeDeltaResult) => R): R {
    let context = scope.context;
    let fn = context.value;
    let targetOrFn = theArgs[0] as ((() => any) | any);
    let property: (string | symbol | number) = null;
    let expectedDelta: number;
    let theMsg: MsgSource = null;
    
    if (!targetOrFn) {
        context.set("targetOrFn", targetOrFn);
        scope.fatal("expected {targetOrFn} to be function or an object");
    }

    // Parse arguments
    if (isFunction(targetOrFn)) {
        // Form: changesBy(func, delta, msg?)
        expectedDelta = theArgs[1] as number;

        context.set("expectedDelta", expectedDelta);

        // Form: changesBy(func, delta, msg?)
        if (theArgs.length >= 3 && _isMsgSource(theArgs[2])) {
            theMsg = theArgs[2] as MsgSource;
        }
    } else {
        // Form: changesBy(obj, prop, delta, msg?)
        property = theArgs[1] as (string | symbol | number);
        expectedDelta = theArgs[2] as number;

        context.set("property", property);
        context.set("expectedDelta", expectedDelta);

        if (!(isString(property) || isSymbol(property) || isNumber(property))) {
            scope.fatal("expected property name ({property}) to be a string, symbol or number");
        }
    }

    if (!isNumber(expectedDelta)) {
        scope.fatal("expected delta ({expectedDelta}) to be a number");
    }

    if (!isFunction(fn)) {
        scope.fatal("expected {value} to be a function");
    }

    // Get the initial value
    let initialValue = _getTargetValue(context, "initial", targetOrFn, property);
    
    if (!isNumber(initialValue)) {
        scope.fatal("expected initial value ({initial}) to be a number");
    }
    
    // Execute the function
    fn();
    
    // Get the final value
    let finalValue = _getTargetValue(context, "final", targetOrFn, property);
    
    if (!isNumber(finalValue)) {
        scope.fatal("expected final value ({final}) to be a number");
    }

    let actualDelta = finalValue - initialValue;
    context.set("delta", actualDelta);

    return callback(context, {
        property: property,
        theMsg: theMsg,
        expected: expectedDelta,
        initial: initialValue,
        final: finalValue,
        delta: actualDelta
    });
}

/**
 * Asserts that executing the target function changes the monitored value by a specific delta.
 * **Important:** The sign of the delta is ignored - only the absolute value is compared.
 * This means changeBy(5) and changeBy(-5) are equivalent and will both match a change of ±5.
 * @param this - The current {@link IAssertScope} object
 * @param func - A function that returns a value to monitor
 * @param delta - The expected change amount (sign is ignored, only absolute value matters)
 * @param evalMsg - Optional message to display if the assertion fails
 * @returns The current {@link IAssertScope.that} object
 * @example
 * ```typescript
 * let value = 10;
 * const getValue = () => value;
 * const addFive = () => { value += 5; };
 * const subtractFive = () => { value -= 5; };
 *
 * expect(addFive).to.changeBy(getValue, 5);   // Passes - delta is +5
 * expect(addFive).to.changeBy(getValue, -5);  // Also passes - absolute value is 5
 * expect(subtractFive).to.changeBy(getValue, 5);  // Passes - absolute value is 5
 * expect(subtractFive).to.changeBy(getValue, -5); // Also passes - absolute value is 5
 * ```
 */
export function changesByFunc<R>(this: IAssertScope, func: () => any, delta: number, evalMsg?: MsgSource): R;

/**
 * Asserts that executing the target function changes the monitored value by a specific delta.
 * **Important:** The sign of the delta is ignored - only the absolute value is compared.
 * This means changeBy(5) and changeBy(-5) are equivalent and will both match a change of ±5.
 * @param this - The current {@link IAssertScope} object
 * @param target - An object containing the property to monitor
 * @param prop - The property name to monitor
 * @param delta - The expected change amount (sign is ignored, only absolute value matters)
 * @param evalMsg - Optional message to display if the assertion fails
 * @returns The current {@link IAssertScope.that} object
 * @example
 * ```typescript
 * const obj = { val: 10 };
 * const addFive = () => { obj.val += 5; };
 * const subtractFive = () => { obj.val -= 5; };
 *
 * expect(addFive).to.changeBy(obj, 'val', 5);   // Passes - delta is +5
 * expect(addFive).to.changeBy(obj, 'val', -5);  // Also passes - absolute value is 5
 * expect(subtractFive).to.changeBy(obj, 'val', 5);  // Passes - absolute value is 5
 * ```
 */
export function changesByFunc<R, T = any>(this: IAssertScope, target: T, prop: keyof T, delta: number | MsgSource, evalMsg?: MsgSource): R;

/**
 * Asserts that executing the target function changes the monitored value by a specific delta.
 * The sign of the delta is ignored - only the absolute value is compared.
 * @param this - The current {@link IAssertScope} object
 * @param targetOrFn - A function that returns a value to monitor, or an object containing the property to monitor
 * @param propOrDelta - The property name to monitor (used when first argument is not an object) or the expected change amount
 * @param delta - The expected change amount (sign is ignored, only absolute value matters)
 * @param evalMsg - Optional message to display if the assertion fails
 * @returns The current {@link IAssertScope.that} object
 */
export function changesByFunc<R>(this: IAssertScope): R {
    let scope = this;

    return _handleChangeByFunc<R>(scope, arrSlice(arguments), (context: IScopeContext, resultDelta: IChangeDeltaResult) => {
        // Check if the absolute delta matches (sign is ignored for changeBy)
        let matches = (resultDelta.delta === resultDelta.expected) || (resultDelta.delta === -resultDelta.expected);
        
        let defaultMsg = resultDelta.property
            ? "expected {value} to change {property} by {expectedDelta} but it changed by {delta}"
            : "expected {value} to change the monitored value by {expectedDelta} but it changed by {delta}";
        
        context.eval(matches, resultDelta.theMsg || defaultMsg);

        return scope.that;
    });
}

/**
 * Asserts that executing the target function changes the monitored value but NOT by the specific delta.
 * The value MUST change, but the change amount must not equal the specified delta (considering sign).
 * @param this - The current {@link IAssertScope} object
 * @param func - A function that returns a value to monitor
 * @param delta - The delta that should NOT match (sign is ignored, only absolute value matters)
 * @param evalMsg - Optional message to display if the assertion fails
 * @returns The current {@link IAssertScope.that} object
 */
export function changesButNotByFunc<R>(this: IAssertScope, func: () => any, delta: number, evalMsg?: MsgSource): R;

/**
 * Asserts that executing the target function changes the monitored value but NOT by the specific delta.
 * The value MUST change, but the change amount must not equal the specified delta (considering sign).
 * @param this - The current {@link IAssertScope} object
 * @param target - An object containing the property to monitor
 * @param prop - The property name to monitor
 * @param delta - The delta that should NOT match (sign is ignored, only absolute value matters)
 * @param evalMsg - Optional message to display if the assertion fails
 * @returns The current {@link IAssertScope.that} object
 */
export function changesButNotByFunc<R, T = any>(this: IAssertScope, target: T, prop: keyof T, delta: number | MsgSource, evalMsg?: MsgSource): R;

/**
 * Asserts that executing the target function changes the monitored value but NOT by the specific delta.
 * The value MUST change, but the change amount must not equal the specified delta (considering sign).
 * @param this - The current {@link IAssertScope} object
 * @param targetOrFn - A function that returns a value to monitor, or an object containing the property to monitor
 * @param propOrDelta - The property name to monitor (used when first argument is not an object) or the delta that should NOT match
 * @param delta - The delta that should NOT match (sign is ignored, only absolute value matters)
 * @param evalMsg - Optional message to display if the assertion fails
 * @returns The current {@link IAssertScope.that} object
 */
export function changesButNotByFunc<R>(this: IAssertScope): R {
    let scope = this;

    return _handleChangeByFunc<R>(scope, arrSlice(arguments), (context: IScopeContext, resultDelta: IChangeDeltaResult) => {
        let actualDelta = mathAbs(resultDelta.delta);
        let expectedDelta = mathAbs(resultDelta.expected);
        
        // Must have changed (delta != 0) AND must not match the specified delta (considering sign)
        let changed = resultDelta.initial !== resultDelta.final;
        let notByExpectedDelta = (actualDelta !== expectedDelta);
        let matches = changed && notByExpectedDelta;
        
        let defaultMsg = resultDelta.property
            ? "expected {value} to change {property} but not by {expectedDelta}, it changed by {delta}"
            : "expected {value} to change the monitored value but not by {expectedDelta}, it changed by {delta}";
        
        context.eval(matches, resultDelta.theMsg || defaultMsg);

        return scope.that;
    });
}

/**
 * Asserts that executing the target function increases the monitored value by a specific delta.
 * Unlike {@link changesByFunc}, the delta must be positive and the value must actually increase.
 * @param this - The current {@link IAssertScope} object
 * @param getter - A function that returns a value to monitor, or an object containing the property to monitor
 * @param prop - The property name to monitor (only used when first argument is an object)
 * @param delta - The expected increase amount (must be a positive number)
 * @param evalMsg - Optional message to display if the assertion fails
 * @returns The current {@link IAssertScope.that} object
 * @example
 * ```typescript
 * let count = 5;
 * const getCount = () => count;
 * const addTen = () => { count += 10; };
 *
 * expect(addTen).to.increaseBy(getCount, 10);  // Passes - increased by exactly 10
 * ```
 */
export function increasesByFunc<R, T = any>(this: IAssertScope, getter: (() => any) | T, prop?: keyof T, delta?: number | MsgSource, evalMsg?: MsgSource): R {
    let scope = this;

    return _handleChangeByFunc<R>(scope, arrSlice(arguments), (context: IScopeContext, resultDelta: IChangeDeltaResult) => {
        let expectedDelta = resultDelta.expected;
        let actualDelta = resultDelta.delta;
        
        if (expectedDelta < 0) {
            scope.fatal("expected delta ({expectedDelta}) to be positive for increases");
        }

        // Check if increased by expected amount
        let matches = actualDelta >= 0 && actualDelta === expectedDelta;
        
        let defaultMsg = resultDelta.property
            ? "expected {value} to increase {property} by {expectedDelta} but it increased by {delta}"
            : "expected {value} to increase the monitored value by {expectedDelta} but it increased by {delta}";
        
        context.eval(matches, resultDelta.theMsg || defaultMsg);

        return scope.that;
    });
}

/**
 * Asserts that executing the target function increases the monitored value but NOT by the specific delta.
 * The value MUST increase, but the increase amount must not equal the specified delta.
 * @param this - The current {@link IAssertScope} object
 * @param getter - A function that returns a value to monitor, or an object containing the property to monitor
 * @param prop - The property name to monitor (only used when first argument is an object)
 * @param delta - The delta that should NOT match
 * @param evalMsg - Optional message to display if the assertion fails
 * @returns The current {@link IAssertScope.that} object
 */
export function increasesButNotByFunc<R, T = any>(this: IAssertScope, getter: (() => any) | T, prop?: keyof T, delta?: number | MsgSource, evalMsg?: MsgSource): R {
    let scope = this;

    return _handleChangeByFunc<R>(scope, arrSlice(arguments), (context: IScopeContext, resultDelta: IChangeDeltaResult) => {
        let expectedDelta = resultDelta.expected;
        let actualDelta = resultDelta.delta;
        
        if (expectedDelta < 0) {
            scope.fatal("expected delta ({expectedDelta}) to be positive for increases");
        }

        // Must have increased (delta > 0) AND must not match the expected delta
        let increased = actualDelta > 0;
        let notByExpectedDelta = actualDelta !== expectedDelta;
        let matches = increased && notByExpectedDelta;
        
        let defaultMsg = resultDelta.property
            ? "expected {value} to increase {property} but not by {expectedDelta}, it increased by {delta}"
            : "expected {value} to increase the monitored value but not by {expectedDelta}, it increased by {delta}";
        
        context.eval(matches, resultDelta.theMsg || defaultMsg);

        return scope.that;
    });
}

/**
 * Asserts that executing the target function decreases the monitored value by a specific delta.
 * Unlike {@link changesByFunc}, the value must actually decrease.
 * **Note:** The delta should be specified as a positive value representing the magnitude of the decrease.
 * For example, if a value goes from 10 to 7, use delta of 3, not -3.
 * @param this - The current {@link IAssertScope} object
 * @param getter - A function that returns a value to monitor, or an object containing the property to monitor
 * @param prop - The property name to monitor (only used when first argument is an object)
 * @param delta - The expected decrease amount (should be a positive number representing the magnitude)
 * @param evalMsg - Optional message to display if the assertion fails
 * @returns The current {@link IAssertScope.that} object
 * @example
 * ```typescript
 * let count = 10;
 * const getCount = () => count;
 * const subtractThree = () => { count -= 3; };
 *
 * expect(subtractThree).to.decreaseBy(getCount, 3);  // Passes - decreased by 3 (use positive 3, not -3)
 * ```
 */
export function decreasesByFunc<R, T = any>(this: IAssertScope, getter: (() => any) | T, prop?: keyof T, delta?: number | MsgSource, evalMsg?: MsgSource): R {
    let scope = this;

    return _handleChangeByFunc<R>(scope, arrSlice(arguments), (context: IScopeContext, resultDelta: IChangeDeltaResult) => {
        let expectedDelta = resultDelta.expected;
        let actualDelta = resultDelta.delta;
        let actualDecrease = -actualDelta;
        
        // Check if decreased by expected amount
        let matches = actualDelta <= 0 && actualDecrease === expectedDelta;
        
        let defaultMsg = resultDelta.property
            ? "expected {value} to decrease {property} by {expectedDelta} but it changed by {delta}"
            : "expected {value} to decrease the monitored value by {expectedDelta} but it changed by {delta}";
        
        context.eval(matches, resultDelta.theMsg || defaultMsg);

        return scope.that;
    });
}

/**
 * Asserts that executing the target function decreases the monitored value but NOT by the specific delta.
 * The value MUST decrease, but the decrease amount must not equal the specified delta.
 * @param this - The current {@link IAssertScope} object
 * @param getter - A function that returns a value to monitor, or an object containing the property to monitor
 * @param prop - The property name to monitor (only used when first argument is an object)
 * @param delta - The delta that should NOT match. This should be a positive value as a decrease is expected.
 * @param evalMsg - Optional message to display if the assertion fails
 * @returns The current {@link IAssertScope.that} object
 */
export function decreasesButNotByFunc<R, T = any>(this: IAssertScope, getter: (() => any) | T, prop?: keyof T, delta?: number | MsgSource, evalMsg?: MsgSource): R {
    let scope = this;

    return _handleChangeByFunc<R>(scope, arrSlice(arguments), (context: IScopeContext, resultDelta: IChangeDeltaResult) => {
        let expectedDelta = resultDelta.expected;
        let actualDelta = resultDelta.delta;
        let actualDecrease = -actualDelta;
        
        // Must have decreased (delta < 0) AND must not match the expected decrease
        let decreased = actualDelta < 0;
        let notByExpectedDelta = actualDecrease !== expectedDelta;
        let matches = decreased && notByExpectedDelta;
        
        let defaultMsg = resultDelta.property
            ? "expected {value} to decrease {property} but not by {expectedDelta}, it changed by {delta}"
            : "expected {value} to decrease the monitored value but not by {expectedDelta}, it changed by {delta}";
        
        context.eval(matches, resultDelta.theMsg || defaultMsg);

        return scope.that;
    });
}
