/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "../../../src/assert/assertClass";
import { checkError } from "../support/checkError";

describe("assert.isFrozen", function () {
    it("examples", function () {
        assert.isFrozen(Object.freeze({})); // Passes
        assert.isFrozen(Object.freeze([])); // Passes
        assert.isFrozen(Object.freeze({ key: "value" })); // Passes

        checkError(function () {
            assert.isFrozen({}); // Throws AssertionFailure
        }, "expected {} to be frozen");

        checkError(function () {
            assert.isFrozen([]); // Throws AssertionFailure
        }, "expected [] to be frozen");

        checkError(function () {
            assert.isFrozen({ key: "value" }); // Throws AssertionFailure
        }, "expected {key:\"value\"} to be frozen");
    });
});

describe("assert.isNotFrozen", function () {
    it("examples", function () {
        assert.isNotFrozen({}); // Passes
        assert.isNotFrozen([]); // Passes
        assert.isNotFrozen({ key: "value" }); // Passes
        
        checkError(function () {
            assert.isNotFrozen(Object.freeze({})); // Throws AssertionFailure
        }, "not expected {} to be frozen");

        checkError(function () {
            assert.isNotFrozen(Object.freeze([])); // Throws AssertionFailure
        }, "not expected [] to be frozen");

        checkError(function () {
            assert.isNotFrozen(Object.freeze({ key: "value" })); // Throws AssertionFailure
        }, "not expected {key:\"value\"} to be frozen");
    });
});
