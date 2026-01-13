/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "../../../src/assert/assertClass";
import { AssertionFailure } from "../../../src/assert/assertionError";
import { expect } from "../../../src/assert/expect";
import { checkError } from "../support/checkError";

describe("assert.isNaN", () => {
    it("should pass when the value is NaN", () => {
        assert.isNaN(NaN);
    });

    it("should pass when the value is Number.NaN", () => {
        assert.isNaN(Number.NaN);
    });

    it("should pass when the value is result of 0/0", () => {
        assert.isNaN(0 / 0);
    });

    it("should pass when the value is result of invalid math", () => {
        assert.isNaN(Math.sqrt(-1));
    });

    it("should pass when the value is result of parseFloat on invalid string", () => {
        assert.isNaN(parseFloat("not a number"));
    });

    it("should throw AssertionFailure when the value is a number", () => {
        checkError(() => {
            assert.isNaN(123);
        }, "expected 123 to be NaN");
        
        expect(() => assert.isNaN(123)).toThrow(AssertionFailure);
    });

    it("should throw AssertionFailure when the value is 0", () => {
        checkError(() => {
            assert.isNaN(0);
        }, "expected 0 to be NaN");

        expect(() => assert.isNaN(0)).toThrow(AssertionFailure);
    });

    it("should throw AssertionFailure when the value is Infinity", () => {
        checkError(() => {
            assert.isNaN(Infinity);
        }, "expected Infinity to be NaN");

        expect(() => assert.isNaN(Infinity)).toThrow(AssertionFailure);
    });

    it("should throw AssertionFailure when the value is -Infinity", () => {
        checkError(() => {
            assert.isNaN(-Infinity);
        }, "expected -Infinity to be NaN");

        expect(() => assert.isNaN(-Infinity)).toThrow(AssertionFailure);
    });

    it("should throw AssertionFailure when the value is a string", () => {
        checkError(() => {
            assert.isNaN("hello");
        }, "expected \"hello\" to be NaN");

        expect(() => assert.isNaN("hello")).toThrow(AssertionFailure);
    });

    it("should throw AssertionFailure when the value is the string 'NaN'", () => {
        checkError(() => {
            assert.isNaN("NaN");
        }, "expected \"NaN\" to be NaN");

        expect(() => assert.isNaN("NaN")).toThrow(AssertionFailure);
    });

    it("should throw AssertionFailure when the value is undefined", () => {
        checkError(() => {
            assert.isNaN(undefined);
        }, "expected undefined to be NaN");

        expect(() => assert.isNaN(undefined)).toThrow(AssertionFailure);
    });

    it("should throw AssertionFailure when the value is null", () => {
        checkError(() => {
            assert.isNaN(null);
        }, "expected null to be NaN");

        expect(() => assert.isNaN(null)).toThrow(AssertionFailure);
    });

    it("should throw AssertionFailure when the value is an object", () => {
        checkError(() => {
            assert.isNaN({});
        }, "expected {} to be NaN");

        expect(() => assert.isNaN({})).toThrow(AssertionFailure);
    });

    it("should throw AssertionFailure when the value is an array", () => {
        checkError(() => {
            assert.isNaN([]);
        }, "expected [] to be NaN");

        expect(() => assert.isNaN([])).toThrow(AssertionFailure);
    });

    it("should throw AssertionFailure when the value is true", () => {
        checkError(() => {
            assert.isNaN(true);
        }, "expected true to be NaN");

        expect(() => assert.isNaN(true)).toThrow(AssertionFailure);
    });

    it("should throw AssertionFailure when the value is false", () => {
        checkError(() => {
            assert.isNaN(false);
        }, "expected false to be NaN");

        expect(() => assert.isNaN(false)).toThrow(AssertionFailure);
    });

    it("should throw AssertionFailure with a custom message when the value is not NaN", () => {
        const customMessage = "Custom error message";

        checkError(() => {
            assert.isNaN(123, customMessage);
        }, customMessage);
        expect(() => assert.isNaN(123, customMessage)).toThrow(new AssertionFailure(customMessage));
    });
});
    
