/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "@nevware21/tripwire";
import {
    assertionDomQueue, assertionFlushScheduled, clearAllState, logSendQueue, setAssertionFlushScheduled,
    setCurrentExecutingTestKey, setLastObservedTestKey, testState
} from "../../../src/ux/browser/ui/state";
import { useStubDocument, uxDom } from "../support/uxDom";

/**
 * How an assertion reported by the running tests finds the test node it belongs to and lands in
 * the render queue. The tests here stop at that queue: the queued entry is what the rendering
 * module draws, and everything up to it is plain bookkeeping over the shared state.
 *
 * `_handleAssertionEvent` with `suiteParts`/`testName` builds the test's elements through
 * `ensureTestNode`, so that one case runs with the stand-in `document` of ../support/uxDom.ts.
 */

uxDom();
// eslint-disable-next-line @typescript-eslint/no-var-requires
const assertions: typeof import("../../../src/ux/browser/ui/assertions") = require("../../../src/ux/browser/ui/assertions");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const uiRendering: typeof import("../../../src/ux/browser/ui/ui-rendering") = require("../../../src/ux/browser/ui/ui-rendering");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const logging: typeof import("../../../src/ux/browser/ui/logging") = require("../../../src/ux/browser/ui/logging");

let frames: Array<() => void> = [];
const saved: { [name: string]: any } = {};

/**
 * `addAssertion` asks for an animation frame to draw the queue and a missing context is reported
 * through `queueLog`, which asks for one too and then POSTs -- so all three of the browser globals
 * involved get a stand-in for the duration of a test.
 */
function _installGlobals(): void {
    const g = globalThis as any;
    const names = ["requestAnimationFrame", "fetch", "location"];
    for (let lp = 0; lp < names.length; lp++) {
        saved[names[lp]] = g[names[lp]];
    }

    g.requestAnimationFrame = (cb: () => void) => {
        frames.push(cb);
        return frames.length;
    };
    g.fetch = () => Promise.resolve({ ok: true });
    g.location = { href: "http://localhost:4321/__tripwire__/browser" };
}

function _restoreGlobals(): void {
    const g = globalThis as any;
    const names = Object.keys(saved);
    for (let lp = 0; lp < names.length; lp++) {
        if (saved[names[lp]] === undefined) {
            delete g[names[lp]];
        } else {
            g[names[lp]] = saved[names[lp]];
        }
    }
}

