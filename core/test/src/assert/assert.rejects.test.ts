/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "../../../src/assert/assertClass";
import { AssertionFailure } from "../../../src/assert/assertionFailure";

async function _fails(fn: () => PromiseLike<any>): Promise<any> {
    try {
        await fn();
    } catch (e) {
        return e;
    }
    return null;
}

describe("assert.rejects / assert.doesNotReject", () => {
    it("rejects passes for a rejected promise or function", async () => {
        await assert.rejects(Promise.reject(new Error("test")));
        await assert.rejects(() => Promise.reject(new Error("test")));
        await assert.rejects(async () => {
            throw new TypeError("bad");
        }, TypeError);
        await assert.rejects(async () => {
            throw new Error("bad thing");
        }, /bad/);
        await assert.rejects(async () => {
            throw new Error("bad thing");
        }, "bad");
    });

    it("rejects fails when the promise resolves", async () => {
        let e = await _fails(() => assert.rejects(Promise.resolve(1)));
        assert.ok(e instanceof AssertionFailure);
        e = await _fails(() => assert.rejects(async () => 1));
        assert.ok(e instanceof AssertionFailure);
    });

    it("rejects fails when the reason does not match", async () => {
        let e = await _fails(() => assert.rejects(async () => {
            throw new Error("x");
        }, TypeError));
        assert.ok(e instanceof AssertionFailure);
        e = await _fails(() => assert.rejects(async () => {
            throw new Error("x");
        }, /nope/));
        assert.ok(e instanceof AssertionFailure);
    });

    it("rejects propagates a synchronous throw from the function", async () => {
        let e = await _fails(() => assert.rejects((() => {
            throw new RangeError("sync");
        }) as any));
        assert.ok(e instanceof RangeError);
    });

    it("rejects fails for a non promise value", async () => {
        let e = await _fails(() => assert.rejects(42 as any));
        assert.ok(e);
    });

    it("doesNotReject passes when not rejected", async () => {
        await assert.doesNotReject(Promise.resolve(1));
        await assert.doesNotReject(async () => 42);
        await assert.doesNotReject(async () => {
            throw new Error("other");
        }, /test/);
    });

    it("doesNotReject fails when rejected", async () => {
        let e = await _fails(() => assert.doesNotReject(Promise.reject(new Error("test"))));
        assert.ok(e instanceof AssertionFailure);
        e = await _fails(() => assert.doesNotReject(async () => {
            throw new Error("test");
        }, /test/));
        assert.ok(e instanceof AssertionFailure);
    });
});
