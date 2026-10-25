/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IPromise } from "@nevware21/ts-async";
import { ITestServerProvider } from "../suite/interfaces/ITestServerProvider";
import { ITestServer } from "../server/ITestServer";

/**
 * Interface for managing the test server instance. This allows tests to interact with the server during execution,
 * such as making HTTP requests to it or checking its status. The server property may be undefined if the test runner
 * does not support a test server, so tests should check for its existence before attempting to use it. The start method
 * should start the server and return a promise that resolves when the server is ready to accept requests. The setProvider
 * method allows setting a provider that will be used to create the test server instance, which should return a promise
 * that resolves to an ITestServer instance, an ITestServer instance directly, null, or undefined.
 *
 * @since 0.2.0
 */
export interface IServerManager {

    /**
     * Provides access to the test server instance, if available. This allows tests to interact with the server
     * during execution, such as making HTTP requests to it or checking its status. The server property may be
     * undefined if the test runner does not support a test server, so tests should check for its existence
     * before attempting to use it.
     */
    server: IPromise<ITestServer | null | undefined> | ITestServer | null | undefined;

    /**
     * Starts the server and returns a promise that resolves when the server is ready to accept requests.
     * @returns A promise that resolves when the server is ready
     */
    start(): IPromise<ITestServer | null | undefined> | ITestServer | null | undefined;

    /**
     * Set the provider that will be used to create the test server instance. The provider should
     * return a promise that resolves to an ITestServer instance, an ITestServer instance directly, null, or undefined.
     * @param provider - An object that provides the test server instance
     */
    setProvider(provider: ITestServerProvider): void;
}