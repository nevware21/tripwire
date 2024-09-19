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

describe("assert.match", () => {
    it("should pass when the value matches the regular expression", () => {
        assert.match("hello darkness", /hello/);
    });

    it("should pass when the value matches the entire regular expression", () => {
        assert.match("hello darkness", /^hello darkness$/);
    });

    it("should pass when the value matches the regular expression at the end", () => {
        assert.match("hello darkness", /darkness$/);
    });

    it("should throw AssertionFailure when the value does not match the regular expression", () => {
        checkError(() => {
            assert.match("hello darkness", /nomatch/);
        }, "expected \"hello darkness\" to match /nomatch/");

        expect(() => assert.match("hello darkness", /nomatch/)).toThrow(AssertionFailure);
    });

    it("should throw AssertionFailure with a custom message when the value does not match the regular expression", () => {
        const customMessage = "Custom error message";

        checkError(() => {
            assert.match("hello darkness", /nomatch/, customMessage);
        }, customMessage);
        expect(() => assert.match("hello darkness", /nomatch/, customMessage)).toThrowError(new AssertionFailure(customMessage));
    });
});

