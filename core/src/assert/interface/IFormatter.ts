/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2025-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IScopeContext } from "./IScopeContext";

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
     * The current scope context, providing information about the current assertion scope.
     */
    readonly ctx: IScopeContext;

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

/**
 * Options for configuring value formatters.
 *
 * @since 0.1.3
 * @group Formatter
 * @example
 * ```typescript
 * import { assertConfig } from '@nevware21/tripwire';
 * import { escapeAnsi, gray, replaceAnsi } from '@nevware21/chromacon';
 *
 * // Example 1: Enable default ANSI escaping
 * assertConfig.format = {
 *     finalize: true  // Uses escapeAnsi to escape ANSI codes
 * };
 *
 * // Example 2: Custom finalization that wraps output
 * assertConfig.format = {
 *     finalize: true,
 *     finalizeFn: (value) => `[Formatted: ${escapeAnsi(value)}]`
 * };
 *
 * // Example 3: Colorize escaped ANSI codes in gray
 * assertConfig.format = {
 *     finalize: true,
 *     finalizeFn: (value) => replaceAnsi(value, (match) => gray(escapeAnsi(match)))
 * };
 *
 * // Example 4: Convert to HTML-safe format
 * assertConfig.format = {
 *     finalize: true,
 *     finalizeFn: (value) => {
 *         return escapeAnsi(value)
 *             .replace(/</g, '&lt;')
 *             .replace(/>/g, '&gt;')
 *             .replace(/&/g, '&amp;');
 *     }
 * };
 * ```
 */
export interface IFormatterOptions {
    /**
     * Indicates whether to finalize the resulting formatted string value. When enabled without
     * a custom {@link IFormatterOptions.finalizeFn}, ANSI escape codes will be escaped so they are
     * displayed as literal characters rather than being interpreted by the terminal.
     *
     * This enables post-processing of the complete formatted output after all formatters have been applied.
     *
     * @default false
     * @example
     * ```typescript
     * // Enable default ANSI escaping
     * assertConfig.format = {
     *     finalize: true
     * };
     *
     * // Disable finalization (ANSI codes will be rendered)
     * assertConfig.format = {
     *     finalize: false
     * };
     * ```
     */
    finalize?: boolean;

    /**
     * A custom function to finalize the resulting formatted string value. This function is called
     * once on the complete formatted output (not on individual components) when {@link IFormatterOptions.finalize} is `true`.
     *
     * Use this to apply custom transformations to the entire formatted message, such as:
     * - Custom escaping strategies
     * - Wrapping or decorating the output
     * - Converting to different formats (HTML, Markdown, etc.)
     * - Colorizing escaped codes while keeping them visible
     *
     * @param value - The complete formatted string to finalize
     * @returns The finalized string
     * @default undefined
     * @remarks When not provided and {@link IFormatterOptions.finalize} is `true`, defaults to using
     * [escapeAnsi](https://nevware21.github.io/chromacon/typedoc/core/functions/escapeAnsi.html) from [@nevware21/chromacon](https://nevware21.github.io/chromacon/)
     * to escape ANSI codes. You can provide a custom function for other transformations like HTML encoding,
     * wrapping, or colorizing escaped codes.
     * @example
     * ```typescript
     * import { escapeAnsi, gray, replaceAnsi } from '@nevware21/chromacon';
     *
     * // Colorize ANSI escape sequences in gray
     * assertConfig.format = {
     *     finalize: true,
     *     finalizeFn: (value) => {
     *         return replaceAnsi(value, (match) => gray(escapeAnsi(match)));
     *     }
     * };
     *
     * // Wrap the entire output in brackets
     * assertConfig.format = {
     *     finalize: true,
     *     finalizeFn: (value) => `[OUTPUT: ${escapeAnsi(value)}]`
     * };
     *
     * // Convert to HTML entities for web display
     * assertConfig.format = {
     *     finalize: true,
     *     finalizeFn: (value) => {
     *         return escapeAnsi(value)
     *             .replace(/</g, '&lt;')
     *             .replace(/>/g, '&gt;')
     *             .replace(/&/g, '&amp;');
     *     }
     * };
     * ```
     */
    finalizeFn?: (value: string) => string;

    /**
     * @deprecated This property is deprecated and will be replaced and removed in future releases.
     * Custom value formatter functions to be used for formatting values in error messages.
     * These formatters will be checked before the default formatters. Each formatter should
     * implement `value` which returns an {@link IFormattedValue} object indicating whether
     * the value was formatted and the formatted result.
     *
     * User-supplied formatters are checked first, allowing you to override default formatting
     * behavior for specific types.
     *
     * @remarks These formatters are only used for formatting values in assertion error messages
     * and do not affect any system colors or other formatting.
     *
     * @example
     * ```typescript
     * const customStringFormatter: IFormatter = {
     *     name: "stringFormatter",
     *     value: (ctx, value) => {
     *         if (typeof value === 'string') {
     *             return { res: eFormatResult.Ok, val: `'${value}'` };
     *         }
     *         return { res: eFormatResult.Skip };
     *     }
     * };
     *
     * const customArrayFormatter: IFormatter = {
     *     name: "arrayFormatter",
     *     value: (ctx, value) => {
     *         if (Array.isArray(value)) {
     *             return { res: eFormatResult.Ok, val: `[${value.length} items]` };
     *         }
     *         return { res: eFormatResult.Skip };
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
     *         return { res: eFormatResult.Skip };
     *     }
     * };
     *
     * let customFormatters: IFormatter[] = [customStringFormatter, customArrayFormatter, partialFormatter];
     *
     * const config: IFormatterOptions = {
     *     formatters: customFormatters
     * };
     * ```
     */
    formatters?: IFormatter[];
}
