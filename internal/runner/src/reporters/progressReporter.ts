/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { ICachedValue } from "@nevware21/ts-utils";
import { IListener, IListenerContext, INotifyResult, INotificationManager, IRemovable, eListenerEvent } from "@nevware21/tripwire";
import { cyan } from "@nevware21/chromacon";
import { formatSummary } from "./formatters";
import { _printFailureDetails } from "./_printFailureDetails";
import { IReporterConsole, IReporterTestRecord, _buildTestRecord } from "./_reporterRecord";

/**
 * Options for creating a progress-bar reporter.
 * @since 0.2.0
 */
export interface IProgressReporterOptions {
    /**
     * Custom console-like output sink. Defaults to the global `console`. Providing `write`
     * (a raw, no-newline write, eg. `process.stdout.write` on a Node CLI) redraws the bar
     * in place via `\r`; without it, each update is logged as its own line instead -- core
     * itself never assumes a real TTY so it stays usable in a browser/worker target.
     */
    console?: IReporterConsole;

    /**
     * Width of the progress bar in characters. Default: 30.
     */
    width?: number;
}

/**
 * A reporter that renders a filling progress bar as tests complete, then a final pass/fail/
 * skip summary and any failure details.
 * @param options - Optional configuration
 * @returns A reporter object whose `.listener` property should be registered
 * @since 0.2.0
 */
export function createProgressReporter(options?: IProgressReporterOptions): { listener: IListener } {
    var _console: IReporterConsole = (options && options.console) || console;
    var _write = _console.write;
    var _width = (options && options.width) || 30;
    var _failures: IReporterTestRecord[] = [];
    var _total = 0;
    var _completed = 0;

    function _renderBar() {
        var pct = _total > 0 ? _completed / _total : 1;
        var filled = Math.round(pct * _width);
        var bar = "[" + cyan(new Array(filled + 1).join("=")) + new Array(_width - filled + 1).join(" ") + "] " + Math.round(pct * 100) + "%";

        if (_write) {
            _write("\r  " + bar);
        } else {
            _console.log("  " + bar);
        }
    }

    var _listener: IListener = {
        onStart: function(event: number, context: ICachedValue<IListenerContext>): INotifyResult | void {
            var ctx = context.v;
            if (event === eListenerEvent.Run) {
                _failures = [];
                _completed = 0;
                _total = (ctx.start && ctx.start.totalTests) || 0;
            }
        },

        onDone: function(event: number, context: ICachedValue<IListenerContext>): INotifyResult | void {
            var ctx = context.v;

            if (event === eListenerEvent.Test) {
                var record = _buildTestRecord(ctx);
                _completed++;
                if (record.status === "failed" || record.status === "aborted") {
                    _failures.push(record);
                }
                _renderBar();
            } else if (event === eListenerEvent.Run) {
                var end = ctx.end;
                if (_write) {
                    _write("\n");
                }
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
 * Register a progress reporter with a notification manager and return a handle to remove it.
 * @param mgr - The notification manager to register with
 * @param options - Optional reporter configuration
 * @returns A removable handle
 * @since 0.2.0
 */
export function addProgressReporter(mgr: INotificationManager, options?: IProgressReporterOptions): IRemovable {
    var reporter = createProgressReporter(options);
    return mgr.addListener(reporter.listener);
}