describe("assert.isNotNaN", () => {
    it("should pass when the value is a number", () => {
        assert.isNotNaN(123);
    });

    it("should pass when the value is 0", () => {
        assert.isNotNaN(0);
    });

    it("should pass when the value is Infinity", () => {
        assert.isNotNaN(Infinity);
    });

    it("should pass when the value is -Infinity", () => {
        assert.isNotNaN(-Infinity);
    });

    it("should pass when the value is a string", () => {
        assert.isNotNaN("string");
    });

    it("should pass when the value is undefined", () => {
        assert.isNotNaN(undefined);
    });

    it("should pass when the value is null", () => {
        assert.isNotNaN(null);
    });

    it("should pass when the value is an object", () => {
        assert.isNotNaN({});
    });

    it("should pass when the value is an array", () => {
        assert.isNotNaN([]);
    });

    it("should pass when the value is true", () => {
        assert.isNotNaN(true);
    });

    it("should pass when the value is false", () => {
        assert.isNotNaN(false);
    });

    it("should throw AssertionFailure when the value is NaN", () => {
        checkError(() => {
            assert.isNotNaN(NaN);
        }, "not expected NaN to be NaN");

        expect(() => assert.isNotNaN(NaN)).toThrow(AssertionFailure);
    });

    it("should throw AssertionFailure when the value is Number.NaN", () => {
        checkError(() => {
            assert.isNotNaN(Number.NaN);
        }, "not expected NaN to be NaN");

        expect(() => assert.isNotNaN(Number.NaN)).toThrow(AssertionFailure);
    });

    it("should throw AssertionFailure when the value is result of 0/0", () => {
        checkError(() => {
            assert.isNotNaN(0 / 0);
        }, "not expected NaN to be NaN");

        expect(() => assert.isNotNaN(0 / 0)).toThrow(AssertionFailure);
    });

    it("should throw AssertionFailure with a custom message when the value is NaN", () => {
        const customMessage = "Custom error message";

        checkError(() => {
            assert.isNotNaN(NaN, customMessage);
        }, customMessage + ": not expected NaN to be NaN");
        expect(() => assert.isNotNaN(NaN, customMessage)).toThrow(new AssertionFailure(customMessage));
    });
});

describe("expect.is.nan", () => {
    it("should pass when the value is NaN", () => {
        expect(NaN).is.nan();
        expect(NaN).to.be.nan();
    });

    it("should pass when the value is Number.NaN", () => {
        expect(Number.NaN).is.nan();
    });

    it("should pass when the value is result of 0/0", () => {
        expect(0 / 0).to.be.nan();
    });

    it("should throw AssertionFailure when the value is a number", () => {
        checkError(() => {
            expect(123).is.nan();
        }, "expected 123 to be NaN");
        
        expect(() => expect(123).is.nan()).toThrow(AssertionFailure);
    });

    it("should throw AssertionFailure when the value is a string", () => {
        checkError(() => {
            expect("hello").to.be.nan();
        }, "expected \"hello\" to be NaN");
    });

    it("should throw AssertionFailure with custom message", () => {
        const customMessage = "Should be NaN";
        checkError(() => {
            expect(123).is.nan(customMessage);
        }, customMessage);
    });
});

describe("expect.is.not.nan", () => {
    it("should pass when the value is a number", () => {
        expect(123).is.not.nan();
        expect(0).to.not.be.nan();
    });

    it("should pass when the value is a string", () => {
        expect("hello").is.not.nan();
    });

    it("should pass when the value is undefined", () => {
        expect(undefined).to.not.be.nan();
    });

    it("should pass when the value is null", () => {
        expect(null).is.not.nan();
    });

    it("should throw AssertionFailure when the value is NaN", () => {
        checkError(() => {
            expect(NaN).is.not.nan();
        }, "not expected NaN to be NaN");
        
        expect(() => expect(NaN).is.not.nan()).toThrow(AssertionFailure);
    });

    it("should throw AssertionFailure when the value is result of invalid math", () => {
        checkError(() => {
            expect(0 / 0).to.not.be.nan();
        }, "not expected NaN to be NaN");
    });

    it("should throw AssertionFailure with custom message", () => {
        const customMessage = "Should not be NaN";
        checkError(() => {
            expect(NaN).is.not.nan(customMessage);
        }, "not " + customMessage);
    });
});
