/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "../../../src/assert/assertClass";
import { AssertionFailure } from "../../../src/assert/assertionError";

describe("assert.hasAnyKeys", () => {
    describe("positive cases - should pass", () => {
        it("should pass when object has one of the keys", () => {
            assert.hasAnyKeys({ a: 1, b: 2 }, ["a", "c"]);
        });

        it("should pass when object has the single key", () => {
            assert.hasAnyKeys({ greeting: "hello" }, "greeting");
        });

        it("should pass when object has multiple matching keys", () => {
            assert.hasAnyKeys({ a: 1, b: 2, c: 3 }, ["a", "b"]);
        });

        it("should pass with Map containing the key", () => {
            const map = new Map([["key1", "value1"]]);
            assert.hasAnyKeys(map, ["key1", "key2"]);
        });

        it("should pass with Set containing the key", () => {
            const set = new Set(["a", "b", "c"]);
            assert.hasAnyKeys(set, ["a", "z"]);
        });

        it("should pass when checking multiple keys and one exists", () => {
            assert.hasAnyKeys({ x: 1, y: 2, z: 3 }, ["a", "b", "x"]);
        });

        it("should pass with keys as array", () => {
            assert.hasAnyKeys({ a: 1, b: 2 }, ["a", "c"]);
        });
    });

    describe("negative cases - should fail with correct error message", () => {
        it("should fail when object has none of the keys", () => {
            let error: AssertionFailure<any> | null = null;
            try {
                assert.hasAnyKeys({ a: 1, b: 2 }, ["c", "d"]);
            } catch (e) {
                error = e as AssertionFailure<any>;
            }
            assert.isNotNull(error, "Expected assertion to fail");
            if (error) {
                const msg = error.message;
                const hasPattern = msg.includes("key") || msg.includes("Key");
                assert.isTrue(hasPattern, "Error message should contain 'key' or 'Key' but got: " + msg);
            }
        });

        it("should fail when object does not have the single key", () => {
            let error: AssertionFailure<any> | null = null;
            try {
                assert.hasAnyKeys({ a: 1 }, "b");
            } catch (e) {
                error = e as AssertionFailure<any>;
            }
            assert.isNotNull(error, "Expected assertion to fail");
        });

        it("should fail when Map has none of the keys", () => {
            let error: AssertionFailure<any> | null = null;
            try {
                const map = new Map([["key1", "value1"]]);
                assert.hasAnyKeys(map, ["key2", "key3"]);
            } catch (e) {
                error = e as AssertionFailure<any>;
            }
            assert.isNotNull(error, "Expected assertion to fail");
        });

        it("should fail when Set has none of the keys", () => {
            let error: AssertionFailure<any> | null = null;
            try {
                const set = new Set(["a", "b"]);
                assert.hasAnyKeys(set, ["x", "y", "z"]);
            } catch (e) {
                error = e as AssertionFailure<any>;
            }
            assert.isNotNull(error, "Expected assertion to fail");
        });

        it("should include custom message when provided", () => {
            let error: AssertionFailure<any> | null = null;
            try {
                assert.hasAnyKeys({ a: 1 }, ["b", "c"], "Custom key error");
            } catch (e) {
                error = e as AssertionFailure<any>;
            }
            assert.isNotNull(error, "Expected assertion to fail");
            if (error) {
                assert.isTrue(error.message.includes("Custom key error"), "Error should contain custom message");
            }
        });
    });
});
