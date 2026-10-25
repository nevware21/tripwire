/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { EventEmitter } from "events";
import { createPromise } from "@nevware21/ts-async";
import { assert } from "@nevware21/tripwire";
import { _jsonApiHandler } from "../../../src/server/handlers/api/jsonPayload";
import { logApiHandler } from "../../../src/server/handlers/api/logMsg";
import { _reportResultApiHandler } from "../../../src/server/handlers/api/reportResult";
import { scriptApiHandler } from "../../../src/server/handlers/api/scriptPayload";

interface IFakeResponse {
    statusCode: number;
    headers: { [name: string]: string };
    body: string | undefined;
    ended: boolean;
    setHeader(name: string, value: string): void;
    end(body?: string): void;
}

function fakeResponse(): IFakeResponse {
    const res: IFakeResponse = {
        statusCode: 0,
        headers: {},
        body: undefined,
        ended: false,
        setHeader: (name: string, value: string) => {
            res.headers[name] = value;
        },
        end: (body?: string) => {
            res.body = body;
            res.ended = true;
        }
    };

    return res;
}

/**
 * Builds a request for a handler. A POST body is emitted through the request's event emitter the
 * way node's IncomingMessage delivers it.
 */
function fakeRequest(method: "GET" | "POST", body?: string) {
    const req = new EventEmitter();
    const res = fakeResponse();
    const logged: string[] = [];
    const completed: any[] = [];
    const request: any = {
        req,
        res,
        method: { name: method, isGet: method === "GET", isPost: method === "POST" },
        context: {
            logMsg: (msg: any) => {
                logged.push(msg);
            },
            onComplete: (summary: any) => {
                completed.push(summary);
            }
        }
    };

    const send = () => {
        if (body !== undefined) {
            req.emit("data", Buffer.from(body, "utf8"));
        }
        req.emit("end");
    };

    return { request, res, logged, completed, send };
}

describe("server api handlers", () => {
    describe("jsonPayload", () => {
        it("answers a GET with the payload as JSON", () => {
            const { request, res } = fakeRequest("GET");

            _jsonApiHandler({ status: "running", count: 2 })(request);

            assert.equal(res.statusCode, 200);
            assert.equal(res.headers["content-type"], "application/json; charset=utf-8");
            assert.deepEqual(JSON.parse(res.body), { status: "running", count: 2 });
        });

        it("rejects any other method with a 404", () => {
            const { request, res } = fakeRequest("POST");

            _jsonApiHandler({})(request);

            assert.equal(res.statusCode, 404);
            assert.equal(res.body, "Not Found");
        });
    });

    describe("scriptPayload", () => {
        it("serves a synchronously supplied script", () => {
            const { request, res } = fakeRequest("GET");

            scriptApiHandler(() => "console.log(1);")(request);

            assert.equal(res.statusCode, 200);
            assert.equal(res.headers["content-type"], "application/javascript; charset=utf-8");
            assert.equal(res.body, "console.log(1);");
        });

        it("waits for a script that is fetched asynchronously", async () => {
            const { request, res } = fakeRequest("GET");

            await scriptApiHandler(() => createPromise<string>((resolve) => {
                setTimeout(() => resolve("later();"), 1);
            }))(request);

            assert.equal(res.statusCode, 200);
            assert.equal(res.body, "later();");
        });

        it("rejects any other method with a 404", () => {
            const { request, res } = fakeRequest("POST");

            scriptApiHandler(() => "nope();")(request);

            assert.equal(res.statusCode, 404);
        });
    });

    describe("logMsg", () => {
        it("logs every entry of a posted batch and answers 204", async () => {
            const { request, res, logged, send } = fakeRequest("POST", JSON.stringify({
                entries: [{ level: "info", message: "first" }, { message: "second" }, {}]
            }));

            const pending = logApiHandler(request);
            send();
            await pending;

            assert.deepEqual(logged, ["first", "second", ""]);
            assert.equal(res.statusCode, 204);
            assert.isTrue(res.ended);
        });

        it("accepts a single entry object", async () => {
            const { request, logged, send } = fakeRequest("POST", JSON.stringify({ level: "warn", message: "alone" }));

            const pending = logApiHandler(request);
            send();
            await pending;

            assert.deepEqual(logged, ["alone"]);
        });

        it("logs a body that is not JSON as a plain message", async () => {
            const { request, logged, send } = fakeRequest("POST", "not json at all");

            const pending = logApiHandler(request);
            send();
            await pending;

            assert.deepEqual(logged, ["not json at all"]);
        });

        it("treats an empty body as an empty message", async () => {
            const { request, logged, res, send } = fakeRequest("POST", "");

            const pending = logApiHandler(request);
            send();
            await pending;

            assert.deepEqual(logged, [""]);
            assert.equal(res.statusCode, 204);
        });

        it("rejects any other method with a 404", () => {
            const { request, res } = fakeRequest("GET");

            logApiHandler(request);

            assert.equal(res.statusCode, 404);
            assert.equal(res.body, "Not Found");
        });
    });

    describe("reportResult", () => {
        it("hands the posted summary to the context after acknowledging it", async () => {
            const { request, res, completed, send } = fakeRequest("POST", JSON.stringify({ passed: 3, failed: 0 }));

            const pending = _reportResultApiHandler(request);
            send();
            await pending;

            assert.equal(res.statusCode, 202);
            assert.isTrue(res.ended);
            assert.deepEqual(completed, [{ passed: 3, failed: 0 }]);
        });

        it("wraps a body that is not JSON as an error summary", async () => {
            const { request, completed, send } = fakeRequest("POST", "<html>boom</html>");

            const pending = _reportResultApiHandler(request);
            send();
            await pending;

            assert.deepEqual(completed, [{ error: "<html>boom</html>" }]);
        });

        it("reports an empty summary for an empty body", async () => {
            const { request, completed, send } = fakeRequest("POST", "");

            const pending = _reportResultApiHandler(request);
            send();
            await pending;

            assert.deepEqual(completed, [{}]);
        });

        it("rejects any other method with a 404", () => {
            const { request, res, completed } = fakeRequest("GET");

            _reportResultApiHandler(request);

            assert.equal(res.statusCode, 404);
            assert.equal(completed.length, 0);
        });
    });
});
