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

describe("assert.oneOf", () => {
    describe("basic functionality", () => {
        it("should pass when value is in the list", () => {
            assert.oneOf(1, [1, 2, 3]);
            assert.oneOf("a", ["a", "b", "c"]);
            assert.oneOf(true, [true, false]);
            assert.oneOf(null, [null, undefined, 0]);
            assert.oneOf(undefined, [null, undefined, 0]);
        });

        it("should fail when value is not in the list", () => {
            checkError(
                () => assert.oneOf(5, [1, 2, 3]),
                /expected 5 to be one of/
            );
        });

        it("should fail when value is not in the list (string)", () => {
            checkError(
                () => assert.oneOf("x", ["a", "b", "c"]),
                /expected .* to be one of/
            );
        });

        it("should work with custom message", () => {
            checkError(
                () => assert.oneOf(5, [1, 2, 3], "blah"),
                "blah"
            );
        });

        it("should fail with empty list", () => {
            checkError(
                () => assert.oneOf(1, []),
                /expected 1 to be one of/
            );
        });
    });

    describe("strict equality", () => {
        it("should use strict equality (===)", () => {
            assert.oneOf(1, [1, 2, 3]);

            checkError(
                () => assert.oneOf(1, ["1", 2, 3]),
                /expected 1 to be one of/
            );
        });

        it("should distinguish between null and undefined", () => {
            assert.oneOf(null, [null, 0, false]);

            checkError(
                () => assert.oneOf(null, [undefined, 0, false]),
                /expected null to be one of/
            );
        });

        it("should distinguish between false and 0", () => {
            assert.oneOf(false, [false, null]);

            checkError(
                () => assert.oneOf(false, [0, null]),
                /expected false to be one of/
            );
        });

        it("should not match objects by content", () => {
            const obj = { a: 1 };
            assert.oneOf(obj, [obj, { b: 2 }]);

            checkError(
                () => assert.oneOf({ a: 1 }, [{ a: 1 }, { b: 2 }]),
                /expected .* to be one of/
            );
        });
    });

    describe("different types", () => {
        it("should work with numbers", () => {
            assert.oneOf(1, [1, 2, 3]);
            assert.oneOf(0, [0, -1, 1]);
            assert.oneOf(-5, [-5, 0, 5]);
            assert.oneOf(3.14, [3.14, 2.71, 1.41]);
        });

        it("should work with strings", () => {
            assert.oneOf("a", ["a", "b", "c"]);
            assert.oneOf("hello", ["hello", "world"]);
            assert.oneOf("", ["", "non-empty"]);
        });

        it("should work with booleans", () => {
            assert.oneOf(true, [true, false]);
            assert.oneOf(false, [true, false]);
        });

        it("should work with null and undefined", () => {
            assert.oneOf(null, [null, undefined, 0]);
            assert.oneOf(undefined, [null, undefined, 0]);
        });

        it("should work with objects (by reference)", () => {
            const obj1 = { a: 1 };
            const obj2 = { b: 2 };
            const obj3 = { c: 3 };

            assert.oneOf(obj1, [obj1, obj2, obj3]);
            assert.oneOf(obj2, [obj1, obj2, obj3]);
        });

        it("should work with arrays (by reference)", () => {
            const arr1 = [1, 2, 3];
            const arr2 = [4, 5, 6];

            assert.oneOf(arr1, [arr1, arr2]);
        });

        it("should work with symbols", () => {
            const sym1 = Symbol("test1");
            const sym2 = Symbol("test2");

            assert.oneOf(sym1, [sym1, sym2]);
        });

        it("should work with mixed types", () => {
            assert.oneOf(1, [1, "1", true, null]);
            assert.oneOf("hello", [1, "hello", true, null]);
            assert.oneOf(null, [1, "hello", true, null]);
        });
    });

    describe("Set support", () => {
        it("should work with Set as list", () => {
            const mySet = new Set([1, 2, 3]);
            assert.oneOf(1, mySet);
            assert.oneOf(2, mySet);
            assert.oneOf(3, mySet);
        });

        it("should fail when value not in Set", () => {
            const mySet = new Set([1, 2, 3]);
            checkError(() => assert.oneOf(4, mySet), /expected 4 to be one of/);
            checkError(() => assert.oneOf("a", mySet), /expected "a" to be one of/);
        });

        it("should work with Set of objects (by reference)", () => {
            const obj1 = { a: 1 };
            const obj2 = { b: 2 };
            const mySet = new Set([obj1, obj2]);

            assert.oneOf(obj1, mySet);
            assert.oneOf(obj2, mySet);

            // Different object with same content should fail
            checkError(() => assert.oneOf({ a: 1 }, mySet), /expected .* to be one of/);
        });

        it("should work with notOneOf and Set", () => {
            const mySet = new Set([1, 2, 3]);
            assert.notOneOf(4, mySet);
            assert.notOneOf("a", mySet);

            checkError(() => assert.notOneOf(2, mySet), /not expected 2 to be one of/);
        });

        it("should work with expect and Set", () => {
            const mySet = new Set(["a", "b", "c"]);
            expect("a").is.oneOf(mySet as any);
            expect("x").is.not.oneOf(mySet as any);
        });
    });

    describe("Map support", () => {
        it("should work with Map as list (iterates over entries)", () => {
            const myMap = new Map([["a", 1], ["b", 2], ["c", 3]]);
            // Map iteration yields [key, value] pairs
            const entry1 = ["a", 1];
            const entry2 = ["b", 2];

            // Since Maps are iterable but don't use reference equality for arrays
            // The converted array contains new arrays from iteration
            checkError(() => assert.oneOf(entry1, myMap), /expected .* to be one of/);
            checkError(() => assert.oneOf(entry2, myMap), /expected .* to be one of/);
        });
    });

    describe("ArrayLike support", () => {
        it("should work with arguments object", function() {
            (function(...args: any[]) {
                assert.oneOf(2, arguments as any);
            })(1, 2, 3);

            (function(...args: any[]) {
                checkError(function() {
                    assert.oneOf(5, arguments as any);
                }, /expected 5 to be one of/);
            })(1, 2, 3);
        });

        it("should work with custom ArrayLike objects", () => {
            const arrayLike = { 0: "a", 1: "b", 2: "c", length: 3 };
            assert.oneOf("a", arrayLike);
            assert.oneOf("b", arrayLike);
            assert.oneOf("c", arrayLike);

            checkError(() => assert.oneOf("d", arrayLike), /expected "d" to be one of/);
        });

        it("should work with TypedArray", () => {
            const uint8 = new Uint8Array([1, 2, 3, 4, 5]);
            assert.oneOf(1, uint8);
            assert.oneOf(3, uint8);
            assert.oneOf(5, uint8);

            checkError(() => assert.oneOf(6, uint8), /expected 6 to be one of/);
        });

        it("should handle sparse ArrayLike objects", () => {
            const sparse = { 0: "a", 2: "c", length: 3 };
            assert.oneOf("a", sparse);
            assert.oneOf("c", sparse);

            // Note: arrForEach skips indices that don't exist in the object,
            // so index 1 is never checked. undefined is NOT in the iteration.
            checkError(() => assert.oneOf(undefined, sparse), /expected undefined to be one of/);
        });
    });

    describe("edge cases", () => {
        it("should work with NaN (by reference)", () => {
            // NaN !== NaN, so this will fail
            checkError(
                () => assert.oneOf(NaN, [NaN, 1, 2]),
                /expected NaN to be one of/
            );
        });

        it("should work with single element list", () => {
            assert.oneOf(1, [1]);

            checkError(
                () => assert.oneOf(2, [1]),
                /expected 2 to be one of/
            );
        });

        it("should work with duplicate values in list", () => {
            assert.oneOf(1, [1, 1, 1, 2, 3]);
            assert.oneOf("a", ["a", "a", "b"]);
        });
    });

    describe("type validation", () => {
        it("should fail when list is not an array, array-like, or iterable", () => {
            checkError(
                () => assert.oneOf(1, "not an array" as any, "blah"),
                /blah.*list.*must be an array/
            );
        });

        it("should fail when list is null", () => {
            checkError(
                () => assert.oneOf(1, null as any, "blah"),
                /blah.*list.*must be an array/
            );
        });

        it("should fail when list is undefined", () => {
            checkError(
                () => assert.oneOf(1, undefined as any, "blah"),
                /blah.*list.*must be an array/
            );
        });

        it("should fail when list is a plain object without size or length", () => {
            checkError(
                () => assert.oneOf(1, { a: 1, b: 2 } as any, "blah"),
                /blah.*list.*must be an array/
            );
        });

        it("should accept object with length property as ArrayLike", () => {
            // This should work because it has length and numeric indices
            const arrayLike = { 0: 1, 1: 2, 2: 3, length: 3 };
            assert.oneOf(2, arrayLike);
        });
    });

    describe("assert.notOneOf", () => {
        it("should pass when value is not in the list", () => {
            assert.notOneOf(5, [1, 2, 3]);
            assert.notOneOf("x", ["a", "b", "c"]);
            assert.notOneOf(false, [true]);
            assert.notOneOf(null, [undefined, 0, false]);
        });

        it("should fail when value is in the list", () => {
            checkError(
                () => assert.notOneOf(1, [1, 2, 3]),
                /not expected 1 to be one of/
            );
        });

        it("should fail when value is in the list (string)", () => {
            checkError(
                () => assert.notOneOf("a", ["a", "b", "c"]),
                /not expected .* to be one of/
            );
        });

        it("should work with custom message", () => {
            checkError(
                () => assert.notOneOf(1, [1, 2, 3], "blah"),
                "blah"
            );
        });

        it("should pass with empty list", () => {
            assert.notOneOf(1, []);
            assert.notOneOf("a", []);
            assert.notOneOf(null, []);
        });
    });

    describe("expect syntax", () => {
        describe("positive assertions", () => {
            it("should work with is.oneOf", () => {
                expect(1).is.oneOf([1, 2, 3]);
                expect("a").is.oneOf(["a", "b", "c"]);
                expect(true).is.oneOf([true, false]);
            });

            it("should work with to.be.oneOf", () => {
                expect(1).to.be.oneOf([1, 2, 3]);
                expect("a").to.be.oneOf(["a", "b", "c"]);
            });

            it("should fail with clear error message", () => {
                checkError(
                    () => expect(5).is.oneOf([1, 2, 3]),
                    /expected 5 to be one of/
                );
            });
        });

        describe("negative assertions", () => {
            it("should work with is.not.oneOf", () => {
                expect(5).is.not.oneOf([1, 2, 3]);
                expect("x").is.not.oneOf(["a", "b", "c"]);
                expect(false).is.not.oneOf([true]);
            });

            it("should work with to.not.be.oneOf", () => {
                expect(5).to.not.be.oneOf([1, 2, 3]);
                expect("x").to.not.be.oneOf(["a", "b", "c"]);
            });

            it("should fail with clear error message", () => {
                checkError(
                    () => expect(1).is.not.oneOf([1, 2, 3]),
                    /not expected 1 to be one of/
                );
            });
        });

        describe("chaining", () => {
            it("should work with complex chains", () => {
                expect(1).to.be.a.oneOf([1, 2, 3]);
                expect("a").is.an.oneOf(["a", "b", "c"]);
            });

            it("should work with not in chains", () => {
                expect(5).to.not.be.a.oneOf([1, 2, 3]);
                expect("x").is.not.an.oneOf(["a", "b", "c"]);
            });
        });
    });

    describe("integration with other assertions", () => {
        it("should work after type assertions", () => {
            expect(1).is.a.number();
            expect(1).is.oneOf([1, 2, 3]);

            expect("a").is.a.string();
            expect("a").is.oneOf(["a", "b", "c"]);
        });

        it("should allow chaining after oneOf", () => {
            expect(1).is.oneOf([1, 2, 3]);
            expect(1).is.a.number();

            expect("a").is.oneOf(["a", "b", "c"]);
            expect("a").is.a.string();
        });
    });
});
