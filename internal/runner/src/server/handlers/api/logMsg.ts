/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { doAwait, IPromise } from "@nevware21/ts-async";
import { arrForEach, asString, isArray } from "@nevware21/ts-utils";
import { IServerRequest } from "../../../interfaces/IServerRequest";
import { _readRequestBody } from "../../readRequestBody";

interface ILogMessage {
    entries?: ILogEntry[] | ILogEntry;
}

interface ILogEntry {
    level?: string;
    message?: string;
}

/**
 * Creates an API handler that responds with a JavaScript payload.
 * @param fetchScript A function that returns the JavaScript code to send in the response,
 * either as a string or a promise that resolves to a string.
 * @returns An API handler function.
 */
export function logApiHandler(request: IServerRequest): IPromise<void> | void {
    const res = request.res;

    if (request.method.isPost) {
        return doAwait(_readRequestBody(request), (body) => {
            let msg: ILogMessage = {};
            try {
                msg = body ? JSON.parse(body) : {} as ILogMessage;
            } catch (e) {
                msg = {
                    entries: [{
                        level: "log",
                        message: body
                    }]
                };
            }

            const entries: ILogEntry[] = msg && isArray(msg.entries) ? msg.entries : [msg as ILogEntry];
            arrForEach(entries, (entry) => {
                const level = entry && entry.level ? asString(entry.level) : "log";
                const message = entry && entry.message !== undefined ? asString(entry.message) : "";

                request.context.logMsg(message);
            });

            res.statusCode = 204;
            res.end();
        });
    } else {
        res.statusCode = 404;
        res.end("Not Found");
    }
}
