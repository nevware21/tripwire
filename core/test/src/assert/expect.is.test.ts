/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { expect } from "../../../src/assert/expect";

describe("IIsOp", () => {
    it("should assert ok", () => {
        expect(true).is.ok();
        expect(1).is.ok();

        expect(false).is.not.ok();
        expect(0).is.not.ok();
    });

    it("should assert array", () => {
        expect([]).is.array();
        expect([1, 2, 3]).is.array();

        expect({}).is.not.array();
        expect(new Object()).is.not.array();
    });

    it("should assert object", () => {
        expect({}).is.object();
        expect(new Object()).is.object();

        expect(1).is.not.object();
        expect("test").is.not.object();
        expect(true).is.not.object();

        expect([]).is.object();
        expect([1, 2, 3]).is.object();

        expect(new Date()).is.object();
        expect(new Error()).is.object();
        expect(new Function()).is.not.object();
        expect(new RegExp("")).is.object();
        expect(new String("")).is.object();
        expect(new Number(1)).is.object();
        expect(new Boolean(true)).is.object();
    });

    it("should assert plain object", () => {
        expect({}).is.plainObject();
        expect(new Object()).is.plainObject();

        expect([]).is.not.plainObject();
        expect([1, 2, 3]).is.not.plainObject();

        expect(new Date()).is.not.plainObject();
        expect(new Error()).is.not.plainObject();
        expect(new Function()).is.not.plainObject();
        expect(new RegExp("")).is.not.plainObject();
        expect(new String("")).is.not.plainObject();
        expect(new Number(1)).is.not.plainObject();
        expect(new Boolean(true)).is.not.plainObject();
    });

    it("should assert function", () => {
        expect(new Function()).is.function();
        expect(() => {}).is.function();

        expect({}).is.not.function();
        expect(new Object()).is.not.function();
    });

    it("should assert string", () => {
        expect("").is.string();
        expect("test").is.string();

        expect({}).is.not.string();
        expect(new Object()).is.not.string();

        expect(new Date()).is.not.string();
        expect(new Error()).is.not.string();
        expect(new Function()).is.not.string();
        expect(new RegExp("")).is.not.string();
        expect(String("")).is.string();
        expect(new String("")).is.not.string();
        expect(new Number(1)).is.not.string();
        expect(new Boolean(true)).is.not.string();
    });

    it("should assert number", () => {
        expect(123).is.number();
        expect(0).is.number();
        expect(-123).is.number();
        expect(123.456).is.number();
        expect(-123.456).is.number();
        expect(0.123).is.number();
        expect(-0.123).is.number();

        expect({}).is.not.number();
        expect(new Object()).is.not.number();
    });

    it("should assert boolean", () => {
        expect(true).is.boolean();
        expect(false).is.boolean();

        expect({}).is.not.boolean();
        expect(new Object()).is.not.boolean();

    });

    it("should assert undefined", () => {
        expect(undefined).is.undefined();
        expect(void 0).is.undefined();
        expect(null).is.not.undefined();
        expect(false).is.not.undefined();
        expect(0).is.not.undefined();
    });

    it("should assert null", () => {
        expect(null).is.null();
        expect(undefined).is.not.null();
        expect(false).is.not.null();
        expect(0).is.not.null();

        expect({}).is.not.null();
        expect(new Object()).is.not.null();
    });

    it("should assert truthy", () => {
        expect(true).is.truthy();
        expect(1).is.truthy();
        expect("test").is.truthy();
        expect({}).is.truthy();
        expect([]).is.truthy();
        expect(new Date()).is.truthy();
        expect(new Error()).is.truthy();
        expect(new Function()).is.truthy();
        expect(new RegExp("")).is.truthy();
        expect(new String("")).is.truthy();
        expect(new Number(1)).is.truthy();
        expect(new Boolean(true)).is.truthy();

        expect(false).is.not.truthy();
        expect(0).is.not.truthy();
        expect("").is.not.truthy();
        expect(null).is.not.truthy();
        expect(undefined).is.not.truthy();
    });

    it("should assert true", () => {
        expect(true).is.true();
        expect(1).is.true();
        expect("test").is.not.true();
        expect({}).is.not.true();

        expect(false).is.not.true();
        expect(0).is.not.true();
        expect("").is.not.true();
        expect(null).is.not.true();
    });

    it("should assert false", () => {
        expect(false).is.false();
        expect(0).is.false();
        expect("").is.false();
        expect(null).is.not.false();

        expect(true).is.not.false();
        expect(1).is.not.false();
        expect("test").is.not.false();
        expect({}).is.not.false();
    });

    it("should assert empty", () => {
        expect("").is.empty();
        expect([]).is.empty();
        expect({}).is.empty();

        expect("test").is.not.empty();
        expect([1, 2, 3]).is.not.empty();
        expect({ a: 1 }).is.not.empty();
    });

    it("should assert sealed", () => {
        const obj = Object.seal({});

        expect(obj).is.sealed();
        expect({}).is.not.sealed();

        expect(() => expect(obj).is.sealed()).to.not.throw();
    });

    it("should assert frozen", () => {
        const obj = Object.freeze({});
        expect(obj).is.frozen();
        expect({}).is.not.frozen();

        expect(() => expect(obj).is.frozen()).to.not.throw();
    });

    it("should assert error", () => {
        const err = new Error();
        expect(err).is.error();
        expect(new TypeError()).is.error();
        expect(new RangeError()).is.error();
    });

    it("should assert specific error", () => {
        const err = new Error();
        expect(err).is.error(Error);
        expect(new TypeError()).is.error(TypeError);
        expect(new RangeError()).is.error(RangeError);

        expect(() => expect(err).is.error(TypeError)).to.throw();
        expect(() => expect(new TypeError()).is.error(Error)).to.not.throw();
    });
});