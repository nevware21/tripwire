/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "../../../src/assert/assertClass";
import { AssertionFailure } from "../../../src/assert/assertionError";

describe("assert.doesNotHaveAllKeys", () => {
    describe("positive cases - should pass", () => {
        it("should pass when object is missing at least one key", () => {
            assert.doesNotHaveAllKeys({ a: 1, b: 2 }, ["a", "b", "c"]);
        });

        it("should pass when object does not have the single key", () => {
            assert.doesNotHaveAllKeys({ greeting: "hello" }, "unknown");
        });

        it("should pass when object is missing all keys", () => {
            assert.doesNotHaveAllKeys({ a: 1 }, ["x", "y"]);
        });

        it("should pass with Map missing at least one key", () => {
            const map = new Map([["key1", "value1"]]);
            assert.doesNotHaveAllKeys(map, ["key1", "key2"]);
        });

        it("should pass with Set missing at least one key", () => {
            const set = new Set(["a", "b"]);
            assert.doesNotHaveAllKeys(set, ["a", "b", "c"]);
        });

        it("should pass with keys as array when missing a key", () => {
            assert.doesNotHaveAllKeys({ a: 1 }, ["a", "b"]);
        });
    });

    describe("negative cases - should fail with correct error message", () => {
        it("should fail when object has all the keys", () => {
            let error: AssertionFailure<any> | null = null;
            try {
                assert.doesNotHaveAllKeys({ a: 1, b: 2, c: 3 }, ["a", "b"]);
            } catch (e) {
                error = e as AssertionFailure<any>;
            }
            assert.isNotNull(error, "Expected assertion to fail");
            if (error) {
                const msg = error.message;
                const hasPattern = msg.includes("not") || msg.includes("key") || msg.includes("Key");
                assert.isTrue(hasPattern, "Error message should contain 'not', 'key', or 'Key' but got: " + msg);
            }
        });

        it("should fail when object has the single key", () => {
            let error: AssertionFailure<any> | null = null;
            try {
                assert.doesNotHaveAllKeys({ a: 1 }, "a");
            } catch (e) {
                error = e as AssertionFailure<any>;
            }
            assert.isNotNull(error, "Expected assertion to fail");
        });

        it("should fail when Map has all the keys", () => {
            let error: AssertionFailure<any> | null = null;
            try {
                const map = new Map([["key1", "value1"], ["key2", "value2"]]);
                assert.doesNotHaveAllKeys(map, ["key1", "key2"]);
            } catch (e) {
                error = e as AssertionFailure<any>;
            }
            assert.isNotNull(error, "Expected assertion to fail");
        });

        it("should fail when Set has all the keys", () => {
            let error: AssertionFailure<any> | null = null;
            try {
                const set = new Set(["a", "b", "c"]);
                assert.doesNotHaveAllKeys(set, ["a", "b"]);
            } catch (e) {
                error = e as AssertionFailure<any>;
            }
            assert.isNotNull(error, "Expected assertion to fail");
        });

        it("should fail when checking subset of keys that all exist", () => {
            let error: AssertionFailure<any> | null = null;
            try {
                assert.doesNotHaveAllKeys({ a: 1, b: 2, c: 3, d: 4 }, ["a", "c"]);
            } catch (e) {
                error = e as AssertionFailure<any>;
            }
            assert.isNotNull(error, "Expected assertion to fail");
        });

        it("should include custom message when provided", () => {
            let error: AssertionFailure<any> | null = null;
            try {
                assert.doesNotHaveAllKeys({ a: 1, b: 2 }, ["a"], "Custom does not have all keys error");
            } catch (e) {
                error = e as AssertionFailure<any>;
            }
            assert.isNotNull(error, "Expected assertion to fail");
            if (error) {
                assert.isTrue(error.message.includes("Custom does not have all keys error"), "Error should contain custom message");
            }
        });
    });
});
