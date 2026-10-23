/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { arrSlice, createCustomError } from "@nevware21/ts-utils";
import { TripwireError, TripwireErrorConstructor } from "./tripwireError";
import { UNDEF_VALUE } from "../internal/constants";
import { _captureStackTrace, _setPropValue, cStackDetail } from "../internal/_errorSupport";

/**
 * Additional properties carried by a {@link TimeoutError}.
 * @since 0.2.0
 */
export interface ITimeoutProps {
    timeoutMs: number;
}

/**
 * @ignore
 * An error that is thrown when a timeout occurs within the module and is also
 * used as the base class for all timeout errors thrown by the module.
 * @since 0.2.0
 */
export interface TimeoutError extends TripwireError {
    readonly timeoutMs: number;
}

/**
 * @ignore
 * The constructor for an `TimeoutError`.
 * @since 0.2.0
 */
export interface TimeoutErrorConstructor extends TripwireErrorConstructor<ITimeoutProps> {

    /**
     * Creates a new `TimeoutError` with the given message and properties.
     *
     * @param message - The message for the error.
     * @param props - The properties for the error, including the timeout duration in milliseconds.
     * @param innerEx - The error that caused this error to be thrown.
     * @returns The new `TimeoutError`.
     */
    new (message: string, props: ITimeoutProps, innerEx?: Error): TimeoutError;

    /**
     * Creates a new `TimeoutError` with the given message and properties.
     *
     * @param message - The message for the error.
     * @param props - The properties for the error, including the timeout duration in milliseconds.
     * @param innerEx - The error that caused this error to be thrown.
     * @returns The new `TimeoutError`.
     */
    (message: string, props: ITimeoutProps, innerEx?: Error): TimeoutError;
}

/**
 * @class
 * @hideconstructor
 * This error is used to signal that a timeout has occurred within the module, generally this is
 * used when an action (test or hook) exceeds the specified timeout duration. This error extends
 * the base {@link TripwireError}
 *
 * - Extends standard Error class
 *   - {@link TripwireError} - Common error base class for all errors thrown by the module
 *     - **TimeoutError** - This class
 *
 * @param message - The message for the error.
 * @param props - The properties for the error, including the timeout duration in milliseconds.
 * @param innerEx - An optional error that caused this error to be thrown, this is useful for
 * wrapping other errors that may have caused the timeout to occur.
 * @returns The new `TimeoutError`.
 * @example
 * ```typescript
 * try {
 *     throw new TimeoutError("Execution failed", { timeoutMs: 5000 });
 * } catch (e) {
 *     console.error(e.fullStack);
 *     console.log(e.toJSON());
 * }
 *
 * console.error(error.message); // "Execution failed"
 *
 * try {
 *     throw new TimeoutError("Execution failed", new Error());
 * } catch (e) {
 *     console.error(e.fullStack);
 *     console.log(e.innerException);
 *     console.log(e.toJSON());
 * }
 * ```
 * @since 0.2.0
 */
export const TimeoutError = createCustomError<TimeoutErrorConstructor>("TimeoutError",
    function _createTimeoutError(self, args, isOwnInstance) {
        _setPropValue(self, "timeoutMs");

        if (isOwnInstance) {
            // The createcustomError is sometimes inlined and therefore doesn't have a full "name" for pruning
            let stackStart: Function[] = [];

            stackStart.push(_createTimeoutError);
            stackStart.push(_captureStackTrace);
            _captureStackTrace(self, self[cStackDetail], stackStart);
        }

        self.toJSON = function (stack?: boolean) {
            return {
                name: self.name,
                message: self.message,
                stack: stack ? self.stack : UNDEF_VALUE,
                timeoutMs: self.timeoutMs
            };
        };
    },
    TripwireError,
    (args) => {
        let len = args.length;

        return arrSlice(args, 0, len);
    });
