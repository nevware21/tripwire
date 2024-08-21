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

describe("assert.hasProperty", () => {
    it("should pass when the object has the specified property", () => {
        assert.hasProperty({ a: 1, b: 2 }, "a");
    });

    it("should pass when the object has the specified property", () => {
        assert.hasProperty({ a: 1, b: 2 }, "b");
    });

    it("should throw AssertionFailure when the object does not have the specified property", () => {
        checkError(() => {
            assert.hasProperty({ a: 1, b: 2 }, "c");
        }, "expected {a:1,b:2} to have a \"c\" property");

        expect(() => assert.hasProperty({ a: 1, b: 2 }, "c")).toThrow(AssertionFailure);
    });

    it("should pass when the array has the specified property", () => {
        assert.hasProperty([1, 2, 3], "length");
    });

    it("should throw AssertionFailure when the array does not have the specified property", () => {
        checkError(() => {
            assert.hasProperty([1, 2, 3], "nomatch");
        }, "expected [1,2,3] to have a \"nomatch\" property");

        expect(() => assert.hasProperty([1, 2, 3], "nomatch")).toThrow(AssertionFailure);
    });

    it("should throw AssertionFailure with a custom message when the value does not have the specified property", () => {
        const customMessage = "Custom error message";
        checkError(() => {
            assert.hasProperty({ a: 1, b: 2 }, "c", undefined, customMessage);
        }, customMessage);

        expect(() => assert.hasProperty({ a: 1, b: 2 }, "c", undefined, customMessage)).toThrowError(new AssertionFailure(customMessage));
    });
});

describe("assert.hasOwnProperty", () => {
    it("should pass when the object has the specified own property", () => {
        assert.hasOwnProperty({ a: 1, b: 2 }, "a");
    });

    it("should pass when the object has the specified own property", () => {
        assert.hasOwnProperty({ a: 1, b: 2 }, "b");
    });

    it("should throw AssertionFailure when the object does not have the specified own property", () => {
        checkError(() => {
            assert.hasOwnProperty({ a: 1, b: 2 }, "c");
        }, "expected {a:1,b:2} to have it's own \"c\" property");

        expect(() => assert.hasOwnProperty({ a: 1, b: 2 }, "c")).toThrow(AssertionFailure);
    });

    it("should throw AssertionFailure when the property is inherited and not an own property", () => {
        const obj = Object.create({ a: 1 });
        checkError(() => {
            assert.hasOwnProperty(obj, "a");
        }, /expected \[Object.*\] to have it's own \"a\" property/);

        expect(() => assert.hasOwnProperty(obj, "a")).toThrow(AssertionFailure);
    });

    it("should throw AssertionFailure with a custom message when the value does not have the specified own property", () => {
        const customMessage = "Custom error message";

        checkError(() => {
            assert.hasOwnProperty({ a: 1, b: 2 }, "c", undefined, customMessage);
        }, customMessage);

        expect(() => assert.hasOwnProperty({ a: 1, b: 2 }, "c", undefined, customMessage)).toThrowError(new AssertionFailure(customMessage));
    });
});
