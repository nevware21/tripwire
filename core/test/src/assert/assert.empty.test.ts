/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2025 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "../../../src/assert/assertClass";
import { AssertionFailure } from "../../../src/assert/assertionError";
import { expect } from "../../../src/assert/expect";
import { checkError } from "../support/checkError";

describe("assert.isEmpty", () => {
    it("should pass when the value is an empty string", () => {
        assert.isEmpty("");

        expect("").is.empty();
    });

    it("should pass when the value is an empty array", () => {
        assert.isEmpty([]);
        expect([]).is.empty();
    });

    it("should pass when the value is an empty object", () => {
        assert.isEmpty({});
        expect({}).is.empty();
    });

    it("should throw AssertionFailure when the value is a non-empty string", () => {
        checkError(() => {
            assert.isEmpty("non-empty");
        }, "expected \"non-empty\" to be empty");

        expect(() => assert.isEmpty("non-empty")).toThrow(AssertionFailure);

        checkError(() => {
            expect("non-empty").is.empty();
        }, "expected \"non-empty\" to be empty");

        expect(() => expect("non-empty").is.empty()).toThrow(AssertionFailure);
    });

    it("should throw AssertionFailure when the value is a non-empty array", () => {
        checkError(() => {
            assert.isEmpty([1, 2, 3]);
        }, "expected [1,2,3] to be empty");

        expect(() => assert.isEmpty([1, 2, 3])).toThrow(AssertionFailure);

        checkError(() => {
            expect([1, 2, 3]).is.empty();
        }, "expected [1,2,3] to be empty");

        expect(() => expect([1, 2, 3]).is.empty()).toThrow(AssertionFailure);
    });

    it("should throw AssertionFailure when the value is a non-empty object", () => {
        checkError(() => {
            assert.isEmpty({ key: "value" });
        }, "expected {key:\"value\"} to be empty");

        expect(() => assert.isEmpty({ key: "value" })).toThrow(AssertionFailure);

        checkError(() => {
            expect({ key: "value" }).is.empty();
        }, "expected {key:\"value\"} to be empty");

        expect(() => expect({ key: "value" }).is.empty()).toThrow(AssertionFailure);
    });

    it("should throw AssertionFailure with a custom message when the value is not empty", () => {
        const customMessage = "Custom error message";
        checkError(() => {
            assert.isEmpty("non-empty", customMessage);
        }, customMessage);

        expect(() => assert.isEmpty("non-empty", customMessage)).toThrowError(new AssertionFailure(customMessage));

        checkError(() => {
            expect("non-empty").is.empty(customMessage);
        }, customMessage);

        expect(() => expect("non-empty").is.empty(customMessage)).toThrowError(new AssertionFailure(customMessage));
    });
});

describe("assert.isNotEmpty", () => {
    it("should fail when the value is an empty string", () => {
        checkError(() => {
            assert.isNotEmpty("");
        }, "not expected \"\" to be empty");

        expect(() => assert.isNotEmpty("")).toThrow(AssertionFailure);

        checkError(() => {
            expect("").is.not.empty();
        }, "not expected \"\" to be empty");
        expect(() => {
            expect("").is.not.empty();
        }).toThrow(AssertionFailure);
    });

    it("should fail when the value is an empty array", () => {
        checkError(() => {
            assert.isNotEmpty([]);
        }, "not expected [] to be empty");

        expect(() => {
            assert.isNotEmpty([]);
        }).toThrow(AssertionFailure);

        checkError(() => {
            expect([]).is.not.empty();
        }, "not expected [] to be empty");

        expect(() => {
            expect([]).is.not.empty();
        }).toThrow(AssertionFailure);
    });

    it("should fail when the value is an empty object", () => {
        checkError(() => {
            assert.isNotEmpty({});
        }, "not expected {} to be empty");

        expect(() => {
            assert.isNotEmpty({});
        }).toThrow(AssertionFailure);

        checkError(() => {
            expect({}).is.not.empty();
        }, "not expected {} to be empty");

        expect(() => expect({}).is.not.empty()).toThrow(AssertionFailure);
    });

    it("should pass when the value is a non-empty string", () => {
        assert.isNotEmpty("non-empty");
        expect("non-empty").is.not.empty();
    });

    it("should pass when the value is a non-empty array", () => {
        assert.isNotEmpty([1, 2, 3]);
        expect([1, 2, 3]).is.not.empty();
    });

    it("should pass when the value is a non-empty object", () => {
        assert.isNotEmpty({ key: "value" });
        expect({ key: "value" }).is.not.empty();
    });

    it("should pass with a custom message when the value is not empty", () => {
        const customMessage = "Custom error message";

        assert.isNotEmpty("non-empty", customMessage);
        expect("non-empty").is.not.empty(customMessage);
    });
});
