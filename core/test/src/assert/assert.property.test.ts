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

    describe("with value", () => {
        it("should pass when object has property with matching value", () => {
            assert.hasProperty({ a: 1 }, "a", 1);
            assert.hasProperty({ foo: "bar" }, "foo", "bar");
            assert.hasProperty({ x: true }, "x", true);
        });

        it("should pass with loose equality", () => {
            assert.hasProperty({ a: 1 }, "a", "1"); // 1 == "1"
            assert.hasProperty({ b: true }, "b", 1); // true == 1
        });

        it("should fail when property does not exist", () => {
            assert.throws(() => assert.hasProperty({ a: 1 }, "b", 1));
        });

        it("should fail when property value does not match", () => {
            assert.throws(() => assert.hasProperty({ a: 1 }, "a", 2));
        });

        it("should work with custom message", () => {
            assert.throws(() => assert.hasProperty({ a: 1 }, "a", 2, "custom"));
        });

        it("should pass for inherited properties", () => {
            const obj = Object.create({ a: 1 });
            assert.hasProperty(obj, "a", 1);
        });

        it("should work with expect syntax", () => {
            expect({ a: 1 }).to.have.property("a", 1);
            expect({ foo: "bar" }).to.have.property("foo", "bar");
        });
    });
});

describe("assert.notHasProperty", () => {
    it("should pass when property does not exist", () => {
        assert.notHasProperty({ a: 1 }, "b", 1);
    });

    it("should fail when property value matches", () => {
        assert.throws(() => assert.notHasProperty({ a: 1 }, "a", 1));
    });

    it("should work with custom message", () => {
        assert.throws(() => assert.notHasProperty({ a: 1 }, "a", 1, "custom"));
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
        }, "expected {a:1,b:2} to have its own \"c\" property");

        expect(() => assert.hasOwnProperty({ a: 1, b: 2 }, "c")).toThrow(AssertionFailure);
    });

    it("should throw AssertionFailure when the property is inherited and not an own property", () => {
        const obj = Object.create({ a: 1 });
        checkError(() => {
            assert.hasOwnProperty(obj, "a");
        }, /expected \[Object.*\] to have its own \"a\" property/);

        expect(() => assert.hasOwnProperty(obj, "a")).toThrow(AssertionFailure);
    });

    it("should throw AssertionFailure with a custom message when the value does not have the specified own property", () => {
        const customMessage = "Custom error message";

        checkError(() => {
            assert.hasOwnProperty({ a: 1, b: 2 }, "c", undefined, customMessage);
        }, customMessage);

        expect(() => assert.hasOwnProperty({ a: 1, b: 2 }, "c", undefined, customMessage)).toThrowError(new AssertionFailure(customMessage));
    });

    describe("with value", () => {
        it("should pass when object has own property with matching value", () => {
            assert.hasOwnProperty({ a: 1 }, "a", 1);
            assert.hasOwnProperty({ foo: "bar" }, "foo", "bar");
        });

        it("should fail when property is inherited", () => {
            const obj = Object.create({ a: 1 });
            assert.throws(() => assert.hasOwnProperty(obj, "a", 1));
        });

        it("should fail when own property value does not match", () => {
            assert.throws(() => assert.hasOwnProperty({ a: 1 }, "a", 2));
        });

        it("should work with custom message", () => {
            assert.throws(() => assert.hasOwnProperty({ a: 1 }, "a", 2, "custom"));
        });

        it("should work with expect syntax", () => {
            expect({ a: 1 }).to.have.own.property("a", 1);
        });
    });
});

describe("assert.notHasOwnProperty", () => {
    it("should pass when property does not exist", () => {
        expect(() => assert.notHasOwnProperty({ a: 1 }, "b", 1)).to.not.throw();
    });

    it("should fail when own property value matches", () => {
        assert.throws(() => assert.notHasOwnProperty({ a: 1 }, "a", 1));
    });

    it("should work with custom message", () => {
        assert.throws(() => assert.notHasOwnProperty({ a: 1 }, "a", 1, "custom"));
    });
});

describe("assert.hasDeepProperty", () => {
    it("should pass with deep equality", () => {
        assert.hasDeepProperty({ a: { b: 1 } }, "a", { b: 1 });
        assert.hasDeepProperty({ arr: [1, 2, 3] }, "arr", [1, 2, 3 ]);
    });

    it("should fail when deep value does not match", () => {
        assert.throws(() => assert.hasDeepProperty({ a: { b: 1 } }, "a", { b: 2 }));
    });

    it("should work with nested objects", () => {
        const obj = { x: { y: { z: "deep" } } };
        assert.hasDeepProperty(obj, "x", { y: { z: "deep" } });
    });

    it("should fail with missing nested properties", () => {
        assert.throws(() => assert.hasDeepProperty({ a: { b: 1 } }, "a", { b: 1, c: 2 }));
    });

    it("should work with custom message", () => {
        assert.throws(() => assert.hasDeepProperty({ a: { b: 1 } }, "a", { b: 2 }, "custom"));
    });

    it("should work with expect syntax", () => {
        expect({ a: { b: 1 } }).to.deep.property("a", { b: 1 });
    });
});

