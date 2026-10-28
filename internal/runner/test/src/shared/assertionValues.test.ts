/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert, expect } from "@nevware21/tripwire";
import { addAssertionValues, formatAssertionValue, getAssertionValues } from "../../../src/shared/assertionValues";

/**
 * The expected and actual values the interactive page shows beside a failed assertion. The browser
 * and worker targets read them from the error where the assertion failed and send them on as text,
 * so what is pinned here is that text, and which errors have values at all.
 */
describe("assertionValues", () => {

    /** What a failing assertion threw. */
    function thrownBy(fn: () => void): any {
        try {
            fn();
        } catch (e) {
            return e;
        }

        assert.fail("expected the assertion to fail");
    }

    describe("formatAssertionValue", () => {
        it("should write strings, objects and arrays as JSON, and other primitives as they read in code", () => {
            assert.equal(formatAssertionValue("text"), "\"text\"");
            assert.equal(formatAssertionValue({ a: [ 1, "b" ] }), "{\"a\":[1,\"b\"]}");
            assert.equal(formatAssertionValue(42), "42");
            assert.equal(formatAssertionValue(NaN), "NaN", "not JSON's null");
            assert.equal(formatAssertionValue(true), "true");
            assert.equal(formatAssertionValue(null), "null");
            assert.equal(formatAssertionValue(undefined), "undefined");
            assert.equal(formatAssertionValue(Symbol("s")), "Symbol(s)");
        });

        it("should name a function, and write a cycle or a deep value without following it", () => {
            function named() {
                // Only its name is shown
            }

            assert.equal(formatAssertionValue(named), "[Function: named]");
            assert.equal(formatAssertionValue(() => 1), "[Function]", "an arrow function assigned nowhere has no name");

            const cycle: any = { };
            cycle.self = cycle;
            assert.equal(formatAssertionValue(cycle), "{\"self\":[Circular]}");
            assert.equal(formatAssertionValue({ a: { b: { c: { d: { e: 1 } } } } }), "{\"a\":{\"b\":{\"c\":{\"d\":[Object]}}}}");
            assert.equal(formatAssertionValue([ [ [ [ [ 1 ] ] ] ] ]), "[[[[[Array]]]]]");
        });

        it("should write symbols, which cannot be concatenated into a string, as they read in code", () => {
            assert.equal(formatAssertionValue(Symbol()), "Symbol()");
            assert.equal(formatAssertionValue(Symbol.iterator), "Symbol(Symbol.iterator)");
            assert.equal(formatAssertionValue({ s: Symbol("in") }), "{\"s\":Symbol(in)}");
            assert.equal(formatAssertionValue([ Symbol("x") ]), "[Symbol(x)]", "not JSON's null");
        });

        it("should run nothing of the value's own -- no getter, setter, toJSON or toString -- as it runs inside the assertion", () => {
            let runs = 0;
            const value = {
                plain: 1,
                get lazy() {
                    runs++;
                    return 2;
                },
                set only(_: any) {
                    runs++;
                },
                get both() {
                    runs++;
                    return 3;
                },
                set both(_: any) {
                    runs++;
                },
                toJSON: () => {
                    runs++;
                    return "json";
                },
                toString: () => {
                    runs++;
                    return "text";
                }
            };

            assert.equal(formatAssertionValue(value),
                "{\"plain\":1,\"lazy\":[Getter],\"only\":[Setter],\"both\":[Getter/Setter],\"toJSON\":[Function: toJSON],\"toString\":[Function: toString]}");
            assert.equal(runs, 0);

            const fn = function() {
                // Its name is a getter that throws
            };
            Object.defineProperty(fn, "name", {
                get: () => {
                    runs++;
                    throw new Error("name getter throws");
                }
            });
            assert.equal(formatAssertionValue(fn), "[Function]");
            assert.equal(runs, 0, "not even a function's name getter");
        });

        it("should never throw: not for a proxy whose traps throw, nor a revoked one", () => {
            const hostile = new Proxy({}, {
                ownKeys: () => {
                    throw new Error("no keys");
                }
            });
            assert.equal(formatAssertionValue(hostile), "[object]");

            const revocable = Proxy.revocable({}, {});
            revocable.revoke();
            assert.equal(formatAssertionValue(revocable.proxy), "[object]");
        });

        it("should write a date as its ISO time and a regular expression as its literal", () => {
            assert.equal(formatAssertionValue(new Date(0)), "1970-01-01T00:00:00.000Z");
            assert.equal(formatAssertionValue(new Date(NaN)), "Invalid Date");
            assert.equal(formatAssertionValue({ at: /a+b/gi }), "{\"at\":/a+b/gi}");
        });

        it("should cut a very long value short", () => {
            const text = formatAssertionValue("x".repeat(5000));

            assert.equal(text.length, 1003);
            assert.isTrue(text.endsWith("..."));
        });

        it("should stop writing a long array or object once it is too long to show", () => {
            const big: any = {};
            for (let lp = 0; lp < 20000; lp++) {
                big["key" + lp] = lp;
            }

            [ new Array(100000).fill(12345), big ].forEach((value) => {
                const text = formatAssertionValue(value);
                assert.equal(text.length, 1003);
                assert.isTrue(text.endsWith("..."));
            });
        });
    });

    describe("getAssertionValues", () => {
        it("should read both values from a failed equality", () => {
            assert.deepEqual(getAssertionValues(thrownBy(() => assert.equal(1, 2))), { expected: "2", actual: "1" });
            assert.deepEqual(getAssertionValues(thrownBy(() => assert.deepEqual([ 1 ], [ 2 ]))), { expected: "[2]", actual: "[1]" });
        });

        it("should read only the value an assertion has", () => {
            assert.deepEqual(getAssertionValues(thrownBy(() => assert.isTrue(false))), { actual: "false" });
        });

        it("should read a symbol an assertion failed on, which failed every such test in the page when it threw", () => {
            assert.deepEqual(getAssertionValues(thrownBy(() => expect(Symbol()).is.iterable())), { actual: "Symbol()" });
            assert.deepEqual(getAssertionValues(thrownBy(() => assert.isExtensible(Symbol("s")))), { actual: "Symbol(s)" });
        });

        it("should have nothing, rather than throw, for an error of the test's own whose values throw", () => {
            const error = {
                get expected(): any {
                    throw new Error("no");
                }
            };

            assert.isNull(getAssertionValues(error));
        });

        it("should keep an undefined value beside a defined one", () => {
            assert.deepEqual(getAssertionValues({ expected: 2, actual: undefined }), { expected: "2", actual: "undefined" });
        });

        it("should have nothing for an error without values, or whose values were never set", () => {
            assert.isNull(getAssertionValues(new Error("thrown by the code under test")));
            assert.isNull(getAssertionValues(thrownBy(() => assert.fail("nope"))), "fail() has an actual, never set");
            assert.isNull(getAssertionValues({ actual: undefined, expected: undefined }));
            assert.isNull(getAssertionValues(null));
            assert.isNull(getAssertionValues("a string"));
        });
    });

    describe("addAssertionValues", () => {
        it("should add the values an error has to the event, and return it", () => {
            const event = { kind: "assert" };

            const result = addAssertionValues(event, thrownBy(() => assert.equal("a", "b")));

            assert.equal(result, event);
            assert.deepEqual(event, { kind: "assert", expected: "\"b\"", actual: "\"a\"" });
        });

        it("should leave the event alone for an error without values, or no error", () => {
            assert.deepEqual(addAssertionValues({ kind: "assert" }, thrownBy(() => assert.isTrue(false))), { kind: "assert", actual: "false" });
            assert.deepEqual(addAssertionValues({ kind: "assert" }, new Error("thrown")), { kind: "assert" });
            assert.deepEqual(addAssertionValues({ kind: "assert" }, undefined), { kind: "assert" });
        });
    });
});
