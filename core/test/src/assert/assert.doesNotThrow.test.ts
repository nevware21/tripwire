/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "../../../src/assert/assertClass";
import { AssertionFailure } from "../../../src/assert/assertionError";

describe("assert.doesNotThrow", () => {
    describe("positive cases - should pass", () => {
        it("should pass when function does not throw", () => {
            assert.doesNotThrow(() => {
                // No error
            });
        });

        it("should pass when function returns a value", () => {
            assert.doesNotThrow(() => {
                return 42;
            });
        });

        it("should pass when function does not throw specified error type", () => {
            assert.doesNotThrow(() => {
                // No throw
            }, TypeError);
        });

        it("should pass when function performs operations without error", () => {
            assert.doesNotThrow(() => {
                const arr = [1, 2, 3];
                arr.push(4);
                return arr.length;
            });
        });

        it("should pass with async-like synchronous code", () => {
            assert.doesNotThrow(() => {
                const promise = Promise.resolve(42);
                return promise;
            });
        });
    });

    describe("negative cases - should fail with correct error message", () => {
        it("should fail when function throws an error", () => {
            let error: AssertionFailure<any> | null = null;
            try {
                assert.doesNotThrow(() => {
                    throw new Error("test error");
                });
            } catch (e) {
                error = e as AssertionFailure<any>;
            }
            assert.isNotNull(error, "Expected assertion to fail");
            if (error) {
                const msg = error.message;
                const hasPattern = msg.includes("not") || msg.includes("throw") || msg.includes("Throw");
                assert.isTrue(hasPattern, "Error message should contain 'not', 'throw', or 'Throw' but got: " + msg);
            }
        });

        it("should fail when function throws matching error type", () => {
            let error: AssertionFailure<any> | null = null;
            try {
                assert.doesNotThrow(() => {
                    throw new TypeError("type error");
                }, TypeError);
            } catch (e) {
                error = e as AssertionFailure<any>;
            }
            assert.isNotNull(error, "Expected assertion to fail");
        });

        it("should fail when function throws with matching message", () => {
            let error: AssertionFailure<any> | null = null;
            try {
                assert.doesNotThrow(() => {
                    throw new Error("specific message");
                }, /specific/);
            } catch (e) {
                error = e as AssertionFailure<any>;
            }
            assert.isNotNull(error, "Expected assertion to fail");
        });

        it("should fail when function throws generic Error", () => {
            let error: AssertionFailure<any> | null = null;
            try {
                assert.doesNotThrow(() => {
                    throw new Error("generic error");
                }, Error);
            } catch (e) {
                error = e as AssertionFailure<any>;
            }
            assert.isNotNull(error, "Expected assertion to fail");
        });

        it("should include custom message when provided", () => {
            let error: AssertionFailure<any> | null = null;
            try {
                assert.doesNotThrow(() => {
                    throw new Error("test");
                }, null, null, "Custom error message");
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
