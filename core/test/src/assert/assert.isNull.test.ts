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

describe("assert.isNull", () => {
    it("should pass when the value is null", () => {
        assert.isNull(null);
    });

    it("should throw AssertionFailure when the value is undefined", () => {
        checkError(() => {
            assert.isNull(undefined);
        }, "expected undefined to be null");

        expect(() => assert.isNull(undefined)).toThrow(AssertionFailure);
    });

    it("should throw AssertionFailure when the value is 0", () => {
        checkError(() => {
            assert.isNull(0);
        }, "expected 0 to be null");

        expect(() => assert.isNull(0)).toThrow(AssertionFailure);
    });

    it("should throw AssertionFailure when the value is an empty string", () => {
        checkError(() => {
            assert.isNull("");
        }, "expected \"\" to be null");

        expect(() => assert.isNull("")).toThrow(AssertionFailure);
    });

    it("should throw AssertionFailure when the value is a non-null object", () => {
        checkError(() => {
            assert.isNull({});
        }, "expected {} to be null");

        expect(() => assert.isNull({})).toThrow(AssertionFailure);
    });

    it("should throw AssertionFailure with a custom message when the value is not null", () => {
        const customMessage = "Custom error message";

        checkError(() => {
            assert.isNull(1, customMessage);
        }, customMessage);
        expect(() => assert.isNull(1, customMessage)).toThrow(new AssertionFailure(customMessage));
    });
});

describe("assert.isNotNull", () => {
    it("should pass when the value is a number", () => {
        assert.isNotNull(1);
    });

    it("should pass when the value is a string", () => {
        assert.isNotNull("string");
    });

    it("should pass when the value is undefined", () => {
        assert.isNotNull(undefined);
    });

    it("should pass when the value is an object", () => {
        assert.isNotNull({});
    });

    it("should throw AssertionFailure when the value is null", () => {
        checkError(() => {
            assert.isNotNull(null);
        }, "not expected null to be null");

        expect(() => assert.isNotNull(null)).toThrow(AssertionFailure);
    });

    it("should throw AssertionFailure with a custom message when the value is null", () => {
        const customMessage = "Custom error message";

        checkError(() => {
            assert.isNotNull(null, customMessage);
        }, customMessage + ": not");
        expect(() => assert.isNotNull(null, customMessage)).toThrow(new AssertionFailure(customMessage));
    });
});
