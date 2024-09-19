/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "../../../src/assert/assertClass";
import { checkError } from "../support/checkError";

describe("assert.isSealed", function () {
    it("examples", function () {
        assert.isSealed(Object.seal({})); // Passes
        assert.isSealed(Object.seal([])); // Passes
        assert.isSealed(Object.seal({ key: "value" })); // Passes

        checkError(function () {
            assert.isSealed({}); // Throws AssertionFailure
        }, "expected {} to be sealed");

        checkError(function () {
            assert.isSealed([]); // Throws AssertionFailure
        }, "expected [] to be sealed");

        checkError(function () {
            assert.isSealed({ key: "value" }); // Throws AssertionFailure
        }, "expected {key:\"value\"} to be sealed");
    });
});

describe("assert.isNotSealed", function () {
    it("examples", function () {
        assert.isNotSealed({}); // Passes
        assert.isNotSealed([]); // Passes
        assert.isNotSealed({ key: "value" }); // Passes
        
        checkError(function () {
            assert.isNotSealed(Object.seal({})); // Throws AssertionFailure
        }, "not expected {} to be sealed");

        checkError(function () {
            assert.isNotSealed(Object.seal([])); // Throws AssertionFailure
        }, "not expected [] to be sealed");

        checkError(function () {
            assert.isNotSealed(Object.seal({ key: "value" })); // Throws AssertionFailure
        }, "not expected {key:\"value\"} to be sealed");
    });
});
