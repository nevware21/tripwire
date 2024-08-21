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

describe("assert.isUndefined", () => {
    it("should pass when the value is undefined", () => {
        assert.isUndefined(undefined);
    });

    it("should throw AssertionFailure when the value is null", () => {
        checkError(() => {
            assert.isUndefined(null);
        }, "expected null to be undefined");

        expect(() => assert.isUndefined(null)).toThrow(AssertionFailure);
    });

    it("should throw AssertionFailure when the value is 0", () => {
        checkError(() => {
            assert.isUndefined(0);
        }, "expected 0 to be undefined");

        expect(() => assert.isUndefined(0)).toThrow(AssertionFailure);
    });

    it("should throw AssertionFailure when the value is an empty string", () => {
        checkError(() => {
            assert.isUndefined("");
        }, "expected \"\" to be undefined");

        expect(() => assert.isUndefined("")).toThrow(AssertionFailure);
    });

    it("should throw AssertionFailure when the value is the string \"undefined\"", () => {
        checkError(() => {
            assert.isUndefined("undefined");
        }, "expected \"undefined\" to be undefined");

        expect(() => assert.isUndefined("")).toThrow(AssertionFailure);
    });

    it("should throw AssertionFailure when the value is a non-undefined object", () => {
        checkError(() => {
            assert.isUndefined({});
        }, "expected {} to be undefined");

        expect(() => assert.isUndefined({})).toThrow(AssertionFailure);
    });

    it("should throw AssertionFailure with a custom message when the value is not undefined", () => {
        const customMessage = "Custom error message";
        checkError(() => {
            assert.isUndefined(1, customMessage);
        }, customMessage);

        expect(() => assert.isUndefined(1, customMessage)).toThrow(new AssertionFailure(customMessage));
    });
});

describe("assert.isNotUndefined", () => {
    it("should pass when the value is a number", () => {
        assert.isNotUndefined(1);
    });

    it("should pass when the value is a string", () => {
        assert.isNotUndefined("string");
    });

    it("should pass when the value is null", () => {
        assert.isNotUndefined(null);
    });

    it("should pass when the value is an object", () => {
        assert.isNotUndefined({});
    });

    it("should throw AssertionFailure when the value is undefined", () => {
        checkError(() => {
            assert.isNotUndefined(undefined);
        }, "not expected undefined to be undefined");

        expect(() => assert.isNotUndefined(undefined)).toThrow(AssertionFailure);
    });

    it("should throw AssertionFailure with a custom message when the value is undefined", () => {
        const customMessage = "Custom error message";
        checkError(() => {
            assert.isNotUndefined(undefined, customMessage);
        }, customMessage + ": not");

        expect(() => assert.isNotUndefined(undefined, customMessage)).toThrowError(new AssertionFailure(customMessage));
    });
});
