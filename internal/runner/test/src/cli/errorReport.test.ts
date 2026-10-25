/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "@nevware21/tripwire";
import { _formatCliError, _wantsDebugStack } from "../../../src/cli/errorReport";
import { _userError } from "../../../src/internal/userError";

/** Strips ANSI so assertions are about the words, not the colours. */
// eslint-disable-next-line no-control-regex
const _ANSI = /\u001b\[[0-9;]*m/g;

function _plain(lines: string[]): string[] {
    return lines.map((line) => line.replace(_ANSI, ""));
}

function _bundleError(message: string): Error {
    const error = new Error(message);
    error.stack = message + "\n" +
        "    at yo (D:\\proj\\core\\bin\\tripwire.js:2:140935)\n" +
        "    at Io (D:\\proj\\core\\bin\\tripwire.js:2:171406)";

    return error;
}

describe("cli errorReport", () => {
    describe("_wantsDebugStack", () => {
        it("should be off for an ordinary run", () => {
            assert.isFalse(_wantsDebugStack(["test/**/*.test.ts"], {}));
        });

        it("should be on when the flag is passed", () => {
            assert.isTrue(_wantsDebugStack(["--debug-stack", "test/**/*.test.ts"], {}));
        });

        it("should be on via the environment, for a run whose args cannot be changed", () => {
            assert.isTrue(_wantsDebugStack([], { TRIPWIRE_DEBUG_STACK: "1" }));
        });

        it("should treat the usual disabled spellings as off", () => {
            assert.isFalse(_wantsDebugStack([], { TRIPWIRE_DEBUG_STACK: "0" }));
            assert.isFalse(_wantsDebugStack([], { TRIPWIRE_DEBUG_STACK: "false" }));
            assert.isFalse(_wantsDebugStack([], { TRIPWIRE_DEBUG_STACK: "" }));
        });

        it("should not read a pattern after -- as a flag", () => {
            assert.isFalse(_wantsDebugStack(["--", "--debug-stack"], {}));
        });
    });

    describe("_formatCliError", () => {
        it("should print a user error's message and hints, and no stack", () => {
            const error = _userError("No files matched: ./nope/*.test.ts", [
                "Quote the pattern so the shell doesn't expand it first"
            ]);
            error.stack = "Error: x\n    at yo (D:\\proj\\core\\bin\\tripwire.js:2:140935)";

            const lines = _plain(_formatCliError(error));

            assert.equal(lines[0], "Error: No files matched: ./nope/*.test.ts");
            assert.equal(lines[2], "  Quote the pattern so the shell doesn't expand it first");
            assert.isTrue(lines.join("\n").indexOf("tripwire.js:2:") === -1, "no bundle frame leaked");
            assert.isTrue(lines[lines.length - 1].indexOf("--debug-stack") !== -1);
        });

        it("should still hide the stack for an unexpected failure, but say that is what it is", () => {
            const lines = _plain(_formatCliError(_bundleError("Cannot read properties of undefined")));
            const joined = lines.join("\n");

            assert.equal(lines[0], "Error: Cannot read properties of undefined");
            assert.isTrue(joined.indexOf("tripwire.js:2:") === -1, "no bundle frame leaked");
            assert.isTrue(joined.indexOf("unexpected tripwire failure") !== -1);
            assert.isTrue(joined.indexOf("github.com/nevware21/tripwire/issues") !== -1);
        });

        it("should not claim an unexpected failure for a deliberate one", () => {
            const lines = _plain(_formatCliError(_userError("TypeScript project file not found: x")));

            assert.isTrue(lines.join("\n").indexOf("unexpected tripwire failure") === -1);
        });

        it("should include the frames when --debug-stack asked for them", () => {
            const lines = _plain(_formatCliError(_bundleError("boom"), { debugStack: true }));
            const joined = lines.join("\n");

            assert.equal(lines[0], "Error: boom");
            assert.isTrue(joined.indexOf("tripwire.js:2:140935") !== -1, "frames present");
            // The stack repeats the message on its first line -- already printed above.
            assert.equal(joined.indexOf("boom"), joined.lastIndexOf("boom"), "message printed once");
        });

        it("should not offer --debug-stack when it is already on", () => {
            const lines = _plain(_formatCliError(_userError("nope"), { debugStack: true }));

            assert.isTrue(lines.join("\n").indexOf("Run again with --debug-stack") === -1);
        });

        it("should render a thrown non-Error", () => {
            assert.equal(_plain(_formatCliError("just a string"))[0], "Error: just a string");
        });

        it("should keep a multi-line message (a formatted TS diagnostic) intact", () => {
            const message = "TypeScript compile failed with 1 error(s):\n" +
                "test/src/a.test.ts:5:15 - error TS2322: Type 'number' is not assignable to type 'string'.";

            assert.equal(_plain(_formatCliError(_userError(message)))[0], "Error: " + message);
        });
    });
});
