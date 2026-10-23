/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "@nevware21/tripwire";
import {
    assertionDomQueue, assertionFlushScheduled, clearAllState, setAssertionFlushScheduled, setHighlightSelection, suiteState, testState
} from "../../../src/ux/browser/ui/state";
import { MAX_ASSERTIONS_PER_TEST } from "../../../src/ux/browser/ui/shared";
import { textOf, useStubDocument, uxDom } from "../support/uxDom";

/**
 * How the interactive page draws a run: a collapsible node per suite and per test under the results
 * panel, each with its status, duration, counts and assertions, and how the progress the runner
 * reports moves them along. The page's elements are the plain objects of ../support/uxDom.ts, and a
 * stand-in `document` builds the new ones.
 */

const dom = uxDom();
// eslint-disable-next-line @typescript-eslint/no-var-requires
const rendering: typeof import("../../../src/ux/browser/ui/ui-rendering") = require("../../../src/ux/browser/ui/ui-rendering");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const execution: typeof import("../../../src/ux/browser/ui/test-execution") = require("../../../src/ux/browser/ui/test-execution");

function noFilter(): void {
    // The filtering module decides visibility; it is tested on its own
}

/** A stand-in element's children. */
function kids(el: any): any[] {
    return el.kids;
}

/** The options each `scrollIntoView` call on a stand-in element was given. */
function scrolled(el: any): any[] {
    return el.scrolledIntoView;
}

/** The element whose class list contains `cls`, anywhere under `el`. */
function find(el: any, cls: string): any {
    return el.querySelector("." + cls);
}

