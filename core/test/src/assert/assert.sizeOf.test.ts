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

describe("assert.sizeOf", () => {
    describe("basic functionality", () => {
        it("should pass for arrays with correct size", () => {
            assert.sizeOf([1, 2, 3], 3);
            assert.sizeOf([], 0);
            assert.sizeOf([1], 1);
            assert.sizeOf([1, 2, 3, 4, 5], 5);
        });

        it("should pass for strings with correct size", () => {
            assert.sizeOf("hello", 5);
            assert.sizeOf("", 0);
            assert.sizeOf("a", 1);
            assert.sizeOf("foobar", 6);
        });

        it("should fail for arrays with incorrect size", () => {
            checkError(
                () => assert.sizeOf([1, 2, 3], 2),
                "expected [1,2,3] to have a length of 2 but got 3"
            );
        });

        it("should fail for strings with incorrect size", () => {
            checkError(
                () => assert.sizeOf("foobar", 5),
                "expected \"foobar\" to have a length of 5 but got 6"
            );
        });

        it("should work with custom message", () => {
            checkError(
                () => assert.sizeOf([1, 2], 3, "Array size mismatch"),
                "Array size mismatch"
            );
        });
    });

    describe("Map support", () => {
        it("should pass for Maps with correct size", () => {
            assert.sizeOf(new Map(), 0);
            
            const map = new Map();
            map.set("a", 1);
            map.set("b", 2);
            assert.sizeOf(map, 2);
        });

        it("should fail for Maps with incorrect size", () => {
            const map = new Map();
            map.set("a", 1);
            map.set("b", 2);
            
            checkError(
                () => assert.sizeOf(map, 3),
                /expected .+ to have a size of 3 but got 2/
            );
        });

        it("should work with custom message for Maps", () => {
            const map = new Map();
            map.set("a", 1);
            
            checkError(
                () => assert.sizeOf(map, 2, "Map size mismatch"),
                "Map size mismatch"
            );
        });
    });

    describe("Set support", () => {
        it("should pass for Sets with correct size", () => {
            assert.sizeOf(new Set(), 0);
            
            const set = new Set();
            set.add(1);
            set.add(2);
            assert.sizeOf(set, 2);
        });

        it("should fail for Sets with incorrect size", () => {
            const set = new Set();
            set.add(1);
            set.add(2);
            
            checkError(
                () => assert.sizeOf(set, 3),
                /expected .+ to have a size of 3 but got 2/
            );
        });

        it("should work with custom message for Sets", () => {
            const set = new Set();
            set.add(1);
            
            checkError(
                () => assert.sizeOf(set, 2, "Set size mismatch"),
                "Set size mismatch"
            );
        });
    });

    describe("expect syntax", () => {
        it("should work with expect syntax for arrays", () => {
            expect([1, 2, 3]).has.sizeOf(3);
            expect([1, 2, 3]).to.have.sizeOf(3);
        });

        it("should work with expect syntax for strings", () => {
            expect("hello").has.sizeOf(5);
            expect("hello").to.have.sizeOf(5);
        });

        it("should work with expect syntax for Maps", () => {
            const map = new Map([["a", 1], ["b", 2]]);
            expect(map).has.sizeOf(2);
            expect(map).to.have.sizeOf(2);
        });

        it("should work with expect syntax for Sets", () => {
            const set = new Set([1, 2, 3]);
            expect(set).has.sizeOf(3);
            expect(set).to.have.sizeOf(3);
        });

        it("should fail with expect syntax when size doesn't match", () => {
            checkError(
                () => expect([1, 2]).has.sizeOf(3),
                "expected [1,2] to have a length of 3 but got 2"
            );
        });
    });

    describe("edge cases", () => {
        it("should fail for objects without size or size property", () => {
            checkError(
                () => assert.sizeOf({} as any, 0),
                "expected {} to have property \"length\" or \"size\""
            );

            checkError(
                () => assert.sizeOf({ a: 1 } as any, 1),
                /expected .+ to have property "length" or "size"/
            );
        });

        it("should fail for primitives without size", () => {
            checkError(
                () => assert.sizeOf(123 as any, 3),
                "expected 123 to have property \"length\" or \"size\""
            );

            checkError(
                () => assert.sizeOf(true as any, 1),
                "expected true to have property \"length\" or \"size\""
            );
        });

        it("should fail for null/undefined", () => {
            checkError(
                () => assert.sizeOf(null as any, 0),
                "expected null to have property \"length\" or \"size\""
            );

            checkError(
                () => assert.sizeOf(undefined as any, 0),
                "expected undefined to have property \"length\" or \"size\""
            );
        });

        it("should handle zero size correctly", () => {
            assert.sizeOf([], 0);
            assert.sizeOf("", 0);
            assert.sizeOf(new Map(), 0);
            assert.sizeOf(new Set(), 0);
        });

        it("should work with objects that have a custom length property", () => {
            const customObj = { length: 5 };
            assert.sizeOf(customObj, 5);
        });

        it("should work with objects that have a custom size property", () => {
            const customObj = { size: 3 };
            assert.sizeOf(customObj, 3);
        });

        it("should prefer length over size when both are present", () => {
            const customObj = { length: 5, size: 3 };
            assert.sizeOf(customObj, 5);
            
            checkError(
                () => assert.sizeOf(customObj, 3),
                "expected {length:5,size:3} to have a length of 3 but got 5"
            );
        });

        it("should work with typed arrays", () => {
            assert.sizeOf(new Uint8Array(5), 5);
            assert.sizeOf(new Int32Array([1, 2, 3]), 3);
            assert.sizeOf(new Float64Array(10), 10);
        });

        it("should work with array-like objects", () => {
            const arrayLike = { 0: "a", 1: "b", length: 2 };
            assert.sizeOf(arrayLike, 2);
        });
    });
});

