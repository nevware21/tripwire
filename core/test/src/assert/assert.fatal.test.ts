/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "../../../src/assert/assertClass";
import { checkError } from "../support/checkError";

describe("assert.fatal", function () {

    it("examples", function () {
        checkError(function () {
            assert.fatal(); // Throws AssertionError
        }, /assert.*failure/);

        checkError(function () {
            assert.fatal("Hello silence, my old companion"); // Throws AssertionError
        }, /Hello silence/);

        checkError(function () {
            assert.fatal(() => "Looks like we have failed again"); // Throws AssertionError
        }, /Looks like we have failed again/);
    });

    it("should always fail with message", function () {
        checkError(function () {
            assert.fatal("Hello silence, my old companion");
        }, /Hello silence/);
    });

    it("Should produce default message", function () {
        checkError(function () {
            assert.fatal();
        }, /assert.*failure/);
    });

    it("Refence as property", function () {
        checkError(function () {
            (assert as any)["fatal"](); // Throws AssertionError
        }, /assert.*failure/);

        checkError(function () {
            (assert as any)["fatal"]("Hello silence, my old companion"); // Throws AssertionError
        }, /Hello silence/);

        checkError(function () {
            (assert as any)["fatal"](() => "Looks like we have failed again"); // Throws AssertionError
        }, /Looks like we have failed again/);

        checkError(function () {
            (assert as any)["fatal"]();
        }, /assert.*failure/);
    });
});
