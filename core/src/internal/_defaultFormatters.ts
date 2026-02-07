/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { eFormatResult, IFormatCtx, IFormattedValue, IFormatter } from "../interface/IFormatter";
import { arrForEach, arrIndexOf, asString, dumpObj, isArray, isError, isFunction, isMapLike, isPlainObject, isPrimitive, isRegExp, isSetLike, isStrictNullOrUndefined, isString, isSymbol, iterForOf, objForEachKey, objGetOwnPropertySymbols, objGetPrototypeOf, strIndexOf } from "@nevware21/ts-utils";
import { EMPTY_STRING } from "../assert/internal/const";

/**
 * @internal
 * @ignore
 * Default formatter for array values
 */
const _defaultArrayFormatter: IFormatter = {
    name: "Array",
    value: (ctx: IFormatCtx, value: any) => {
        let result: IFormattedValue;
        if (isArray(value)) {
            let resultStr = "[";
            if (value && value.length > 0) {
                try {
                    arrForEach(value, (item, index) => {
                        resultStr += (index > 0 ? "," : EMPTY_STRING) + ctx.format(item);
                    });
                } catch (e) {
                    resultStr += "...";
                }
            }

            resultStr += "]";
            result = {
                res: eFormatResult.Ok,
                val: resultStr
            };
        }

        return result;
    }
};

/**
 * @internal
 * @ignore
 * Default formatter for string values
 */
const _defaultStringFormatter: IFormatter = {
    name: "String",
    value: (ctx: IFormatCtx, value: any) => {
        let result: IFormattedValue;
        if (isString(value)) {
            result = {
                res: eFormatResult.Ok,
                val: "\"" + value + "\""
            };
        }

        return result;
    }
};

/**
 * @internal
 * @ignore
 * Default formatter for RegExp values
 */
const _defaultRegExpFormatter: IFormatter = {
    name: "RegExp",
    value: (ctx: IFormatCtx, value: any) => {
        let result: IFormattedValue;
        if (isRegExp(value)) {
            result = {
                res: eFormatResult.Ok,
                val: value.toString()
            };
        }
        return result;
    }
};

/**
 * @internal
 * @ignore
 * Default formatter for Symbol values
 */
const _defaultSymbolFormatter: IFormatter = {
    name: "Symbol",
    value: (ctx: IFormatCtx, value: any) => {
        let result: IFormattedValue;
        if (isSymbol(value)) {
            result = {
                res: eFormatResult.Ok,
                val: "[" + value.toString() + "]"
            };
        }
        return result;
    }
};

/**
 * @internal
 * @ignore
 * Default formatter for plain object values
 */
const _defaultPlainObjectFormatter: IFormatter = {
    name: "PlainObject",
    value: (ctx: IFormatCtx, value: any) => {
        let result: IFormattedValue;
        if (isPlainObject(value)) {
            let theValue = "{";
            let idx = 0;
            arrForEach(_getObjKeys(value), (key) => {
                let formattedValue = ctx.format(value[key]);

                if (isSymbol(key)) {
                    theValue += (idx > 0 ? "," : EMPTY_STRING) + "[" + asString(key) + "]:" + formattedValue;
                } else {
                    theValue += (idx > 0 ? "," : EMPTY_STRING) + asString(key) + ":" + formattedValue;
                }

                idx++;
            });

            theValue += "}";

            result = {
                res: eFormatResult.Ok,
                val: theValue
            };
        }

        return result;
    }
};

/**
 * @internal
 * @ignore
 * Default formatter for Error instances
 */
const _defaultErrorFormatter: IFormatter = {
    name: "Error",
    value: (ctx: IFormatCtx, value: any) => {
        let result: IFormattedValue;
        if (isError(value) || (value && value instanceof Error)) {
            result = {
                res: eFormatResult.Ok,
                val: "[" + (value.name || "Error") + ":" + ctx.format(value.message) + "]"
            };
        }

        return result;
    }
};

/**
 * @internal
 * @ignore
 * Default formatter for Error types (constructors)
 */
const _defaultErrorTypeFormatter: IFormatter = {
    name: "ErrorType",
    value: (ctx: IFormatCtx, value: any) => {
        let result: IFormattedValue;
        if (_isErrorType(value)) {
            result = {
                res: eFormatResult.Ok,
                val: (value.name || "Error") + "()"
            };
        }

        return result;
    }
};

/**
 * @internal
 * @ignore
 * Default formatter for Function values
 */
