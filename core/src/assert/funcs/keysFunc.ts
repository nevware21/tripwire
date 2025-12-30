/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { arrForEach, arrSlice, asString, isArray, isObject, isStrictNullOrUndefined, isString, objGetOwnPropertyDescriptor, objGetOwnPropertySymbols, objKeys } from "@nevware21/ts-utils";
import { IAssertScope } from "../interface/IAssertScope";
import { KeysFn } from "../interface/funcs/KeysFn";
import { EMPTY_STRING } from "../internal/const";

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

function _formatKeys(keys: string[]): string {
    let formattedKeys: string = EMPTY_STRING;
    arrForEach(keys, (key) => {
        if (formattedKeys.length > 0) {
            formattedKeys += ",";
        }
        if (key || isStrictNullOrUndefined(key)) {
            formattedKeys += asString(key);
        } else if (!isString(key)) {
            formattedKeys += asString(key);
        } else {
            // special case for empty string keys
            formattedKeys += "\"\"";
        }
    });

    return formattedKeys;
}

function _getValueKeys(scope: IAssertScope, value: any): string[] {
    let theKeys: string[] = [];
    if (!isStrictNullOrUndefined(value)) {
        theKeys = _objKeys(value);
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

export function anyKeysFunc<R>(_scope: IAssertScope): KeysFn<R> {

    function _keys(this: IAssertScope, _argKeys: Array<string|number|symbol> | Object | readonly any[]): R {
        let scope = this;
        let context = scope.context;
        let args = arrSlice(arguments);
        let expectedKeys = _getArgKeys(scope, args);
        let valueKeys = _getValueKeys(scope, context.value);

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
        let valueKeys = _getValueKeys(scope, context.value);

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

