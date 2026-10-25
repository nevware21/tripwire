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
 * Options for creating a Markdown reporter.
 * @since 0.2.0
 */
export interface IMarkdownReporterOptions {
    /**
     * Custom console-like output sink. Defaults to the global `console`.
     */
    console?: IReporterConsole;
}

function _slug(title: string): string {
    return title.toLowerCase().replace(/[^\w]+/g, "-").replace(/^-+|-+$/g, "");
}

/**
 * A reporter that emits a GitHub-flavored Markdown document: a table of contents linking to
 * each suite, followed by a heading section per suite (nesting depth -> heading level) listing
 * its tests, each with its pass/fail status and, when available, its body source in a fenced
 * code block -- for generating spec documentation from the suite tree, as mocha's own
 * markdown reporter does.
 * @param options - Optional configuration
 * @returns A reporter object whose `.listener` property should be registered
 * @since 0.2.0
 */
export function createMarkdownReporter(options?: IMarkdownReporterOptions): { listener: IListener } {
    var _console = (options && options.console) || console;
    var _depth = 0;
    var _toc: Array<{ depth: number; title: string; slug: string }> = [];
    var _body: string[] = [];

    var _listener: IListener = {
        onStart: function(event: number, context: ICachedValue<IListenerContext>): INotifyResult | void {
            var ctx = context.v;

            if (event === eListenerEvent.Run) {
                _depth = 0;
                _toc = [];
                _body = [];
            } else if (event === eListenerEvent.Suite) {
                var title = (ctx.suite && ctx.suite.description) || "";
                if (title) {
                    var level = Math.min(_depth + 1, 6);
                    _toc.push({ depth: _depth, title: title, slug: _slug(title) });
                    _body.push(new Array(level + 1).join("#") + " " + title);
                    _body.push("");
                    _depth++;
                }
            }
        },

        onDone: function(event: number, context: ICachedValue<IListenerContext>): INotifyResult | void {
            var ctx = context.v;

            if (event === eListenerEvent.Suite) {
                if ((ctx.suite && ctx.suite.description) || "") {
                    _depth--;
                }
            } else if (event === eListenerEvent.Test) {
                var record = _buildTestRecord(ctx);
                var fn = ctx.test && ctx.test.fn;
                var marker = record.status === "passed" ? "✓"
                    : (record.status === "failed" || record.status === "aborted") ? "✗"
                        : "-";
                _body.push(" - " + marker + " " + record.title);
                if (fn) {
                    _body.push("");
                    _body.push("```js");
                    _body.push(String(fn));
                    _body.push("```");
                }
                _body.push("");
            } else if (event === eListenerEvent.Run) {
                var lines: string[] = ["# TOC", ""];
                for (var i = 0; i < _toc.length; i++) {
                    var entry = _toc[i];
                    lines.push(new Array(entry.depth * 2 + 1).join(" ") + "- [" + entry.title + "](#" + entry.slug + ")");
                }
                lines.push("");
                _console.log(lines.concat(_body).join("\n"));
            }
        }
    };

    return {
        listener: _listener
    };
}

/**
 * Register a Markdown reporter with a notification manager and return a handle to remove it.
 * @param mgr - The notification manager to register with
 * @param options - Optional reporter configuration
 * @returns A removable handle
 * @since 0.2.0
 */
export function addMarkdownReporter(mgr: INotificationManager, options?: IMarkdownReporterOptions): IRemovable {
    var reporter = createMarkdownReporter(options);
    return mgr.addListener(reporter.listener);
}