const _defaultFunctionFormatter: IFormatter = {
    name: "Function",
    value: (ctx: IFormatCtx, value: any) => {
        let result: IFormattedValue;
        if (isFunction(value)) {
            let funcName = value.name || (value as any)["displayName"];
            result = {
                res: eFormatResult.Ok,
                val: "[Function" + (funcName ? ":" + funcName : EMPTY_STRING) + "]"
            };
        }

        return result;
    }
};

const _defaultSetFormatter: IFormatter = {
    name: "Set",
    value: (ctx: IFormatCtx, value: any) => {
        let result: IFormattedValue;
        if (value && isSetLike(value)) {
            let resultStr = "Set:{";
            let first = true;
            try {
                iterForOf(value, (item: any) => {
                    resultStr += (first ? EMPTY_STRING : ",") + ctx.format(item);
                    first = false;
                });
            } catch (e) {
                resultStr += "...";
            }

            resultStr += "}";

            result = {
                res: eFormatResult.Ok,
                val: resultStr
            };
        }

        return result;
    }
};

/**
 * @internal
 * @ignore
 * Default formatter for plain object values
 */
const _defaultMapFormatter: IFormatter = {
    name: "Map",
    value: (ctx: IFormatCtx, value: any) => {
        let result: IFormattedValue;
        if (isMapLike(value)) {
            let theValue = "Map:{";
            let idx = 0;
            iterForOf(value.keys(), (key: any) => {
                let formattedValue = ctx.format(value.get(key));

                if (isSymbol(key)) {
                    theValue += (idx > 0 ? "," : EMPTY_STRING) + "[" + asString(key) + "]:" + formattedValue;
                } else if (isString(key) && strIndexOf(key, " ") >= 0) {
                    theValue += (idx > 0 ? "," : EMPTY_STRING) + "\"" + key + "\":" + formattedValue;
                } else {
                    theValue += (idx > 0 ? "," : EMPTY_STRING) + asString(key) + ":" + formattedValue;
                }

                idx++;
            });

            theValue += "}";

            result = {
                res: eFormatResult.Ok,
                val: theValue
            };
        }

        return result;
    }
};


/**
 * @internal
 * @ignore
 * Default formatter for objects with constructor
 */
const _defaultConstructorFormatter: IFormatter = {
    name: "Constructor",
    value: (ctx: IFormatCtx, value: any) => {
        let result: IFormattedValue;

        try {
            if (value && ("constructor" in value && value.constructor && value.constructor.name)) {
                result = {
                    res: eFormatResult.Ok,
                    val: "[" + value.constructor.name + ":" + (JSON.stringify(value) || EMPTY_STRING).replace(/"(\w+)"\s*:\s{0,1}/g, "$1:") + "]"
                };
            }
        } catch (e) {
            // Ignore any errors that occur during formatting
        }

        if (!result) {
            try {
                if (value && ("name" in value && value.constructor && value.constructor.name)) {
                    result = {
                        res: eFormatResult.Ok,
                        val: "[" + value.name + ":" + (JSON.stringify(value) || EMPTY_STRING).replace(/"(\w+)"\s*:\s{0,1}/g, "$1:") + "]"
                    };
                }
            } catch (e) {
                // ignore
            }
        }

        return result;
    }
};

/**
 * @internal
 * @ignore
 * Default formatter for objects with toString method
 */
const _defaultToStringFormatter: IFormatter = {
    name: "ToString",
    value: (ctx: IFormatCtx, value: any) => {
        let result: IFormattedValue;
        if (value && isFunction(value.toString)) {
            result = {
                res: eFormatResult.Ok,
                val: value.toString()
            };
        }

        return result;
    }
};

/**
 * @internal
 * @ignore
 * Fallback formatter for any remaining values
 */
const _defaultFallbackFormatter: IFormatter = {
    name: "Fallback",
    value: (ctx: IFormatCtx, value: any) => {
        let actualValue = value;

        if (!isPrimitive(actualValue)) {
            actualValue = dumpObj(actualValue);
        }

        return {
            res: eFormatResult.Ok,
            val: asString(actualValue)
        };
    }
};

/**
 * @internal
 * @ignore
 * Default formatters in order of precedence
 */
export const _defaultFormatters: IFormatter[] = [
    _defaultArrayFormatter,
    _defaultStringFormatter,
    _defaultRegExpFormatter,
    _defaultSymbolFormatter,
    _defaultPlainObjectFormatter,
    _defaultErrorFormatter,
    _defaultErrorTypeFormatter,
    _defaultFunctionFormatter,
    _defaultSetFormatter,
    _defaultMapFormatter,
    _defaultConstructorFormatter,
    _defaultToStringFormatter,
    _defaultFallbackFormatter
];


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
