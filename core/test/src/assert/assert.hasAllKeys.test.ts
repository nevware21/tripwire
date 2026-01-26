/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "../../../src/assert/assertClass";
import { AssertionFailure } from "../../../src/assert/assertionError";

describe("assert.hasAllKeys", () => {
    describe("positive cases - should pass", () => {
        it("should pass when object has all the keys", () => {
            assert.hasAllKeys({ a: 1, b: 2, c: 3 }, ["a", "b"]);
        });

        it("should pass when object has the single key", () => {
            assert.hasAllKeys({ greeting: "hello" }, "greeting");
        });

        it("should pass when object has exactly the specified keys", () => {
            assert.hasAllKeys({ a: 1, b: 2 }, ["a", "b"]);
        });

        it("should pass with Map containing all keys", () => {
            const map = new Map([["key1", "value1"], ["key2", "value2"]]);
            assert.hasAllKeys(map, ["key1", "key2"]);
        });

        it("should pass with Set containing all keys", () => {
            const set = new Set(["a", "b", "c"]);
            assert.hasAllKeys(set, ["a", "b"]);
        });

        it("should pass with keys as array", () => {
            assert.hasAllKeys({ a: 1, b: 2, c: 3 }, ["a", "b"]);
        });

        it("should pass with single key in object with multiple keys", () => {
            assert.hasAllKeys({ x: 1, y: 2, z: 3 }, "x");
        });
    });

    describe("negative cases - should fail with correct error message", () => {
        it("should fail when object is missing a key", () => {
            let error: AssertionFailure<any> | null = null;
            try {
                assert.hasAllKeys({ a: 1, b: 2 }, ["a", "b", "c"]);
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
                assert.hasAllKeys({ a: 1 }, "b");
            } catch (e) {
                error = e as AssertionFailure<any>;
            }
            assert.isNotNull(error, "Expected assertion to fail");
        });

        it("should fail when Map is missing some keys", () => {
            let error: AssertionFailure<any> | null = null;
            try {
                const map = new Map([["key1", "value1"]]);
                assert.hasAllKeys(map, ["key1", "key2"]);
            } catch (e) {
                error = e as AssertionFailure<any>;
            }
            assert.isNotNull(error, "Expected assertion to fail");
        });

        it("should fail when Set is missing some keys", () => {
            let error: AssertionFailure<any> | null = null;
            try {
                const set = new Set(["a"]);
                assert.hasAllKeys(set, ["a", "b"]);
            } catch (e) {
                error = e as AssertionFailure<any>;
            }
            assert.isNotNull(error, "Expected assertion to fail");
        });

        it("should fail when object is missing all keys", () => {
            let error: AssertionFailure<any> | null = null;
            try {
                assert.hasAllKeys({ a: 1 }, ["x", "y"]);
            } catch (e) {
                error = e as AssertionFailure<any>;
            }
            assert.isNotNull(error, "Expected assertion to fail");
        });

        it("should include custom message when provided", () => {
            let error: AssertionFailure<any> | null = null;
            try {
                assert.hasAllKeys({ a: 1 }, ["a", "b"], "Custom all keys error");
            } catch (e) {
                error = e as AssertionFailure<any>;
            }
            assert.isNotNull(error, "Expected assertion to fail");
            if (error) {
                assert.isTrue(error.message.includes("Custom all keys error"), "Error should contain custom message");
            }
        });
    });
});
