/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "../../../../src/assert/assertClass";
import { expect } from "../../../../src/assert/expect";

describe("numericOp tests", () => {
    describe("above / greaterThan / gt", () => {
        it("should pass when value is above expected (numbers)", () => {
            expect(5).is.above(4);
            expect(5).is.greaterThan(4);
            expect(5).is.gt(4);
        });

        it("should pass when value is above expected (dates)", () => {
            const date1 = new Date(2024, 0, 2);
            const date2 = new Date(2024, 0, 1);
            expect(date1).is.above(date2);
            expect(date1).is.greaterThan(date2);
            expect(date1).is.gt(date2);
        });

        it("should fail when value is not above expected", () => {
            expect(() => expect(4).is.above(5)).to.throw();
            expect(() => expect(5).is.above(5)).to.throw();
        });

        it("should work with not operator", () => {
            expect(4).is.not.above(5);
            expect(5).is.not.above(5);
            expect(() => expect(6).is.not.above(5)).to.throw();
        });

        it("should fail when value is not a number or date", () => {
            expect(() => expect("5").is.above(4)).to.throw();
            expect(() => expect(null).is.above(4)).to.throw();
            expect(() => expect(undefined).is.above(4)).to.throw();
        });
    });

    describe("least / greaterThanOrEqual / gte", () => {
        it("should pass when value is at least expected (numbers)", () => {
            expect(5).is.least(4);
            expect(5).is.least(5);
            expect(5).is.greaterThanOrEqual(4);
            expect(5).is.gte(5);
        });

        it("should pass when value is at least expected (dates)", () => {
            const date1 = new Date(2024, 0, 2);
            const date2 = new Date(2024, 0, 1);
            const date3 = new Date(2024, 0, 2);
            expect(date1).is.least(date2);
            expect(date1).is.least(date3);
        });

        it("should fail when value is below expected", () => {
            expect(() => expect(4).is.least(5)).to.throw();
        });

        it("should work with not operator", () => {
            expect(4).is.not.least(5);
            expect(() => expect(5).is.not.least(5)).to.throw();
        });
    });

    describe("below / lessThan / lt", () => {
        it("should pass when value is below expected (numbers)", () => {
            expect(4).is.below(5);
            expect(4).is.lessThan(5);
            expect(4).is.lt(5);
        });

        it("should pass when value is below expected (dates)", () => {
            const date1 = new Date(2024, 0, 1);
            const date2 = new Date(2024, 0, 2);
            expect(date1).is.below(date2);
            expect(date1).is.lessThan(date2);
            expect(date1).is.lt(date2);
        });

        it("should fail when value is not below expected", () => {
            expect(() => expect(5).is.below(4)).to.throw();
            expect(() => expect(5).is.below(5)).to.throw();
        });

        it("should work with not operator", () => {
            expect(5).is.not.below(4);
            expect(5).is.not.below(5);
            expect(() => expect(4).is.not.below(5)).to.throw();
        });
    });

    describe("most / lessThanOrEqual / lte", () => {
        it("should pass when value is at most expected (numbers)", () => {
            expect(4).is.most(5);
            expect(5).is.most(5);
            expect(4).is.lessThanOrEqual(5);
            expect(5).is.lte(5);
        });

        it("should pass when value is at most expected (dates)", () => {
            const date1 = new Date(2024, 0, 1);
            const date2 = new Date(2024, 0, 2);
            const date3 = new Date(2024, 0, 1);
            expect(date1).is.most(date2);
            expect(date1).is.most(date3);
        });

        it("should fail when value is above expected", () => {
            expect(() => expect(5).is.most(4)).to.throw();
        });

        it("should work with not operator", () => {
            expect(5).is.not.most(4);
            expect(() => expect(5).is.not.most(5)).to.throw();
        });
    });

    describe("within", () => {
        it("should pass when value is within range (numbers)", () => {
            expect(5).is.within(1, 10);
            expect(5).is.within(5, 10);
            expect(5).is.within(1, 5);
            expect(5).is.within(5, 5);
        });

        it("should pass when value is within range (dates)", () => {
            const date = new Date(2024, 0, 15);
            const start = new Date(2024, 0, 1);
            const end = new Date(2024, 0, 31);
            expect(date).is.within(start, end);
        });

        it("should fail when value is outside range", () => {
            expect(() => expect(0).is.within(1, 10)).to.throw();
            expect(() => expect(11).is.within(1, 10)).to.throw();
        });

        it("should work with not operator", () => {
            expect(0).is.not.within(1, 10);
            expect(11).is.not.within(1, 10);
            expect(() => expect(5).is.not.within(1, 10)).to.throw();
        });

        it("should fail when value is not a number or date", () => {
            expect(() => expect("5").is.within(1, 10)).to.throw();
        });
    });

    describe("custom messages", () => {
        it("should use custom message when provided", () => {
            try {
                expect(3).is.above(5, "custom above message");
                assert.fail("Expected assertion to fail");
            } catch (err: any) {
                expect(err.message).to.include("custom above message");
            }
        });

        it("should use custom message for within", () => {
            try {
                expect(15).is.within(1, 10, "custom within message");
                assert.fail("Expected assertion to fail");
            } catch (err: any) {
                expect(err.message).to.include("custom within message");
            }
        });
    });
});
