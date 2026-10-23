/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { resultsEl } from "./dom";
import { SuiteNode, TestNode, MAX_ASSERTIONS_PER_TEST } from "./shared";
import { suiteState, testState, setLastObservedTestKey, incrementAssertionCount, setAssertionCount, assertionCount, setAssertionFlushScheduled, highlightSuiteTitle, highlightTestTitle } from "./state";
import { getSuiteDisplayName, makeSuiteKey, getSuiteKeyChain, makeTestKey } from "../../../shared/suiteNames";
import { _wasAtBottom, _stickToBottom, _setDurationText, _setStatusClass, getStatusMarker, formatCount, createRerunButton } from "./utils";
import { assertionDomQueue } from "./state";

/*
 * Keeping the results list pinned to the bottom means reading its scroll position before a node
 * is added and writing it back afterwards. The read is a forced synchronous layout of the whole
 * results list, and the list is dirty by then -- so doing it per node is quadratic: every one of
 * ~2700 tests pays a full layout of a tree that ends up at ~38,000 elements.
 *
 * A batch of lifecycle events therefore reads once before it and writes once after it (see
 * client.ts's `lifecycleBatch` handler), and the per-node pairs below become no-ops inside one.
 * Outside a batch -- a single unbatched event, or an assertion flush on its own animation frame
 * -- they behave exactly as they did.
 */
var _batchDepth = 0;
var _batchPinned = false;

export function beginRenderBatch() {
    if (_batchDepth++ === 0) {
        _batchPinned = _wasAtBottom(resultsEl);
    }
}

export function endRenderBatch() {
    if (_batchDepth > 0 && --_batchDepth === 0) {
        _stickToBottom(resultsEl, _batchPinned);
    }
}

function _pinStart(): boolean {
    return _batchDepth > 0 ? _batchPinned : _wasAtBottom(resultsEl);
}

function _pinEnd(pinned: boolean) {
    if (_batchDepth === 0) {
        _stickToBottom(resultsEl, pinned);
    }
}

/**
 * True when `nodeTitle` (a suite's own "a > b > c" selection title, or a test's full
 * "a > b > c > test" title) is the highlighted target itself, or an ancestor of it -- eg. suite
 * "a" and "a > b" are both ancestors of highlighted test "a > b > c > test", so both need to stay
 * expanded for that test to actually be reachable, even though only the test itself is the exact
 * match. `nodeTitle` can be "" for the synthetic root pseudo-suite, which is never a match (there
 * is nothing in `highlight*Title` that would ever resolve to the empty string as a real target).
 */
function _isHighlightTargetOrAncestor(nodeTitle: string): boolean {
    var target = highlightTestTitle || highlightSuiteTitle;
    if (!nodeTitle || !target) {
        return false;
    }

    return target === nodeTitle || target.indexOf(nodeTitle + " > ") === 0;
}

function _isExactHighlightTarget(nodeTitle: string): boolean {
    var target = highlightTestTitle || highlightSuiteTitle;
    return !!nodeTitle && !!target && target === nodeTitle;
}

export function updateSuiteMeta(suite: SuiteNode) {
    if (!suite || !suite.meta) {
        return;
    }

    var text = suite.done + "/" + suite.total + " tests";
    if (suite.childSuiteCount > 0) {
        text += " \u2022 " + formatCount(suite.childSuiteCount, "child suite", "child suites");
    }

    suite.meta.textContent = text;
}

export function setSuiteMarker(suite: SuiteNode, status: any) {
    if (!suite || !suite.marker) {
        return;
    }

    suite.marker.className = "suite-marker marker-" + status;
    if (status === "passed") {
        suite.marker.textContent = "\u2713";
    } else if (status === "failed") {
        suite.marker.textContent = "\u2717";
    } else if (status === "pending") {
        suite.marker.textContent = "\u25cb";
    } else {
        suite.marker.textContent = "";
    }
}

