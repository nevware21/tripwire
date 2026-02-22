/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { eFormatResult, IFormatCtx, IFormattedValue, IFormatter } from "../interface/IFormatter";
import {
    arrForEach, asString, dumpObj, isArray, isDate, isError, isFunction, isMapLike, isPlainObject,
    isPrimitive, isRegExp, isSetLike, isStrictNullOrUndefined, isString, isSymbol, iterForOf,
    objCreate, objForEachKey, objGetOwnPropertySymbols, objGetPrototypeOf, strIndexOf
} from "@nevware21/ts-utils";
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
            if (value && value.length > 0) {
                let maxProps = ctx.cfg.format.maxProps;
                let parts: string[] = [];
                try {
                    arrForEach(value, (item, index) => {
                        if (index >= maxProps) {
                            parts.push("...");
                            return -1;  // Break from arrForEach
                        }
                        parts.push(ctx.format(item));
                    });
                } catch (e) {
                    parts.push("...");
                }
                result = {
                    res: eFormatResult.Ok,
                    val: "[" + parts.join(",") + "]"
                };
            } else {
                result = {
                    res: eFormatResult.Ok,
                    val: "[]"
                };
            }
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
            let parts: string[] = [];
            let idx = 0;
            let maxProps = ctx.cfg.format.maxProps;

            arrForEach(_getObjKeys(value, ctx.cfg.format.maxProtoDepth), (key) => {
                if (idx >= maxProps) {
                    parts.push("...");
                    return -1;  // Break from arrForEach
                }

                let formattedValue = ctx.format(value[key]);

                if (isSymbol(key)) {
                    parts.push("[" + asString(key) + "]:" + formattedValue);
                } else {
                    parts.push(asString(key) + ":" + formattedValue);
                }

                idx++;
            });

            result = {
                res: eFormatResult.Ok,
                val: "{" + parts.join(",") + "}"
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
            let parts: string[] = [];
            let idx = 0;
            let maxProps = ctx.cfg.format.maxProps;
            try {
                iterForOf(value, (item: any) => {
                    if (idx >= maxProps) {
                        parts.push("...");
                        return -1;  // Break from iterForOf
                    }
                    parts.push(ctx.format(item));
                    idx++;
                });
            } catch (e) {
                parts.push("...");
            }

            result = {
                res: eFormatResult.Ok,
                val: "Set:{" + parts.join(",") + "}"
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
            let parts: string[] = [];
            let idx = 0;
            let maxProps = ctx.cfg.format.maxProps;
            iterForOf(value.keys(), (key: any) => {
                if (idx >= maxProps) {
                    parts.push("...");
                    return -1;  // Break from iterForOf
                }

                let formattedValue = ctx.format(value.get(key));

                if (isSymbol(key)) {
                    parts.push("[" + asString(key) + "]:" + formattedValue);
                } else if (isString(key) && strIndexOf(key, " ") >= 0) {
                    parts.push("\"" + key + "\":" + formattedValue);
                } else {
                    parts.push(asString(key) + ":" + formattedValue);
                }

                idx++;
            });

            result = {
                res: eFormatResult.Ok,
                val: "Map:{" + parts.join(",") + "}"
            };
        }

        return result;
    }
};


/**
 * @internal
 * @ignore
 * Helper function to attempt toString formatting
 * Returns the toString result if valid, null otherwise
 */
function _tryToString(value: any): string | null {
    if (value && isFunction(value.toString)) {
        try {
            let str = value.toString();
            // Avoid default Object.prototype.toString like "[object Object]"
            if (str && str !== "[object Object]" && strIndexOf(str, "[object ") !== 0) {
                return str;
            }
        } catch (e) {
            // Ignore errors
        }
    }
    return null;
}

/**
 * @internal
 * @ignore
 * Default formatter for Date objects
 */
