/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { bold, gray, red } from "@nevware21/chromacon";
import { IReporterTestRecord } from "./_reporterRecord";

/**
 * Prints a numbered "Failures:" block (title, message, abbreviated stack) for every failed/
 * aborted test record -- the same failure-detail format {@link createConsoleReporter} prints
 * inline, factored out so every other reporter that also ends with a failure list (dot, min,
 * list, ...) renders it identically.
 * @internal
 */
export function _printFailureDetails(
    console: { log(msg: string): void; error(msg: string): void },
    failures: IReporterTestRecord[]
): void {
    if (!failures.length) {
        return;
    }

    console.log(red(bold("  Failures:")));
    console.log("");

    for (var i = 0; i < failures.length; i++) {
        var failure = failures[i];
        console.error("  " + red((i + 1) + ") " + failure.fullTitle));
        if (failure.error) {
            var errMsg = failure.error.message || String(failure.error);
            var stack = failure.error.stack;
            console.error("     " + gray(errMsg));
            if (stack) {
                // Print abbreviated stack (skip the first line which duplicates message).
                var lines = stack.split("\n");
                for (var j = 1; j < lines.length && j <= 5; j++) {
                    console.error("     " + gray(lines[j]));
                }
            }
        }
        console.log("");
    }
}
