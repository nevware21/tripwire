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

describe("Nested Property Operations", () => {

    describe("nestedProperty", () => {
        it("should pass when nested property exists", () => {
            assert.nestedProperty({ a: { b: { c: 1 } } }, "a.b.c");
            assert.nestedProperty({ x: { y: { z: "test" } } }, "x.y.z");
        });

        it("should fail when nested property does not exist", () => {
            checkError(() => {
                assert.nestedProperty({ a: { b: 2 } }, "a.b.c");
            }, "to have a nested property");
            checkError(() => {
                assert.nestedProperty({ a: { b: { c: 1 } } }, "a.b.d");
            }, "to have a nested property");
        });

        it("should pass when nested property exists and value matches (loose equality)", () => {
            assert.nestedProperty({ a: { b: { c: 1 } } }, "a.b.c", 1);
            assert.nestedProperty({ a: { b: { c: 1 } } }, "a.b.c", "1"); // loose equality
            assert.nestedProperty({ a: { b: { c: "test" } } }, "a.b.c", "test");
        });

        it("should fail when nested property exists but value doesn't match", () => {
            checkError(() => {
                assert.nestedProperty({ a: { b: { c: 1 } } }, "a.b.c", 2);
            }, "expected {a:{b:{c:1}}} to have a nested property \"a.b.c\" equal 2");
            checkError(() => {
                assert.nestedProperty({ a: { b: { c: "test" } } }, "a.b.c", "other");
            }, "expected {a:{b:{c:\"test\"}}} to have a nested property \"a.b.c\" equal \"other\"");
        });

        it("should work with expect syntax", () => {
            expect({ a: { b: { c: 1 } } }).has.nested.property("a.b.c");
            expect({ a: { b: { c: 1 } } }).to.have.nested.property("a.b.c", 1);
        });

        it("should handle deep paths", () => {
            let obj = { a: { b: { c: { d: { e: 42 } } } } };
            assert.nestedProperty(obj, "a.b.c.d.e");
            assert.nestedProperty(obj, "a.b.c.d.e", 42);
        });

        it("should handle arrays in path", () => {
            let obj = { a: [{ b: 1 }, { b: 2 }] };
            assert.nestedProperty(obj, "a.0.b");
            assert.nestedProperty(obj, "a.1.b", 2);
        });
    });

    describe("notHasNestedProperty", () => {
        it("should pass when nested property does not exist", () => {
            assert.notNestedProperty({ a: { b: 2 } }, "a.b.c");
            assert.notNestedProperty({}, "x.y.z");
        });

        it("should fail when nested property exists", () => {
            checkError(() => {
                assert.notNestedProperty({ a: { b: { c: 1 } } }, "a.b.c");
            }, "to have a nested property \"a.b.c\"");
        });

        it("should pass when nested property exists but value doesn't match", () => {
            assert.notNestedProperty({ a: { b: { c: 1 } } }, "a.b.c", 2);
            assert.notNestedProperty({ a: { b: { c: "test" } } }, "a.b.c", "other");
        });

        it("should fail when nested property exists and value matches", () => {
            checkError(() => {
                assert.notNestedProperty({ a: { b: { c: 1 } } }, "a.b.c", 1);
            }, "not expected {a:{b:{c:1}}} to have a nested property \"a.b.c\" equal 1");
        });

        it("should work with expect syntax", () => {
            expect({ a: { b: 2 } }).to.not.have.nested.property("a.b.c");
            expect({ a: { b: { c: 1 } } }).to.not.have.nested.property("a.b.c", 2);
        });
    });

    describe("nestedProperty", () => {
        it("should pass when nested property value matches (loose equality)", () => {
            assert.nestedProperty({ a: { b: { c: 1 } } }, "a.b.c", 1);
            assert.nestedProperty({ a: { b: { c: 1 } } }, "a.b.c", "1"); // loose equality
            assert.nestedProperty({ x: { y: "test" } }, "x.y", "test");
        });

        it("should fail when nested property does not exist", () => {
            checkError(() => {
                assert.nestedProperty({ a: { b: 2 } }, "a.b.c", 1);
            }, "to have a nested property \"a.b.c\" equal 1");
        });

        it("should fail when nested property exists but value doesn't match", () => {
            checkError(() => {
                assert.nestedProperty({ a: { b: { c: 1 } } }, "a.b.c", 2);
            }, "expected {a:{b:{c:1}}} to have a nested property \"a.b.c\" equal 2");
        });

        it("should work with expect syntax", () => {
            expect({ a: { b: { c: 1 } } }).has.nested.property("a.b.c", 1);
            expect({ a: { b: { c: "1" } } }).to.have.nested.property("a.b.c", 1); // loose equality
        });
    });

    describe("notHasNestedProperty", () => {
        it("should pass when nested property does not exist", () => {
            assert.notNestedProperty({ a: { b: 2 } }, "a.b.c", 1);
        });

        it("should pass when nested property exists but value doesn't match", () => {
            assert.notNestedProperty({ a: { b: { c: 1 } } }, "a.b.c", 2);
            assert.notNestedProperty({ a: { b: { c: "test" } } }, "a.b.c", "other");
        });

        it("should fail when nested property value matches", () => {
            checkError(() => {
                assert.notNestedProperty({ a: { b: { c: 1 } } }, "a.b.c", 1);
            }, "not expected {a:{b:{c:1}}} to have a nested property \"a.b.c\" equal 1");
        });

        it("should work with expect syntax", () => {
            expect({ a: { b: { c: 1 } } }).to.not.have.nested.property("a.b.c", 2);
        });
    });

    describe("deepnestedProperty", () => {
        it("should pass when nested property deeply equals value", () => {
            assert.deepNestedProperty({ a: { b: { c: { d: 1 } } } }, "a.b.c", { d: 1 });
            assert.deepNestedProperty({ a: { b: { c: [1, 2, 3] } } }, "a.b.c", [1, 2, 3]);
        });

        it("should fail when nested property does not exist", () => {
            checkError(() => {
                assert.deepNestedProperty({ a: { b: 2 } }, "a.b.c", { d: 1 });
            }, "to have a nested property \"a.b.c\" deeply equal {d:1}");
        });

        it("should fail when nested property exists but value doesn't deeply equal", () => {
            checkError(() => {
                assert.deepNestedProperty({ a: { b: { c: { d: 1 } } } }, "a.b.c", { d: 2 });
            }, "to have a nested property \"a.b.c\" deeply equal {d:2}");
            checkError(() => {
                assert.deepNestedProperty({ a: { b: { c: [1, 2, 3] } } }, "a.b.c", [1, 2, 4]);
            }, "to have a nested property \"a.b.c\" deeply equal [1,2,4]");
        });

        it("should work with deep expect syntax", () => {
            expect({ a: { b: { c: { d: 1 } } } }).to.deep.nested.property("a.b.c", { d: 1 });
            expect({ a: { b: { c: [1, 2] } } }).to.deep.nested.property("a.b.c", [1, 2]);
        });
    });

    describe("notDeepnestedProperty", () => {
        it("should pass when nested property does not exist", () => {
            assert.notDeepNestedProperty({ a: { b: 2 } }, "a.b.c", { d: 1 });
            assert.notDeepNestedProperty({ a: { b: { c: { d: 1 } } } }, "a.b.d", { d: 1 });
        });

        it("should pass when nested property exists but value doesn't deeply equal", () => {
            assert.notDeepNestedProperty({ a: { b: { c: { d: 1 } } } }, "a.b.c", { d: 2 });
            assert.notDeepNestedProperty({ a: { b: { c: [1, 2, 3] } } }, "a.b.c", [1, 2, 4]);
        });

        it("should fail when nested property deeply equals value", () => {
            checkError(() => {
                assert.notDeepNestedProperty({ a: { b: { c: { d: 1 } } } }, "a.b.c", { d: 1 });
            }, "not expected {a:{b:{c:{d:1}}}} to have a nested property \"a.b.c\" deeply equal {d:1}");
        });

        it("should work with deep expect syntax", () => {
            expect({ a: { b: { c: { d: 1 } } } }).to.not.deep.nested.property("a.b.c", { d: 2 });
        });
    });

    describe("nestedInclude", () => {
        it("should pass when all nested properties match", () => {
            assert.nestedInclude({ a: { b: { c: 1 } } }, { "a.b.c": 1 });
            assert.nestedInclude({ x: 1, y: 2 }, { "x": 1, "y": 2 });
        });

        it("should fail when nested properties don't match", () => {
            checkError(() => {
                assert.nestedInclude({ a: { b: { c: 1 } } }, { "a.b.c": 2 });
            }, "to have a nested property \"a.b.c\" equal 2");
            
            checkError(() => {
                assert.nestedInclude({ a: { b: 2 } }, { "a.b.c": 1 });
            }, "to have a nested property \"a.b.c\" equal 1");
        });

        it("should work with expect syntax", () => {
            expect({ a: { b: { c: 1 } } }).to.have.nested.includes({ "a.b.c": 1 });
        });

        it("should handle multiple nested properties", () => {
            let obj = { a: { b: 1, c: 2 }, d: { e: 3 } };
            assert.nestedInclude(obj, { "a.b": 1, "d.e": 3 });
        });
    });

    describe("notNestedInclude", () => {
        it("should pass when nested properties don't match", () => {
            assert.notNestedInclude({ a: { b: { c: 1 } } }, { "a.b.c": 2 });
            assert.notNestedInclude({ a: { b: 2 } }, { "a.b.c": 1 });
        });

        it("should fail when all nested properties match", () => {
            checkError(() => {
                assert.notNestedInclude({ a: { b: { c: 1 } } }, { "a.b.c": 1 });
            }, "not expected {a:{b:{c:1}}} to have a nested property \"a.b.c\" equal 1");
        });

        it("should work with expect syntax", () => {
            expect({ a: { b: { c: 1 } } }).to.not.have.nested.includes({ "a.b.c": 2 });
        });
    });

    describe("deepNestedInclude", () => {
        it("should pass when all nested properties deeply match", () => {
            assert.deepNestedInclude({ a: { b: { c: { d: 1 } } } }, { "a.b.c": { d: 1 } });
            assert.deepNestedInclude({ a: { b: [1, 2, 3] } }, { "a.b": [1, 2, 3] });
        });

        it("should fail when nested properties don't deeply match", () => {
            checkError(() => {
                assert.deepNestedInclude({ a: { b: { c: { d: 1 } } } }, { "a.b.c": { d: 2 } });
            }, "to have a nested property \"a.b.c\" deeply equal {d:2}");
            checkError(() => {
                assert.deepNestedInclude({ a: { b: [1, 2, 3] } }, { "a.b": [1, 2, 4] });
            }, "to have a nested property \"a.b\" deeply equal [1,2,4]");
        });

        it("should work with deep expect syntax", () => {
            expect({ a: { b: { c: { d: 1 } } } }).to.deep.nested.includes({ "a.b.c": { d: 1 } });
        });

        it("should handle complex nested structures", () => {
            let obj = {
                user: {
                    profile: {
                        name: "John",
                        settings: { theme: "dark", lang: "en" }
                    }
                }
            };
            assert.deepNestedInclude(obj, {
                "user.profile.name": "John",
                "user.profile.settings": { theme: "dark", lang: "en" }
            });
        });
    });

    describe("notDeepNestedInclude", () => {
        it("should pass when nested properties don't deeply match", () => {
            assert.notDeepNestedInclude({ a: { b: { c: { d: 1 } } } }, { "a.b.c": { d: 2 } });
            assert.notDeepNestedInclude({ a: { b: [1, 2, 3] } }, { "a.b": [1, 2, 4] });
        });

        it("should fail when all nested properties deeply match", () => {
            checkError(() => {
                assert.notDeepNestedInclude({ a: { b: { c: { d: 1 } } } }, { "a.b.c": { d: 1 } });
            }, "not expected {a:{b:{c:{d:1}}}} to have a nested property \"a.b.c\" deeply equal {d:1}");
        });

        it("should work with deep expect syntax", () => {
            expect({ a: { b: { c: { d: 1 } } } }).to.not.deep.nested.includes({ "a.b.c": { d: 2 } });
        });
    });

    describe("edge cases", () => {
        it("should handle null and undefined in path", () => {
            checkError(() => {
                assert.nestedProperty({ a: null }, "a.b");
            }, "to have a nested property");
            checkError(() => {
                assert.nestedProperty({ a: undefined }, "a.b");
            }, "to have a nested property");
        });

        it("should handle empty paths", () => {
            checkError(() => {
                assert.nestedProperty({ a: 1 }, "");
            }, "to have a nested property");
        });

        it("should handle single-level paths", () => {
            assert.nestedProperty({ a: 1 }, "a");
            assert.nestedProperty({ a: 1 }, "a", 1);
        });

        it("should handle objects with numeric keys", () => {
            let obj = { "0": { "1": "value" } };
            assert.nestedProperty(obj, "0.1");
            assert.nestedProperty(obj, "0.1", "value");
        });

        it("should not treat dots in string values as path separators", () => {
            let obj = { a: { b: "c.d.e" } };
            assert.nestedProperty(obj, "a.b", "c.d.e");
        });
    });
});
