/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { MsgSource } from "./types";
import { IFormatter, IFormatterOptions } from "./IFormatter";
import { IRemovable } from "./IRemovable";

/**
 * Provides the options for the current context
 */
export interface IAssertConfig {
    
    /**
     * Identifies if the current context is verbose mode, which will include additional
     * information in the execution context and any resulting assertion failures.
     * @default false
     */
    isVerbose?: boolean;

    /**
     * Identifies if the current context is in full-stack mode, which will include the full
     * stack trace in the error message if an assertion fails.
     * @default false
     */
    fullStack?: boolean;

    /**
     * Defiines the default assertion failure message to display if no message is provided.
     * @default "assertion failed"
     */
    defAssertMsg?: MsgSource;

    /**
     * Defines the default fatal message to display if no message is provided.
     * @default "fatal assertion failure"
     * @remarks This is used for fatal errors that are not assertion failures.
     */
    defFatalMsg?: MsgSource;

    /**
     * Options for configuring value formatting.
     * @remarks These options allow you to customize how values are formatted in assertion error messages.
     * You can provide custom formatters to override the default formatting behavior for specific types.
     * These formatters will be checked before the default formatters, allowing you to provide specialized
     * formatting for certain value types.
     *
     * Additionally, you can control post-processing of the formatted output using {@link IFormatterOptions.finalize}
     * and {@link IFormatterOptions.finalizeFn} to escape ANSI codes, wrap output, or apply other transformations.
     *
     * @since 0.1.3
     * @example
     * ```typescript
     * import { assertConfig } from '@nevware21/tripwire';
     * import { eFormatResult } from '@nevware21/tripwire';
     * import { escapeAnsi, gray, replaceAnsi } from '@nevware21/chromacon';
     *
     * // Example 1: Custom formatters with default ANSI escaping
     * assertConfig.format = {
     *     finalize: true,  // Enable default escapeAnsi
     *     formatters: [
     *         {
     *             name: "stringFormatter",
     *             value: (ctx, value) => {
     *                 if (typeof value === 'string') {
     *                     return { res: eFormatResult.Ok, val: `'${value}'` };
     *                 }
     *                 return { res: eFormatResult.Skip };
     *             }
     *         }
     *     ]
     * };
     *
     * // Example 2: Custom formatters with custom finalization
     * assertConfig.format = {
     *     finalize: true,
     *     finalizeFn: (value) => replaceAnsi(value, (match) => gray(escapeAnsi(match))),
     *     formatters: [
     *         {
     *             name: "arrayFormatter",
     *             value: (ctx, value) => {
     *                 if (Array.isArray(value)) {
     *                     return { res: eFormatResult.Ok, val: `[${value.length} items]` };
     *                 }
     *                 return { res: eFormatResult.Skip };
     *             }
     *         }
     *     ]
     * };
     * ```
     */
    format?: IFormatterOptions;

    /**
     * Defines a custom message to display when a circular reference is detected in a value.
     * The default is a function that returns the string "[<Circular>]" in cyan color using @nevware21/chromacon.
     * @remarks This is used to provide a more descriptive message for circular references in assertion errors.
     * @since 0.1.3
     * @example
     * ```typescript
     * const config = {
     *     circularMsg: () => "Circular reference detected"
     * };
     * ```
     */
    circularMsg?: () => string;

    /**
     * Indicates whether to show the difference between expected and actual values
     * in the error message.
     * @default true
     * @since 0.1.5
     */
    showDiff?: boolean;
}

export interface IAssertConfigDefaults extends IAssertConfig {

    /**
     * Resets the current config options to their default values removing any customizations
     * @remarks This will restore all config options to their original default values as
     * defined in package defaults.
     */
    reset: () => void;
    
    /**
     * Returns the current config options in a new plain object
     * @param options - The options to override the current config options
     */
    clone: (options?: IAssertConfig) => IAssertConfig;

    /**
     * Adds a new default value formatter that will be used to for all new assertion contexts
     * @param formatter - The value formatter to add
     * @remarks The returned IRemovable can be used to remove the formatter when it is no longer needed.
     */
    addFormatter: (formatter: IFormatter) => IRemovable;
    
    /**
     * Removes a value formatter from the current context options
     * @param formatter - The value formatter to remove
     */
    removeFormatter: (formatter: IFormatter) => void;
}
