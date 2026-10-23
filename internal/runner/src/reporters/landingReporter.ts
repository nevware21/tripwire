/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { ICachedValue } from "@nevware21/ts-utils";
import { IListener, IListenerContext, INotifyResult, INotificationManager, IRemovable, eListenerEvent } from "@nevware21/tripwire";
import { brightCyan, gray, red } from "@nevware21/chromacon";
import { formatSummary } from "./formatters";
import { _printFailureDetails } from "./_printFailureDetails";
import { IReporterConsole, IReporterTestRecord, _buildTestRecord } from "./_reporterRecord";

/**
 * Options for creating a "landing strip" reporter.
 * @since 0.2.0
 */
export interface ILandingReporterOptions {
    /**
     * Custom console-like output sink. Defaults to the global `console`. Providing `write`
     * (a raw, no-newline write) redraws the strip in place via `\r`; without it, each update
     * is logged as its own line instead.
     */
    console?: IReporterConsole;

    /**
     * Length of the landing strip in characters. Default: 40.
     */
    width?: number;
}

/**
 * A novelty reporter that flies a little plane down a runway as tests complete, crashing (an
 * "x") if any test fails along the way -- purely cosmetic, functionally equivalent to
 * {@link createProgressReporter}.
 * @param options - Optional configuration
 * @returns A reporter object whose `.listener` property should be registered
 * @since 0.2.0
 */
export function createLandingReporter(options?: ILandingReporterOptions): { listener: IListener } {
    var _console: IReporterConsole = (options && options.console) || console;
    var _write = _console.write;
    var _width = (options && options.width) || 40;
    var _failures: IReporterTestRecord[] = [];
    var _total = 0;
    var _completed = 0;
    var _crashed = false;

    function _renderStrip() {
        var pct = _total > 0 ? _completed / _total : 1;
        var pos = Math.min(_width, Math.round(pct * _width));
        var plane = _crashed ? red("x") : brightCyan("✈");
        var strip = gray(new Array(pos + 1).join("-")) + plane + gray(new Array(_width - pos + 1).join("-"));

        if (_write) {
            _write("\r  " + strip);
        } else {
            _console.log("  " + strip);
        }
    }

    var _listener: IListener = {
        onStart: function(event: number, context: ICachedValue<IListenerContext>): INotifyResult | void {
            var ctx = context.v;
            if (event === eListenerEvent.Run) {
                _failures = [];
                _completed = 0;
                _crashed = false;
                _total = (ctx.start && ctx.start.totalTests) || 0;
            }
        },

        onDone: function(event: number, context: ICachedValue<IListenerContext>): INotifyResult | void {
            var ctx = context.v;

            if (event === eListenerEvent.Test) {
                var record = _buildTestRecord(ctx);
                _completed++;
                if (record.status === "failed" || record.status === "aborted") {
                    _crashed = true;
                    _failures.push(record);
                }
                _renderStrip();
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
 * Register a landing reporter with a notification manager and return a handle to remove it.
 * @param mgr - The notification manager to register with
 * @param options - Optional reporter configuration
 * @returns A removable handle
 * @since 0.2.0
 */
export function addLandingReporter(mgr: INotificationManager, options?: ILandingReporterOptions): IRemovable {
    var reporter = createLandingReporter(options);
    return mgr.addListener(reporter.listener);
}
