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
 * Options for creating a doc (HTML fragment) reporter.
 * @since 0.2.0
 */
export interface IDocReporterOptions {
    /**
     * Custom console-like output sink. Defaults to the global `console`.
     */
    console?: IReporterConsole;
}

function _escapeHtml(value: string): string {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

/**
 * A reporter that emits a semantic HTML fragment (nested `<section>`s mirroring the suite
 * tree, with a `<dl>` per test showing its title and, when available, its body source) --
 * for embedding the suite's own documentation/spec into a generated doc page rather than for
 * reading in a terminal.
 * @param options - Optional configuration
 * @returns A reporter object whose `.listener` property should be registered
 * @since 0.2.0
 */
export function createDocReporter(options?: IDocReporterOptions): { listener: IListener } {
    var _console = (options && options.console) || console;
    var _depth = 0;
    var _lines: string[] = [];

    var _listener: IListener = {
        onStart: function(event: number, context: ICachedValue<IListenerContext>): INotifyResult | void {
            var ctx = context.v;

            if (event === eListenerEvent.Run) {
                _lines = [];
                _depth = 0;
            } else if (event === eListenerEvent.Suite) {
                var title = (ctx.suite && ctx.suite.description) || "";
                if (title) {
                    var level = Math.min(_depth + 1, 6);
                    _lines.push(new Array(_depth + 1).join("  ") + "<section class=\"suite\">");
                    _lines.push(new Array(_depth + 2).join("  ") + "<h" + level + ">" + _escapeHtml(title) + "</h" + level + ">");
                    _depth++;
                }
            }
        },

        onDone: function(event: number, context: ICachedValue<IListenerContext>): INotifyResult | void {
            var ctx = context.v;

            if (event === eListenerEvent.Suite) {
                var title = (ctx.suite && ctx.suite.description) || "";
                if (title) {
                    _depth--;
                    _lines.push(new Array(_depth + 1).join("  ") + "</section>");
                }
            } else if (event === eListenerEvent.Test) {
                var record = _buildTestRecord(ctx);
                var fn = ctx.test && ctx.test.fn;
                var indent = new Array(_depth + 1).join("  ");
                _lines.push(indent + "<dl class=\"test " + record.status + "\">");
                _lines.push(indent + "  <dt>" + _escapeHtml(record.title) + "</dt>");
                _lines.push(indent + "  <dd><pre><code>" + _escapeHtml(fn ? String(fn) : "") + "</code></pre></dd>");
                _lines.push(indent + "</dl>");
            } else if (event === eListenerEvent.Run) {
                _console.log(_lines.join("\n"));
            }
        }
    };

    return {
        listener: _listener
    };
}

/**
 * Register a doc reporter with a notification manager and return a handle to remove it.
 * @param mgr - The notification manager to register with
 * @param options - Optional reporter configuration
 * @returns A removable handle
 * @since 0.2.0
 */
export function addDocReporter(mgr: INotificationManager, options?: IDocReporterOptions): IRemovable {
    var reporter = createDocReporter(options);
    return mgr.addListener(reporter.listener);
}
