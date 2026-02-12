/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { arrForEach, arrMap, asString, isDate, isFunction, isObject, isPlainObject, isPrimitive, isSymbol, iterForOf, objGetOwnPropertyDescriptor, objGetOwnPropertySymbols, objIs, objToString, strLower } from "@nevware21/ts-utils";
import { MsgSource } from "../type/MsgSource";
import { IAssertScope } from "../interface/IAssertScope";
import { _formatValue } from "../../internal/_formatValue";
import { IScopeContext } from "../interface/IScopeContext";

/**
 * Performs a simple loose equality check (`==`) between the `actual` and `expected` values,
 * this will attempt to coerce the values to the same type before comparing.
 * @param this - The assert scope.
 * @param expected - The expected value.
 * @param evalMsg - The message to display if the values are not strictly equal.
 * @returns - The assert scope.
 */
export function equalsFunc<R, T>(this: IAssertScope, expected: T, evalMsg?: MsgSource): R {
    let scope = this;
    let context = scope.context;

    context.set("expected", expected);
    let theValue = context.value;

    context.eval(theValue == expected, evalMsg || "expected {value} to equal {expected}");

    return scope.that;
}

/**
 * Performs a strict equality check (`===`) between the `actual` and `expected` values.
 * @param this - The assert scope.
 * @param expected - The expected value.
 * @param evalMsg - The message to display if the values are not strictly equal.
 * @returns - The assert scope.
 */
export function strictEqualsFunc<R, T>(this: IAssertScope, expected: T, evalMsg?: MsgSource): R {
    let scope = this;
    let context = scope.context;

    context.set("expected", expected);
    let theValue = context.value;

    context.eval(theValue === expected, evalMsg || "expected {value} to strictly equal {expected}");

    return scope.that;
}

/**
 * Performs a loose deep equality check between the `actual` and `expected` value,
 * this will coerce the values to the same type before comparing.
 * @param this - The assert scope.
 * @param expected - The expected value.
 * @param evalMsg - The message to display if the values are not strictly equal.
 * @returns - The assert scope.
 */
export function deepEqualsFunc<R, T>(this: IAssertScope, expected: T, evalMsg?: MsgSource): R {
    let scope = this;
    let context = scope.context;

    context.set("expected", expected);
    let options: IEqualOptions = {
        context: context,
        strict: false,
        matchMap: [],
        visiting: []
    };

    context.eval(_deepEquals(context.value, expected, options) == true, evalMsg || "expected {value} to deeply equal {expected}");

    return scope.that;
}

/**
 * Performs a strict deep equality check between the `actual` and `expected` value.
 * @param this - The assert scope.
 * @param expected - The expected value.
 * @param evalMsg - The message to display if the values are not strictly equal.
 * @returns - The assert scope.
 */
export function deepStrictEqualsFunc<R, T>(this: IAssertScope, expected: T, evalMsg?: MsgSource): R {
    let scope = this;
    let context = scope.context;

    context.set("expected", expected);
    let options: IEqualOptions = {
        context: context,
        strict: true,
        matchMap: [],
        visiting: []
    };

    context.eval(_deepEquals(context.value, expected, options) == true, evalMsg || "expected {value} to deeply and strictly equal {expected}");

    return scope.that;
}

function _isEqual<T>(value: T, expected: T, options: IEqualOptions): boolean {
    if (options.strict === true) {
        let strictResult = _strictEquals(value, expected);
        if (strictResult !== null) {
            return strictResult;
        }

        return null;
    }

    return _isLooseEquals(value, expected);
}

/**
 * Perform a loose equals comparison between two values
 * this will coerce the values to the same type before comparing
 */
function _isLooseEquals<T>(value: T, expected: T): boolean {
    // Non-Strict (coerce) equals
    if (value == expected) {
        return true;
    }

    // Nan cases
    // eslint-disable-next-line no-self-compare
    if (value != value && expected != expected) {
        return true;
    }

    if (isPrimitive(value) || isPrimitive(expected)) {
        return false;
    }

    return null;
}

function _strictEquals<T>(value: T, expected: T): boolean {
    if (value === expected) {
        // Handles +/- zero -0
        return value === 0 || 1 === 1;
    }

    if (objIs(value, expected)) {
        return true;
    }

    // Nan cases
    // eslint-disable-next-line no-self-compare
    if (value !== value && expected !== expected) {
        return true;
    }

    if (isPrimitive(value) || isPrimitive(expected)) {
        return false;
    }

    return null;
}

interface IMatchMap {
    act: any;
    values: IMatchResult[];
}

interface IMatchResult {
    exp: any;
    res?: boolean;
}

interface IEqualOptions {
    context: IScopeContext;
    strict?: boolean;
    ordered?: boolean;
    matchMap: IMatchMap[];
    visiting: any[];
}

