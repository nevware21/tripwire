/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { isString } from "@nevware21/ts-utils";
import { assert } from "../../../src/assert/assertClass";
import { AssertionError } from "../../../src/assert/assertionError";
import { AssertionFailure } from "../../../src/assert/assertionFailure";
import { AssertionFatal } from "../../../src/assert/assertionFatal";
import { createContext } from "../../../src/assert/scopeContext";
import { useScope } from "../../../src/assert/useScope";
import { cStackDetail } from "../../../src/internal/_errorSupport";
import { parseStack } from "../../../src/internal/parseStack";
import { checkError } from "../support/checkError";

/**
 * The shared error support builds the lazy message and stack for every tripwire error: the inner
 * exception is folded into both, the stack is pruned against the caller supplied start functions and
 * the actual/expected/operator/showDiff values keep their original value when a framework replaces them.
 */
describe("error support", () => {
    describe("inner exception", () => {
        it("should append the inner exception's message and stack", () => {
            const inner = new Error("root cause");
            const error = new AssertionFailure("outer", inner, { actual: 1, expected: 2 });

            assert.includes(error.message, "Caused by: root cause");
            assert.includes(error.stack, "Inner Exception:");
            assert.includes(error.stack, "root cause");
        });

        it("should indent every line of the inner stack", () => {
            const inner = new Error("multi\nline");
            inner.stack = "Error: multi\nline\n    at first (file.js:1:1)\n    at second (file.js:2:2)";
            const error = new AssertionError("outer", inner);

            const innerPart = error.stack.substring(error.stack.indexOf("Inner Exception:"));
            const lines = innerPart.split("\n").slice(1);
            lines.forEach((line) => {
                if (line.length > 0) {
                    assert.isTrue(line.indexOf("    ") === 0, "inner stack line is indented: " + JSON.stringify(line));
                }
            });
        });

        it("should keep the own stack when the inner exception has no stack", () => {
            const inner: any = new Error("no stack");
            inner.stack = undefined;
            const error = new AssertionError("outer", inner);

            assert.isTrue(isString(error.stack));
            assert.isFalse(error.stack.indexOf("Inner Exception:") >= 0);
        });
    });

    describe("stack pruning", () => {
        it("should expose the parsed stack detail on the error", () => {
            const error = new AssertionFailure("detail");
            const detail: any = (error as any)[cStackDetail];

            assert.isObject(detail);
            assert.isTrue(isString(detail.formatStack()));
            assert.equal(detail.message, "detail");
        });

        it("should prune the frames of the supplied start functions", () => {
            function innerHelper(): AssertionFailure<any> {
                return new AssertionFailure("pruned", null, {}, [outerHelper, innerHelper]);
            }

            function outerHelper(): AssertionFailure<any> {
                return innerHelper();
            }

            const error = outerHelper();
            const frames = parseStack(error.stack).removeInnerStack().formatStack(99);

            assert.isFalse(frames.indexOf("innerHelper") >= 0, "the start function's own frame is removed");
            assert.isFalse(frames.indexOf("outerHelper") >= 0, "and the frames beneath it");
        });

        it("should tolerate start functions that are not on the stack at all", () => {
            function unrelated() {
                // never called
            }

            const error = new AssertionFatal("not on stack", null, {}, unrelated);

            assert.equal(error.message, "not on stack");
            assert.isTrue(isString(error.stack));
            assert.includes(error.stack, "not on stack");
        });

        it("should keep the longer stack when the start function is the first frame of both", () => {
            function same() {
                return new AssertionFailure("same", null, {}, same);
            }

            const error = same();
            assert.isTrue(isString(error.stack));
            assert.includes(error.stack, "same");
        });
    });

    describe("props in the message", () => {
        function messageInScope(props: any): string {
            // The message is built lazily, so it has to be read while the scope is still active
            return useScope(createContext(1), () => new AssertionFailure("failed", props).message);
        }

        it("should describe the props of a failure raised by an assertion", () => {
            checkError(() => {
                assert.equal(1, 2);
            }, /::: running "equal\(\)" with \(1\)/);
        });

        it("should keep a plain message for an error constructed outside of any scope", () => {
            const error = new AssertionFailure("plain", { actual: 1, expected: 2, operation: "equal()" });

            assert.equal(error.message, "plain");
        });

        it("should join the operation path when it ends with the operation", () => {
            assert.equal(messageInScope({ operation: "equal()", opPath: ["is", "equal()"] }), "failed ::: running \"is->equal()\"");
        });

        it("should append the operation when the path does not end with it", () => {
            assert.equal(messageInScope({ operation: "equal()", opPath: ["to", "be"] }), "failed ::: running \"to->be->equal()\"");
        });

        it("should format a path that is not an array before appending the operation", () => {
            assert.equal(messageInScope({ operation: "equal()", opPath: "to.be" }), "failed ::: running \"\"to.be\"->equal()\"");
        });

        it("should format the path alone when there is no operation", () => {
            assert.equal(messageInScope({ opPath: ["to", "be"] }), "failed ::: running \"[\"to\",\"be\"]\"");
        });

        it("should include the actual value and the remaining props", () => {
            const message = messageInScope({ operation: "equal()", opPath: ["equal()"], actual: 1, expected: 2, showDiff: true });

            assert.equal(message, "failed ::: running \"equal()\" with (1) and props: {\"expected\":2,\"showDiff\":true}");
        });

        it("should serialise props that carry no operation", () => {
            assert.equal(messageInScope({ actual: 1, expected: 2 }), "failed ::: {\"actual\":1,\"expected\":2}");
        });

        it("should ignore props that cannot be serialised", () => {
            const circular: any = { operation: "equal()", opPath: ["equal()"], actual: 1 };
            circular.self = circular;
            assert.equal(messageInScope(circular), "failed ::: running \"equal()\" with (1)");

            const plainCircular: any = { expected: 2 };
            plainCircular.self = plainCircular;
            assert.equal(messageInScope(plainCircular), "failed ::: ");
        });
    });

    describe("serialisation", () => {
        it("should serialise an assertion error with its values", () => {
            const inner = new Error("inner");
            const error: any = new AssertionFailure("serialise", inner, { actual: 1, expected: 2, operator: "equal", showDiff: true });

            const plain = error.toJSON();
            assert.equal(plain.name, "AssertionFailure");
            assert.includes(plain.message, "serialise");
            assert.deepEqual(plain.props, { actual: 1, expected: 2, operator: "equal", showDiff: true });
            assert.equal(plain.actual, 1);
            assert.equal(plain.expected, 2);
            assert.equal(plain.operator, "equal");
            assert.equal(plain.showDiff, true);
            assert.isUndefined(plain.stack);
            assert.equal(plain.innerException, inner);

            assert.isTrue(isString(error.toJSON(true).stack));
        });
    });

    describe("replaced values", () => {
        it("should remember the original value and expose it read-only", () => {
            const error: any = new AssertionFailure("values", { actual: 1, expected: 2, showDiff: true });

            error.actual = 10;
            error.expected = 20;
            error.showDiff = false;

            assert.equal(error.actual, 10);
            assert.equal(error.orgValues.actual, 1);
            assert.equal(error.orgValues.expected, 2);
            assert.equal(error.orgValues.showDiff, true);

            error.orgValues.actual = 99;
            assert.equal(error.orgValues.actual, 1, "the original value cannot be overwritten");

            error.orgValues = { actual: 5 };
            assert.equal(error.orgValues.actual, 1, "the original values object cannot be replaced");
        });

        it("should not define a property that was not supplied", () => {
            const error: any = new AssertionFailure("missing", { expected: 2 });

            assert.isFalse(Object.prototype.hasOwnProperty.call(error, "actual"));
            assert.equal(error.expected, 2);
        });

        it("should read the operator from an operation property", () => {
            const error: any = new AssertionFailure("operation", { operation: "equal()" });

            assert.equal(error.operator, "equal()");
        });
    });
});
