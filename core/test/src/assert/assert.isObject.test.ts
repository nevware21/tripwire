/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "../../../src/assert/assertClass";
import { checkError } from "../support/checkError";

describe("assert.isObject", () => {
    it("should pass when the value is an object", () => {
        assert.isObject({});
    });

    it("should pass when the value is an array", () => {
        assert.isObject([]);
    });

    it("should fail when the value is a function", () => {
        checkError(() => {
            assert.isObject(() => {});
        }, "expected [Function] to be an Object");
    });

    it("should fail when the value is a string", () => {
        checkError(() => {
            assert.isObject("");
        }, "expected \"\" to be an Object");
    });

    it("should fail when the value is a number", () => {
        checkError(() => {
            assert.isObject(1);
        }, "expected 1 to be an Object");
    });

    it("should fail when the value is a boolean", () => {
        checkError(() => {
            assert.isObject(true);
        }, "expected true to be an Object");
    });

    it("should fail when the value is a symbol", () => {
        checkError(() => {
            assert.isObject(Symbol());
        }, "expected [Symbol()] to be an Object");
    });

    it("should fail when the value is null", () => {
        checkError(() => {
            assert.isObject(null);
        }, "expected null to be an Object");
    });

    it("should fail when the value is undefined", () => {
        checkError(() => {
            assert.isObject(undefined);
        }, "expected undefined to be an Object");
    });

    it("should pass when the value is an error", () => {
        assert.isObject(new Error());
    });

    it("should pass when the value is a regex", () => {
        assert.isObject(/./);
    });

    it("should pass when the value is a date", () => {
        assert.isObject(new Date());
    });

    it("should pass when the value is a map", () => {
        assert.isObject(new Map());
    });
});

describe("assert.isNotObject", () => {
    it("should fail when the value is an object", () => {
        checkError(() => {
            assert.isNotObject({});
        }, "not expected {} to be an Object");
    });

    it("should fail when the value is an array", () => {
        checkError(() => {
            assert.isNotObject([]);
        }, "not expected [] to be an Object");
    });

    it("should pass when the value is a function", () => {
        assert.isNotObject(() => {});
    });

    it("should pass when the value is a string", () => {
        assert.isNotObject("");
    });

    it("should pass when the value is a number", () => {
        assert.isNotObject(1);
    });

    it("should pass when the value is a boolean", () => {
        assert.isNotObject(true);
    });

    it("should pass when the value is a symbol", () => {
        assert.isNotObject(Symbol());
    });

    it("should pass when the value is null", () => {
        assert.isNotObject(null);
    });

    it("should pass when the value is undefined", () => {
        assert.isNotObject(undefined);
    });

    it("should fail when the value is an error", () => {
        checkError(() => {
            assert.isNotObject(new Error());
        }, "not expected [Error:\"\"] to be an Object");
    });

    it("should fail when the value is a regex", () => {
        checkError(() => {
            assert.isNotObject(/./);
        }, "not expected /./ to be an Object");
    });

    it("should fail when the value is a date", () => {
        checkError(() => {
            assert.isNotObject(new Date());
        }, /not expected \[Date.*\] to be an Object/);
    });

    it("should fail when the value is a map", () => {
        checkError(() => {
            assert.isNotObject(new Map());
        }, "not expected Map:{} to be an Object");
    });
});