/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2025 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IPromise } from "@nevware21/ts-async";
import { ITestServer } from "../../server/ITestServer";

/**
 * Interface for providing a test server instance. This allows tests to obtain a test server instance from the test
 * runner, which can be used to interact with the server during test execution, such as making HTTP requests to it
 * or checking its status. The provider should return a promise that resolves to an ITestServer instance, an
 * ITestServer instance directly, null, or undefined.
 *
 * @since 0.2.0
 */
export interface ITestServerProvider {

    /**
     * Indicates whether the test runner supports providing a test server instance. If false, the getServer method will
     * not be called and tests should not attempt to use the server property on the test context.
     */
    canProvideServer: boolean;

    /**
     * Provides the test server instance. The provider should return a promise that resolves to an ITestServer instance,
     * or an ITestServer instance directly.
     * @returns A promise that resolves to an ITestServer instance, an ITestServer instance directly, null, or undefined.
     */
    getServer?(): IPromise<ITestServer> | ITestServer | null | undefined;
}