export function ensureSuiteNode(parts: any): SuiteNode {
    var key = makeSuiteKey(parts);
    var existing = suiteState[key];
    if (existing) {
        return existing;
    }

    var details = document.createElement("details");
    details.className = "suite-node suite-running suite-tone-" + ((parts.length % 3) + 1);
    details.open = true;

    var summary = document.createElement("summary");
    summary.className = "suite-summary";

    var heading = document.createElement("span");
    heading.className = "suite-heading";

    var title = document.createElement("span");
    title.className = "suite-title";

    var marker = document.createElement("span");
    marker.className = "suite-marker marker-running";
    marker.setAttribute("aria-hidden", "true");

    var titleText = document.createElement("span");
    titleText.className = "suite-name";
    titleText.textContent = getSuiteDisplayName(parts);

    title.appendChild(marker);
    title.appendChild(titleText);

    heading.appendChild(title);

    var statusWrap = document.createElement("span");
    statusWrap.className = "suite-statuses";

    var meta = document.createElement("span");
    meta.className = "status-chip status-pending";
    meta.textContent = "0/0 tests";

    var duration = document.createElement("span");
    duration.className = "duration-label";
    duration.style.display = "none";

    var chip = document.createElement("span");
    chip.className = "status-chip status-running";
    chip.textContent = "running";

    statusWrap.appendChild(meta);
    statusWrap.appendChild(duration);
    statusWrap.appendChild(chip);

    // The synthetic root pseudo-suite (parts.length === 0, displayed as "(default suite)")
    // has no selectable value of its own in the suite dropdown -- "" there means "All suites",
    // not "just the suite-less root tests" -- so there's nothing a rerun button could scope to
    // that isn't already "Run" with no selection at all. Skip it only for that node.
    if (parts.length > 0) {
        var suiteRerunBtn = createRerunButton(parts.join(" > "), "", "Run only this suite again");
        statusWrap.appendChild(suiteRerunBtn);
    }

    summary.appendChild(heading);
    summary.appendChild(statusWrap);

    var children = document.createElement("div");
    children.className = "suite-children";

    details.appendChild(summary);
    details.appendChild(children);

    if (parts.length > 1) {
        var parentSuite = ensureSuiteNode(parts.slice(0, parts.length - 1));
        var parentPinned = _pinStart();
        parentSuite.children.appendChild(details);
        _pinEnd(parentPinned);
    } else if (resultsEl) {
        var rootPinned = _pinStart();
        resultsEl.appendChild(details);
        _pinEnd(rootPinned);
    }

    var created: SuiteNode = {
        key: key,
        parts: parts.slice(0),
        details: details,
        marker: marker,
        meta: meta,
        duration: duration,
        chip: chip,
        children: children,
        total: 0,
        done: 0,
        failed: 0,
        childSuiteCount: 0
    };

    suiteState[key] = created;

    var chain = getSuiteKeyChain(parts);
    if (chain.length > 1) {
        for (var c = 0; c < chain.length - 1; c++) {
            var ancestor = suiteState[chain[c]];
            if (ancestor) {
                ancestor.childSuiteCount++;
                updateSuiteMeta(ancestor);
            }
        }
    }

    updateSuiteMeta(created);
    return created;
}

