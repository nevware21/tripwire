/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { ICachedValue } from "@nevware21/ts-utils";
import { IListener, IListenerContext, INotifyResult, INotificationManager, IRemovable, eListenerEvent } from "@nevware21/tripwire";
import { IReporterConsole, _buildTestRecord } from "./_reporterRecord";

/**
 * Options for creating a JSON-stream reporter.
 * @since 0.2.0
 */
export interface IJsonStreamReporterOptions {
    /**
     * Custom console-like output sink. Defaults to the global `console`.
     */
    console?: IReporterConsole;
}

/**
 * A reporter that emits one `["event", data]` JSON line per test as it happens (`start`,
 * `pass`, `fail`, `end`) instead of buffering the whole run and emitting a single object at
 * the end (see {@link createJsonReporter}) -- lets a consumer process results incrementally
 * as a run is still in progress.
 * @param options - Optional configuration
 * @returns A reporter object whose `.listener` property should be registered
 * @since 0.2.0
 */
export function createJsonStreamReporter(options?: IJsonStreamReporterOptions): { listener: IListener } {
    var _console = (options && options.console) || console;

    var _listener: IListener = {
        onStart: function(event: number, context: ICachedValue<IListenerContext>): INotifyResult | void {
            var ctx = context.v;
            if (event === eListenerEvent.Run) {
                _console.log(JSON.stringify(["start", { total: (ctx.start && ctx.start.totalTests) || 0 }]));
            }
        },

        onDone: function(event: number, context: ICachedValue<IListenerContext>): INotifyResult | void {
            var ctx = context.v;

            if (event === eListenerEvent.Test) {
                var record = _buildTestRecord(ctx);
                var isFailure = record.status === "failed" || record.status === "aborted";
                _console.log(JSON.stringify([isFailure ? "fail" : "pass", {
                    title: record.title,
                    fullTitle: record.fullTitle,
                    status: record.status,
                    duration: record.duration,
                    err: record.error ? (record.error.message || String(record.error)) : undefined
                }]));
            } else if (event === eListenerEvent.Run) {
                var end = ctx.end;
                _console.log(JSON.stringify(["end", {
                    tests: (end && end.total) || 0,
                    passes: (end && end.passed) || 0,
                    failures: (end && end.failed) || 0,
                    pending: ((end && end.skipped) || 0) + ((end && end.pending) || 0),
                    duration: (end && end.duration) || 0
                }]));
            }
        }
    };

    return {
        listener: _listener
    };
}

/**
 * Register a JSON-stream reporter with a notification manager and return a handle to remove it.
 * @param mgr - The notification manager to register with
 * @param options - Optional reporter configuration
 * @returns A removable handle
 * @since 0.2.0
 */
export function addJsonStreamReporter(mgr: INotificationManager, options?: IJsonStreamReporterOptions): IRemovable {
    var reporter = createJsonStreamReporter(options);
    return mgr.addListener(reporter.listener);
}
