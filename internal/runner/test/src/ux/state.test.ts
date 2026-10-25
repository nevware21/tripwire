/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "@nevware21/tripwire";
import * as state from "../../../src/ux/browser/ui/state";

/**
 * The interactive page's shared mutable state: one module of live `let` bindings plus a setter
 * for each, which is what lets every other module read `running`/`lastResult`/... without a
 * central object being threaded through. These tests pin the contract the rest of the UI leans
 * on: that a setter is visible to every importer straight away, that `clearAllState` really does
 * empty everything a run produced (in place -- other modules hold references to the queues and
 * maps), and that it leaves the one thing that is a user preference alone.
 */
describe("ux state", () => {

    beforeEach(() => {
        state.clearAllState();
        state.setAutoReloadEnabled(true);
    });

    it("should start a run from a clean slate", () => {
        assert.isNull(state.payload);
        assert.isNull(state.discovery);
        assert.isFalse(state.running);
        assert.isFalse(state.completed);
        assert.isNull(state.lastResult);
        assert.isFalse(state.stopRequested);
        assert.isNull(state.activeWorker);
        assert.isFalse(state.consoleBridgeInstalled);
        assert.deepEqual(state.logDomQueue, []);
        assert.deepEqual(state.logSendQueue, []);
        assert.deepEqual(state.assertionDomQueue, []);
        assert.isFalse(state.assertionFlushScheduled);
        assert.isFalse(state.logFlushScheduled);
        assert.isFalse(state.sendFlushScheduled);
        assert.equal(state.assertionCount, 0);
        assert.deepEqual(Object.keys(state.suiteState), []);
        assert.deepEqual(Object.keys(state.testState), []);
        assert.equal(state.currentExecutingTestKey, "");
        assert.equal(state.lastObservedTestKey, "");
        assert.equal(state.highlightSuiteTitle, "");
        assert.equal(state.highlightTestTitle, "");
    });

    it("should expose every setter's value through the live binding", () => {
        const worker = {} as any;
        const result = { total: 3, failed: 1 };
        const cases: Array<[() => void, () => any, any]> = [
            [() => state.setPayload({ files: [] }), () => state.payload, { files: [] }],
            [() => state.setDiscovery({ suites: [], tests: [] }), () => state.discovery, { suites: [], tests: [] }],
            [() => state.setRunning(true), () => state.running, true],
            [() => state.setCompleted(true), () => state.completed, true],
            [() => state.setLastResult(result), () => state.lastResult, result],
            [() => state.setStopRequested(true), () => state.stopRequested, true],
            [() => state.setActiveWorker(worker), () => state.activeWorker, worker],
            [() => state.setConsoleBridgeInstalled(true), () => state.consoleBridgeInstalled, true],
            [() => state.setAssertionFlushScheduled(true), () => state.assertionFlushScheduled, true],
            [() => state.setLogFlushScheduled(true), () => state.logFlushScheduled, true],
            [() => state.setSendFlushScheduled(true), () => state.sendFlushScheduled, true],
            [() => state.setAssertionCount(42), () => state.assertionCount, 42],
            [() => state.setCurrentExecutingTestKey("s :: t"), () => state.currentExecutingTestKey, "s :: t"],
            [() => state.setLastObservedTestKey("s :: u"), () => state.lastObservedTestKey, "s :: u"],
            [() => state.setAutoReloadEnabled(false), () => state.autoReloadEnabled, false]
        ];

        for (let lp = 0; lp < cases.length; lp++) {
            cases[lp][0]();
            assert.deepEqual(cases[lp][1](), cases[lp][2], "case " + lp);
        }
    });

    it("should count assertions one at a time from wherever the count was set", () => {
        state.incrementAssertionCount();
        state.incrementAssertionCount();
        assert.equal(state.assertionCount, 2);

        state.setAssertionCount(10);
        state.incrementAssertionCount();
        assert.equal(state.assertionCount, 11);
    });

    it("should normalise a missing highlight title to an empty string", () => {
        state.setHighlightSelection("outer", "outer > alpha");
        assert.equal(state.highlightSuiteTitle, "outer");
        assert.equal(state.highlightTestTitle, "outer > alpha");

        state.setHighlightSelection(null as any, undefined as any);
        assert.strictEqual(state.highlightSuiteTitle, "");
        assert.strictEqual(state.highlightTestTitle, "");
    });

    it("should patch several fields at once with setState and leave the rest alone", () => {
        state.setPayload({ keep: true });
        state.setState({ running: true, stopRequested: true, currentExecutingTestKey: "k" });

        assert.isTrue(state.running);
        assert.isTrue(state.stopRequested);
        assert.equal(state.currentExecutingTestKey, "k");
        assert.deepEqual(state.payload, { keep: true }, "untouched by the patch");
        assert.isFalse(state.completed);
    });

    it("should let the setters keep working on a field patched through setState", () => {
        state.setState({ assertionCount: 5 });
        state.incrementAssertionCount();
        assert.equal(state.assertionCount, 6);
    });

    it("should describe the run through the running/completed/lastResult trio", () => {
        // What the Run/Stop/Finish controls are built from (see ui-control.ts): a run in flight
        // is `running`; "has results to finish" is a non-null `lastResult`; `completed` is the
        // one-shot finish having been reported.
        assert.isNull(state.lastResult, "nothing to finish before any run");

        state.setRunning(true);
        assert.isTrue(state.running);
        assert.isNull(state.lastResult, "still nothing to finish mid-run");

        state.setRunning(false);
        state.setLastResult({ total: 1, passed: 1, failed: 0 });
        assert.isFalse(state.completed, "results are not the same as having finished");

        state.setCompleted(true);
        assert.isTrue(state.completed);
        assert.isNotNull(state.lastResult, "finishing does not discard the result");
    });

    it("should drop everything an aborted run left behind", () => {
        state.setRunning(true);
        state.setStopRequested(true);
        state.setActiveWorker({} as any);
        state.setCurrentExecutingTestKey("outer :: alpha");
        state.setLastObservedTestKey("outer :: alpha");
        state.setLastResult({ total: 2, failed: 1 });
        state.setCompleted(true);
        state.setHighlightSelection("outer", "");
        state.logDomQueue.push({ level: "log", message: "x" });
        state.logSendQueue.push({ level: "log", message: "x" });
        state.assertionDomQueue.push({ testKey: "k", passed: true, label: "l", errorText: "" });
        state.suiteState["outer"] = { key: "outer" } as any;
        state.testState["outer :: alpha"] = { key: "outer :: alpha" } as any;
        state.setAssertionCount(7);
        state.setAssertionFlushScheduled(true);
        state.setLogFlushScheduled(true);
        state.setSendFlushScheduled(true);
        state.setConsoleBridgeInstalled(true);

        state.clearAllState();

        assert.isFalse(state.running);
        assert.isFalse(state.stopRequested);
        assert.isNull(state.activeWorker);
        assert.isNull(state.lastResult);
        assert.isFalse(state.completed);
        assert.equal(state.currentExecutingTestKey, "");
        assert.equal(state.lastObservedTestKey, "");
        assert.equal(state.highlightSuiteTitle, "");
        assert.equal(state.assertionCount, 0);
        assert.isFalse(state.assertionFlushScheduled);
        assert.isFalse(state.logFlushScheduled);
        assert.isFalse(state.sendFlushScheduled);
        assert.isFalse(state.consoleBridgeInstalled);
        assert.equal(state.logDomQueue.length, 0);
        assert.equal(state.logSendQueue.length, 0);
        assert.equal(state.assertionDomQueue.length, 0);
        assert.deepEqual(Object.keys(state.suiteState), []);
        assert.deepEqual(Object.keys(state.testState), []);
    });

    it("should clear the queues and maps in place, since other modules hold references to them", () => {
        const domQueue = state.logDomQueue;
        const sendQueue = state.logSendQueue;
        const assertionQueue = state.assertionDomQueue;
        const suites = state.suiteState;
        const tests = state.testState;

        domQueue.push({ level: "log", message: "x" });
        suites["s"] = { key: "s" } as any;
        tests["s :: t"] = { key: "s :: t" } as any;

        state.clearAllState();

        assert.strictEqual(state.logDomQueue, domQueue);
        assert.strictEqual(state.logSendQueue, sendQueue);
        assert.strictEqual(state.assertionDomQueue, assertionQueue);
        assert.strictEqual(state.suiteState, suites);
        assert.strictEqual(state.testState, tests);
        assert.equal(domQueue.length, 0);
        assert.isUndefined(suites["s"]);
        assert.isUndefined(tests["s :: t"]);
    });

    it("should keep the auto-reload preference across a reset", () => {
        // A frame/worker reload clears the run state, and the reload may well have been triggered
        // by this very toggle -- resetting it here would flip the setting the user just chose.
        state.setAutoReloadEnabled(false);
        state.clearAllState();
        assert.isFalse(state.autoReloadEnabled);

        state.setAutoReloadEnabled(true);
        state.clearAllState();
        assert.isTrue(state.autoReloadEnabled);
    });
});
