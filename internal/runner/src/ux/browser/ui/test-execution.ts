/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { testState, suiteState, setCurrentExecutingTestKey, setLastObservedTestKey, assertionDomQueue, runCounts } from "./state";
import { ensureTestNode, ensureSuiteNode, setTestStatus, updateSuiteStatus, appendSyntheticAssertion, updateRunSummary } from "./ui-rendering";
import { getSuiteKeyChain } from "../../../shared/suiteNames";
import { assertCountEl } from "./dom";
import { TestNode } from "./shared";

export function findActiveTestKey() {
    var keys = Object.keys(testState);
    for (var idx = keys.length - 1; idx >= 0; idx--) {
        var key = keys[idx];
        if (testState[key] && testState[key].status === "running") {
            return key;
        }
    }

    return "";
}

export function _handleSuiteStart(suiteParts: any) {
    ensureSuiteNode(suiteParts || []);
}

export function _handleSuiteDone(suiteParts: any, durationMs: any) {
    var suiteNode = ensureSuiteNode(suiteParts || []);
    suiteNode.durationMs = durationMs || 0;
    updateSuiteStatus(suiteNode.key);
}

export function _handleTestStart(suiteParts: any, testName: any, updateFilter: (node: TestNode) => void) {
    var node = ensureTestNode(suiteParts || [], testName || "(unnamed test)");
    setCurrentExecutingTestKey(node.key);
    setLastObservedTestKey(node.key);
    setTestStatus(node, "running", updateFilter);
    return node;
}

function _hasQueuedAssertion(testKey: string): boolean {
    for (var qi = 0; qi < assertionDomQueue.length; qi++) {
        if (assertionDomQueue[qi] && assertionDomQueue[qi].testKey === testKey) {
            return true;
        }
    }

    return false;
}

export function _handleTestDone(suiteParts: any, testName: any, endStatus: any, durationMs: any, endErrorText: any, updateFilter: (node: TestNode) => void) {
    var node = ensureTestNode(suiteParts || [], testName || "(unnamed test)");
    var statusText = endStatus ? String(endStatus) : "pending";
    // A skipped or pending test is shown as skipped: drawing it as passed claimed it had run
    var status = statusText === "passed" ? "passed" : ((statusText === "skipped" || statusText === "pending") ? "skipped" : "failed");
    var suiteNode = suiteState[node.suiteKey];

    setLastObservedTestKey(node.key);
    node.durationMs = durationMs || 0;
    setTestStatus(node, status, updateFilter);

    // Only a test that reported no assertion at all gets a synthetic one explaining the failure.
    // Assertions render on the next animation frame, so the one that failed this test is usually
    // still in the queue here -- counting only the rendered ones drew every failure twice: the
    // real assertion and a "Test failed" row beneath it.
    if (status === "failed" && node.assertionCount === 0 && !_hasQueuedAssertion(node.key)) {
        var errText = endErrorText ? String(endErrorText) : "";
        var label = /timeout/i.test(errText) ? "Test timed out" : "Test failed";
        appendSyntheticAssertion(node, false, label, errText, assertCountEl);
    }

    if (!node.doneCounted && suiteNode) {
        node.doneCounted = true;
        runCounts[status as "passed" | "failed" | "skipped"]++;

        var suiteChain = getSuiteKeyChain(node.suiteParts || []);
        for (var sc = 0; sc < suiteChain.length; sc++) {
            var aggSuite = suiteState[suiteChain[sc]];
            if (aggSuite) {
                aggSuite.done++;
                if (status === "failed") {
                    aggSuite.failed++;
                } else if (status === "skipped") {
                    aggSuite.skipped = (aggSuite.skipped || 0) + 1;
                }
                updateSuiteStatus(aggSuite.key);
            }
        }

        updateRunSummary();
    }

    setCurrentExecutingTestKey("");
    return node;
}
