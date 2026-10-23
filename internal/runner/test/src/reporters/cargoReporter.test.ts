/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import {
    assert, IDoneFn,
    describe as selfDescribe, it as selfIt
} from "@nevware21/tripwire";
import { doAwait } from "@nevware21/ts-async";
import { createCargoReporter } from "../../../src/reporters/cargoReporter";
import { createReporter, REPORTER_NAMES } from "../../../src/reporters/createReporter";
import { makeSink, runWithReporter, runWithReporterAndSummary, ICaptureSink } from "../support/reporterHarness";

/** There is no `assert.notIncludes`, and absence is most of what these cases check. */
function assertExcludes(haystack: string, needle: string, msg?: string) {
    assert.equal(haystack.indexOf(needle), -1, msg || ("should not contain '" + needle + "'"));
}

function mixedSuite() {
    selfDescribe("math", () => {
        selfDescribe("addition", () => {
            selfIt("adds two numbers", () => {});
            selfIt("handles negatives", () => {
                throw new Error("expected -2 to equal -3");
            });
        });
        selfIt.skip("skipped one", () => {});
    });
    selfDescribe("strings", () => {
        selfIt("concatenates", () => {});
    });
}

function passingSuite() {
    selfDescribe("math", () => {
        selfIt("adds", () => {});
    });
}

/** Locations carry absolute machine paths, so they are off unless a test is asserting on them. */
function run(sink: ICaptureSink, define?: () => void) {
    return runWithReporter(define || mixedSuite, createCargoReporter({ console: sink, showLocations: false }).listener, sink);
}

