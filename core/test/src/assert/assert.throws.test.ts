/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "../../../src/assert/assertClass";
import { AssertionFailure } from "../../../src/assert/assertionError";
import { expect } from "../../../src/assert/expect";
import { checkError } from "../support/checkError";

describe("assert.throws", () => {

    it("Matching types but wrong message should throw AssertionFailure with a custom message", () => {
        checkError(() => {
            assert.throws(function() {
                throw new Error("This is a message");
            }, Error, "Another message");
        }, "expected [Function] to throw an error of type Error() with a message containing \"Another message\" but [Error:\"This is a message\"] was thrown", false);

        checkError(() => {
            assert.throws(function() {
                throw new TypeError("This is a message");
            }, ReferenceError, "This is a message");
        }, "expected [Function] to throw an error of type ReferenceError() with a message containing \"This is a message\" but [TypeError:\"This is a message\"] was thrown", false);
    });

    it("should pass when the function throws an error", () => {
        assert.throws(() => {
            throw new Error("test");
        });
    });

    it("should pass when the function throws a TypeError and checked against TypeError", () => {
        assert.throws(() => {
            throw new TypeError("test");
        }, TypeError);
    });

    it("should pass when the function throws an error with a message matching the regex", () => {
        assert.throws(() => {
            throw new Error("test");
        }, /test/);
    });

    it("should pass when the function throws an error with a message matching the string", () => {
        assert.throws(() => {
            throw new Error("test");
        }, Error, "test");
    });

    it("should throw AssertionFailure when the function does not throw an error", () => {
        checkError(() => {
            assert.throws(() => {});
        }, "expected [Function] to throw an error");

        expect(() => assert.throws(() => {})).toThrow(AssertionFailure);
    });

    it("should throw AssertionFailure when the function throws an error but checked against a different error type", () => {
        checkError(() => {
            assert.throws(() => {
                throw new Error("test");
            }, TypeError);
        }, "expected [Function] to throw an error of type TypeError() but threw [Error:\"test\"]", false);

        expect(() => assert.throws(() => {
            throw new Error("test");
        }, TypeError)).toThrow(AssertionFailure);
    });

    it("should throw AssertionFailure when the function throws an error but the message does not match the regex", () => {
        checkError(() => {
            assert.throws(() => {
                throw new Error("test");
            }, /nomatch/);
        }, "with a message matching /nomatch/", false);

        expect(() => assert.throws(() => {
            throw new Error("test");
        }, /nomatch/)).toThrow(AssertionFailure);
    });

    it("should throw AssertionFailure with a custom message when the function does not throw an error", () => {
        //assertConfig.fullStack = true;
        const customMessage = "Custom error message";

        checkError(() => {
            assert.throws(() => { }, null, customMessage);
        }, customMessage);

        expect(() => assert.throws(() => {}, null, null, customMessage)).toThrowError(new AssertionFailure(customMessage));
    });

    it("should assert when not passed a function", () => {
        checkError(() => {
            assert.throws(null as any);
        }, "expected null to be a function", false);

        expect(() => assert.throws(null as any)).toThrow(AssertionFailure);

        checkError(() => {
            assert.throws(undefined as any);
        }, "expected undefined to be a function", false);

        expect(() => assert.throws(undefined as any)).toThrow(AssertionFailure);

        checkError(() => {
            assert.throws(1 as any);
        }, "expected 1 to be a function", false);

        expect(() => assert.throws(1 as any)).toThrow(AssertionFailure);

        checkError(() => {
            assert.throws("test" as any);
        }, "expected \"test\" to be a function", false);

        expect(() => assert.throws("test" as any)).toThrow(AssertionFailure);
    });
});
