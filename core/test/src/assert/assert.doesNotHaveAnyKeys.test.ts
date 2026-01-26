/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "../../../src/assert/assertClass";
import { AssertionFailure } from "../../../src/assert/assertionError";

describe("assert.doesNotHaveAnyKeys", () => {
    describe("positive cases - should pass", () => {
        it("should pass when object has none of the keys", () => {
            assert.doesNotHaveAnyKeys({ a: 1, b: 2 }, ["c", "d"]);
        });

        it("should pass when object does not have the single key", () => {
            assert.doesNotHaveAnyKeys({ greeting: "hello" }, "unknown");
        });

        it("should pass with Map not containing any of the keys", () => {
            const map = new Map([["key1", "value1"]]);
            assert.doesNotHaveAnyKeys(map, ["key2", "key3"]);
        });

        it("should pass with Set not containing any of the keys", () => {
            const set = new Set(["a", "b", "c"]);
            assert.doesNotHaveAnyKeys(set, ["x", "y", "z"]);
        });

        it("should pass with keys as array", () => {
            assert.doesNotHaveAnyKeys({ a: 1, b: 2 }, ["c", "d"]);
        });
    });

    describe("negative cases - should fail with correct error message", () => {
        it("should fail when object has one of the keys", () => {
            let error: AssertionFailure<any> | null = null;
            try {
                assert.doesNotHaveAnyKeys({ a: 1, b: 2 }, ["a", "c"]);
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
                assert.doesNotHaveAnyKeys({ a: 1 }, "a");
            } catch (e) {
                error = e as AssertionFailure<any>;
            }
            assert.isNotNull(error, "Expected assertion to fail");
        });

        it("should fail when Map has one of the keys", () => {
            let error: AssertionFailure<any> | null = null;
            try {
                const map = new Map([["key1", "value1"]]);
                assert.doesNotHaveAnyKeys(map, ["key1", "key2"]);
            } catch (e) {
                error = e as AssertionFailure<any>;
            }
            assert.isNotNull(error, "Expected assertion to fail");
        });

        it("should fail when Set has one of the keys", () => {
            let error: AssertionFailure<any> | null = null;
            try {
                const set = new Set(["a", "b", "c"]);
                assert.doesNotHaveAnyKeys(set, ["a", "x", "y"]);
            } catch (e) {
                error = e as AssertionFailure<any>;
            }
            assert.isNotNull(error, "Expected assertion to fail");
        });

        it("should fail when object has all the specified keys", () => {
            let error: AssertionFailure<any> | null = null;
            try {
                assert.doesNotHaveAnyKeys({ a: 1, b: 2 }, ["a", "b"]);
            } catch (e) {
                error = e as AssertionFailure<any>;
            }
            assert.isNotNull(error, "Expected assertion to fail");
        });

        it("should include custom message when provided", () => {
            let error: AssertionFailure<any> | null = null;
            try {
                assert.doesNotHaveAnyKeys({ a: 1 }, ["a"], "Custom does not have any keys error");
            } catch (e) {
                error = e as AssertionFailure<any>;
            }
            assert.isNotNull(error, "Expected assertion to fail");
            if (error) {
                assert.isTrue(error.message.includes("Custom does not have any keys error"), "Error should contain custom message");
            }
        });
    });
});
