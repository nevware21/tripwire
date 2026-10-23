/*
 * Fixture for internal/runner/test/src/ux/interactivePage.test.ts -- not part of the runner's
 * own suite (it lives outside test/src). One passing asynchronous test, so a run takes a
 * measurable (but short) amount of time and the page's duration labels have something to show.
 */
import { describe, it, assert } from "@nevware21/tripwire";

describe("Async", () => {
    it("resolves after a short delay", (done) => {
        setTimeout(() => {
            assert.isTrue(true);
            done();
        }, 20);
    });
});
