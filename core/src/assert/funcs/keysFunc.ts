/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { arrForEach, arrFrom, arrSlice, asString, dumpObj, isArray, isFunction, isObject, isStrictNullOrUndefined, isString, objGetOwnPropertyDescriptor, objGetOwnPropertySymbols, objKeys } from "@nevware21/ts-utils";
import { IAssertScope } from "../interface/IAssertScope";
import { KeysFn } from "../interface/funcs/KeysFn";
import { EMPTY_STRING } from "../internal/const";
import { _deepEqual } from "./equal";

function _objKeys(value: any): any[] {
    let keys: any[] = [];
    if (value) {
        keys = objKeys(value);

        let symbols = objGetOwnPropertySymbols(value);
        arrForEach(symbols, (symbol) => {
            if (objGetOwnPropertyDescriptor(value, symbol).enumerable) {
                keys.push(symbol);
            }
        });
    }

    return keys;
}

function _formatKeys(keys: any[]): string {
    let formattedKeys: string = EMPTY_STRING;
    arrForEach(keys, (key) => {
        if (formattedKeys.length > 0) {
            formattedKeys += ",";
        }
        if (key || isStrictNullOrUndefined(key)) {
            try {
                formattedKeys += asString(key);
            } catch (e) {
                // Handle objects that can't be converted to string (e.g., null prototype)
                formattedKeys += dumpObj(key);
            }
        } else if (!isString(key)) {
            try {
                formattedKeys += asString(key);
            } catch (e) {
                formattedKeys += dumpObj(key);
            }
        } else {
            // special case for empty string keys
            formattedKeys += "\"\"";
        }
    });

    return formattedKeys;
}

function _getValueKeys(value: any): any[] {
    let theKeys: any[] = [];
    if (!isStrictNullOrUndefined(value)) {
        // Check if it's a Map or Set
        if (isFunction(value.keys)) {
            // For Maps and Sets, use the keys() iterator
            theKeys = arrFrom(value.keys());
        } else {
            // For regular objects, use _objKeys
            theKeys = _objKeys(value);
        }
    }

    return theKeys;
}

function _getArgKeys(scope: IAssertScope, theArgs: any[]): string[] {
    let theKeys: string[] = theArgs;
    if (theArgs && (isArray(theArgs[0]) || isObject(theArgs[0])) && !isString(theArgs[0])) {
        if (theArgs.length > 1) {
            scope.context.set("fatal", theArgs);
            scope.fatal("expected only one argument of type Array or Object - {fatal}");
        }

        if (isArray(theArgs[0])) {
            theKeys = theArgs[0];
        } else {
            theKeys = _objKeys(theArgs[0]);
        }
    }

    return theKeys;
}

function _getArgKeysForDeep(scope: IAssertScope, theArgs: any[]): any[] {
    // For deep keys, if a single array argument is provided, unwrap it to get multiple keys
    // This matches Chai behavior: .keys([a, b, c]) checks for keys a, b, c
    // Otherwise, treat all arguments as individual keys
    if (theArgs && theArgs.length === 1 && isArray(theArgs[0])) {
        return theArgs[0];
    }

    return theArgs;
}

export function anyKeysFunc<R>(_scope: IAssertScope): KeysFn<R> {

    function _keys(this: IAssertScope, _argKeys: Array<string|number|symbol> | Object | readonly any[]): R {
        let scope = this;
        let context = scope.context;
        let args = arrSlice(arguments);
        let expectedKeys = _getArgKeys(scope, args);
        let valueKeys = _getValueKeys(context.value);

        if (expectedKeys.length === 0) {
            scope.context.set("expectedKeys", expectedKeys);
            scope.fatal("expected at least one key to be provided {expectedKeys}");
        }

        let found = false;
        arrForEach(expectedKeys, (key) => {
            if (valueKeys.indexOf(key) !== -1) {
                // Found at least one key
                found = true;
                return -1;
            }
        });

        context.eval(found, `expected any key: [${_formatKeys(expectedKeys)}], found: [${_formatKeys(valueKeys)}] (${valueKeys.length} keys)`);

        return scope.that;
    }

    return _keys;
}

