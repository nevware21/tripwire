/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2025-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import {
    arrForEach, arrIndexOf, arrSlice, isArray, isIterable, isIterator, isObject,
    isStrictNullOrUndefined, isString, iterForOf, objForEachKey, strIndexOf
} from "@nevware21/ts-utils";
import { IAssertScope } from "../interface/IAssertScope";
import { EMPTY_STRING } from "../internal/const";
import { ValuesFn } from "../interface/funcs/ValuesFn";

function _getCtxValues(scope: IAssertScope, value: any): any[] {
    let theValues: any[] = [];
    if (!isStrictNullOrUndefined(value)) {
        if (isArray(value)) {
            theValues = value;
        } else if (isObject(value)) {
            objForEachKey(value, (key) => {
                theValues.push(key);
            });
        }
    }

    return theValues;
}

function _getArgValues(scope: IAssertScope, theArgs: any[]): any[] {
    let theValues: any[] = theArgs;
    if (theArgs && (isArray(theArgs[0]) || isIterable(theArgs[0]) || isIterator(theArgs[0])) && !isString(theArgs[0])) {
        if (theArgs.length > 1) {
            scope.context.set("fatal", theArgs);
            scope.fatal("expected only one argument of type Array, Iterable or Iterator - {fatal}");
        }

        if (isArray(theArgs[0])) {
            theValues = theArgs[0];
        } else {
            iterForOf(theArgs[0], (value) => {
                theValues.push(value);
            });
        }
    }

    return theValues;
}

export function anyValuesFunc<R>(_scope: IAssertScope): ValuesFn<R> {

    function _values(this: IAssertScope, _argKeys: Array<string|number|symbol> | Object | readonly any[]): R {
        let scope = this;
        let context = scope.context;
        let args = arrSlice(arguments);
        let expectedValues = _getArgValues(scope, args);
        let theValue = context.value;
        let checkValue: any = theValue;
        let checkLength: number = 1;
        let compareFn: (theArray: any, searchElement: any) => number;
        if (isString(theValue)) {
            compareFn = strIndexOf;
        } else if (isArray(theValue) || isObject(theValue)) {
            // If the value is an array or object then we need to get the values
            checkValue = _getCtxValues(scope, context.value);
            compareFn = arrIndexOf;
            checkLength = checkValue.length;
        } else {
            compareFn = (value: any, match: any) => {
                return value === match ? 0 : -1;
            };
        }

        // if (expectedValues.length === 0) {
        //     scope.context.set("expectedValues", expectedValues);
        //     scope.fatal("expected at least one value to be provided {expectedValues}");
        // }

        let found = false;
        arrForEach(expectedValues, (key) => {
            if (compareFn(checkValue, key) !== -1) {
                // Found at least one key
                found = true;
                return -1;
            }
        });

        context.set("expectedValues", expectedValues);
        context.set("checkValues", checkValue);
        context.set("checkLength", checkLength);

        context.eval(found, "expected any value: {expectedValues}, found: {checkValues} ({checkLength} value" + (checkLength > 1 ? "s" : EMPTY_STRING) + ")");

        return scope.that;
    }

    return _values;
}

export function allValuesFunc<R>(_scope: IAssertScope): ValuesFn<R> {

    function _values(this: IAssertScope, argKeys: string[] | Object | readonly any[]): R {
        let scope = this;
        let context = scope.context;
        let args = arrSlice(arguments);
        let expectedValues = _getArgValues(scope, args);
        let theValue = context.value;
        let checkValue: any = theValue;
        let checkLength: number = 1;
        let compareFn: (theArray: any, searchElement: any) => number = strIndexOf;
        if (isString(theValue)) {
            compareFn = strIndexOf;
        } else if (isArray(theValue) || isObject(theValue)) {
            // If the value is an array or object then we need to get the values
            checkValue = _getCtxValues(scope, context.value);
            compareFn = arrIndexOf;
            checkLength = checkValue.length;
        } else {
            compareFn = (value: any, match: any) => {
                return value === match ? 0 : -1;
            };
        }

        // if (expectedValues.length === 0) {
        //     scope.context.set("theValues", expectedValues);
        //     scope.fatal("expected at least one value to be provided {theValues}");
        // }

        let missingValues: any[] = [];
        arrForEach(expectedValues, (key) => {
            if (compareFn(checkValue, key) === -1) {
                missingValues.push(key);
            }
        });

        context.set("expectedValues", expectedValues);
        context.set("missingValues", missingValues);
        context.set("checkValue", checkValue);
        context.set("checkLength", checkLength);

        context.eval(missingValues.length === 0, "expected all values: {expectedValues}, missing: {missingValues}, found: {checkValue} ({checkLength} value" + (checkLength > 1 ? "s" : EMPTY_STRING) + ")");

        return scope.that;
    }

    return _values;
}

