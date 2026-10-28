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
import { shownTextOf, textOf, useStubDocument, uxDom } from "../support/uxDom";

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
    // The results scroll with the page, so this is what is kept pinned to the bottom
    let page: any;

    beforeEach(() => {
        const installed = useStubDocument(dom);
        restoreDocument = installed.restore;
        page = installed.document.scrollingElement;
        dom.failedOnlyToggle.checked = false;
        rendering.clearResults(dom.assertCount);
        clearAllState();
        setHighlightSelection("", "");
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
            assert.equal(suite.meta.textContent, "", "nothing to count yet");
            assert.equal(suite.meta.style.display, "none");
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
            assert.equal(outer.meta.textContent, "1 child suite");
            assert.equal(outer.meta.style.display, "");

            rendering.ensureSuiteNode([ "outer", "second" ]);
            assert.equal(outer.meta.textContent, "2 child suites");
        });

        it("words a suite's counts: how far along while it runs, then what happened", () => {
            const suite = rendering.ensureSuiteNode([ "counted" ]);
            const meta = (total: number, done: number, failed: number, skipped: number) => {
                suite.total = total;
                suite.done = done;
                suite.failed = failed;
                suite.skipped = skipped;
                rendering.updateSuiteMeta(suite);

                return suite.meta.textContent;
            };

            assert.equal(meta(3, 1, 0, 0), "1 of 3 done");
            assert.equal(meta(3, 3, 0, 0), "3 passed");
            assert.equal(meta(3, 3, 1, 1), "1 passed · 1 failed · 1 skipped");
            assert.equal(meta(2, 2, 2, 0), "2 failed", "no \"0 passed\"");
            assert.equal(meta(2, 2, 0, 2), "2 skipped");

            rendering.ensureSuiteNode([ "counted", "child" ]);
            assert.equal(meta(2, 2, 1, 0), "1 passed · 1 failed · 1 child suite");
        });

        it("draws the default suite without a rerun button", () => {
            const root = rendering.ensureSuiteNode([]);

            assert.equal(textOf(find(root.details, "suite-name")), "(default suite)");
            assert.isNull(find(root.details, "rerun-btn"));
        });

        it("marks a suite's status", () => {
            const suite = rendering.ensureSuiteNode([ "marked" ]);
            const marks: any = {};

            [ "passed", "failed", "pending", "skipped", "running" ].forEach((status) => {
                rendering.setSuiteMarker(suite, status);
                marks[status] = [ suite.marker.className, suite.marker.textContent ];
            });

            assert.deepEqual(marks, {
                passed: [ "suite-marker marker-passed", "✓" ],
                failed: [ "suite-marker marker-failed", "✗" ],
                pending: [ "suite-marker marker-pending", "○" ],
                skipped: [ "suite-marker marker-skipped", "○" ],
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
            assert.deepEqual(kids(test.label).map(textOf), [ "…", "works" ], "the marker, then the name");
            assert.equal(test.marker.className, "test-marker marker-running", "its own element, to take the status colour");
            assert.equal(test.marker.getAttribute("aria-hidden"), "true");
            assert.equal(test.chip.textContent, "running");
            assert.equal(find(test.details, "rerun-btn").getAttribute("data-rerun-test"), "outer > inner > works");
            assert.equal(find(test.details, "test-statuses"), test.chip.parentNode, "the statuses wrap together");
            assert.equal(suiteState["outer"].total, 1);
            assert.equal(suiteState["outer > inner"].meta.textContent, "0 of 1 done");
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
            assert.deepEqual(kids(passed.label).map(textOf), [ "✓", "passes" ]);
            assert.equal(passed.marker.className, "test-marker marker-passed");
            assert.equal(failed.marker.className, "test-marker marker-failed");
            assert.equal(passed.chip.className, "status-chip status-passed");
            assert.isTrue(passed.details.classList.contains("test-passed"));
            assert.isFalse(passed.details.classList.contains("test-running"));
            assert.equal(passed.duration.textContent, "12ms");
            assert.equal(passed.duration.style.display, "inline-flex");
            assert.isTrue(failed.details.open);
            assert.equal(failed.duration.style.display, "none");
            assert.deepEqual(filtered, [ passed, failed ]);
        });

        it("collapses a skipped test, marked as skipped rather than passed", () => {
            const skipped = rendering.ensureTestNode([ "s" ], "later");

            rendering.setTestStatus(skipped, "skipped", noFilter);

            assert.isFalse(skipped.details.open);
            assert.deepEqual(kids(skipped.label).map(textOf), [ "○", "later" ]);
            assert.equal(skipped.marker.className, "test-marker marker-skipped");
            assert.equal(skipped.chip.className, "status-chip status-skipped");
            assert.isTrue(skipped.details.classList.contains("test-skipped"));
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

        it("shows a suite whose tests were all skipped as skipped", () => {
            const suite = rendering.ensureSuiteNode([ "later" ]);
            suite.total = 2;
            suite.done = 2;
            suite.skipped = 2;

            rendering.updateSuiteStatus("later");

            assert.equal(suite.chip.className, "status-chip status-skipped");
            assert.equal(suite.chip.textContent, "skipped");
            assert.equal(suite.marker.className, "suite-marker marker-skipped");
            assert.isTrue(suite.details.classList.contains("suite-skipped"));
            assert.isFalse(suite.details.open);
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

            assert.deepEqual(kids(test.assertions).map((item: any) => [ item.className, shownTextOf(item) ]), [
                [ "assert-item assert-pass", "✓ equal(1, 1)" ],
                [ "assert-item assert-fail", "✗ equal(1, 2) -> expected 1 to equal 2" ]
            ]);
            assert.equal(test.assertionCount, 2);
            assert.equal(dom.assertCount.textContent, "2 assertions");
            assert.equal(assertionDomQueue.length, 0);
            assert.isFalse(assertionFlushScheduled);
        });

        it("says passed or failed to a screen reader, in place of the ✓ or ✗", () => {
            const test = rendering.ensureTestNode([ "s" ], "t");
            assertionDomQueue.push(
                { testKey: test.key, passed: true, label: "equal(1, 1)", errorText: "" },
                { testKey: test.key, passed: false, label: "equal", errorText: "no ::: detail", expected: "1" }
            );

            rendering.flushAssertionDomQueue(null);

            const [ pass, fail ] = kids(test.assertions);
            assert.deepEqual(kids(pass).map((part: any) => [ part.className || "text", part.getAttribute ? part.getAttribute("aria-hidden") : null, part.textContent ]), [
                [ "assert-mark", "true", "✓ " ],
                [ "sr-only", null, "Passed: " ],
                [ "text", null, "equal(1, 1)" ]
            ]);
            assert.equal(textOf(find(fail, "assert-message")), "✗ Failed: equal -> no");
            assert.equal(find(fail, "assert-details").kids[1].getAttribute("tabindex"), "0", "a long description scrolls, so the keyboard can reach it");
        });

        it("shows a failure's expected and actual values, and folds the rest of its description away", () => {
            const test = rendering.ensureTestNode([ "s" ], "t");
            assertionDomQueue.push({
                testKey: test.key,
                passed: false,
                label: "equal",
                errorText: "expected 1 to equal 2 ::: running \"equal()\" with (1)",
                expected: "2",
                actual: "1"
            });

            rendering.flushAssertionDomQueue(null);

            const item = kids(test.assertions)[0];
            assert.equal(item.className, "assert-item assert-fail");
            assert.equal(shownTextOf(find(item, "assert-message")), "✗ expected 1 to equal 2", "the message already names the assertion");
            assert.deepEqual(kids(find(item, "assert-values")).map((part: any) => part.className + "=" + part.textContent), [
                "assert-key=Expected",
                "assert-value=2",
                "assert-key=Actual",
                "assert-value=1"
            ]);

            const more = find(item, "assert-details");
            assert.equal(more.tagName, "DETAILS");
            assert.isFalse(more.open, "folded away");
            assert.deepEqual(kids(more).map(textOf), [ "Details", "running \"equal()\" with (1)" ]);
        });

        it("shows only the values a failure has, and no Details without a description", () => {
            const test = rendering.ensureTestNode([ "s" ], "t");
            assertionDomQueue.push(
                { testKey: test.key, passed: false, label: "isOk(value)", errorText: "expected undefined to be truthy", actual: "undefined" },
                { testKey: test.key, passed: false, label: "fail", errorText: " ::: thrown by fail()" }
            );

            rendering.flushAssertionDomQueue(null);

            const withValue = kids(test.assertions)[0];
            assert.equal(shownTextOf(find(withValue, "assert-message")), "✗ isOk(value) -> expected undefined to be truthy");
            assert.deepEqual(kids(find(withValue, "assert-values")).map(textOf), [ "Actual", "undefined" ]);
            assert.isNull(find(withValue, "assert-details"));

            const detailOnly = kids(test.assertions)[1];
            assert.equal(shownTextOf(find(detailOnly, "assert-message")), "✗ fail");
            assert.isNull(find(detailOnly, "assert-values"));
            assert.equal(textOf(find(detailOnly, "assert-details")), "Detailsthrown by fail()");
        });

        it("keeps only the latest assertions of a very long test", () => {
            const test = rendering.ensureTestNode([ "s" ], "long");
            for (let lp = 0; lp <= MAX_ASSERTIONS_PER_TEST; lp++) {
                assertionDomQueue.push({ testKey: test.key, passed: true, label: "check " + lp, errorText: "" });
            }

            rendering.flushAssertionDomQueue(null);

            assert.equal(test.assertions.childElementCount, MAX_ASSERTIONS_PER_TEST);
            assert.equal(shownTextOf(kids(test.assertions)[0]), "✓ check 1", "the first was dropped");
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

            assert.equal(shownTextOf(kids(test.assertions)[0]), "✗ boom", "the error's message, not a placeholder name");
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
        it("follows new results while the page is scrolled to the bottom, for a whole batch", () => {
            page.clientHeight = 100;
            page.scrollHeight = 100;

            rendering.beginRenderBatch();
            rendering.ensureSuiteNode([ "a" ]);
            page.scrollHeight = 400;
            rendering.ensureTestNode([ "a" ], "t");
            rendering.endRenderBatch();

            assert.equal(page.scrollTop, 400);
            assert.equal(dom.results.scrollTop, 0, "the results panel does not scroll on its own");
        });

        it("leaves the page where it is when it was scrolled up", () => {
            page.clientHeight = 100;
            page.scrollHeight = 1000;

            rendering.ensureSuiteNode([ "a" ]);

            assert.equal(page.scrollTop, 0);
            rendering.endRenderBatch();
        });

        it("falls back to the document element without a scrolling element, and to nothing without a document", () => {
            const doc = (globalThis as any).document;
            const root = doc.documentElement = page;
            doc.scrollingElement = null;
            root.clientHeight = 100;
            root.scrollHeight = 100;

            rendering.beginRenderBatch();
            root.scrollHeight = 300;
            rendering.endRenderBatch();
            assert.equal(root.scrollTop, 300);

            restoreDocument();
            restoreDocument = () => undefined;
            rendering.beginRenderBatch();
            rendering.endRenderBatch();
        });
    });

    describe("run summary", () => {
        function chips(): string[] {
            return kids(dom.runSummary).map((chip: any) => chip.tagName + "." + chip.className.replace("summary-chip ", "") + "=" + chip.textContent);
        }

        it("is hidden until a test has finished", () => {
            rendering.updateRunSummary();

            assert.isTrue(dom.runSummary.hidden);
            assert.deepEqual(chips(), []);
        });

        it("counts the tests as they finish, the failed count a button for Failed only", () => {
            execution._handleTestDone([ "s" ], "a", "passed", 1, "", noFilter);
            execution._handleTestDone([ "s" ], "b", "failed", 1, "boom", noFilter);
            execution._handleTestDone([ "s" ], "c", "skipped", 0, "", noFilter);

            assert.isFalse(dom.runSummary.hidden);
            assert.deepEqual(chips(), [ "SPAN.summary-passed=1 passed", "BUTTON.summary-failed=1 failed", "SPAN.summary-skipped=1 skipped" ]);

            const failedChip = find(dom.runSummary, "summary-failed");
            assert.equal(failedChip.getAttribute("type"), "button");
            assert.equal(failedChip.getAttribute("aria-pressed"), "false");

            dom.failedOnlyToggle.checked = true;
            rendering.updateRunSummary();
            assert.equal(find(dom.runSummary, "summary-failed").getAttribute("aria-pressed"), "true");
            assert.isFalse(dom.filterNote.hidden);
            assert.equal(dom.filterNote.textContent, "2 passed or skipped tests hidden by Failed only");
        });

        it("shows the run's own summary once it is over, with how long it took", () => {
            execution._handleTestDone([ "s" ], "a", "passed", 1, "", noFilter);

            rendering.updateRunSummary({ passed: 4, failed: 0, skipped: 1, pending: 1, duration: 1534 });

            assert.deepEqual(chips(), [ "SPAN.summary-passed=4 passed", "SPAN.summary-skipped=2 skipped", "SPAN.summary-duration=1.53s" ]);

            rendering.updateRunSummary({ passed: 1 });
            assert.deepEqual(chips(), [ "SPAN.summary-passed=1 passed" ], "no duration to show");
        });

        it("is emptied and hidden again when the results are cleared", () => {
            execution._handleTestDone([ "s" ], "a", "passed", 1, "", noFilter);

            rendering.clearResults(null);

            assert.isTrue(dom.runSummary.hidden);
            assert.deepEqual(chips(), []);
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

        it("shows skipped and pending tests as skipped: not failed, and not claimed to have passed", () => {
            const skipped = execution._handleTestDone([ "s" ], "skipped", "skipped", 0, "", noFilter);
            const pending = execution._handleTestDone([ "s" ], "pending", "", 0, "", noFilter);

            assert.equal(skipped.status, "skipped");
            assert.equal(pending.status, "skipped");
            assert.equal(suiteState["s"].failed, 0);
            assert.equal(suiteState["s"].skipped, 2);
            assert.equal(suiteState["s"].chip.textContent, "skipped");
            assert.equal(suiteState["s"].meta.textContent, "2 skipped");
        });

        it("adds a failure of its own to a failed test that reported no assertion", () => {
            const failed = execution._handleTestDone([ "s" ], "failed", "failed", 0, "expected true", noFilter);
            const timedOut = execution._handleTestDone([ "s" ], "slow", "failed", 0, "Timeout of 2000ms exceeded", noFilter);
            const silent = execution._handleTestDone([ "s" ], "silent", "failed", 0, null, noFilter);

            assert.equal(shownTextOf(kids(failed.assertions)[0]), "✗ Test failed -> expected true");
            assert.equal(shownTextOf(kids(timedOut.assertions)[0]), "✗ Test timed out -> Timeout of 2000ms exceeded");
            assert.equal(shownTextOf(kids(silent.assertions)[0]), "✗ Test failed");
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