export function ensureTestNode(suiteParts: any, testName: any): TestNode {
    var suite = ensureSuiteNode(suiteParts);
    var key = makeTestKey(suiteParts, testName);
    var existing = testState[key];
    if (existing) {
        setLastObservedTestKey(existing.key);
        return existing;
    }

    var wasPinned = _pinStart();

    var details = document.createElement("details");
    details.className = "test-node test-running test-tone-" + (((suite.total % 3) + 1));
    details.open = true;

    var summary = document.createElement("summary");
    summary.className = "test-summary";

    var label = document.createElement("span");
    label.className = "test-label";
    label.textContent = getStatusMarker("running") + " " + (testName || "(unnamed test)");

    var chip = document.createElement("span");
    chip.className = "status-chip status-running";
    chip.textContent = "running";

    var duration = document.createElement("span");
    duration.className = "duration-label";
    duration.style.display = "none";

    var resolvedTestName = testName || "(unnamed test)";
    var testSuiteTitle = suiteParts.join(" > ");
    var testFullTitle = testSuiteTitle ? testSuiteTitle + " > " + resolvedTestName : resolvedTestName;
    var testRerunBtn = createRerunButton(testSuiteTitle, testFullTitle, "Run only this test again");

    summary.appendChild(label);
    summary.appendChild(duration);
    summary.appendChild(chip);
    summary.appendChild(testRerunBtn);

    var body = document.createElement("div");
    body.className = "test-body";

    var assertions = document.createElement("ul");
    assertions.className = "assert-list";

    body.appendChild(assertions);
    details.appendChild(summary);
    details.appendChild(body);
    suite.children.appendChild(details);
    _pinEnd(wasPinned);

    var suiteChain = getSuiteKeyChain(suiteParts);
    for (var s = 0; s < suiteChain.length; s++) {
        var suiteNode = suiteState[suiteChain[s]];
        if (suiteNode) {
            suiteNode.total++;
            updateSuiteMeta(suiteNode);
        }
    }

    var created: TestNode = {
        key: key,
        suiteKey: suite.key,
        details: details,
        label: label,
        testName: testName || "(unnamed test)",
        suiteParts: suiteParts.slice(0),
        duration: duration,
        chip: chip,
        assertions: assertions,
        assertionCount: 0,
        doneCounted: false,
        status: "running"
    };

    testState[key] = created;
    setLastObservedTestKey(created.key);
    return created;
}

export function setTestStatus(testNode: TestNode, status: any, updateFilter: (node: TestNode) => void) {
    testNode.status = status;
    testNode.chip.className = "status-chip status-" + status;
    testNode.chip.textContent = status;
    if (testNode.label) {
        testNode.label.textContent = getStatusMarker(status) + " " + testNode.testName;
    }
    _setDurationText(testNode.duration, testNode.durationMs);
    _setStatusClass(testNode.details, "test", status);

    var suiteTitle = testNode.suiteParts.join(" > ");
    var fullTitle = suiteTitle ? suiteTitle + " > " + testNode.testName : testNode.testName;
    var isHighlighted = _isExactHighlightTarget(fullTitle);

    // Collapse on pass so a healthy run reads as a short list of closed rows; failed/running
    // tests stay expanded since that's exactly when you want the assertion trail visible
    // without an extra click. Assertions are still recorded into the DOM either way (see
    // flushAssertionDomQueue) -- collapsing here only affects visibility, not data. The test the
    // current run was specifically scoped to (a "run again" click, or a URL hash a page load
    // restored) stays expanded regardless -- the user asked to see this exact one.
    testNode.details.open = status !== "passed" || isHighlighted;

    if (isHighlighted) {
        testNode.details.scrollIntoView({ block: "center" });
    }

    updateFilter(testNode);
}

export function updateSuiteStatus(suiteKey: any) {
    var suite = suiteState[suiteKey];
    if (!suite) {
        return;
    }

    updateSuiteMeta(suite);

    if (suite.done < suite.total) {
        suite.chip.className = "status-chip status-running";
        suite.chip.textContent = "running " + suite.done + "/" + suite.total;
        setSuiteMarker(suite, "running");
        _setStatusClass(suite.details, "suite", "running");
        suite.details.open = true;
        return;
    }

    if (suite.failed > 0) {
        suite.chip.className = "status-chip status-failed";
        suite.chip.textContent = "failed";
        setSuiteMarker(suite, "failed");
        _setStatusClass(suite.details, "suite", "failed");
        suite.details.open = true;
    } else {
        suite.chip.className = "status-chip status-passed";
        suite.chip.textContent = "passed";
        setSuiteMarker(suite, "passed");
        _setStatusClass(suite.details, "suite", "passed");

        var suiteSelectionTitle = suite.parts.join(" > ");
        // The synthetic root pseudo-suite (parts.length === 0, "(default suite)") has no
        // selection title of its own ("" never counts as a real ancestor -- see
        // _isHighlightTargetOrAncestor), so it needs its own check: it's an ancestor exactly
        // when the highlighted test is itself suite-less (no " > " in its full title at all).
        var isTargetOrAncestor = suite.parts.length === 0
            ? !!highlightTestTitle && highlightTestTitle.indexOf(" > ") === -1
            : _isHighlightTargetOrAncestor(suiteSelectionTitle);

        // Collapse on pass, same rationale as setTestStatus above -- expanding a suite
        // (or a test inside it) always re-reveals its already-recorded assertions. Exception:
        // the suite the current run was specifically scoped to, and every ancestor of it (or of
        // the specifically-scoped test), stays expanded regardless -- otherwise a collapsed
        // ancestor would hide the very node the user asked to see.
        suite.details.open = isTargetOrAncestor;

        if (_isExactHighlightTarget(suiteSelectionTitle)) {
            suite.details.scrollIntoView({ block: "center" });
        }
    }

    _setDurationText(suite.duration, suite.durationMs);
}

