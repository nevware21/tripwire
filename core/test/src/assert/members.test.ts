/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert, expect } from "../../../src/index";

describe("Member Comparison Tests", () => {
    describe("sameMembers", () => {
        it("should pass when arrays have same members regardless of order", () => {
            assert.sameMembers([1, 2, 3], [3, 2, 1]);
            assert.sameMembers([1, 2, 3], [2, 1, 3]);
            assert.sameMembers([1, 2, 3], [1, 2, 3]);
        });

        it("should pass when arrays are empty", () => {
            assert.sameMembers([], []);
        });

        it("should handle duplicates correctly", () => {
            assert.sameMembers([1, 2, 2, 3], [3, 2, 2, 1]);
            assert.sameMembers([1, 1, 1], [1, 1, 1]);
        });

        it("should fail when arrays have different lengths", () => {
            expect(() => {
                assert.sameMembers([1, 2, 3], [1, 2]);
            }).to.throw();

            expect(() => {
                assert.sameMembers([1, 2], [1, 2, 3]);
            }).to.throw();
        });

        it("should fail when arrays have different members", () => {
            expect(() => {
                assert.sameMembers([1, 2, 3], [1, 2, 4]);
            }).to.throw();

            expect(() => {
                assert.sameMembers([1, 2, 3], [4, 5, 6]);
            }).to.throw();
        });

        it("should fail when duplicate counts differ", () => {
            expect(() => {
                assert.sameMembers([1, 2, 2, 3], [1, 2, 3, 3]);
            }).to.throw();
        });

        it("should work with expect syntax", () => {
            expect([1, 2, 3]).include.sameMembers([3, 2, 1]);
            assert.sameMembers([1, 2, 3], [2, 1, 3]);
        });

        it("should work with not operator", () => {
            assert.notSameMembers([1, 2, 3], [1, 2]);
            assert.notSameMembers([1, 2, 3], [1, 2, 4]);
        });

        it("should fail when value is not an array", () => {
            expect(() => {
                assert.sameMembers("not an array" as any, [1, 2, 3]);
            }).to.throw("expected \"not an array\" to be an array-like or sized iterable");

            expect(() => {
                assert.sameMembers({} as any, [1, 2, 3]);
            }).to.throw("expected {} to be an array-like or sized iterable");
        });

        it("should fail when expected is not an array", () => {
            expect(() => {
                assert.sameMembers([1, 2, 3], "not an array" as any);
            }).to.throw("expected argument (\"not an array\") to be an array-like or sized iterable");

            expect(() => {
                assert.sameMembers([1, 2, 3], {} as any);
            }).to.throw("expected argument ({}) to be an array-like or sized iterable");
        });
    });

    describe("sameDeepMembers", () => {
        it("should pass when arrays have same deep members regardless of order", () => {
            assert.sameDeepMembers([{a: 1}, {b: 2}], [{b: 2}, {a: 1}]);
            assert.sameDeepMembers([[1, 2], [3, 4]], [[3, 4], [1, 2]]);
        });

        it("should pass for nested objects", () => {
            assert.sameDeepMembers(
                [{a: {b: 1}}, {c: {d: 2}}],
                [{c: {d: 2}}, {a: {b: 1}}]
            );
        });

        it("should handle duplicates correctly", () => {
            assert.sameDeepMembers(
                [{a: 1}, {a: 1}, {b: 2}],
                [{b: 2}, {a: 1}, {a: 1}]
            );
        });

        it("should fail when objects have different values", () => {
            expect(() => {
                assert.sameDeepMembers([{a: 1}], [{a: 2}]);
            }).to.throw();
        });

        it("should fail when arrays have different properties", () => {
            expect(() => {
                assert.sameDeepMembers([{a: 1}], [{b: 1}]);
            }).to.throw();
        });

        it("should work with expect syntax", () => {
            expect([{a: 1}, {b: 2}]).deep.include.sameMembers([{b: 2}, {a: 1}]);
        });

        it("should work with not operator", () => {
            expect([{a: 1}]).to.not.deep.include.sameMembers([{a: 2}]);
        });

        it("should handle mixed types", () => {
            assert.sameDeepMembers([1, "a", {b: 2}], [{b: 2}, "a", 1]);
        });

        it("should fail with correct error message for invalid value", () => {
            expect(() => {
                assert.sameDeepMembers({} as any, [{a: 1}]);
            }).to.throw("expected {} to be an array-like or sized iterable");
        });

        it("should fail with correct error message for invalid expected", () => {
            expect(() => {
                assert.sameDeepMembers([{a: 1}], {} as any);
            }).to.throw("expected argument ({}) to be an array-like or sized iterable");
        });
    });

    describe("sameOrderedMembers", () => {
        it("should pass when arrays have same members in same order", () => {
            assert.sameOrderedMembers([1, 2, 3], [1, 2, 3]);
            assert.sameOrderedMembers(["a", "b", "c"], ["a", "b", "c"]);
        });

        it("should pass for empty arrays", () => {
            assert.sameOrderedMembers([], []);
        });

        it("should fail when arrays have same members in different order", () => {
            expect(() => {
                assert.sameOrderedMembers([1, 2, 3], [3, 2, 1]);
            }).to.throw();

            expect(() => {
                assert.sameOrderedMembers([1, 2, 3], [1, 3, 2]);
            }).to.throw();
        });

        it("should fail when arrays have different lengths", () => {
            expect(() => {
                assert.sameOrderedMembers([1, 2, 3], [1, 2]);
            }).to.throw();
        });

        it("should fail with correct error message for invalid types", () => {
            expect(() => {
                assert.sameOrderedMembers({} as any, [1, 2, 3]);
            }).to.throw("expected {} to be an array-like or sized iterable");

            expect(() => {
                assert.sameOrderedMembers([1, 2, 3], "invalid" as any);
            }).to.throw("expected argument (\"invalid\") to be an array-like or sized iterable");
        });

        it("should work with expect syntax", () => {
            expect([1, 2, 3]).include.sameOrderedMembers([1, 2, 3]);
        });

        it("should work with not operator", () => {
            assert.notSameOrderedMembers([1, 2, 3], [3, 2, 1]);
        });
    });

    describe("includeMembers", () => {
        it("should pass when superset includes all subset members", () => {
            assert.includeMembers([1, 2, 3, 4], [2, 3]);
            assert.includeMembers([1, 2, 3, 4], [1, 4]);
        });

        it("should pass when arrays are equal", () => {
            assert.includeMembers([1, 2, 3], [1, 2, 3]);
        });

        it("should pass when subset is empty", () => {
            assert.includeMembers([1, 2, 3], []);
        });

        it("should handle duplicates in subset", () => {
            assert.includeMembers([1, 2, 2, 3], [2, 2]);
        });

        it("should fail when subset has members not in superset", () => {
            expect(() => {
                assert.includeMembers([1, 2, 3], [1, 4]);
            }).to.throw();

            expect(() => {
                assert.includeMembers([1, 2, 3], [4, 5]);
            }).to.throw();
        });

        it("should work with expect syntax", () => {
            expect([1, 2, 3, 4]).includes.members([2, 3]);
            expect([1, 2, 3]).to.include.members([1, 3]);
        });

        it("should fail with correct error message for invalid types", () => {
            expect(() => {
                assert.includeMembers(null as any, [1, 2]);
            }).to.throw("expected null to be an array-like or sized iterable");

            expect(() => {
                assert.includeMembers([1, 2, 3], 123 as any);
            }).to.throw("expected argument (123) to be an array-like or sized iterable");
        });

        it("should work with not operator", () => {
            expect([1, 2, 3]).to.not.include.members([1, 4]);
        });

        it("should work with assert methods", () => {
            assert.includeMembers([1, 2, 3], [2]);
            assert.notIncludeMembers([1, 2, 3], [4]);
        });

        it("should fail when subset has more duplicates than superset", () => {
            expect(() => {
                assert.includeMembers([1, 2, 3], [1, 1]);
            }).to.throw();

            expect(() => {
                assert.includeMembers([1, 2, 2, 3], [2, 2, 2]);
            }).to.throw();
        });

        it("should pass when superset has enough duplicates", () => {
            assert.includeMembers([1, 1, 2, 3], [1, 1]);
            assert.includeMembers([1, 2, 2, 2, 3], [2, 2]);
        });
    });

    describe("includeDeepMembers", () => {
        it("should pass when superset includes all subset deep members", () => {
            assert.includeDeepMembers([{a: 1}, {b: 2}, {c: 3}], [{b: 2}, {a: 1}]);
            assert.includeDeepMembers([[1, 2], [3, 4]], [[1, 2]]);
        });

        it("should pass when subset is empty", () => {
            assert.includeDeepMembers([{a: 1}], []);
        });

        it("should fail when subset has objects not in superset", () => {
            expect(() => {
                assert.includeDeepMembers([{a: 1}], [{a: 2}]);
            }).to.throw();

            expect(() => {
                assert.includeDeepMembers([{a: 1}], [{b: 1}]);
            }).to.throw();
        });

        it("should work with expect syntax", () => {
            expect([{a: 1}, {b: 2}]).deep.include.members([{a: 1}]);
        });


        it("should fail with correct error message for invalid types", () => {
            expect(() => {
                assert.includeDeepMembers(undefined as any, [{a: 1}]);
            }).to.throw("expected undefined to be an array-like or sized iterable");

            expect(() => {
                assert.includeDeepMembers([{a: 1}], false as any);
            }).to.throw("expected argument (false) to be an array-like or sized iterable");
        });
        it("should work with not operator", () => {
            expect([{a: 1}]).to.not.deep.include.members([{a: 2}]);
        });

        it("should handle nested objects", () => {
            assert.includeDeepMembers(
                [{a: {b: 1}}, {c: {d: 2}}, {e: 3}],
                [{a: {b: 1}}, {c: {d: 2}}]
            );
        });

        it("should fail when subset has more duplicates than superset", () => {
            expect(() => {
                assert.includeDeepMembers([{a: 1}, {b: 2}], [{a: 1}, {a: 1}]);
            }).to.throw();

            expect(() => {
                assert.includeDeepMembers([{a: 1}, {a: 1}, {b: 2}], [{a: 1}, {a: 1}, {a: 1}]);
            }).to.throw();
        });

        it("should pass when superset has enough duplicates", () => {
            assert.includeDeepMembers([{a: 1}, {a: 1}, {b: 2}], [{a: 1}, {a: 1}]);
            assert.includeDeepMembers([{a: 1}, {a: 1}, {a: 1}, {b: 2}], [{a: 1}, {a: 1}]);
        });
    });

    describe("includeOrderedMembers", () => {
        it("should pass when subset members appear consecutively in order", () => {
            assert.includeOrderedMembers([1, 2, 3, 4], [1, 2, 3]);
            assert.includeOrderedMembers([1, 2, 3, 4], [2, 3]);
            assert.includeOrderedMembers([1, 2, 3, 4], [3, 4]);
        });

        it("should pass when arrays are equal", () => {
            assert.includeOrderedMembers([1, 2, 3], [1, 2, 3]);
        });

        it("should pass when subset is empty", () => {
            assert.includeOrderedMembers([1, 2, 3], []);
        });

        it("should fail when subset members are not consecutive", () => {
            expect(() => {
                assert.includeOrderedMembers([1, 2, 3, 4], [2, 4]);
            }).to.throw();

            expect(() => {
                assert.includeOrderedMembers([1, 2, 3, 4], [1, 3]);
            }).to.throw();
        });

        it("should fail when subset members appear in wrong order", () => {
            expect(() => {
                assert.includeOrderedMembers([1, 2, 3, 4], [3, 2]);
            }).to.throw();

            expect(() => {
                assert.includeOrderedMembers([1, 2, 3, 4], [4, 1]);
            }).to.throw();
        });

        it("should fail with correct error message for invalid types", () => {
            expect(() => {
                assert.includeOrderedMembers("string" as any, [1, 2]);
            }).to.throw("expected \"string\" to be an array-like or sized iterable");

            expect(() => {
                assert.includeOrderedMembers([1, 2, 3], true as any);
            }).to.throw("expected argument (true) to be an array-like or sized iterable");
        });

        it("should fail when subset has members not in superset", () => {
            expect(() => {
                assert.includeOrderedMembers([1, 2, 3], [1, 2, 3, 4]);
            }).to.throw();

            expect(() => {
                assert.includeOrderedMembers([1, 2, 3], [5]);
            }).to.throw();
        });

        it("should work with expect syntax", () => {
            expect([1, 2, 3, 4]).includes.orderedMembers([1, 2, 3]);
            expect([1, 2, 3, 4]).to.include.orderedMembers([2, 3]);
        });

        it("should work with not operator", () => {
            expect([1, 2, 3, 4]).to.not.include.orderedMembers([2, 4]);
        });
    });

    describe("includeDeepOrderedMembers", () => {
        it("should pass when the expected is empty", () => {
            assert.includeDeepOrderedMembers(
                [{a: 1}, {b: 2}, {c: 3}],
                []
            );
        });

        it("should pass when subset deep members appear consecutively in order", () => {
            assert.includeDeepOrderedMembers(
                [{a: 1}, {b: 2}, {c: 3}],
                [{a: 1}, {b: 2}]
            );
            assert.includeDeepOrderedMembers(
                [{a: 1}, {b: 2}, {c: 3}],
                [{b: 2}, {c: 3}]
            );
        });

        it("should fail when subset members are not consecutive", () => {
            expect(() => {
                assert.includeDeepOrderedMembers(
                    [{a: 1}, {b: 2}, {c: 3}],
                    [{a: 1}, {c: 3}]
                );
            }).to.throw();
        });

        it("should fail when subset members appear in wrong order", () => {
            expect(() => {
                assert.includeDeepOrderedMembers(
                    [{a: 1}, {b: 2}, {c: 3}],
                    [{b: 2}, {a: 1}]
                );
            }).to.throw();
        });

        it("should fail when subset has objects not in superset", () => {
            expect(() => {
                assert.includeDeepOrderedMembers(
                    [{a: 1}, {b: 2}] as any,
                    [{a: 1}, {c: 3}] as any
                );
            }).to.throw();
        });

        it("should work with expect syntax", () => {
            expect([{a: 1}, {b: 2}, {c: 3}]).deep.include.orderedMembers([{a: 1}, {b: 2}]);
        });

        it("should work with not operator", () => {
            expect([{a: 1}, {b: 2}]).to.not.deep.include.orderedMembers([{b: 2}, {a: 1}]);
        });

        it("should handle nested arrays", () => {
            assert.includeDeepOrderedMembers(
                [[1, 2], [3, 4], [5, 6]],
                [[1, 2], [3, 4]]
            );
            assert.includeDeepOrderedMembers(
                [[1, 2], [3, 4], [5, 6]],
                [[3, 4], [5, 6]]
            );
        });

        it("should fail with correct error message for invalid types", () => {
            expect(() => {
                assert.includeDeepOrderedMembers(42 as any, [{a: 1}]);
            }).to.throw("expected 42 to be an array-like or sized iterable");

            expect(() => {
                assert.includeDeepOrderedMembers([{a: 1}], Symbol("test") as any);
            }).to.throw("expected argument ([Symbol(test)]) to be an array-like or sized iterable");
        });
    });

    describe("notIncludeDeepOrderedMembers", () => {
        it("should pass when subset members are not consecutive", () => {
            assert.notIncludeDeepOrderedMembers(
                [{a: 1}, {b: 2}, {c: 3}],
                [{a: 1}, {c: 3}]
            );
        });

        it("should pass when subset members appear in wrong order", () => {
            assert.notIncludeDeepOrderedMembers(
                [{a: 1}, {b: 2}, {c: 3}],
                [{b: 2}, {a: 1}]
            );
            assert.notIncludeDeepOrderedMembers(
                [{a: 1}, {b: 2}, {c: 3}],
                [{c: 3}, {b: 2}]
            );
        });

        it("should pass when subset has objects not in superset", () => {
            assert.notIncludeDeepOrderedMembers(
                [{a: 1}, {b: 2}],
                [{a: 1}, {c: 3}] as any
            );
            assert.notIncludeDeepOrderedMembers(
                [{a: 1}, {b: 2}],
                [{d: 4}] as any
            );
        });

        it("should fail when subset deep members DO appear consecutively in order", () => {
            expect(() => {
                assert.notIncludeDeepOrderedMembers(
                    [{a: 1}, {b: 2}, {c: 3}],
                    [{a: 1}, {b: 2}]
                );
            }).to.throw();

            expect(() => {
                assert.notIncludeDeepOrderedMembers(
                    [{a: 1}, {b: 2}, {c: 3}],
                    [{b: 2}, {c: 3}]
                );
            }).to.throw();
        });

        it("should fail when expected is empty (empty always matches)", () => {
            expect(() => {
                assert.notIncludeDeepOrderedMembers(
                    [{a: 1}, {b: 2}],
                    []
                );
            }).to.throw();
        });

        it("should work with expect syntax", () => {
            expect([{a: 1}, {b: 2}, {c: 3}]).to.not.deep.include.orderedMembers([{a: 1}, {c: 3}]);
            expect([{a: 1}, {b: 2}]).to.not.deep.include.orderedMembers([{b: 2}, {a: 1}]);
        });

        it("should handle nested arrays", () => {
            assert.notIncludeDeepOrderedMembers(
                [[1, 2], [3, 4], [5, 6]],
                [[1, 2], [5, 6]]
            );
            assert.notIncludeDeepOrderedMembers(
                [[1, 2], [3, 4], [5, 6]],
                [[5, 6], [1, 2]]
            );
        });

        it("should fail when nested arrays DO appear consecutively", () => {
            expect(() => {
                assert.notIncludeDeepOrderedMembers(
                    [[1, 2], [3, 4], [5, 6]],
                    [[1, 2], [3, 4]]
                );
            }).to.throw();
        });

        it("should work with Sets", () => {
            assert.notIncludeDeepOrderedMembers(
                new Set([{a: 1}, {b: 2}, {c: 3}]),
                [{a: 1}, {c: 3}]
            );
            assert.notIncludeDeepOrderedMembers(
                [{a: 1}, {b: 2}, {c: 3}],
                new Set([{b: 2}, {a: 1}])
            );
        });

        it("should fail when Set members DO appear consecutively", () => {
            expect(() => {
                assert.notIncludeDeepOrderedMembers(
                    new Set([{a: 1}, {b: 2}, {c: 3}]),
                    [{a: 1}, {b: 2}]
                );
            }).to.throw();
        });
    });

    describe("edge cases", () => {
        it("should handle special values correctly", () => {
            assert.sameMembers([null, undefined], [undefined, null]);
            // Note: NaN !== NaN in JavaScript, so arrays with NaN can't have "same members" with strict equality
            expect(() => {
                assert.sameMembers([NaN, 0], [0, NaN]);
            }).to.throw();
            assert.sameMembers([true, false], [false, true]);
        });

        it("should distinguish between different types", () => {
            expect(() => {
                assert.sameMembers([1, 2, 3], ["1", "2", "3"] as any);
            }).to.throw();
        });

        it("should work with Sets converted to arrays", () => {
            const set1 = Array.from(new Set([1, 2, 3]));
            const set2 = Array.from(new Set([3, 2, 1]));
            assert.sameMembers(set1, set2);
        });

        it("should handle single element arrays", () => {
            assert.sameMembers([1], [1]);
            assert.includeMembers([1, 2], [1]);
        });

        it("should handle sparse ArrayLike objects", () => {
            // ArrayLike objects with missing indices are converted to arrays with undefined
            // This matches JavaScript's standard behavior for ArrayLike (e.g., arguments)
            const sparseArrayLike = {length: 5, 0: "a", 4: "e"};
            // Array.from converts this to ['a', undefined, undefined, undefined, 'e']
            assert.sameMembers(sparseArrayLike as any, ["a", undefined, undefined, undefined, "e"]);
            
            // Verify it works with member comparison functions
            assert.includeMembers(sparseArrayLike as any, ["a", "e"]);
        });

        it("should reject objects without index 0 when length > 0", () => {
            // Objects that claim to have length but no index 0 are rejected
            const invalidArrayLike = {length: 5, 1: "b"};
            expect(() => {
                assert.sameMembers(invalidArrayLike as any, []);
            }).to.throw(/to be an array-like or sized iterable/);
        });

        it("should work with TypedArrays", () => {
            // Uint8Array
            const uint8Array = new Uint8Array([1, 2, 3]);
            assert.sameMembers(uint8Array, [1, 2, 3]);
            assert.sameMembers([3, 2, 1], uint8Array);
            
            // Int32Array
            const int32Array = new Int32Array([10, 20, 30]);
            assert.sameMembers(int32Array, [30, 20, 10]);
            
            // Float64Array
            const float64Array = new Float64Array([1.5, 2.5, 3.5]);
            assert.sameMembers(float64Array, [3.5, 1.5, 2.5]);
            
            // TypedArray vs TypedArray
            const uint8Array2 = new Uint8Array([3, 2, 1]);
            assert.sameMembers(uint8Array, uint8Array2);
        });

        it("should work with TypedArrays in includeMembers", () => {
            const uint8Array = new Uint8Array([1, 2, 3, 4, 5]);
            assert.includeMembers(uint8Array, [2, 4]);
            assert.includeMembers([1, 2, 3, 4, 5], new Uint8Array([2, 4]));
            
            // With duplicates
            const int16Array = new Int16Array([1, 2, 2, 3]);
            assert.includeMembers(int16Array, [2, 2]);
            
            expect(() => {
                assert.includeMembers(uint8Array, [2, 2, 2]);
            }).to.throw();
        });

        it("should work with TypedArrays in deep comparisons", () => {
            // TypedArrays use strict equality, but verify they work with deep functions
            const uint8Array = new Uint8Array([1, 2, 3]);
            assert.sameDeepMembers(uint8Array, [1, 2, 3]);
            assert.includeDeepMembers([1, 2, 3, 4], uint8Array);
        });

        it("should work with TypedArrays in ordered comparisons", () => {
            const uint8Array = new Uint8Array([1, 2, 3, 4, 5]);
            assert.sameOrderedMembers(uint8Array, [1, 2, 3, 4, 5]);
            assert.includeOrderedMembers(uint8Array, [2, 3, 4]);
            
            // startsWithMembers
            assert.startsWithMembers(uint8Array, [1, 2, 3]);
            assert.startsWithMembers([1, 2, 3, 4, 5], new Uint8Array([1, 2]));
            
            expect(() => {
                assert.startsWithMembers(uint8Array, [2, 3, 4]);
            }).to.throw();
        });

        it("should distinguish between different TypedArray types with different values", () => {
            // Even though both are TypedArrays, different values should fail
            const uint8Array = new Uint8Array([1, 2, 3]);
            const int32Array = new Int32Array([1, 2, 4]);
            
            expect(() => {
                assert.sameMembers(uint8Array, int32Array);
            }).to.throw();
        });
    });

    describe("mixed type support (Array, Set, Map)", () => {
        describe("sameMembers with Sets", () => {
            it("should compare Array vs Set", () => {
                assert.sameMembers([1, 2, 3], new Set([3, 2, 1]));
                assert.sameMembers(new Set([1, 2, 3]), [3, 2, 1]);
            });

            it("should compare Set vs Set", () => {
                assert.sameMembers(new Set([1, 2, 3]), new Set([3, 2, 1]));
                assert.sameMembers(new Set(["a", "b"]), new Set(["b", "a"]));
            });

            it("should fail when Set and Array have different members", () => {
                expect(() => {
                    assert.sameMembers([1, 2, 3], new Set([1, 2, 4]));
                }).to.throw();
            });

            it("should work with expect syntax", () => {
                expect(new Set([1, 2, 3])).include.sameMembers([3, 2, 1]);
                expect([1, 2, 3]).include.sameMembers(new Set([3, 2, 1]));
            });
        });

        describe("sameDeepMembers with Sets", () => {
            it("should compare Array vs Set with deep equality", () => {
                assert.sameDeepMembers([{a: 1}, {b: 2}], new Set([{b: 2}, {a: 1}]));
                assert.sameDeepMembers(new Set([{a: 1}, {b: 2}]), [{b: 2}, {a: 1}]);
            });

            it("should compare Set vs Set with deep equality", () => {
                assert.sameDeepMembers(
                    new Set([{a: 1}, {b: 2}]),
                    new Set([{b: 2}, {a: 1}])
                );
            });
        });

        describe("includeMembers with Sets", () => {
            it("should check if Array includes Set members", () => {
                assert.includeMembers([1, 2, 3, 4], new Set([2, 3]));
            });

            it("should check if Set includes Array members", () => {
                assert.includeMembers(new Set([1, 2, 3, 4]), [2, 3]);
            });

            it("should check if Set includes Set members", () => {
                assert.includeMembers(new Set([1, 2, 3, 4]), new Set([2, 3]));
            });

            it("should fail when Set doesn't include all members", () => {
                expect(() => {
                    assert.includeMembers(new Set([1, 2, 3]), [1, 4]);
                }).to.throw();
            });
        });

        describe("includeDeepMembers with Sets", () => {
            it("should check if Array includes Set members with deep equality", () => {
                assert.includeDeepMembers(
                    [{a: 1}, {b: 2}, {c: 3}],
                    new Set([{a: 1}, {b: 2}])
                );
            });

            it("should check if Set includes Array members with deep equality", () => {
                assert.includeDeepMembers(
                    new Set([{a: 1}, {b: 2}, {c: 3}]),
                    [{a: 1}, {b: 2}]
                );
            });
        });

        describe("sameOrderedMembers with Sets", () => {
            it("should compare Array vs Set in order", () => {
                assert.sameOrderedMembers([1, 2, 3], new Set([1, 2, 3]));
                assert.sameOrderedMembers(new Set([1, 2, 3]), [1, 2, 3]);
            });

            it("should fail when order differs between Array and Set", () => {
                expect(() => {
                    assert.sameOrderedMembers([1, 2, 3], new Set([3, 2, 1]));
                }).to.throw();
            });

            it("should compare Set vs Set in order", () => {
                assert.sameOrderedMembers(new Set([1, 2, 3]), new Set([1, 2, 3]));
            });
        });

        describe("includeOrderedMembers with Sets", () => {
            it("should check ordered consecutive subset in Array vs Set", () => {
                assert.includeOrderedMembers([1, 2, 3, 4], new Set([1, 2]));
                assert.includeOrderedMembers([1, 2, 3, 4], new Set([2, 3]));
            });

            it("should check ordered consecutive subset in Set vs Array", () => {
                assert.includeOrderedMembers(new Set([1, 2, 3, 4]), [1, 2]);
                assert.includeOrderedMembers(new Set([1, 2, 3, 4]), [2, 3]);
            });

            it("should check ordered consecutive subset in Set vs Set", () => {
                assert.includeOrderedMembers(new Set([1, 2, 3, 4]), new Set([1, 2]));
            });

            it("should fail when members are not consecutive", () => {
                expect(() => {
                    assert.includeOrderedMembers([1, 2, 3, 4], new Set([2, 4]));
                }).to.throw();
            });
        });

        describe("with Maps", () => {
            it("should compare Map vs Array using sameDeepMembers (Map iterates over [key, value] pairs)", () => {
                const map = new Map([[1, "a"], [2, "b"]]);
                // Map iterator gives [key, value] tuples, which are arrays, so we need deep comparison
                assert.sameDeepMembers(map, [[1, "a"], [2, "b"]]);
            });

            it("should compare Map vs Map using sameDeepMembers", () => {
                const map1 = new Map([[1, "a"], [2, "b"]]);
                const map2 = new Map([[2, "b"], [1, "a"]]);
                assert.sameDeepMembers(map1, map2);
            });

            it("should work with deep comparison for Map values", () => {
                const map1 = new Map([[1, {x: 1}], [2, {y: 2}]]);
                const map2 = new Map([[2, {y: 2}], [1, {x: 1}]]);
                assert.sameDeepMembers(map1, map2);
            });

            it("should check inclusion with Maps using includeDeepMembers", () => {
                const map = new Map([[1, "a"], [2, "b"], [3, "c"]]);
                assert.includeDeepMembers(map, [[1, "a"], [2, "b"]]);
            });

            it("should work with Map.keys() for simple value comparison", () => {
                const map = new Map([[1, "a"], [2, "b"], [3, "c"]]);
                assert.sameMembers(Array.from(map.keys()), [3, 2, 1]);
            });

            it("should work with Map.values() for simple value comparison", () => {
                const map = new Map([[1, "a"], [2, "b"], [3, "c"]]);
                assert.sameMembers(Array.from(map.values()), ["c", "b", "a"]);
            });
        });

        describe("empty collections", () => {
            it("should compare empty Array vs empty Set", () => {
                assert.sameMembers([], new Set());
                assert.sameMembers(new Set(), []);
            });

            it("should compare empty Set vs empty Set", () => {
                assert.sameMembers(new Set(), new Set());
            });

            it("should compare empty Map vs empty Array", () => {
                assert.sameMembers(new Map(), []);
            });
        });

        describe("not operations with mixed types", () => {
            it("should work with notSameMembers", () => {
                assert.notSameMembers([1, 2, 3], new Set([1, 2, 4]));
                assert.notSameMembers(new Set([1, 2, 3]), [1, 2, 4]);
            });

            it("should work with notIncludeMembers", () => {
                assert.notIncludeMembers([1, 2, 3], new Set([1, 4]));
                assert.notIncludeMembers(new Set([1, 2, 3]), [1, 4]);
            });
        });
    });

    describe("startsWithMembers", () => {
        it("should pass when array starts with the expected sequence", () => {
            assert.startsWithMembers([1, 2, 3, 4], [1, 2]);
            assert.startsWithMembers([1, 2, 3, 4], [1, 2, 3]);
            assert.startsWithMembers([1, 2, 3, 4], [1]);
        });

        it("should pass when arrays are equal", () => {
            assert.startsWithMembers([1, 2, 3], [1, 2, 3]);
        });

        it("should pass when expected is empty", () => {
            assert.startsWithMembers([1, 2, 3], []);
        });

        it("should fail when array doesn't start with the expected sequence", () => {
            expect(() => {
                assert.startsWithMembers([1, 2, 3, 4], [2, 3]);
            }).to.throw();

            expect(() => {
                assert.startsWithMembers([1, 2, 3, 4], [2]);
            }).to.throw();
        });

        it("should fail when expected is longer than actual", () => {
            expect(() => {
                assert.startsWithMembers([1, 2], [1, 2, 3, 4]);
            }).to.throw();
        });

        it("should fail when sequence doesn't match from start", () => {
            expect(() => {
                assert.startsWithMembers([1, 2, 3, 4], [1, 3]);
            }).to.throw();
        });

        it("should work with expect syntax", () => {
            expect([1, 2, 3, 4]).includes.startsWithMembers([1, 2]);
            expect([1, 2, 3, 4]).to.include.startsWithMembers([1, 2, 3]);
        });

        it("should work with not operator", () => {
            expect([1, 2, 3, 4]).to.not.include.startsWithMembers([2, 3]);
            assert.notStartsWithMembers([1, 2, 3, 4], [2, 3]);
        });

        it("should fail with correct error message for invalid types", () => {
            expect(() => {
                assert.startsWithMembers("string" as any, [1, 2]);
            }).to.throw("expected \"string\" to be an array-like or sized iterable");

            expect(() => {
                assert.startsWithMembers([1, 2, 3], true as any);
            }).to.throw("expected argument (true) to be an array-like or sized iterable");
        });

        describe("with Sets", () => {
            it("should check if Array starts with Set members", () => {
                assert.startsWithMembers([1, 2, 3, 4], new Set([1, 2]));
                assert.startsWithMembers([1, 2, 3, 4], new Set([1, 2, 3]));
            });

            it("should check if Set starts with Array members", () => {
                assert.startsWithMembers(new Set([1, 2, 3, 4]), [1, 2]);
                assert.startsWithMembers(new Set([1, 2, 3, 4]), [1]);
            });

            it("should check if Set starts with Set members", () => {
                assert.startsWithMembers(new Set([1, 2, 3, 4]), new Set([1, 2]));
            });

            it("should fail when Set doesn't start with the sequence", () => {
                expect(() => {
                    assert.startsWithMembers(new Set([1, 2, 3, 4]), [2, 3]);
                }).to.throw();
            });
        });
    });

    describe("startsWithDeepMembers", () => {
        it("should pass when array starts with the expected deep sequence", () => {
            assert.startsWithDeepMembers(
                [{a: 1}, {b: 2}, {c: 3}],
                [{a: 1}, {b: 2}]
            );
            assert.startsWithDeepMembers(
                [{a: 1}, {b: 2}, {c: 3}],
                [{a: 1}]
            );
        });

        it("should fail when array doesn't start with the expected deep sequence", () => {
            expect(() => {
                assert.startsWithDeepMembers(
                    [{a: 1}, {b: 2}, {c: 3}],
                    [{b: 2}, {c: 3}]
                );
            }).to.throw();

            expect(() => {
                assert.startsWithDeepMembers(
                    [{a: 1}, {b: 2}, {c: 3}],
                    [{b: 2}]
                );
            }).to.throw();
        });

        it("should fail when expected is longer than actual", () => {
            expect(() => {
                assert.startsWithDeepMembers(
                    [{a: 1}, {b: 2}],
                    [{a: 1}, {b: 2}, {c: 3}]
                );
            }).to.throw();
        });

        it("should work with expect syntax", () => {
            expect([{a: 1}, {b: 2}, {c: 3}]).deep.includes.startsWithMembers([{a: 1}, {b: 2}]);
            expect([{a: 1}, {b: 2}]).to.deep.include.startsWithMembers([{a: 1}]);
        });

        it("should work with not operator", () => {
            expect([{a: 1}, {b: 2}]).to.not.deep.include.startsWithMembers([{b: 2}]);
            assert.notStartsWithDeepMembers([{a: 1}, {b: 2}], [{b: 2}]);
        });

        it("should handle nested arrays", () => {
            assert.startsWithDeepMembers(
                [[1, 2], [3, 4], [5, 6]],
                [[1, 2], [3, 4]]
            );
            assert.startsWithDeepMembers(
                [[1, 2], [3, 4], [5, 6]],
                [[1, 2]]
            );

            expect(() => {
                assert.startsWithDeepMembers(
                    [[1, 2], [3, 4], [5, 6]],
                    [[3, 4], [5, 6]]
                );
            }).to.throw();
        });

        it("should fail with correct error message for invalid types", () => {
            expect(() => {
                assert.startsWithDeepMembers(42 as any, [{a: 1}]);
            }).to.throw("expected 42 to be an array-like or sized iterable");

            expect(() => {
                assert.startsWithDeepMembers([{a: 1}], Symbol("test") as any);
            }).to.throw("expected argument ([Symbol(test)]) to be an array-like or sized iterable");
        });

        describe("with Sets", () => {
            it("should check if Array starts with Set deep members", () => {
                assert.startsWithDeepMembers(
                    [{a: 1}, {b: 2}, {c: 3}],
                    new Set([{a: 1}, {b: 2}])
                );
            });

            it("should check if Set starts with Array deep members", () => {
                assert.startsWithDeepMembers(
                    new Set([{a: 1}, {b: 2}, {c: 3}]),
                    [{a: 1}, {b: 2}]
                );
            });

            it("should check if Set starts with Set deep members", () => {
                assert.startsWithDeepMembers(
                    new Set([{a: 1}, {b: 2}, {c: 3}]),
                    new Set([{a: 1}, {b: 2}])
                );
            });

            it("should fail when Set doesn't start with the deep sequence", () => {
                expect(() => {
                    assert.startsWithDeepMembers(
                        new Set([{a: 1}, {b: 2}, {c: 3}]),
                        [{b: 2}]
                    );
                }).to.throw();
            });
        });
    });

    describe("circular reference handling", () => {
        it("should handle circular references in sameDeepMembers without null pointer exception", () => {
            const obj1: any = {a: 1};
            obj1.self = obj1;
            
            const obj2: any = {a: 1};
            obj2.self = obj2;
            
            // This should pass - both objects have the same circular structure
            assert.sameDeepMembers([obj1], [obj2]);
        });

        it("should handle circular references in includeDeepMembers without null pointer exception", () => {
            const obj1: any = {a: 1};
            obj1.self = obj1;
            
            const obj2: any = {a: 1};
            obj2.self = obj2;
            
            // This should pass - checking if array includes circular object
            assert.includeDeepMembers([obj1, {b: 2}], [obj2]);
        });

        it("should not throw null pointer exception even with pathological circular structures", () => {
            // Create two separate objects with deep circular nesting
            const createDeepCircular = () => {
                const obj: any = {};
                let current = obj;
                for (let i = 0; i < 15; i++) {
                    current.next = {value: i};
                    current = current.next;
                }
                current.next = obj; // Create circular reference back to root
                return obj;
            };

            const obj1 = createDeepCircular();
            const obj2 = createDeepCircular();
            
            // This should not throw a null pointer exception (the bug we fixed)
            // It may pass or fail the assertion, but shouldn't crash with null pointer
            try {
                assert.sameDeepMembers([obj1], [obj2]);
            } catch (e: any) {
                // Acceptable outcomes:
                // 1. Assertion failure (expected values don't match)
                // 2. Circular reference error (if >10 visits detected)
                // NOT acceptable: null pointer exception from context.fail()
                assert.isTrue(
                    e.message.includes("AssertionFailure") ||
                    e.message.includes("Circular reference") ||
                    e.message.includes("expected") ||
                    e.name === "AssertionFailure" ||
                    e.name === "Error",
                    "Should not throw null pointer exception, got: " + e.message
                );
            }
        });
    });

    describe("endsWithMembers", () => {
        it("should pass when array ends with the expected sequence", () => {
            assert.endsWithMembers([1, 2, 3, 4, 5], [4, 5]);
        });

        it("should pass when arrays are equal", () => {
            assert.endsWithMembers([1, 2, 3], [1, 2, 3]);
        });

        it("should pass when expected is empty", () => {
            assert.endsWithMembers([1, 2, 3], []);
        });

        it("should fail when array doesn't end with the expected sequence", () => {
            expect(() => {
                assert.endsWithMembers([1, 2, 3, 4, 5], [3, 4]);
            }).to.throw();
        });

        it("should fail when expected is longer than actual", () => {
            expect(() => {
                assert.endsWithMembers([1, 2], [1, 2, 3]);
            }).to.throw();
        });

        it("should fail when sequence appears in middle but not at end", () => {
            expect(() => {
                assert.endsWithMembers([1, 2, 3, 4, 5], [2, 3]);
            }).to.throw();
        });

        it("should work with expect syntax", () => {
            expect([1, 2, 3, 4]).includes.endsWithMembers([3, 4]);
            expect([1, 2, 3, 4]).to.include.endsWithMembers([3, 4]);
        });

        it("should work with not operator", () => {
            expect([1, 2, 3, 4]).to.not.include.endsWithMembers([1, 2]);
        });

        it("should fail with correct error message for invalid types", () => {
            expect(() => {
                assert.endsWithMembers("not an array" as any, [1, 2]);
            }).to.throw(/array-like or sized iterable/);
        });

        describe("with Sets", () => {
            it("should check if Array ends with Set members", () => {
                assert.endsWithMembers([1, 2, 3, 4], new Set([3, 4]));
            });

            it("should check if Set ends with Array members", () => {
                assert.endsWithMembers(new Set([1, 2, 3, 4]), [3, 4]);
            });

            it("should check if Set ends with Set members", () => {
                assert.endsWithMembers(new Set([1, 2, 3]), new Set([2, 3]));
            });

            it("should fail when Set doesn't end with the sequence", () => {
                expect(() => {
                    assert.endsWithMembers(new Set([1, 2, 3]), [1, 2]);
                }).to.throw();
            });
        });
    });

    describe("endsWithDeepMembers", () => {
        it("should pass when array ends with the expected deep sequence", () => {
            assert.endsWithDeepMembers([{a: 1}, {b: 2}, {c: 3}], [{b: 2}, {c: 3}]);
        });

        it("should fail when array doesn't end with the expected deep sequence", () => {
            expect(() => {
                assert.endsWithDeepMembers([{a: 1}, {b: 2}, {c: 3}], [{a: 1}, {b: 2}]);
            }).to.throw();
        });

        it("should fail when expected is longer than actual", () => {
            expect(() => {
                assert.endsWithDeepMembers([{a: 1}], [{a: 1}, {b: 2}]);
            }).to.throw();
        });

        it("should work with expect syntax", () => {
            expect([{a: 1}, {b: 2}]).deep.includes.endsWithMembers([{b: 2}]);
            expect([{a: 1}, {b: 2}]).to.deep.include.endsWithMembers([{b: 2}]);
        });

        it("should work with not operator", () => {
            expect([{a: 1}, {b: 2}, {c: 3}]).to.not.deep.include.endsWithMembers([{a: 1}]);
        });

        it("should handle nested arrays", () => {
            assert.endsWithDeepMembers([[1, 2], [3, 4], [5, 6]], [[3, 4], [5, 6]]);
        });

        it("should fail with correct error message for invalid types", () => {
            expect(() => {
                assert.endsWithDeepMembers("not an array" as any, [{a: 1}]);
            }).to.throw(/array-like or sized iterable/);
        });

        describe("with Sets", () => {
            it("should check if Array ends with Set deep members", () => {
                assert.endsWithDeepMembers([{a: 1}, {b: 2}, {c: 3}], new Set([{b: 2}, {c: 3}]));
            });

            it("should check if Set ends with Array deep members", () => {
                assert.endsWithDeepMembers(new Set([{a: 1}, {b: 2}]), [{b: 2}]);
            });

            it("should check if Set ends with Set deep members", () => {
                assert.endsWithDeepMembers(new Set([{a: 1}, {b: 2}]), new Set([{b: 2}]));
            });

            it("should fail when Set doesn't end with the deep sequence", () => {
                expect(() => {
                    assert.endsWithDeepMembers(new Set([{a: 1}, {b: 2}]), [{a: 1}]);
                }).to.throw();
            });
        });
    });

    describe("subsequence", () => {
        it("should pass when members appear in order with gaps", () => {
            assert.subsequence([1, 2, 3, 4, 5], [2, 4, 5]);
        });

        it("should pass when members appear in order without gaps", () => {
            assert.subsequence([1, 2, 3, 4, 5], [1, 2, 3]);
        });

        it("should pass when arrays are equal", () => {
            assert.subsequence([1, 2, 3], [1, 2, 3]);
        });

        it("should pass when expected is empty", () => {
            assert.subsequence([1, 2, 3], []);
        });

        it("should pass when expected is a single element", () => {
            assert.subsequence([1, 2, 3, 4, 5], [3]);
        });

        it("should fail when members appear in wrong order", () => {
            expect(() => {
                assert.subsequence([1, 2, 3, 4, 5], [5, 3, 1]);
            }).to.throw();
        });

        it("should fail when not all members are present", () => {
            expect(() => {
                assert.subsequence([1, 2, 3, 4, 5], [2, 6]);
            }).to.throw();
        });

        it("should handle duplicates correctly", () => {
            assert.subsequence([1, 2, 2, 3, 3, 3], [2, 2, 3]);
        });

        it("should fail when not enough duplicates", () => {
            expect(() => {
                assert.subsequence([1, 2, 3], [2, 2]);
            }).to.throw();
        });

        it("should throw with correct message when members appear in wrong order", () => {
            expect(() => {
                assert.subsequence([1, 2, 3, 4, 5], [5, 3, 1]);
            }).to.throw(/expected \[1,2,3,4,5\] to include subsequence \[5,3,1\]/);
        });

        it("should throw with correct message when not all members are present", () => {
            expect(() => {
                assert.subsequence([1, 2, 3, 4, 5], [2, 6]);
            }).to.throw(/expected \[1,2,3,4,5\] to include subsequence \[2,6\]/);
        });

        it("should throw with correct message when not enough duplicates", () => {
            expect(() => {
                assert.subsequence([1, 2, 3], [2, 2]);
            }).to.throw(/expected \[1,2,3\] to include subsequence \[2,2\]/);
        });

        it("should work with expect syntax", () => {
            expect([1, 2, 3, 4, 5]).includes.subsequence([1, 3, 5]);
            expect([1, 2, 3, 4, 5]).to.include.subsequence([1, 3, 5]);
        });

        it("should work with not operator", () => {
            expect([1, 2, 3, 4, 5]).to.not.include.subsequence([5, 1]);
        });

        it("should fail with correct error message for invalid types", () => {
            expect(() => {
                assert.subsequence("not an array" as any, [1, 2]);
            }).to.throw(/array-like or sized iterable/);
        });

        describe("with Sets", () => {
            it("should check if Array contains Set members in order", () => {
                assert.subsequence([1, 2, 3, 4, 5], new Set([2, 4]));
            });

            it("should check if Set contains Array members in order", () => {
                assert.subsequence(new Set([1, 2, 3, 4]), [1, 3]);
            });

            it("should check if Set contains Set members in order", () => {
                assert.subsequence(new Set([1, 2, 3]), new Set([1, 3]));
            });

            it("should fail when Set doesn't contain members in order", () => {
                expect(() => {
                    assert.subsequence(new Set([1, 2, 3]), [3, 1]);
                }).to.throw();
            });
        });

        describe("real-world use cases", () => {
            it("should validate event sequence with interspersed events", () => {
                const events = ["start", "init", "loading", "progress", "loaded", "ready"];
                assert.subsequence(events, ["init", "loaded", "ready"]);
            });

            it("should validate filtered array maintains order", () => {
                const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
                const evens = [2, 4, 6, 8, 10];
                assert.subsequence(numbers, evens);
            });

            it("should validate workflow steps occurred in order", () => {
                const log = ["user_login", "view_page", "click_button", "submit_form", "api_call", "success"];
                assert.subsequence(log, ["user_login", "submit_form", "success"]);
            });
        });
    });

    describe("deepSubsequence", () => {
        it("should pass when deep members appear in order with gaps", () => {
            assert.deepSubsequence([{a: 1}, {b: 2}, {c: 3}, {d: 4}], [{a: 1}, {c: 3}]);
        });

        it("should pass when deep members appear in order without gaps", () => {
            assert.deepSubsequence([{a: 1}, {b: 2}, {c: 3}], [{a: 1}, {b: 2}]);
        });

        it("should pass when arrays are equal", () => {
            assert.deepSubsequence([{a: 1}, {b: 2}], [{a: 1}, {b: 2}]);
        });

        it("should pass when expected is empty", () => {
            assert.deepSubsequence([{a: 1}, {b: 2}], []);
        });

        it("should fail when members appear in wrong order", () => {
            expect(() => {
                assert.deepSubsequence([{a: 1}, {b: 2}, {c: 3}], [{c: 3}, {a: 1}]);
            }).to.throw();
        });

        it("should fail when not all members are present", () => {
            expect(() => {
                assert.deepSubsequence([{a: 1}, {b: 2}], [{a: 1}, {c: 3}] as any);
            }).to.throw();
        });

        it("should throw with correct message when members appear in wrong order", () => {
            expect(() => {
                assert.deepSubsequence([{a: 1}, {b: 2}, {c: 3}], [{c: 3}, {a: 1}]);
            }).to.throw(/expected .* to include deep subsequence .*/);
        });

        it("should throw with correct message when not all members are present", () => {
            expect(() => {
                assert.deepSubsequence([{a: 1}, {b: 2}], [{a: 1}, {c: 3}] as any);
            }).to.throw(/expected .* to include deep subsequence .*/);
        });

        it("should handle nested objects", () => {
            assert.deepSubsequence([{a: {x: 1}}, {b: {y: 2}}, {c: {z: 3}}], [{a: {x: 1}}, {c: {z: 3}}]);
        });

        it("should handle nested arrays", () => {
            assert.deepSubsequence([[1, 2], [3, 4], [5, 6], [7, 8]], [[1, 2], [5, 6]]);
        });

        it("should work with expect syntax", () => {
            expect([{a: 1}, {b: 2}, {c: 3}]).deep.includes.subsequence([{a: 1}, {c: 3}]);
            expect([{a: 1}, {b: 2}, {c: 3}]).to.deep.include.subsequence([{a: 1}, {c: 3}]);
        });

        it("should work with not operator", () => {
            expect([{a: 1}, {b: 2}, {c: 3}]).to.not.deep.include.subsequence([{c: 3}, {a: 1}]);
        });

        it("should fail with correct error message for invalid types", () => {
            expect(() => {
                assert.deepSubsequence("not an array" as any, [{a: 1}]);
            }).to.throw(/array-like or sized iterable/);
        });

        describe("with Sets", () => {
            it("should check if Array contains Set deep members in order", () => {
                assert.deepSubsequence([{a: 1}, {b: 2}, {c: 3}], new Set([{a: 1}, {c: 3}]));
            });

            it("should check if Set contains Array deep members in order", () => {
                assert.deepSubsequence(new Set([{a: 1}, {b: 2}, {c: 3}]), [{a: 1}, {c: 3}]);
            });

            it("should check if Set contains Set deep members in order", () => {
                assert.deepSubsequence(new Set([{a: 1}, {b: 2}]), new Set([{a: 1}]));
            });

            it("should fail when Set doesn't contain deep members in order", () => {
                expect(() => {
                    assert.deepSubsequence(new Set([{a: 1}, {b: 2}]), [{b: 2}, {a: 1}]);
                }).to.throw();
            });
        });

        describe("real-world use cases", () => {
            it("should validate object event sequence", () => {
                const events = [
                    {type: "init", data: {id: 1}},
                    {type: "loading", data: {id: 1}},
                    {type: "progress", data: {id: 1, pct: 50}},
                    {type: "loaded", data: {id: 1}},
                    {type: "ready", data: {id: 1}}
                ];
                assert.deepSubsequence(events, [
                    {type: "init", data: {id: 1}},
                    {type: "loaded", data: {id: 1}}
                ]);
            });

            it("should validate API response sequence", () => {
                const responses = [
                    {status: 200, body: {step: 1}},
                    {status: 200, body: {step: 2}},
                    {status: 200, body: {step: 3}},
                    {status: 201, body: {complete: true}}
                ];
                assert.deepSubsequence(responses, [
                    {status: 200, body: {step: 1}},
                    {status: 201, body: {complete: true}}
                ]);
            });
        });
    });
});