describe("ux assertions", () => {

    beforeEach(() => {
        clearAllState();
        logging.clearLogs();
        frames = [];
        _installGlobals();
    });

    afterEach(async () => {
        try {
            // Neither module may owe a frame to a later test, since the stand-in that would run it
            // goes away below: with both queues emptied first, running the frames resets their
            // "scheduled" flags and draws nothing. Then let the log module send what the warning
            // path queued, while `fetch` is still stubbed.
            assertionDomQueue.length = 0;
            logging.clearLogs();
            for (let lp = 0; lp < frames.length; lp++) {
                frames[lp]();
            }
            await logging.flushLogsNow();
        } finally {
            _restoreGlobals();
            setAssertionFlushScheduled(false);
            assertionDomQueue.length = 0;
        }
    });

    describe("addAssertion", () => {
        it("should queue a normalised entry for the renderer", () => {
            assertions.addAssertion("outer :: alpha", 1, "", undefined);
            assertions.addAssertion("outer :: alpha", 0, "expected 2 to equal 3", "AssertionError: expected 2 to equal 3");

            assert.deepEqual(assertionDomQueue, [
                { testKey: "outer :: alpha", passed: true, label: "(assertion)", errorText: "" },
                { testKey: "outer :: alpha", passed: false, label: "expected 2 to equal 3", errorText: "AssertionError: expected 2 to equal 3" }
            ]);
        });

        it("should keep only the values a failure has", () => {
            assertions.addAssertion("k", false, "equal", "no", { expected: "2", actual: "1" });
            assertions.addAssertion("k", false, "isTrue", "no", { actual: "false" });
            assertions.addAssertion("k", false, "fail", "no", null);

            assert.deepEqual(assertionDomQueue.map((entry) => [ entry.expected, entry.actual ]), [
                [ "2", "1" ],
                [ undefined, "false" ],
                [ undefined, undefined ]
            ]);
            assert.isFalse("expected" in assertionDomQueue[1], "not even as undefined");
        });

        it("should ask for one animation frame per burst and mark it as pending", () => {
            assertions.addAssertion("k", true, "a", "");
            assertions.addAssertion("k", true, "b", "");
            assertions.addAssertion("k", false, "c", "x");

            assert.equal(frames.length, 1);
            assert.isTrue(assertionFlushScheduled);
        });

        it("should keep rendering after Clear Results empties the queue under a pending frame", () => {
            // Regression: Clear Results emptied the queue but left the "flush scheduled" flag set,
            // and the frame then returned early on the empty queue before clearing it -- so no
            // assertion queued afterwards ever asked for another frame, and none was drawn again.
            assertions.addAssertion("k", true, "a", "");
            assert.equal(frames.length, 1, "the first assertion asks for a frame");

            uiRendering.clearResults(null);
            frames[0]();
            assert.isFalse(assertionFlushScheduled, "an empty flush must release the flag");

            assertions.addAssertion("k", true, "b", "");

            assert.equal(frames.length, 2, "the next assertion must be able to ask for a frame again");
            assert.equal(assertionDomQueue.length, 1);
        });
    });

    describe("_handleAssertionEvent", () => {
        it("should ignore an empty event", () => {
            assertions._handleAssertionEvent(null);
            assertions._handleAssertionEvent(undefined);
            assert.equal(assertionDomQueue.length, 0);
            assert.equal(logSendQueue.length, 0);
        });

        it("should attribute an unaddressed assertion to the test currently executing", () => {
            setCurrentExecutingTestKey("outer :: alpha");
            assertions._handleAssertionEvent({ passed: 1, label: "", errorText: null });

            assert.deepEqual(assertionDomQueue, [{ testKey: "outer :: alpha", passed: true, label: "(assertion)", errorText: "" }]);
        });

        it("should fall back to whichever test is still marked running", () => {
            testState["s :: done"] = { key: "s :: done", status: "passed" } as any;
            testState["s :: live"] = { key: "s :: live", status: "running" } as any;
            assertions._handleAssertionEvent({ passed: false, label: "late", errorText: "e" });

            assert.equal(assertionDomQueue[0].testKey, "s :: live");
        });

        it("should fall back to the last test it heard about", () => {
            setLastObservedTestKey("s :: previous");
            assertions._handleAssertionEvent({ passed: true, label: "after the fact" });

            assert.equal(assertionDomQueue[0].testKey, "s :: previous");
        });

        it("should log a warning rather than invent a test when there is no context at all", () => {
            assertions._handleAssertionEvent({ passed: true, label: "orphan" });

            assert.equal(assertionDomQueue.length, 0);
            assert.deepEqual(logSendQueue, [{ level: "warn", message: "Assertion received without active test context" }]);
        });

        it("should draw the test an addressed assertion names, and attribute it there", () => {
            const doc = useStubDocument();
            let queued: any[];
            try {
                setCurrentExecutingTestKey("some other :: test");
                assertions._handleAssertionEvent({ suiteParts: [ "outer" ], testName: "named", passed: true, label: "equal" });
                queued = assertionDomQueue.slice(0);
            } finally {
                doc.restore();
                // The drawn test is not this file's to keep
                uiRendering.clearResults(null);
            }

            assert.deepEqual(queued, [{ testKey: "outer :: named", passed: true, label: "equal", errorText: "" }]);
        });

        it("should keep the values the test frame or worker sent with a failure", () => {
            setCurrentExecutingTestKey("outer :: alpha");

            assertions._handleAssertionEvent({ passed: false, label: "equal", errorText: "no", expected: "2", actual: "1" });

            assert.deepEqual(assertionDomQueue, [{ testKey: "outer :: alpha", passed: false, label: "equal", errorText: "no", expected: "2", actual: "1" }]);
        });
    });

    describe("handleAssertion", () => {
        beforeEach(() => {
            setCurrentExecutingTestKey("outer :: alpha");
        });

        it("should accept the context directly or wrapped in a value holder", () => {
            assertions.handleAssertion({ passed: true, message: "direct" });
            assertions.handleAssertion({ v: { passed: true, message: "wrapped" } });

            assert.deepEqual(assertionDomQueue.map((entry) => entry.label), ["direct", "wrapped"]);
        });

        it("should label the assertion from its message, else its operation path, else generically", () => {
            assertions.handleAssertion({ passed: true, message: "a message" });
            assertions.handleAssertion({ passed: true, opPath: ["expect", "to", "equal"] });
            assertions.handleAssertion({ passed: true });

            assert.deepEqual(assertionDomQueue.map((entry) => entry.label), ["a message", "expect.to.equal", "(assertion)"]);
        });

        it("should carry the error's message for a failure, and nothing for a pass", () => {
            assertions.handleAssertion({ passed: false, message: "f", error: new Error("expected 1 to equal 2") });
            assertions.handleAssertion({ passed: false, message: "g", error: "a bare string" });
            assertions.handleAssertion({ passed: false, message: "h", error: { code: 7 } });
            assertions.handleAssertion({ passed: true, message: "p" });

            assert.deepEqual(assertionDomQueue.map((entry) => entry.passed + ":" + entry.errorText), [
                "false:expected 1 to equal 2",
                "false:a bare string",
                "false:{\"code\":7}",
                "true:"
            ]);
        });

        it("should carry a failure's expected and actual values", () => {
            let error: any;
            try {
                assert.equal(1, 2);
            } catch (e) {
                error = e;
            }

            assertions.handleAssertion({ passed: false, message: "equal", error: error });
            assertions.handleAssertion({ passed: false, message: "thrown", error: new Error("no values") });

            assert.equal(assertionDomQueue[0].expected, "2");
            assert.equal(assertionDomQueue[0].actual, "1");
            assert.isFalse("expected" in assertionDomQueue[1] || "actual" in assertionDomQueue[1], "an error without values adds none");
        });

        it("should coerce a missing passed flag to a failure", () => {
            assertions.handleAssertion({ message: "no flag" });
            assertions.handleAssertion(null);

            assert.deepEqual(assertionDomQueue.map((entry) => entry.passed), [false, false]);
            assert.equal(assertionDomQueue[1].label, "(assertion)");
        });
    });
});
