/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { expect } from "../../../src/assert/expect";
import { checkError } from "../support/checkError";

describe("expect.to.deep.strictly", () => {
    it("compares deeply with strict equality under equal, equals and eq", () => {
        expect({ a: [1, { b: 2 }] }).to.deep.strictly.equal({ a: [1, { b: 2 }] });
        expect({ a: [1, { b: 2 }] }).to.deep.strictly.equals({ a: [1, { b: 2 }] });
        expect({ a: [1, { b: 2 }] }).to.deep.strictly.eq({ a: [1, { b: 2 }] });

        // Deeply equal only loosely: the strict comparison tells 1 from "1".
        expect({ a: 1 }).to.deep.equal({ a: "1" } as any);
        checkError(() => {
            expect({ a: 1 }).to.deep.strictly.equal({ a: "1" } as any);
        }, /expected .* to deeply and strictly equal/);
    });

    it("negates through not", () => {
        expect({ a: 1 }).to.deep.strictly.not.equal({ a: "1" } as any);

        checkError(() => {
            expect({ a: 1 }).to.deep.strictly.not.equal({ a: 1 });
        }, /not .*deeply and strictly equal/);
    });

    it("checks strict true and false", () => {
        expect(true).to.deep.strictly.true();
        expect(false).to.deep.strictly.false();

        checkError(() => {
            expect(1).to.deep.strictly.true();
        }, /expected 1 to be strictly true/);
        checkError(() => {
            expect(0).to.deep.strictly.false();
        }, /expected 0 to be strictly false/);
    });
});

describe("expect.to.have", () => {

    it("should call all.keys with correct arguments", () => {
        expect({ a: 1, b: 2 }).to.have.all.keys("a", "b");

        checkError(() => {
            expect({ a: 1, b: 2 }).to.have.all.keys("a", "c");
        }, "expected all keys: [\"a\",\"c\"], missing: [\"c\"], found: [\"a\",\"b\"]");

        expect(() => expect({ a: 1, b: 2 }).to.have.all.keys("a", "c")).toThrow();
    });

    it("should call any.keys with correct arguments", () => {
        expect({ a: 1, b: 2 }).to.have.any.keys("a", "b");

        checkError(() => {
            expect({ a: 1, b: 2 }).to.have.any.keys("c", "d");
        }, "expected any key: [\"c\",\"d\"], found: [\"a\",\"b\"]");
        expect(() => expect({ a: 1, b: 2 }).to.have.any.keys("c", "d")).toThrow();
    });

    it("should call property with correct arguments", () => {
        expect({ a: 1, b: 2 }).to.have.property("a");

        checkError(() => {
            expect({ a: 1, b: 2 }).to.have.property("c");
        }, "expected {a:1,b:2} to have a \"c\" property");
    });

    it("should call propertyDescriptor with correct arguments", () => {
        expect({ a: 1, b: 2 }).to.have.propertyDescriptor("a");

        checkError(() => {
            expect({ a: 1, b: 2 }).to.have.propertyDescriptor("c");
        }, "expected {a:1,b:2} to have a \"c\" property descriptor");
    });

    it("should call own.property with correct arguments", () => {
        expect({ a: 1, b: 2 }).to.have.own.property("a");

        checkError(() => {
            expect({ a: 1, b: 2 }).to.have.own.property("c");
        }, "expected {a:1,b:2} to have its own \"c\" property");
    });

    // Test Case for to
    it("should call to with correct arguments", () => {
        expect({ a: 1, b: 2 }).to.be.a.object();

        checkError(() => {
            expect({ a: 1, b: 2 }).to.be.a.array();
        }, "expected {a:1,b:2} to be an array");

        expect([ "hello", "darkness", "my", "old", "friend" ]).to.be.a.array();
    });

    it("should accept Chai's at as a decorative chain word", () => {
        expect(5).to.be.at.least(5);
        expect(5).to.be.at.most(5);
        expect(5).to.be.at.least(1);

        checkError(() => {
            expect(4).to.be.at.least(5);
        }, "expected 4 to be at least 5");

        checkError(() => {
            expect(11).to.be.at.most(10);
        }, "expected 11 to be at most 10");
    });
});