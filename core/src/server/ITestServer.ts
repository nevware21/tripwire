/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2025 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IPromise } from "@nevware21/ts-async";

/**
 * A running test server instance, as created by an {@link ITestServerProvider} for the browser and worker targets.
 * @since 0.2.0
 */
export interface ITestServer {
    /**
     * Returns the URL of the test server (if it's currently running).
     */
    readonly url: string;

    /**
     * Returns the port number the test server is listening on (if it's currently running).
     */
    readonly port: number;

    /**
     * Indicates whether the test server is currently running, which means it has been started
     * and has not yet been stopped. This can also be inferred by checking if the `url` property
     * is non-empty and the `port` property is a valid number.
     */
    readonly isRunning: boolean;

    /**
     * Request that the test server be started. If the server is already running, this method
     * should have no effect and simply return a resolved promise. If the server is not running,
     * this method should start the server and return a promise that resolves once the server is
     * ready to accept requests.
     *
     * The server should be considered "ready" when it is fully initialized and able to handle
     * incoming HTTP requests. This typically means that the server has successfully bound to the
     * specified port and is listening for connections. The promise returned by this method should
     * resolve at that point, allowing any dependent code to proceed with the assurance that the
     * server is operational.
     * @returns A promise that resolves when the server has started.
     */
    start(): IPromise<ITestServer> | ITestServer;

    /**
     * Request that the test server be stopped. If the server is not running, this method will have
     * no effect and simply return a resolved promise. If the server is running, this method will
     * request that the server be stopped and return a promise that resolves once the server has
     * been fully stopped and is no longer accepting requests.
     *
     * Note that stopping the server may not immediately terminate any currently running tests that are
     * in the process of executing. Depending on the implementation, the server may either allow
     * those tests to complete or may attempt to abort them, but this behavior is not guaranteed and
     * should not be relied upon. In general, it is not recommended that you call this method while
     * tests are still running, as it may lead to unpredictable results. Instead, you should ensure that
     * all tests have completed before stopping the server.
     * @returns A promise that resolves when the server has been stopped.
     */
    stop(): IPromise<void>;
}