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

describe("isNumber", () => {
    it("should pass when the value is a number", () => {
        assert.isNumber(123);
        expect(() => assert.isNumber(123)).to.not.throw();
    });

    it("should pass when the value is zero", () => {
        assert.isNumber(0);
        expect(() => assert.isNumber(0)).to.not.throw();
    });

    it("should pass when the value is a decimal", () => {
        assert.isNumber(3.14);
        expect(() => assert.isNumber(3.14)).to.not.throw();
    });

    it("should pass when the value is a negative number", () => {
        assert.isNumber(-42);
        expect(() => assert.isNumber(-42)).to.not.throw();
    });

    it("should throw an error when the value is not a number", () => {
        checkError(() => {
            assert.isNumber("123");
        }, "expected \"123\" to be a number");

        expect(() => assert.isNumber("123")).to.throw();
    });

    it("should throw an error with a custom message when the value is not a number", () => {
        checkError(() => {
            assert.isNumber("123", "Custom error message");
        }, "Custom error message");

        expect(() => assert.isNumber("123", "Custom error message")).to.throw();
    });

    it("should throw an error when the value is an object", () => {
        checkError(() => {
            assert.isNumber({});
        }, "expected {} to be a number");

        expect(() => assert.isNumber({})).to.throw();
    });

    it("should throw an error when the value is an array", () => {
        checkError(() => {
            assert.isNumber([]);
        }, "expected [] to be a number");

        expect(() => assert.isNumber([])).to.throw();
    });

    it("should throw an error when the value is null", () => {
        checkError(() => {
            assert.isNumber(null);
        }, "expected null to be a number");

        expect(() => assert.isNumber(null)).to.throw();
    });

    it("should throw an error when the value is undefined", () => {
        checkError(() => {
            assert.isNumber(undefined);
        }, "expected undefined to be a number");

        expect(() => assert.isNumber(undefined)).to.throw();
    });

    it("should throw an error when the value is a boolean", () => {
        checkError(() => {
            assert.isNumber(true);
        }, "expected true to be a number");

        expect(() => assert.isNumber(true)).to.throw();
    });
});

describe("isNotNumber", () => {
    it("should pass when the value is a string", () => {
        assert.isNotNumber("hello");
        expect(() => assert.isNotNumber("hello")).to.not.throw();
    });

    it("should pass when the value is an object", () => {
        assert.isNotNumber({});
        expect(() => assert.isNotNumber({})).to.not.throw();
    });

    it("should throw an error when the value is a number", () => {
        checkError(() => {
            assert.isNotNumber(123);
        }, "not expected 123 to be a number");

        expect(() => assert.isNotNumber(123)).to.throw();
    });

    it("should pass when the value is null", () => {
        assert.isNotNumber(null);
        expect(() => assert.isNotNumber(null)).to.not.throw();
    });

    it("should pass when the value is undefined", () => {
        assert.isNotNumber(undefined);
        expect(() => assert.isNotNumber(undefined)).to.not.throw();
    });

    it("should throw an error with a custom message when the value is a number", () => {
        checkError(() => {
            assert.isNotNumber(42, "Custom error message");
        }, "Custom error message");

        expect(() => assert.isNotNumber(42, "Custom error message")).to.throw();
    });

    it("should pass when the value is a boolean", () => {
        assert.isNotNumber(true);
        expect(() => assert.isNotNumber(true)).to.not.throw();
    });

    it("should pass when the value is an array", () => {
        assert.isNotNumber([]);
        expect(() => assert.isNotNumber([])).to.not.throw();
    });

    it("should pass when the value is a function", () => {
        assert.isNotNumber(() => {});
        expect(() => assert.isNotNumber(() => {})).to.not.throw();
    });

    it("should throw an error when the value is zero", () => {
        checkError(() => {
            assert.isNotNumber(0);
        }, "not expected 0 to be a number");

        expect(() => assert.isNotNumber(0)).to.throw();
    });
});
