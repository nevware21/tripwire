/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

/**
 * For backward compatibility with older versions of frameworks (like mocha), we need to support the original properties
 * being replaced on the error object itself. This interface defines the original properties that may be present on
 * the error object so that they can be referenced if needed, while still allowing the properties to be modified for
 * compatibility reasons. This interface and its properties are readonly
 * @since 0.1.6
 */
export interface IAssertionErrorOrgValues {
    /**
     * The original actual value that was seen.
     * @since 0.1.6
     */
    readonly actual?: any;

    /**
     * The original value that was expected.
     * @since 0.1.6
     */
    readonly expected?: any;

    /**
     * The original operator used in the assertion.
     * @since 0.1.6
     */
    readonly operator?: string;

    /**
     * The original value indicating whether to show the difference between expected and actual values
     * in the error message.
     * @since 0.1.6
     */
    readonly showDiff?: boolean;
}
