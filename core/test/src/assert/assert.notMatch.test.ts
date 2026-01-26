/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "../../../src/assert/assertClass";
import { AssertionFailure } from "../../../src/assert/assertionError";

describe("assert.notMatch", () => {
    describe("positive cases - should pass", () => {
        it("should pass when string does not match regex", () => {
            assert.notMatch("hello world", /goodbye/);
        });

        it("should pass when value does not match pattern", () => {
            assert.notMatch("abc", /xyz/);
        });

        it("should pass with full string non-match", () => {
            assert.notMatch("hello", /^goodbye$/);
        });

        it("should pass when numeric pattern does not match", () => {
            assert.notMatch("abc", /\d+/);
        });

        it("should pass with case-sensitive non-match", () => {
            assert.notMatch("HELLO", /hello/);
        });
    });

    describe("negative cases - should fail with correct error message", () => {
        it("should fail when string matches regex", () => {
            let error: AssertionFailure<any> | null = null;
            try {
                assert.notMatch("hello world", /hello/);
            } catch (e) {
                error = e as AssertionFailure<any>;
            }
            assert.isNotNull(error, "Expected assertion to fail");
            if (error) {
                const msg = error.message;
                const hasPattern = msg.includes("not") || msg.includes("match") || msg.includes("Match");
                assert.isTrue(hasPattern, "Error message should contain 'not', 'match', or 'Match' but got: " + msg);
            }
        });

        it("should fail when pattern matches", () => {
            let error: AssertionFailure<any> | null = null;
            try {
                assert.notMatch("test123", /\d+/);
            } catch (e) {
                error = e as AssertionFailure<any>;
            }
            assert.isNotNull(error, "Expected assertion to fail");
        });

        it("should fail when entire string matches", () => {
            let error: AssertionFailure<any> | null = null;
            try {
                assert.notMatch("abc", /^abc$/);
            } catch (e) {
                error = e as AssertionFailure<any>;
            }
            assert.isNotNull(error, "Expected assertion to fail");
        });

        it("should include custom message when provided", () => {
            let error: AssertionFailure<any> | null = null;
            try {
                assert.notMatch("abc", /abc/, "Custom error message");
            } catch (e) {
                error = e as AssertionFailure<any>;
            }
            assert.isNotNull(error, "Expected assertion to fail");
            if (error) {
                assert.isTrue(error.message.includes("Custom error message"), "Error should contain custom message");
            }
        });
    });
});
