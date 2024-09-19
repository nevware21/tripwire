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

describe("assert.isError", () => {
    it("should pass when the value is an instance of Error", () => {
        assert.isError(new Error());
    });

    it("should pass when the value is an instance of TypeError and checked against TypeError", () => {
        assert.isError(new TypeError(), TypeError);
    });

    it("should throw AssertionFailure when the value is an instance of Error but checked against TypeError", () => {
        checkError(() => {
            assert.isError(new Error(), TypeError);
        }, "to be of TypeError() type");

        expect(() => assert.isError(new Error(), TypeError)).toThrow(AssertionFailure);
    });

    it("should throw AssertionFailure when the value is an object but not an instance of Error", () => {
        checkError(() => {
            assert.isError({});
        }, "expected {} to be an Error instance");

        expect(() => assert.isError({}, Error)).toThrow(AssertionFailure);
    });

    it("should throw AssertionFailure when the value is null", () => {
        checkError(() => {
            assert.isError(null);
        }, "expected null to be an Error instance");

        expect(() => assert.isError(null, Error)).toThrow(AssertionFailure);
    });

    it("should throw AssertionFailure with a custom message when the value is not an instance of the specified error", () => {
        const customMessage = "Custom error message";

        checkError(() => {
            assert.isError({}, Error, customMessage);
        }, customMessage);
        
        expect(() => assert.isError({}, Error, customMessage)).toThrowError(new AssertionFailure(customMessage));
    });
});
