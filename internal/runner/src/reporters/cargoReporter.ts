/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { ICachedValue } from "@nevware21/ts-utils";
import { IListener, IListenerContext, INotifyResult, INotificationManager, IRemovable, eListenerEvent } from "@nevware21/tripwire";
import { bold, brightBlue, cyan, gray, green, red, yellow } from "@nevware21/chromacon";
import { formatDuration } from "./formatters";
import { IReporterConsole, IReporterTestRecord, _buildTestRecord } from "./_reporterRecord";
import { getSuitePartsFromNode } from "../shared/suiteNames";

/**
 * Width cargo right-aligns its status verbs to -- `Compiling`, `Finished`, `Running` and friends
 * all end at the same column, which is what gives its output the distinctive left gutter.
 */
const _VERB_WIDTH = 12;

/**
 * Options for creating a cargo reporter.
 * @since 0.2.0
 */
export interface ICargoReporterOptions {
    /**
     * Custom console-like output sink. Defaults to the global `console`.
     */
    console?: IReporterConsole;

    /**
     * Show the `--> file:line:col` location line under a failure, extracted from the first
     * stack frame that names a real file. Default: `true`. Turn off for output that has to be
     * stable across machines (a golden-file test, a doc sample).
     */
    showLocations?: boolean;

    /**
     * Draw cargo's in-place progress bar (`Testing [===>   ] 2/4: <test>`) as tests complete.
     * Default: `true`, but it only ever appears when `console.write` is supplied -- see
     * {@link createCargoReporter} for why a piped run deliberately gets no bar at all.
     */
    showProgress?: boolean;

    /**
     * Width of the progress bar in characters, between the brackets. Default: 30.
     */
    progressWidth?: number;
}

/**
 * Right-aligns a cargo status verb into the standard gutter, eg. `"Running"` -> `"     Running"`.
 */
function _verb(word: string): string {
    var pad = _VERB_WIDTH - word.length;
    var result = "";

    for (var lp = 0; lp < pad; lp++) {
        result += " ";
    }

    return result + word;
}

/**
 * The `module::path::test name` form cargo uses to identify a test.
 *
 * Rust's own names are real module paths, so they never contain spaces; a `describe` title can,
 * and forcing it into snake_case would make the name stop matching what `--grep` accepts (and
 * what every other reporter prints). Descriptions are kept verbatim and only the *separator*
 * borrows cargo's `::`, which keeps the output recognisable without inventing a second naming
 * scheme for the same test.
 */
function _cargoPath(ctx: IListenerContext): string {
    var parts = getSuitePartsFromNode(ctx.suite);
    var title = (ctx.test && ctx.test.description) || "(unnamed test)";

    parts.push(title);

    return parts.join("::");
}

/**
 * Shortens an absolute path the way cargo shows one: forward slashes, and relative to the working
 * directory when it is below it.
 *
 * `process` is feature-detected rather than assumed -- this file is bundled into the browser and
 * worker clients too, where there is no cwd to relativise against and the absolute path is all
 * there is.
 */
function _shortenPath(location: string): string {
    var result = location.replace(/\\/g, "/");

    if (typeof process !== "undefined" && process && typeof process.cwd === "function") {
        var cwd = process.cwd().replace(/\\/g, "/");

        // Case-insensitively on Windows, where the drive letter's case is not stable.
        if (result.toLowerCase().indexOf(cwd.toLowerCase() + "/") === 0) {
            result = result.substring(cwd.length + 1);
        }
    }

    return result;
}

/**
 * Pulls `file:line:col` out of the first stack frame that looks like a real source location, for
 * the rustc-style `--> ` line. Returns `""` when there is nothing usable, in which case the
 * caller simply omits the line rather than printing a placeholder.
 */
function _firstLocation(error: Error | undefined): string {
    if (!error || !error.stack) {
        return "";
    }

    var lines = error.stack.split("\n");
    for (var lp = 1; lp < lines.length; lp++) {
        // Both the "at fn (path:line:col)" and bare "at path:line:col" frame shapes.
        var match = /\(?([^()\s]+:\d+:\d+)\)?\s*$/.exec(lines[lp]);
        if (match && match[1] && match[1].indexOf(":") !== -1) {
            return _shortenPath(match[1]);
        }
    }

    return "";
}