export function flushAssertionDomQueue(assertCountEl: HTMLElement | null) {
    if (!assertionDomQueue.length) {
        // Still a flush: the frame that was asked for has now run, so the next addAssertion()
        // must be allowed to ask for another. Returning with the flag set -- as a Clear Results
        // between the request and this frame used to cause -- left every later assertion queued
        // and never drawn, until the whole state was reset.
        setAssertionFlushScheduled(false);
        return;
    }

    var wasPinned = _pinStart();

    while (assertionDomQueue.length) {
        var entry = assertionDomQueue.shift();
        if (!entry) {
            continue;
        }

        var node = testState[entry.testKey];
        if (!node) {
            continue;
        }

        var item = document.createElement("li");
        item.className = "assert-item " + (entry.passed ? "assert-pass" : "assert-fail");
        item.textContent = (entry.passed ? "\u2713 " : "\u2717 ") + entry.label + (entry.errorText ? " -> " + entry.errorText : "");
        node.assertions.appendChild(item);
        node.assertionCount++;

        while (node.assertions.childElementCount > MAX_ASSERTIONS_PER_TEST) {
            var firstChild = node.assertions.firstElementChild;
            if (firstChild) {
                node.assertions.removeChild(firstChild);
            }
        }

        incrementAssertionCount();
    }

    _pinEnd(wasPinned);

    if (assertCountEl) {
        var count = assertionCount;
        assertCountEl.textContent = count + " assertion" + (count === 1 ? "" : "s");
    }

    // Allow the next addAssertion() call to schedule another flush -- without this, only the
    // assertions queued before this very first rAF callback fired would ever get rendered;
    // everything queued afterwards would silently accumulate in assertionDomQueue forever.
    setAssertionFlushScheduled(false);
}

export function appendSyntheticAssertion(testNode: TestNode, passed: boolean, label: string, errorText: string, assertCountEl: HTMLElement | null) {
    if (!testNode || !testNode.assertions) {
        return;
    }

    var wasPinned = _pinStart();
    var item = document.createElement("li");
    item.className = "assert-item " + (passed ? "assert-pass" : "assert-fail");
    item.textContent = (passed ? "\u2713 " : "\u2717 ") + (label || "(assertion)") + (errorText ? " -> " + errorText : "");
    testNode.assertions.appendChild(item);
    testNode.assertionCount++;

    while (testNode.assertions.childElementCount > MAX_ASSERTIONS_PER_TEST) {
        var firstChild = testNode.assertions.firstElementChild;
        if (firstChild) {
            testNode.assertions.removeChild(firstChild);
        }
    }

    incrementAssertionCount();
    _pinEnd(wasPinned);

    if (assertCountEl) {
        var count = assertionCount;
        assertCountEl.textContent = count + " assertion" + (count === 1 ? "" : "s");
    }
}

export function clearResults(assertCountEl: HTMLElement | null) {
    if (resultsEl) {
        resultsEl.textContent = "";
    }

    Object.keys(suiteState).forEach(key => delete suiteState[key]);
    Object.keys(testState).forEach(key => delete testState[key]);
    setAssertionCount(0);
    assertionDomQueue.length = 0;
    // The queue is gone, so a frame already requested for it has nothing to do and the flag it
    // guards must not outlive the entries -- see flushAssertionDomQueue.
    setAssertionFlushScheduled(false);

    if (assertCountEl) {
        assertCountEl.textContent = "0 assertions";
    }
}
