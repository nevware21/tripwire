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

describe("assert.isFinite", function () {
    it("examples", function () {
        assert.isFinite(123);
        assert.isFinite(0);
        assert.isFinite(-456.789);

        checkError(function () {
            assert.isFinite(NaN);
        }, "expected NaN to be finite");

        checkError(function () {
            assert.isFinite(Infinity);
        }, "expected Infinity to be finite");

        checkError(function () {
            assert.isFinite(-Infinity);
        }, "expected -Infinity to be finite");

        checkError(function () {
            assert.isFinite("123");
        }, "expected \"123\" to be finite");

        checkError(function () {
            assert.isFinite(null);
        }, "expected null to be finite");

        checkError(function () {
            assert.isFinite(undefined);
        }, "expected undefined to be finite");
    });

    it("check various numbers", function () {
        assert.isFinite(0);
        assert.isFinite(1);
        assert.isFinite(-1);
        assert.isFinite(3.14);
        assert.isFinite(-3.14);
        assert.isFinite(Number.MAX_VALUE);
        assert.isFinite(Number.MIN_VALUE);
        assert.isFinite(Number.EPSILON);
        assert.isFinite(Number.MAX_SAFE_INTEGER);
        assert.isFinite(Number.MIN_SAFE_INTEGER);
    });

    it("check non-finite numbers", function () {
        checkError(function () {
            assert.isFinite(NaN);
        }, "expected NaN to be finite");

        checkError(function () {
            assert.isFinite(Infinity);
        }, "expected Infinity to be finite");

        checkError(function () {
            assert.isFinite(-Infinity);
        }, "expected -Infinity to be finite");

        checkError(function () {
            assert.isFinite(Number.POSITIVE_INFINITY);
        }, "expected Infinity to be finite");

        checkError(function () {
            assert.isFinite(Number.NEGATIVE_INFINITY);
        }, "expected -Infinity to be finite");
    });

    it("check non-numeric types", function () {
        checkError(function () {
            assert.isFinite("string");
        }, "expected \"string\" to be finite");

        checkError(function () {
            assert.isFinite("123");
        }, "expected \"123\" to be finite");

        checkError(function () {
            assert.isFinite(true);
        }, "expected true to be finite");

        checkError(function () {
            assert.isFinite(false);
        }, "expected false to be finite");

        checkError(function () {
            assert.isFinite(null);
        }, "expected null to be finite");

        checkError(function () {
            assert.isFinite(undefined);
        }, "expected undefined to be finite");

        checkError(function () {
            assert.isFinite({});
        }, "expected {} to be finite");

        checkError(function () {
            assert.isFinite([]);
        }, "expected [] to be finite");

        checkError(function () {
            assert.isFinite(function () {});
        }, "expected [Function] to be finite");
    });

    it("custom message", function () {
        checkError(function () {
            assert.isFinite(NaN, "custom message");
        }, "custom message: expected NaN to be finite");

        checkError(function () {
            assert.isFinite(Infinity, "value should be finite");
        }, "value should be finite: expected Infinity to be finite");
    });
});