/**
 * A reporter that renders a run the way `cargo` renders a build and test pass: right-aligned
 * bold status verbs in the left gutter, one `test <path> ... ok` line per test, and rustc-style
 * `error:` / `-->` / `|` diagnostics for each failure, closing with cargo's own
 * `test result: ok. N passed; N failed; ...` line.
 *
 * Chosen mapping, where tripwire and cargo do not line up exactly:
 * - **`ignored`** covers both skipped and pending tests. Rust has one concept (`#[ignore]`) for
 *   "declared but not run", and cargo's summary has one field for it.
 * - **`measured`** is always `0` -- that field counts `#[bench]` results, and tripwire has no
 *   benchmark concept at all.
 * - **`filtered out`** is always `0` -- a test excluded by `--grep` is not part of the run in
 *   tripwire (it is neither counted nor reported), so by the time any reporter sees the totals
 *   there is nothing left to describe as filtered.
 *
 * The two zeroes are kept rather than dropped because the line is the recognisable part of the
 * format; both are honest for this runner rather than unimplemented.
 * @param options - Optional configuration
 * @returns A reporter object whose `.listener` property should be registered
 * @since 0.2.0
 */
export function createCargoReporter(options?: ICargoReporterOptions): { listener: IListener } {
    var _console: IReporterConsole = (options && options.console) || console;
    var _showLocations = !(options && options.showLocations === false);
    var _showProgress = !(options && options.showProgress === false);
    var _progressWidth = (options && options.progressWidth) || 30;
    var _failures: IReporterTestRecord[] = [];
    var _failurePaths: string[] = [];
    var _total = 0;
    var _completed = 0;
    var _drawn = 0;

    /*
     * The bar is drawn only when a raw `write` sink is available -- which the CLI supplies just
     * for a real TTY. That mirrors cargo itself: pipe a build and the bar disappears, because a
     * `\r`-redrawn line is meaningless in a log file. Nothing is lost by dropping it here, since
     * the permanent `test ... ok` lines already carry every result.
     */
    var _write = _showProgress ? _console.write : undefined;

    /** Blanks whatever the bar last drew, so a permanent line can be printed over it cleanly. */
    function _clearBar(): void {
        if (_write && _drawn > 0) {
            _write("\r" + new Array(_drawn + 1).join(" ") + "\r");
            _drawn = 0;
        }
    }

    /**
     * `    Testing [=========>          ] 2/4: math::addition::adds two numbers`
     *
     * The head of the fill is `>` while running and `=` once complete, as cargo draws it, and
     * the trailing test name is truncated so the line cannot wrap (a wrapped line makes `\r`
     * redraw the wrong row and leaves debris up the screen).
     */
    function _drawBar(current: string): void {
        if (!_write || _total <= 0) {
            return;
        }

        var ratio = _completed / _total;
        var filled = Math.round(ratio * _progressWidth);
        var head = (filled > 0 && _completed < _total) ? ">" : "";
        var bars = new Array(Math.max(filled - head.length, 0) + 1).join("=");
        var pad = new Array(Math.max(_progressWidth - bars.length - head.length, 0) + 1).join(" ");

        var suffix = " " + _completed + "/" + _total + (current ? ": " + current : "");
        var plain = _verb("Testing") + " [" + bars + head + pad + "]" + suffix;

        // Trim on the plain text, then colour, so the ANSI codes never count toward the width.
        if (plain.length > 100) {
            plain = plain.substring(0, 97) + "...";
        }

        var coloured = green(bold(_verb("Testing"))) + " [" + cyan(bars + head) + pad + "]"
            + plain.substring(_verb("Testing").length + _progressWidth + 3);

        _write("\r" + coloured);
        _drawn = plain.length;
    }

    function _printDiagnostic(record: IReporterTestRecord, cargoPath: string): void {
        _console.error("---- " + cargoPath + " ----");

        var error = record.error;
        var message = error ? (error.message || String(error)) : "test failed";

        _console.error(red(bold("error")) + ": " + message.split("\n")[0]);

        var location = _showLocations ? _firstLocation(error) : "";
        if (location) {
            _console.error(brightBlue(bold("   --> ")) + location);
        }

        // rustc's note block: a `|` gutter opening the span, then `= note:` rows. Any additional
        // lines of a multi-line assertion message become their own notes rather than being lost.
        var extra = message.split("\n").slice(1);
        _console.error(brightBlue(bold("    |")));

        for (var lp = 0; lp < extra.length; lp++) {
            if (extra[lp]) {
                _console.error(brightBlue(bold("    = ")) + gray("note: ") + extra[lp].trim());
            }
        }

        if (!extra.length) {
            _console.error(brightBlue(bold("    = ")) + gray("note: ") + "assertion failed");
        }

        _console.error("");
    }

    var _listener: IListener = {
        onStart: function(event: number, context: ICachedValue<IListenerContext>): INotifyResult | void {
            if (event === eListenerEvent.Run) {
                _failures = [];
                _failurePaths = [];
                _completed = 0;
                _drawn = 0;

                var start = context && context.v && context.v.start;
                _total = (start && start.totalTests) || 0;

                _console.log("");
                _console.log(green(bold(_verb("Running"))) + " " + _total + " test" + (_total === 1 ? "" : "s"));
                _console.log("");
            }
        },

        onDone: function(event: number, context: ICachedValue<IListenerContext>): INotifyResult | void {
            var ctx = context.v;

            if (event === eListenerEvent.Test) {
                var record = _buildTestRecord(ctx);
                var cargoPath = _cargoPath(ctx);
                var outcome;

                if (record.status === "passed") {
                    outcome = green("ok");
                } else if (record.status === "failed" || record.status === "aborted") {
                    outcome = red(bold("FAILED"));
                    _failures.push(record);
                    _failurePaths.push(cargoPath);
                } else {
                    outcome = yellow("ignored");
                }

                // Blank the bar, lay down the permanent result line, then redraw the bar beneath
                // it -- the order cargo uses to keep a scrolling log above a live status line.
                _completed++;
                _clearBar();
                _console.log("test " + cargoPath + " ... " + outcome);
                _drawBar(cargoPath);
            } else if (event === eListenerEvent.Run) {
                _clearBar();

                var end = ctx.end;
                var passed = (end && end.passed) || 0;
                var failed = (end && end.failed) || 0;
                var ignored = ((end && end.skipped) || 0) + ((end && end.pending) || 0);
                var duration = (end && end.duration) || 0;

                if (_failures.length) {
                    _console.error("");
                    _console.error(red(bold("failures:")));
                    _console.error("");

                    for (var lp = 0; lp < _failures.length; lp++) {
                        _printDiagnostic(_failures[lp], _failurePaths[lp]);
                    }

                    _console.error(red(bold("failures:")));
                    for (var fp = 0; fp < _failurePaths.length; fp++) {
                        _console.error("    " + _failurePaths[fp]);
                    }
                }

                // cargo always separates the per-test lines (or the failures block) from its
                // verdict with a single blank line.
                _console.log("");

                var verdict = failed > 0 ? red(bold("FAILED")) : green(bold("ok"));

                _console.log("test result: " + verdict + ". "
                    + passed + " passed; "
                    + failed + " failed; "
                    + ignored + " ignored; "
                    + "0 measured; 0 filtered out; "
                    + "finished in " + formatDuration(duration));
                _console.log("");

                if (failed === 0) {
                    _console.log(green(bold(_verb("Finished"))) + " test target(s) in " + formatDuration(duration));
                    _console.log("");
                }
            }
        }
    };

    return {
        listener: _listener
    };
}

/**
 * Register a cargo reporter with a notification manager and return a handle to remove it.
 * @param mgr - The notification manager to register with
 * @param options - Optional reporter configuration
 * @returns A removable handle
 * @since 0.2.0
 */
export function addCargoReporter(mgr: INotificationManager, options?: ICargoReporterOptions): IRemovable {
    var reporter = createCargoReporter(options);
    return mgr.addListener(reporter.listener);
}
