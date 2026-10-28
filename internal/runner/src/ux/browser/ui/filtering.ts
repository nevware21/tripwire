/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

/**
 * The interactive UI's "failed only" view filter -- purely a DOM show/hide pass over results
 * that have already been produced.
 *
 * The `--grep`/`--invert` and suite/test-selection filters that decide what actually *runs*
 * used to be reimplemented here too; they now live in `../../../shared/filters.ts`, shared
 * with the node and worker targets.
 */

import { failedOnlyToggle, filterNoteEl } from "./dom";
import { testState, suiteState, runCounts } from "./state";
import { _setNodeHidden, formatCount } from "./utils";
import { getSuiteKeyChain } from "../../../shared/suiteNames";

export function _isFailedOnlyEnabled() {
    return !!(failedOnlyToggle && failedOnlyToggle.checked);
}

/**
 * Says how many finished tests "Failed only" is hiding, so a nearly empty results panel reads as
 * filtered rather than broken. It reads the run's counts rather than walking the results: with the
 * filter on, every finished test that did not fail is hidden.
 */
export function updateFilterNote() {
    if (!filterNoteEl) {
        return;
    }

    var hidden = _isFailedOnlyEnabled() ? runCounts.passed + runCounts.skipped : 0;
    if (hidden > 0) {
        var kind = runCounts.skipped ? ["passed or skipped test", "passed or skipped tests"] : ["passing test", "passing tests"];
        filterNoteEl.textContent = formatCount(hidden, kind[0], kind[1]) + " hidden by Failed only";
        filterNoteEl.hidden = false;
    } else {
        filterNoteEl.textContent = "";
        filterNoteEl.hidden = true;
    }
}

export function _shouldShowTestNode(node: any) {
    if (!_isFailedOnlyEnabled()) {
        return true;
    }

    return node && (node.status === "failed" || node.status === "running");
}

/**
 * A suite is visible exactly when something inside it still is. Must be applied innermost-first:
 * whether an outer suite has anything left to show depends on the answer for the inner ones.
 */
function _refreshSuiteVisibility(suiteNode: any) {
    if (!suiteNode || !suiteNode.details || !suiteNode.children) {
        return;
    }

    var hasVisibleTests = suiteNode.children.querySelector(".test-node:not([data-filter-hidden='1'])") != null;
    var hasVisibleSuites = suiteNode.children.querySelector(".suite-node:not([data-filter-hidden='1'])") != null;

    _setNodeHidden(suiteNode.details, !(hasVisibleTests || hasVisibleSuites));
}

/**
 * Re-applies the filter to every node. This is the toggle's handler -- flipping the checkbox is
 * the one thing that really can change the answer for all of them at once.
 *
 * It is deliberately *not* what a finishing test calls: see {@link updateFailedOnlyForTest}.
 */
export function applyFailedOnlyFilter() {
    var failedOnly = _isFailedOnlyEnabled();
    var testKeys = Object.keys(testState);
    for (var t = 0; t < testKeys.length; t++) {
        var testNode = testState[testKeys[t]];
        if (!testNode || !testNode.details) {
            continue;
        }

        _setNodeHidden(testNode.details, !_shouldShowTestNode(testNode));
    }

    var suiteKeys = Object.keys(suiteState);
    suiteKeys.sort(function(a, b) {
        var aParts = suiteState[a] && suiteState[a].parts ? suiteState[a].parts.length : 0;
        var bParts = suiteState[b] && suiteState[b].parts ? suiteState[b].parts.length : 0;
        return bParts - aParts;
    });

    for (var s = 0; s < suiteKeys.length; s++) {
        var suiteNode = suiteState[suiteKeys[s]];
        if (!suiteNode || !suiteNode.details) {
            continue;
        }

        if (!failedOnly) {
            _setNodeHidden(suiteNode.details, false);
            continue;
        }

        _refreshSuiteVisibility(suiteNode);
    }

    updateFilterNote();
}

/**
 * Re-applies the filter to one test and the suites above it, which is all a single test changing
 * status can possibly affect -- `_shouldShowTestNode` reads nothing but that test's own status,
 * and a suite's visibility depends only on its own descendants.
 *
 * This exists because the full sweep used to run on *every* status change, twice per test. On a
 * suite of a few dozen that is unnoticeable; on this project's own ~2700-test suite it is
 * quadratic -- roughly 16 million `style.display` writes over a run -- and it blocked the main
 * thread for seconds at a time. Tests time their own bodies with `setTimeout`, so a blocked main
 * thread does not merely make the page slow: it delays the timers the tests themselves are
 * waiting on, and tests that pass everywhere else start failing on their 2000ms budget in the
 * browser target. A results view must not be able to change the result.
 */
export function updateFailedOnlyForTest(testNode: any) {
    if (!_isFailedOnlyEnabled()) {
        // Nothing is hidden while the filter is off: turning it off unhides everything and
        // nothing hides anything again until it is turned back on, so there is nothing to do.
        return;
    }

    if (!testNode || !testNode.details) {
        return;
    }

    _setNodeHidden(testNode.details, !_shouldShowTestNode(testNode));

    var chain = getSuiteKeyChain(testNode.suiteParts || []);
    for (var lp = chain.length - 1; lp >= 0; lp--) {
        _refreshSuiteVisibility(suiteState[chain[lp]]);
    }
}
