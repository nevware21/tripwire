/*
 * Fixture for internal/runner/test/src/ux/interactivePage.test.ts -- not part of the runner's
 * own suite (it lives outside test/src). Holds the fixture's ONE deliberately failing test
 * ("Strings > casing > lowercases a word"); the page tests depend on exactly one failure.
 */
import { describe, it, assert } from "@nevware21/tripwire";

describe("Strings", () => {
    it("trims whitespace", () => {
        assert.equal("  padded  ".trim(), "padded");
    });

    describe("casing", () => {
        it("uppercases a word", () => {
            assert.equal("word".toUpperCase(), "WORD");
        });

        it("lowercases a word", () => {
            // Deliberately wrong: the interactive page tests rely on exactly one failing test.
            assert.equal("WORD".toLowerCase(), "Word", "deliberate fixture failure");
        });
    });
});
