/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { _handleApiRequest } from "../../../../internal/runner/src/server/handlers/api";
import { IServerRequest } from "../../../../internal/runner/src/interfaces/IServerRequest";
import { assertStatusResponse } from "../support/statusEndpoint";
import { doAwait } from "@nevware21/ts-async";
import { objDefine } from "@nevware21/ts-utils";
import { ITestContext } from "../../../src/interfaces/suite/ITestContext";

function _createStatusRequest(): { request: IServerRequest, responseState: { statusCode: number, headers: { [key: string]: string }, body: string } } {
    const responseState = {
        statusCode: 0,
        headers: {} as { [key: string]: string },
        body: ""
    };

    const response: any = {
        setHeader: (name: string, value: string) => {
            responseState.headers[name.toLowerCase()] = String(value);
        },
        end: (body?: string) => {
            responseState.body = body || "";
        }
    };

    objDefine(response, "statusCode", {
        g: () => {
            return responseState.statusCode;
        },
        s: (value: number) => {
            responseState.statusCode = value;
        }
    });

    const request = {
        server: {} as any,
        context: {
            getApiHandler: (): any => {
                return undefined;
            }
        } as any,
        req: {
            url: "/api/status"
        },
        res: response,
        method: {
            name: "GET",
            isGet: true,
            isPost: false
        },
        action: "api",
        actionUrl: "/status",
        query: {}
    } as IServerRequest;

    return {
        request,
        responseState
    };
}

describe("/api/status server endpoint", () => {
    it("returns running status from the api handler", async () => {
        const statusRequest = _createStatusRequest();
        await Promise.resolve(_handleApiRequest(statusRequest.request));

        let body: any = statusRequest.responseState.body;
        if (body) {
            body = JSON.parse(body);
        }

        assertStatusResponse(statusRequest.responseState.statusCode, statusRequest.responseState.headers["content-type"] || null, body);
    });

    it("returns running status from a fetch request to the runner http server", async function(this: ITestContext) {
        const fetchFn = (globalThis as any).fetch;
        if (typeof fetchFn !== "function") {
            this.skip();
            return;
        }

        await doAwait(this.server, (server) => {
            if (!server) {
                this.skip();
                return;
            }

            const ensureStarted = typeof (server as any).start === "function" ? (server as any).start() : server;

            return doAwait(ensureStarted, () => {
                const baseUrl = server && server.url ? String(server.url) : "";
                if (!baseUrl) {
                    this.skip();
                    return;
                }

                return doAwait(fetchFn(baseUrl + "api/status"), (response) => {
                    return doAwait(response.json(), (body) => {
                        assertStatusResponse(response.status, response.headers.get("content-type"), body);
                    });
                });
            });
        });
    });
});