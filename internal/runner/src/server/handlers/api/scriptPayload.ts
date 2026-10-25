/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { doAwait, IPromise } from "@nevware21/ts-async";
import { IApiHandler } from "../../../interfaces/IApiHandler";
import { IServerRequest } from "../../../interfaces/IServerRequest";

/**
 * Creates an API handler that responds with a JavaScript payload.
 * @param fetchScript A function that returns the JavaScript code to send in the response,
 * either as a string or a promise that resolves to a string.
 * @returns An API handler function.
 */
export function scriptApiHandler(fetchScript: () => IPromise<string> | string): IApiHandler {
    return function(request: IServerRequest): IPromise<void> | void {
        const res = request.res;

        if (request.method.isGet) {
            return doAwait(fetchScript(), (theScript) => {
                res.statusCode = 200;
                res.setHeader("content-type", "application/javascript; charset=utf-8");
                res.end(theScript);
            });
        } else {
            res.statusCode = 404;
            res.end("Not Found");
        }
    };
}
