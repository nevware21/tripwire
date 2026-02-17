/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { MsgSource } from "../assert/type/MsgSource";
import { IFormatterOptions } from "./IFormatterOptions";

/**
 * Provides the options for the current context
 */
export interface IConfig {
    /**
     * Reserved for internal use only as the IConfigInst provides additional public operations
     * that are not part of the configuration that can be modified.
     * @internal
     */
    $ops?: never;

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
     * Custom formatters can be added via the format manager (see {@link IConfigInst.formatMgr}).
     * Custom formatters are checked in order: current context formatters first, then parent context formatters,
     * and finally default formatters. This allows you to provide specialized formatting for certain value types
     * that takes precedence over inherited and default formatting.
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
     *     finalize: true  // Enable default escapeAnsi
     * };
     *
     * assertConfig.formatMgr.addFormatter({
     *     name: "stringFormatter",
     *     value: (ctx, value) => {
     *         if (typeof value === 'string') {
     *             return { res: FormatResult.Ok, val: `'${value}'` };
     *         }
     *         return { res: FormatResult.Skip };
     *     }
     * });
     *
     * // Example 2: Custom formatters with custom finalization
     * assertConfig.format = {
     *     finalize: true,
     *     finalizeFn: (value) => replaceAnsi(value, (match) => gray(escapeAnsi(match)))
     * };
     *
     * assertConfig.formatMgr.addFormatter({
     *     name: "arrayFormatter",
     *     value: (ctx, value) => {
     *         if (Array.isArray(value)) {
     *             return { res: FormatResult.Ok, val: `[${value.length} items]` };
     *         }
     *         return { res: FormatResult.Skip };
     *     }
     * });
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

    /**
     * Maximum depth for formatting nested values before treating as circular reference.
     * This prevents pathological cases with deeply nested structures.
     * @default 50
     * @since 0.1.8
     */
    maxFormatDepth?: number;

    /**
     * Maximum depth for deep equality comparisons before throwing a fatal error.
     * This prevents stack overflow with extremely deep object structures.
     * @default 100
     * @since 0.1.8
     */
    maxCompareDepth?: number;

    /**
     * Maximum number of recently visited items to check for circular references during deep comparisons.
     * Limiting this prevents O(n²) performance degradation in deeply nested structures.
     * @default 50
     * @since 0.1.8
     */
    maxCompareCheckDepth?: number;
}
