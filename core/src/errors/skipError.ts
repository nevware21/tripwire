/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { arrSlice, createCustomError, isArray } from "@nevware21/ts-utils";
import { TripwireError, TripwireErrorConstructor } from "./tripwireError";
import { UNDEF_VALUE } from "../internal/constants";
import { _captureStackTrace, cStackDetail } from "../internal/_errorSupport";

/**
 * Additional properties carried by a {@link SkipError}.
 * @since 0.2.0
 */
export interface ISkipProps {
}

/**
 * @ignore
 * An error that is thrown when a test or hook is skipped within the module and is also
 * used as the base class for all skip errors thrown by the module.
 * @since 0.2.0
 */
export interface SkipError extends TripwireError {
}

/**
 * @ignore
 * The constructor for an `SkipError`.
 * @since 0.2.0
 */
export interface SkipErrorConstructor extends TripwireErrorConstructor<ISkipProps> {

    /**
     * Creates a new `SkipError` with the given message and properties.
     *
     * @param message - The message for the error.
     * @param innerEx - The error that caused this error to be thrown.
     * @returns The new `SkipError`.
     */
    new (message: string, props?: ISkipProps, innerEx?: Error): SkipError;

    /**
     * Creates a new `SkipError` with the given message and properties.
     *
     * @param message - The message for the error.
     * @param innerEx - The error that caused this error to be thrown.
     * @returns The new `SkipError`.
     */
    (message: string, props?: ISkipProps, innerEx?: Error): SkipError;
}

/**
 * @class
 * @hideconstructor
 * This error is used to indicate that the current action (test/hook) should be
 * skipped, generally this is used when a test or hook calls `skip()`.
 *
 * - Extends standard Error class
 *   - {@link TripwireError} - Common error base class for all errors thrown by the module
 *   - **SkipError** - This class
 *
 * @param message - The message for the error.
 * @param props - The properties for the error.
 * @returns The new `SkipError`.
 * @example
 * ```typescript
 * try {
 *     throw new SkipError("Test skipped");
 * } catch (e) {
 *     console.error(e.fullStack);
 *     console.log(e.toJSON());
 * }
 *
 * console.error(error.message); // "Test skipped"
 *
 * try {
 *     throw new SkipError("Test skipped", new Error());
 * } catch (e) {
 *     console.error(e.fullStack);
 *     console.log(e.innerException);
 *     console.log(e.toJSON());
 * }
 * ```
 * @since 0.2.0
 */
export const SkipError = createCustomError<SkipErrorConstructor>("SkipError",
    function _createError(self, args, isOwnInstance) {
        let len = args.length;

        if (isOwnInstance) {
            let stackStart: Function[] = [];
            if (len >= 3) {
                stackStart = (isArray(args[2]) ? arrSlice(args[2]) : [args[2]]) || [];
            }

            // The createcustomError is sometimes inlined and therefore doesn't have a full "name" for pruning
            stackStart.push(_createError);
            stackStart.push(_captureStackTrace);

            _captureStackTrace(self, self[cStackDetail], stackStart);
        }

        self.toJSON = function (stack?: boolean) {
            return {
                name: self.name,
                message: self.message,
                stack: stack ? self.stack : UNDEF_VALUE
            };
        };
    },
    TripwireError,
    (args) => {
        let len = args.length;
        let superArgs = [];

        if (len > 0) {
            superArgs.push(args[0]);
        }

        if (len >= 2) {
            superArgs.push(args[1]);
        }

        if (len >= 3) {
            superArgs.push(args[2]);
        }

        return superArgs;
    });
