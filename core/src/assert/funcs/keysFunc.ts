/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { arrForEach, arrFrom, arrSlice, isArray, isMapLike, isObject, isSetLike, isStrictNullOrUndefined, isString, objGetOwnPropertyDescriptor, objGetOwnPropertySymbols, objKeys } from "@nevware21/ts-utils";
import { IAssertScope } from "../interface/IAssertScope";
import { KeysFn } from "../interface/funcs/KeysFn";
import { _deepEqual } from "./equal";
import { _isArrayLikeOrIterable, _iterateForEachItem } from "../internal/_isArrayLikeOrIterable";
import { _isMsgSource } from "../internal/_isMsgSource";

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

function _getValueKeys(value: any): any[] {
    let theKeys: any[] = [];
    if (!isStrictNullOrUndefined(value)) {
        // Check if it's a Map or Set
        if (isMapLike(value) || isSetLike(value)) {
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

/**
 * Processes arguments for deep key comparisons, extracting the keys to compare.
 * This helper function handles ArrayLikeOrSizedIterable expansion and filters out
 * optional initMsg parameters.
 *
 * @param scope - The assert scope (currently unused but matches signature pattern).
 * @param theArgs - The raw arguments array from the calling function.
 * @returns An array of keys to compare against the target value.
 *
 * @remarks
 * This function handles three scenarios:
 * 1. If the last argument is a MsgSource (custom error message), it's excluded from processing
 * 2. If a single ArrayLikeOrSizedIterable is provided (Array, Set, Map, etc.), it's expanded into individual keys
 * 3. Otherwise, all arguments are treated as individual keys
 *
 * This matches Chai behavior where `.keys([a, b, c])` checks for keys a, b, c,
 * while also supporting Sets, Maps, and other iterables as keys collections.
 *
 * @example
 * ```typescript
 * // With array: _getArgKeysForDeep(scope, [[key1, key2]]) → [key1, key2]
 * // With Set: _getArgKeysForDeep(scope, [new Set([key1, key2])]) → [key1, key2]
 * // With message: _getArgKeysForDeep(scope, [[key1], "msg"]) → [key1]
 * ```
 */
function _getArgKeysForDeep(scope: IAssertScope, theArgs: any[]): any[] {
    // Exclude optional initMsg parameter if present (last argument)
    let argsToProcess = theArgs;
    if (theArgs && theArgs.length >= 2 && _isMsgSource(theArgs[theArgs.length - 1])) {
        // Remove the last argument (initMsg) from processing
        argsToProcess = arrSlice(theArgs, 0, theArgs.length - 1);
    }

    // For deep keys, if a single ArrayLikeOrSizedIterable argument is provided, unwrap it to get multiple keys
    // This matches Chai behavior: .keys([a, b, c]) checks for keys a, b, c
    // Also handles Sets, Maps, and other iterables as keys collections
    // Otherwise, treat all arguments as individual keys
    if (argsToProcess && argsToProcess.length === 1) {
        let firstArg = argsToProcess[0];
        if (_isArrayLikeOrIterable(firstArg)) {
            // Expand the iterable/array-like into individual keys
            let keys: any[] = [];
            _iterateForEachItem(firstArg, (key) => {
                keys.push(key);
            });
            return keys;
        }
    }

    return argsToProcess;
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

        context.set("expectedKeys", expectedKeys);
        context.set("valueKeys", valueKeys);

        context.eval(found, "expected any key: {expectedKeys}, found: {valueKeys} (" + valueKeys.length + " keys)");

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

        context.set("theKeys", theKeys);
        context.set("missingKeys", missingKeys);
        context.set("valueKeys", valueKeys);

        context.eval(missingKeys.length === 0, "expected all keys: {theKeys}, missing: {missingKeys}, found: {valueKeys}");

        return scope.that;
    }

    return _keys;
}

/**
 * Creates a KeysFn function that checks if any of the provided keys exist in the value using deep equality comparison.
 * This is used for deep key matching where keys are compared using deep equality instead of strict equality.
 * Particularly useful for Maps and Sets where object keys need to be compared by value rather than reference.
 *
 * @param _scope - The assert scope.
 * @returns A KeysFn function that accepts keys as an Array, Set, Map, or other iterable, or a single key.
 *
 * @remarks
 * The function performs deep equality comparison using {@link _deepEqual} which recursively compares
 * object properties, array elements, and handles special cases like Date, RegExp, Map, Set, etc.
 *
 * Keys can be provided in multiple ways:
 * - Single key: `anyDeepKeysFunc(scope)({ id: 1 })`
 * - Array of keys: `anyDeepKeysFunc(scope)([{ id: 1 }, { id: 2 }])`
 * - Set of keys: `anyDeepKeysFunc(scope)(new Set([{ id: 1 }, { id: 2 }]))`
 * - Map of keys: `anyDeepKeysFunc(scope)(new Map([[{ id: 1 }, 'val']]))`  // Uses Map keys
 *
 * @example
 * ```typescript
 * // With Map containing object keys
 * const map = new Map();
 * map.set({ id: 1 }, 'value1');
 * map.set({ id: 2 }, 'value2');
 * anyDeepKeysFunc(scope).call({ value: map }, [{ id: 1 }, { id: 3 }]);  // Passes - has { id: 1 }
 *
 * // With regular object
 * const obj = { greeting: 'hello', subject: 'friend' };
 * anyDeepKeysFunc(scope).call({ value: obj }, ['greeting', 'unknown']);  // Passes - has 'greeting'
 * ```
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
                if (_deepEqual(valKey, expKey, false, context)) {
                    // Found at least one key using deep equality
                    found = true;
                    return -1;
                }
            });

            if (found) {
                return -1;
            }
        });

        context.set("expectedKeys", expectedKeys);
        context.set("valueKeys", valueKeys);

        context.eval(found, "expected any deep key: {expectedKeys}, found: {valueKeys} (" + valueKeys.length + " keys)");

        return scope.that;
    }

    return _keys;
}

/**
 * Creates a KeysFn function that checks if all of the provided keys exist in the value using deep equality comparison.
 * This is used for deep key matching where keys are compared using deep equality instead of strict equality.
 * Particularly useful for Maps and Sets where object keys need to be compared by value rather than reference.
 *
 * @param _scope - The assert scope.
 * @returns A KeysFn function that accepts keys as an Array, Set, Map, or other iterable, or a single key.
 *
 * @remarks
 * The function performs deep equality comparison using {@link _deepEqual} which recursively compares
 * object properties, array elements, and handles special cases like Date, RegExp, Map, Set, etc.
 * All provided keys must exist in the target for the assertion to pass.
 *
 * Keys can be provided in multiple ways:
 * - Single key: `allDeepKeysFunc(scope)({ id: 1 })`
 * - Array of keys: `allDeepKeysFunc(scope)([{ id: 1 }, { id: 2 }])`
 * - Set of keys: `allDeepKeysFunc(scope)(new Set([{ id: 1 }, { id: 2 }]))`
 * - Map of keys: `allDeepKeysFunc(scope)(new Map([[{ id: 1 }, 'val']]))`  // Uses Map keys
 *
 * @example
 * ```typescript
 * // With Map containing object keys
 * const map = new Map();
 * map.set({ id: 1 }, 'value1');
 * map.set({ id: 2 }, 'value2');
 * allDeepKeysFunc(scope).call({ value: map }, [{ id: 1 }, { id: 2 }]);  // Passes - has both
 * allDeepKeysFunc(scope).call({ value: map }, [{ id: 1 }, { id: 3 }]);  // Fails - missing { id: 3 }
 *
 * // With Set containing object values
 * const set = new Set([{ id: 1 }, { id: 2 }]);
 * allDeepKeysFunc(scope).call({ value: set }, [{ id: 1 }, { id: 2 }]);  // Passes - has both
 * ```
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
                if (_deepEqual(valKey, expKey, false, context)) {
                    found = true;
                    return -1;
                }
            });

            if (!found) {
                missingKeys.push(expKey);
            }
        });

        context.set("theKeys", theKeys);
        context.set("missingKeys", missingKeys);
        context.set("valueKeys", valueKeys);

        context.eval(missingKeys.length === 0, "expected all deep keys: {theKeys}, missing: {missingKeys}, found: {valueKeys}");

        return scope.that;
    }

    return _keys;
}
