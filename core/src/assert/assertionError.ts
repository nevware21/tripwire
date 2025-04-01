/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { arrMap, arrSlice, asString, createCustomError, CustomErrorConstructor, getLazy, isArray, isError, newSymbol, objDefine, objDefineProps, objForEachKey, objKeys, strTrim } from "@nevware21/ts-utils"
import { EMPTY_STRING } from "./internal/const";
import { _formatValue } from "./internal/_formatValue";
import { IParsedStack, parseStack } from "../internal/parseStack";
import { captureStack } from "../internal/captureStack";

const cStackDetail = newSymbol("@nevware21/tripwire#_$stackDetail");

function _formatLines(value: string, indent: string): string {
    let lines = strTrim(value).split("\n");
    let fmt = arrMap(lines, (line) => indent + line).join("\n");

    while (fmt.startsWith("\n") || fmt.startsWith("\r")) {
        fmt = fmt.substring(1);
    }

    return fmt;
}

/**
 * @ignore
 * An error that is thrown when an error occurs within the module and is also
 * used as the base class for all {@link AssertionFailure} errors thrown by the module.
 * @template T - The type of the additional properties.
 */
export interface AssertionError<T> extends Error {
    /**
     * Additional properties that are included in the error.
     */
    readonly props?: T;
}

/**
 * @ignore
 * The constructor for an `AssertionError`.
 * @template T - The type of the additional properties.
 */
export interface AssertionErrorConstructor<T> extends CustomErrorConstructor<AssertionError<T>> {

    /**
     * Creates a new `AssertionError` with the given message and properties.
     *
     * @param message - The message for the error.
     * @param props - The additional properties for the error.
     * @param stackStart - An array of possible functions to use as the starting point for the stack trace.
     * @returns The new `AssertionError`.
     * @template T - The type of the additional properties.
     */
    new <T>(message?: string, props?: T, stackStart?: Function | Function[]): AssertionError<T>;

    /**
     * Creates a new `AssertionError` with the given message and properties.
     *
     * @param message - The message for the error.
     * @param innerEx - The error that caused this error to be thrown.
     * @param props - The additional properties for the error.
     * @param stackStart - An array of possible functions to use as the starting point for the stack trace.
     * @returns The new `AssertionError`.
     * @template T - The type of the additional properties.
     */
    new <T>(message?: string, innerEx?: Error, props?: T, stackStart?: Function | Function[]): AssertionError<T>;

    /**
     * Creates a new `AssertionError` with the given message and properties.
     *
     * @param message - The message for the error.
     * @param props - The additional properties for the error.
     * @param stackStart - An array of possible functions to use as the starting point for the stack trace.
     * @returns The new `AssertionError`.
     * @template T - The type of the additional properties.
     */
    <T>(message?: string, props?: T, stackStart?: Function | Function[]): AssertionError<T>;

    /**
     * Creates a new `AssertionError` with the given message and properties.
     *
     * @param message - The message for the error.
     * @param innerEx - The error that caused this error to be thrown.
     * @param props - The additional properties for the error.
     * @param stackStart - An array of possible functions to use as the starting point for the stack trace.
     * @returns The new `AssertionError`.
     * @template T - The type of the additional properties.
     */
    <T>(message?: string, innerEx?: Error, props?: T, stackStart?: Function | Function[]): AssertionError<T>;

    /**
     * Gets the full stack trace of the error, this will show all of the internal calls
     * that lead to the error being thrown. Useful for debugging as generally the stack
     * trace will only show the location where the error was thrown.
     *
     * @returns The full stack trace as a string.
     */
    get fullStack(): string;

    /**
     * The error that caused this error to be thrown.
     */
    get innerException(): Error | null;

    /**
     * Converts the error to a JSON object.
     *
     * @param stack - Whether to include the stack trace in the JSON object.
     * @returns A JSON representation of the error.
     */
    toJSON(stack?: boolean): any;
}

/**
 * @internal
 * @ignore
 * Formats the properties of the error for display.
 *
 * @param props - The properties to format.
 * @returns A formatted string representation of the properties.
 */
