/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IListenerContext } from "@nevware21/tripwire";
import { formatFullTitle } from "./formatters";

export type { IReporterConsole } from "./formatters";

/**
 * Normalized per-test result, shared by every reporter that needs more than a live pass/fail
 * symbol (json, tap, list, xunit, doc, markdown all report a final flat/grouped list of every
 * test that ran, not just the failures the console/min reporters accumulate).
 * @internal
 */
export interface IReporterTestRecord {
    title: string;
    fullTitle: string;
    suiteTitle: string;
    status: "passed" | "failed" | "skipped" | "pending" | "aborted";
    duration: number;
    error?: Error;
}

/**
 * Build a normalized {@link IReporterTestRecord} from a Test event's `onDone` context.
 * @internal
 */
export function _buildTestRecord(ctx: IListenerContext): IReporterTestRecord {
    var end = ctx.end;
    var title = (ctx.test && ctx.test.description) || "(unnamed test)";
    var suiteTitle = formatFullTitle(ctx.suite);

    return {
        title: title,
        fullTitle: suiteTitle ? suiteTitle + " " + title : title,
        suiteTitle: suiteTitle,
        status: (end && end.status) || "failed",
        duration: (end && end.duration !== undefined) ? end.duration : 0,
        error: end ? end.error : undefined
    };
}
