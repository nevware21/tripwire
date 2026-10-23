/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { isString } from "@nevware21/ts-utils";
import { assert } from "../../../src/assert/assertClass";
import { TripwireError } from "../../../src/errors/tripwireError";

describe("TripwireError", () => {
    it("should create an error with just a message", () => {
        const error = new TripwireError("Something went wrong");

        assert.equal(error.name, "TripwireError");
        assert.equal(error.message, "Something went wrong");
        assert.isUndefined(error.props);
        assert.isNull((error as any).innerException);
        assert.ok(error instanceof Error);
        assert.ok(error instanceof TripwireError);
        assert.isTrue(isString(error.stack), "the stack is captured");
        assert.isTrue(isString((error as any).fullStack), "the unpruned stack is kept");
        assert.includes((error as any).fullStack, "Something went wrong");
    });

    it("should keep the supplied props", () => {
        const error = new TripwireError("With props", { code: 42, detail: "x" });

        assert.deepEqual(error.props, { code: 42, detail: "x" });
        assert.equal(error.message, "With props");
    });

    it("should record the inner exception in the message and the stack", () => {
        const inner = new Error("inner failure");
        const error = new TripwireError("outer failure", null, inner);

        assert.equal((error as any).innerException, inner);
        assert.isTrue(error.message.indexOf("outer failure") === 0, "the own message comes first");
        assert.includes(error.message, "Caused by: inner failure");
        assert.includes(error.stack, "Inner Exception:");
        assert.includes(error.stack, "inner failure");
    });

    it("should omit the caused-by suffix when the inner exception has no message", () => {
        const inner = new Error("");
        const error = new TripwireError("outer failure", null, inner);

        assert.equal(error.message, "outer failure");
        assert.equal((error as any).innerException, inner);
    });

    it("should leave the stack alone when the inner exception has none", () => {
        const inner: any = new Error("quiet");
        inner.stack = undefined;
        const error = new TripwireError("outer failure", null, inner);

        assert.includes(error.message, "Caused by: quiet");
        assert.isFalse(error.stack.indexOf("Inner Exception:") >= 0, "nothing to append without an inner stack");
    });

    it("should accept a single stack start function", () => {
        function createIt() {
            return new TripwireError("from a helper", null, null, createIt);
        }

        const error = createIt();
        assert.equal(error.message, "from a helper");
        assert.isTrue(isString(error.stack));
    });

    it("should accept an array of stack start functions", () => {
        function level2(): TripwireError {
            return new TripwireError("nested", { depth: 2 }, null, [level1, level2]);
        }

        function level1(): TripwireError {
            return level2();
        }

        const error = level1();
        assert.equal(error.message, "nested");
        assert.deepEqual(error.props, { depth: 2 });
        assert.isTrue(isString(error.stack));
    });

    it("should serialise with toJSON", () => {
        const inner = new Error("inner");
        const error: any = new TripwireError("serialise me", null, inner);

        const plain = error.toJSON();
        assert.equal(plain.name, "TripwireError");
        assert.includes(plain.message, "serialise me");
        assert.isUndefined(plain.stack, "the stack is only included on request");
        assert.equal(plain.innerException, inner);

        const withStack = error.toJSON(true);
        assert.isTrue(isString(withStack.stack));
    });

    it("should be throwable and catchable as an Error", () => {
        let caught: any = null;
        try {
            throw new TripwireError("thrown");
        } catch (e) {
            caught = e;
        }

        assert.ok(caught instanceof TripwireError);
        assert.equal(caught.message, "thrown");
    });
});
