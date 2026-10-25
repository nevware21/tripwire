/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { isString } from "@nevware21/ts-utils";
import { assert } from "../../../src/assert/assertClass";
import { AbortError } from "../../../src/errors/abortError";
import { SkipError } from "../../../src/errors/skipError";
import { TimeoutError } from "../../../src/errors/timeoutError";
import { TripwireError } from "../../../src/errors/tripwireError";

/**
 * The three errors the runner uses to steer a run: a skip, an abort and an exceeded timeout. Each is a
 * TripwireError with its own name and JSON shape.
 */
describe("runner errors", () => {
    describe("SkipError", () => {
        it("should be a TripwireError with its own name", () => {
            const error = new SkipError("Test skipped");

            assert.equal(error.name, "SkipError");
            assert.equal(error.message, "Test skipped");
            assert.ok(error instanceof SkipError);
            assert.ok(error instanceof TripwireError);
            assert.ok(error instanceof Error);
            assert.isTrue(isString(error.stack));
        });

        it("should carry props and an inner exception", () => {
            const inner = new Error("because");
            const error = new SkipError("skipped", { reason: "flaky" } as any, inner);

            assert.deepEqual(error.props, { reason: "flaky" });
            assert.equal((error as any).innerException, inner);
            assert.includes(error.message, "Caused by: because");
        });

        it("should serialise with toJSON", () => {
            const error: any = new SkipError("serialise me");

            const plain = error.toJSON();
            assert.equal(plain.name, "SkipError");
            assert.equal(plain.message, "serialise me");
            assert.isUndefined(plain.stack);

            assert.isTrue(isString(error.toJSON(true).stack));
        });

        it("should be catchable by type", () => {
            let caught: any = null;
            try {
                throw new SkipError("thrown");
            } catch (e) {
                caught = e;
            }

            assert.ok(caught instanceof SkipError);
            assert.isFalse(caught instanceof AbortError);
        });
    });

    describe("AbortError", () => {
        it("should be a TripwireError with its own name", () => {
            const error = new AbortError("Run aborted");

            assert.equal(error.name, "AbortError");
            assert.equal(error.message, "Run aborted");
            assert.ok(error instanceof AbortError);
            assert.ok(error instanceof TripwireError);
            assert.isTrue(isString(error.stack));
        });

        it("should carry props and an inner exception", () => {
            const inner = new Error("listener said so");
            const error = new AbortError("aborted", { source: "listener" } as any, inner);

            assert.deepEqual(error.props, { source: "listener" });
            assert.equal((error as any).innerException, inner);
            assert.includes(error.message, "Caused by: listener said so");
        });

        it("should serialise with toJSON", () => {
            const error: any = new AbortError("serialise me", {});

            const plain = error.toJSON();
            assert.equal(plain.name, "AbortError");
            assert.equal(plain.message, "serialise me");
            assert.isUndefined(plain.stack);

            assert.isTrue(isString(error.toJSON(true).stack));
        });
    });

    describe("TimeoutError", () => {
        it("should expose the timeout it reports", () => {
            const error = new TimeoutError("Timeout of 50ms exceeded", { timeoutMs: 50 });

            assert.equal(error.name, "TimeoutError");
            assert.equal(error.message, "Timeout of 50ms exceeded");
            assert.equal(error.timeoutMs, 50);
            assert.deepEqual(error.props, { timeoutMs: 50 });
            assert.ok(error instanceof TimeoutError);
            assert.ok(error instanceof TripwireError);
            assert.isTrue(isString(error.stack));
        });

        it("should keep the original timeout when a framework replaces it", () => {
            const error: any = new TimeoutError("Timeout", { timeoutMs: 50 });

            error.timeoutMs = 500;
            assert.equal(error.timeoutMs, 500);
            assert.equal(error.orgValues.timeoutMs, 50);
        });

        it("should carry an inner exception", () => {
            const inner = new Error("slow network");
            const error = new TimeoutError("Timeout", { timeoutMs: 10 }, inner);

            assert.equal((error as any).innerException, inner);
            assert.includes(error.message, "Caused by: slow network");
        });

        it("should serialise with toJSON including the timeout", () => {
            const error: any = new TimeoutError("serialise me", { timeoutMs: 75 });

            const plain = error.toJSON();
            assert.equal(plain.name, "TimeoutError");
            assert.equal(plain.message, "serialise me");
            assert.equal(plain.timeoutMs, 75);
            assert.isUndefined(plain.stack);

            assert.isTrue(isString(error.toJSON(true).stack));
        });
    });
});
