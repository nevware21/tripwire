/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IPromise } from "@nevware21/ts-async";
import { IApiHandler } from "../../../interfaces/IApiHandler";
import { IServerRequest } from "../../../interfaces/IServerRequest";

/**
 * Creates an API handler that responds with a JSON payload.
 * @param payload The JSON payload to send in the response.
 * @returns An API handler function.
 */
export function _jsonApiHandler(payload: any): IApiHandler {
    return function(request: IServerRequest): IPromise<void> | void {
        const res = request.res;

        if (request.method.isGet) {
            res.statusCode = 200;
            res.setHeader("content-type", "application/json; charset=utf-8");
            res.end(JSON.stringify(payload));
        } else {
            res.statusCode = 404;
            res.end("Not Found");
        }
    };
}
