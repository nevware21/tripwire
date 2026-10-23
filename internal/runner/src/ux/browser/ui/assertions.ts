/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assertionDomQueue, setAssertionFlushScheduled, assertionFlushScheduled, currentExecutingTestKey, lastObservedTestKey, setLastObservedTestKey } from "./state";
import { flushAssertionDomQueue } from "./ui-rendering";
import { queueLog } from "./logging";
import { findActiveTestKey } from "./test-execution";
import { ensureTestNode } from "./ui-rendering";
import { assertCountEl } from "./dom";
import { safeToString } from "./utils";
import { createAssertionLabel } from "../../../shared/suiteNames";

export function addAssertion(testKey: any, passed: any, label: any, errorText: any) {
    assertionDomQueue.push({
        testKey: testKey,
        passed: !!passed,
        label: label || "(assertion)",
        errorText: errorText || ""
    });

    if (!assertionFlushScheduled) {
        setAssertionFlushScheduled(true);
        requestAnimationFrame(() => flushAssertionDomQueue(assertCountEl));
    }
}

export function _handleAssertionEvent(payload: any) {
    if (!payload) {
        return;
    }

    var testKey = "";
    if (payload.suiteParts && payload.testName) {
        var node = ensureTestNode(payload.suiteParts, payload.testName);
        testKey = node.key;
        setLastObservedTestKey(node.key);
    }

    if (!testKey) {
        testKey = currentExecutingTestKey || findActiveTestKey() || lastObservedTestKey;
    }

    if (!testKey) {
        queueLog("warn", "Assertion received without active test context");
        return;
    }

    addAssertion(testKey, !!payload.passed, payload.label || "(assertion)", payload.errorText || "");
}

export function handleAssertion(contextLike: any) {
    var actx = contextLike && contextLike.v ? contextLike.v : contextLike;
    var errorText = (actx && actx.error) ? safeToString(actx.error && actx.error.message ? actx.error.message : actx.error) : "";
    _handleAssertionEvent({
        passed: !!(actx && actx.passed),
        label: createAssertionLabel(actx),
        errorText: errorText
    });
}