/**
 * Wraps _strictEquals to ensure it always returns a boolean (never null).
 * For types that should only be equal if reference-equal (Promise, function, WeakMap, etc.),
 * this treats non-reference-equal values as not equal.
 */
const _strictEqualsBool = (value: any, expected: any, options: IEqualOptions): boolean => {
    return _strictEquals(value, expected) === true;
};

const _typeEquals: { [key: string]: (value: any, expected: any, options: IEqualOptions) => boolean } = {
    "string": _valueOfEquals,
    "number": _valueOfEquals,
    "boolean": _valueOfEquals,
    "undefined": _valueOfEquals,
    "date": _valueOfEquals,

    "promise": _strictEqualsBool,
    "function": _strictEqualsBool,
    "symbol": _strictEqualsBool,
    "weakmap": _strictEqualsBool,
    "weakset": _strictEqualsBool,

    "error": _matchKeys(["name", "message", "code"]),

    "regexp": _toStringEquals,

    "map": _entriesEquals,
    "set": _entriesEquals,

    "temporal.calendar": _toStringEquals,
    "temporal.timezone": _toStringEquals,
    "temporal.duration": (value, expected, options) => {
        return value.total("nanoseconds") === expected.total("nanoseconds");
    }
};

function _getTypeComparer(value: any): (value: any, expected: any, options: IEqualOptions) => boolean {
    if (value === null) {
        return null;
    }

    let theType = typeof value;
    let objType;
    if (theType === "object") {
        objType = strLower(objToString(value).slice(8, -1));
    }

    let compareFn = (objType && _typeEquals[objType]) || _typeEquals[theType];
    if (!compareFn) {
        try {
            if (isObject(value) && isFunction(value[Symbol.iterator])) {
                return _iterEquals;
            }
        } catch (e) {
            // Do nothing
        }

        if (_hasEqualsFn(value)) {
            return _equalsFn;
        }
    }

    return compareFn;
}

function _hasEqualsFn(value: any): boolean {
    if (value && isFunction(value.equals)) {
        return true;
    }

    return false;
}

function _equalsFn(value: any, expected: any, options: IEqualOptions): boolean {
    return value.equals(expected);
}

function _toStringEquals(value: any, expected: any, options: IEqualOptions): boolean {
    let valueStr: string;
    let expectedStr: string;
    if (value && isFunction(value.toString)) {
        valueStr = value.toString();
    } else {
        valueStr = asString(value);
    }

    if (expected && isFunction(expected.toString)) {
        expectedStr = expected.toString();
    } else {
        expectedStr = asString(expected);
    }

    return valueStr === expectedStr;
}

function _valueOfEquals(value: any, expected: any, options: IEqualOptions): boolean {
    return _deepEquals(value.valueOf(), expected.valueOf(), options);
}

function _isVisiting<T>(value: any, options: IEqualOptions, cb: () => T): T {
    let tracking = false;
    try {
        if (!isPrimitive(value)) {
            let visitCount = 0;
            arrForEach(options.visiting, (visitValue) => {
                if (_strictEquals(visitValue, value) === true) {
                    visitCount++;
                }
            });

            if (visitCount > 10) {
                let errorMsg = "Unresolvable Circular reference detected for " + _formatValue(options.context.opts, options.visiting[0]) + " @ depth " + options.visiting.length + " reference count: " + visitCount;
                if (options.context) {
                    options.context.fatal(errorMsg);
                } else {
                    throw new Error(errorMsg);
                }
            }

            options.visiting.push(value);
            tracking = true;
        }

        return cb();
    } finally {
        if (tracking) {
            options.visiting.pop();
        }
    }
}

function _isChecked(value: any, expected: any, options: IEqualOptions, cb:() => boolean): boolean {
    if (isPrimitive(value)) {
        return cb();
    }

    let matchMap = options.matchMap;
    let theMap: IMatchMap = null;

    for (let idx = 0; idx < matchMap.length; idx++) {
        let map = matchMap[idx];
        if (value === map.act) {
            theMap = map;
            let matches = theMap.values;

            for (let lp = 0; lp < matches.length; lp++) {
                let matched = matches[lp];
                if (expected === matched.exp) {
                    return matched.res;
                }
            }

            break;
        }
    }

    if (!theMap) {
        theMap = {
            act: value,
            values: []
        };

        matchMap.push(theMap);
    }

    let theMatch: IMatchResult = {
        exp: expected,
        res: undefined
    };
    theMap.values.push(theMatch);
    theMatch.res = cb();

    return theMatch.res;
}

function _matchKeys<T>(theKeys: T[]): (value: any, expected: any, options: IEqualOptions) => boolean {
    return (value: any, expected: any, options: IEqualOptions) => {
        if (theKeys.length === 0) {
            return true;
        }

        return _isVisiting(value, options, () => {
            for (let lp = 0; lp < theKeys.length; lp++) {
                let key = theKeys[lp];
                if (_deepEquals(value[key], expected[key], options) === false) {
                    return false;
                }
            }

            return true;
        });
    };
}