function _formatProps(props: any): string {
    if (props) {
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
                    thePath = _formatValue(props.opPath) + "->" + lastOp;
                }
            } else {
                thePath = _formatValue(props.opPath);
            }

            formatted += "running \"" + thePath + "\"";
            if (props.actual) {
                formatted += " with (" + _formatValue(props.actual) + ")";
            }
            let leftOver: any = {};
            objForEachKey(props, (key, value) => {
                if (key != "operation" && key != "opPath" && key != "actual") {
                    leftOver[key] = value;
                }
            });
            if (objKeys(leftOver).length > 0) {
                try {
                    formatted += " and props: " + JSON.stringify(leftOver);
                } catch (e) {
                    // Ignore any errors that occur when trying to stringify the properties
                }
            }
        } else {
            try {
                formatted += JSON.stringify(props);
            } catch (e) {
                // Ignore any errors that occur when trying to stringify the properties
            }
        }

        return formatted
    }

    return EMPTY_STRING;
}

function _pruneStack(stackDetail: IParsedStack, newStack: IParsedStack, funcName: string): IParsedStack {
    if (newStack) {
        if (stackDetail.lines.length > 0) {
            let pos = newStack.lines.indexOf(stackDetail.lines[0]);
            if (pos === 0) {
                // Both first lines are the same so lets pick the longest stack
                if (newStack.lines.length > stackDetail.lines.length) {
                    return newStack;
                }
                return stackDetail;
            }

            if (pos != -1) {
                // The first line of the current stack exists in the new stack
                // Therefore we can use the current stack as it's a subset of the new stack
                return stackDetail;
            }
        }

        if (newStack.lines.length > 0 && stackDetail.lines.indexOf(newStack.lines[0]) != -1) {
            // The first line of the new stack exists in the current stack
            // Therefore we can use the new stack as it's a subset of the current stack
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

function _setStack(theError: Error, stack: string) {
    try {
        objDefine(theError, "stack", {
            l: getLazy(() => {
                let theStack = stack;

                // If we have an inner exception, then we need to add the inner exception stack
                // and message to the existing error
                if ((theError as any).innerException) {
                    let innerEx:Error = (theError as any).innerException as Error;

                    theStack = stack;
                    if (innerEx.stack) {
                        theStack += "\n\nInner Exception:\n" + _formatLines(innerEx.stack, "    ");
                    }
                }

                return theStack;
            })
        });
    } catch (e) {
        // Ok failed to set the stack, so lets just ignore it
    }
}

function _setMessage(theError: Error, message: string) {
    try {
        objDefine(theError, "message", {
            l: getLazy(() => {
                let theMessage = message || EMPTY_STRING;

                if ((theError as any).props) {
                    theMessage += _formatProps((theError as any).props)
                }

                // If we have an inner exception, then we need to add the inner exception stack
                // and message to the existing error
                if ((theError as any).innerException) {
                    let innerEx:Error = (theError as any).innerException as Error;

                    if (innerEx.message) {
                        theMessage += "\n\nCaused by: " + innerEx.message;
                    }
                }

                return theMessage;
            })
        });
    } catch (e) {
        // Ok failed to set the stack, so lets just ignore it
    }
}

function _captureStackTrace(theError: Error, orgStackDetail: IParsedStack, stackStart: Function | Function[]) {
    let stackCandidates = stackStart || [];
    if (!isArray(stackStart)) {
        stackCandidates = [stackStart];
    } else {
        // Create a copy of the stack start array
        stackCandidates = stackStart ? arrSlice(stackStart) : [];
    }
    
    // Try to capture full stack (ie. not limited to 10 frames)
    let newStack = captureStack(theError.constructor);
    let stackDetail = _pruneStack(orgStackDetail, newStack, theError.constructor.name);

    while (stackCandidates && stackCandidates.length > 0) {
        let stackFn = stackCandidates.shift();
        try {
            let funcName = asString(stackFn.name) || (stackFn as any)["displayName"] || "anonymous";

            // Capture the current stack trace
            stackDetail = _pruneStack(stackDetail, captureStack(stackFn), funcName);
        } catch (e) {
            // Some environments do not support `captureStackTrace` so we just ignore it
            break;
        }
    }

    if (stackDetail !== orgStackDetail) {
        // Ensure that we have the original message and trailing message
        stackDetail.message = orgStackDetail.message;
        stackDetail.trailMessage = orgStackDetail.trailMessage;
    }
    
    objDefine(theError as any, cStackDetail, {
        g: () => stackDetail
    });

    _setStack(theError, stackDetail.formatStack());

    return stackDetail;
}

/**
 * @class
 * @hideconstructor
 * This error is used as the base class for all errors thrown by the module, generally
 * any internal error that is thrown that is not related to the requested assertion checks
 * will be an instance of this error.
 *
 * - Extends standard Error class
 *   - **AssertionError** - This class
 *     - {@link AssertionFailure} Used for normal assertion failures
 *       - {@link AssertionFatal} Use for fatal assertion issues
 *
 *
 * @param message - The message for the error.
 * @param props - The additional properties for the error.
 * @param stackStart - The function to use as the starting point for the stack trace.
 * @returns The new `AssertionError`.
 * @template T - The type of the additional properties.
 * @example
 * ```typescript
 * try {
 *     throw new AssertionError("Assertion failed", { expected: 1, actual: 2 });
 * } catch (e) {
 *     console.error(e.fullStack);
 *     console.log(e.toJSON());
 * }
 *
 * console.error(error.message); // "Assertion failed"
 *
 * try {
 *     throw new AssertionError("Assertion failed", new Error(), { expected: 1, actual: 2 });
 * } catch (e) {
 *     console.error(e.fullStack);
 *     console.log(e.innerException);
 *     console.log(e.toJSON());
 * }
 * ```
 */
export const AssertionError = createCustomError<AssertionErrorConstructor<any>>("AssertionError", function _createError(self, args) {
    let len = args.length;
    
    // default values <T>(message?: string, props?: T, stackStart?: Function | Function[]): AssertionError<T>;
    let lp = 1;
    let _innerEx = (lp < len && (len === 4 || isError(args[lp]))) ? args[lp++] : null;

    self.props = lp < len ? args[lp++] : undefined;
    let stackStart: Function[] = lp < len && args[lp] ? (isArray(args[lp]) ? arrSlice(args[lp++]) : [args[lp++]]) : [];

    let _fullStack = self.stack;

    objDefineProps(self, {
        fullStack: {
            v: _fullStack
        },
        innerException: {
            v: _innerEx
        }
    });

    // The createcustomError is sometimes inlined and therefore doesn't have a full "name" for pruning
    stackStart.push(_createError);
    stackStart.push(_captureStackTrace);

    let orgStackDetail = parseStack(_fullStack);
    _setMessage(self, orgStackDetail.message);
    _captureStackTrace(self, orgStackDetail, stackStart);

    self.toJSON = function (stack?: boolean) {
        return {
            name: self.name,
            message: self.message,
            props: self.props,
            stack: stack ? self.stack : undefined,
            innerException: _innerEx
        };
    };
}, Error);

/**
 * @ignore
 * An error that is thrown when an Assertion check fails within the module.
 *
 * This interface extends the {@link AssertionError} interface.
 *
 * @template T - The type of the additional properties.
 *
 * @example
 * ```typescript
 * interface CustomProps {
 *     expected: number;
 *     actual: number;
 * }
 *
 * try {
 *    throw new AssertionFailure<CustomProps>("Expected value does not match actual value", { expected: 1, actual: 2 });
 * } catch (e) {
 *   console.error(e.fullStack);
 *   console.log(e.toJSON());
 * }
 *
 * console.error(error.message); // "Expected value does not match actual value"
 * console.log(error.props?.expected); // 1
 * console.log(error.props?.actual); // 2
 * ```
 */
export interface AssertionFailure<T> extends AssertionError<T> {
}

/**
 * @ignore
 * The constructor signatures for an `AssertionFailure`.
 *
 * This interface extends the `AssertionErrorConstructor` interface and provides
 * methods for creating instances of `AssertionFailure`.
 *
 * @template T - The type of the additional properties.
 */
export interface AssertionFailureConstructor<T> extends AssertionErrorConstructor<T> {
    /**
     * Creates a new `AssertionFailure` with the given message and properties.
     * @hideconstructor
     * @param message - The message for the error.
     * @param props - The additional properties for the error.
     * @param stackStart - The function to use as the starting point for the stack trace.
     * @returns The new `AssertionFailure`.
     * @template T - The type of the additional properties.
     * @example
     * ```typescript
     * try {
     *    throw new AssertionFailure("Assertion failed", { expected: 1, actual: 2 });
     * } catch (e) {
     *   console.error(e.fullStack);
     *  console.log(e.toJSON());
     * }
     * ```
     */
    new <T>(message?: string, props?: T, stackStart?: Function | Function[]): AssertionFailure<T>;

    /**
     * Creates a new `AssertionFailure` with the given message and properties.
     *
     * @param message - The message for the error.
     * @param innerEx - The error that caused this error to be thrown.
     * @param props - The additional properties for the error.
     * @param stackStart - An array of possible functions to use as the starting point for the stack trace.
     * @returns The new `AssertionFailure`.
     * @template T - The type of the additional properties.
     */
    new <T>(message?: string, innerEx?: Error, props?: T, stackStart?: Function | Function[]): AssertionFailure<T>;

    /**
     * Creates a new `AssertionFailure` with the given message and properties.
     * @hideconstructor
     * @param message - The message for the error.
     * @param props - The additional properties for the error.
     * @param stackStart - The function to use as the starting point for the stack trace.
     * @returns The new `AssertionFailure`.
     * @template T - The type of the additional properties.
     * @example
     * ```typescript
     * try {
     *    throw new AssertionFailure("Assertion failed", { expected: 1, actual: 2 });
     * } catch (e) {
     *   console.error(e.fullStack);
     *  console.log(e.toJSON());
     * }
     * ```
     */
    <T>(message?: string, props?: T, stackStart?: Function | Function[]): AssertionFailure<T>;


    /**
     * Creates a new `AssertionFailure` with the given message and properties.
     * @hideconstructor
     * @param message - The message for the error.
     * @param innerEx - The error that caused this error to be thrown.
     * @param props - The additional properties for the error.
     * @param stackStart - The function to use as the starting point for the stack trace.
     * @returns The new `AssertionFailure`.
     * @template T - The type of the additional properties.
     * @example
     * ```typescript
     * try {
     *    throw new AssertionFailure("Assertion failed", new Error(), { expected: 1, actual: 2 });
     * } catch (e) {
     *   console.error(e.fullStack);
     *  console.log(e.toJSON());
     * }
     * ```
     */
    <T>(message?: string, innerEx?: Error, props?: T, stackStart?: Function | Function[]): AssertionFailure<T>;
}

/**
 * @class
 * @hideconstructor
 * This error is thrown when the requested assertion check fails.
 *
 * - Extends standard Error class
 *   - {@link AssertionError} is a base class of this error
 *     - **AssertionFailure** - This class
 *       - {@link AssertionFatal} Use for fatal assertion issues
 *
 * @param message - The message for the error.
 * @param props - The additional properties for the error.
 * @param stackStart - The function to use as the starting point for the stack trace.
 * @returns The new `AssertionFailure` instance.
 * @template T - The type of the additional properties.
 * @example
 * ```typescript
 * interface CustomProps {
 *     expected: number;
 *     actual: number;
 * }
 *
 * try {
 *    throw new AssertionFailure<CustomProps>("Expected value does not match actual value", { expected: 1, actual: 2 });
 * } catch (e) {
 *   console.error(e.fullStack);
 *   console.log(e.toJSON());
 * }
 *
 * console.error(error.message); // "Expected value does not match actual value"
 * console.log(error.props?.expected); // 1
 * console.log(error.props?.actual); // 2
 * ```
 */
export const AssertionFailure = createCustomError<AssertionFailureConstructor<any>, AssertionErrorConstructor<any>>("AssertionFailure", function _createFailure (self, args) {
    let stackDetail: IParsedStack = self[cStackDetail];

    // Capture the current stack trace
    _captureStackTrace(self, stackDetail, _createFailure);
}, AssertionError);

/**
 * @ignore
 * An error that is thrown when a fatal Assertion check is thrown within the module.
 *
 * This interface extends the {@link AssertionFailure} interface.
 *
 * @template T - The type of the additional properties.
 *
 * @example
 * ```typescript
 * interface CustomProps {
 *     expected: number;
 *     actual: number;
 * }
 *
 * const error: AssertionFatal<CustomProps> = {
 *     name: "AssertionFatal",
 *     message: "Something went wrong -- not implemented
 *     props: {
 *         expected: 1,
 *         actual: 2
 *     }
 * };
 *
 * console.error(error.message); // "Expected value does not match actual value"
 * console.log(error.props?.expected); // 1
 * console.log(error.props?.actual); // 2
 * ```
 */
export interface AssertionFatal<T> extends AssertionFailure<T> {
}

/**
 * @ignore
 * The constructor for an `AssertionFatal`.
 *
 * This interface extends the `AssertionFatalConstructor` interface and provides
 * methods for creating instances of `AssertionFatal`.
 *
 * @template T - The type of the additional properties.
 *
 * @param message - The error message.
 * @param props - Additional properties associated with the error.
 * @param stackStart - The function to use as the starting point for the stack trace.
 * @returns `AssertionFatal<T>` - A new `AssertionFatal` instance.
 *
 * @example
 * ```typescript
 * const error = new AssertionFatal<CustomProps>("Fatal Error - Not Implemented", { expected: 1, actual: 2 });
 * console.error(error.message); // "Fatal Error - Not Implemented"
 * console.log(error.props?.expected); // 1
 * console.log(error.props?.actual); // 2
 * ```
 */
export interface AssertionFatalConstructor<T> extends AssertionFailureConstructor<T> {
    /**
     * Creates a new `AssertionFatal` with the given message and properties.
     * @constructor
     * @param message - The message for the error.
     * @param props - The additional properties for the error.
     * @param stackStart - The function to use as the starting point for the stack trace.
     * @returns The new `AssertionFatal`.
     * @template T - The type of the additional properties.
     * @example
     * ```typescript
     * try {
     *   throw new AssertionFatal("Assertion failed - not implemented", { expected: 1, actual: 2 });
     * } catch (e) {
     *  console.error(e.fullStack);
     *  console.log(e.toJSON());
     * }
     * ```
     */
    new <T>(message?: string, props?: T, stackStart?: Function | Function[]): AssertionFatal<T>;

    /**
     * Creates a new `AssertionFatal` with the given message and properties.
     *
     * @param message - The message for the error.
     * @param innerEx - The error that caused this error to be thrown.
     * @param props - The additional properties for the error.
     * @param stackStart - An array of possible functions to use as the starting point for the stack trace.
     * @returns The new `AssertionFatal`.
     * @template T - The type of the additional properties.
     */
    new <T>(message?: string, innerEx?: Error, props?: T, stackStart?: Function | Function[]): AssertionFatal<T>;

    /**
     * Creates a new `AssertionFatal` with the given message and properties.
     * @constructor
     * @param message - The message for the error.
     * @param props - The additional properties for the error.
     * @param stackStart - The function to use as the starting point for the stack trace.
     * @returns The new `AssertionFatal`.
     * @template T - The type of the additional properties.
     * @example
     * ```typescript
     * try {
     *   throw new AssertionFatal("Assertion failed - not implemented", { expected: 1, actual: 2 });
     * } catch (e) {
     *  console.error(e.fullStack);
     *  console.log(e.toJSON());
     * }
     * ```
     */
    <T>(message?: string, props?: T, stackStart?: Function | Function[]): AssertionFatal<T>;

    /**
     * Creates a new `AssertionFatal` with the given message and properties.
     * @constructor
     * @param message - The message for the error.
     * @param innerEx - The error that caused this error to be thrown.
     * @param props - The additional properties for the error.
     * @param stackStart - The function to use as the starting point for the stack trace.
     * @returns The new `AssertionFatal`.
     * @template T - The type of the additional properties.
     * @example
     * ```typescript
     * try {
     *   throw new AssertionFatal("Assertion failed - not implemented", new Error(), { expected: 1, actual: 2 });
     * } catch (e) {
     *  console.error(e.fullStack);
     *  console.log(e.toJSON());
     * }
     * ```
     */
    <T>(message?: string, innerEx?: Error, props?: T, stackStart?: Function | Function[]): AssertionFatal<T>;
}

/**
 * @class
 * @hideconstructor
 * This error is thrown when the fatal assertion check is thrown within the module.
 *
 * - Extends standard Error class
 *   - {@link AssertionError} is a base class of this error
 *     - {@link AssertionFailure} Used for normal assertion failures
 *       - **AssertionFatal** - This class
 *
 *
 * @param message - The message for the error.
 * @param props - The additional properties for the error.
 * @param stackStart - The function to use as the starting point for the stack trace.
 * @returns The new `AssertionFatal`.
 * @template T - The type of the additional properties.
 * @example
     * ```typescript
     * try {
     *   throw new AssertionFatal("Assertion failed - not implemented", { expected: 1, actual: 2 });
     * } catch (e) {
     *  console.error(e.fullStack);
     *  console.log(e.toJSON());
     * }
     * ```
 */
export const AssertionFatal = createCustomError<AssertionFatalConstructor<any>, AssertionFailureConstructor<any>>("AssertionFatal", function _createFatal (self, args) {
    let stackDetail: IParsedStack = self[cStackDetail];

    // Capture the current stack trace
    _captureStackTrace(self, stackDetail, _createFatal);
}, AssertionFailure);
