/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2026 NevWare21 Solutions LLC
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
        const str = "walking through darkness and saying hello";

        expect(str).include("darkness");
        expect(() => expect(str).include("darkness")).to.not.throw();
    });

    it("should fail when string does not include the specified substring", () => {
        const str = "walking through darkness and saying hello";
        checkError(() => {
            expect(str).include("planet");
        }, "expected \"walking through darkness and saying hello\" to include \"planet\"");

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
        }, "expected all keys: [\"a\",\"d\"], missing: [\"d\"], found: [\"a\",\"b\",\"c\"]");

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
        }, "expected any key: [\"x\",\"d\"], found: [\"a\",\"b\",\"c\"]");

        expect(() => expect(obj).include.any.keys("x", "d")).to.throw();
    });

    describe("object property matching", () => {
        it("should pass when Error includes the specified properties", () => {
            const err = new Error("foo");
            expect(err).include({ message: "foo" });
            expect(() => expect(err).include({ message: "foo" })).to.not.throw();
        });

        it("should fail when Error does not include the specified properties", () => {
            const err = new Error("foo");
            checkError(() => {
                expect(err).include({ message: "bar" });
            }, "expected");
            expect(() => expect(err).include({ message: "bar" })).to.throw();
        });

        it("should pass when Error includes multiple specified properties", () => {
            const err: any = new Error("foo");
            err.code = 123;
            expect(err).include({ message: "foo", code: 123 });
            expect(() => expect(err).include({ message: "foo", code: 123 })).to.not.throw();
        });

        it("should fail when Error is missing one of the specified properties", () => {
            const err = new Error("foo");
            checkError(() => {
                expect(err).include({ message: "foo", code: 123 });
            }, "expected");
            expect(() => expect(err).include({ message: "foo", code: 123 })).to.throw();
        });

        it("should work with nested Error objects", () => {
            const err: any = new Error("outer");
            err.inner = new Error("inner");
            expect(err).include({ message: "outer" });
            expect(() => expect(err).include({ message: "outer" })).to.not.throw();
        });
    });

    describe("deep include with object property matching", () => {
        it("should pass when Error includes the specified properties with deep equality", () => {
            const err: any = new Error("foo");
            err.data = { code: 123 };
            expect(err).deep.include({ data: { code: 123 } });
            expect(() => expect(err).deep.include({ data: { code: 123 } })).to.not.throw();
        });

        it("should fail when nested property values don't match", () => {
            const err: any = new Error("foo");
            err.data = { code: 123 };
            checkError(() => {
                expect(err).deep.include({ data: { code: 456 } });
            }, "expected");
            expect(() => expect(err).deep.include({ data: { code: 456 } })).to.throw();
        });

        it("should pass when object includes nested properties with deep equality", () => {
            const obj = { a: 1, b: { c: 2, d: 3 } };
            expect(obj).deep.include({ b: { c: 2, d: 3 } });
            expect(() => expect(obj).deep.include({ b: { c: 2, d: 3 } })).to.not.throw();
        });

        it("should fail when nested object structure doesn't match", () => {
            const obj = { a: 1, b: { c: 2, d: 3 } };
            checkError(() => {
                expect(obj).deep.include({ b: { c: 2, d: 99 } });
            }, "expected");
            expect(() => expect(obj).deep.include({ b: { c: 2, d: 99 } })).to.throw();
        });
    });
});

