/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2025-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IConfigInst } from "./IConfigInst";

/**
 * Indicates the result of a formatting operation.
 *
 * @since 0.1.3
 * @group Formatter
 */
export const enum eFormatResult {
    /**
     * The value was successfully formatted and should be used.
     */
    Ok = 0,
    
    /**
     * The value was formatted, but continue trying other formatters to find a better result.
     */
    Continue = 1,

    /**
     * The formatter could not format this value. Try the next formatter.
     */
    Skip = 2,
    
    /**
     * An error occurred while formatting the value, this indicates a failure in the formatting process
     * either explicitly set by the formatter or due to an exception being thrown.
     */
    Failed = 3
}

/**
 * Result of formatting a value.
 *
 * @since 0.1.3
 * @group Formatter
 */
export interface IFormattedValue {
    /**
     * Indicates the result of the formatting operation.
     */
    res: eFormatResult;
    
    /**
     * The formatted string representation of the value.
     * Only meaningful when {@link res} is {@link eFormatResult.Ok} or {@link eFormatResult.Continue}.
     */
    val?: string;
    
    /**
     * The Error that occurred during formatting, set when {@link res} is {@link eFormatResult.Failed}
     * This can be either an error explicitly thrown by the formatter or an error that occurred
     * internally during the formatting process.
     * Only meaningful when {@link res} is {@link eFormatResult.Failed}.
     */
    err?: any;
}

/**
 * Formatting context passed to the _formatValue function.
 * Provides a format function that uses the configured IFormatters.
 *
 * @since 0.1.3
 * @group Formatter
 */
export interface IFormatCtx {
    /**
     * The configuration instance used for formatting.
     */
    readonly cfg: IConfigInst;

    /**
     * Formats a value using the configured formatters.
     * @param value - The value to format
     * @returns A string representation of the value
     */
    format(value: any): string;
}

/**
 * Represents a value formatter for display in assertion error messages.
 * Formatters attempt to format a value and indicate the result of the formatting operation.
 *
 * Multiple formatters can be chained together, with user-supplied formatters
 * checked before built-in defaults.
 *
 * @example
 * ```typescript
 * const customStringFormatter: IFormatter = {
 *     name: "stringFormatter",
 *     value: (ctx, value) => {
 *         if (typeof value === 'string') {
 *             return { res: eFormatResult.Ok, val: `'${value}'` };
 *         }
 *         return { res: eFormatResult.Skip, val: '' };
 *     }
 * };
 *
 * const customArrayFormatter: IFormatter = {
 *     name: "arrayFormatter",
 *     value: (ctx, value) => {
 *         if (Array.isArray(value)) {
 *             return { res: eFormatResult.Ok, val: `[${value.length} items]` };
 *         }
 *         return { res: eFormatResult.Skip, val: '' };
 *     }
 * };
 *
 * const partialFormatter: IFormatter = {
 *     name: "partialFormatter",
 *     value: (ctx, value) => {
 *         // Provide a basic format but allow other formatters to potentially improve it
 *         if (value && typeof value === 'object') {
 *             return { res: eFormatResult.Continue, val: Object.prototype.toString.call(value) };
 *         }
 *         return { res: eFormatResult.Skip, val: '' };
 *     }
 * };
 * ```
 *
 * @since 0.1.3
 * @group Formatter
 */
export interface IFormatter {
    /**
     * Name for the formatter, useful for debugging and identification.
     */
    readonly name: string;

    /**
     * Attempts to format the value into a string representation.
     * @param ctx - The formatting context containing config, visited tracking, and the format function
     * @param value - The value to format
     * @returns An object with {@link IFormattedValue.res} indicating the formatting result and {@link IFormattedValue.val} containing the formatted string,
     * or `undefined`/`null` if the formatter cannot handle the value.
     */
    value(ctx: IFormatCtx, value: any): IFormattedValue | undefined | null;
}
