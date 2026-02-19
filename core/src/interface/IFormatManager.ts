/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IRemovable } from "./IRemovable";
import { IFormatter } from "./IFormatter";

/**
 * Manages value formatters used for formatting assertion error messages.
 * The format manager is responsible for:
 * - Registering and removing formatters
 * - Providing access to registered formatters
 * - Supporting parent-child hierarchy for formatter inheritance
 *
 * @since 0.1.5
 * @group Formatter
 */
export interface IFormatManager {
    /**
     * Add a formatter to be used for formatting values
     * @param formatter - The formatter or array of formatters to add
     * @returns A removable handle to unregister the formatter(s)
     */
    addFormatter(formatter: IFormatter | Array<IFormatter>): IRemovable;

    /**
     * Remove a formatter
     * @param formatter - The formatter or array of formatters to remove
     */
    removeFormatter(formatter: IFormatter | Array<IFormatter>): void;

    /**
     * Get all registered formatters, including those from parent managers
     * @returns Array of all available formatters, with current manager's formatters first (higher priority),
     * followed by parent formatters (lower priority)
     */
    getFormatters(): Readonly<IFormatter[]>;

    /**
     * Execute a callback for each registered formatter
     * @param callback - The callback to execute for each formatter
     * @remarks If the callback returns -1, the iteration will stop
     */
    forEach(callback: (formatter: IFormatter) => void | number): void;

    /**
     * Reset the format manager to its initial state, removing all registered formatters
     */
    reset(): void;

    /**
     * Format a value using the configured formatters and format options.
     * This is a convenience method that uses the internal formatting logic,
     * applying all registered formatters, circular reference detection,
     * and finalization options.
     * @param value - The value to format
     * @returns The formatted string representation of the value
     * @since 0.1.8
     */
    format(value: any): string;
}
