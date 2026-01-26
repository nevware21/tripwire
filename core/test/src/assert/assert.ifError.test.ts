/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "../../../src/assert/assertClass";
import { expect } from "../../../src/assert/expect";
import { checkError } from "../support/checkError";

describe("assert.ifError", () => {
    describe("basic functionality - falsy values should pass", () => {
        it("should pass for null", () => {
            assert.ifError(null);
        });

        it("should pass for undefined", () => {
            assert.ifError(undefined);
        });

        it("should pass for false", () => {
            assert.ifError(false);
        });

        it("should pass for 0", () => {
            assert.ifError(0);
        });

        it("should pass for empty string", () => {
            assert.ifError("");
        });

        it("should pass for NaN", () => {
            assert.ifError(NaN);
        });
    });

    describe("Error instances should be thrown", () => {
        it("should throw Error instance", () => {
            let err = new Error("This is an error message");
            try {
                assert.ifError(err);
                throw new Error("Should have thrown the error");
            } catch (e: any) {
                if (e.message !== "This is an error message") {
                    throw new Error("Expected the original error to be thrown, got: " + e.message);
                }
            }
        });

        it("should throw TypeError instance", () => {
            let err = new TypeError("Type error occurred");
            try {
                assert.ifError(err);
                throw new Error("Should have thrown the error");
            } catch (e: any) {
                if (e.message !== "Type error occurred") {
                    throw new Error("Expected the TypeError to be thrown, got: " + e.message);
                }
            }
        });

        it("should throw RangeError instance", () => {
            let err = new RangeError("Range error occurred");
            try {
                assert.ifError(err);
                throw new Error("Should have thrown the error");
            } catch (e: any) {
                if (e.message !== "Range error occurred") {
                    throw new Error("Expected the RangeError to be thrown, got: " + e.message);
                }
            }
        });

        it("should throw custom Error subclass", () => {
            class CustomError extends Error {
                constructor(message: string) {
                    super(message);
                    this.name = "CustomError";
                }
            }

            let err = new CustomError("Custom error occurred");
            try {
                assert.ifError(err);
                throw new Error("Should have thrown the error");
            } catch (e: any) {
                if (e.message !== "Custom error occurred") {
                    throw new Error("Expected the CustomError to be thrown, got: " + e.message);
                }
                if (e.name !== "CustomError") {
                    throw new Error("Expected CustomError type, got: " + e.name);
                }
            }
        });
    });

    describe("truthy non-Error values should fail", () => {
        it("should fail for true", () => {
            checkError(() => assert.ifError(true), "expected true to be falsy or an Error");
        });

        it("should fail for non-zero number", () => {
            checkError(() => assert.ifError(1), "expected 1 to be falsy or an Error");
            checkError(() => assert.ifError(-1), "expected -1 to be falsy or an Error");
            checkError(() => assert.ifError(123), "expected 123 to be falsy or an Error");
        });

        it("should fail for non-empty string", () => {
            checkError(() => assert.ifError("error"), "expected \"error\" to be falsy or an Error");
            checkError(() => assert.ifError("hello"), "expected \"hello\" to be falsy or an Error");
        });

        it("should fail for objects", () => {
            checkError(() => assert.ifError({}), "expected {} to be falsy or an Error");
            checkError(() => assert.ifError({ a: 1 }), "to be falsy or an Error");
        });

        it("should fail for arrays", () => {
            checkError(() => assert.ifError([]), "expected [] to be falsy or an Error");
            checkError(() => assert.ifError([1, 2, 3]), "expected [1,2,3] to be falsy or an Error");
        });

        it("should fail for functions", () => {
            checkError(() => assert.ifError(() => {}), "to be falsy or an Error");
        });

        it("should fail for Date", () => {
            let date = new Date("2020-01-01");
            checkError(() => assert.ifError(date), "to be falsy or an Error");
        });

        it("should fail for RegExp", () => {
            checkError(() => assert.ifError(/test/), "expected /test/ to be falsy or an Error");
        });

        it("should fail for Symbol", () => {
            let sym = Symbol("test");
            checkError(() => assert.ifError(sym), "to be falsy or an Error");
        });

        it("should fail for Map", () => {
            checkError(() => assert.ifError(new Map()), "to be falsy or an Error");
        });

        it("should fail for Set", () => {
            checkError(() => assert.ifError(new Set()), "to be falsy or an Error");
        });
    });

    describe("custom messages", () => {
        it("should use custom message for truthy non-Error values", () => {
            checkError(() => assert.ifError(true, "Custom error message"), "Custom error message");
        });

        it("should use custom message with other truthy values", () => {
            checkError(() => assert.ifError("value", "Value should be falsy"), "Value should be falsy");
            checkError(() => assert.ifError(123, "Number should be falsy"), "Number should be falsy");
        });

        // Note: custom message is NOT used when throwing an Error instance
        // The Error instance itself is thrown, not an AssertionFailure
    });

    describe("edge cases", () => {
        it("should handle Error with empty message", () => {
            let err = new Error("");
            try {
                assert.ifError(err);
                throw new Error("Should have thrown the error");
            } catch (e: any) {
                if (e.message !== "") {
                    throw new Error("Expected empty error message, got: " + e.message);
                }
            }
        });

        it("should handle Error-like objects that are not Error instances", () => {
            // Objects that look like errors but aren't Error instances should fail
            let fakeError = {
                message: "I look like an error",
                name: "FakeError",
                stack: "fake stack"
            };
            checkError(() => assert.ifError(fakeError), "to be falsy or an Error");
        });

        it("should handle Infinity", () => {
            checkError(() => assert.ifError(Infinity), "expected Infinity to be falsy or an Error");
            checkError(() => assert.ifError(-Infinity), "expected -Infinity to be falsy or an Error");
        });

        it("should handle BigInt values", () => {
            // BigInt(0) is falsy, so it should pass
            assert.ifError(BigInt(0));
            // BigInt(1) is truthy, so it should fail
            checkError(() => assert.ifError(BigInt(1)), "to be falsy or an Error");
        });
    });

    describe("expect syntax", () => {
        it("should pass for falsy values using expect", () => {
            expect(null).to.ifError();
            expect(undefined).to.ifError();
            expect(false).to.ifError();
            expect(0).to.ifError();
            expect("").to.ifError();
            expect(NaN).to.ifError();
        });

        it("should throw Error instance when using expect", () => {
            let err = new Error("Test error");
            try {
                expect(err).to.ifError();
                throw new Error("Should have thrown the error");
            } catch (e: any) {
                if (e.message !== "Test error") {
                    throw new Error("Expected the original error to be thrown, got: " + e.message);
                }
            }
        });

        it("should fail for truthy non-Error values using expect", () => {
            checkError(() => expect(true).to.ifError(), "to be falsy or an Error");
            checkError(() => expect(1).to.ifError(), "to be falsy or an Error");
            checkError(() => expect("error").to.ifError(), "to be falsy or an Error");
        });
    });

    describe("typical use cases", () => {
        it("should work in Node.js-style callback pattern", () => {
            function someAsyncOperation(callback: (err: Error | null, result?: string) => void) {
                // Simulate success
                callback(null, "success");
            }

            someAsyncOperation((err, result) => {
                assert.ifError(err); // Should pass
                if (result !== "success") {
                    throw new Error("Expected success");
                }
            });
        });

        it("should throw in Node.js-style callback with error", () => {
            function someAsyncOperation(callback: (err: Error | null, result?: string) => void) {
                // Simulate error
                callback(new Error("Operation failed"));
            }

            someAsyncOperation((err, result) => {
                try {
                    assert.ifError(err);
                    throw new Error("Should have thrown the error");
                } catch (e: any) {
                    if (e.message !== "Operation failed") {
                        throw new Error("Expected operation error, got: " + e.message);
                    }
                }
            });
        });

        it("should work with try-catch error handling", () => {
            let err: Error | null = null;
            
            try {
                // Some operation that might throw
                throw new Error("Something went wrong");
            } catch (e: any) {
                err = e;
            }
            
            try {
                assert.ifError(err);
                throw new Error("Should have thrown the error");
            } catch (e: any) {
                if (e.message !== "Something went wrong") {
                    throw new Error("Expected the caught error to be thrown, got: " + e.message);
                }
            }
        });

        it("should work when no error occurs", () => {
            let err: Error | null = null;
            
            try {
                // Some operation that doesn't throw
                let x = 1 + 1;
                assert.equal(x, 2);
            } catch (e: any) {
                err = e;
            }
            
            // Should pass since err is null
            assert.ifError(err);
        });
    });
});
