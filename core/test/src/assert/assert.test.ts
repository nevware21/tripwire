/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "../../../src/assert/assertClass";
import { checkError } from "../support/checkError";

describe("assert", function () {

    describe("default function", function () {

        it("example", function () {
            assert(true); // Passes
            assert(1); // Passes
            assert("a"); // Passes
            assert([]); // Passes
            assert({}); // Passes
            assert(new Map()); // Passes
            assert(new Set()); // Passes
            assert(new Date()); // Passes

            checkError(function () {
                assert(false, "expected failure"); // Throws AssertionError
            }, "expected failure");

            checkError(function () {
                assert(0); // Throws AssertionError
            }, "Assertion failed");

            checkError(function () {
                assert(""); // Throws AssertionError
            }, "Assertion failed");

            checkError(function () {
                assert(null); // Throws AssertionError
            }, "Assertion failed");

            checkError(function () {
                assert(undefined); // Throws AssertionError
            }, "Assertion failed");
        });

        it("assert", function () {
            var hello = "darkness";
            assert(hello == "darkness", "expected hello to equal `darkness`");

            checkError(function () {
                assert(hello == "friend", "expected hello to equal `friend`");
            }, "expected hello to equal `friend`");

            checkError(function () {
                assert(hello == "old", function () {
                    return "expected hello to equal `old`";
                });
            }, "expected hello to equal `old`");
        });
    });
});
