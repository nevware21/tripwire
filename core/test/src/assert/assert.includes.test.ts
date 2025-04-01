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

describe("assert.includes", () => {
    it("should pass when the string includes the specified substring", () => {
        assert.includes("hello darkness", "darkness");
    });

    it("should pass when the array includes the specified element", () => {
        assert.includes([4, 5, 6], 5);
    });

    it("should throw AssertionFailure when the string does not include the specified substring", () => {
        checkError(() => {
            assert.includes("hello darkness", "nomatch");
        }, "expected \"hello darkness\" to include \"nomatch\"");

        expect(() => assert.includes("hello darkness", "nomatch")).toThrow(AssertionFailure);
    });

    it("should throw AssertionFailure when the array does not include the specified element", () => {
        checkError(() => {
            assert.includes([10, 20, 30], 4);
        }, "expected [10,20,30] to include 4");

        expect(() => assert.includes([10, 20, 30], 4)).toThrow(AssertionFailure);
    });

    it("should throw AssertionFailure with a custom message when the value does not include the match", () => {
        const customMessage = "Custom error message";

        checkError(() => {
            assert.includes("hello darkness", "nomatch", customMessage);
        }, customMessage);
        
        expect(() => assert.includes("hello darkness", "nomatch", customMessage)).toThrowError(new AssertionFailure(customMessage));
    });
});
