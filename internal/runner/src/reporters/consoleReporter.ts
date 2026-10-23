/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { ICachedValue } from "@nevware21/ts-utils";
import { IListener, IListenerContext, INotifyResult, INotificationManager, IAssertionContext, IRemovable, eListenerEvent } from "@nevware21/tripwire";
import { bold, cyan, gray, magenta, parseAnsi, red, reset, brightCyan, yellow } from "@nevware21/chromacon";
import {
    formatDuration, formatStatusSymbol, formatSummary, indent
} from "./formatters";
import { IReporterConsole } from "./_reporterRecord";

/**
 * Options for creating a console reporter.
 * @since 0.2.0
 */
export interface IConsoleReporterOptions {
    /**
     * Custom console-like output sink.
     * Defaults to the global `console`.
     */
    console?: IReporterConsole;

    /**
     * Whether to print each suite's title as it starts.
     * Default: true
     */
    showSuiteTitles?: boolean;

    /**
     * Whether to print hook events.
     * Default: false
     */
    showHooks?: boolean;

    /**
     * Default slow threshold in milliseconds used when test events do not include one.
     */
    slowThreshold?: number;

    /**
     * Whether to print each test and assertion as it executes.
     * Default: false
     */
    showExecution?: boolean;
}

/**
 * A simple console-based test reporter that listens to suite, test, hook, and run events
 * and prints human-readable progress and summary output.
 *
 * @example
 * ```typescript
 * import { createNotifyMgr, createTestRunner, getRootSuite } from "@nevware21/tripwire";
 * import { createConsoleReporter } from "@nevware21/tripwire/reporters";
 *
 * const mgr = createNotifyMgr();
 * const reporter = createConsoleReporter();
 * mgr.addListener(reporter.listener);
 *
 * const runner = createTestRunner(getRootSuite(), { notificationManager: mgr });
 * await runner.run();
 * ```
 * @since 0.2.0
 */
export interface IConsoleReporter {
    /**
     * The `IListener` implementation to register with a notification manager.
     */
    listener: IListener;
}

/**
 * Create a console reporter that prints test progress and a final summary to the console.
 *
 * The reporter handles all four lifecycle events:
 * - **Run** – prints a header on start; prints full summary (pass/fail/skip counts) on done
 * - **Suite** – prints the suite title (indented by nesting depth) on start
 * - **Test** – prints a ✓/✗/- symbol with the test name and duration on done
 * - **Hook** – optionally prints hook events when `showHooks` is enabled
 *
 * @param options - Optional configuration
 * @returns A reporter object whose `.listener` property should be registered
 * @since 0.2.0
 */
