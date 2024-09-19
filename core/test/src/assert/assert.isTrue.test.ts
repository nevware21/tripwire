/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "../../../src/assert/assertClass";
import { checkError } from "../support/checkError";

describe("assert.isTrue", function () {
    it("isTrue", function () {
        assert.isTrue(true);
        assert.isTrue(Boolean(1), "Hello Darkness");
        assert.isTrue(Boolean("Hello"), "Darkness");

        checkError(function () {
            assert.isTrue(false, "blah");
        }, "blah: expected false to be strictly true");

        checkError(function () {
            assert.isTrue(1);
        }, "expected 1 to be strictly true");

        checkError(function () {
            assert.isTrue("test");
        }, "expected \"test\" to be strictly true");
    });
});

describe("assert.isFalse", function () {
    it("isFalse", function () {
        assert.isFalse(false);
        assert.isFalse(Boolean(0), "Hello");
        assert.isFalse(Boolean(""), "Darkness");

        checkError(function () {
            assert.isFalse(0);
        }, "expected 0 to be strictly false");

        checkError(function () {
            assert.isFalse("");
        }, "expected \"\" to be strictly false");

        checkError(function () {
            assert.isFalse(true, "Hello Darkness");
        }, "Hello Darkness: expected true to be strictly false");

        checkError(function () {
            assert.isFalse(Boolean(1), "Hello Darkness");
        }, "Hello Darkness: expected true to be strictly false");
    });
});

describe("assert.isNotTrue", () => {
    it("should pass when the value is false", () => {
        assert.isNotTrue(false);
    });

    it("should pass when the value is 0", () => {
        assert.isNotTrue(0);
    });

    it("should pass when the value is an empty string", () => {
        assert.isNotTrue("");
    });

    it("should pass when the value is null", () => {
        assert.isNotTrue(null);
    });

    it("should pass when the value is undefined", () => {
        assert.isNotTrue(undefined);
    });

    it("should throw AssertionFailure when the value is true", () => {
        checkError(() => {
            assert.isNotTrue(true);
        }, "not expected true to be strictly true");
    });

    it("should throw AssertionFailure with a custom message when the value is true", () => {
        const customMessage = "Custom error message";
        checkError(() => {
            assert.isNotTrue(true, customMessage);
        }, customMessage + ": not");
    });
});

describe("assert.isNotFalse", () => {
    it("should pass when the value is true", () => {
        assert.isNotFalse(true);
    });

    it("should pass when the value is 1", () => {
        assert.isNotFalse(1);
    });

    it("should pass when the value is a non-empty string", () => {
        assert.isNotFalse("false");
    });

    it("should pass when the value is null", () => {
        assert.isNotFalse(null);
    });

    it("should pass when the value is undefined", () => {
        assert.isNotFalse(undefined);
    });

    it("should throw AssertionFailure when the value is false", () => {
        checkError(() => {
            assert.isNotFalse(false);
        }, "not expected false to be strictly false");
    });

    it("should throw AssertionFailure with a custom message when the value is false", () => {
        const customMessage = "Custom error message";
        checkError(() => {
            assert.isNotFalse(false, customMessage);
        }, customMessage + ": not");
    });
});
