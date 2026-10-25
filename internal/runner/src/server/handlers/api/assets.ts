/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { doAwait, IPromise } from "@nevware21/ts-async";
import { IServerRequest } from "../../../interfaces/IServerRequest";

export function _assetHandler(request: IServerRequest): IPromise<void> | void {

    if (request.method.isGet) {
        return doAwait(request.context.getAsset(request.actionUrl), (asset) => {
            if (asset) {
                request.res.statusCode = 200;
                request.res.setHeader("content-type", asset.contentType);
                request.res.end(asset.content);
            } else {
                request.res.statusCode = 404;
                request.res.end("Not Found");
            }
        });
    } else {
        request.res.statusCode = 404;
        request.res.end("Not Found");
    }
}

/*
 *         if (method === "GET" && reqPath === "/assets/runner-client.js") {
 *             const scriptPath = _resolveClientScriptPath();
 *             const scriptSource = fs.readFileSync(scriptPath, "utf8");
 *             res.statusCode = 200;
 *             res.setHeader("content-type", "application/javascript; charset=utf-8");
 *             res.end(scriptSource);
 *             return;
 *         }
 */
