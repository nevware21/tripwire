/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { expect } from "../../../src/assert/expect";

describe("ownInclude and notOwnInclude", () => {
    
    describe("ownInclude - basic functionality", () => {
        it("should pass when object has own property with matching value", () => {
            expect({ a: 1 }).own.include({ a: 1 });
            expect({ a: 1, b: 2 }).own.include({ a: 1 });
            expect({ a: 1, b: 2 }).own.include({ a: 1, b: 2 });
        });

        it("should fail when object has own property with different value", () => {
            expect(() => {
                expect({ a: 1 }).own.include({ a: 3 });
            }).to.throw("expected {a:1} to have own properties matching {a:3}");
        });

        it("should pass when checking that inherited properties are not included", () => {
            const obj = { a: 1 };
            expect(obj).not.own.include({ toString: Object.prototype.toString });
        });

        it("should fail when trying to match nested objects with strict equality", () => {
            expect(() => {
                expect({ a: { b: 2 } }).own.include({ a: { b: 2 } });
            }).to.throw("expected {a:{b:2}} to have own properties matching {a:{b:2}}");
        });

        it("should work with custom message", () => {
            expect(() => {
                expect({ a: 1 }).own.include({ a: 3 }, "custom error");
            }).to.throw(/custom error/);
        });
    });

    describe("notOwnInclude - basic functionality", () => {
        it("should pass when object does not have matching own property value", () => {
            expect({ a: 1 }).not.own.include({ a: 3 });
            expect({ a: 1 }).not.own.include({ b: 1 });
        });

        it("should pass when property is inherited not own", () => {
            expect({ a: 1 }).not.own.include({ toString: Object.prototype.toString });
        });

        it("should pass when nested objects don't match with strict equality", () => {
            expect({ a: { b: 2 } }).not.own.include({ a: { b: 2 } });
        });

        it("should fail when object has matching own property", () => {
            expect(() => {
                expect({ a: 1 }).not.own.include({ a: 1 });
            }).to.throw("not expected {a:1} to have own properties matching {a:1}");
        });

        it("should work with custom message", () => {
            expect(() => {
                expect({ a: 1 }).not.own.include({ a: 1 }, "custom error");
            }).to.throw(/custom error/);
        });
    });

    describe("ownInclude - edge cases", () => {
        it("should handle empty objects", () => {
            expect({}).own.include({});
            expect({ a: 1 }).own.include({});
        });

        it("should handle objects with multiple properties", () => {
            const obj = { a: 1, b: 2, c: 3 };
            expect(obj).own.include({ a: 1 });
            expect(obj).own.include({ a: 1, b: 2 });
            expect(obj).own.include({ a: 1, b: 2, c: 3 });
        });

        it("should handle objects with undefined values", () => {
            expect({ a: undefined }).own.include({ a: undefined });
        });

        it("should handle objects with null values", () => {
            expect({ a: null }).own.include({ a: null });
        });

        it("should handle objects with boolean values", () => {
            expect({ a: true, b: false }).own.include({ a: true });
        });

        it("should handle objects with string values", () => {
            expect({ name: "test" }).own.include({ name: "test" });
        });

        it("should handle objects with number values including zero", () => {
            expect({ count: 0 }).own.include({ count: 0 });
        });

        it("should handle objects with symbol keys", () => {
            const sym = Symbol("test");
            const obj = { [sym]: "value" };
            expect(obj).own.include({ [sym]: "value" });
        });

        it("should not match inherited properties from prototype", () => {
            function Parent(this: any) {}
            Parent.prototype.inheritedProp = "inherited";
            
            function Child(this: any) {
                this.ownProp = "own";
            }
            Child.prototype = new (Parent as any)();
            
            const instance = new (Child as any)();
            expect(instance).own.include({ ownProp: "own" });
            expect(instance).not.own.include({ inheritedProp: "inherited" });
        });
    });

    describe("ownInclude with strings and arrays", () => {
        it("should work with strings", () => {
            expect("hello world").own.include("hello");
            expect("hello world").own.include("world");
        });

        it("should work with arrays using strict equality", () => {
            expect([1, 2, 3]).own.include(2);
            expect(["a", "b", "c"]).own.include("b");
        });

        it("should not match array items with different references", () => {
            expect([{ a: 1 }, { b: 2 }]).not.own.include({ a: 1 });
        });
    });

    describe("error messages", () => {
        it("should provide clear error message for property mismatch", () => {
            try {
                expect({ a: 1, b: 2 }).own.include({ a: 1, b: 3 });
                throw new Error("Should have thrown");
            } catch (err: any) {
                expect(err.message).to.include("expected");
                expect(err.message).to.include("to have own properties matching");
            }
        });

        it("should provide clear error message for missing property", () => {
            try {
                expect({ a: 1 }).own.include({ b: 2 });
                throw new Error("Should have thrown");
            } catch (err: any) {
                expect(err.message).to.include("expected");
                expect(err.message).to.include("to have own properties matching");
            }
        });

        it("should provide clear error message when negation fails", () => {
            try {
                expect({ a: 1 }).not.own.include({ a: 1 });
                throw new Error("Should have thrown");
            } catch (err: any) {
                expect(err.message).to.include("not expected");
                expect(err.message).to.include("to have own properties matching");
            }
        });
    });
});

