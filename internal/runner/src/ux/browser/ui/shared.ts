/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

// Shared constants
export const MAX_LOG_LINES = 2500;
export const MAX_ASSERTIONS_PER_TEST = 500;

// Shared types and interfaces
export interface LogEntry {
    level: string;
    message: string;
}

export interface SuiteNode {
    key: string;
    parts: string[];
    details: HTMLDetailsElement;
    marker: HTMLElement;
    meta: HTMLElement;
    duration: HTMLElement;
    chip: HTMLElement;
    children: HTMLElement;
    total: number;
    done: number;
    failed: number;
    skipped: number;
    childSuiteCount: number;
    durationMs?: number;
}

export interface TestNode {
    key: string;
    suiteKey: string;
    details: HTMLDetailsElement;
    label: HTMLElement;
    marker: HTMLElement;
    testName: string;
    suiteParts: string[];
    duration: HTMLElement;
    chip: HTMLElement;
    assertions: HTMLElement;
    assertionCount: number;
    doneCounted: boolean;
    status: string;
    durationMs?: number;
}

export interface AssertionEntry {
    testKey: string;
    passed: boolean;
    label: string;
    errorText: string;
    expected?: string;
    actual?: string;
}

export interface Selection {
    suiteTitle: string;
    testTitle: string;
}
