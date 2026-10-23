/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import {
    arrMap, asString, getLazy, getWritableDeferred, ILazyValue, isArray, isObject, newSymbol, objDefine, objForEachKey,
    objHasOwnProperty, objIs, objKeys, strStartsWith, strTrim
} from "@nevware21/ts-utils";
import { captureStack } from "../internal/captureStack";
import { _formatValue } from "./_formatValue";
import { _getGlobalScopeContext } from "../assert/useScope";
import { IConfigInst } from "../interfaces/IConfigInst";
import { EMPTY_STRING } from "./const";
import { IParsedStack } from "./parseStack";
import { IAssertionErrorOrgValues } from "../assert/interface/IAssertionErrorOrgValues";

export const cStackDetail = newSymbol("@nevware21/tripwire#_$stackDetail");

function _formatLines(value: string, indent: string): string {
    let lines = strTrim(value).split("\n");
    let fmt = arrMap(lines, (line) => indent + line).join("\n");

    while (strStartsWith(fmt, "\n") || strStartsWith(fmt, "\r")) {
        fmt = fmt.substring(1);
    }

    return fmt;
}

/**
 * @internal
 * @ignore
 * Formats the properties of the error for display.
 *
 * @param props - The properties to format.
 * @param ctx - The format context to use for formatting values, or null if not available.
 * @returns A formatted string representation of the properties.
 */
function _formatProps(opts: IConfigInst | null, props: any): string {
    if (props && opts) {
        let formatted = " ::: ";

        if (props.operation || isArray(props.opPath)) {
            let thePath = EMPTY_STRING;
            let lastOp = props.operation || EMPTY_STRING;
            if (lastOp) {
                if (isArray(props.opPath)) {
                    if (props.opPath.length > 0 && props.opPath[props.opPath.length - 1] == lastOp) {
                        thePath = props.opPath.join("->");
                    } else {
                        thePath = props.opPath.join("->") + "->" + lastOp;
                    }
                } else {
                    thePath = _formatValue(opts, props.opPath) + "->" + lastOp;
                }
            } else {
                thePath = _formatValue(opts, props.opPath);
            }

            let parts: string[] = [formatted, "running \"", thePath, "\""];
            if (props.actual) {
                parts.push(" with (", _formatValue(opts, props.actual), ")");
            }
            let leftOver: any = {};
            objForEachKey(props, (key, value) => {
                if (key != "operation" && key != "opPath" && key != "actual") {
                    leftOver[key] = value;
                }
            });
            if (objKeys(leftOver).length > 0) {
                try {
                    parts.push(" and props: ", JSON.stringify(leftOver));
                } catch (e) {
                    // Ignore any errors that occur when trying to stringify the properties
                }
            }
            formatted = parts.join("");
        } else {
            try {
                formatted += JSON.stringify(props);
            } catch (e) {
                // Ignore any errors that occur when trying to stringify the properties
            }
        }

        return formatted;
    }

    return EMPTY_STRING;
}

/**
 * Locate the position within {@link haystack} at which the entirety of {@link needle} matches
 * contiguously. Because stack lines (e.g. recursive calls) may repeat, a plain `indexOf()` of
 * just the first line can land on the wrong occurrence -- this keeps searching subsequent
 * occurrences of the first line until one is found where the whole sequence lines up (or none do).
 * @param needle - The (shorter) set of stack lines to locate
 * @param haystack - The (longer) set of stack lines to search within
 * @returns The index within haystack at which needle fully matches, or -1 if no such position exists
 */
function _findStackSubsetPos(needle: string[], haystack: string[]): number {
    let searchFrom = 0;
    while (searchFrom < haystack.length) {
        let pos = haystack.indexOf(needle[0], searchFrom);
        if (pos === -1) {
            return -1;
        }

        // Only compare as many lines as are actually available in the haystack from pos
        let matchLen = Math.min(needle.length, haystack.length - pos);
        let isMatch = true;
        for (let lp = 1; isMatch && lp < matchLen; lp++) {
            isMatch = haystack[pos + lp] === needle[lp];
        }

        if (isMatch) {
            return pos;
        }

        searchFrom = pos + 1;
    }

    return -1;
}

