/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2025 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import {
    arrForEach, arrIndexOf, asString, dumpObj, isArray, isError, isFunction, isPlainObject, isPrimitive,
    isRegExp, isStrictNullOrUndefined, isString, isSymbol, objDefine, objForEachKey, objGetOwnPropertySymbols, objGetPrototypeOf
} from "@nevware21/ts-utils";
import { EMPTY_STRING } from "./const";
import { eFormatResult, IFormatCtx, IFormattedValue, IFormatter } from "../interface/IFormatter";
import { IScopeContext } from "../interface/IScopeContext";
import { escapeAnsi, yellow } from "@nevware21/chromacon";

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
const _defaultFormatters: IFormatter[] = [
    _defaultArrayFormatter,
    _defaultStringFormatter,
    _defaultRegExpFormatter,
    _defaultSymbolFormatter,
    _defaultPlainObjectFormatter,
    _defaultErrorFormatter,
    _defaultErrorTypeFormatter,
    _defaultFunctionFormatter,
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

function _processFormatters(formatters: IFormatter[], formatCtx: IFormatCtx, value: any): IFormattedValue {
    let formattedValue: IFormattedValue;

    if (formatters) {
        let idx = 0;
        while(idx < formatters.length) {
            let formatter = formatters[idx];
            if (formatter) {
                try {
                    let fn = formatter.value;
                    if (isFunction(fn)) {
                        let formatted = fn(formatCtx, value);
                        if (formatted && (formatted.res === eFormatResult.Ok || formatted.res === eFormatResult.Continue)) {
                            formattedValue = formatted;
                            if (formatted.res === eFormatResult.Ok) {
                                break;
                            }
                        }
                    }
                } catch (e) {
                    formattedValue = {
                        res: eFormatResult.Failed,
                        err: e,
                        val: asString(value)
                    };
                }
            }
            
            idx++;
        }
    }

    return formattedValue;
}

/**
 * Perform the default formatting of a value using the provided format context.
 * @param formatCtx The format context to use for formatting the value.
 * @param value The value to format.
 * @returns A string representation of the value.
 */
function _doFormat(formatCtx: IFormatCtx, value: any): string {
    let result: string;

    let formatOpts = formatCtx.ctx.opts.format;
    try {
        let formattedValue: IFormattedValue = _processFormatters(formatOpts.formatters || [], formatCtx, value);
        if (!formattedValue || formattedValue.res !== eFormatResult.Ok) {
            // Iterate through the default formatters to find one that can format the value
            formattedValue = _processFormatters(_defaultFormatters, formatCtx, value);
        }

        if (formattedValue) {
            if (formattedValue.res === eFormatResult.Ok || formattedValue.res === eFormatResult.Continue) {
                result = formattedValue.val;
            } else if (formattedValue.res === eFormatResult.Failed) {
                result = dumpObj(formattedValue.err);
            } else {
                result = asString(value);
            }
        } else {
            result = asString(value);
        }
    } catch (e) {
        result = yellow("(" + _doFormat(formatCtx, e) + ")");
    }

    return result;
}

/**
 * @internal
 * @ignore
 * Creates a format context bound to the supplied scope context.
 * The returned context handles circular references while formatting values.
 * @param ctx - The scope context used to resolve formatting options.
 * @returns A format context that can be passed to `_doFormat` or used via its `format` method.
 */
function _createFormatCtx(ctx: IScopeContext): IFormatCtx {
    let visited: any[] = [];

    let formatCtx: IFormatCtx = {
        ctx: ctx,
        format: (value: any): string => {
            let isVisited = _isVisited(value, visited);
            if (isVisited) {
                // Circular reference detected
                return ctx.opts.circularMsg ? ctx.opts.circularMsg() : EMPTY_STRING;
            }

            visited.push(value);

            let formattedValue: string;
            try {
                formattedValue = _doFormat(formatCtx, value);
            } finally {
                visited.pop();
            }

            return formattedValue;
        }
    };

    return objDefine(formatCtx, "ctx", { v: ctx, w: false });
}

/**
 * @internal
 * @ignore
 * Internal helper to format a value for display in an error messages.
 * @param ctx - Format context containing the formatters to use.
 * @param value - The value to format.
 * @returns - A string representation of the value.
 */
export function _formatValue(ctx: IScopeContext, value: any): string {
    let formatCtx = _createFormatCtx(ctx);
    let formatOpts = formatCtx.ctx.opts.format;
    let result = _doFormat(formatCtx, value);
    
    if (formatOpts && formatOpts.finalize) {
        if (isFunction(formatOpts.finalizeFn)) {
            result = formatOpts.finalizeFn(result);
        } else {
            result = escapeAnsi(result);
        }
    }

    return result;
}
