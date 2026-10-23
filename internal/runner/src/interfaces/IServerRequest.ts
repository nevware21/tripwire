/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IRequestMethod } from "./IRequestMethod";
import { IServer } from "./IServer";
import { IServerAction } from "./IServerAction";
import { IServerContext } from "./IServerContext";

/**
 * Represents a server request, including the server, context, request and response objects, HTTP method,
 * and parsed URL information.
 */
export interface IServerRequest {
    /**
     * The server instance handling this request.
     */
    server: IServer;

    /**
     * The context in which the server is running.
     */
    context: IServerContext;

    /**
     * The incoming request object.
     */
    req: any;

    /**
     * The outgoing response object.
     */
    res: any;

    /**
     * The HTTP method of the request.
     */
    method: IRequestMethod;

    /**
     * The action being requested.
     */
    action: string;

    /**
     * The URL of the action being requested.
     */
    actionUrl: string;

    /**
     * The query parameters of the request.
     */
    query: { [key: string]: string };

    /**
     * The available server actions.
     */
    actions: IServerAction[];
}