describe("assert.isNotFinite", function () {
    it("examples", function () {
        assert.isNotFinite(NaN);
        assert.isNotFinite(Infinity);
        assert.isNotFinite(-Infinity);
        assert.isNotFinite("123");
        assert.isNotFinite(null);
        assert.isNotFinite(undefined);
        assert.isNotFinite({});

        checkError(function () {
            assert.isNotFinite(123);
        }, "not expected 123 to be finite");

        checkError(function () {
            assert.isNotFinite(0);
        }, "not expected 0 to be finite");

        checkError(function () {
            assert.isNotFinite(-456.789);
        }, "not expected -456.789 to be finite");
    });

    it("check finite numbers", function () {
        checkError(function () {
            assert.isNotFinite(0);
        }, "not expected 0 to be finite");

        checkError(function () {
            assert.isNotFinite(1);
        }, "not expected 1 to be finite");

        checkError(function () {
            assert.isNotFinite(-1);
        }, "not expected -1 to be finite");

        checkError(function () {
            assert.isNotFinite(3.14);
        }, "not expected 3.14 to be finite");

        checkError(function () {
            assert.isNotFinite(-3.14);
        }, "not expected -3.14 to be finite");

        checkError(function () {
            assert.isNotFinite(Number.MAX_VALUE);
        }, "not expected 1.7976931348623157e+308 to be finite");

        checkError(function () {
            assert.isNotFinite(Number.MIN_VALUE);
        }, "not expected 5e-324 to be finite");
    });

    it("check non-finite values", function () {
        assert.isNotFinite(NaN);
        assert.isNotFinite(Infinity);
        assert.isNotFinite(-Infinity);
        assert.isNotFinite(Number.POSITIVE_INFINITY);
        assert.isNotFinite(Number.NEGATIVE_INFINITY);
    });

    it("check non-numeric types", function () {
        assert.isNotFinite("string");
        assert.isNotFinite("123");
        assert.isNotFinite(true);
        assert.isNotFinite(false);
        assert.isNotFinite(null);
        assert.isNotFinite(undefined);
        assert.isNotFinite({});
        assert.isNotFinite([]);
        assert.isNotFinite(function () {});
    });

    it("custom message", function () {
        checkError(function () {
            assert.isNotFinite(123, "custom message");
        }, "custom message: not expected 123 to be finite");

        checkError(function () {
            assert.isNotFinite(0, "value should not be finite");
        }, "value should not be finite: not expected 0 to be finite");
    });
});

describe("expect.is.finite", function () {
    it("positive cases", function () {
        expect(123).is.finite();
        expect(0).to.be.finite();
        expect(-456.789).is.finite();
        expect(Number.MAX_VALUE).is.finite();
        expect(Number.MIN_VALUE).is.finite();
    });

    it("negative cases", function () {
        checkError(function () {
            expect(NaN).is.finite();
        }, "expected NaN to be finite");

        checkError(function () {
            expect(Infinity).is.finite();
        }, "expected Infinity to be finite");

        checkError(function () {
            expect(-Infinity).is.finite();
        }, "expected -Infinity to be finite");

        checkError(function () {
            expect("123").is.finite();
        }, "expected \"123\" to be finite");

        checkError(function () {
            expect(null).is.finite();
        }, "expected null to be finite");

        checkError(function () {
            expect(undefined).is.finite();
        }, "expected undefined to be finite");
    });

    it("custom message", function () {
        checkError(function () {
            expect(NaN, "custom message").is.finite();
        }, "custom message: expected NaN to be finite");
    });
});

describe("expect.is.not.finite", function () {
    it("positive cases", function () {
        expect(NaN).is.not.finite();
        expect(Infinity).to.not.be.finite();
        expect(-Infinity).is.not.finite();
        expect("123").is.not.finite();
        expect(null).is.not.finite();
        expect(undefined).is.not.finite();
        expect({}).is.not.finite();
    });

    it("negative cases", function () {
        checkError(function () {
            expect(123).is.not.finite();
        }, "not expected 123 to be finite");

        checkError(function () {
            expect(0).is.not.finite();
        }, "not expected 0 to be finite");

        checkError(function () {
            expect(-456.789).is.not.finite();
        }, "not expected -456.789 to be finite");

        checkError(function () {
            expect(Number.MAX_VALUE).is.not.finite();
        }, "not expected 1.7976931348623157e+308 to be finite");
    });

    it("custom message", function () {
        checkError(function () {
            expect(123, "custom message").is.not.finite();
        }, "custom message: not expected 123 to be finite");
    });

    it("with not operator", function () {
        expect(123).to.not.be.not.finite();
        expect(0).is.not.not.finite();

        checkError(function () {
            expect(NaN).to.not.be.not.finite();
        }, "expected NaN to be finite");
    });
});
