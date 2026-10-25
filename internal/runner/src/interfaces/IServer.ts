/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IPromise } from "@nevware21/ts-async";

/**
 * Represents a running server instance.
 * The server can be stopped by calling the `stop` method, which may return a promise if the stopping process is asynchronous.
 */
export interface IServer {
    /**
     * The URL of the server.
     */
    url: string;

    /**
     * The port on which the server is running.
     */
    port: number;

    /**
     * Indicates whether the server is currently running.
     */
    isRunning: boolean;

    /**
     * Stops the server.
     * @returns A promise that resolves when the server has stopped, or void if the stopping process is synchronous.
     */
    stop(): IPromise<void> | void;
}