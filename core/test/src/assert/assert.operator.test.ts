/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "../../../src/assert/assertClass";
import { checkError } from "../support/checkError";

describe("assert.operator", () => {
    describe("== (loose equality)", () => {
        it("should pass when values are loosely equal", () => {
            assert.operator(1, "==", 1);
            assert.operator("1", "==", 1);
            assert.operator(true, "==", 1);
            assert.operator(false, "==", 0);
            assert.operator(null, "==", undefined);
            assert.operator(undefined, "==", null);
            assert.operator([], "==", false);
        });

        it("should fail when values are not loosely equal", () => {
            checkError(
                () => assert.operator(1, "==", 2),
                "expected 1 to be == 2"
            );
        });

        it("should work with custom message", () => {
            checkError(
                () => assert.operator(1, "==", 2, "custom message"),
                "custom message"
            );
        });
    });

    describe("=== (strict equality)", () => {
        it("should pass when values are strictly equal", () => {
            assert.operator(1, "===", 1);
            assert.operator("test", "===", "test");
            assert.operator(true, "===", true);
            assert.operator(null, "===", null);
            assert.operator(undefined, "===", undefined);
        });

        it("should fail when values are not strictly equal", () => {
            checkError(
                () => assert.operator(1, "===", "1"),
                "expected 1 to be === \"1\""
            );
        });

        it("should fail on type coercion cases", () => {
            checkError(
                () => assert.operator(null, "===", undefined),
                "expected null to be === undefined"
            );
        });
    });

    describe("< (less than)", () => {
        it("should pass when first value is less than second", () => {
            assert.operator(1, "<", 2);
            assert.operator(-10, "<", 0);
            assert.operator(0, "<", 1);
            assert.operator("a", "<", "b");
        });

        it("should fail when first value is not less than second", () => {
            checkError(
                () => assert.operator(2, "<", 1),
                "expected 2 to be < 1"
            );
        });

        it("should fail when values are equal", () => {
            checkError(
                () => assert.operator(1, "<", 1),
                "expected 1 to be < 1"
            );
        });

        it("should work with custom message", () => {
            checkError(
                () => assert.operator(2, "<", 1, "blah"),
                "blah"
            );
        });
    });

    describe("> (greater than)", () => {
        it("should pass when first value is greater than second", () => {
            assert.operator(2, ">", 1);
            assert.operator(0, ">", -10);
            assert.operator(100, ">", 99);
            assert.operator("b", ">", "a");
        });

        it("should fail when first value is not greater than second", () => {
            checkError(
                () => assert.operator(1, ">", 2),
                "expected 1 to be > 2"
            );
        });

        it("should fail when values are equal", () => {
            checkError(
                () => assert.operator(1, ">", 1),
                "expected 1 to be > 1"
            );
        });
    });

    describe("<= (less than or equal)", () => {
        it("should pass when first value is less than second", () => {
            assert.operator(1, "<=", 2);
            assert.operator(-10, "<=", 0);
        });

        it("should pass when values are equal", () => {
            assert.operator(1, "<=", 1);
            assert.operator(0, "<=", 0);
            assert.operator(-5, "<=", -5);
        });

        it("should fail when first value is greater than second", () => {
            checkError(
                () => assert.operator(2, "<=", 1),
                "expected 2 to be <= 1"
            );
        });
    });

    describe(">= (greater than or equal)", () => {
        it("should pass when first value is greater than second", () => {
            assert.operator(2, ">=", 1);
            assert.operator(0, ">=", -10);
        });

        it("should pass when values are equal", () => {
            assert.operator(1, ">=", 1);
            assert.operator(0, ">=", 0);
            assert.operator(-5, ">=", -5);
        });

        it("should fail when first value is less than second", () => {
            checkError(
                () => assert.operator(1, ">=", 2),
                "expected 1 to be >= 2"
            );
        });
    });

    describe("!= (loose inequality)", () => {
        it("should pass when values are not loosely equal", () => {
            assert.operator(1, "!=", 2);
            assert.operator("a", "!=", "b");
            assert.operator(true, "!=", false);
        });

        it("should fail when values are loosely equal", () => {
            checkError(
                () => assert.operator(1, "!=", 1),
                "expected 1 to be != 1"
            );
        });

        it("should fail on type coercion cases", () => {
            checkError(
                () => assert.operator(1, "!=", "1"),
                "expected 1 to be != \"1\""
            );
        });
    });

    describe("!== (strict inequality)", () => {
        it("should pass when values are not strictly equal", () => {
            assert.operator(1, "!==", 2);
            assert.operator(1, "!==", "1");
            assert.operator(null, "!==", undefined);
            assert.operator(true, "!==", 1);
        });

        it("should fail when values are strictly equal", () => {
            checkError(
                () => assert.operator(1, "!==", 1),
                "expected 1 to be !== 1"
            );
        });
    });

    describe("typeof (type checking)", () => {
        it("should pass when typeof matches expected type", () => {
            assert.operator("hello", "typeof", "string");
            assert.operator(123, "typeof", "number");
            assert.operator(true, "typeof", "boolean");
            assert.operator({}, "typeof", "object");
            assert.operator([], "typeof", "object");
            assert.operator(() => {}, "typeof", "function");
            assert.operator(undefined, "typeof", "undefined");
            assert.operator(Symbol(), "typeof", "symbol");
            assert.operator(BigInt(123), "typeof", "bigint");
        });

        it("should fail when typeof does not match expected type", () => {
            checkError(() => {
                assert.operator("hello", "typeof", "number");
            }, "expected \"hello\" to be typeof \"number\"");
        });

        it("should fail with correct type names", () => {
            checkError(() => {
                assert.operator(123, "typeof", "string");
            }, "expected 123 to be typeof \"string\"");

            checkError(() => {
                assert.operator(true, "typeof", "number");
            }, "expected true to be typeof \"number\"");
        });

        it("should work with custom message", () => {
            assert.operator("test", "typeof", "string", "Should be a string");
            
            checkError(() => {
                assert.operator(123, "typeof", "string", "Value must be a string");
            }, "Value must be a string");
        });
    });

    describe("invalid operator", () => {
        it("should fail with invalid operator", () => {
            checkError(
                () => assert.operator(1, "=", 2),
                /Invalid operator/
            );
        });

        it("should work with custom message on invalid operator", () => {
            checkError(
                () => assert.operator(1, "=", 2, "blah"),
                "blah"
            );
        });

        it("should fail with other invalid operators", () => {
            checkError(
                () => assert.operator(1, ">>", 2),
                /Invalid operator/
            );

            checkError(
                () => assert.operator(1, "&&", 2),
                /Invalid operator/
            );

            checkError(
                () => assert.operator(1, "||", 2),
                /Invalid operator/
            );
        });
    });

    describe("edge cases", () => {
        it("should handle null and undefined", () => {
            let w: any;
            assert.operator(w, "==", undefined);
            assert.operator(w, "===", undefined);
            assert.operator(w, "==", null);
            assert.operator(null, "==", null);
            assert.operator(undefined, "==", undefined);
        });

        it("should handle NaN (always not equal to itself)", () => {
            checkError(
                () => assert.operator(NaN, "==", NaN),
                "expected NaN to be == NaN"
            );

            checkError(
                () => assert.operator(NaN, "===", NaN),
                "expected NaN to be === NaN"
            );

            assert.operator(NaN, "!=", NaN);
            assert.operator(NaN, "!==", NaN);
        });

        it("should handle zero values", () => {
            assert.operator(0, "==", 0);
            assert.operator(0, "===", 0);
            assert.operator(-0, "===", 0);
            assert.operator(+0, "===", 0);
        });

        it("should handle boolean comparisons", () => {
            assert.operator(true, "==", true);
            assert.operator(false, "==", false);
            assert.operator(true, "!=", false);
            assert.operator(true, "!==", false);
        });

        it("should handle string comparisons", () => {
            assert.operator("abc", "<", "abd");
            assert.operator("xyz", ">", "abc");
            assert.operator("test", "==", "test");
            assert.operator("test", "===", "test");
        });

        it("should handle type coercion with ==", () => {
            assert.operator(1, "==", "1");
            assert.operator(0, "==", false);
            assert.operator(1, "==", true);
            assert.operator("", "==", false);
        });

        it("should not coerce with ===", () => {
            assert.operator(1, "!==", "1");
            assert.operator(0, "!==", false);
            assert.operator(1, "!==", true);
            assert.operator("", "!==", false);
        });

        it("should handle objects (by reference)", () => {
            const obj1 = { a: 1 };
            const obj2 = { a: 1 };
            const obj3 = obj1;

            assert.operator(obj1, "===", obj1);
            assert.operator(obj1, "===", obj3);
            assert.operator(obj1, "!==", obj2);
            assert.operator(obj2, "!==", obj3);
        });

        it("should handle arrays (by reference)", () => {
            const arr1 = [1, 2, 3];
            const arr2 = [1, 2, 3];
            const arr3 = arr1;

            assert.operator(arr1, "===", arr1);
            assert.operator(arr1, "===", arr3);
            assert.operator(arr1, "!==", arr2);
        });
    });

    describe("real-world scenarios", () => {
        it("should work with numeric ranges", () => {
            const age = 25;
            assert.operator(age, ">=", 18);
            assert.operator(age, "<", 65);
        });

        it("should work with version comparison", () => {
            const version = "1.2.3";
            assert.operator(version, "!==", "1.2.2");
            assert.operator(version, "===", "1.2.3");
        });

        it("should work with status codes", () => {
            const statusCode = 200;
            assert.operator(statusCode, ">=", 200);
            assert.operator(statusCode, "<", 300);
        });

        it("should work with boundary checks", () => {
            const value = 50;
            const min = 0;
            const max = 100;

            assert.operator(value, ">=", min);
            assert.operator(value, "<=", max);
        });
    });
});
