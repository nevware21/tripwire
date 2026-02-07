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

describe("assert.exists", () => {
    describe("basic functionality", () => {
        it("should pass for non-null and non-undefined values", () => {
            assert.exists(0);
            assert.exists("");
            assert.exists(false);
            assert.exists([]);
            assert.exists({});
            assert.exists("hello");
            assert.exists(123);
            assert.exists(true);
        });

        it("should fail for null", () => {
            checkError(() => assert.exists(null), "expected null to exist (not null or undefined)");
        });

        it("should fail for undefined", () => {
            checkError(() => assert.exists(undefined), "expected undefined to exist (not null or undefined)");
        });

        it("should work with custom message", () => {
            checkError(() => assert.exists(null, "Value should exist"), "Value should exist");
        });
    });

    describe("expect syntax", () => {
        it("should work with expect syntax", () => {
            expect(0).to.exist();
            expect("").to.exist();
            expect(false).to.exist();
            expect([]).to.exist();
            expect({}).to.exist();
        });

        it("should fail with null/undefined", () => {
            checkError(() => expect(null).to.exist(), "expected null to exist (not null or undefined)");
            checkError(() => expect(undefined).to.exist(), "expected undefined to exist (not null or undefined)");
        });

        it("should work with negation", () => {
            expect(null).to.not.exist();
            expect(undefined).to.not.exist();
        });

        it("negation should fail for existing values", () => {
            checkError(() => expect(0).to.not.exist(), "not expected 0 to exist (not null or undefined)");
            checkError(() => expect("").to.not.exist(), "not expected \"\" to exist (not null or undefined)");
            checkError(() => expect(false).to.not.exist(), "not expected false to exist (not null or undefined)");
        });
    });

    describe("edge cases", () => {
        it("should pass for empty collections", () => {
            assert.exists([]);
            assert.exists({});
            assert.exists(new Map());
            assert.exists(new Set());
        });

        it("should pass for zero and empty string", () => {
            assert.exists(0);
            assert.exists("");
            assert.exists(false);
        });

        it("should pass for NaN", () => {
            assert.exists(NaN);
        });

        it("should pass for Infinity", () => {
            assert.exists(Infinity);
            assert.exists(-Infinity);
        });

        it("should pass for functions", () => {
            assert.exists(() => {});
            assert.exists(function() {});
            assert.exists(async () => {});
        });

        it("should pass for symbols", () => {
            assert.exists(Symbol("test"));
            assert.exists(Symbol.iterator);
        });
    });
});

describe("assert.notExists", () => {
    describe("basic functionality", () => {
        it("should pass for null and undefined", () => {
            assert.notExists(null);
            assert.notExists(undefined);
        });

        it("should fail for non-null and non-undefined values", () => {
            checkError(() => assert.notExists(0), "not expected 0 to exist (not null or undefined)");
            checkError(() => assert.notExists(""), "not expected \"\" to exist (not null or undefined)");
            checkError(() => assert.notExists(false), "not expected false to exist (not null or undefined)");
            checkError(() => assert.notExists([]), "not expected [] to exist (not null or undefined)");
            checkError(() => assert.notExists({}), "not expected {} to exist (not null or undefined)");
        });

        it("should work with custom message", () => {
            checkError(() => assert.notExists(0, "Value should not exist"), "Value should not exist");
        });
    });

    describe("expect syntax", () => {
        it("should work with expect syntax", () => {
            expect(null).to.not.exist();
            expect(undefined).to.not.exist();
        });

        it("should fail for existing values", () => {
            checkError(() => expect(0).to.not.exist(), "not expected 0 to exist (not null or undefined)");
            checkError(() => expect("").to.not.exist(), "not expected \"\" to exist (not null or undefined)");
            checkError(() => expect(false).to.not.exist(), "not expected false to exist (not null or undefined)");
        });
    });
});

describe("exists combinations", () => {
    it("should work with other assertions", () => {
        expect(123).to.exist();
        expect(123).is.number();

        expect("test").to.exist();
        expect("test").is.string();

        expect([1, 2, 3]).to.exist();
        expect([1, 2, 3]).is.array();
    });

    it("should work in conditional checks", () => {
        let value: any = "hello";

        expect(value).to.exist();

        value = null;
        expect(value).to.not.exist();
    });

    it("should differentiate from empty checks", () => {
        // exists passes for empty values
        expect("").to.exist();
        expect("").is.empty();

        expect([]).to.exist();
        expect([]).is.empty();

        expect({}).to.exist();
        expect({}).is.empty();

        // null/undefined fail exists but are considered empty in some contexts
        expect(null).to.not.exist();
        expect(undefined).to.not.exist();
    });
});