function _getObjKeys(value: any): Array<string | number | symbol> {
    let keys: Array<string | number | symbol> = [];
    for (let key in value) {
        keys.push(key);
    }

    arrForEach(objGetOwnPropertySymbols(value), (sym) => {
        if (objGetOwnPropertyDescriptor(value, sym).enumerable) {
            keys.push(sym);
        }
    });

    return keys;
}

function _iterEquals(value: any, expected: any, options: IEqualOptions): boolean {
    let valueLen = value.length;
    let expectedLen = expected.length;

    if (valueLen !== expectedLen) {
        return false;
    }

    if (valueLen === 0) {
        return true;
    }

    for (let lp = 0; lp < valueLen; lp++) {
        if (_deepEquals(value[lp], expected[lp], options) === false) {
            return false;
        }
    }

    return true;
}

function _getIteratorValues(value: any): any[] {
    let values: any[] = [];
    try {
        if (isObject(value) && isFunction(value[Symbol.iterator])) {
            iterForOf(value[Symbol.iterator](), (val) => {
                values.push(val);
            });
        }
    } catch (e) {
        // Do nothing
    }

    return values;
}

function _entriesEquals(value: any, expected: any, options: IEqualOptions): boolean {
    try {
        if (value.size !== expected.size) {
            return false;
        }

        if (value.size === 0) {
            return true;
        }
    } catch (e) {
        return false;
    }

    let valueEntries: Array<[any,any]> = [];
    let expectedEntries: Array<[any,any]> = [];
    value.forEach((key: any, val: any) => {
        valueEntries.push([key, val]);
    });

    if (expected && expected.forEach) {
        expected.forEach((key: any, val: any) => {
            expectedEntries.push([key, val]);
        });
    }

    return _iterEquals(valueEntries, expectedEntries, options);
}

function _sort<T>(values: Array<T>, options: IEqualOptions): Array<T> {
    if (options.ordered !== false) {
        return values.sort();
    }

    return values;
}

function _objEquals(value: any, expected: any, options: IEqualOptions): boolean {
    // If strictly equal the shortcut the comparison
    if (_strictEquals(value, expected) === true) {
        return true;
    }

    let valueKeys = _getObjKeys(value);
    let expectedKeys = _getObjKeys(expected);

    if (valueKeys.length !== expectedKeys.length) {
        return false;
    }

    if (valueKeys.length > 0) {
        let theKeys = _sort(_mapKeys(valueKeys), options);
        // Check for key equality
        if (_iterEquals(theKeys, _sort(_mapKeys(expectedKeys), options), options) === false) {
            return false;
        }

        return _matchKeys(theKeys)(value, expected, options);
    }

    // Check for iterator values
    let valueEntries = _getIteratorValues(value);
    let expectedEntries = _getIteratorValues(expected);
    if (valueEntries.length > 0 && valueEntries.length === expectedEntries.length) {
        return _iterEquals(_sort(valueEntries, options), _sort(expectedEntries, options), options);
    }

    // If there are no keys or entries, then the objects are equal
    if (valueKeys.length === 0 && valueEntries.length === 0 && valueEntries.length === 0 && expectedEntries.length === 0) {
        return true;
    }

    return false;
}

function _deepEquals<T>(value: T, expected: T, options: IEqualOptions): boolean {

    return _isChecked(value, expected, options, () => {
        let isEquals = _isEqual(value, expected, options);
        if (isEquals !== null) {
            return isEquals;
        }

        if (isPlainObject(value) && isPlainObject(expected)) {
            return _objEquals(value, expected, options);
        }

        if (isDate(value) && isDate(expected)) {
            return value.getTime() === expected.getTime();
        }

        let typeFn = _getTypeComparer(value);
        if (typeFn) {
            return typeFn(value, expected, options);
        }

        if (_getTypeComparer(expected)) {
            // The types don't appear to match so they are not equal
            return false;
        }

        return _objEquals(value, expected, options);
    });
}

function _mapKeys(values: Array<string | number | symbol>): Array<string|number> {
    return arrMap(values, (key) => {
        if (isSymbol(key)) {
            return key.toString();
        }

        return key;
    });
}

/**
 * Internal helper function for performing deep equality checks between two values.
 * This can be used by other modules that need deep equality comparison.
 * @internal
 * @param value - The first value to compare.
 * @param expected - The second value to compare.
 * @param strict - Whether to use strict equality (default: false for loose equality).
 * @returns True if the values are deeply equal, false otherwise.
 * @since 0.1.5
 */
export function _deepEqual<T>(value: T, expected: T, strict: boolean = false): boolean {
    let options: IEqualOptions = {
        context: null,
        strict: strict,
        matchMap: [],
        visiting: []
    };

    return _deepEquals(value, expected, options) === true;
}