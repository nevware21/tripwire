/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "../../../src/assert/assertClass";
import { checkError } from "../support/checkError";

describe("assert.isPlainObject", () => {
    it("should pass when the value is an object", () => {
        assert.isPlainObject({});
    });

    it("should fail when the value is an array", () => {
        checkError(() => {
            assert.isPlainObject([]);
        }, "expected [] to be a plain Object");
    });

    it("should fail when the value is a function", () => {
        checkError(() => {
            assert.isPlainObject(() => {});
        }, "expected [Function] to be a plain Object");
    });

    it("should fail when the value is a string", () => {
        checkError(() => {
            assert.isPlainObject("");
        }, "expected \"\" to be a plain Object");
    });

    it("should fail when the value is a number", () => {
        checkError(() => {
            assert.isPlainObject(1);
        }, "expected 1 to be a plain Object");
    });

    it("should fail when the value is a boolean", () => {
        checkError(() => {
            assert.isPlainObject(true);
        }, "expected true to be a plain Object");
    });

    it("should fail when the value is a symbol", () => {
        checkError(() => {
            assert.isPlainObject(Symbol());
        }, "expected [Symbol()] to be a plain Object");
    });

    it("should fail when the value is null", () => {
        checkError(() => {
            assert.isPlainObject(null);
        }, "expected null to be a plain Object");
    });

    it("should fail when the value is undefined", () => {
        checkError(() => {
            assert.isPlainObject(undefined);
        }, "expected undefined to be a plain Object");
    });
});

describe("assert.isNotPlainObject", () => {

    it("should pass when the value is an array", () => {
        assert.isNotPlainObject([]);
    });

    it("should pass when the value is a function", () => {
        assert.isNotPlainObject(() => {});
    });

    it("should pass when the value is a string", () => {
        assert.isNotPlainObject("");
    });

    it("should pass when the value is a number", () => {
        assert.isNotPlainObject(1);
    });

    it("should pass when the value is a boolean", () => {
        assert.isNotPlainObject(true);
    });

    it("should pass when the value is a symbol", () => {
        assert.isNotPlainObject(Symbol());
    });

    it("should pass when the value is null", () => {
        assert.isNotPlainObject(null);
    });

    it("should pass when the value is undefined", () => {
        assert.isNotPlainObject(undefined);
    });

    it("should fail when the value is an object", () => {
        checkError(() => {
            assert.isNotPlainObject({});
        }, "not expected {} to be a plain Object");
    });

    it("should pass when the value is an error", () => {
        assert.isNotPlainObject(new Error());
    });
});