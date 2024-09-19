/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "../../../src/assert/assertClass";
import { checkError } from "../support/checkError";

describe("assert.fail", function () {

    it("examples", function () {
        checkError(function () {
            assert.fail(); // Throws AssertionError
        }, /assert.*failure/);

        checkError(function () {
            assert.fail("Hello Darkness, my old friend"); // Throws AssertionError
        }, /Hello Darkness/);

        checkError(function () {
            assert.fail(() => "Looks like we have failed again"); // Throws AssertionError
        }, /Looks like we have failed again/);
    });

    it("should always fail with message", function () {
        checkError(function () {
            assert.fail("Hello Darkness, my old friend");
        }, /Hello Darkness/);
    });

    it("Should produce default message", function () {
        checkError(function () {
            assert.fail();
        }, /assert.*failure/);
    });

    it("Reference as property", function () {
        checkError(function () {
            (assert as any)["fail"](); // Throws AssertionError
        }, /assert.*failure/);

        checkError(function () {
            (assert as any)["fail"]("Hello Darkness, my old friend"); // Throws AssertionError
        }, /Hello Darkness/);

        checkError(function () {
            (assert as any)["fail"](() => "Looks like we have failed again"); // Throws AssertionError
        }, /Looks like we have failed again/);

        checkError(function () {
            (assert as any)["fail"]();
        }, /assert.*failure/);
    });

    it("Extended format", function () {
        checkError(function () {
            assert.fail(1, 2, "Expected 1 to equal 2", "==");
        }, /Expected 1 to equal 2/);
    });
});