export function allKeysFunc<R>(_scope: IAssertScope): KeysFn<R> {

    function _keys(this: IAssertScope, argKeys: string[] | Object | readonly any[]): R {
        let scope = this;
        let context = scope.context;
        let args = arrSlice(arguments);
        let theKeys = _getArgKeys(scope, args);
        let valueKeys = _getValueKeys(context.value);

        if (theKeys.length === 0) {
            scope.context.set("theKeys", theKeys);
            scope.fatal("expected at least one key to be provided {theKeys}");
        }

        let missingKeys: string[] = [];
        arrForEach(theKeys, (key) => {
            if (valueKeys.indexOf(key) === -1) {
                missingKeys.push(key);
            }
        });

        context.eval(missingKeys.length === 0, `expected all keys: [${_formatKeys(theKeys)}], missing: [${_formatKeys(missingKeys)}], found: [${_formatKeys(valueKeys)}]`);

        return scope.that;
    }

    return _keys;
}

/**
 * Creates a KeysFn function that checks if any of the provided keys exist in the value using deep equality comparison.
 * This is used for deep key matching where keys are compared using deep equality instead of strict equality.
 * @param _scope - The assert scope.
 * @returns A KeysFn function.
 */
export function anyDeepKeysFunc<R>(_scope: IAssertScope): KeysFn<R> {

    function _keys(this: IAssertScope, _argKeys: Array<string|number|symbol> | Object | readonly any[]): R {
        let scope = this;
        let context = scope.context;
        let args = arrSlice(arguments);
        let expectedKeys = _getArgKeysForDeep(scope, args);
        let valueKeys = _getValueKeys(context.value);

        if (expectedKeys.length === 0) {
            scope.context.set("expectedKeys", expectedKeys);
            scope.fatal("expected at least one key to be provided {expectedKeys}");
        }

        let found = false;
        arrForEach(expectedKeys, (expKey) => {
            arrForEach(valueKeys, (valKey) => {
                if (_deepEqual(valKey, expKey)) {
                    // Found at least one key using deep equality
                    found = true;
                    return -1;
                }
            });

            if (found) {
                return -1;
            }
        });

        context.eval(found, `expected any deep key: [${_formatKeys(expectedKeys)}], found: [${_formatKeys(valueKeys)}] (${valueKeys.length} keys)`);

        return scope.that;
    }

    return _keys;
}

/**
 * Creates a KeysFn function that checks if all of the provided keys exist in the value using deep equality comparison.
 * This is used for deep key matching where keys are compared using deep equality instead of strict equality.
 * @param _scope - The assert scope.
 * @returns A KeysFn function.
 */
export function allDeepKeysFunc<R>(_scope: IAssertScope): KeysFn<R> {

    function _keys(this: IAssertScope, argKeys: string[] | Object | readonly any[]): R {
        let scope = this;
        let context = scope.context;
        let args = arrSlice(arguments);
        let theKeys = _getArgKeysForDeep(scope, args);
        let valueKeys = _getValueKeys(context.value);

        if (theKeys.length === 0) {
            scope.context.set("theKeys", theKeys);
            scope.fatal("expected at least one key to be provided {theKeys}");
        }

        let missingKeys: any[] = [];
        arrForEach(theKeys, (expKey) => {
            let found = false;
            arrForEach(valueKeys, (valKey) => {
                if (_deepEqual(valKey, expKey)) {
                    found = true;
                    return -1;
                }
            });

            if (!found) {
                missingKeys.push(expKey);
            }
        });

        context.eval(missingKeys.length === 0, `expected all deep keys: [${_formatKeys(theKeys)}], missing: [${_formatKeys(missingKeys)}], found: [${_formatKeys(valueKeys)}]`);

        return scope.that;
    }

    return _keys;
}
