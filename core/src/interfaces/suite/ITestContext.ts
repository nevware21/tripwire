/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2025-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { ITestCase } from "./ITestCase";
import { ListenerEvent } from "../../types/ListenerEvent";
import { IGetSetChainableFn } from "./IGetSetChainableFn";
import { IPromise } from "@nevware21/ts-async";
import { ITestServer } from "../../server/ITestServer";

/**
 * Test runner context
 * @since 0.2.0
 */
export interface ITestContext {

    /**
     * Arbitrary properties that can be set on the test context
     */
    [key: string]: any;

    /**
     * Current listener event type, when applicable
     */
    type?: ListenerEvent;

    /**
     * Current test
     */
    currentTest?: ITestCase;

    /**
     * Provides access to the test server instance, if available. This allows tests to interact with the server
     * during execution, such as making HTTP requests to it or checking its status. The server property may be
     * undefined if the test runner does not support a test server, so tests should check for its existence
     * before attempting to use it.
     */
    server?: IPromise<ITestServer> | ITestServer | null | undefined;

    /**
     * Gets or sets the current test timeout. When called without arguments, returns the current
     * timeout value. When called with a millisecond value, sets the timeout and resets the timer
     * if the test is already running, then returns the context for method chaining.
     * @example
     * ```typescript
     * // Getter usage
     * const currentTimeout: number = context.timeout();
     * // Setter usage with chaining
     * context.timeout(5000).slow(1000);
     * ```
     */
    timeout: IGetSetChainableFn<this, number>;

    /**
     * Gets or sets the threshold for considering a test as slow. When called without arguments,
     * returns the current slow threshold. When called with a millisecond value, sets the threshold
     * and returns the context for method chaining.
     * @example
     * ```typescript
     * // Getter usage
     * const currentSlow: number = context.slow();
     * // Setter usage with chaining
     * context.slow(1000).timeout(5000);
     * ```
     */
    slow: IGetSetChainableFn<this, number>;

    /**
     * Gets or sets the number of allowed retries on failed tests. When called without arguments,
     * returns the current retry count. When called with a number, sets the retry count and returns
     * the context for method chaining.
     * @example
     * // Getter usage
     * const currentRetries: number = context.retries();
     * // Setter usage with chaining
     * context.retries(2).timeout(5000);
     * ```
     */
    retries: IGetSetChainableFn<this, number>;

    /**
     * Marks the current test as skipped and never returns. This method is intended to be
     * used within test or hook functions to conditionally skip execution.
     * @example
     * ```typescript
     * it("should skip this test", function() {
     *     if (someCondition) {
     *         context.skip();
     *     }
     *     // Test code that will be skipped if someCondition is true
     * });
     * ```
     */
    skip(): never;
}
