/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { expect } from "../../../src/assert/expect";
import { checkError } from "../support/checkError";

describe("expect.has", () => {

    describe("own", () => {
        const proto = { inherited: 1 };

        function target(): any {
            const obj = Object.create(proto);
            obj.own = 2;
            return obj;
        }

        it("restricts property and include to own properties", () => {
            expect(target()).has.own.property("own");
            expect(target()).has.own.property("own", 2);
            expect(target()).has.own.include({ own: 2 });
            expect(target()).has.own.contain({ own: 2 });
            expect(target()).has.property("inherited");

            checkError(() => {
                expect(target()).has.own.property("inherited");
            }, /to have its own .*inherited.* property/);
            checkError(() => {
                expect(target()).has.own.include({ inherited: 1 });
            }, /to have own properties matching/);
        });

        it("offers the has operations under own", () => {
            expect(target()).has.own.all.keys("own");
            expect(target()).has.own.any.keys("own", "missing");
            expect([1, 2, 3]).has.own.lengthOf(3);
            expect(new Map([["a", 1]])).has.own.sizeOf(1);
            expect({ a: { b: 1 } }).has.own.nested.property("a.b");

            checkError(() => {
                expect(target()).has.own.all.keys("own", "missing");
            }, /expected all keys/);
            checkError(() => {
                expect([1, 2, 3]).has.own.lengthOf(2);
            }, /length/);
        });
    });

    it("should call all.keys with correct arguments", () => {
        expect({ a: 1, b: 2 }).has.all.keys("a", "b");

        checkError(() => {
            expect({ a: 1, b: 2 }).has.all.keys("a", "c");
        }, "expected all keys: [\"a\",\"c\"], missing: [\"c\"], found: [\"a\",\"b\"]");

        expect(() => expect({ a: 1, b: 2 }).has.all.keys("a", "c")).toThrow();
    });

    it("should call any.keys with correct arguments", () => {
        expect({ a: 1, b: 2 }).has.any.keys("a", "b");

        checkError(() => {
            expect({ a: 1, b: 2 }).has.any.keys("c", "d");
        }, "expected any key: [\"c\",\"d\"], found: [\"a\",\"b\"]");
        expect(() => expect({ a: 1, b: 2 }).has.any.keys("c", "d")).toThrow();
    });

    it("should call property with correct arguments", () => {
        expect({ a: 1, b: 2 }).has.property("a");

        checkError(() => {
            expect({ a: 1, b: 2 }).has.property("c");
        }, "expected {a:1,b:2} to have a \"c\" property");
    });

    it("should call propertyDescriptor with correct arguments", () => {
        expect({ a: 1, b: 2 }).has.propertyDescriptor("a");

        checkError(() => {
            expect({ a: 1, b: 2 }).has.propertyDescriptor("c");
        }, "expected {a:1,b:2} to have a \"c\" property descriptor");
    });

    it("should call own.property with correct arguments", () => {
        expect({ a: 1, b: 2 }).has.own.property("a");

        checkError(() => {
            expect({ a: 1, b: 2 }).has.own.property("c");
        }, "expected {a:1,b:2} to have its own \"c\" property");
    });
});

describe("expect.has.property", () => {
    it("should pass when object has the specified property", () => {
        const obj = { a: 1, b: 2 };

        expect(obj).has.property("a").strictly.equals(obj);
        expect(obj).has.property("a").that.equals(1);
        expect(obj).has.property("a").value.equals(1);

        expect(() => expect(obj).has.property("a")).to.not.throw();
        expect(() => expect(obj).has.property("a").that.equals(1)).to.not.throw();
        expect(() => expect(obj).has.property("a").value.equals(1)).to.not.throw();
    });

    it("should fail when object does not have the specified property", () => {
        const obj = { a: 1, b: 2 };

        checkError(() => {
            expect(obj).has.property("c");
        }, "expected {a:1,b:2} to have a \"c\" property");

        checkError(() => {
            expect(obj).has.property("c").equals(obj);
        }, "expected {a:1,b:2} to have a \"c\" property");

        checkError(() => {
            expect(obj).has.property("c").that.equals(undefined);
        }, "expected {a:1,b:2} to have a \"c\" property");

        checkError(() => {
            expect(obj).has.property("c").value.equals(undefined);
        }, "expected {a:1,b:2} to have a \"c\" property");

        expect(() => expect(obj).has.property("c")).to.throw();
        expect(() => expect(obj).has.property("c").that.equals(undefined)).to.throw();
        expect(() => expect(obj).has.property("c").value.equals(undefined)).to.throw();
    });
});