export function createConsoleReporter(options?: IConsoleReporterOptions): IConsoleReporter {
    var _console = (options && options.console) || console;
    var _showSuiteTitles = !options || options.showSuiteTitles !== false;
    var _showHooks = options && options.showHooks === true;
    var _slowThreshold = options && options.slowThreshold;
    var _showExecution = options && options.showExecution === true;
    var _maxTraceLabelLength = 140;

    // Track suite nesting depth independently so we don't rely on ITestSuite.parent traversal
    var _suiteDepth = 0;

    /**
     * Suite titles announced by a Suite start event but not yet printed, outermost last-pushed,
     * one entry per open suite (`null` for a suite whose title is not shown at all -- the root
     * placeholder, or every suite when `showSuiteTitles` is false -- so the stack stays aligned
     * with `_suiteDepth`).
     *
     * A title is printed on the first line that actually appears beneath it (see
     * `_flushPendingSuiteTitles`) rather than on the start event itself. Otherwise a `--grep`
     * that excludes every test in a suite still printed that suite's title with nothing under
     * it: the run's counts were right, but the output listed suites that contributed nothing.
     */
    var _pendingSuiteTitles: Array<string | null> = [];

    /**
     * Prints every announced-but-unprinted suite title, outermost first, immediately before the
     * line that made them relevant. Flushing the whole stack (rather than just the innermost)
     * is what keeps a nested suite's ancestors above it when only the nested one has content.
     */
    function _flushPendingSuiteTitles(): void {
        if (_pendingSuiteTitles.length) {
            var pending = _pendingSuiteTitles;
            _pendingSuiteTitles = [];

            for (var i = 0; i < pending.length; i++) {
                if (pending[i] !== null) {
                    _console.log(pending[i] as string);
                }
            }
        }
    }

    // Accumulate failures for end-of-run display
    var _failures: Array<{ title: string; error: Error | undefined }> = [];

    function _getTestTitle(ctx: IListenerContext): string {
        var testDesc = ctx.test ? ctx.test.description : "";
        return testDesc || "(unnamed test)";
    }

    function _getSuiteTitle(ctx: IListenerContext): string {
        return (ctx.suite && ctx.suite.description) || "(root)";
    }

    function _getHookTitle(ctx: IListenerContext): string {
        return (ctx.hook && ctx.hook.name) || "(hook)";
    }

    function _normalizeTraceLabel(value: string): string {
        var text = String(value || "");
        var firstLine = text.split(/\r?\n/)[0] || "";
        var compact = firstLine.replace(/\s+/g, " ").trim();
        var parts = parseAnsi(compact);
        var visibleLength = 0;

        for (var i = 0; i < parts.length; i++) {
            var part = parts[i];

            if (part && part.charCodeAt(0) !== 27) {
                visibleLength += part.length;
            }
        }

        if (visibleLength > _maxTraceLabelLength) {
            var visibleLimit = _maxTraceLabelLength - 3;
            var truncated = "";
            var sawAnsi = false;

            visibleLength = 0;

            for (var j = 0; j < parts.length && visibleLength < visibleLimit; j++) {
                var part = parts[j];

                if (!part) {
                    continue;
                }

                if (part.charCodeAt(0) === 27) {
                    truncated += part;
                    sawAnsi = true;
                    continue;
                }

                var remaining = visibleLimit - visibleLength;

                if (part.length <= remaining) {
                    truncated += part;
                    visibleLength += part.length;
                } else {
                    truncated += part.substring(0, remaining);
                    visibleLength += remaining;
                }
            }

            if (sawAnsi) {
                truncated += reset;
            }

            return truncated + "...";
        }

        return compact;
    }

    var _listener: IListener = {
        onStart: function(event: number, context: ICachedValue<IListenerContext>): INotifyResult | void {
            var ctx = context.v;

            if (event === eListenerEvent.Run) {
                _failures = [];
                _pendingSuiteTitles = [];
                _console.log("");
                _console.log(bold(cyan("  Running tests...")));
                _console.log("");
            } else if (event === eListenerEvent.Suite) {
                var title = _getSuiteTitle(ctx);
                // Skip the root-level placeholder if it has no description -- pushed as `null`
                // rather than not pushed at all, so the stack stays one entry per open suite.
                var showTitle = _showSuiteTitles && title !== "(root)";

                _pendingSuiteTitles.push(showTitle ? indent(_suiteDepth + 1) + bold(title) : null);
                _suiteDepth++;
            } else if (event === eListenerEvent.Test && _showExecution) {
                _flushPendingSuiteTitles();
                _console.log(indent(_suiteDepth + 1) + brightCyan("run:") + " " + gray(_getTestTitle(ctx)));
            } else if (event === eListenerEvent.Hook && _showHooks) {
                _flushPendingSuiteTitles();
                _console.log(indent(_suiteDepth + 1) + magenta("hook:") + " " + gray(_getHookTitle(ctx)));
            }
        },

        onDone: function(event: number, context: ICachedValue<IListenerContext>): INotifyResult | void {
            var ctx = context.v;
            var end = ctx.end;

            if (event === eListenerEvent.Suite) {
                _suiteDepth = _suiteDepth > 0 ? _suiteDepth - 1 : 0;
                // Nothing was printed beneath this suite, so its title never became relevant --
                // drop it rather than leave it to be flushed by whatever prints next. Its entry
                // is the innermost still-pending one, since any nested suite pushed after it has
                // already been popped or flushed.
                _pendingSuiteTitles.pop();
            } else if (event === eListenerEvent.Test) {
                _flushPendingSuiteTitles();

                var testTitle = _getTestTitle(ctx);
                var status = (end && end.status) || "failed";
                var duration = (end && end.duration !== undefined) ? end.duration : 0;
                var slowThreshold = (end && end.slowThreshold !== undefined) ? end.slowThreshold : _slowThreshold;
                var isSlow = (end && end.slow !== undefined) ? end.slow : (slowThreshold !== undefined && duration > slowThreshold);
                var symbol = formatStatusSymbol(status as any);

                var line = indent(_suiteDepth + 1) + symbol + " " + testTitle;

                if (status === "passed") {
                    if (isSlow) {
                        line += duration > 0 ? " " + yellow(formatDuration(duration) + " (slow)") : " " + yellow("(slow)");
                    } else if (duration > 0) {
                        line += " " + gray(formatDuration(duration));
                    }
                } else if (status === "failed" || status === "aborted") {
                    if (duration > 0) {
                        line += " " + red(formatDuration(duration));
                    }
                    _failures.push({
                        title: testTitle,
                        error: end ? end.error : undefined
                    });
                } else {
                    line += " " + yellow("(skipped)");
                }

                _console.log(line);
            } else if (event === eListenerEvent.Run) {
                // Print final summary
                var passed = (end && end.passed !== undefined) ? end.passed : 0;
                var failed = (end && end.failed !== undefined) ? end.failed : 0;
                var skipped = (end && end.skipped !== undefined) ? end.skipped : 0;
                var pending = (end && end.pending !== undefined) ? end.pending : 0;
                var runDuration = (end && end.duration !== undefined) ? end.duration : 0;

                _console.log("");
                _console.log("  " + formatSummary(passed, failed, skipped, pending, runDuration));
                _console.log("");

                // Print failure details
                if (_failures.length > 0) {
                    _console.log(red(bold("  Failures:")));
                    _console.log("");
                    for (var i = 0; i < _failures.length; i++) {
                        var failure = _failures[i];
                        _console.error("  " + red((i + 1) + ") " + failure.title));
                        if (failure.error) {
                            var errMsg = failure.error.message || String(failure.error);
                            var stack = failure.error.stack;
                            _console.error("     " + gray(errMsg));
                            if (stack) {
                                // Print abbreviated stack (skip the first line which duplicates message)
                                var lines = stack.split("\n");
                                for (var j = 1; j < lines.length && j <= 5; j++) {
                                    _console.error("     " + gray(lines[j]));
                                }
                            }
                        }
                        _console.log("");
                    }
                }
            }
        }
    };

    if (_showExecution) {
        _listener.onAssert = function(context: ICachedValue<IAssertionContext>): INotifyResult | void {
            var ctx = context.v;
            var labelSource = ctx.message || ((ctx.opPath && ctx.opPath.length > 0) ? ctx.opPath.join(".") : "(assertion)");
            var label = _normalizeTraceLabel(labelSource);
            _flushPendingSuiteTitles();
            _console.log(indent(_suiteDepth + 2) + cyan("assert:") + " " + gray(label));
        };
    }

    return {
        listener: _listener
    };
}

/**
 * Register a console reporter with a notification manager and return a handle to remove it.
 *
 * @param mgr - The notification manager to register with
 * @param options - Optional reporter configuration
 * @returns A removable handle
 * @since 0.2.0
 */
export function addConsoleReporter(mgr: INotificationManager, options?: IConsoleReporterOptions): IRemovable {
    var reporter = createConsoleReporter(options);
    return mgr.addListener(reporter.listener);
}
