/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "../../../src/assert/assertClass";
import { expect } from "../../../src/assert/expect";
import { checkError } from "../support/checkError";

describe("isString", () => {
    it("should pass when the value is a string", () => {
        assert.isString("test");
        expect(() => assert.isString("test")).to.not.throw();
    });

    it("should throw an error when the value is not a string", () => {
        checkError(() => {
            assert.isString(123);
        }, "expected 123 to be a string");

        expect(() => assert.isString(123)).to.throw();
    });

    it("should throw an error with a custom message when the value is not a string", () => {
        checkError(() => {
            assert.isString(123, "Custom error message");
        }, "Custom error message");

        expect(() => assert.isString(123, "Custom error message")).to.throw();
    });

    it("should pass when the value is an empty string", () => {
        assert.isString("");
        expect(() => assert.isString("")).to.not.throw();
    });

    it("should throw an error when the value is an object", () => {
        checkError(() => {
            assert.isString({});
        }, "expected {} to be a string");

        expect(() => assert.isString({})).to.throw();
    });

    it("should throw an error when the value is an array", () => {
        checkError(() => {
            assert.isString([]);
        }, "expected [] to be a string");

        expect(() => assert.isString([])).to.throw();
    });

    it("should throw an error when the value is null", () => {
        checkError(() => {
            assert.isString(null);
        }, "expected null to be a string");

        expect(() => assert.isString(null)).to.throw();
    });

    it("should throw an error when the value is undefined", () => {
        checkError(() => {
            assert.isString(undefined);
        }, "expected undefined to be a string");

        expect(() => assert.isString(undefined)).to.throw();
    });
});

describe("isNotString", () => {
    it("should pass when the value is a number", () => {
        assert.isNotString(123);

        expect(() => assert.isNotString(123)).to.not.throw();
    });

    it("should pass when the value is an object", () => {
        assert.isNotString({});

        expect(() => assert.isNotString({})).to.not.throw();
    });

    it("should throw an error when the value is a string", () => {
        checkError(() => {
            assert.isNotString("hello");
        }, "not expected \"hello\" to be a string");

        expect(() => assert.isNotString("hello")).to.throw();
    });

    it("should pass when the value is null", () => {
        assert.isNotString(null);

        expect(() => assert.isNotString(null)).to.not.throw();
    });

    it("should pass when the value is undefined", () => {
        assert.isNotString(undefined);

        expect(() => assert.isNotString(undefined)).to.not.throw();
    });

    it("should throw an error with a custom message when the value is a string", () => {
        checkError(() => {
            assert.isNotString("hello", "Custom error message");
        }, "Custom error message");

        expect(() => assert.isNotString("hello", "Custom error message")).to.throw();
    });

    it("should pass when the value is a boolean", () => {
        assert.isNotString(true);

        expect(() => assert.isNotString(true)).to.not.throw();
    });

    it("should pass when the value is an array", () => {
        assert.isNotString([]);

        expect(() => assert.isNotString([])).to.not.throw();
    });

    it("should pass when the value is a function", () => {
        assert.isNotString(() => {});

        expect(() => assert.isNotString(() => {})).to.not.throw();
    });
});