describe("deepOwnInclude and notDeepOwnInclude", () => {
    
    describe("deepOwnInclude - basic functionality", () => {
        it("should pass when object has own property with deeply equal value", () => {
            expect({ a: { b: 2 } }).deep.own.include({ a: { b: 2 } });
            expect({ x: [1, 2, 3] }).deep.own.include({ x: [1, 2, 3] });
        });

        it("should fail when nested values don't match", () => {
            expect(() => {
                expect({ a: { b: 2 } }).deep.own.include({ a: { c: 3 } });
            }).to.throw("expected {a:{b:2}} to have own properties deeply matching {a:{c:3}}");
        });

        it("should pass when checking that inherited properties are not included", () => {
            const obj = { a: { b: 2 } };
            expect(obj).not.deep.own.include({ toString: Object.prototype.toString });
        });

        it("should work with custom message", () => {
            expect(() => {
                expect({ a: { b: 2 } }).deep.own.include({ a: { c: 3 } }, "custom error");
            }).to.throw(/custom error/);
        });
    });

    describe("notDeepOwnInclude - basic functionality", () => {
        it("should pass when nested values don't match", () => {
            expect({ a: { b: 2 } }).not.deep.own.include({ a: { c: 3 } });
        });

        it("should pass when property is inherited not own", () => {
            expect({ a: { b: 2 } }).not.deep.own.include({ toString: Object.prototype.toString });
        });

        it("should fail when nested values match", () => {
            expect(() => {
                expect({ a: { b: 2 } }).not.deep.own.include({ a: { b: 2 } });
            }).to.throw("not expected {a:{b:2}} to have own properties deeply matching {a:{b:2}}");
        });

        it("should work with custom message", () => {
            expect(() => {
                expect({ a: { b: 2 } }).not.deep.own.include({ a: { b: 2 } }, "custom error");
            }).to.throw(/custom error/);
        });
    });

    describe("deepOwnInclude - deep equality scenarios", () => {
        it("should handle deeply nested objects", () => {
            const obj = { a: { b: { c: { d: 1 } } } };
            expect(obj).deep.own.include({ a: { b: { c: { d: 1 } } } });
        });

        it("should handle arrays with objects", () => {
            const obj = { items: [{ id: 1 }, { id: 2 }] };
            expect(obj).deep.own.include({ items: [{ id: 1 }, { id: 2 }] });
        });

        it("should handle objects with array values", () => {
            expect({ nums: [1, 2, 3] }).deep.own.include({ nums: [1, 2, 3] });
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
            expect(obj).deep.own.include({
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
            expect({ a: null }).deep.own.include({ a: null });
            expect({ b: undefined }).deep.own.include({ b: undefined });
        });

        it("should handle objects with dates", () => {
            const date = new Date("2024-01-01");
            expect({ timestamp: date }).deep.own.include({ timestamp: date });
        });
    });

    describe("deepOwnInclude - partial matching", () => {
        it("should pass when subset of properties match", () => {
            const obj = { a: { b: 2 }, c: { d: 3 }, e: 5 };
            expect(obj).deep.own.include({ a: { b: 2 } });
            expect(obj).deep.own.include({ a: { b: 2 }, c: { d: 3 } });
        });

        it("should fail when any property doesn't match", () => {
            const obj = { a: { b: 2 }, c: { d: 3 } };
            expect(() => {
                expect(obj).deep.own.include({ a: { b: 2 }, c: { d: 4 } });
            }).to.throw();
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
            expect(instance).deep.own.include({ ownObj: { value: "own" } });
            expect(instance).not.deep.own.include({ inheritedObj: { value: "inherited" } });
        });
    });

    describe("deepOwnInclude with strings and arrays", () => {
        it("should work with strings", () => {
            expect("hello world").deep.own.include("hello");
        });

        it("should work with arrays using deep equality", () => {
            expect([{ a: 1 }, { b: 2 }]).deep.own.include({ a: 1 });
            expect([{ a: 1 }, { b: 2 }]).deep.own.include({ b: 2 });
        });

        it("should fail when object is not in array", () => {
            expect(() => {
                expect([{ a: 1 }, { b: 2 }]).deep.own.include({ c: 3 });
            }).to.throw();
        });
    });

    describe("error messages", () => {
        it("should provide clear error message for deep property mismatch", () => {
            try {
                expect({ a: { b: 2 } }).deep.own.include({ a: { b: 3 } });
                throw new Error("Should have thrown");
            } catch (err: any) {
                expect(err.message).to.include("expected");
                expect(err.message).to.include("to have own properties deeply matching");
            }
        });

        it("should provide clear error message when negation fails", () => {
            try {
                expect({ a: { b: 2 } }).to.not.deep.own.include({ a: { b: 2 } });
                throw new Error("Should have thrown");
            } catch (err: any) {
                expect(err.message).to.include("not expected");
                expect(err.message).to.include("to have own properties deeply matching");
            }
        });
    });
});
