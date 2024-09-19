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

describe("assert.isArray", () => {
    it("should pass when the value is an array", () => {
        assert.isArray([]);
        assert.isArray([1, 2, 3]);
        assert.isArray([]);
    });

    it("should throw AssertionFailure when the value is not an array", () => {
        checkError(() => {
            assert.isArray({});
        }, "expected {} to be an array");

        expect(() => assert.isArray({})).toThrow(AssertionFailure);
    });

    it("should throw AssertionFailure when the value is null", () => {
        checkError(() => {
            assert.isArray(null);
        }, "expected null to be an array");

        expect(() => assert.isArray(null)).toThrow(AssertionFailure);
    });

    it("should throw AssertionFailure when the value is undefined", () => {
        checkError(() => {
            assert.isArray(undefined);
        }, "expected undefined to be an array");

        expect(() => assert.isArray(undefined)).toThrow(AssertionFailure);
    });

    it("should throw AssertionFailure with a custom message when the value is not an array", () => {
        const customMessage = "Custom error message";

        checkError(() => {
            assert.isArray({}, customMessage);
        }, customMessage);

        expect(() => assert.isArray({}, customMessage)).toThrowError(new AssertionFailure(customMessage));
    });
});

describe("assert.isNotArray", () => {
    it("should pass when the value is not an array", () => {
        assert.isNotArray({});
        assert.isNotArray(null);
        assert.isNotArray(undefined);
    });

    it("should throw AssertionFailure when the value is an array", () => {
        checkError(() => {
            assert.isNotArray([]);
        }, "not expected [] to be an array");

        expect(() => assert.isNotArray([])).toThrow(AssertionFailure);
    });

    it("should throw AssertionFailure with a custom message when the value is an array", () => {
        const customMessage = "Custom error message";

        checkError(() => {
            assert.isNotArray([], customMessage);
        }, customMessage);

        expect(() => assert.isNotArray([], customMessage)).toThrowError(new AssertionFailure(customMessage));
    });
});