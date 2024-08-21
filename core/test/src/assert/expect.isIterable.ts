/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { expect } from "../../../src/assert/expect";
import { checkError } from "../support/checkError";

describe("expect.is.iterable", () => {
    it("should pass when array is iterable", () => {
        const arr = [1, 2, 3];
        expect(arr).is.iterable();
        expect(() => expect(arr).is.iterable()).to.not.throw();
    });

    it("should pass when string is iterable", () => {
        const str = "hello darkness my old friend";

        expect(str).is.iterable();
        expect(() => expect(str).is.iterable()).to.not.throw();
    });

    it("should pass when object is iterable", () => {
        const obj = { a: 1, b: 2, c: 3 };

        checkError(() => {
            expect(obj).is.iterable();
        }, "expected {a:1,b:2,c:3} to be an iterable");
        expect(() => expect(obj).is.iterable()).to.throw();
    });

    it("should fail when number is not iterable", () => {
        checkError(() => {
            expect(1).is.iterable();
        }, "expected 1 to be an iterable");

        expect(() => expect(1).is.iterable()).to.throw();
    });

    it("should fail when boolean is not iterable", () => {
        checkError(() => {
            expect(true).is.iterable();
        }, "expected true to be an iterable");

        expect(() => expect(true).is.iterable()).to.throw();
    });

    it("should fail when null is not iterable", () => {
        checkError(() => {
            expect(null).is.iterable();
        }, "expected null to be an iterable");

        expect(() => expect(null).is.iterable()).to.throw();
    });

    it("should fail when undefined is not iterable", () => {
        checkError(() => {
            expect(undefined).is.iterable();
        }, "expected undefined to be an iterable");

        expect(() => expect(undefined).is.iterable()).to.throw();
    });

    it("should fail when function is not iterable", () => {
        checkError(() => {
            expect(() => {}).is.iterable();
        }, "expected [Function] to be an iterable");

        expect(() => expect(() => {}).is.iterable()).to.throw();
    });

    it("should fail when symbol is not iterable", () => {
        checkError(() => {
            expect(Symbol()).is.iterable();
        }, "expected [Symbol()] to be an iterable");

        expect(() => expect(Symbol()).is.iterable()).to.throw();
    });
});

describe("expect.is.not.iterable", () => {
    it("should fail when array is iterable", () => {
        checkError(() => {
            const arr = [1, 2, 3];
            expect(arr).is.not.iterable();
        }, "not expected [1,2,3] to be an iterable");

        expect(() => {
            const arr = [1, 2, 3];
            expect(arr).is.not.iterable();
        }).to.throw();
    });

    it("should fail when string is iterable", () => {
        const str = "hello darkness my old friend";
        checkError(() => {
            expect(str).is.not.iterable();
        }, "not expected \"hello darkness my old friend\" to be an iterable");
    });

    it("should fail when object is iterable", () => {
        const obj = { a: 1, b: 2, c: 3 };
        expect(obj).is.not.iterable();

        const obj2 = { a: 1, b: 2, c: 3 };
        expect(obj2).is.not.iterable();
    });

    it("should pass when number is not iterable", () => {
        expect(1).is.not.iterable();
        expect(() => expect(1).is.not.iterable()).to.not.throw();
    });

    it("should pass when boolean is not iterable", () => {
        expect(true).is.not.iterable();
        expect(() => expect(true).is.not.iterable()).to.not.throw();
    });

    it("should pass when null is not iterable", () => {
        expect(null).is.not.iterable();
        expect(() => expect(null).is.not.iterable()).to.not.throw();
    });

    it("should pass when undefined is not iterable", () => {
        expect(undefined).is.not.iterable();
        expect(() => expect(undefined).is.not.iterable()).to.not.throw();
    });

    it("should pass when function is not iterable", () => {
        expect(() => {}).is.not.iterable();
        expect(() => expect(() => {}).is.not.iterable()).to.not.throw();
    });
});