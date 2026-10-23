/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { arrSlice, createCustomError, isArray, isError } from "@nevware21/ts-utils";
import { TripwireError, TripwireErrorConstructor } from "../errors/tripwireError";
import { _captureStackTrace, _setPropValue, cStackDetail } from "../internal/_errorSupport";
import { UNDEF_VALUE } from "../internal/constants";
import { IAssertionErrorOrgValues } from "./interface/IAssertionErrorOrgValues";

/**
 * @ignore
 * An error that is thrown when an error occurs within the module and is also
 * used as the base class for all {@link AssertionFailure} errors thrown by the module.
 * @template T - The type of the additional properties.
 */
export interface AssertionError<T> extends TripwireError<T> {
    /**
     * The actual value that was seen.
     * Changed to Mutable (from readonly) for backward compatibility in 0.1.6, but should be treated as read-only
     * @since 0.1.5
     */
    actual?: any;

    /**
     * The value that was expected
     * Changed to Mutable (from readonly) for backward compatibility in 0.1.6, but should be treated as read-only
     * @since 0.1.5
     */
    expected?: any;

    /**
     * The operator used in the assertion
     * Changed to Mutable (from readonly) for backward compatibility in 0.1.6, but should be treated as read-only
     * @since 0.1.5
     */
    operator?: string;

    /**
     * Indicates whether to show the difference between expected and actual values
     * in the error message.
     * Changed to Mutable (from readonly) for backward compatibility in 0.1.6, but should be treated as read-only
     * @since 0.1.5
     */
    showDiff?: boolean;

    /**
     * The original values of the properties before any modifications were made for backward compatibility with older
     * versions of frameworks (like mocha). This allows for referencing the original values if needed, while still
     * allowing the properties to be modified for compatibility reasons. This property and its properties are readonly
     * to prevent modification and will only be set if any of the original properties (actual, expected, operator, showDiff)
     * are present on the error object AND the values are modified to be different than the original values. If the original
     * values are the same as the modified values, then this property will not be set.
     * While the `actual` and `expected` properties are commonly also in the `props` object, these top-level properties are
     * mutable and therefore it is possible that some frameworks may modify these properties directly on the error object.
     * @since 0.1.6
     */
    readonly orgValues?: IAssertionErrorOrgValues;
}

/**
 * @ignore
 * The constructor for an `AssertionError`.
 * @template T - The type of the additional properties.
 */
export interface AssertionErrorConstructor<T> extends TripwireErrorConstructor {

    /**
     * Creates a new `AssertionError` with the given message and properties.
     *
     * @param message - The message for the error.
     * @param props - The additional properties for the error.
     * @param stackStart - An array of possible functions to use as the starting point for the stack trace.
     * @returns The new `AssertionError`.
     * @template T - The type of the additional properties.
     */
    new (message?: string, props?: T, stackStart?: Function | Function[]): AssertionError<T>;

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
    new (message?: string, innerEx?: Error, props?: T, stackStart?: Function | Function[]): AssertionError<T>;

    /**
     * Creates a new `AssertionError` with the given message and properties.
     *
     * @param message - The message for the error.
     * @param props - The additional properties for the error.
     * @param stackStart - An array of possible functions to use as the starting point for the stack trace.
     * @returns The new `AssertionError`.
     * @template T - The type of the additional properties.
     */
    (message?: string, props?: T, stackStart?: Function | Function[]): AssertionError<T>;

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
    (message?: string, innerEx?: Error, props?: T, stackStart?: Function | Function[]): AssertionError<T>;

    /**
     * Gets the full stack trace of the error, this will show all of the internal calls
     * that lead to the error being thrown. Useful for debugging as generally the stack
     * trace will only show the location where the error was thrown.
     *
     * @returns The full stack trace as a string.
     */
    fullStack: () => string;

    /**
     * The error that caused this error to be thrown.
     */
    innerException: () => Error | null;

    /**
     * Converts the error to a JSON object.
     *
     * @param stack - Whether to include the stack trace in the JSON object.
     * @returns A JSON representation of the error.
     */
    toJSON(stack?: boolean): any;
}

/**
 * @class
 * @hideconstructor
 * This error is used as the base class for all errors thrown by the module, generally
 * any internal error that is thrown that is not related to the requested assertion checks
 * will be an instance of this error.
 *
 * - Extends standard TripwireError class
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
export const AssertionError = createCustomError<AssertionErrorConstructor<any>>("AssertionError",
    function _createError(self, args, isOwnInstance) {
        let len = args.length;

        // default values <T>(message?: string, props?: T, stackStart?: Function | Function[]): AssertionError<T>;
        let lp = 1;
        if (lp < len && (len === 4 || isError(args[lp]))) {
            // Skip innerEx
            lp++;
        }

        if (lp < len) {
            // skip Props
            lp++;
        }

        _setPropValue(self, "actual");
        _setPropValue(self, "expected");
        _setPropValue(self, "operator", "operation");
        _setPropValue(self, "showDiff");

        if (isOwnInstance) {
            let stackStart: Function[] = lp < len && args[lp] ? (isArray(args[lp]) ? arrSlice(args[lp++]) : [args[lp++]]) : [];

            // The createcustomError is sometimes inlined and therefore doesn't have a full "name" for pruning
            stackStart.push(_createError);
            stackStart.push(_captureStackTrace);

            _captureStackTrace(self, self[cStackDetail], stackStart);
        }

        self.toJSON = function (stack?: boolean) {
            return {
                name: self.name,
                message: self.message,
                props: self.props,
                actual: self.actual,
                expected: self.expected,
                operator: self.operator,
                showDiff: self.showDiff,
                stack: stack ? self.stack : undefined,
                innerException: self.innerException
            };
        };
    },
    TripwireError,
    (args) => {
        /*
         * AssertionError
         * new <T>(message?: string, props?: T, stackStart?: Function | Function[]): AssertionError<T>;
         * new <T>(message?: string, innerEx?: Error, props?: T, stackStart?: Function | Function[]): AssertionError<T>;
         * TripwireError
         * (message: string, props?: P, innerEx?: Error, stackStart?: Function | Function[]): TripwireError;
         */

        let superArgs: any[] = [args[0]];
        let len = args.length;
        let lp = 1;

        superArgs[2] = (lp < len && (len === 4 || isError(args[lp]))) ? args[lp++] : null;
        superArgs[1] = lp < len ? args[lp++] : UNDEF_VALUE;
        superArgs[3] = lp < len && args[lp] ? (isArray(args[lp]) ? arrSlice(args[lp++]) : [args[lp++]]) : UNDEF_VALUE;

        return superArgs;
    }
);
