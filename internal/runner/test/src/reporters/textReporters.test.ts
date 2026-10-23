/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import {
    assert, IDoneFn, IListener,
    describe as selfDescribe, it as selfIt
} from "@nevware21/tripwire";
import { doAwait, IPromise } from "@nevware21/ts-async";
import { createListReporter } from "../../../src/reporters/listReporter";
import { createDotReporter } from "../../../src/reporters/dotReporter";
import { createMinReporter } from "../../../src/reporters/minReporter";
import { createProgressReporter } from "../../../src/reporters/progressReporter";
import { createDocReporter } from "../../../src/reporters/docReporter";
import { createMarkdownReporter } from "../../../src/reporters/markdownReporter";
import { makeSink, runWithReporter, runWithReporterAndSummary, ICaptureSink } from "../support/reporterHarness";

function mixedSuite() {
    selfDescribe("outer suite", () => {
        selfIt("passes", () => {});
        selfIt("fails", () => {
            throw new Error("boom");
        });
        selfIt.skip("skipped", () => {});
        selfDescribe("inner suite", () => {
            selfIt("nested pass", () => {});
        });
    });
}

function run(factory: (options: any) => { listener: IListener }, sink: ICaptureSink): IPromise<ICaptureSink> {
    return runWithReporter(mixedSuite, factory({ console: sink }).listener, sink);
}

describe("ListReporter", () => {
    it("should print one flat, fully-titled line per test", (done: IDoneFn) => {
        const sink = makeSink();

        doAwait(run(createListReporter, sink), (captured: ICaptureSink) => {
            const text = captured.text();

            assert.includes(text, "outer suite passes", "each line carries the full title");
            assert.includes(text, "outer suite inner suite nested pass", "including the nested suite path");
            done();
        }, done.fail);
    });

    it("should mark a skipped test as skipped", (done: IDoneFn) => {
        const sink = makeSink();

        doAwait(run(createListReporter, sink), (captured: ICaptureSink) => {
            const skippedLine = captured.lines().filter((line) => line.indexOf("skipped") !== -1 && line.indexOf("(skipped)") !== -1);

            assert.equal(skippedLine.length, 1, "the skipped test should be labelled");
            done();
        }, done.fail);
    });

    it("should print a summary agreeing with the runner's counts", (done: IDoneFn) => {
        const sink = makeSink();

        doAwait(runWithReporterAndSummary(mixedSuite, createListReporter({ console: sink }).listener, sink), (result) => {
            const text = result.sink.text();

            assert.includes(text, result.summary.passed + " passing");
            assert.includes(text, result.summary.failed + " failing");
            assert.includes(text, result.summary.skipped + " skipped");
            done();
        }, done.fail);
    });

    it("should print the failure details after the summary", (done: IDoneFn) => {
        const sink = makeSink();

        doAwait(run(createListReporter, sink), (captured: ICaptureSink) => {
            const errors = captured.errorText();

            assert.includes(errors, "fails", "the failing test should be named");
            assert.includes(errors, "boom", "and its message shown");
            done();
        }, done.fail);
    });
});

describe("DotReporter", () => {
    it("should print one mark per test and a summary", (done: IDoneFn) => {
        const sink = makeSink();

        doAwait(runWithReporterAndSummary(mixedSuite, createDotReporter({ console: sink }).listener, sink), (result) => {
            const text = result.sink.text();
            const marks = text.replace(/[^.!,]/g, "");

            assert.equal(marks.length, result.summary.total, "one mark per counted test");
            assert.includes(text, result.summary.passed + " passing");
            done();
        }, done.fail);
    });
});

describe("MinReporter", () => {
    it("should print only a summary and the failure details", (done: IDoneFn) => {
        const sink = makeSink();

        doAwait(runWithReporterAndSummary(mixedSuite, createMinReporter({ console: sink }).listener, sink), (result) => {
            const text = result.sink.text();

            assert.includes(text, result.summary.passed + " passing");
            assert.isFalse(text.indexOf("outer suite") !== -1, "no per-suite output should be printed");
            assert.includes(result.sink.errorText(), "boom", "failures are still detailed");
            done();
        }, done.fail);
    });
});