function _pruneStack(stackDetail: IParsedStack, newStack: IParsedStack, funcName: string): IParsedStack {
    if (newStack) {
        if (stackDetail.lines.length > 0) {
            let pos = _findStackSubsetPos(stackDetail.lines, newStack.lines);
            if (pos === 0) {
                // Both first lines are the same so lets pick the longest stack
                if (newStack.lines.length > stackDetail.lines.length) {
                    return newStack;
                }
                return stackDetail;
            }

            if (pos != -1) {
                /*
                 * The current stack fully matches a contiguous run within the new stack
                 * Therefore we can use the current stack as its a subset of the new stack
                 */
                return stackDetail;
            }
        }

        if (newStack.lines.length > 0 && _findStackSubsetPos(newStack.lines, stackDetail.lines) != -1) {
            /*
             * The new stack fully matches a contiguous run within the current stack
             * Therefore we can use the new stack as its a subset of the current stack
             */
            return newStack;
        }

        // Each stack doesn't contain the other, so we need to compare the sizes
        if (newStack.lines.length > 0 && newStack.lines.length < stackDetail.lines.length) {
            // The new stack is smaller than the current stack
            return newStack;
        }
    }

    return stackDetail;
}

export function _setStackDetail(theError: Error, stackDetail: ILazyValue<IParsedStack>) {
    objDefine(theError as any, cStackDetail, {
        l: stackDetail
    });
}

function _setStack(theError: Error, getStack: () =>string) {
    try {
        objDefine(theError, "stack", {
            l: getWritableDeferred(() => {
                let stack = getStack();
                let theStack = stack;

                /*
                 * If we have an inner exception, then we need to add the inner exception stack
                 * and message to the existing error
                 */
                if ((theError as any).innerException) {
                    let innerEx:Error = (theError as any).innerException as Error;

                    theStack = stack;
                    if (innerEx.stack) {
                        theStack = [stack, "\n\nInner Exception:\n", _formatLines(innerEx.stack, "    ")].join("");
                    }
                }

                return theStack;
            })
        });
    } catch (e) {
        // Ok failed to set the stack, so lets just ignore it
    }
}

export function _setMessage(theError: Error, getMessage: () => string) {
    // Only an error raised while an assertion scope is active describes its props (the operation path, the
    // actual value and the remaining details), using that scope's formatting options; an error constructed
    // outside of any scope keeps its plain message. The scope is resolved now, at construction, because the
    // message itself is built lazily -- by the time a caller first reads it the scope has usually unwound.
    let scope = _getGlobalScopeContext();
    let scopeOpts: IConfigInst | null = scope ? scope.opts : null;

    try {
        objDefine(theError, "message", {
            l: getWritableDeferred(() => {
                let theMessage = getMessage() || EMPTY_STRING;

                let props = (theError as any).props;
                if (props) {
                    theMessage = [theMessage, _formatProps(scopeOpts, props)].join("");
                }

                /*
                 * If we have an inner exception, then we need to add the inner exception stack
                 * and message to the existing error
                 */
                if ((theError as any).innerException) {
                    let innerEx:Error = (theError as any).innerException as Error;

                    if (innerEx.message) {
                        theMessage = [theMessage, "\n\nCaused by: ", innerEx.message].join("");
                    }
                }

                return theMessage;
            })
        });
    } catch (e) {
        // Ok failed to set the stack, so lets just ignore it
    }
}

