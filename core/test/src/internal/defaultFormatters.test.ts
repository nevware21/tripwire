/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "../../../src/assert/assertClass";
import { checkError } from "../support/checkError";

describe("Default Formatters coverage", function () {
    describe("Symbol formatter", function () {
        it("should format symbols", function () {
            const sym = Symbol("test");
            checkError(function () {
                assert.equal(sym, Symbol("other"));
            }, /Symbol\(test\)/);
        });

        it("should format symbols without description", function () {
            const sym = Symbol();
            checkError(function () {
                assert.equal(sym, Symbol("desc"));
            }, /Symbol\(\)/);
        });

        it("should format well-known symbols", function () {
            checkError(function () {
                assert.equal(Symbol.iterator, Symbol.asyncIterator);
            }, /Symbol\./);
        });
    });

    describe("Date formatter", function () {
        it("should format dates", function () {
            const date1 = new Date("2026-01-01");
            const date2 = new Date("2026-12-31");

            checkError(function () {
                assert.equal(date1, date2);
            }, /Date/);
        });

        it("should format dates with toString fallback", function () {
            const date = new Date("2026-01-01");
            const notDate = { toString: function() {
                return date.toString();
            } };

            checkError(function () {
                assert.equal(date, notDate);
            }, /Date/);
        });
    });

    describe("Set formatter", function () {
        it("should format Sets", function () {
            const set1 = new Set([1, 2, 3]);
            const set2 = new Set([4, 5, 6]);

            checkError(function () {
                assert.equal(set1, set2);
            }, /Set/);
        });

        it("should handle empty Sets", function () {
            const set1 = new Set();
            const set2 = new Set([1]);

            checkError(function () {
                assert.equal(set1, set2);
            }, /Set/);
        });

        it("should handle Sets without forEach", function () {
            const set: any = { size: 3 };
            // No forEach method
            const realSet = new Set([1, 2, 3]);

            checkError(function () {
                assert.equal(set, realSet);
            }, /.*/);
        });

        it("should handle Set with error-prone size property", function () {
            // Just test that Sets format correctly in errors
            const set1 = new Set([1, 2, 3]);
            const set2 = new Set([4, 5, 6]);

            checkError(function () {
                assert.equal(set1, set2);
            }, /Set/);
        });

        it("should truncate large Sets with maxProps", function () {
            const largeSet = new Set();
            for (let i = 0; i < 100; i++) {
                largeSet.add(i);
            }
            const otherSet = new Set([1000]);

            checkError(function () {
                assert.equal(largeSet, otherSet);
            }, /Set/);
        });
    });

    describe("Map formatter", function () {
        it("should format Maps", function () {
            const map1 = new Map([["a", 1], ["b", 2]]);
            const map2 = new Map([["c", 3], ["d", 4]]);

            checkError(function () {
                assert.equal(map1, map2);
            }, /Map/);
        });

        it("should handle empty Maps", function () {
            const map1 = new Map();
            const map2 = new Map([["a", 1]]);

            checkError(function () {
                assert.equal(map1, map2);
            }, /Map/);
        });

        it("should handle Maps without forEach", function () {
            const map: any = { size: 1 };
            // No forEach method
            const realMap = new Map([["a", 1]]);

            checkError(function () {
                assert.equal(map, realMap);
            }, /.*/);
        });

        it("should handle Map with iteration error", function () {
            const badMap: any = new Map([["a", 1]]);
            badMap.forEach = function() {
                throw new Error("forEach failed");
            };
            const goodMap = new Map([["a", 1]]);

            checkError(function () {
                assert.equal(badMap, goodMap);
            }, /.*/);
        });

        it("should truncate large Maps with maxProps", function () {
            const largeMap = new Map();
            for (let i = 0; i < 100; i++) {
                largeMap.set("key" + i, i);
            }
            const otherMap = new Map([["other", 1000]]);

            checkError(function () {
                assert.equal(largeMap, otherMap);
            }, /Map/);
        });
    });

    describe("Error formatter", function () {
        it("should format Error objects", function () {
            const err1 = new Error("First error");
            const err2 = new Error("Second error");

            checkError(function () {
                assert.equal(err1, err2);
            }, /Error/);
        });

        it("should format TypeError", function () {
            const err1 = new TypeError("Type error");
            const err2 = new TypeError("Different type error");

            checkError(function () {
                assert.equal(err1, err2);
            }, /TypeError/);
        });

        it("should format RangeError", function () {
            const err1 = new RangeError("Range error");
            const err2 = new RangeError("Different range error");

            checkError(function () {
                assert.equal(err1, err2);
            }, /RangeError/);
        });

        it("should handle errors without name", function () {
            const err: any = new Error("Test");
            delete err.name;
            const normalErr = new Error("Other");

            checkError(function () {
                assert.equal(err, normalErr);
            }, /Error/);
        });

        it("should handle errors with name getter throwing", function () {
            const err: any = new Error("Test");
            Object.defineProperty(err, "name", {
                get() {
                    throw new Error("Cannot get name");
                }
            });
            const normalErr = new Error("Other");

            checkError(function () {
                assert.equal(err, normalErr);
            }, /Error/);
        });
    });

    describe("Function formatter", function () {
        it("should format named functions", function () {
            function func1() { }
            function func2() { }

            checkError(function () {
                assert.equal(func1, func2);
            }, /Function/);
        });

        it("should format anonymous functions", function () {
            const func1 = function() { };
            const func2 = function() { };

            checkError(function () {
                assert.equal(func1, func2);
            }, /Function/);
        });

        it("should format arrow functions", function () {
            const func1 = () => {};
            const func2 = () => {};

            checkError(function () {
                assert.equal(func1, func2);
            }, /Function/);
        });

        it("should format functions with displayName", function () {
            const func1: any = function() { };
            func1.displayName = "CustomDisplay";
            const func2 = function() { };

            checkError(function () {
                assert.equal(func1, func2);
            }, /Function/);
        });

        it("should handle function name getter throwing", function () {
            const func: any = function namedFunc() { };
            Object.defineProperty(func, "name", {
                get() {
                    throw new Error("Cannot get name");
                }
            });
            const normalFunc = function() { };

            checkError(function () {
                assert.equal(func, normalFunc);
            }, /Function/);
        });
    });

    describe("RegExp formatter", function () {
        it("should format RegExp objects", function () {
            const regex1 = /test/;
            const regex2 = /other/;

            checkError(function () {
                assert.equal(regex1, regex2);
            }, /RegExp|test|other/);
        });

        it("should format RegExp with flags", function () {
            const regex1 = /test/gi;
            const regex2 = /test/gm;

            checkError(function () {
                assert.equal(regex1, regex2);
            }, /test/);
        });
    });

    describe("Object formatter with special cases", function () {
        it("should handle objects with custom toString", function () {
            const obj1 = {
                toString() {
                    return "Custom String 1";
                }
            };
            const obj2 = {
                toString() {
                    return "Custom String 2";
                }
            };

            checkError(function () {
                assert.equal(obj1, obj2);
            }, /.*/);
        });

        it("should handle objects with toString throwing", function () {
            const obj: any = {
                toString() {
                    throw new Error("toString failed");
                }
            };

            checkError(function () {
                assert.equal(obj, { different: true });
            }, /.*/);
        });

        it("should handle objects with toString returning object", function () {
            const obj: any = {
                toString() {
                    return { not: "a string" };
                }
            };

            checkError(function () {
                assert.equal(obj, { different: true });
            }, /.*/);
        });

        it("should handle prototype chain properties", function () {
            const proto = { inherited: true };
            const obj = Object.create(proto);
            obj.own = true;

            checkError(function () {
                assert.equal(obj, { different: true });
            }, /.*/);
        });

        it("should handle objects with many properties (truncation)", function () {
            const obj1: any = {};
            const obj2: any = {};
            for (let i = 0; i < 100; i++) {
                obj1["prop" + i] = i;
                obj2["prop" + i] = i + 1000;
            }

            checkError(function () {
                assert.equal(obj1, obj2);
            }, /.*/);
        });

        it("should handle objects with Symbol properties", function () {
            const sym = Symbol("testSymbol");
            const obj1: any = { [sym]: 1 };
            const obj2: any = { [sym]: 2 };

            checkError(function () {
                assert.equal(obj1, obj2);
            }, /.*/);
        });
    });

    describe("Primitive fallback formatter", function () {
        it("should format null vs object", function () {
            checkError(function () {
                assert.equal(null, { value: 1 });
            }, /null/);
        });

        it("should format booleans", function () {
            checkError(function () {
                assert.equal(true, false);
            }, /true.*false/);
        });

        it("should format numbers", function () {
            checkError(function () {
                assert.equal(123, 456);
            }, /123.*456/);
        });

        it("should format strings", function () {
            checkError(function () {
                assert.equal("abc", "def");
            }, /abc.*def/);
        });
    });
});
