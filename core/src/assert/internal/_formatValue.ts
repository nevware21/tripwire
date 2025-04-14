/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import {
    arrForEach, arrIndexOf, asString, dumpObj, isArray, isError, isFunction, isPlainObject, isPrimitive,
    isRegExp, isStrictNullOrUndefined, isString, isSymbol, objForEachKey, objGetOwnPropertySymbols, objGetPrototypeOf
} from "@nevware21/ts-utils";
import { EMPTY_STRING } from "./const";

function _getObjKeys<T>(target: T): (keyof T)[] {
    let keys: any[] = [];
    let currentObj = target;

    while (!isStrictNullOrUndefined(currentObj)) {
        
        objForEachKey(currentObj, (key: any) => {
            if (arrIndexOf(keys, key) === -1) {
                keys.push(key);
            }
        });

        let symbols = objGetOwnPropertySymbols(currentObj);
        arrForEach(symbols, (symbol) => {
            if (arrIndexOf(keys, symbol) === -1) {
                keys.push(symbol);
            }
        });
        
        let newObj = objGetPrototypeOf(currentObj);
        if (newObj === currentObj) {
            break;
        }
        currentObj = newObj;
    }

    return keys;
}

function _isErrorType(value: any): boolean {
    let currentObj = value;

    while (!isStrictNullOrUndefined(currentObj)) {
        if (isError(currentObj) ||
                (currentObj && currentObj instanceof Error) ||
                (currentObj && currentObj.prototype && (currentObj.prototype == Error.prototype || currentObj.prototype.name == "Error")) ||
                (currentObj && currentObj.constructor && currentObj.constructor.name === "Error")) {
            return true;
        }

        let newObj = objGetPrototypeOf(currentObj);
        if (newObj === currentObj) {
            break;
        }
        currentObj = newObj;
    }

    return false;
}

function _isVisited(value: any, visited: any[]): boolean {
    if (isPrimitive(value)) {
        return false;
    }

    for (let idx = 0; idx < visited.length; idx++) {
        if (visited[idx] === value) {
            return true;
        }
    }

    return false;
}

/**
 * @internal
 * @ignore
 * Internal helper to format a value for display in an error messages.
 * @param value - The value to format.
 * @returns - A string representation of the value.
 */
export function _formatValue(value: any, visited?: any[]): string {

    if (!visited) {
        visited = [];
    }

    if (isArray(value)) {
        let result = "[";
        if (value && value.length > 0) {
            try {
                arrForEach(value, (item, index) => {
                    let formattedValue = "(c)";
                    if (!_isVisited(item, visited)) {
                        visited.push(item);
                        formattedValue = _formatValue(item, visited);
                        visited.pop();
                    }

                    result += (index > 0 ? "," : EMPTY_STRING) + formattedValue;
                });
            } catch (e) {
                result += "...";
            }
        }

        result += "]";
        return result;
    }
    
    if (isString(value)) {
        return "\"" + value + "\"";
    }
    
    if (isRegExp(value)) {
        return value.toString();
    }
    
    if (isSymbol(value)) {
        return "[" + value.toString() + "]";
    }

    if (isPlainObject(value)) {
        let theValue = "{";
        let idx = 0;
        arrForEach(_getObjKeys(value), (key) => {
            let formattedValue = "(c)";
            let propValue = value[key];
            if (!_isVisited(propValue, visited)) {
                visited.push(propValue);
                formattedValue = _formatValue(propValue, visited);
                visited.pop();
            }

            if (isSymbol(key)) {
                theValue += (idx > 0 ? "," : EMPTY_STRING) + "[" + asString(key) + "]:" + formattedValue;
            } else {
                theValue += (idx > 0 ? "," : EMPTY_STRING) + asString(key) + ":" + formattedValue;
            }

            idx++;
        });
        theValue += "}";

        return theValue;
    }
    
    if (isError(value) || (value && value instanceof Error)) {
        return "[" + (value.name || "Error") + ":\"" + value.message + "\"]";
    }

    if (_isErrorType(value)) {
        return (value.name || "Error") + "()";
    }
    
    if (isFunction(value)) {
        let funcName = value.name || (value as any)["displayName"];
        return "[Function" + (funcName ? ":" + funcName : EMPTY_STRING) + "]";
    }

    try {
        if (value && ("constructor" in value && value.constructor && value.constructor.name)) {
            return "[" + value.constructor.name + ":" + (JSON.stringify(value) || "").replace(/"(\w+)"\s*:\s{0,1}/g, "$1:") + "]";
        }
    } catch (e) {
        // ignore
    }
        
    try {
        if (value && ("name" in value && value.constructor && value.constructor.name)) {
            return "[" + value.name + ":" + (JSON.stringify(value) || "").replace(/"(\w+)"\s*:\s{0,1}/g, "$1:") + "]";
        }
    } catch (e) {
        // ignore
    }

    if (value && isFunction(value.toString)) {
        return value.toString();
    }

    if (!isPrimitive(value)) {
        value = dumpObj(value);
    }

    return asString(value);
}