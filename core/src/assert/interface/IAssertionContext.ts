/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

/**
 * Context passed to listeners when an assertion evaluation occurs
 * @since 0.2.0
 */
export interface IAssertionContext {
    /**
     * The value being evaluated
     */
    value: any;

    /**
     * The evaluation expression message
     */
    message?: string;

    /**
     * The operation path leading to this evaluation
     */
    opPath?: string[];

    /**
     * Whether this evaluation is negated
     */
    negated?: boolean;

    /**
     * Whether the evaluation passed
     */
    passed: boolean;

    /**
     * The error thrown if the evaluation failed
     */
    error?: Error | any;
}