describe("assert.notSizeOf", () => {
    describe("basic functionality", () => {
        it("should pass when length doesn't match", () => {
            assert.notSizeOf([1, 2, 3], 2);
            assert.notSizeOf("hello", 4);
            assert.notSizeOf(new Map([["a", 1]]), 2);
            assert.notSizeOf(new Set([1, 2]), 3);
        });

        it("should fail when length matches", () => {
            checkError(
                () => assert.notSizeOf([1, 2, 3], 3),
                "not expected [1,2,3] to have a length of 3 but got 3"
            );

            checkError(
                () => assert.notSizeOf("hello", 5),
                "not expected \"hello\" to have a length of 5 but got 5"
            );
        });

        it("should work with custom message", () => {
            checkError(
                () => assert.notSizeOf([1, 2], 2, "Should not have this length"),
                "Should not have this length"
            );
        });
    });

    describe("expect syntax with negation", () => {
        it("should work with not operator", () => {
            expect([1, 2, 3]).to.not.have.sizeOf(2);
            expect("hello").to.not.have.sizeOf(4);
            expect(new Map([["a", 1]])).to.not.have.sizeOf(2);
            expect(new Set([1, 2])).to.not.have.sizeOf(3);
        });

        it("should fail when length matches with not operator", () => {
            checkError(
                () => expect([1, 2]).to.not.have.sizeOf(2),
                "not expected [1,2] to have a length of 2 but got 2"
            );
        });
    });

    describe("edge cases", () => {
        it("should handle zero length correctly", () => {
            assert.notSizeOf([1], 0);
            assert.notSizeOf("a", 0);
            assert.notSizeOf(new Map([["a", 1]]), 0);
            assert.notSizeOf(new Set([1]), 0);
        });

        it("should not fail for objects without length or size property", () => {
            assert.notSizeOf({} as any, 0);
            assert.notSizeOf({ a: 1 } as any, 1);
            assert.notSizeOf(123 as any, 3);
            assert.notSizeOf(true as any, 1);
            assert.notSizeOf(null as any, 0);
            assert.notSizeOf(undefined as any, 0);
        });
    });
});
