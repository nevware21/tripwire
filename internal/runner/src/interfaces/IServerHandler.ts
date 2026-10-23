/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IPromise } from "@nevware21/ts-async";
import { IServerRequest } from "./IServerRequest";

/**
 * A handler function for server requests.
 * It can return a promise for asynchronous handling or void for synchronous handling.
 */
export interface IServerHandler {
    /**
     * Handles an incoming server request.
     * @param request - The server request to handle.
     * @returns A promise if the handling is asynchronous, or void if it is synchronous.
     */
    (request: IServerRequest): IPromise<void> | void;
}