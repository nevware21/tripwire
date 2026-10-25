/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { createPromise, IPromise } from "@nevware21/ts-async";
import { IServerRequest } from "../interfaces/IServerRequest";
import { Buffer } from "buffer";

export function _readRequestBody(request: IServerRequest): IPromise<string> {
    return createPromise((resolve, reject) => {
        const req = request.req;
        let chunks: Buffer[] = [];

        req.on("data", (chunk: Buffer | string) => {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });

        req.on("end", () => {
            resolve(Buffer.concat(chunks).toString("utf8"));
        });

        req.on("error", reject);
    });
}