describe("ux rendering", () => {
    let restoreDocument: () => void;

    beforeEach(() => {
        restoreDocument = useStubDocument(dom).restore;
        rendering.clearResults(dom.assertCount);
        clearAllState();
        setHighlightSelection("", "");
        dom.results.scrollTop = 0;
        dom.results.clientHeight = 0;
        dom.results.scrollHeight = 0;
    });

    afterEach(() => {
        restoreDocument();
    });

    describe("suite nodes", () => {
        it("draws a running suite under the results panel", () => {
            const suite = rendering.ensureSuiteNode([ "outer" ]);

            assert.equal(kids(dom.results)[0], suite.details);
            assert.isTrue(suite.details.open);
            assert.isTrue(suite.details.classList.contains("suite-running"));
            assert.equal(textOf(find(suite.details, "suite-name")), "outer");
            assert.equal(suite.meta.textContent, "0/0 tests");
            assert.equal(suite.chip.textContent, "running");
            assert.equal(suite.marker.getAttribute("aria-hidden"), "true");
            assert.equal(find(suite.details, "rerun-btn").getAttribute("data-rerun-suite"), "outer");
            assert.equal(rendering.ensureSuiteNode([ "outer" ]), suite, "drawn once");
        });

        it("nests a suite in its parent, counting it there", () => {
            const inner = rendering.ensureSuiteNode([ "outer", "inner" ]);
            const outer = suiteState["outer"];

            assert.equal(kids(outer.children)[0], inner.details);
            assert.equal(outer.childSuiteCount, 1);
            assert.equal(outer.meta.textContent, "0/0 tests • 1 child suite");

            rendering.ensureSuiteNode([ "outer", "second" ]);
            assert.equal(outer.meta.textContent, "0/0 tests • 2 child suites");
        });

        it("draws the default suite without a rerun button", () => {
            const root = rendering.ensureSuiteNode([]);

            assert.equal(textOf(find(root.details, "suite-name")), "(default suite)");
            assert.isNull(find(root.details, "rerun-btn"));
        });

        it("marks a suite's status", () => {
            const suite = rendering.ensureSuiteNode([ "marked" ]);
            const marks: any = {};

            [ "passed", "failed", "pending", "running" ].forEach((status) => {
                rendering.setSuiteMarker(suite, status);
                marks[status] = [ suite.marker.className, suite.marker.textContent ];
            });

            assert.deepEqual(marks, {
                passed: [ "suite-marker marker-passed", "✓" ],
                failed: [ "suite-marker marker-failed", "✗" ],
                pending: [ "suite-marker marker-pending", "○" ],
                running: [ "suite-marker marker-running", "" ]
            });

            rendering.setSuiteMarker(null as any, "passed");
            rendering.updateSuiteMeta(null as any);
        });
    });

    describe("test nodes", () => {
        it("draws a running test in its suite, counting it in every enclosing suite", () => {
            const test = rendering.ensureTestNode([ "outer", "inner" ], "works");

            assert.equal(kids(suiteState["outer > inner"].children)[0], test.details);
            assert.equal(test.label.textContent, "… works");
            assert.equal(test.chip.textContent, "running");
            assert.equal(find(test.details, "rerun-btn").getAttribute("data-rerun-test"), "outer > inner > works");
            assert.equal(suiteState["outer"].total, 1);
            assert.equal(suiteState["outer > inner"].meta.textContent, "0/1 tests");
            assert.equal(rendering.ensureTestNode([ "outer", "inner" ], "works"), test, "drawn once");
        });

        it("names a test without a name", () => {
            assert.equal(rendering.ensureTestNode([], "").testName, "(unnamed test)");
        });

        it("collapses a passed test and keeps a failed one open, with its duration", () => {
            const passed = rendering.ensureTestNode([ "s" ], "passes");
            const failed = rendering.ensureTestNode([ "s" ], "fails");
            const filtered: any[] = [];
            passed.durationMs = 12;

            rendering.setTestStatus(passed, "passed", (node) => filtered.push(node));
            rendering.setTestStatus(failed, "failed", (node) => filtered.push(node));

            assert.isFalse(passed.details.open);
            assert.equal(passed.label.textContent, "✓ passes");
            assert.equal(passed.chip.className, "status-chip status-passed");
            assert.isTrue(passed.details.classList.contains("test-passed"));
            assert.isFalse(passed.details.classList.contains("test-running"));
            assert.equal(passed.duration.textContent, "12ms");
            assert.equal(passed.duration.style.display, "inline-flex");
            assert.isTrue(failed.details.open);
            assert.equal(failed.duration.style.display, "none");
            assert.deepEqual(filtered, [ passed, failed ]);
        });

        it("keeps the highlighted test open and scrolls to it", () => {
            setHighlightSelection("s", "s > chosen");
            const chosen = rendering.ensureTestNode([ "s" ], "chosen");

            rendering.setTestStatus(chosen, "passed", noFilter);

            assert.isTrue(chosen.details.open);
            assert.deepEqual(scrolled(chosen.details), [ { block: "center" } ]);
        });
    });

    describe("suite status", () => {
        it("shows a suite as running until all its tests are done", () => {
            rendering.ensureTestNode([ "s" ], "a");
            const suite = suiteState["s"];

            rendering.updateSuiteStatus("s");

            assert.equal(suite.chip.textContent, "running 0/1");
            assert.equal(suite.marker.className, "suite-marker marker-running");
            rendering.updateSuiteStatus("no such suite");
        });

        it("opens a failed suite and collapses a passed one", () => {
            const failing = rendering.ensureSuiteNode([ "failing" ]);
            const passing = rendering.ensureSuiteNode([ "passing" ]);
            failing.failed = 1;
            passing.durationMs = 5;

            rendering.updateSuiteStatus("failing");
            rendering.updateSuiteStatus("passing");

            assert.equal(failing.chip.textContent, "failed");
            assert.isTrue(failing.details.open);
            assert.isTrue(failing.details.classList.contains("suite-failed"));
            assert.equal(passing.chip.textContent, "passed");
            assert.isFalse(passing.details.open);
            assert.equal(passing.duration.textContent, "5ms");
        });

        it("keeps a passed suite open on the way to the highlighted test, and scrolls to a highlighted suite", () => {
            setHighlightSelection("outer > inner", "");
            const outer = rendering.ensureSuiteNode([ "outer" ]);
            const inner = rendering.ensureSuiteNode([ "outer", "inner" ]);

            rendering.updateSuiteStatus("outer");
            rendering.updateSuiteStatus("outer > inner");

            assert.isTrue(outer.details.open, "an ancestor of the selection");
            assert.deepEqual(scrolled(outer.details), []);
            assert.isTrue(inner.details.open);
            assert.deepEqual(scrolled(inner.details), [ { block: "center" } ]);
        });

        it("keeps the default suite open for a highlighted test of its own", () => {
            setHighlightSelection("", "top level test");
            const root = rendering.ensureSuiteNode([]);

            rendering.updateSuiteStatus(root.key);

            assert.isTrue(root.details.open);
        });
    });

    describe("assertions", () => {
        it("draws the queued assertions under their tests, and the running total", () => {
            const test = rendering.ensureTestNode([ "s" ], "t");
            assertionDomQueue.push(
                { testKey: test.key, passed: true, label: "equal(1, 1)", errorText: "" },
                { testKey: test.key, passed: false, label: "equal(1, 2)", errorText: "expected 1 to equal 2" },
                { testKey: "a test that is not drawn", passed: true, label: "x", errorText: "" },
                null
            );
            setAssertionFlushScheduled(true);

            rendering.flushAssertionDomQueue(dom.assertCount);

            assert.deepEqual(kids(test.assertions).map((item: any) => [ item.className, item.textContent ]), [
                [ "assert-item assert-pass", "✓ equal(1, 1)" ],
                [ "assert-item assert-fail", "✗ equal(1, 2) -> expected 1 to equal 2" ]
            ]);
            assert.equal(test.assertionCount, 2);
            assert.equal(dom.assertCount.textContent, "2 assertions");
            assert.equal(assertionDomQueue.length, 0);
            assert.isFalse(assertionFlushScheduled);
        });

        it("keeps only the latest assertions of a very long test", () => {
            const test = rendering.ensureTestNode([ "s" ], "long");
            for (let lp = 0; lp <= MAX_ASSERTIONS_PER_TEST; lp++) {
                assertionDomQueue.push({ testKey: test.key, passed: true, label: "check " + lp, errorText: "" });
            }

            rendering.flushAssertionDomQueue(null);

            assert.equal(test.assertions.childElementCount, MAX_ASSERTIONS_PER_TEST);
            assert.equal(kids(test.assertions)[0].textContent, "✓ check 1", "the first was dropped");
            assert.equal(test.assertionCount, MAX_ASSERTIONS_PER_TEST + 1);
        });

        it("only clears the flag when nothing is queued", () => {
            setAssertionFlushScheduled(true);

            rendering.flushAssertionDomQueue(dom.assertCount);

            assert.isFalse(assertionFlushScheduled);
        });

        it("adds an assertion of its own for a test that reported none", () => {
            const test = rendering.ensureTestNode([ "s" ], "t");

            rendering.appendSyntheticAssertion(test, false, "", "boom", dom.assertCount);

            assert.equal(kids(test.assertions)[0].textContent, "✗ (assertion) -> boom");
            assert.equal(dom.assertCount.textContent, "1 assertion");
            rendering.appendSyntheticAssertion(null as any, true, "x", "", dom.assertCount);
        });

        it("drops the oldest synthetic assertion past the limit", () => {
            const test = rendering.ensureTestNode([ "s" ], "t");
            for (let lp = 0; lp <= MAX_ASSERTIONS_PER_TEST; lp++) {
                rendering.appendSyntheticAssertion(test, true, "synthetic " + lp, "", null);
            }

            assert.equal(test.assertions.childElementCount, MAX_ASSERTIONS_PER_TEST);
        });
    });

    describe("scrolling", () => {
        it("follows new results while the panel is scrolled to the bottom, for a whole batch", () => {
            dom.results.clientHeight = 100;
            dom.results.scrollHeight = 100;

            rendering.beginRenderBatch();
            rendering.ensureSuiteNode([ "a" ]);
            dom.results.scrollHeight = 400;
            rendering.ensureTestNode([ "a" ], "t");
            rendering.endRenderBatch();

            assert.equal(dom.results.scrollTop, 400);
        });

        it("leaves the panel where it is when it was scrolled up", () => {
            dom.results.clientHeight = 100;
            dom.results.scrollHeight = 1000;

            rendering.ensureSuiteNode([ "a" ]);

            assert.equal(dom.results.scrollTop, 0);
            rendering.endRenderBatch();
        });
    });

    it("clears every drawn result and the counts", () => {
        rendering.ensureTestNode([ "s" ], "t");
        assertionDomQueue.push({ testKey: "x", passed: true, label: "", errorText: "" });

        rendering.clearResults(dom.assertCount);

        assert.deepEqual(Object.keys(suiteState), []);
        assert.deepEqual(Object.keys(testState), []);
        assert.equal(assertionDomQueue.length, 0);
        assert.equal(kids(dom.results).length, 0);
        assert.equal(dom.assertCount.textContent, "0 assertions");
        rendering.clearResults(null);
    });

    describe("test execution", () => {
        it("finds the most recent running test", () => {
            assert.equal(execution.findActiveTestKey(), "");

            const first = execution._handleTestStart([ "s" ], "first", noFilter);
            const second = execution._handleTestStart([ "s" ], "second", noFilter);
            assert.equal(execution.findActiveTestKey(), second.key);

            execution._handleTestDone([ "s" ], "second", "passed", 1, "", noFilter);
            assert.equal(execution.findActiveTestKey(), first.key);
        });

        it("draws a suite as it starts, and its status and duration as it ends", () => {
            execution._handleSuiteStart([ "suite" ]);
            execution._handleSuiteDone([ "suite" ], 7);

            const suite = suiteState["suite"];
            assert.equal(suite.chip.textContent, "passed");
            assert.equal(suite.duration.textContent, "7ms");

            execution._handleSuiteStart(null);
            execution._handleSuiteDone(null, 0);
            assert.isObject(suiteState["(default suite)"]);
        });

        it("counts each finished test once, in every enclosing suite", () => {
            execution._handleTestStart([ "outer", "inner" ], "t", noFilter);

            execution._handleTestDone([ "outer", "inner" ], "t", "failed", 3, "boom", noFilter);
            execution._handleTestDone([ "outer", "inner" ], "t", "failed", 3, "boom", noFilter);

            assert.equal(suiteState["outer"].done, 1);
            assert.equal(suiteState["outer"].failed, 1);
            assert.equal(suiteState["outer > inner"].chip.textContent, "failed");
        });

        it("treats skipped and pending tests as passed", () => {
            const skipped = execution._handleTestDone([ "s" ], "skipped", "skipped", 0, "", noFilter);
            const pending = execution._handleTestDone([ "s" ], "pending", "", 0, "", noFilter);

            assert.equal(skipped.status, "passed");
            assert.equal(pending.status, "passed");
            assert.equal(suiteState["s"].failed, 0);
        });

        it("adds a failure of its own to a failed test that reported no assertion", () => {
            const failed = execution._handleTestDone([ "s" ], "failed", "failed", 0, "expected true", noFilter);
            const timedOut = execution._handleTestDone([ "s" ], "slow", "failed", 0, "Timeout of 2000ms exceeded", noFilter);
            const silent = execution._handleTestDone([ "s" ], "silent", "failed", 0, null, noFilter);

            assert.equal(kids(failed.assertions)[0].textContent, "✗ Test failed -> expected true");
            assert.equal(kids(timedOut.assertions)[0].textContent, "✗ Test timed out -> Timeout of 2000ms exceeded");
            assert.equal(kids(silent.assertions)[0].textContent, "✗ Test failed");
        });

        it("leaves a failed test's own assertions, drawn or still queued, to explain it", () => {
            const drawn = execution._handleTestStart([ "s" ], "drawn", noFilter);
            rendering.appendSyntheticAssertion(drawn, false, "equal", "no", null);
            const queued = execution._handleTestStart([ "s" ], "queued", noFilter);
            assertionDomQueue.push({ testKey: queued.key, passed: false, label: "equal", errorText: "no" });

            execution._handleTestDone([ "s" ], "drawn", "failed", 0, "no", noFilter);
            execution._handleTestDone([ "s" ], "queued", "failed", 0, "no", noFilter);

            assert.equal(kids(drawn.assertions).length, 1);
            assert.equal(kids(queued.assertions).length, 0);
        });

        it("names unnamed tests and suites", () => {
            const node = execution._handleTestStart(null, null, noFilter);

            assert.equal(node.testName, "(unnamed test)");
            assert.equal(execution._handleTestDone(null, null, "passed", 0, "", noFilter), node);
        });
    });
});
