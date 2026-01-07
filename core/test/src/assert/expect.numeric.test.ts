/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { expect } from "../../../src/assert/expect";
import { checkError } from "../support/checkError";

describe("expect numeric operations", () => {
    describe("above / greaterThan / gt", () => {
        it("should pass when value is above expected (numbers)", () => {
            expect(5).is.above(4);
            expect(5).is.greaterThan(4);
            expect(5).is.gt(4);
            expect(10).to.be.above(0);
            expect(0.1).to.be.greaterThan(0);
            expect(-1).to.be.gt(-2);
        });

        it("should pass when value is above expected (dates)", () => {
            const date1 = new Date(2024, 0, 2);
            const date2 = new Date(2024, 0, 1);
            expect(date1).is.above(date2);
            expect(date1).to.be.greaterThan(date2);
            expect(date1).to.be.gt(date2);
        });

        it("should fail when value is not above expected", () => {
            checkError(() => {
                expect(4).is.above(5);
            }, "expected 4 to be above 5");

            checkError(() => {
                expect(5).is.above(5);
            }, "expected 5 to be above 5");

            checkError(() => {
                expect(3).to.be.greaterThan(5);
            }, "expected 3 to be above 5");
        });

        it("should work with not operator", () => {
            expect(4).is.not.above(5);
            expect(5).is.not.above(5);
            expect(3).to.not.be.greaterThan(5);

            checkError(() => {
                expect(6).is.not.above(5);
            }, /not expected.*to be above 5/);
        });

        it("should fail when value is not a number or date", () => {
            checkError(() => {
                expect("5").is.above(4);
            }, "expected \"5\" to be a number or date");

            checkError(() => {
                expect(null).is.above(4);
            }, "expected null to be a number or date");
        });

        it("should support custom messages", () => {
            checkError(() => {
                expect(3).is.above(5, "custom message");
            }, "custom message");
        });
    });

    describe("least / greaterThanOrEqual / gte", () => {
        it("should pass when value is at least expected (numbers)", () => {
            expect(5).is.least(4);
            expect(5).is.least(5);
            expect(5).is.greaterThanOrEqual(4);
            expect(5).is.gte(5);
            expect(10).to.be.least(0);
            expect(0).to.be.gte(0);
        });

        it("should pass when value is at least expected (dates)", () => {
            const date1 = new Date(2024, 0, 2);
            const date2 = new Date(2024, 0, 1);
            const date3 = new Date(2024, 0, 2);
            expect(date1).is.least(date2);
            expect(date1).is.least(date3);
            expect(date1).to.be.greaterThanOrEqual(date2);
        });

        it("should fail when value is below expected", () => {
            checkError(() => {
                expect(4).is.least(5);
            }, "expected 4 to be at least 5");

            checkError(() => {
                expect(0).to.be.gte(1);
            }, "expected 0 to be at least 1");
        });

        it("should work with not operator", () => {
            expect(4).is.not.least(5);
            expect(3).to.not.be.gte(5);

            checkError(() => {
                expect(5).is.not.least(5);
            }, /not expected.*to be at least 5/);
        });

        it("should support custom messages", () => {
            checkError(() => {
                expect(3).is.least(5, "custom message");
            }, "custom message");
        });
    });

    describe("below / lessThan / lt", () => {
        it("should pass when value is below expected (numbers)", () => {
            expect(4).is.below(5);
            expect(4).is.lessThan(5);
            expect(4).is.lt(5);
            expect(0).to.be.below(10);
            expect(-2).to.be.lessThan(-1);
        });

        it("should pass when value is below expected (dates)", () => {
            const date1 = new Date(2024, 0, 1);
            const date2 = new Date(2024, 0, 2);
            expect(date1).is.below(date2);
            expect(date1).to.be.lessThan(date2);
            expect(date1).to.be.lt(date2);
        });

        it("should fail when value is not below expected", () => {
            checkError(() => {
                expect(5).is.below(4);
            }, "expected 5 to be below 4");

            checkError(() => {
                expect(5).is.below(5);
            }, "expected 5 to be below 5");

            checkError(() => {
                expect(7).to.be.lessThan(5);
            }, "expected 7 to be below 5");
        });

        it("should work with not operator", () => {
            expect(5).is.not.below(4);
            expect(5).is.not.below(5);
            expect(7).to.not.be.lt(5);

            checkError(() => {
                expect(4).is.not.below(5);
            }, /not expected.*to be below 5/);
        });

        it("should support custom messages", () => {
            checkError(() => {
                expect(7).is.below(5, "custom message");
            }, "custom message");
        });
    });

    describe("most / lessThanOrEqual / lte", () => {
        it("should pass when value is at most expected (numbers)", () => {
            expect(4).is.most(5);
            expect(5).is.most(5);
            expect(4).is.lessThanOrEqual(5);
            expect(5).is.lte(5);
            expect(0).to.be.most(10);
            expect(-1).to.be.lte(0);
        });

        it("should pass when value is at most expected (dates)", () => {
            const date1 = new Date(2024, 0, 1);
            const date2 = new Date(2024, 0, 2);
            const date3 = new Date(2024, 0, 1);
            expect(date1).is.most(date2);
            expect(date1).is.most(date3);
            expect(date1).to.be.lessThanOrEqual(date2);
        });

        it("should fail when value is above expected", () => {
            checkError(() => {
                expect(5).is.most(4);
            }, "expected 5 to be at most 4");

            checkError(() => {
                expect(10).to.be.lte(0);
            }, "expected 10 to be at most 0");
        });

        it("should work with not operator", () => {
            expect(5).is.not.most(4);
            expect(10).to.not.be.lte(5);

            checkError(() => {
                expect(5).is.not.most(5);
            }, /not expected.*to be at most 5/);
        });

        it("should support custom messages", () => {
            checkError(() => {
                expect(7).is.most(5, "custom message");
            }, "custom message");
        });
    });

    describe("within", () => {
        it("should pass when value is within range (numbers)", () => {
            expect(5).is.within(1, 10);
            expect(5).is.within(5, 10);
            expect(5).is.within(1, 5);
            expect(5).is.within(5, 5);
            expect(0).to.be.within(-10, 10);
        });

        it("should pass when value is within range (dates)", () => {
            const date = new Date(2024, 0, 15);
            const start = new Date(2024, 0, 1);
            const end = new Date(2024, 0, 31);
            expect(date).is.within(start, end);
            expect(date).to.be.within(start, end);
        });

        it("should fail when value is outside range", () => {
            checkError(() => {
                expect(0).is.within(1, 10);
            }, "expected 0 to be within 1..10");

            checkError(() => {
                expect(11).is.within(1, 10);
            }, "expected 11 to be within 1..10");

            checkError(() => {
                expect(-1).to.be.within(0, 10);
            }, "expected -1 to be within 0..10");
        });

        it("should work with not operator", () => {
            expect(0).is.not.within(1, 10);
            expect(11).is.not.within(1, 10);
            expect(-1).to.not.be.within(0, 10);

            checkError(() => {
                expect(5).is.not.within(1, 10);
            }, /not expected.*to be within 1\.\.10/);
        });

        it("should support custom messages", () => {
            checkError(() => {
                expect(15).is.within(1, 10, "custom message");
            }, "custom message");
        });

        it("should fail when value is not a number or date", () => {
            checkError(() => {
                expect("5").is.within(1, 10);
            }, "expected \"5\" to be a number or date");
        });
    });

    describe("chaining with other operations", () => {
        it("should work with type checks", () => {
            expect(5).is.a.number();
            expect(5).is.above(4);
            expect(5).to.be.a.number();
            expect(5).to.be.least(5);
            expect(4).to.be.a.number();
            expect(4).to.be.below(5);
        });

        it("should work with equality checks", () => {
            const value = 5;
            expect(value).is.equal(value);
            expect(value).is.above(4);
            expect(value).equals(5);
            expect(value).to.be.below(10);
        });

        it("should combine multiple numeric operations", () => {
            expect(5).is.above(4);
            expect(5).is.below(6);
            expect(5).is.least(5);
            expect(5).is.most(5);
            expect(5).to.be.within(1, 10);
            expect(5).to.be.above(4);
        });
    });

    describe("edge cases", () => {
        it("should handle negative numbers correctly", () => {
            expect(-1).is.above(-2);
            expect(-2).is.below(-1);
            expect(-1).is.least(-1);
            expect(-1).is.most(-1);
            expect(-5).is.within(-10, 0);
        });

        it("should handle zero correctly", () => {
            expect(1).is.above(0);
            expect(0).is.below(1);
            expect(0).is.least(0);
            expect(0).is.most(0);
            expect(0).is.within(-1, 1);
        });

        it("should handle decimal numbers correctly", () => {
            expect(1.1).is.above(1.0);
            expect(1.0).is.below(1.1);
            expect(1.1).is.least(1.1);
            expect(1.1).is.most(1.1);
            expect(1.5).is.within(1.0, 2.0);
        });

        it("should handle dates at boundaries correctly", () => {
            const date1 = new Date(2024, 0, 1);
            const date2 = new Date(2024, 0, 1);
            expect(date1).is.least(date2);
            expect(date1).is.most(date2);
        });

        it("should handle very large numbers", () => {
            expect(Number.MAX_SAFE_INTEGER).is.above(0);
            expect(Number.MIN_SAFE_INTEGER).is.below(0);
            expect(1e10).is.within(0, 1e11);
        });
    });
});
