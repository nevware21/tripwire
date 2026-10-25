/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { ICachedValue } from "@nevware21/ts-utils";
import { IListener, IListenerContext, INotifyResult, INotificationManager, IRemovable, eListenerEvent } from "@nevware21/tripwire";
import { IReporterConsole, IReporterTestRecord, _buildTestRecord } from "./_reporterRecord";

/**
 * Options for creating a JSON reporter.
 * @since 0.2.0
 */
export interface IJsonReporterOptions {
    /**
     * Custom console-like output sink. Defaults to the global `console`.
     */
    console?: IReporterConsole;

    /**
     * Number of spaces to indent the emitted JSON with. Default: 2. Pass 0 for a single
     * unindented line (eg. for a log-aggregator that expects one JSON object per line).
     */
    indent?: number;
}

function _toJsonTest(record: IReporterTestRecord) {
    return {
        title: record.title,
        fullTitle: record.fullTitle,
        status: record.status,
        duration: record.duration,
        err: record.error ? { message: record.error.message || String(record.error), stack: record.error.stack } : undefined
    };
}

/**
 * A reporter that accumulates every test result as the run progresses and, once the run
 * completes, emits a single JSON object (`stats` + `tests`/`passes`/`failures`/`pending`) --
 * for feeding custom tooling/dashboards rather than a human reading the console.
 * @param options - Optional configuration
 * @returns A reporter object whose `.listener` property should be registered
 * @since 0.2.0
 */
export function createJsonReporter(options?: IJsonReporterOptions): { listener: IListener } {
    var _console = (options && options.console) || console;
    var _indent = options && options.indent !== undefined ? options.indent : 2;
    var _tests: IReporterTestRecord[] = [];
    var _start = 0;

    var _listener: IListener = {
        onStart: function(event: number): INotifyResult | void {
            if (event === eListenerEvent.Run) {
                _tests = [];
                _start = Date.now();
            }
        },

        onDone: function(event: number, context: ICachedValue<IListenerContext>): INotifyResult | void {
            var ctx = context.v;

            if (event === eListenerEvent.Test) {
                _tests.push(_buildTestRecord(ctx));
            } else if (event === eListenerEvent.Run) {
                var end = ctx.end;
                var passes = _tests.filter(function(t) {
                    return t.status === "passed";
                });
                var failures = _tests.filter(function(t) {
                    return t.status === "failed" || t.status === "aborted";
                });
                var pending = _tests.filter(function(t) {
                    return t.status === "skipped" || t.status === "pending";
                });

                var report = {
                    stats: {
                        tests: (end && end.total) || _tests.length,
                        passes: (end && end.passed) || passes.length,
                        failures: (end && end.failed) || failures.length,
                        pending: ((end && end.skipped) || 0) + ((end && end.pending) || 0),
                        start: _start,
                        end: Date.now(),
                        duration: (end && end.duration) || 0
                    },
                    tests: _tests.map(_toJsonTest),
                    passes: passes.map(_toJsonTest),
                    failures: failures.map(_toJsonTest),
                    pending: pending.map(_toJsonTest)
                };

                _console.log(JSON.stringify(report, null, _indent));
            }
        }
    };

    return {
        listener: _listener
    };
}

/**
 * Register a JSON reporter with a notification manager and return a handle to remove it.
 * @param mgr - The notification manager to register with
 * @param options - Optional reporter configuration
 * @returns A removable handle
 * @since 0.2.0
 */
export function addJsonReporter(mgr: INotificationManager, options?: IJsonReporterOptions): IRemovable {
    var reporter = createJsonReporter(options);
    return mgr.addListener(reporter.listener);
}
