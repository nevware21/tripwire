/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { getKnownSymbol, WellKnownSymbols } from "@nevware21/ts-utils";
import { assert } from "../../../src/assert/assertClass";
import { checkError } from "../support/checkError";

describe("assert.isIterable", function () {
    it("examples", function () {
        assert.isIterable([]);
        assert.isIterable(new Map());
        assert.isIterable(new Set());
        assert.isIterable({ [Symbol.iterator]: () => {} });
        assert.isIterable({ [Symbol.asyncIterator]: () => {} });

        checkError(function () {
            assert.isIterable({});
        }, "expected {} to be an iterable");

        checkError(function () {
            assert.isIterable(null);
        }, "expected null to be an iterable");

        checkError(function () {
            assert.isIterable(undefined);
        }, "expected undefined to be an iterable");
    });

    it("check primitives", function () {
        checkError(function () {
            assert.isIterable(1);
        }, "expected 1 to be an iterable");

        assert.isIterable("string");

        checkError(function () {
            assert.isIterable(true);
        }, "expected true to be an iterable");

        checkError(function () {
            assert.isIterable(Symbol());
        }, "expected [Symbol()] to be an iterable");
    });
});

describe("assert.isNotIterable", function () {
    it("examples", function () {
        assert.isNotIterable({});
        assert.isNotIterable(null);
        assert.isNotIterable(undefined);

        checkError(function () {
            assert.isNotIterable([]);
        }, "not expected [] to be an iterable");

        checkError(function () {
            assert.isNotIterable(new Map());
        }, "not expected [Map:{}] to be an iterable");

        checkError(function () {
            assert.isNotIterable(new Set());
        }, "not expected [Set:{}] to be an iterable");

        checkError(function () {
            let symIterator = getKnownSymbol(WellKnownSymbols.iterator);
            let iter = {
                [symIterator]: () => {}
            };
            assert.isNotIterable(iter);
        }, /not expected \{\[Symbol\(Symbol\.iterator\)\]:\[Function.*\]\} to be an iterable/);

        checkError(function () {
            let symAsyncIterator = getKnownSymbol(WellKnownSymbols.asyncIterator);
            let iter = {
                [symAsyncIterator]: () => {}
            };
            assert.isNotIterable(iter);
        }, /not expected \{\[Symbol\(Symbol\.asyncIterator\)\]:\[Function.*\]\} to be an iterable/);
    });

    it("check primitives", function () {
        assert.isNotIterable(1);

        checkError(function () {
            assert.isNotIterable("string");
        }, "not expected \"string\" to be an iterable");

        assert.isNotIterable(true);
        assert.isNotIterable(Symbol());
    });
});