/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { expect } from "../../../src/assert/expect";
import { checkError } from "../support/checkError";

describe("expect.include operation", () => {
    it("should pass when array includes the specified element", () => {
        const arr = [1, 2, 3];
        expect(arr).include(2);
        expect(() => expect(arr).include(2)).to.not.throw();
    });

    it("should fail when array does not include the specified element", () => {
        const arr = [1, 2, 3];
        checkError(() => {
            expect(arr).include(4);
        }, "expected [1,2,3] to include 4");

        expect(() => expect(arr).include(4)).to.throw();
    });

    it("should pass when string includes the specified substring", () => {
        const str = "hello darkness my old friend";

        expect(str).include("darkness");
        expect(() => expect(str).include("darkness")).to.not.throw();
    });

    it("should fail when string does not include the specified substring", () => {
        const str = "hello darkness my old friend";
        checkError(() => {
            expect(str).include("planet");
        }, "expected \"hello darkness my old friend\" to include \"planet\"");

        expect(() => expect(str).include("planet")).to.throw();
    });

    it("should pass when object includes the specified keys", () => {
        const obj = { a: 1, b: 2, c: 3 };

        expect(obj).include.all.keys("a", "b");
        expect(() => expect(obj).include.all.keys("a", "b")).to.not.throw();
    });

    it("should fail when object does not include the specified keys", () => {
        const obj = { a: 1, b: 2, c: 3 };

        checkError(() => {
            expect(obj).include.all.keys("a", "d");
        }, "expected all keys: [a,d], missing: [d], found: [a,b,c]");

        expect(() => expect(obj).include.all.keys("a", "d")).to.throw();
    });

    it("should pass when object includes the any specified keys", () => {
        const obj = { a: 1, b: 2, c: 3 };

        expect(obj).include.any.keys("a", "b");
        expect(() => expect(obj).include.any.keys("a", "b")).to.not.throw();
    });

    it("should pass when object includes at least one specified key", () => {
        const obj = { a: 1, b: 2, c: 3 };

        expect(obj).include.any.keys("a", "d");
        expect(() => expect(obj).include.any.keys("a", "d")).to.not.throw();
    });

    it("should fail when object does not include any of the specified keys", () => {
        const obj = { a: 1, b: 2, c: 3 };

        checkError(() => {
            expect(obj).include.any.keys("x", "d");
        }, "expected any key: [x,d], found: [a,b,c]");

        expect(() => expect(obj).include.any.keys("x", "d")).to.throw();
    });
});

