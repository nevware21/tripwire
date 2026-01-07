/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "../../../src/assert/assertClass";
import { checkError } from "../support/checkError";

describe("assert numeric operations", () => {
    describe("isAbove", () => {
        it("should pass when value is above expected (numbers)", () => {
            assert.isAbove(5, 4);
            assert.isAbove(10, 0);
            assert.isAbove(0.1, 0);
            assert.isAbove(-1, -2);
        });

        it("should pass when value is above expected (dates)", () => {
            const date1 = new Date(2024, 0, 2);
            const date2 = new Date(2024, 0, 1);
            assert.isAbove(date1, date2);
        });

        it("should fail when value is not above expected", () => {
            checkError(() => {
                assert.isAbove(4, 5);
            }, "expected 4 to be above 5");

            checkError(() => {
                assert.isAbove(5, 5);
            }, "expected 5 to be above 5");
        });

        it("should support custom error message", () => {
            checkError(() => {
                assert.isAbove(3, 5, "custom message");
            }, "custom message");
        });

        it("should fail when value is not a number or date", () => {
            checkError(() => {
                assert.isAbove("5" as any, 4);
            }, "expected \"5\" to be a number or date");

            checkError(() => {
                assert.isAbove(null as any, 4);
            }, "expected null to be a number or date");
        });
    });

    describe("isAtLeast", () => {
        it("should pass when value is at least expected (numbers)", () => {
            assert.isAtLeast(5, 4);
            assert.isAtLeast(5, 5);
            assert.isAtLeast(10, 0);
            assert.isAtLeast(0, 0);
        });

        it("should pass when value is at least expected (dates)", () => {
            const date1 = new Date(2024, 0, 2);
            const date2 = new Date(2024, 0, 1);
            const date3 = new Date(2024, 0, 2);
            assert.isAtLeast(date1, date2);
            assert.isAtLeast(date1, date3);
        });

        it("should fail when value is below expected", () => {
            checkError(() => {
                assert.isAtLeast(4, 5);
            }, "expected 4 to be at least 5");

            checkError(() => {
                assert.isAtLeast(0, 1);
            }, "expected 0 to be at least 1");
        });

        it("should support custom error message", () => {
            checkError(() => {
                assert.isAtLeast(3, 5, "custom message");
            }, "custom message");
        });
    });

    describe("isBelow", () => {
        it("should pass when value is below expected (numbers)", () => {
            assert.isBelow(4, 5);
            assert.isBelow(0, 10);
            assert.isBelow(-2, -1);
            assert.isBelow(0, 0.1);
        });

        it("should pass when value is below expected (dates)", () => {
            const date1 = new Date(2024, 0, 1);
            const date2 = new Date(2024, 0, 2);
            assert.isBelow(date1, date2);
        });

        it("should fail when value is not below expected", () => {
            checkError(() => {
                assert.isBelow(5, 4);
            }, "expected 5 to be below 4");

            checkError(() => {
                assert.isBelow(5, 5);
            }, "expected 5 to be below 5");
        });

        it("should support custom error message", () => {
            checkError(() => {
                assert.isBelow(7, 5, "custom message");
            }, "custom message");
        });
    });

    describe("isAtMost", () => {
        it("should pass when value is at most expected (numbers)", () => {
            assert.isAtMost(4, 5);
            assert.isAtMost(5, 5);
            assert.isAtMost(0, 10);
            assert.isAtMost(-1, 0);
        });

        it("should pass when value is at most expected (dates)", () => {
            const date1 = new Date(2024, 0, 1);
            const date2 = new Date(2024, 0, 2);
            const date3 = new Date(2024, 0, 1);
            assert.isAtMost(date1, date2);
            assert.isAtMost(date1, date3);
        });

        it("should fail when value is above expected", () => {
            checkError(() => {
                assert.isAtMost(5, 4);
            }, "expected 5 to be at most 4");

            checkError(() => {
                assert.isAtMost(10, 0);
            }, "expected 10 to be at most 0");
        });

        it("should support custom error message", () => {
            checkError(() => {
                assert.isAtMost(7, 5, "custom message");
            }, "custom message");
        });
    });

    describe("isWithin", () => {
        it("should pass when value is within range (numbers)", () => {
            assert.isWithin(5, 1, 10);
            assert.isWithin(5, 5, 10);
            assert.isWithin(5, 1, 5);
            assert.isWithin(5, 5, 5);
            assert.isWithin(0, -10, 10);
        });

        it("should pass when value is within range (dates)", () => {
            const date = new Date(2024, 0, 15);
            const start = new Date(2024, 0, 1);
            const end = new Date(2024, 0, 31);
            assert.isWithin(date, start, end);
        });

        it("should fail when value is outside range", () => {
            checkError(() => {
                assert.isWithin(0, 1, 10);
            }, "expected 0 to be within 1..10");

            checkError(() => {
                assert.isWithin(11, 1, 10);
            }, "expected 11 to be within 1..10");

            checkError(() => {
                assert.isWithin(-1, 0, 10);
            }, "expected -1 to be within 0..10");
        });

        it("should support custom error message", () => {
            checkError(() => {
                assert.isWithin(15, 1, 10, "custom message");
            }, "custom message");
        });

        it("should fail when value is not a number or date", () => {
            checkError(() => {
                assert.isWithin("5" as any, 1, 10);
            }, "expected \"5\" to be a number or date");
        });
    });

    describe("edge cases", () => {
        it("should handle negative numbers correctly", () => {
            assert.isAbove(-1, -2);
            assert.isBelow(-2, -1);
            assert.isAtLeast(-1, -1);
            assert.isAtMost(-1, -1);
            assert.isWithin(-5, -10, 0);
        });

        it("should handle zero correctly", () => {
            assert.isAbove(1, 0);
            assert.isBelow(0, 1);
            assert.isAtLeast(0, 0);
            assert.isAtMost(0, 0);
            assert.isWithin(0, -1, 1);
        });

        it("should handle decimal numbers correctly", () => {
            assert.isAbove(1.1, 1.0);
            assert.isBelow(1.0, 1.1);
            assert.isAtLeast(1.1, 1.1);
            assert.isAtMost(1.1, 1.1);
            assert.isWithin(1.5, 1.0, 2.0);
        });

        it("should handle dates at boundaries correctly", () => {
            const date1 = new Date(2024, 0, 1);
            const date2 = new Date(2024, 0, 1);
            assert.isAtLeast(date1, date2);
            assert.isAtMost(date1, date2);
        });
    });

    describe("isNot numeric operations", () => {
        describe("isNotAbove", () => {
            it("should pass when value is not above expected", () => {
                assert.isNotAbove(4, 5);
                assert.isNotAbove(5, 5);
                assert.isNotAbove(0, 10);
            });

            it("should fail when value is above expected", () => {
                checkError(() => {
                    assert.isNotAbove(5, 4);
                }, /not expected.*to be above 4/);
            });

            it("should support custom error message", () => {
                checkError(() => {
                    assert.isNotAbove(10, 5, "custom message");
                }, "custom message");
            });
        });

        describe("isNotAtLeast", () => {
            it("should pass when value is below expected", () => {
                assert.isNotAtLeast(4, 5);
                assert.isNotAtLeast(0, 1);
            });

            it("should fail when value is at least expected", () => {
                checkError(() => {
                    assert.isNotAtLeast(5, 5);
                }, /not expected.*to be at least 5/);

                checkError(() => {
                    assert.isNotAtLeast(6, 5);
                }, /not expected.*to be at least 5/);
            });

            it("should support custom error message", () => {
                checkError(() => {
                    assert.isNotAtLeast(10, 5, "custom message");
                }, "custom message");
            });
        });

        describe("isNotBelow", () => {
            it("should pass when value is not below expected", () => {
                assert.isNotBelow(5, 4);
                assert.isNotBelow(5, 5);
                assert.isNotBelow(10, 0);
            });

            it("should fail when value is below expected", () => {
                checkError(() => {
                    assert.isNotBelow(4, 5);
                }, /not expected.*to be below 5/);
            });

            it("should support custom error message", () => {
                checkError(() => {
                    assert.isNotBelow(3, 5, "custom message");
                }, "custom message");
            });
        });

        describe("isNotAtMost", () => {
            it("should pass when value is above expected", () => {
                assert.isNotAtMost(5, 4);
                assert.isNotAtMost(10, 5);
            });

            it("should fail when value is at most expected", () => {
                checkError(() => {
                    assert.isNotAtMost(5, 5);
                }, /not expected.*to be at most 5/);

                checkError(() => {
                    assert.isNotAtMost(4, 5);
                }, /not expected.*to be at most 5/);
            });

            it("should support custom error message", () => {
                checkError(() => {
                    assert.isNotAtMost(3, 5, "custom message");
                }, "custom message");
            });
        });

        describe("isNotWithin", () => {
            it("should pass when value is outside range", () => {
                assert.isNotWithin(0, 1, 10);
                assert.isNotWithin(11, 1, 10);
                assert.isNotWithin(-5, 0, 10);
            });

            it("should fail when value is within range", () => {
                checkError(() => {
                    assert.isNotWithin(5, 1, 10);
                }, /not expected.*to be within 1\.\.10/);

                checkError(() => {
                    assert.isNotWithin(1, 1, 10);
                }, /not expected.*to be within 1\.\.10/);

                checkError(() => {
                    assert.isNotWithin(10, 1, 10);
                }, /not expected.*to be within 1\.\.10/);
            });

            it("should support custom error message", () => {
                checkError(() => {
                    assert.isNotWithin(5, 1, 10, "custom message");
                }, "custom message");
            });
        });

        it("should work with dates", () => {
            const date1 = new Date(2024, 0, 1);
            const date2 = new Date(2024, 0, 2);
            const date3 = new Date(2024, 0, 3);

            assert.isNotAbove(date1, date2);
            assert.isNotAtLeast(date1, date2);
            assert.isNotBelow(date2, date1);
            assert.isNotAtMost(date2, date1);
            assert.isNotWithin(date1, date2, date3);
        });
    });
});
