/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { ITestServer } from "../../server/ITestServer";
import { IGetSetChainableFn } from "./IGetSetChainableFn";

/**
 * Mocha-like context provided as `this` inside suite-definition callbacks.
 * @since 0.2.0
 */
export interface ISuiteContext {
    /**
     * Provides access to the test server instance, if available. This allows tests to interact with the server
     * during execution, such as making HTTP requests to it or checking its status. The server property may be
     * undefined if the test runner does not support a test server, so tests should check for its existence
     * before attempting to use it.
     */
    server?: ITestServer;

    /**
     * Gets or sets the default timeout (ms) for tests and hooks in this suite.
     */
    timeout: IGetSetChainableFn<this, number>;

    /**
     * Gets or sets the default slow threshold (ms) for tests in this suite.
     */
    slow: IGetSetChainableFn<this, number>;

    /**
     * Gets or sets the default retry count for tests in this suite.
     */
    retries: IGetSetChainableFn<this, number>;
}
