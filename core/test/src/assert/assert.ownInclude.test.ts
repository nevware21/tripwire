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

describe("Own Include Operations", () => {

    describe("ownInclude", () => {
        it("should pass when object has own property with matching value", () => {
            assert.ownInclude({ a: 1 }, { a: 1 });
            assert.ownInclude({ a: 1, b: 2 }, { a: 1 });
            assert.ownInclude({ a: 1, b: 2 }, { a: 1, b: 2 });
        });

        it("should fail when object has own property with different value", () => {
            checkError(() => {
                assert.ownInclude({ a: 1 }, { a: 3 });
            }, "to have own properties matching");
        });

        it("should pass when checking that inherited properties are not included", () => {
            const obj = { a: 1 };
            assert.notOwnInclude(obj, { toString: Object.prototype.toString });
        });

        it("should fail when trying to match nested objects with strict equality", () => {
            checkError(() => {
                assert.ownInclude({ a: { b: 2 } }, { a: { b: 2 } });
            }, "to have own properties matching");
        });

        it("should work with custom message", () => {
            checkError(() => {
                assert.ownInclude({ a: 1 }, { a: 3 }, "custom error");
            }, "custom error");
        });

        it("should work with expect syntax", () => {
            expect({ a: 1, b: 2 }).own.include({ a: 1 });
        });

        it("should handle empty objects", () => {
            assert.ownInclude({}, {});
            assert.ownInclude({ a: 1 }, {});
        });

        it("should handle objects with multiple properties", () => {
            const obj = { a: 1, b: 2, c: 3 };
            assert.ownInclude(obj, { a: 1 });
            assert.ownInclude(obj, { a: 1, b: 2 });
            assert.ownInclude(obj, { a: 1, b: 2, c: 3 });
        });

        it("should handle objects with undefined values", () => {
            assert.ownInclude({ a: undefined }, { a: undefined });
        });

        it("should handle objects with null values", () => {
            assert.ownInclude({ a: null }, { a: null });
        });

        it("should handle objects with boolean values", () => {
            assert.ownInclude({ a: true, b: false }, { a: true });
        });

        it("should handle objects with string values", () => {
            assert.ownInclude({ name: "test" }, { name: "test" });
        });

        it("should handle objects with number values including zero", () => {
            assert.ownInclude({ count: 0 }, { count: 0 });
        });

        it("should not match inherited properties from prototype", () => {
            function Parent(this: any) {}
            Parent.prototype.inheritedProp = "inherited";
            
            function Child(this: any) {
                this.ownProp = "own";
            }
            Child.prototype = new (Parent as any)();
            
            const instance = new (Child as any)();
            assert.ownInclude(instance, { ownProp: "own" });
            assert.notOwnInclude(instance, { inheritedProp: "inherited" });
        });
    });

    describe("notOwnInclude", () => {
        it("should pass when object does not have matching own property value", () => {
            assert.notOwnInclude({ a: 1 }, { a: 3 });
            assert.notOwnInclude({ a: 1 }, { b: 1 });
        });

        it("should pass when property is inherited not own", () => {
            assert.notOwnInclude({ a: 1 }, { toString: Object.prototype.toString });
        });

        it("should pass when nested objects don't match with strict equality", () => {
            assert.notOwnInclude({ a: { b: 2 } }, { a: { b: 2 } });
        });

        it("should fail when object has matching own property", () => {
            checkError(() => {
                assert.notOwnInclude({ a: 1 }, { a: 1 });
            }, "not expected {a:1} to have own properties matching {a:1}");
        });

        it("should work with custom message", () => {
            checkError(() => {
                assert.notOwnInclude({ a: 1 }, { a: 1 }, "custom error");
            }, "custom error");
        });

        it("should work with expect syntax", () => {
            expect({ a: 1 }).not.own.include({ a: 3 });
        });
    });

    describe("ownInclude - strings and arrays", () => {
        it("should work with strings", () => {
            assert.ownInclude("hello world", "hello");
            assert.ownInclude("hello world", "world");
        });

        it("should work with arrays using strict equality", () => {
            assert.ownInclude([1, 2, 3], 2);
            assert.ownInclude(["a", "b", "c"], "b");
        });

        it("should not match array items with different references", () => {
            assert.notOwnInclude([{ a: 1 }, { b: 2 }], { a: 1 });
        });
    });

    describe("ownInclude - error messages", () => {
        it("should provide clear error message for property mismatch", () => {
            checkError(() => {
                assert.ownInclude({ a: 1, b: 2 }, { a: 1, b: 3 });
            }, "to have own properties matching");
        });

        it("should provide clear error message for missing property", () => {
            checkError(() => {
                assert.ownInclude({ a: 1 }, { b: 2 });
            }, "to have own properties matching");
        });

        it("should provide clear error message when negation fails", () => {
            checkError(() => {
                assert.notOwnInclude({ a: 1 }, { a: 1 });
            }, "not expected");
        });
    });

    describe("deepOwnInclude", () => {
        it("should pass when object has own property with deeply equal value", () => {
            assert.deepOwnInclude({ a: { b: 2 } }, { a: { b: 2 } });
            assert.deepOwnInclude({ x: [1, 2, 3] }, { x: [1, 2, 3] });
        });

        it("should fail when nested values don't match", () => {
            checkError(() => {
                assert.deepOwnInclude({ a: { b: 2 } }, { a: { c: 3 } });
            }, "to have own properties deeply matching");
        });

        it("should pass when checking that inherited properties are not included", () => {
            const obj = { a: { b: 2 } };
            assert.notDeepOwnInclude(obj, { toString: Object.prototype.toString });
        });

        it("should work with custom message", () => {
            checkError(() => {
                assert.deepOwnInclude({ a: { b: 2 } }, { a: { c: 3 } }, "custom error");
            }, "custom error");
        });

        it("should work with expect syntax", () => {
            expect({ a: { b: 2 } }).deep.own.include({ a: { b: 2 } });
        });

        it("should handle deeply nested objects", () => {
            const obj = { a: { b: { c: { d: 1 } } } };
            assert.deepOwnInclude(obj, { a: { b: { c: { d: 1 } } } });
        });

        it("should handle arrays with objects", () => {
            const obj = { items: [{ id: 1 }, { id: 2 }] };
            assert.deepOwnInclude(obj, { items: [{ id: 1 }, { id: 2 }] });
        });

        it("should handle objects with array values", () => {
            assert.deepOwnInclude({ nums: [1, 2, 3] }, { nums: [1, 2, 3] });
        });

        it("should handle mixed nested structures", () => {
            const obj = {
                user: {
                    name: "John",
                    roles: ["admin", "user"],
                    settings: {
                        theme: "dark",
                        notifications: true
                    }
                }
            };
            assert.deepOwnInclude(obj, {
                user: {
                    name: "John",
                    roles: ["admin", "user"],
                    settings: {
                        theme: "dark",
                        notifications: true
                    }
                }
            });
        });

        it("should handle objects with null and undefined", () => {
            assert.deepOwnInclude({ a: null }, { a: null });
            assert.deepOwnInclude({ b: undefined }, { b: undefined });
        });

        it("should pass when subset of properties match", () => {
            const obj = { a: { b: 2 }, c: { d: 3 }, e: 5 };
            assert.deepOwnInclude(obj, { a: { b: 2 } });
            assert.deepOwnInclude(obj, { a: { b: 2 }, c: { d: 3 } });
        });

        it("should fail when any property doesn't match", () => {
            const obj = { a: { b: 2 }, c: { d: 3 } };
            checkError(() => {
                assert.deepOwnInclude(obj, { a: { b: 2 }, c: { d: 4 } });
            }, "to have own properties deeply matching");
        });
    });

    describe("notDeepOwnInclude", () => {
        it("should pass when nested values don't match", () => {
            assert.notDeepOwnInclude({ a: { b: 2 } }, { a: { c: 3 } });
        });

        it("should pass when property is inherited not own", () => {
            assert.notDeepOwnInclude({ a: { b: 2 } }, { toString: Object.prototype.toString });
        });

        it("should fail when nested values match", () => {
            checkError(() => {
                assert.notDeepOwnInclude({ a: { b: 2 } }, { a: { b: 2 } });
            }, "not expected {a:{b:2}} to have own properties deeply matching {a:{b:2}}");
        });

        it("should work with custom message", () => {
            checkError(() => {
                assert.notDeepOwnInclude({ a: { b: 2 } }, { a: { b: 2 } }, "custom error");
            }, "custom error");
        });

        it("should work with expect syntax", () => {
            expect({ a: { b: 2 } }).to.not.deep.own.include({ a: { c: 3 } });
        });
    });

    describe("deepOwnInclude - inherited properties", () => {
        it("should not match inherited properties", () => {
            function Parent(this: any) {}
            Parent.prototype.inheritedObj = { value: "inherited" };
            
            function Child(this: any) {
                this.ownObj = { value: "own" };
            }
            Child.prototype = new (Parent as any)();
            
            const instance = new (Child as any)();
            assert.deepOwnInclude(instance, { ownObj: { value: "own" } });
            assert.notDeepOwnInclude(instance, { inheritedObj: { value: "inherited" } });
        });
    });

    describe("deepOwnInclude - strings and arrays", () => {
        it("should work with strings", () => {
            assert.deepOwnInclude("hello world", "hello");
        });

        it("should work with arrays using deep equality", () => {
            assert.deepOwnInclude([{ a: 1 }, { b: 2 }], { a: 1 });
            assert.deepOwnInclude([{ a: 1 }, { b: 2 }], { b: 2 });
        });

        it("should fail when object is not in array", () => {
            checkError(() => {
                assert.deepOwnInclude([{ a: 1 }, { b: 2 }], { c: 3 });
            }, "to deep include own");
        });
    });

    describe("deepOwnInclude - error messages", () => {
        it("should provide clear error message for deep property mismatch", () => {
            checkError(() => {
                assert.deepOwnInclude({ a: { b: 2 } }, { a: { b: 3 } });
            }, "to have own properties deeply matching");
        });

        it("should provide clear error message when negation fails", () => {
            checkError(() => {
                assert.notDeepOwnInclude({ a: { b: 2 } }, { a: { b: 2 } });
            }, "not expected");
        });
    });
});