describe("ProgressReporter", () => {
    it("should redraw in place when the sink offers a raw write", (done: IDoneFn) => {
        const sink = makeSink();

        doAwait(run(createProgressReporter, sink), (captured: ICaptureSink) => {
            assert.isTrue(captured.writes.length > 0, "the bar should be redrawn via write");
            assert.includes(captured.writes.join(""), "\r", "redrawing uses a carriage return");
            done();
        }, done.fail);
    });

    it("should reach 100% by the end of the run", (done: IDoneFn) => {
        const sink = makeSink();

        doAwait(run(createProgressReporter, sink), (captured: ICaptureSink) => {
            // Every counted test has to produce a Test done event for the bar to fill -- the
            // over-counting fixed in finding 2.5 left it short of 100%.
            assert.includes(captured.writes.join("\n") + captured.text(), "100%", "the bar should complete");
            done();
        }, done.fail);
    });

    it("should fall back to logging each update when the sink has no write", (done: IDoneFn) => {
        const sink = makeSink();
        const noWriteSink: any = {
            logs: sink.logs,
            errors: sink.errors,
            log: sink.log,
            error: sink.error
        };

        doAwait(runWithReporter(mixedSuite, createProgressReporter({ console: noWriteSink }).listener, sink), (captured: ICaptureSink) => {
            assert.equal(captured.writes.length, 0, "nothing should have been written raw");
            assert.isTrue(captured.logs.length > 0, "updates should have been logged instead");
            done();
        }, done.fail);
    });
});

describe("DocReporter", () => {
    it("should emit nested sections mirroring the suite tree", (done: IDoneFn) => {
        const sink = makeSink();

        doAwait(run(createDocReporter, sink), (captured: ICaptureSink) => {
            const html = captured.text();

            assert.equal(html.split("<section class=\"suite\">").length - 1, 2, "one section per suite");
            assert.equal(html.split("</section>").length - 1, 2, "every section should be closed");
            assert.includes(html, "<h1>outer suite</h1>");
            assert.includes(html, "<h2>inner suite</h2>", "a nested suite gets the next heading level");
            done();
        }, done.fail);
    });

    it("should tag each test with its status", (done: IDoneFn) => {
        const sink = makeSink();

        doAwait(run(createDocReporter, sink), (captured: ICaptureSink) => {
            const html = captured.text();

            assert.includes(html, "<dl class=\"test passed\">");
            assert.includes(html, "<dl class=\"test failed\">");
            assert.includes(html, "<dl class=\"test skipped\">");
            done();
        }, done.fail);
    });

    it("should escape markup in a test title", (done: IDoneFn) => {
        const sink = makeSink();

        doAwait(runWithReporter(() => {
            selfDescribe("escaping", () => {
                selfIt("handles <b>markup</b> & entities", () => {});
            });
        }, createDocReporter({ console: sink }).listener, sink), (captured: ICaptureSink) => {
            const html = captured.text();

            assert.includes(html, "handles &lt;b&gt;markup&lt;/b&gt; &amp; entities");
            assert.isFalse(html.indexOf("<dt>handles <b>") !== -1, "raw markup must not reach the output");
            done();
        }, done.fail);
    });
});

describe("MarkdownReporter", () => {
    it("should open with a table of contents linking every suite", (done: IDoneFn) => {
        const sink = makeSink();

        doAwait(run(createMarkdownReporter, sink), (captured: ICaptureSink) => {
            const md = captured.text();

            assert.isTrue(md.indexOf("# TOC") === 0, "the document should open with the TOC");
            assert.includes(md, "- [outer suite](#outer-suite)");
            assert.includes(md, "- [inner suite](#inner-suite)");
            done();
        }, done.fail);
    });

    it("should head each suite at a level matching its nesting", (done: IDoneFn) => {
        const sink = makeSink();

        doAwait(run(createMarkdownReporter, sink), (captured: ICaptureSink) => {
            const lines = captured.lines();

            assert.includes(lines, "# outer suite");
            assert.includes(lines, "## inner suite");
            done();
        }, done.fail);
    });

    it("should list every test with a status marker", (done: IDoneFn) => {
        const sink = makeSink();

        doAwait(runWithReporterAndSummary(mixedSuite, createMarkdownReporter({ console: sink }).listener, sink), (result) => {
            const listed = result.sink.lines().filter((line) => line.indexOf(" - ") === 0);

            assert.equal(listed.length, result.summary.total, "every counted test should be listed");
            assert.isTrue(listed.some((line) => line.indexOf("✓") !== -1), "a passing marker should appear");
            assert.isTrue(listed.some((line) => line.indexOf("✗") !== -1), "a failing marker should appear");
            assert.isTrue(listed.some((line) => line.indexOf("-") !== -1), "a skipped marker should appear");
            done();
        }, done.fail);
    });
});
