/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { expect } from "../../../src/assert/expect";
import { checkError } from "../support/checkError";

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
});