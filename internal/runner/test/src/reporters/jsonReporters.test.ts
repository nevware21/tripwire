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
import { createJsonReporter } from "../../../src/reporters/jsonReporter";
import { createJsonStreamReporter } from "../../../src/reporters/jsonStreamReporter";
import { makeSink, runWithReporter, runWithReporterAndSummary, ICaptureSink } from "../support/reporterHarness";

function mixedSuite() {
    selfDescribe("json suite", () => {
        selfIt("passes", () => {});
        selfIt("fails", () => {
            throw new Error("boom");
        });
        selfIt.skip("skipped", () => {});
        selfIt("pending");
    });
}

describe("JsonReporter", () => {
    it("should emit a single parseable JSON document", (done: IDoneFn) => {
        const sink = makeSink();

        doAwait(runWithReporter(mixedSuite, createJsonReporter({ console: sink }).listener, sink), (captured: ICaptureSink) => {
            assert.equal(captured.logs.length, 1, "the whole report should be one log call");

            const report = JSON.parse(captured.logs[0]);
            assert.isObject(report.stats);
            assert.isArray(report.tests);
            done();
        }, done.fail);
    });

    it("should report stats that agree with the runner's own summary", (done: IDoneFn) => {
        const sink = makeSink();

        doAwait(runWithReporterAndSummary(mixedSuite, createJsonReporter({ console: sink }).listener, sink), (result) => {
            const report = JSON.parse(result.sink.logs[0]);

            assert.equal(report.stats.tests, result.summary.total, "tests");
            assert.equal(report.stats.passes, result.summary.passed, "passes");
            assert.equal(report.stats.failures, result.summary.failed, "failures");
            // mocha's JSON shape has one field for both, so merging here is what the format
            // requires -- unlike the spec reporter's summary line (finding 2.4).
            assert.equal(report.stats.pending, result.summary.skipped + result.summary.pending,
                "pending merges skipped and pending, as the format requires");
            done();
        }, done.fail);
    });

    it("should list every test once, partitioned across passes, failures and pending", (done: IDoneFn) => {
        const sink = makeSink();

        doAwait(runWithReporter(mixedSuite, createJsonReporter({ console: sink }).listener, sink), (captured: ICaptureSink) => {
            const report = JSON.parse(captured.logs[0]);

            assert.equal(report.tests.length, 4, "every test should appear in tests");
            assert.equal(report.passes.length, 1);
            assert.equal(report.failures.length, 1);
            assert.equal(report.pending.length, 2, "skipped and pending share the one bucket");
            assert.equal(report.passes.length + report.failures.length + report.pending.length, report.tests.length,
                "the partitions should exactly cover tests");
            done();
        }, done.fail);
    });

    it("should carry the error message on a failed test", (done: IDoneFn) => {
        const sink = makeSink();

        doAwait(runWithReporter(mixedSuite, createJsonReporter({ console: sink }).listener, sink), (captured: ICaptureSink) => {
            const report = JSON.parse(captured.logs[0]);

            assert.equal(report.failures[0].title, "fails");
            assert.equal(report.failures[0].err.message, "boom");
            done();
        }, done.fail);
    });

    it("should honour the indent option", (done: IDoneFn) => {
        const sink = makeSink();

        doAwait(runWithReporter(mixedSuite, createJsonReporter({ console: sink, indent: 0 }).listener, sink), (captured: ICaptureSink) => {
            assert.isFalse(captured.logs[0].indexOf("\n") !== -1, "indent 0 should produce a single line");
            done();
        }, done.fail);
    });

    it("should not carry results over from a previous run", (done: IDoneFn) => {
        const sink = makeSink();
        const reporter = createJsonReporter({ console: sink });

        const define = () => {
            selfDescribe("reuse", () => {
                selfIt("only test", () => {});
            });
        };

        doAwait(runWithReporter(define, reporter.listener, sink), () => {
            sink.logs.length = 0;

            doAwait(runWithReporter(define, reporter.listener, sink), (captured: ICaptureSink) => {
                assert.equal(JSON.parse(captured.logs[0]).tests.length, 1, "the second report should hold one test");
                done();
            }, done.fail);
        }, done.fail);
    });
});

describe("JsonStreamReporter", () => {
    it("should emit one parseable JSON array per line", (done: IDoneFn) => {
        const sink = makeSink();

        doAwait(runWithReporter(mixedSuite, createJsonStreamReporter({ console: sink }).listener, sink), (captured: ICaptureSink) => {
            assert.isTrue(captured.logs.length > 2, "start, per-test and end lines are all expected");

            for (let lp = 0; lp < captured.logs.length; lp++) {
                const parsed = JSON.parse(captured.logs[lp]);
                assert.isArray(parsed, "line " + lp + " should be a JSON array");
                assert.isString(parsed[0], "line " + lp + " should be tagged with an event name");
            }
            done();
        }, done.fail);
    });

    it("should open with start and close with end", (done: IDoneFn) => {
        const sink = makeSink();

        doAwait(runWithReporter(mixedSuite, createJsonStreamReporter({ console: sink }).listener, sink), (captured: ICaptureSink) => {
            const first = JSON.parse(captured.logs[0]);
            const last = JSON.parse(captured.logs[captured.logs.length - 1]);

            assert.equal(first[0], "start");
            assert.equal(last[0], "end");
            done();
        }, done.fail);
    });

    it("should announce a total in the start event matching the tests it then streams", (done: IDoneFn) => {
        const sink = makeSink();

        doAwait(runWithReporterAndSummary(mixedSuite, createJsonStreamReporter({ console: sink }).listener, sink), (result) => {
            const events = result.sink.logs.map((line) => JSON.parse(line));
            const start = events[0];
            const perTest = events.filter((evt) => evt[0] !== "start" && evt[0] !== "end");

            assert.equal(start[1].total, result.summary.total, "the announced total should match the runner's");
            assert.equal(perTest.length, result.summary.total, "one event per counted test should follow");
            done();
        }, done.fail);
    });
});
