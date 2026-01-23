/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { AssertionFailure } from "../../../src/assert/assertionError";
import { expect } from "../../../src/assert/expect";

describe("assert deep keys", () => {
    describe("has.any.deep.keys", () => {
        it("should pass when Map has any deep key match", () => {
            const map = new Map();
            map.set({ greeting: "hello", subject: "friend" }, "value1");
            map.set({ message: "darkness", type: "familiar" }, "value2");
            
            expect(map).to.have.any.deep.keys({ greeting: "hello", subject: "friend" });
            expect(map).to.have.any.deep.keys({ message: "darkness", type: "familiar" });
            expect(map).to.have.any.deep.keys([{ greeting: "hello", subject: "friend" }, { echo: "calling" }]);
        });

        it("should pass when Set has any deep key match", () => {
            const set = new Set();
            set.add({ greeting: "hello", subject: "friend" });
            set.add({ message: "darkness", type: "familiar" });
            
            expect(set).to.have.any.deep.keys({ greeting: "hello", subject: "friend" });
            expect(set).to.have.any.deep.keys({ message: "darkness", type: "familiar" });
            expect(set).to.have.any.deep.keys([{ greeting: "hello", subject: "friend" }, { echo: "calling" }]);
        });

        it("should pass when object has any deep key match", () => {
            const obj: any = {};
            obj[JSON.stringify({ greeting: "hello", subject: "friend" })] = "value1";
            obj[JSON.stringify({ message: "darkness", type: "familiar" })] = "value2";
            
            // Note: Regular objects can't have deep object keys, so this tests string keys
            expect(obj).to.have.any.deep.keys(JSON.stringify({ greeting: "hello", subject: "friend" }));
        });

        it("should fail when Map does not have any deep key match", () => {
            const map = new Map();
            map.set({ greeting: "hello", subject: "friend" }, "value1");
            map.set({ message: "darkness", type: "familiar" }, "value2");
            
            expect(() => {
                expect(map).to.have.any.deep.keys({ echo: "calling", void: "silence" });
            }).to.throw(AssertionFailure);
            
            expect(() => {
                expect(map).to.have.any.deep.keys([{ echo: "calling" }, { vision: "softly" }]);
            }).to.throw(AssertionFailure);
        });

        it("should work with expect syntax", () => {
            const map = new Map();
            map.set({ greeting: "hello", subject: "friend" }, "val");
            
            expect(map).to.have.any.deep.keys({ greeting: "hello", subject: "friend" });
            expect(() => expect(map).to.have.any.deep.keys({ echo: "calling" })).to.throw();
        });

        it("should work with complex nested objects as keys", () => {
            const map = new Map();
            map.set({ nested: { value: [1, 2, 3] } }, "data");
            
            expect(map).to.have.any.deep.keys({ nested: { value: [1, 2, 3] } });
        });
    });

    describe("has.all.deep.keys", () => {
        it("should pass when Map has all deep key matches", () => {
            const map = new Map();
            map.set({ greeting: "hello", subject: "friend" }, "value1");
            map.set({ message: "darkness", type: "familiar" }, "value2");
            map.set({ echo: "calling", void: "silence" }, "value3");
            
            expect(map).to.have.all.deep.keys([{ greeting: "hello", subject: "friend" }, { message: "darkness", type: "familiar" }]);
            expect(map).to.have.all.deep.keys([{ greeting: "hello", subject: "friend" }, { message: "darkness", type: "familiar" }, { echo: "calling", void: "silence" }]);
        });

        it("should pass when Set has all deep key matches", () => {
            const set = new Set();
            set.add({ greeting: "hello", subject: "friend" });
            set.add({ message: "darkness", type: "familiar" });
            
            expect(set).to.have.all.deep.keys([{ greeting: "hello", subject: "friend" }, { message: "darkness", type: "familiar" }]);
        });

        it("should fail when Map is missing some deep keys", () => {
            const map = new Map();
            map.set({ greeting: "hello", subject: "friend" }, "value1");
            map.set({ message: "darkness", type: "familiar" }, "value2");
            
            expect(() => {
                expect(map).to.have.all.deep.keys([{ greeting: "hello", subject: "friend" }, { echo: "calling" }]);
            }).to.throw(AssertionFailure);
        });

        it("should work with expect syntax", () => {
            const map = new Map();
            map.set({ greeting: "hello", subject: "friend" }, "val1");
            map.set({ message: "darkness", type: "familiar" }, "val2");
            
            expect(map).to.have.all.deep.keys([{ greeting: "hello", subject: "friend" }, { message: "darkness", type: "familiar" }]);
            expect(() => expect(map).to.have.all.deep.keys([{ greeting: "hello", subject: "friend" }, { echo: "calling" }])).to.throw();
        });

        it("should work with single key", () => {
            const map = new Map();
            map.set({ greeting: "hello", subject: "friend" }, "value");
            
            expect(map).to.have.all.deep.keys({ greeting: "hello", subject: "friend" });
        });
    });

    describe("not.has.any.deep.keys", () => {
        it("should pass when Map does not have any deep key match", () => {
            const map = new Map();
            map.set({ greeting: "hello", subject: "friend" }, "value1");
            map.set({ message: "darkness", type: "familiar" }, "value2");
            
            expect(map).to.not.have.any.deep.keys({ echo: "calling", void: "silence" });
            expect(map).to.not.have.any.deep.keys([{ echo: "calling" }, { vision: "softly" }]);
        });

        it("should fail when Map has at least one deep key match", () => {
            const map = new Map();
            map.set({ greeting: "hello", subject: "friend" }, "value1");
            map.set({ message: "darkness", type: "familiar" }, "value2");
            
            expect(() => {
                expect(map).to.not.have.any.deep.keys({ greeting: "hello", subject: "friend" });
            }).to.throw(AssertionFailure);
            
            expect(() => {
                expect(map).to.not.have.any.deep.keys([{ greeting: "hello", subject: "friend" }, { echo: "calling" }]);
            }).to.throw(AssertionFailure);
        });

        it("should work with expect syntax", () => {
            const map = new Map();
            map.set({ greeting: "hello", subject: "friend" }, "val");
            
            expect(map).to.not.have.any.deep.keys({ message: "darkness" });
            expect(() => expect(map).to.not.have.any.deep.keys({ greeting: "hello", subject: "friend" })).to.throw();
        });
    });

    describe("not.has.all.deep.keys", () => {
        it("should pass when Map does not have all deep key matches", () => {
            const map = new Map();
            map.set({ greeting: "hello", subject: "friend" }, "value1");
            map.set({ message: "darkness", type: "familiar" }, "value2");
            
            expect(map).to.not.have.all.deep.keys([{ greeting: "hello", subject: "friend" }, { echo: "calling" }]);
            expect(map).to.not.have.all.deep.keys([{ echo: "calling" }, { vision: "softly" }]);
        });

        it("should fail when Map has all deep key matches", () => {
            const map = new Map();
            map.set({ greeting: "hello", subject: "friend" }, "value1");
            map.set({ message: "darkness", type: "familiar" }, "value2");
            
            expect(() => {
                expect(map).to.not.have.all.deep.keys([{ greeting: "hello", subject: "friend" }, { message: "darkness", type: "familiar" }]);
            }).to.throw(AssertionFailure);
        });

        it("should work with expect syntax", () => {
            const map = new Map();
            map.set({ greeting: "hello", subject: "friend" }, "val1");
            map.set({ message: "darkness", type: "familiar" }, "val2");
            
            expect(map).to.not.have.all.deep.keys([{ greeting: "hello", subject: "friend" }, { echo: "calling" }]);
            expect(() => expect(map).to.not.have.all.deep.keys([{ greeting: "hello", subject: "friend" }, { message: "darkness", type: "familiar" }])).to.throw();
        });
    });

    describe("contains.all.deep.keys", () => {
        it("should pass when Map contains all deep keys", () => {
            const map = new Map();
            map.set({ greeting: "hello", subject: "friend" }, "value1");
            map.set({ message: "darkness", type: "familiar" }, "value2");
            map.set({ echo: "calling", void: "silence" }, "value3");
            
            expect(map).to.contain.all.deep.keys([{ greeting: "hello", subject: "friend" }, { message: "darkness", type: "familiar" }]);
        });

        it("should work with expect syntax", () => {
            const map = new Map();
            map.set({ greeting: "hello", subject: "friend" }, "val1");
            map.set({ message: "darkness", type: "familiar" }, "val2");
            
            expect(map).to.contain.all.deep.keys([{ greeting: "hello", subject: "friend" }]);
        });
    });

    describe("edge cases", () => {
        it("should work with symbol keys in objects", () => {
            const sym1 = Symbol("test");
            const obj: any = {};
            obj[sym1] = "value";
            
            expect(obj).to.have.any.deep.keys(sym1);
        });

        it("should work with numeric keys", () => {
            const obj: any = { 1: "one", 2: "two" };
            expect(obj).to.have.any.deep.keys("1");
        });

        it("should work with empty Map", () => {
            const map = new Map();
            
            expect(() => {
                expect(map).to.have.any.deep.keys({ a: 1 });
            }).to.throw(AssertionFailure);
        });

        it("should work with null prototype objects as keys", () => {
            const map = new Map();
            const nullProtoKey = Object.create(null);
            nullProtoKey.a = 1;
            map.set(nullProtoKey, "value");
            
            const testKey = Object.create(null);
            testKey.a = 1;
            
            expect(map).to.have.any.deep.keys(testKey);
        });

        it("should distinguish between similar but not equal objects", () => {
            const map = new Map();
            map.set({ greeting: "hello", subject: "friend", extra: "data" }, "value");
            
            expect(() => {
                expect(map).to.have.any.deep.keys({ greeting: "hello", subject: "friend" });
            }).to.throw(AssertionFailure);
        });

        it("should work with arrays as Map keys", () => {
            const map = new Map();
            map.set([1, 2, 3], "value");
            
            // Use double array wrapping to check for array as literal key
            expect(map).to.have.any.deep.keys([[1, 2, 3]]);
        });

        it("should work with Date objects as keys", () => {
            const map = new Map();
            const date = new Date("2020-01-01");
            map.set(date, "value");
            
            expect(map).to.have.any.deep.keys(new Date("2020-01-01"));
        });
    });
});
