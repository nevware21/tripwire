/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { _extractArgs, assert } from "../../../src/assert/assertClass";

describe("_extractArgs", function () {
    this.timeout(5000);

    describe("with no message index (default -1)", () => {
        it("should extract message from last position by default", () => {
            const result = _extractArgs([42, "test message"], -1, 1);

            assert.equal(result.act, 42);
            assert.equal(result.msg, "test message");
            assert.isArray(result.args);
            assert.equal(result.args.length, 0);
            assert.equal(result.m, 12);
        });

        it("should extract actual value when only one arg and no message", () => {
            const result = _extractArgs([42], -1, 1);

            assert.equal(result.act, 42);
            assert.isUndefined(result.msg);
            assert.isArray(result.args);
            assert.equal(result.args.length, 0);
            assert.equal(result.m, 2);
        });

        it("should extract message from last position when numArgs < theArgs.length", () => {
            const result = _extractArgs([42, 100, 200], -1, 1);

            assert.equal(result.act, 42);
            assert.equal(result.msg, 200); // Last arg is extracted as message when numArgs (1) < theArgs.length (3)
            assert.isArray(result.args);
            assert.equal(result.args.length, 1);
            assert.equal(result.args[0], 100);
            assert.equal(result.m, 11);
        });
    });

    describe("with positive message index", () => {
        it("should extract message from specified positive index (index 0)", () => {
            const result = _extractArgs(["test message", 42, 100], 0, 1);

            assert.equal(result.msg, "test message");
            assert.equal(result.act, 42);
            assert.isArray(result.args);
            assert.equal(result.args.length, 1);
            assert.equal(result.args[0], 100);
            assert.equal(result.m, 1);
        });

        it("should extract message from specified positive index (index 1)", () => {
            const result = _extractArgs([42, "test message", 100], 1, 1);

            assert.equal(result.act, 42);
            assert.equal(result.msg, "test message");
            assert.isArray(result.args);
            assert.equal(result.args.length, 1);
            assert.equal(result.args[0], 100);
            assert.equal(result.m, 10);
        });

        it("should extract message from specified positive index (index 2)", () => {
            const result = _extractArgs([42, 100, "test message"], 2, 1);

            assert.equal(result.act, 42);
            assert.equal(result.msg, "test message");
            assert.isArray(result.args);
            assert.equal(result.args.length, 1);
            assert.equal(result.args[0], 100);
            assert.equal(result.m, 11);
        });

        it("should not extract message if index is out of bounds", () => {
            const result = _extractArgs([42, 100], 5, 1);

            assert.equal(result.act, 42);
            assert.isUndefined(result.msg);
            assert.isArray(result.args);
            assert.equal(result.args.length, 1);
            assert.equal(result.args[0], 100);
            assert.equal(result.m, 1); // No message, simple slice mode
        });
    });

    describe("with negative message index", () => {
        it("should extract message from end (index -1)", () => {
            const result = _extractArgs([42, 100, "test message"], -1, 1);

            assert.equal(result.act, 42);
            assert.equal(result.msg, "test message");
            assert.isArray(result.args);
            assert.equal(result.args.length, 1);
            assert.equal(result.args[0], 100);
            assert.equal(result.m, 11);
        });

        it("should extract message from end (index -2)", () => {
            const result = _extractArgs([42, "test message", 100], -2, 1);

            assert.equal(result.act, 42);
            assert.equal(result.msg, "test message");
            assert.isArray(result.args);
            assert.equal(result.args.length, 1);
            assert.equal(result.args[0], 100);
            assert.equal(result.m, 10);
        });

        it("should only extract negative index message when numArgs condition is met", () => {
            // When numArgs >= argLen, negative index should not extract
            const result = _extractArgs([42, "test message"], -1, 3);

            assert.equal(result.act, 42);
            assert.isUndefined(result.msg);
            assert.isArray(result.args);
            assert.equal(result.args.length, 1);
            assert.equal(result.args[0], "test message");
            assert.equal(result.m, 1); // No message extracted, simple slice mode
        });
    });

    describe("with numArgs = 0 (no actual value expected)", () => {
        it("should not extract actual value when numArgs is 0", () => {
            const result = _extractArgs([100, 200, "test message"], -1, 0);

            assert.isUndefined(result.act);
            assert.equal(result.msg, "test message");
            assert.isArray(result.args);
            assert.equal(result.args.length, 2);
            assert.equal(result.args[0], 100);
            assert.equal(result.args[1], 200);
            assert.equal(result.m, 11); // Message at last position, slice mode
        });

        it("should extract message from last position when numArgs is 0 and numArgs < theArgs.length", () => {
            const result = _extractArgs([100, 200, 300], -1, 0);

            assert.isUndefined(result.act);
            assert.equal(result.msg, 300); // Last arg is extracted as message when numArgs (0) < theArgs.length (3)
            assert.isArray(result.args);
            assert.equal(result.args.length, 2);
            assert.equal(result.args[0], 100);
            assert.equal(result.args[1], 200);
            assert.equal(result.m, 11); // Message at last position, slice mode
        });
    });

    describe("with numArgs = 2 (actual value + 1 expected arg)", () => {
        it("should extract actual value and scope arg, with message from last position", () => {
            const result = _extractArgs([42, 100, 200], -1, 2);

            assert.equal(result.act, 42);
            assert.equal(result.msg, 200); // Last arg extracted as message when numArgs (2) < theArgs.length (3)
            assert.isArray(result.args);
            assert.equal(result.args.length, 1);
            assert.equal(result.args[0], 100);
            assert.equal(result.m, 11); // Message at last position, slice mode
        });

        it("should extract actual value, scope arg, and message", () => {
            const result = _extractArgs([42, 100, "test message"], -1, 2);

            assert.equal(result.act, 42);
            assert.equal(result.msg, "test message");
            assert.isArray(result.args);
            assert.equal(result.args.length, 1);
            assert.equal(result.args[0], 100);
            assert.equal(result.m, 11); // Message at last position, slice mode
        });
    });

    describe("edge cases", () => {
        it("should handle empty args array", () => {
            const result = _extractArgs([], -1, 1);

            assert.isUndefined(result.act);
            assert.isUndefined(result.msg);
            assert.isArray(result.args);
            assert.equal(result.args.length, 0);
            assert.equal(result.m, 0); // Empty array, no processing mode
        });

        it("should extract single arg as message when numArgs = 0 and numArgs < theArgs.length", () => {
            const result = _extractArgs([42], -1, 0);

            assert.isUndefined(result.act);
            assert.equal(result.msg, 42); // Single arg extracted as message when numArgs (0) < theArgs.length (1)
            assert.isArray(result.args);
            assert.equal(result.args.length, 0);
            assert.equal(result.m, 2); // Message at index 0, empty scopeArgs
        });

        it("should handle message at first position with numArgs = 0", () => {
            const result = _extractArgs(["test message", 100, 200], 0, 0);

            assert.isUndefined(result.act);
            assert.equal(result.msg, "test message");
            assert.isArray(result.args);
            assert.equal(result.args.length, 2);
            assert.equal(result.args[0], 100);
            assert.equal(result.args[1], 200);
            assert.equal(result.m, 1); // Message at index 0, simple slice mode
        });

        it("should handle undefined message index", () => {
            const result = _extractArgs([42, 100, 200], undefined, 1);

            assert.equal(result.act, 42);
            assert.isUndefined(result.msg);
            assert.isArray(result.args);
            assert.equal(result.args.length, 2);
            assert.equal(result.args[0], 100);
            assert.equal(result.args[1], 200);
            assert.equal(result.m, 1); // No message, simple slice mode
        });

        it("should preserve arg types correctly", () => {
            const obj = { a: 1 };
            const arr = [1, 2, 3];
            const fn = () => {};

            const result = _extractArgs([obj, arr, fn, "msg"], -1, 1);

            assert.equal(result.act, obj);
            assert.equal(result.msg, "msg");
            assert.equal(result.args[0], arr);
            assert.equal(result.args[1], fn);
            assert.equal(result.m, 11); // Message at last position, slice mode
        });

        it("should handle null and undefined values correctly", () => {
            const result = _extractArgs([null, undefined, 0, "msg"], -1, 1);

            assert.isNull(result.act);
            assert.equal(result.msg, "msg");
            assert.isArray(result.args);
            assert.equal(result.args.length, 2);
            assert.isUndefined(result.args[0]);
            assert.equal(result.args[1], 0);
            assert.equal(result.m, 11); // Message at last position, slice mode
        });
    });

    describe("performance optimization validation", () => {
        it("should not modify original args array", () => {
            const originalArgs = [42, 100, "test message"];
            const argsCopy = [...originalArgs];

            const result = _extractArgs(originalArgs, -1, 1);

            assert.deepEqual(originalArgs, argsCopy);
            assert.equal(result.m, 11); // Message at last position, slice mode
        });

        it("should handle many arguments efficiently", () => {
            const manyArgs: any[] = Array.from({ length: 100 }, (_, i) => i);
            manyArgs.push("test message");

            const result = _extractArgs(manyArgs, -1, 1);

            assert.equal(result.act, 0);
            assert.equal(result.msg, "test message");
            assert.equal(result.args.length, 99);
            assert.equal(result.args[0], 1);
            assert.equal(result.args[98], 99);
            assert.equal(result.m, 11); // Message at last position, slice mode
        });

        it("should create scopeArgs only when needed", () => {
            // Single arg, no additional scope args
            const result1 = _extractArgs([42], -1, 1);
            assert.isArray(result1.args);
            assert.equal(result1.args.length, 0);
            assert.equal(result1.m, 2); // Single arg, empty scopeArgs mode

            // Single arg + message, no additional scope args
            const result2 = _extractArgs([42, "msg"], -1, 1);
            assert.isArray(result2.args);
            assert.equal(result2.args.length, 0);
            assert.equal(result2.m, 12); // Message at last, empty scopeArgs mode
        });
    });

    describe("real-world usage scenarios", () => {
        it("should handle assert.equal(actual, expected, message) pattern", () => {
            const result = _extractArgs([42, 42, "should be equal"], -1, 2);

            assert.equal(result.act, 42);
            assert.equal(result.args[0], 42);
            assert.equal(result.msg, "should be equal");
            assert.equal(result.m, 11); // Message at last position, slice mode
        });

        it("should handle assert.throws(fn, error, message) pattern", () => {
            const fn = () => {};
            const errorType = Error;

            const result = _extractArgs([fn, errorType, "should throw"], -1, 3);

            assert.equal(result.act, fn);
            assert.equal(result.args[0], errorType);
            // When numArgs (3) >= theArgs.length (3), NO message extracted
            assert.isUndefined(result.msg);
            assert.equal(result.args.length, 2);
            assert.equal(result.args[1], "should throw"); // Message becomes a scope arg
            assert.equal(result.m, 1); // No message extracted, simple slice mode
        });

        it("should handle assert.fail(message) pattern", () => {
            const result = _extractArgs(["failure message"], -1, 0);

            assert.isUndefined(result.act);
            assert.equal(result.msg, "failure message");
            assert.equal(result.args.length, 0);
            assert.equal(result.m, 2); // Single arg extracted as message, empty scopeArgs
        });

        it("should handle assert.hasProperty(obj, prop, value, message) pattern", () => {
            const obj = { a: 1 };

            const result = _extractArgs([obj, "a", 1, "should have property"], -1, 3);

            assert.equal(result.act, obj);
            assert.equal(result.args[0], "a");
            assert.equal(result.args[1], 1);
            assert.equal(result.msg, "should have property");
            assert.equal(result.m, 11); // Message at last position, slice mode
        });

        it("should handle message at custom position (index 1)", () => {
            // Simulating message at position 1, not at the end
            const result = _extractArgs([42, "custom message", 100, 200], 1, 1);

            assert.equal(result.act, 42);
            assert.equal(result.msg, "custom message");
            assert.isArray(result.args);
            assert.equal(result.args.length, 2);
            assert.equal(result.args[0], 100);
            assert.equal(result.args[1], 200);
            assert.equal(result.m, 10); // Message at middle position, iterate and skip mode
        });
    });
});
