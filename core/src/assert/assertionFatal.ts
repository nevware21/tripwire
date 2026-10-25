/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { arrSlice, createCustomError, isArray, isError } from "@nevware21/ts-utils";
import { AssertionFailure, AssertionFailureConstructor } from "./assertionFailure";
import { _captureStackTrace, cStackDetail } from "../internal/_errorSupport";

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
    new (message?: string, props?: T, stackStart?: Function | Function[]): AssertionFatal<T>;

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
    new (message?: string, innerEx?: Error, props?: T, stackStart?: Function | Function[]): AssertionFatal<T>;

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
    (message?: string, props?: T, stackStart?: Function | Function[]): AssertionFatal<T>;

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
    (message?: string, innerEx?: Error, props?: T, stackStart?: Function | Function[]): AssertionFatal<T>;
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
export const AssertionFatal = createCustomError<AssertionFatalConstructor<any>, AssertionFailureConstructor<any>>("AssertionFatal",
    function _createFatal (self, args, isOwnInstance) {
        if (isOwnInstance) {
            // new (message?, props?, stackStart?) / new (message?, innerEx?, props?, stackStart?)
            let len = args.length;
            let lp = 1;
            if (lp < len && (len === 4 || isError(args[lp]))) {
                // Skip innerEx
                lp++;
            }

            if (lp < len) {
                // Skip props
                lp++;
            }

            // The caller-provided stackStart (eg. the assert/expect pipeline's `context._$stackFn`)
            // identifies frames *above* this constructor call that should also be pruned -- without
            // forwarding it here those internal pipeline frames leak into the final stack.
            let stackStart: Function[] = lp < len && args[lp] ? (isArray(args[lp]) ? arrSlice(args[lp]) : [args[lp]]) : [];
            stackStart.push(_createFatal);

            // Capture the current stack trace
            _captureStackTrace(self, self[cStackDetail], stackStart);
        }
    },
    AssertionFailure
);
