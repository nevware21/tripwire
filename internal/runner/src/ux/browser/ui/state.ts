/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { SuiteNode, TestNode } from "./shared";

// Global state
export let payload: any = null;
export let discovery: any = null;
export let running = false;
export let completed = false;
export let lastResult: any = null;
export let stopRequested = false;
export let activeWorker: Worker | null = null;
export let consoleBridgeInstalled = false;

export const logDomQueue: any[] = [];
export const logSendQueue: any[] = [];
export const assertionDomQueue: any[] = [];
export let assertionFlushScheduled = false;
export let logFlushScheduled = false;
export let sendFlushScheduled = false;

export let assertionCount = 0;
export const suiteState: { [key: string]: SuiteNode } = {};
export const testState: { [key: string]: TestNode } = {};
export let currentExecutingTestKey = "";
export let lastObservedTestKey = "";

// How many of the drawn tests have finished, by outcome -- kept as each one finishes, so the run
// summary never has to recount every test (see updateRunSummary in ui-rendering.ts).
export const runCounts = { passed: 0, failed: 0, skipped: 0 };

export function resetRunCounts() {
    runCounts.passed = 0;
    runCounts.failed = 0;
    runCounts.skipped = 0;
}

// User preference, not per-run state -- deliberately left out of clearAllState() below so a
// frame/worker reload (including one triggered by this same setting) doesn't reset it.
export let autoReloadEnabled = true;

// The suite/test title (if any) the current run was specifically scoped to -- set once at the
// start of every _runSelection call (client.ts) from whatever selection drove it (URL hash on
// initial load, a "run again" click, or the dropdowns + Run button). ui-rendering.ts checks
// these to keep the matching node (and its ancestor suite chain, so it stays reachable) expanded
// instead of collapsing it like every other passed node -- see setTestStatus/updateSuiteStatus.
export let highlightSuiteTitle = "";
export let highlightTestTitle = "";

// Setters for state
export function setState(newState: any) {
    Object.assign(module.exports, newState);
}

export function setPayload(p: any) {
    payload = p;
}

export function setDiscovery(d: any) {
    discovery = d;
}

export function setRunning(value: boolean) {
    running = value;
}

export function setCompleted(value: boolean) {
    completed = value;
}

export function setLastResult(result: any) {
    lastResult = result;
}

export function setStopRequested(value: boolean) {
    stopRequested = value;
}

export function setActiveWorker(worker: Worker | null) {
    activeWorker = worker;
}

export function setConsoleBridgeInstalled(value: boolean) {
    consoleBridgeInstalled = value;
}

export function setAssertionFlushScheduled(value: boolean) {
    assertionFlushScheduled = value;
}

export function setLogFlushScheduled(value: boolean) {
    logFlushScheduled = value;
}

export function setSendFlushScheduled(value: boolean) {
    sendFlushScheduled = value;
}

export function incrementAssertionCount() {
    assertionCount++;
}

export function setAssertionCount(count: number) {
    assertionCount = count;
}

export function setCurrentExecutingTestKey(key: string) {
    currentExecutingTestKey = key;
}

export function setLastObservedTestKey(key: string) {
    lastObservedTestKey = key;
}

export function setAutoReloadEnabled(value: boolean) {
    autoReloadEnabled = value;
}

export function setHighlightSelection(suiteTitle: string, testTitle: string) {
    highlightSuiteTitle = suiteTitle || "";
    highlightTestTitle = testTitle || "";
}

export function clearAllState() {
    payload = null;
    discovery = null;
    running = false;
    completed = false;
    lastResult = null;
    stopRequested = false;
    activeWorker = null;
    consoleBridgeInstalled = false;
    logDomQueue.length = 0;
    logSendQueue.length = 0;
    assertionDomQueue.length = 0;
    assertionFlushScheduled = false;
    logFlushScheduled = false;
    sendFlushScheduled = false;
    assertionCount = 0;
    Object.keys(suiteState).forEach(key => delete suiteState[key]);
    Object.keys(testState).forEach(key => delete testState[key]);
    resetRunCounts();
    currentExecutingTestKey = "";
    lastObservedTestKey = "";
    highlightSuiteTitle = "";
    highlightTestTitle = "";
}