export function _captureStackTrace(theError: Error, orgStackDetail: IParsedStack, stackStart?: Function | Function[]) {
    // Capture once from the outermost boundary this module itself knows about --
    // theError.constructor (the actual `new XxxError(...)` class function the caller invoked).
    // Excluding frames at-and-below that boundary trims away every one of this module's own
    // *construction-machinery* frames (createCustomError's wrapper, the per-error-type
    // _createXxx callback, and this function itself) in a single native capture. Those frames
    // used to also each be captured and compared separately by pushing themselves onto
    // `stackStart` (see eg. tripwireError.ts's old `stackStart.push(_createTripwireError)`) --
    // strictly redundant, since a stack trimmed to an outer boundary can only ever be an
    // equal-or-shorter (equal-or-better) result than one trimmed to a function that boundary
    // itself calls, so those extra captures could never win the `_pruneStack` comparison below,
    // only pay for it. That redundant self-registration has been removed at each call site.
    let newStack = captureStack(theError.constructor);
    let stackDetail = _pruneStack(orgStackDetail, newStack, theError.constructor.name);

    // `stackStart`, once past the construction-machinery frames stripped above, carries a
    // genuinely different kind of information: the *caller's own* execution chain leading up
    // to this error (eg. the assertion/expression pipeline's `context._$stackFn` -- `_exec`,
    // `_exprFn`, `_notFn`, `_failFn`, etc. -- each pushed by a different layer as it runs, or a
    // wrapper library's own helper). Those frames sit *outside* theError.constructor's own
    // call, so they aren't redundant with the capture above, and unlike this module's own
    // (single, stable, always-present) construction frames, which of these actually matches the
    // live stack can genuinely vary by code path -- so this still tries each candidate and
    // keeps whichever produces the shortest/cleanest result, same as before.
    let stackCandidates = stackStart ? (isArray(stackStart) ? stackStart : [stackStart]) : [];
    for (let stackIdx = 0; stackIdx < stackCandidates.length; stackIdx++) {
        let stackFn = stackCandidates[stackIdx];
        try {
            let funcName = asString(stackFn.name) || (stackFn as any)["displayName"] || "anonymous";
            stackDetail = _pruneStack(stackDetail, captureStack(stackFn), funcName);
        } catch (e) {
            // Some environments do not support `captureStackTrace` so we just ignore it
            break;
        }
    }

    if (stackDetail !== orgStackDetail) {
        // Ensure that we have the original message and trailing message
        stackDetail.name = orgStackDetail.name;
        stackDetail.message = orgStackDetail.message;
        stackDetail.trailMessage = orgStackDetail.trailMessage;
    }

    _setStackDetail(theError, getLazy(() => stackDetail));
    _setStack(theError, () => stackDetail.formatStack());

    return stackDetail;
}

function _setOrgValue(target: any, prop: any, value: any) {
    let orgValues: IAssertionErrorOrgValues = target.orgValues;
    if (!orgValues || !isObject(orgValues)) {
        orgValues = {};
        objDefine(target, "orgValues", {
            g: () => orgValues,
            s: (newOrgValues: IAssertionErrorOrgValues) => {
                // Ignore any attempts to set the orgValues directly -- avoids assertion error when trying to replace
            }
        });
    }

    if (!objHasOwnProperty(orgValues, prop)) {
        objDefine(orgValues, prop, {
            g: () => value,
            s: (newValue: any) => {
                // Ignore any attempts to set the orgValues properties directly -- avoids assertion error when trying to replace
            }
        });
    }
}

export function _setPropValue(target: any, prop: any, altProp?: any) {
    try {
        if (target.props && ((prop in target.props) || (altProp && (altProp in target.props)))) {
            let value = (altProp && altProp in target.props) ? target.props[altProp] : target.props[prop];
            let orgSet = false;

            objDefine(target, prop, {
                g: () => {
                    return value;
                },
                s: (newValue: any) => {
                    /*
                     * Support older frameworks (like mocha) that may replace the actual/expected/operator/showDiff properties directly
                     * on the error object.
                     */
                    if (!objIs(value, newValue)) {
                        if (!orgSet) {
                            // Store the original values before we change them for backward compatibility reasons
                            _setOrgValue(target, prop, value);
                            orgSet = true;
                        }

                        value = newValue;
                    }
                }
            });
        }
    } catch (e) {
        // Ignore any errors that occur when trying to define the property
    }
}

