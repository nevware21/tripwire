/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import {
    assert, IDoneFn,
    describe as selfDescribe, it as selfIt, beforeAll as selfBeforeAll
} from "@nevware21/tripwire";
import { doAwait } from "@nevware21/ts-async";
import { createTapReporter } from "../../../src/reporters/tapReporter";
import { makeSink, runWithReporter, runWithReporterAndSummary, ICaptureSink } from "../support/reporterHarness";

function planCount(lines: string[]): number {
    for (let lp = 0; lp < lines.length; lp++) {
        const match = /^1\.\.(\d+)$/.exec(lines[lp]);
        if (match) {
            return parseInt(match[1], 10);
        }
    }

    return -1;
}

function resultLines(lines: string[]): string[] {
    return lines.filter((line) => /^(ok|not ok) \d+ /.test(line));
}

describe("TapReporter", () => {
    it("should emit a plan line matching the number of result lines for a plain run", (done: IDoneFn) => {
        const sink = makeSink();

        doAwait(runWithReporter(() => {
            selfDescribe("plan suite", () => {
                selfIt("one", () => {});
                selfIt("two", () => {});
            });
        }, createTapReporter({ console: sink }).listener, sink), (captured: ICaptureSink) => {
            const lines = captured.lines();
            assert.equal(planCount(lines), 2, "plan should announce two tests");
            assert.equal(resultLines(lines).length, 2, "two result lines should follow");
            done();
        }, done.fail);
    });

    // The TAP plan is emitted from `start.totalTests` before a single test has run, so every
    // test the runner counted has to produce a result line -- whatever kept it from running.
    // This is the shape of defect that finding 2.5 was: `it.skip`, a body-less `it()` and a
    // `describe.skip`ed subtree were all counted and then silently never reported.
    it("should emit a result line for every counted test, including skipped and pending ones", (done: IDoneFn) => {
        const sink = makeSink();

        doAwait(runWithReporterAndSummary(() => {
            selfDescribe("mixed suite", () => {
                selfIt("passes", () => {});
                selfIt("fails", () => {
                    throw new Error("boom");
                });
                selfIt.skip("statically skipped", () => {});
                selfIt("declared with no body");
            });
            selfDescribe.skip("skipped suite", () => {
                selfIt("never runs", () => {});
                selfDescribe("nested under a skipped suite", () => {
                    selfIt("also never runs", () => {});
                });
            });
        }, createTapReporter({ console: sink }).listener, sink), (result) => {
            const lines = result.sink.lines();

            assert.equal(planCount(lines), result.summary.total, "the plan must match the runner's own total");
            assert.equal(resultLines(lines).length, result.summary.total, "every counted test must produce a result line");
            assert.equal(planCount(lines), 6, "4 tests in the runnable suite plus the 2 under the skipped one");
            done();
        }, done.fail);
    });

    it("should emit a result line for tests a skipping beforeAll hook stopped from running", (done: IDoneFn) => {
        const sink = makeSink();

        doAwait(runWithReporterAndSummary(() => {
            selfDescribe("hook-skipped suite", () => {
                selfBeforeAll(function() {
                    this.skip();
                });
                selfIt("one", () => {});
                selfIt("two", () => {});
            });
        }, createTapReporter({ console: sink }).listener, sink), (result) => {
            const lines = result.sink.lines();

            assert.equal(planCount(lines), result.summary.total, "the plan must match the runner's own total");
            assert.equal(resultLines(lines).length, result.summary.total, "every counted test must produce a result line");
            done();
        }, done.fail);
    });

    it("should number result lines consecutively from 1", (done: IDoneFn) => {
        const sink = makeSink();

        doAwait(runWithReporter(() => {
            selfDescribe("numbering", () => {
                selfIt("a", () => {});
                selfIt("b", () => {});
                selfIt("c", () => {});
            });
        }, createTapReporter({ console: sink }).listener, sink), (captured: ICaptureSink) => {
            const numbers = resultLines(captured.lines()).map((line) => parseInt(/^(?:ok|not ok) (\d+) /.exec(line)![1], 10));
            assert.deepEqual(numbers, [1, 2, 3], "result lines should be numbered 1..n in order");
            done();
        }, done.fail);
    });

    it("should mark skipped and pending tests with the SKIP directive", (done: IDoneFn) => {
        const sink = makeSink();

        doAwait(runWithReporter(() => {
            selfDescribe("skips", () => {
                selfIt.skip("statically skipped", () => {});
                selfIt("no body at all");
            });
        }, createTapReporter({ console: sink }).listener, sink), (captured: ICaptureSink) => {
            const results = resultLines(captured.lines());
            assert.equal(results.length, 2);
            for (let lp = 0; lp < results.length; lp++) {
                assert.includes(results[lp], "# SKIP", "skipped/pending tests carry the SKIP directive");
                assert.isTrue(results[lp].indexOf("ok ") === 0, "SKIP is reported on an `ok` line, not `not ok`");
            }
            done();
        }, done.fail);
    });

    // Finding 2.3: the diagnostic block used to close with a second `---`, which a TAP parser
    // reads as a *new* YAML document being opened and never terminated.
    it("should close the failure diagnostic block with ... rather than a second ---", (done: IDoneFn) => {
        const sink = makeSink();

        doAwait(runWithReporter(() => {
            selfDescribe("diagnostics", () => {
                selfIt("fails", () => {
                    throw new Error("expected 1 to equal 2");
                });
            });
        }, createTapReporter({ console: sink }).listener, sink), (captured: ICaptureSink) => {
            const lines = captured.lines();
            const openIdx = lines.indexOf("  ---");

            assert.isTrue(openIdx > 0, "a diagnostic block should be opened");
            assert.includes(lines[openIdx + 1], "expected 1 to equal 2", "the message should be inside the block");
            assert.equal(lines[openIdx + 2], "  ...", "the block should close with ...");
            assert.equal(lines.indexOf("  ---", openIdx + 1), -1, "there should be no second --- line");
            done();
        }, done.fail);
    });

    it("should quote the diagnostic message so a colon in it cannot break the YAML", (done: IDoneFn) => {
        const sink = makeSink();

        doAwait(runWithReporter(() => {
            selfDescribe("diagnostics", () => {
                selfIt("fails", () => {
                    throw new Error("boom: expected 1 to equal 2");
                });
            });
        }, createTapReporter({ console: sink }).listener, sink), (captured: ICaptureSink) => {
            const lines = captured.lines();
            const messageLine = lines.filter((line) => line.indexOf("  message: ") === 0)[0];

            assert.isString(messageLine, "a message line should be emitted");
            assert.equal(messageLine, "  message: \"boom: expected 1 to equal 2\"", "the message should be JSON-quoted");
            done();
        }, done.fail);
    });

    // Finding 2.3, second half: `#` starts a directive in TAP, so a description containing one
    // truncates the description and (on a SKIP line) collides with the reporter's own directive.
    it("should escape # and \\ in descriptions on ok, not ok and SKIP lines alike", (done: IDoneFn) => {
        const sink = makeSink();

        doAwait(runWithReporter(() => {
            selfDescribe("tap probe", () => {
                selfIt("handles # in a name", () => {});
                selfIt("fails with # too", () => {
                    throw new Error("boom");
                });
                selfIt.skip("skipped with # as well", () => {});
                selfIt("has a back\\slash", () => {});
            });
        }, createTapReporter({ console: sink }).listener, sink), (captured: ICaptureSink) => {
            const results = resultLines(captured.lines());

            assert.includes(results[0], "handles \\# in a name", "an ok line escapes #");
            assert.includes(results[1], "fails with \\# too", "a not ok line escapes #");
            assert.includes(results[2], "skipped with \\# as well", "a SKIP line escapes # in the description");
            assert.isTrue(/# SKIP$/.test(results[2]), "the reporter's own SKIP directive stays unescaped at the end");
            assert.includes(results[3], "has a back\\\\slash", "a backslash is escaped before # is");
            done();
        }, done.fail);
    });

    it("should emit the trailing tests/pass/fail comment counts", (done: IDoneFn) => {
        const sink = makeSink();

        doAwait(runWithReporterAndSummary(() => {
            selfDescribe("counts", () => {
                selfIt("passes", () => {});
                selfIt("fails", () => {
                    throw new Error("boom");
                });
            });
        }, createTapReporter({ console: sink }).listener, sink), (result) => {
            const text = result.sink.text();

            assert.includes(text, "# tests " + result.summary.total);
            assert.includes(text, "# pass " + result.summary.passed);
            assert.includes(text, "# fail " + result.summary.failed);
            done();
        }, done.fail);
    });

    it("should reset numbering between two runs of the same reporter", (done: IDoneFn) => {
        const sink = makeSink();
        const reporter = createTapReporter({ console: sink });

        const define = () => {
            selfDescribe("reuse", () => {
                selfIt("only test", () => {});
            });
        };

        doAwait(runWithReporter(define, reporter.listener, sink), () => {
            sink.logs.length = 0;

            doAwait(runWithReporter(define, reporter.listener, sink), (captured: ICaptureSink) => {
                const numbers = resultLines(captured.lines()).map((line) => parseInt(/^(?:ok|not ok) (\d+) /.exec(line)![1], 10));
                assert.deepEqual(numbers, [1], "the second run should number from 1 again");
                done();
            }, done.fail);
        }, done.fail);
    });
});
