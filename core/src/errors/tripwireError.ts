/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { arrSlice, createCustomError, CustomErrorConstructor, getLazy, isArray, objDefineProps } from "@nevware21/ts-utils";
import { _captureStackTrace, _setMessage, _setStackDetail } from "../internal/_errorSupport";
import { parseStack } from "../internal/parseStack";
import { UNDEF_VALUE } from "../internal/constants";

/**
 * An error that is thrown when an error occurs within the module and is also
 * used as the base class for all errors thrown by the module.
 * @since 0.2.0
 */
export interface TripwireError<P = { [key: string]: any }> extends Error {
    /**
     * Additional properties that are included in the error.
     */
    readonly props?: P;
}

/**
 * @ignore
 * The constructor for an `TripwireError`.
 * @since 0.2.0
 */
export interface TripwireErrorConstructor<P = { [key: string]: any }> extends CustomErrorConstructor<TripwireError> {

    /**
     * Creates a new `TripwireError` with the given message and properties.
     *
     * @param message - The message for the error.
     * @param innerEx - The error that caused this error to be thrown.
     * @param props - Optional properties to associate with the error
     * @param stackStart - An array of possible functions to use as the starting point for the stack trace.
     * @returns The new `TripwireError`.
     */
    new (message: string, props?: P, innerEx?: Error, stackStart?: Function | Function[]): TripwireError;

    /**
     * Creates a new `TripwireError` with the given message and properties.
     *
     * @param message - The message for the error.
     * @param innerEx - The error that caused this error to be thrown.
     * @param props - Optional properties to associate with the error
     * @param stackStart - An array of possible functions to use as the starting point for the stack trace.
     * @returns The new `TripwireError`.
     */
    (message: string, props?: P, innerEx?: Error, stackStart?: Function | Function[]): TripwireError;

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
 * - Extends standard Error class
 *   - **TripwireError** - This class
 *     - {@link AssertionError} - Used as a base class for all assertion related errors
 *       - {@link AssertionFailure} - Used for normal assertion failures
 *         - {@link AssertionFatal} - Used for fatal assertion issues
 *     - `SkipError` - Used for skipped test related errors
 *     - `TimeoutError` - Used for timeout related errors
 *
 * @param message - The message for the error.
 * @param stackStart - The function to use as the starting point for the stack trace.
 * @returns The new `TripwireError`.
 * @example
 * ```typescript
 * try {
 *     throw new TripwireError("Execution failed");
 * } catch (e) {
 *     console.error(e.fullStack);
 *     console.log(e.toJSON());
 * }
 *
 * console.error(error.message); // "Execution failed"
 *
 * try {
 *     throw new TripwireError("Execution failed", new Error());
 * } catch (e) {
 *     console.error(e.fullStack);
 *     console.log(e.innerException);
 *     console.log(e.toJSON());
 * }
 * ```
 * @since 0.2.0
 */
export const TripwireError = createCustomError<TripwireErrorConstructor>("TripwireError",
    function _createTripwireError(self, args, isOwnInstance) {
        let len = args.length;

        // (message?: string, stackStart?: Function | Function[], innerEx?: Error): TripwireError;

        let stackStart: Function[] = [];
        let _innerEx = (len >= 3 ? args[2] : null);

        self.props = (len >= 2 ? args[1]: UNDEF_VALUE);
        if (len >= 4) {
            stackStart = (isArray(args[3]) ? arrSlice(args[3]) : [args[3]]) || [];
        }

        // Read self.stack now, while self.message/name are still Error.prototype's
        // defaults -- _setMessage() below replaces self.message with a getter that
        // (via orgStackDetail) depends on this same stack string, so if the native
        // stack hasn't been resolved yet, V8's lazy stack formatter calling
        // self.toString() -> self.message would recurse back into this same chain.
        let _fullStack = self.stack;

        objDefineProps(self, {
            fullStack: {
                v: _fullStack
            },
            innerException: {
                v: _innerEx
            }
        });

        let orgStackDetail = getLazy(() => parseStack(_fullStack));
        _setMessage(self, () => {
            return orgStackDetail.v.message;
        });

        if (isOwnInstance) {
            // The createcustomError is sometimes inlined and therefore doesn't have a full "name" for pruning
            stackStart.push(_createTripwireError);
            stackStart.push(_captureStackTrace);

            _captureStackTrace(self, orgStackDetail.v, stackStart);
        } else {
            // JUst set the stack detail to the original stack detail, as we don't want
            // to capture a new stack trace for a base class as it will be captured by the
            // leaf-most class that is being instantiated
            _setStackDetail(self, orgStackDetail);
        }

        self.toJSON = function (stack?: boolean) {
            return {
                name: self.name,
                message: self.message,
                stack: stack ? self.stack : UNDEF_VALUE,
                innerException: _innerEx
            };
        };
    },
    Error,
    (args) => {
        let len = args.length;
        let superArgs: any[] = [args[0]];
        if (len >= 2) {
            superArgs.push(args[1]);
        }
        let _innerEx = (len >= 3 ? args[2] : null);
        if (_innerEx) {
            superArgs.push({ cause: _innerEx });
        }

        return superArgs;
    });
