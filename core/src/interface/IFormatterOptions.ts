/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2025-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */


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
     * Maximum number of items/properties to display when formatting collections and objects.
     * Applies to arrays, objects, Maps, Sets, and objects with constructors.
     * Limits the output to prevent excessive formatting time for large collections.
     * When exceeded, additional items are indicated with ",...".
     *
     * @default 8
     * @since 0.1.8
     * @example
     * ```typescript
     * // Show up to 10 items/properties
     * assertConfig.format = {
     *     maxProps: 10
     * };
     *
     * // Show only 3 items/properties (more compact output)
     * assertConfig.format = {
     *     maxProps: 3
     * };
     * ```
     */
    maxProps?: number;

    /**
     * Maximum depth for formatting nested values before treating as circular reference.
     * This prevents pathological cases with deeply nested structures.
     *
     * @default 50
     * @since 0.1.8
     * @example
     * ```typescript
     * // Allow deeper nesting before treating as circular
     * assertConfig.format = {
     *     maxFormatDepth: 100
     * };
     *
     * // More restrictive depth limit
     * assertConfig.format = {
     *     maxFormatDepth: 25
     * };
     * ```
     */
    maxFormatDepth?: number;
}
