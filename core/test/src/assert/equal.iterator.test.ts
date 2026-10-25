/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { getKnownSymbol, WellKnownSymbols } from "@nevware21/ts-utils";
import { assert } from "../../../src/assert/assertClass";
import { checkError } from "../support/checkError";

const symIterator = getKnownSymbol(WellKnownSymbols.iterator);

function arrayIterator(values: number[]) {
    let idx = 0;

    return {
        next: () => {
            if (idx < values.length) {
                return { value: values[idx++], done: false };
            }

            return { value: undefined as number, done: true };
        }
    };
}

/**
 * An iterable instance (not a plain object) without a length: it has to be compared by the values
 * it produces, as nothing else about it can be compared.
 */
class Bag {
    private _values: number[];

    constructor(values: number[]) {
        this._values = values;
        (this as any)[symIterator] = () => arrayIterator(this._values);
    }
}

describe("deepEqual iterables", () => {
    function hostile(extra?: any) {
        const obj: any = { marker: "hostile" };
        Object.defineProperty(obj, symIterator, {
            get: () => {
                throw new Error("the iterator accessor must not break equality");
            },
            enumerable: false,
            configurable: true
        });

        if (extra) {
            obj.extra = extra;
        }

        return obj;
    }

    it("should ignore an iterator accessor that throws and compare the keys instead", () => {
        assert.deepEqual(hostile(), hostile());

        checkError(() => {
            assert.deepEqual(hostile(1), hostile(2));
        }, /to deeply equal/);
    });

    it("should compare iterable instances without a length by their iterated values", () => {
        assert.deepEqual(new Bag([1, 2, 3]), new Bag([1, 2, 3]));
        assert.deepEqual(new Bag([]), new Bag([]));

        checkError(() => {
            assert.deepEqual(new Bag([1, 2, 3]), new Bag([1, 2, 4]));
        }, /to deeply equal/);

        checkError(() => {
            assert.deepEqual(new Bag([1, 2, 3]), new Bag([1, 2]));
        }, /to deeply equal/);
    });

    it("should compare plain objects that only expose an iterator by their iterated values", () => {
        function iterable(values: number[]) {
            const obj: any = {};
            Object.defineProperty(obj, symIterator, {
                value: () => arrayIterator(values),
                enumerable: false
            });

            return obj;
        }

        assert.deepEqual(iterable([1, 2, 3]), iterable([1, 2, 3]));

        checkError(() => {
            assert.deepEqual(iterable([1, 2, 3]), iterable([1, 2, 4]));
        }, /to deeply equal/);
    });

    it("should give up on a value that keeps referring to itself against ever new expected values", () => {
        const actual: any = {};
        actual.self = actual;

        let expected: any = {};
        let cursor = expected;
        for (let lp = 0; lp < 20; lp++) {
            cursor.self = {};
            cursor = cursor.self;
        }

        checkError(() => {
            assert.deepEqual(actual, expected);
        }, /Unresolvable Circular reference detected/);
    });
});
