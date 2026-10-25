/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { arrSlice, createCustomError, isArray, isError } from "@nevware21/ts-utils";
import { AssertionError, AssertionErrorConstructor } from "./assertionError";
import { _captureStackTrace, cStackDetail } from "../internal/_errorSupport";

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
    new (message?: string, props?: T, stackStart?: Function | Function[]): AssertionFailure<T>;

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
    new (message?: string, innerEx?: Error, props?: T, stackStart?: Function | Function[]): AssertionFailure<T>;

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
    (message?: string, props?: T, stackStart?: Function | Function[]): AssertionFailure<T>;


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
    (message?: string, innerEx?: Error, props?: T, stackStart?: Function | Function[]): AssertionFailure<T>;
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
export const AssertionFailure = createCustomError<AssertionFailureConstructor<any>, AssertionErrorConstructor<any>>("AssertionFailure",
    function _createFailure (self, args, isOwnInstance) {
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
            stackStart.push(_createFailure);

            // Capture the current stack trace
            _captureStackTrace(self, self[cStackDetail], stackStart);
        }
    },
    AssertionError
);

