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
 * Options for creating a TAP (Test Anything Protocol) reporter.
 * @since 0.2.0
 */
export interface ITapReporterOptions {
    /**
     * Custom console-like output sink. Defaults to the global `console`.
     */
    console?: IReporterConsole;
}

/**
 * A reporter that prints [TAP](https://testanything.org/) output -- machine-parseable by CI
 * tooling (`prove`, `tap-mocha-reporter`, etc) instead of humans.
 * @param options - Optional configuration
 * @returns A reporter object whose `.listener` property should be registered
 * @since 0.2.0
 */
/**
 * TAP gives `#` a meaning inside a test line -- everything after it is a directive (`# SKIP`,
 * `# TODO`) plus its comment -- so a description that happens to contain one silently truncates
 * the description and, on the SKIP line below, appends a second directive that conflicts with
 * the one this reporter emitted. TAP's own escape for that is `\#`, which in turn needs `\` to
 * be escaped first so an existing backslash can't form one by accident.
 */
function _escapeDescription(text: string): string {
    return text.replace(/\\/g, "\\\\").replace(/#/g, "\\#");
}

export function createTapReporter(options?: ITapReporterOptions): { listener: IListener } {
    var _console = (options && options.console) || console;
    var _n = 0;

    var _listener: IListener = {
        onStart: function(event: number, context: ICachedValue<IListenerContext>): INotifyResult | void {
            var ctx = context.v;
            if (event === eListenerEvent.Run) {
                _n = 0;
                var total = (ctx.start && ctx.start.totalTests) || 0;
                _console.log("TAP version 13");
                _console.log("1.." + total);
            }
        },

        onDone: function(event: number, context: ICachedValue<IListenerContext>): INotifyResult | void {
            var ctx = context.v;

            if (event === eListenerEvent.Test) {
                var record = _buildTestRecord(ctx);
                var title = _escapeDescription(record.fullTitle);
                _n++;

                if (record.status === "skipped" || record.status === "pending") {
                    _console.log("ok " + _n + " - " + title + " # SKIP");
                    return;
                }

                if (record.status === "failed" || record.status === "aborted") {
                    _console.log("not ok " + _n + " - " + title);
                    // TAP 13's YAML diagnostic block opens with `---` and closes with `...`;
                    // closing it with a second `---` instead reads to a parser as a *new*
                    // document opening that is then never terminated.
                    _console.log("  ---");
                    if (record.error) {
                        _console.log("  message: " + JSON.stringify(record.error.message || String(record.error)));
                    }
                    _console.log("  ...");
                    return;
                }

                _console.log("ok " + _n + " - " + title);
            } else if (event === eListenerEvent.Run) {
                var end = ctx.end;
                _console.log("# tests " + ((end && end.total) || _n));
                _console.log("# pass " + ((end && end.passed) || 0));
                _console.log("# fail " + ((end && end.failed) || 0));
            }
        }
    };

    return {
        listener: _listener
    };
}

/**
 * Register a TAP reporter with a notification manager and return a handle to remove it.
 * @param mgr - The notification manager to register with
 * @param options - Optional reporter configuration
 * @returns A removable handle
 * @since 0.2.0
 */
export function addTapReporter(mgr: INotificationManager, options?: ITapReporterOptions): IRemovable {
    var reporter = createTapReporter(options);
    return mgr.addListener(reporter.listener);
}
