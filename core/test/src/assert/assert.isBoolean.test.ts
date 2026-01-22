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

describe("isBoolean", () => {
    it("should pass when the value is true", () => {
        assert.isBoolean(true);
        expect(() => assert.isBoolean(true)).to.not.throw();
    });

    it("should pass when the value is false", () => {
        assert.isBoolean(false);
        expect(() => assert.isBoolean(false)).to.not.throw();
    });

    it("should throw an error when the value is not a boolean", () => {
        checkError(() => {
            assert.isBoolean(1);
        }, "expected 1 to be a boolean");

        expect(() => assert.isBoolean(1)).to.throw();
    });

    it("should throw an error with a custom message when the value is not a boolean", () => {
        checkError(() => {
            assert.isBoolean(1, "Custom error message");
        }, "Custom error message");

        expect(() => assert.isBoolean(1, "Custom error message")).to.throw();
    });

    it("should throw an error when the value is a string", () => {
        checkError(() => {
            assert.isBoolean("true");
        }, "expected \"true\" to be a boolean");

        expect(() => assert.isBoolean("true")).to.throw();
    });

    it("should throw an error when the value is an object", () => {
        checkError(() => {
            assert.isBoolean({});
        }, "expected {} to be a boolean");

        expect(() => assert.isBoolean({})).to.throw();
    });

    it("should throw an error when the value is an array", () => {
        checkError(() => {
            assert.isBoolean([]);
        }, "expected [] to be a boolean");

        expect(() => assert.isBoolean([])).to.throw();
    });

    it("should throw an error when the value is null", () => {
        checkError(() => {
            assert.isBoolean(null);
        }, "expected null to be a boolean");

        expect(() => assert.isBoolean(null)).to.throw();
    });

    it("should throw an error when the value is undefined", () => {
        checkError(() => {
            assert.isBoolean(undefined);
        }, "expected undefined to be a boolean");

        expect(() => assert.isBoolean(undefined)).to.throw();
    });

    it("should throw an error when the value is a number", () => {
        checkError(() => {
            assert.isBoolean(0);
        }, "expected 0 to be a boolean");

        expect(() => assert.isBoolean(0)).to.throw();
    });
});

describe("isNotBoolean", () => {
    it("should pass when the value is a number", () => {
        assert.isNotBoolean(123);
        expect(() => assert.isNotBoolean(123)).to.not.throw();
    });

    it("should pass when the value is a string", () => {
        assert.isNotBoolean("hello");
        expect(() => assert.isNotBoolean("hello")).to.not.throw();
    });

    it("should pass when the value is an object", () => {
        assert.isNotBoolean({});
        expect(() => assert.isNotBoolean({})).to.not.throw();
    });

    it("should throw an error when the value is true", () => {
        checkError(() => {
            assert.isNotBoolean(true);
        }, "not expected true to be a boolean");

        expect(() => assert.isNotBoolean(true)).to.throw();
    });

    it("should throw an error when the value is false", () => {
        checkError(() => {
            assert.isNotBoolean(false);
        }, "not expected false to be a boolean");

        expect(() => assert.isNotBoolean(false)).to.throw();
    });

    it("should pass when the value is null", () => {
        assert.isNotBoolean(null);
        expect(() => assert.isNotBoolean(null)).to.not.throw();
    });

    it("should pass when the value is undefined", () => {
        assert.isNotBoolean(undefined);
        expect(() => assert.isNotBoolean(undefined)).to.not.throw();
    });

    it("should throw an error with a custom message when the value is a boolean", () => {
        checkError(() => {
            assert.isNotBoolean(true, "Custom error message");
        }, "Custom error message");

        expect(() => assert.isNotBoolean(true, "Custom error message")).to.throw();
    });

    it("should pass when the value is an array", () => {
        assert.isNotBoolean([]);
        expect(() => assert.isNotBoolean([])).to.not.throw();
    });

    it("should pass when the value is a function", () => {
        assert.isNotBoolean(() => {});
        expect(() => assert.isNotBoolean(() => {})).to.not.throw();
    });

    it("should pass when the value is zero", () => {
        assert.isNotBoolean(0);
        expect(() => assert.isNotBoolean(0)).to.not.throw();
    });

    it("should pass when the value is one", () => {
        assert.isNotBoolean(1);
        expect(() => assert.isNotBoolean(1)).to.not.throw();
    });
});
