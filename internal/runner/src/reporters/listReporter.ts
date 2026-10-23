/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { ICachedValue } from "@nevware21/ts-utils";
import { IListener, IListenerContext, INotifyResult, INotificationManager, IRemovable, eListenerEvent } from "@nevware21/tripwire";
import { gray, red, yellow } from "@nevware21/chromacon";
import { formatDuration, formatStatusSymbol, formatSummary } from "./formatters";
import { _printFailureDetails } from "./_printFailureDetails";
import { IReporterConsole, IReporterTestRecord, _buildTestRecord } from "./_reporterRecord";

/**
 * Options for creating a list reporter.
 * @since 0.2.0
 */
export interface IListReporterOptions {
    /**
     * Custom console-like output sink. Defaults to the global `console`.
     */
    console?: IReporterConsole;
}

/**
 * A reporter that prints one line per test, using its full "Suite > nested suite > test"
 * title instead of the nested/indented suite tree {@link createConsoleReporter} prints -- a
 * flat, greppable listing.
 * @param options - Optional configuration
 * @returns A reporter object whose `.listener` property should be registered
 * @since 0.2.0
 */
export function createListReporter(options?: IListReporterOptions): { listener: IListener } {
    var _console = (options && options.console) || console;
    var _failures: IReporterTestRecord[] = [];

    var _listener: IListener = {
        onStart: function(event: number): INotifyResult | void {
            if (event === eListenerEvent.Run) {
                _failures = [];
                _console.log("");
            }
        },

        onDone: function(event: number, context: ICachedValue<IListenerContext>): INotifyResult | void {
            var ctx = context.v;

            if (event === eListenerEvent.Test) {
                var record = _buildTestRecord(ctx);
                var symbol = formatStatusSymbol(record.status);
                var line = "  " + symbol + " " + record.fullTitle;

                if (record.status === "passed" && record.duration > 0) {
                    line += " " + gray(formatDuration(record.duration));
                } else if (record.status === "failed" || record.status === "aborted") {
                    if (record.duration > 0) {
                        line += " " + red(formatDuration(record.duration));
                    }
                    _failures.push(record);
                } else if (record.status === "skipped" || record.status === "pending") {
                    line += " " + yellow("(skipped)");
                }

                _console.log(line);
            } else if (event === eListenerEvent.Run) {
                var end = ctx.end;
                _console.log("");
                _console.log("  " + formatSummary(
                    (end && end.passed) || 0, (end && end.failed) || 0, (end && end.skipped) || 0, (end && end.pending) || 0,
                    (end && end.duration) || 0
                ));
                _console.log("");
                _printFailureDetails(_console, _failures);
            }
        }
    };

    return {
        listener: _listener
    };
}

/**
 * Register a list reporter with a notification manager and return a handle to remove it.
 * @param mgr - The notification manager to register with
 * @param options - Optional reporter configuration
 * @returns A removable handle
 * @since 0.2.0
 */
export function addListReporter(mgr: INotificationManager, options?: IListReporterOptions): IRemovable {
    var reporter = createListReporter(options);
    return mgr.addListener(reporter.listener);
}