const _defaultDateFormatter: IFormatter = {
    name: "Date",
    value: (ctx: IFormatCtx, value: any) => {
        let result: IFormattedValue;
        if (isDate(value)) {
            // Use toJSON() for standard ISO format
            let dateStr = value.toJSON ? value.toJSON() : value.toISOString();
            result = {
                res: eFormatResult.Ok,
                val: "[Date:\"" + dateStr + "\"]"
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
                // Build simple representation without expensive JSON.stringify
                let parts: string[] = [];
                let propCount = 0;
                let maxProps = ctx.cfg.format.maxProps;

                for (let key in value) {
                    if (propCount >= maxProps) {
                        parts.push("...");
                        break;
                    }
                    parts.push(key + ":" + ctx.format(value[key]));
                    propCount++;
                }

                // If no enumerable properties found, try toString before showing empty object
                if (propCount === 0) {
                    let toStringResult = _tryToString(value);
                    if (toStringResult) {
                        let prefix = value.constructor.name === "Object" ? EMPTY_STRING : value.constructor.name + ":";
                        result = {
                            res: eFormatResult.Ok,
                            val: "[" + prefix + toStringResult + "]"
                        };
                    }
                }

                if (!result) {
                    let prefix = value.constructor.name === "Object" ? EMPTY_STRING : value.constructor.name + ":";
                    result = {
                        res: eFormatResult.Ok,
                        val: "[" + prefix + "{" + parts.join(",") + "}]"
                    };
                }
            }
        } catch (e) {
            // Ignore any errors that occur during formatting
        }

        if (!result) {
            try {
                if (value && ("name" in value && value.constructor && value.constructor.name)) {
                    // Try toString first, then simple fallback
                    let toStringResult = _tryToString(value);
                    result = {
                        res: eFormatResult.Ok,
                        val: "[" + value.name + (toStringResult ? ":" + toStringResult : EMPTY_STRING) + "]"
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
            // Try toString first before falling back to dumpObj
            let toStringResult = _tryToString(actualValue);
            if (toStringResult) {
                actualValue = toStringResult;
            } else {
                actualValue = dumpObj(actualValue);
            }
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
 * Ordered by probability - most common types first for better performance
 * Note: More specific formatters (like ErrorType) must come before more general ones (like Function)
 */
export const _defaultFormatters: IFormatter[] = [
    _defaultStringFormatter,       // Most common in assertions
    _defaultPlainObjectFormatter,  // Very common
    _defaultArrayFormatter,        // Common
    _defaultErrorFormatter,        // Common in test failures
    _defaultErrorTypeFormatter,    // Must come before FunctionFormatter (more specific)
    _defaultFunctionFormatter,     // Common
    _defaultDateFormatter,         // Moderately common
    _defaultSetFormatter,          // Less common
    _defaultMapFormatter,          // Less common
    _defaultRegExpFormatter,       // Rare
    _defaultSymbolFormatter,       // Rare
    _defaultConstructorFormatter,  // Fallback
    _defaultToStringFormatter,     // Fallback
    _defaultFallbackFormatter      // Last resort
];


function _getObjKeys<T>(target: T, maxDepth: number): (keyof T)[] {
    let keys: any[] = [];
    let seenKeys: any = objCreate(null);  // Hash map for O(1) lookups, no prototype to avoid collisions
    let seenSymbols: any[] = [];  // Symbols can't be object keys, keep array
    let currentObj = target;
    let depth = 0;

    // Limit depth - most relevant properties are within 2 levels
    while (!isStrictNullOrUndefined(currentObj) &&
           (!maxDepth || depth < maxDepth)) {

        objForEachKey(currentObj, (key: any) => {
            if (!seenKeys[key]) {  // O(1) lookup - much faster than arrIndexOf
                seenKeys[key] = true;
                keys.push(key);
            }
        });

        let symbols = objGetOwnPropertySymbols(currentObj);
        arrForEach(symbols, (symbol) => {
            // Symbols need linear search, but typically very few symbols
            let found = false;
            for (let i = 0; i < seenSymbols.length; i++) {
                if (seenSymbols[i] === symbol) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                seenSymbols.push(symbol);
                keys.push(symbol);
            }
        });

        let newObj = objGetPrototypeOf(currentObj);
        if (newObj === currentObj) {
            break;
        }
        currentObj = newObj;
        depth++;
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
