/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { ICachedValue } from "@nevware21/ts-utils";
import { IListener, IListenerContext, INotifyResult, INotificationManager, IRemovable, eListenerEvent } from "@nevware21/tripwire";
import { formatSummary } from "./formatters";
import { _printFailureDetails } from "./_printFailureDetails";
import { IReporterConsole, IReporterTestRecord, _buildTestRecord } from "./_reporterRecord";

/**
 * Options for creating a "min" reporter.
 * @since 0.2.0
 */
export interface IMinReporterOptions {
    /**
     * Custom console-like output sink. Defaults to the global `console`.
     */
    console?: IReporterConsole;

    /**
     * Optional hook invoked once when the run starts, before anything is printed -- eg. a
     * Node CLI consumer can wire this to an ANSI screen-clear so each watch-mode re-run starts
     * from a blank terminal. Core itself never touches the terminal directly to stay usable in
     * a browser/worker target.
     */
    clearScreen?: () => void;
}

/**
 * An almost-silent reporter: prints nothing per-test, only a final pass/fail/skip summary and
 * any failure details -- good for watch mode or CI logs where per-test noise isn't wanted.
 * @param options - Optional configuration
 * @returns A reporter object whose `.listener` property should be registered
 * @since 0.2.0
 */
export function createMinReporter(options?: IMinReporterOptions): { listener: IListener } {
    var _console = (options && options.console) || console;
    var _clearScreen = options && options.clearScreen;
    var _failures: IReporterTestRecord[] = [];

    var _listener: IListener = {
        onStart: function(event: number): INotifyResult | void {
            if (event === eListenerEvent.Run) {
                _failures = [];
                if (_clearScreen) {
                    _clearScreen();
                }
            }
        },

        onDone: function(event: number, context: ICachedValue<IListenerContext>): INotifyResult | void {
            var ctx = context.v;

            if (event === eListenerEvent.Test) {
                var record = _buildTestRecord(ctx);
                if (record.status === "failed" || record.status === "aborted") {
                    _failures.push(record);
                }
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
 * Register a min reporter with a notification manager and return a handle to remove it.
 * @param mgr - The notification manager to register with
 * @param options - Optional reporter configuration
 * @returns A removable handle
 * @since 0.2.0
 */
export function addMinReporter(mgr: INotificationManager, options?: IMinReporterOptions): IRemovable {
    var reporter = createMinReporter(options);
    return mgr.addListener(reporter.listener);
}
