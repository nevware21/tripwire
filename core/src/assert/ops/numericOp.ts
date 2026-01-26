/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { isDate, isNumber } from "@nevware21/ts-utils";
import { MsgSource } from "../type/MsgSource";
import { IAssertScope } from "../interface/IAssertScope";
import { INumericOp } from "../interface/ops/INumericOp";
import { AssertScopeFuncDefs } from "../interface/IAssertInst";
import { IScopeContext } from "../interface/IScopeContext";

/**
 * @internal
 * Helper function to get numeric value from either a number or Date
 */
function _getNumericValue(value: number | Date): number {
    if (isDate(value)) {
        return value.getTime();
    }

    return value;
}

function _checkTypes(context: IScopeContext, value: unknown, expected: unknown, evalMsg?: MsgSource): void {

    if (isNumber(value)) {
        if (!isNumber(expected)) {
            context.fatal(evalMsg || "expected {expected} to be a number");
        }
    } else if (isDate(value)) {
        if (!isDate(expected)) {
            context.fatal(evalMsg || "expected {expected} to be a date");
        }
    } else {
        context.fatal(evalMsg || "expected {value} to be a number or date");
    }
}

/**
 * Asserts that the target is a number or a date greater than the given number or date respectively.
 * @param this - The assert scope.
 * @param n - The value to compare against.
 * @param evalMsg - The message to display if the assertion fails.
 * @returns - The assert scope.
 * @since 0.1.5
 */
export function aboveFunc<R>(this: IAssertScope, n: number | Date, evalMsg?: MsgSource): R {
    let scope = this;
    let context = scope.context;
    let value = context.value;

    context.set("expected", n);

    _checkTypes(context, value, n, evalMsg);

    let actualValue = _getNumericValue(value);
    let expectedValue = _getNumericValue(n);

    context.eval(actualValue > expectedValue, evalMsg || "expected {value} to be above {expected}");

    return scope.that;
}

/**
 * Asserts that the target is a number or a date greater than or equal to the given number or date respectively.
 * @param this - The assert scope.
 * @param n - The value to compare against.
 * @param evalMsg - The message to display if the assertion fails.
 * @returns - The assert scope.
 * @since 0.1.5
 */
export function leastFunc<R>(this: IAssertScope, n: number | Date, evalMsg?: MsgSource): R {
    let scope = this;
    let context = scope.context;
    let value = context.value;

    context.set("expected", n);
    
    _checkTypes(context, value, n, evalMsg);

    let actualValue = _getNumericValue(value);
    let expectedValue = _getNumericValue(n);

    context.eval(actualValue >= expectedValue, evalMsg || "expected {value} to be at least {expected}");

    return scope.that;
}

/**
 * Asserts that the target is a number or a date less than the given number or date respectively.
 * @param this - The assert scope.
 * @param n - The value to compare against.
 * @param evalMsg - The message to display if the assertion fails.
 * @returns - The assert scope.
 * @since 0.1.5
 */
export function belowFunc<R>(this: IAssertScope, n: number | Date, evalMsg?: MsgSource): R {
    let scope = this;
    let context = scope.context;
    let value = context.value;

    context.set("expected", n);
    
    _checkTypes(context, value, n, evalMsg);

    let actualValue = _getNumericValue(value);
    let expectedValue = _getNumericValue(n);

    context.eval(actualValue < expectedValue, evalMsg || "expected {value} to be below {expected}");

    return scope.that;
}

/**
 * Asserts that the target is a number or a date less than or equal to the given number or date respectively.
 * @param this - The assert scope.
 * @param n - The value to compare against.
 * @param evalMsg - The message to display if the assertion fails.
 * @returns - The assert scope.
 * @since 0.1.5
 */
export function mostFunc<R>(this: IAssertScope, n: number | Date, evalMsg?: MsgSource): R {
    let scope = this;
    let context = scope.context;
    let value = context.value;

    context.set("expected", n);
    
    _checkTypes(context, value, n, evalMsg);

    let actualValue = _getNumericValue(value);
    let expectedValue = _getNumericValue(n);

    context.eval(actualValue <= expectedValue, evalMsg || "expected {value} to be at most {expected}");

    return scope.that;
}

/**
 * Asserts that the target is a number or a date within a given +/- delta range.
 * @param this - The assert scope.
 * @param start - The start of the range.
 * @param finish - The end of the range.
 * @param evalMsg - The message to display if the assertion fails.
 * @returns - The assert scope.
 * @since 0.1.5
 */
export function withinFunc<R>(this: IAssertScope, start: number | Date, finish: number | Date, evalMsg?: MsgSource): R {
    let scope = this;
    let context = scope.context;
    let value = context.value;

    context.set("start", start);
    context.set("finish", finish);
    
    _checkTypes(context, value, start, evalMsg);
    _checkTypes(context, value, finish, evalMsg);

    let actualValue = _getNumericValue(value);
    let startValue = _getNumericValue(start);
    let finishValue = _getNumericValue(finish);

    context.eval(
        actualValue >= startValue && actualValue <= finishValue,
        evalMsg || "expected {value} to be within {start}..{finish}"
    );

    return scope.that;
}

/**
 * Creates the numeric assertion operation using the given scope.
 * This provides numeric comparison operations like above, below, least, most, and within.
 * @param scope - The current scope of the assert
 * @returns - The {@link INumericOp} operation instance.
 */
export function numericOp<R>(scope: IAssertScope): INumericOp<R> {
    const props: AssertScopeFuncDefs<INumericOp<R>> = {
        above: { scopeFn: aboveFunc },
        gt: { scopeFn: aboveFunc },
        greaterThan: { scopeFn: aboveFunc },
        
        least: { scopeFn: leastFunc },
        gte: { scopeFn: leastFunc },
        greaterThanOrEqual: { scopeFn: leastFunc },
        
        below: { scopeFn: belowFunc },
        lt: { scopeFn: belowFunc },
        lessThan: { scopeFn: belowFunc },
        
        most: { scopeFn: mostFunc },
        lte: { scopeFn: mostFunc },
        lessThanOrEqual: { scopeFn: mostFunc },
        
        within: { scopeFn: withinFunc }
    };

    return scope.createOperation(props);
}
