/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2025 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "../../../src/assert/assertClass";
import { AssertionFailure } from "../../../src/assert/assertionError";
import { assertConfig } from "../../../src/config/assertConfig";
import { expect } from "../../../src/assert/expect";
import { checkError } from "../support/checkError";

describe("assert.isFunction", () => {

    beforeEach(() => {
        // Setup code if needed
        assertConfig.$ops.reset();
    });

    afterEach(() => {
        // Teardown code if needed
    });

    it("should pass when the value is an arrow function", () => {
        assert.isFunction(() => {});
    });

    it("should pass when the value is a regular function", () => {
        assert.isFunction(function() {});
    });

    it("should pass when the value is an async function", () => {
        assert.isFunction(async function() {});
    });

    it("should throw AssertionFailure when the value is null", () => {
        checkError(() => {
            assert.isFunction(null);
        }, "expected null to be a function");

        expect(() => assert.isFunction(null)).toThrow(AssertionFailure);
    });

    it("should throw AssertionFailure when the value is a number", () => {
        checkError(() => {
            assert.isFunction(123);
        }, "expected 123 to be a function");

        expect(() => assert.isFunction(123)).toThrow(AssertionFailure);
    });

    it("should throw AssertionFailure when the value is a string", () => {
        checkError(() => {
            assert.isFunction("string");
        }, "expected \"string\" to be a function");

        expect(() => assert.isFunction("string")).toThrow(AssertionFailure);
    });

    it("should throw AssertionFailure with a custom message when the value is not a function", () => {
        const customMessage = "Custom error message";

        checkError(() => {
            assert.isFunction(123, customMessage);
        }, customMessage);

        expect(() => assert.isFunction(123, customMessage)).toThrowError(new AssertionFailure(customMessage));
    });
});

describe("assert.isNotFunction", () => {
    it("examples", function () {

        assert.isNotFunction(null); // Passes
        assert.isNotFunction(123); // Passes
        assert.isNotFunction("string"); // Passes

        checkError(function () {
            assert.isNotFunction(() => {}); // Throws AssertionFailure
        }, "not expected [Function] to be a function");

        checkError(function () {
            assert.isNotFunction(function() {}); // Throws AssertionFailure
        }, "not expected [Function] to be a function");

        checkError(function () {
            assert.isNotFunction(async function() {}); // Throws AssertionFailure
        }, /not expected .* to be a function/s);
    });
});
