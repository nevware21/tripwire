/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { EventEmitter } from "events";
import { assert } from "@nevware21/tripwire";
import { _readRequestBody } from "../../../src/server/readRequestBody";

function fakeRequest(): { request: any; req: EventEmitter } {
    const req = new EventEmitter();

    return {
        req,
        request: { req }
    };
}

describe("server readRequestBody", () => {
    it("collects buffer and string chunks into one utf8 string", async () => {
        const { request, req } = fakeRequest();
        const pending = _readRequestBody(request);

        req.emit("data", Buffer.from("hel"));
        req.emit("data", "lo ");
        req.emit("data", Buffer.from("wörld", "utf8"));
        req.emit("end");

        assert.equal(await pending, "hello wörld");
    });

    it("resolves to an empty string for a body without data", async () => {
        const { request, req } = fakeRequest();
        const pending = _readRequestBody(request);

        req.emit("end");

        assert.equal(await pending, "");
    });

    it("rejects when the request errors", async () => {
        const { request, req } = fakeRequest();
        const pending = _readRequestBody(request);
        const failure = new Error("socket reset");

        req.emit("data", "partial");
        req.emit("error", failure);

        let caught: any = null;
        try {
            await pending;
        } catch (e) {
            caught = e;
        }

        assert.equal(caught, failure);
    });
});