describe("CargoReporter", () => {
    it("should announce the run with a right-aligned Running verb and the test count", (done: IDoneFn) => {
        const sink = makeSink();

        doAwait(run(sink), () => {
            // Right-aligned into cargo's 12-column gutter: 5 spaces + "Running".
            assert.includes(sink.text(), "     Running 4 tests");
            done();
        }, done);
    });

    it("should singularise the count for a one-test run", (done: IDoneFn) => {
        const sink = makeSink();

        doAwait(run(sink, passingSuite), () => {
            assert.includes(sink.text(), "     Running 1 test\n");
            assertExcludes(sink.text(), "1 tests");
            done();
        }, done);
    });

    it("should print one `test <path> ... <outcome>` line per test, using :: separators", (done: IDoneFn) => {
        const sink = makeSink();

        doAwait(run(sink), () => {
            const text = sink.text();

            assert.includes(text, "test math::addition::adds two numbers ... ok");
            assert.includes(text, "test math::addition::handles negatives ... FAILED");
            assert.includes(text, "test math::skipped one ... ignored");
            assert.includes(text, "test strings::concatenates ... ok");
            done();
        }, done);
    });

    it("should not include the root suite's name in a test path", (done: IDoneFn) => {
        const sink = makeSink();

        doAwait(run(sink), () => {
            assertExcludes(sink.text(), "root::");
            done();
        }, done);
    });

    it("should render each failure as a rustc-style diagnostic block", (done: IDoneFn) => {
        const sink = makeSink();

        doAwait(run(sink), () => {
            const errors = sink.errorText();

            assert.includes(errors, "---- math::addition::handles negatives ----");
            assert.includes(errors, "error: expected -2 to equal -3");
            assert.includes(errors, "    |");
            assert.includes(errors, "    = note: assertion failed");
            done();
        }, done);
    });

    it("should list every failed test path under a trailing failures: heading", (done: IDoneFn) => {
        const sink = makeSink();

        doAwait(run(sink), () => {
            const errors = sink.errorText();

            // "failures:" appears twice -- once opening the diagnostics, once for the summary list.
            assert.equal(errors.split("failures:").length - 1, 2, "two failures: headings");
            assert.includes(errors, "    math::addition::handles negatives");
            done();
        }, done);
    });

    it("should close with cargo's test result line, counting skipped and pending as ignored", (done: IDoneFn) => {
        const sink = makeSink();

        doAwait(runWithReporterAndSummary(function () {
            selfDescribe("suite", () => {
                selfIt("passes", () => {});
                selfIt("fails", () => {
                    throw new Error("boom");
                });
                selfIt.skip("skipped", () => {});
                selfIt("pending");
            });
        }, createCargoReporter({ console: sink, showLocations: false }).listener, sink), (result: any) => {
            const summary = result.summary;

            // Rust has one concept for "declared but not run", so skipped + pending fold into it.
            assert.equal(summary.skipped + summary.pending, 2, "1 skipped + 1 pending");
            assert.includes(sink.text(),
                "test result: FAILED. 1 passed; 1 failed; 2 ignored; 0 measured; 0 filtered out;");
            done();
        }, done);
    });

    it("should report ok and print the Finished verb when nothing failed", (done: IDoneFn) => {
        const sink = makeSink();

        doAwait(run(sink, passingSuite), () => {
            const text = sink.text();

            assert.includes(text, "test result: ok. 1 passed; 0 failed; 0 ignored;");
            assert.includes(text, "    Finished test target(s) in ");
            done();
        }, done);
    });

    it("should not print the Finished verb when a test failed", (done: IDoneFn) => {
        const sink = makeSink();

        doAwait(run(sink), () => {
            // cargo does not print "Finished" for a failed test target.
            assertExcludes(sink.text(), "Finished");
            done();
        }, done);
    });

    it("should separate the verdict from the test lines with a blank line", (done: IDoneFn) => {
        const sink = makeSink();

        doAwait(run(sink, passingSuite), () => {
            const lines = sink.lines();
            const idx = lines.findIndex((line) => line.indexOf("test result:") === 0);

            assert.isTrue(idx > 0, "found the verdict line");
            assert.equal(lines[idx - 1], "", "blank line immediately above it");
            done();
        }, done);
    });

    it("should agree with the runner's own totals", (done: IDoneFn) => {
        const sink = makeSink();

        doAwait(runWithReporterAndSummary(mixedSuite, createCargoReporter({ console: sink, showLocations: false }).listener, sink), (result: any) => {
            const summary = result.summary;
            const expected = "test result: FAILED. " + summary.passed + " passed; " + summary.failed
                + " failed; " + (summary.skipped + summary.pending) + " ignored;";

            assert.includes(sink.text(), expected);
            done();
        }, done);
    });

    it("should emit a location line only when locations are enabled", (done: IDoneFn) => {
        const withLoc = makeSink();

        doAwait(runWithReporter(mixedSuite, createCargoReporter({ console: withLoc }).listener, withLoc), () => {
            assert.includes(withLoc.errorText(), "   --> ", "location shown by default");

            const withoutLoc = makeSink();
            doAwait(runWithReporter(mixedSuite, createCargoReporter({ console: withoutLoc, showLocations: false }).listener, withoutLoc), () => {
                assertExcludes(withoutLoc.errorText(), "   --> ");
                done();
            }, done);
        }, done);
    });

    /*
     * cargo draws a live status line under the scrolling log while it works, and drops it
     * entirely when its output is not a terminal. The reporter follows both halves: the bar only
     * exists when a raw `write` sink is supplied (the CLI supplies one only for a real TTY).
     */
    describe("progress bar", () => {
        it("should draw a cargo-style bar with a > head while running", (done: IDoneFn) => {
            const sink = makeSink();

            doAwait(runWithReporter(mixedSuite, createCargoReporter({ console: sink, showLocations: false }).listener, sink), () => {
                const frames = sink.writes.map((w) => w.replace(/\x1b\[[0-9;]*m/g, "")).filter((w) => w.indexOf("Testing") !== -1);

                assert.equal(frames.length, 4, "one frame per test");
                assert.includes(frames[0], "     Testing [", "right-aligned verb, then the bar");
                assert.includes(frames[0], ">", "a > head while still running");
                assert.includes(frames[0], "] 1/4: ", "completed/total and the current test");
                done();
            }, done);
        });

        it("should fill solid with no head on the final frame", (done: IDoneFn) => {
            const sink = makeSink();

            doAwait(runWithReporter(mixedSuite, createCargoReporter({ console: sink, showLocations: false }).listener, sink), () => {
                const frames = sink.writes.map((w) => w.replace(/\x1b\[[0-9;]*m/g, "")).filter((w) => w.indexOf("Testing") !== -1);
                const last = frames[frames.length - 1];

                assert.includes(last, "[==============================]", "solid at 4/4");
                assert.includes(last, "] 4/4: ");
                done();
            }, done);
        });

        it("should clear the bar before each permanent line and at the end", (done: IDoneFn) => {
            const sink = makeSink();

            doAwait(runWithReporter(mixedSuite, createCargoReporter({ console: sink, showLocations: false }).listener, sink), () => {
                const clears = sink.writes.filter((w) => /^\r +\r$/.test(w));

                // One before each of the 4 result lines (bar drawn 3 times before them) plus one
                // closing clear before the failures block -- what stops the bar leaving debris.
                assert.isTrue(clears.length >= 4, "saw clearing writes, got " + clears.length);
                done();
            }, done);
        });

        it("should honour progressWidth", (done: IDoneFn) => {
            const sink = makeSink();

            doAwait(runWithReporter(mixedSuite, createCargoReporter({ console: sink, showLocations: false, progressWidth: 10 }).listener, sink), () => {
                const frames = sink.writes.map((w) => w.replace(/\x1b\[[0-9;]*m/g, "")).filter((w) => w.indexOf("Testing") !== -1);
                const inner = /\[([^\]]*)\]/.exec(frames[0]);

                assert.isTrue(!!inner, "found the bracketed bar");
                assert.equal((inner as string[])[1].length, 10, "bar is progressWidth wide");
                done();
            }, done);
        });

        it("should draw no bar at all when the sink has no raw write", (done: IDoneFn) => {
            const sink = makeSink();
            // A console-only sink is what a browser/worker target (and a piped CLI) supplies.
            const noWrite = { log: sink.log, error: sink.error };

            doAwait(runWithReporter(mixedSuite, createCargoReporter({ console: noWrite as any, showLocations: false }).listener, sink), () => {
                assert.equal(sink.writes.length, 0, "no in-place output");
                assert.includes(sink.text(), "test math::addition::adds two numbers ... ok", "results still printed in full");
                done();
            }, done);
        });

        it("should draw no bar when showProgress is false", (done: IDoneFn) => {
            const sink = makeSink();

            doAwait(runWithReporter(mixedSuite, createCargoReporter({ console: sink, showLocations: false, showProgress: false }).listener, sink), () => {
                assert.equal(sink.writes.length, 0, "opted out");
                assert.includes(sink.text(), "test result: FAILED.", "everything else unchanged");
                done();
            }, done);
        });
    });

    it("should be reachable by name through createReporter", (done: IDoneFn) => {
        const sink = makeSink();

        assert.isTrue(REPORTER_NAMES.indexOf("cargo" as any) !== -1, "advertised in REPORTER_NAMES");

        doAwait(runWithReporter(passingSuite, createReporter("cargo", { console: sink, showLocations: false } as any).listener, sink), () => {
            assert.includes(sink.text(), "test result: ok.");
            done();
        }, done);
    });
});
