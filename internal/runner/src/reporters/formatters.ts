/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { gray, green, red, yellow } from "@nevware21/chromacon";
import { ITestSuite } from "@nevware21/tripwire";
import { getSuitePartsFromNode } from "../shared/suiteNames";

/**
 * Console-like output sink every reporter in this package accepts as `options.console`.
 * `write`, when supplied, is a raw no-newline write (eg. `process.stdout.write` on a Node
 * CLI) that a handful of reporters (progress/landing/nyan) use to redraw a single line in
 * place via `\r`; without it, those reporters fall back to logging each update as its own
 * line. Shared here so every reporter's options interface agrees on one `console` shape and
 * can be merged into a single options bag by {@link createReporter}.
 * @since 0.2.0
 */
export interface IReporterConsole {
    log(msg: string): void;
    error(msg: string): void;
    write?(msg: string): void;
}

/**
 * Format a duration in milliseconds into a human-readable string.
 * @param ms - Duration in milliseconds
 * @since 0.2.0
 */
export function formatDuration(ms: number): string {
    if (ms < 1000) {
        return ms + "ms";
    }
    return (ms / 1000).toFixed(2) + "s";
}

/**
 * Create an indentation string for the given nesting depth.
 * @param depth - The nesting depth (0 = root)
 * @param spaces - Spaces per indent level (default: 2)
 * @since 0.2.0
 */
export function indent(depth: number, spaces?: number): string {
    var perLevel = spaces !== undefined ? spaces : 2;
    var result = "";
    for (var i = 0; i < depth * perLevel; i++) {
        result += " ";
    }
    return result;
}

/**
 * Format a pass/fail/skip symbol.
 * @param status - The test status
 * @since 0.2.0
 */
export function formatStatusSymbol(status: "passed" | "failed" | "skipped" | "pending" | "aborted"): string {
    if (status === "passed") {
        return green("\u2713"); // ✓
    }
    if (status === "failed" || status === "aborted") {
        return red("\u2717"); // ✗
    }
    return yellow("-"); // skipped / pending
}

/**
 * Build the full "Suite nested suite test" title for a test/suite by walking the suite's
 * `parent` chain up to the root, matching the nesting a reporter would show if it printed every
 * ancestor suite's title. Suite events pass `undefined` for `testDescription` to get just the
 * suite's own full path.
 *
 * The root suite's own name is not part of the title. The walk used to stop at the first
 * *description-less* ancestor, but the root is created as `_createSuite("root")` -- so it has a
 * description, and every title built here began "root ": TAP printed `ok 1 - root my suite my
 * test` and xunit emitted `classname="root my suite"`. Delegating to the same
 * `getSuitePartsFromNode` the `--grep` filters use (see `shared/suiteNames.ts`) both drops it and
 * keeps the title a reporter prints identical to the one a pattern is matched against.
 * @param suite - The (innermost) suite the test/suite belongs to, or the suite itself for a
 * Suite event.
 * @param testDescription - The test's own description to append, if any (Test events only).
 * @since 0.2.0
 */
export function formatFullTitle(suite: ITestSuite | null | undefined, testDescription?: string): string {
    var parts = getSuitePartsFromNode(suite);

    if (testDescription) {
        parts.push(testDescription);
    }

    return parts.join(" ");
}

/**
 * Format a summary line showing pass/fail/skip/pending counts.
 *
 * `skipped` and `pending` are reported as separate counts, in the same order the CLI's own
 * "Run summary: total=... skipped=... pending=..." line uses. They were once summed into a
 * single "N pending", which made the reporter line and the CLI line -- printed directly beneath
 * it -- disagree on every run that skipped anything. The distinction is the one mocha draws and
 * the one tripwire's own summary already tracks: `skipped` is a test excluded from the run
 * (`it.skip`, a skipping hook), `pending` is an `it()` declared with no body.
 * @param passed - Number of tests that passed
 * @param failed - Number of tests that failed
 * @param skipped - Number of tests that were skipped
 * @param pending - Number of tests declared without an implementation
 * @param duration - Total duration in milliseconds
 * @since 0.2.0
 */
export function formatSummary(passed: number, failed: number, skipped: number, pending: number, duration: number): string {
    var parts: string[] = [];

    parts.push(green(passed + " passing"));
    if (failed > 0) {
        parts.push(red(failed + " failing"));
    }
    if (skipped > 0) {
        parts.push(yellow(skipped + " skipped"));
    }
    if (pending > 0) {
        parts.push(yellow(pending + " pending"));
    }
    if (duration > 0) {
        parts.push(gray("(" + formatDuration(duration) + ")"));
    }

    return parts.join("  ");
}
