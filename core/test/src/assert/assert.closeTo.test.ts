/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "../../../src/assert/assertClass";
import { expect } from "../../../src/assert/expect";
import { checkError } from "../support/checkError";

describe("assert.closeTo", () => {
    describe("basic functionality", () => {
        it("should pass when actual is within delta of expected", () => {
            assert.closeTo(1.5, 1.0, 0.5);
            assert.closeTo(10, 20, 20);
            assert.closeTo(-10, 20, 30);
            assert.closeTo(5, 5, 0);
            assert.closeTo(0.1, 0.2, 0.1);
        });

        it("should pass when actual exactly equals expected", () => {
            assert.closeTo(5, 5, 0);
            assert.closeTo(100, 100, 0);
            assert.closeTo(-50, -50, 0);
        });

        it("should pass when difference equals delta", () => {
            assert.closeTo(2, 1, 1);
            assert.closeTo(10, 5, 5);
            assert.closeTo(-5, 0, 5);
        });

        it("should fail when difference exceeds delta", () => {
            checkError(
                () => assert.closeTo(2, 1.0, 0.5),
                "expected 2 to be close to 1 +/- 0.5"
            );
        });

        it("should fail with appropriate message", () => {
            checkError(
                () => assert.closeTo(-10, 20, 29),
                "expected -10 to be close to 20 +/- 29"
            );
        });

        it("should work with custom message", () => {
            checkError(
                () => assert.closeTo(2, 1.0, 0.5, "blah"),
                "blah"
            );
        });
    });

    describe("negative numbers", () => {
        it("should handle negative actual values", () => {
            assert.closeTo(-1.5, -1.0, 0.5);
            assert.closeTo(-10, -20, 20);
            assert.closeTo(-5, -5, 0);
        });

        it("should handle negative expected values", () => {
            assert.closeTo(1.5, -1.0, 3);
            assert.closeTo(0, -5, 5);
        });
    });

    describe("floating point precision", () => {
        it("should handle floating point arithmetic", () => {
            assert.closeTo(0.1 + 0.2, 0.3, 0.0001);
            assert.closeTo(1 / 3, 0.333333, 0.000001);
            assert.closeTo(Math.PI, 3.14159, 0.00001);
        });

        it("should handle very small deltas", () => {
            assert.closeTo(1.0000001, 1.0, 0.000001);
            assert.closeTo(0.9999999, 1.0, 0.000001);
        });

        it("should handle very large numbers", () => {
            assert.closeTo(1000000, 1000100, 200);
            assert.closeTo(-1000000, -1000100, 200);
        });
    });

    describe("type validation", () => {
        it("should fail when actual is not a number", () => {
            checkError(
                () => assert.closeTo([1.5] as any, 1.0, 0.5, "blah"),
                "blah"
            );
        });

        it("should fail when expected is not a number", () => {
            checkError(
                () => assert.closeTo(1.5, "1.0" as any, 0.5, "blah"),
                "blah"
            );
        });

        it("should fail when delta is not a number", () => {
            checkError(
                () => assert.closeTo(1.5, 1.0, true as any, "blah"),
                "blah"
            );
        });

        it("should fail when delta is undefined", () => {
            checkError(
                () => assert.closeTo(1.5, 1.0, undefined as any, "blah"),
                "blah"
            );
        });

        it("should fail when delta is null", () => {
            checkError(
                () => assert.closeTo(1.5, 1.0, null as any, "blah"),
                "blah"
            );
        });
    });

    describe("edge cases", () => {
        it("should handle zero values", () => {
            assert.closeTo(0, 0, 0);
            assert.closeTo(0, 0.5, 1);
            assert.closeTo(0.5, 0, 1);
        });

        it("should handle Infinity (but will fail validation)", () => {
            // Infinity is a number but might not be meaningful for closeTo
            checkError(
                () => assert.closeTo(Infinity, 100, 50),
                /expected Infinity to be close to 100/
            );
        });

        it("should handle NaN (but will fail type check)", () => {
            checkError(
                () => assert.closeTo(NaN as any, 1.0, 0.5),
                /expected NaN to be a number/
            );
        });
    });
});

