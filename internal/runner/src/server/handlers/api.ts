/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IPromise } from "@nevware21/ts-async";
import { IServerRequest } from "../../interfaces/IServerRequest";

/**
 * Handle API requests.
 * @param request
 */
export function _handleApiRequest(request: IServerRequest): IPromise<void> | void {
    let res = request.res;
    const actionUrl = request.actionUrl || "";

    if (request.method.isGet && actionUrl === "/status") {
        res.statusCode = 200;
        res.setHeader("content-type", "application/json; charset=utf-8");
        res.end(JSON.stringify({
            status: "running"
        }));
        return;
    }

    const apiHandler = request.context.getApiHandler(actionUrl);
    if (apiHandler) {
        return apiHandler(request);
    }

    res.statusCode = 404;
    res.end("Not Found");
}
