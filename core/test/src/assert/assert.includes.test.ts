/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "../../../src/assert/assertClass";
import { AssertionFailure } from "../../../src/assert/assertionError";
import { expect } from "../../../src/assert/expect";
import { checkError } from "../support/checkError";

describe("assert.includes", () => {
    it("should pass when the string includes the specified substring", () => {
        assert.includes("hello silence", "silence");
    });

    it("should pass when the array includes the specified element", () => {
        assert.includes([4, 5, 6], 5);
    });

    it("should throw AssertionFailure when the string does not include the specified substring", () => {
        checkError(() => {
            assert.includes("hello silence", "nomatch");
        }, "expected \"hello silence\" to include \"nomatch\"");

        expect(() => assert.includes("hello silence", "nomatch")).toThrow(AssertionFailure);
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
            assert.includes("hello silence", "nomatch", customMessage);
        }, customMessage);
        
        expect(() => assert.includes("hello silence", "nomatch", customMessage)).toThrowError(new AssertionFailure(customMessage));
    });

    describe("Error object property matching", () => {
        it("should pass when Error includes the specified message property", () => {
            const err = new Error("foo");
            assert.includes(err, { message: "foo" });
        });

        it("should pass when Error includes multiple specified properties", () => {
            const err: any = new Error("test error");
            err.code = 123;
            err.status = "failed";
            assert.includes(err, { message: "test error", code: 123 });
        });

        it("should throw AssertionFailure when Error property value does not match", () => {
            const err = new Error("foo");
            checkError(() => {
                assert.includes(err, { message: "bar" });
            }, "expected");

            expect(() => assert.includes(err, { message: "bar" })).toThrow(AssertionFailure);
        });

        it("should throw AssertionFailure when Error is missing a specified property", () => {
            const err = new Error("foo");
            checkError(() => {
                assert.includes(err, { message: "foo", code: 123 });
            }, "expected");

            expect(() => assert.includes(err, { message: "foo", code: 123 })).toThrow(AssertionFailure);
        });

        it("should work with custom Error properties", () => {
            const err: any = new Error("custom");
            err.customProp = "value";
            err.count = 42;
            assert.includes(err, { customProp: "value", count: 42 });
        });

        it("should work with objects having Symbol.toStringTag", () => {
            const customObj: any = { a: 1, b: 2 };
            customObj[Symbol.toStringTag] = "CustomObject";
            assert.includes(customObj, { a: 1 });
        });
    });

    describe("Map and Set support", () => {
        it("should pass when Map contains the specified value", () => {
            const map = new Map();
            const val = { a: 1 };
            map.set("key", val);
            assert.includes(map, val);
        });

        it("should pass when Map contains primitive values", () => {
            const map = new Map();
            map.set("a", 1);
            map.set("b", 2);
            assert.includes(map, 1);
            assert.includes(map, 2);
        });

        it("should handle NaN in Map values", () => {
            const map = new Map();
            map.set("nan", NaN);
            assert.includes(map, NaN);
        });

        it("should handle -0 and 0 as equal in Map values", () => {
            const map = new Map();
            map.set("zero", -0);
            assert.includes(map, 0);
        });

        it("should pass when Set contains the specified value", () => {
            const set = new Set();
            const val = { a: 1 };
            set.add(val);
            assert.includes(set, val);
        });

        it("should pass when Set contains primitive values", () => {
            const set = new Set();
            set.add(1);
            set.add(2);
            assert.includes(set, 1);
            assert.includes(set, 2);
        });

        it("should handle NaN in Set values", () => {
            const set = new Set();
            set.add(NaN);
            assert.includes(set, NaN);
        });

        it("should throw AssertionFailure when Map does not contain the value", () => {
            const map = new Map();
            map.set("a", 1);
            checkError(() => {
                assert.includes(map, 999);
            }, "expected");

            expect(() => assert.includes(map, 999)).toThrow(AssertionFailure);
        });

        it("should throw AssertionFailure when Set does not contain the value", () => {
            const set = new Set();
            set.add(1);
            set.add(2);
            checkError(() => {
                assert.includes(set, 999);
            }, "expected");

            expect(() => assert.includes(set, 999)).toThrow(AssertionFailure);
        });
    });
});
