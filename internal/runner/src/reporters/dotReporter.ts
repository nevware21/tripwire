/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { ICachedValue } from "@nevware21/ts-utils";
import { IListener, IListenerContext, INotifyResult, INotificationManager, IRemovable, eListenerEvent } from "@nevware21/tripwire";
import { bold, green, red, yellow } from "@nevware21/chromacon";
import { formatSummary } from "./formatters";
import { _printFailureDetails } from "./_printFailureDetails";
import { IReporterConsole, IReporterTestRecord, _buildTestRecord } from "./_reporterRecord";

/**
 * Options for creating a dot-matrix reporter.
 * @since 0.2.0
 */
export interface IDotReporterOptions {
    /**
     * Custom console-like output sink. Defaults to the global `console`.
     */
    console?: IReporterConsole;

    /**
     * Number of dots to print per row before wrapping. Default: 50.
     */
    width?: number;
}

/**
 * A minimal reporter that prints a single colored character per completed test (a `.` for a
 * pass, `!` for a failure, `,` for a skip/pending), wrapping to a new row every `width`
 * characters, then a final pass/fail/skip summary -- good for large suites where per-test
 * lines (see {@link createConsoleReporter}) would be too noisy.
 * @param options - Optional configuration
 * @returns A reporter object whose `.listener` property should be registered
 * @since 0.2.0
 */
export function createDotReporter(options?: IDotReporterOptions): { listener: IListener } {
    var _console = (options && options.console) || console;
    var _width = (options && options.width) || 50;
    var _failures: IReporterTestRecord[] = [];
    var _row = "";

    function _flushRow() {
        if (_row) {
            _console.log(_row);
            _row = "";
        }
    }

    var _listener: IListener = {
        onStart: function(event) {
            if (event === eListenerEvent.Run) {
                _failures = [];
                _row = "";
            }
        },

        onDone: function(event: number, context: ICachedValue<IListenerContext>): INotifyResult | void {
            var ctx = context.v;

            if (event === eListenerEvent.Test) {
                var record = _buildTestRecord(ctx);
                var symbol = record.status === "passed" ? green(".")
                    : (record.status === "failed" || record.status === "aborted") ? bold(red("!"))
                        : yellow(",");

                _row += symbol;
                if (record.status === "failed" || record.status === "aborted") {
                    _failures.push(record);
                }

                if (_row.length >= _width) {
                    _flushRow();
                }
            } else if (event === eListenerEvent.Run) {
                var end = ctx.end;
                _flushRow();
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
 * Register a dot reporter with a notification manager and return a handle to remove it.
 * @param mgr - The notification manager to register with
 * @param options - Optional reporter configuration
 * @returns A removable handle
 * @since 0.2.0
 */
export function addDotReporter(mgr: INotificationManager, options?: IDotReporterOptions): IRemovable {
    var reporter = createDotReporter(options);
    return mgr.addListener(reporter.listener);
}