describe("assert.notHasDeepProperty", () => {
    it("should pass when property does not exist", () => {
        assert.notHasDeepProperty({ a: { b: 1 } }, "c", { b: 2 });
    });

    it("should fail when deep value matches", () => {
        assert.throws(() => assert.notHasDeepProperty({ a: { b: 1 } }, "a", { b: 1 }));
    });

    it("should work with custom message", () => {
        assert.throws(() => assert.notHasDeepProperty({ a: { b: 1 } }, "a", { b: 1 }, "custom"));
    });
});

describe("assert.hasDeepOwnProperty", () => {
    it("should pass when own property has matching deep value", () => {
        assert.hasDeepOwnProperty({ a: { b: 1 } }, "a", { b: 1 });
    });

    it("should fail when property is inherited", () => {
        const obj = Object.create({ a: { b: 1 } });
        assert.throws(() => assert.hasDeepOwnProperty(obj, "a", { b: 1 }));
    });

    it("should fail when own property deep value does not match", () => {
        assert.throws(() => assert.hasDeepOwnProperty({ a: { b: 1 } }, "a", { b: 2 }));
    });

    it("should work with arrays", () => {
        assert.hasDeepOwnProperty({ arr: [1, 2, 3] }, "arr", [1, 2, 3]);
    });

    it("should work with custom message", () => {
        assert.throws(() => assert.hasDeepOwnProperty({ a: { b: 1 } }, "a", { b: 2 }, "custom"));
    });

    it("should work with expect syntax", () => {
        expect({ a: { b: 1 } }).to.deep.own.property("a", { b: 1 });
    });
});

describe("assert.notHasDeepOwnProperty", () => {
    it("should pass when property does not exist", () => {
        assert.notHasDeepOwnProperty({ a: { b: 1 } }, "c", { b: 1 });
    });

    it("should fail when own property deep value matches", () => {
        assert.throws(() => assert.notHasDeepOwnProperty({ a: { b: 1 } }, "a", { b: 1 }));
    });

    it("should work with custom message", () => {
        assert.throws(() => assert.notHasDeepOwnProperty({ a: { b: 1 } }, "a", { b: 1 }, "custom"));
    });
});

describe("property edge cases", () => {
    describe("with null and undefined", () => {
        it("should handle null values", () => {
            assert.hasProperty({ a: null }, "a", null);

            // Intentionally relies on loose equality where null == undefined to verify that
            // hasProperty treats null and undefined as equivalent for this assertion. This is
            // an edge case of the API and should be documented so users are aware of it.
            assert.hasProperty({ a: null }, "a", undefined); // null == undefined
        });

        it("should handle undefined values", () => {
            assert.hasProperty({ a: undefined }, "a", undefined);
        });
    });

    describe("with arrays", () => {
        it("should work with array properties", () => {
            const obj = { arr: [1, 2, 3] };
            assert.hasProperty(obj, "arr", obj.arr); // Same reference
        });

        it("should fail for different array references with same content using propertyVal", () => {
            assert.throws(() => assert.hasProperty({ arr: [1, 2, 3] }, "arr", [1, 2, 3]));
        });

        it("deep should work with arrays", () => {
            assert.hasDeepProperty({ arr: [1, 2, 3] }, "arr", [1, 2, 3]);
        });
    });

    describe("with special values", () => {
        it("should work with functions", () => {
            const fn = () => {};
            assert.hasProperty({ func: fn }, "func", fn);
        });

        it("should work with symbols", () => {
            const sym = Symbol("test");
            assert.hasProperty({ s: sym }, "s", sym);
        });
    });

    describe("with number property names", () => {
        it("should work with numeric property names", () => {
            assert.hasProperty({ 0: "first", 1: "second" }, "0", "first");
            assert.hasProperty([10, 20, 30], "1", 20);
        });
    });

    describe("combinations", () => {
        it("should chain with other assertions using propertyResultOp", () => {
            expect({ a: 1 }).to.have.property("a").value.equals(1);
            expect({ obj: { b: 2 } }).to.deep.property("obj").value.deep.equals({ b: 2 });
        });
    });
});
