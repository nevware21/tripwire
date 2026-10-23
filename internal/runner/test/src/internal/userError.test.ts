/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "@nevware21/tripwire";
import { _isUserError, _markUserError, _userError, _userErrorHints } from "../../../src/internal/userError";

describe("userError", () => {
    it("should build a real Error carrying the message", () => {
        const error = _userError("No files matched: x");

        assert.isTrue(error instanceof Error);
        assert.equal(error.message, "No files matched: x");
        assert.isTrue(_isUserError(error));
    });

    it("should carry hints, and report none when there are none", () => {
        assert.deepEqual(_userErrorHints(_userError("x", ["do this", "or this"])), ["do this", "or this"]);
        assert.deepEqual(_userErrorHints(_userError("x")), []);
        assert.deepEqual(_userErrorHints(_userError("x", [])), []);
    });

    it("should not mistake an ordinary failure for a deliberate one", () => {
        assert.isFalse(_isUserError(new Error("Cannot read properties of undefined")));
        assert.isFalse(_isUserError(null));
        assert.isFalse(_isUserError(undefined));
        assert.isFalse(_isUserError("a thrown string"));
        assert.deepEqual(_userErrorHints(new Error("x")), []);
    });

    it("should promote an error built elsewhere without rebuilding it", () => {
        // The formatted-TypeScript-diagnostic case: the message is already assembled.
        const original = new Error("TypeScript compile failed with 1 error(s):\n...");
        const marked = _markUserError(original, ["fix the type"]);

        assert.strictEqual(marked, original, "same instance");
        assert.isTrue(_isUserError(original));
        assert.deepEqual(_userErrorHints(original), ["fix the type"]);
    });

    it("should keep the stack a real throw would produce, for --debug-stack", () => {
        assert.isTrue(!!_userError("x").stack);
    });
});
