/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { doAwait, IPromise } from "@nevware21/ts-async";
import { IServerRequest } from "../../../interfaces/IServerRequest";
import { _readRequestBody } from "../../readRequestBody";

export function _reportResultApiHandler(request: IServerRequest): IPromise<void> | void {
    const res = request.res;

    if (request.method.isPost) {
        return doAwait(_readRequestBody(request), (body) => {
            let result = {};
            try {
                result = body ? JSON.parse(body) : {};
            } catch (e) {
                result = {
                    error: body
                };
            }

            res.statusCode = 202;
            res.end();

            request.context.onComplete(result);
        });
    } else {
        res.statusCode = 404;
        res.end("Not Found");
    }
}
