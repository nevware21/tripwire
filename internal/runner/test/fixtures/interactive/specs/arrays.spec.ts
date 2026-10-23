/*
 * Fixture for internal/runner/test/src/ux/interactivePage.test.ts -- not part of the runner's
 * own suite (it lives outside test/src). Every test here passes.
 */
import { describe, it, assert } from "@nevware21/tripwire";

describe("Arrays", () => {
    it("reports its length", () => {
        assert.equal([1, 2, 3].length, 3);
    });

    it("finds an element", () => {
        assert.equal([1, 2, 3].indexOf(2), 1);
    });
});