describe("assert.notCloseTo", () => {
    describe("basic functionality", () => {
        it("should pass when difference exceeds delta", () => {
            assert.notCloseTo(2, 1.0, 0.5);
            assert.notCloseTo(-10, 20, 29);
            assert.notCloseTo(100, 50, 40);
        });

        it("should fail when actual is within delta of expected", () => {
            checkError(
                () => assert.notCloseTo(1.5, 1.0, 0.5),
                /not expected 1.5 to be close to 1 \+\/- 0.5/
            );
        });

        it("should fail when actual equals expected", () => {
            checkError(
                () => assert.notCloseTo(5, 5, 0),
                /not expected 5 to be close to 5 \+\/- 0/
            );
        });

        it("should work with custom message", () => {
            checkError(
                () => assert.notCloseTo(1.5, 1.0, 0.5, "custom"),
                "custom"
            );
        });
    });
});

describe("assert.approximately", () => {
    describe("alias functionality", () => {
        it("should work identically to closeTo", () => {
            assert.approximately(1.5, 1.0, 0.5);
            assert.approximately(10, 20, 20);
            assert.approximately(-10, 20, 30);
        });

        it("should fail like closeTo", () => {
            checkError(
                () => assert.approximately(2, 1.0, 0.5, "blah"),
                "blah"
            );
        });

        it("should validate types like closeTo", () => {
            checkError(
                () => assert.approximately([1.5] as any, 1.0, 0.5),
                /expected .+ to be a number/
            );
        });
    });
});

describe("assert.notApproximately", () => {
    describe("alias functionality", () => {
        it("should work identically to notCloseTo", () => {
            assert.notApproximately(2, 1.0, 0.5);
            assert.notApproximately(-10, 20, 29);
        });

        it("should fail like notCloseTo", () => {
            checkError(
                () => assert.notApproximately(1.5, 1.0, 0.5),
                /not expected 1.5 to be close to 1 \+\/- 0.5/
            );
        });
    });
});

describe("expect().is.closeTo()", () => {
    describe("basic functionality", () => {
        it("should pass when actual is within delta of expected", () => {
            expect(1.5).is.closeTo(1.0, 0.5);
            expect(10).is.closeTo(20, 20);
            expect(-10).is.closeTo(20, 30);
        });

        it("should fail when difference exceeds delta", () => {
            checkError(
                () => expect(2).is.closeTo(1.0, 0.5),
                "expected 2 to be close to 1 +/- 0.5"
            );
        });

        it("should work with to.be syntax", () => {
            expect(1.5).to.be.closeTo(1.0, 0.5);
            expect(10).to.be.closeTo(20, 20);
        });

        it("should work with custom message", () => {
            checkError(
                () => expect(2).is.closeTo(1.0, 0.5, "custom message"),
                "custom message"
            );
        });
    });

    describe("negation", () => {
        it("should support not operator", () => {
            expect(2).is.not.closeTo(1.0, 0.5);
            expect(-10).to.not.be.closeTo(20, 29);
        });

        it("should fail when not should pass", () => {
            checkError(
                () => expect(1.5).is.not.closeTo(1.0, 0.5),
                /not expected 1.5 to be close to 1 \+\/- 0.5/
            );
        });
    });
});

describe("expect().is.approximately()", () => {
    describe("basic functionality", () => {
        it("should work as alias for closeTo", () => {
            expect(1.5).is.approximately(1.0, 0.5);
            expect(10).to.be.approximately(20, 20);
        });

        it("should fail like closeTo", () => {
            checkError(
                () => expect(2).is.approximately(1.0, 0.5),
                "expected 2 to be close to 1 +/- 0.5"
            );
        });

        it("should support negation", () => {
            expect(2).is.not.approximately(1.0, 0.5);
            expect(-10).to.not.be.approximately(20, 29);
        });
    });
});

describe("integration tests", () => {
    describe("chaining with other assertions", () => {
        it("should work in assertion chains", () => {
            const value = 1.5;
            expect(value).is.a.number();
            expect(value).is.closeTo(1.0, 0.5);
        });

        it("should work with multiple expectations", () => {
            const result = 0.1 + 0.2;
            expect(result).is.a.number();
            expect(result).is.not.equal(0.3); // Floating point precision issue
            expect(result).is.closeTo(0.3, 0.0001); // But close enough
        });
    });

    describe("real-world scenarios", () => {
        it("should handle mathematical calculations", () => {
            const radius = 5;
            const area = Math.PI * radius * radius;
            expect(area).is.closeTo(78.54, 0.01);
        });

        it("should handle percentage calculations", () => {
            const total = 100;
            const part = 33;
            const percentage = (part / total) * 100;
            expect(percentage).is.closeTo(33, 0.1);
        });

        it("should handle unit conversions", () => {
            const inches = 10;
            const centimeters = inches * 2.54;
            expect(centimeters).is.closeTo(25.4, 0.01);
        });
    });
});
