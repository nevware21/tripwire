/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "../../../src/assert/assertClass";
import { checkError } from "../support/checkError";

describe("assert.isExtensible", function () {
    it("examples", function () {
        assert.isExtensible({});
        assert.isExtensible([]);
        assert.isExtensible(Object.create(null));

        checkError(function () {
            assert.isExtensible(Object.freeze({}));
        }, "expected {} to be extensible");

        checkError(function () {
            assert.isExtensible(Object.seal({}));
        }, "expected {} to be extensible");
    });

    it("check primitives", function () {
        checkError(function () {
            assert.isExtensible(null);
        }, "expected null to be extensible");

        checkError(function () {
            assert.isExtensible(undefined);
        }, "expected undefined to be extensible");

        checkError(function () {
            assert.isExtensible(1);
        }, "expected 1 to be extensible");

        checkError(function () {
            assert.isExtensible("string");
        }, "expected \"string\" to be extensible");

        checkError(function () {
            assert.isExtensible(true);
        }, "expected true to be extensible");

        checkError(function () {
            assert.isExtensible(Symbol());
        }, "expected [Symbol()] to be extensible");
    });
});

describe("assert.isNotExtensible", function () {
    it("examples", function () {
        assert.isNotExtensible(Object.freeze({}));
        assert.isNotExtensible(Object.seal({}));

        checkError(function () {
            assert.isNotExtensible({});
        }, "not expected {} to be extensible");

        checkError(function () {
            assert.isNotExtensible([]);
        }, "not expected [] to be extensible");

        checkError(function () {
            assert.isNotExtensible(Object.create(null));
        }, "not expected {} to be extensible");
    });

    it("check primitives", function () {
        assert.isNotExtensible(null);
        assert.isNotExtensible(undefined);
        assert.isNotExtensible(1);
        assert.isNotExtensible("string");
        assert.isNotExtensible(true);
        assert.isNotExtensible(Symbol());
    });
});