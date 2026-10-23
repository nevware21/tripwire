/*
 * Fixture for internal/runner/test/src/ux/interactivePage.test.ts -- not part of the runner's
 * own suite (it lives outside test/src). Every test here passes.
 */
import { describe, it, assert } from "@nevware21/tripwire";

describe("Math", () => {
    describe("addition", () => {
        it("adds two positive numbers", () => {
            assert.equal(2 + 3, 5);
        });

        it("adds a negative number", () => {
            assert.equal(5 + -2, 3);
        });
    });

    describe("multiplication", () => {
        it("multiplies two numbers", () => {
            assert.equal(4 * 3, 12);
        });

        it("multiplies by zero", () => {
            assert.equal(7 * 0, 0);
        });
    });
});
