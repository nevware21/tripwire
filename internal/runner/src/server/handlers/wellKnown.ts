/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IServerRequest } from "../../interfaces/IServerRequest";

const _CHROME_DEVTOOLS_APP_SPECIFIC_PATH = "/appspecific/com.chrome.devtools.json";

export function _handleWellKnownRequest(request: IServerRequest): void {
    if (!request.method.isGet) {
        request.res.statusCode = 404;
        request.res.end("Not Found");
        return;
    }

    if (request.actionUrl !== _CHROME_DEVTOOLS_APP_SPECIFIC_PATH) {
        request.res.statusCode = 404;
        request.res.end("Not Found");
        return;
    }

    request.res.statusCode = 200;
    request.res.setHeader("content-type", "application/json; charset=utf-8");
    request.res.end("{}");
}
