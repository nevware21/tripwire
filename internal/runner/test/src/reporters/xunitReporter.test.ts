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
import { createXunitReporter } from "../../../src/reporters/xunitReporter";
import { makeSink, runWithReporter, runWithReporterAndSummary, ICaptureSink } from "../support/reporterHarness";

function attr(xml: string, element: string, name: string): string | null {
    // eslint-disable-next-line security/detect-non-literal-regexp
    const match = new RegExp("<" + element + "\\b[^>]*\\b" + name + "=\"([^\"]*)\"").exec(xml);
    return match ? match[1] : null;
}

describe("XunitReporter", () => {
    it("should emit a well-formed testsuite document wrapping one testcase per test", (done: IDoneFn) => {
        const sink = makeSink();

        doAwait(runWithReporter(() => {
            selfDescribe("xunit suite", () => {
                selfIt("passes", () => {});
                selfIt("also passes", () => {});
            });
        }, createXunitReporter({ console: sink }).listener, sink), (captured: ICaptureSink) => {
            const xml = captured.text();

            assert.isTrue(xml.indexOf("<?xml version=\"1.0\" encoding=\"UTF-8\"?>") === 0, "should open with the XML declaration");
            assert.includes(xml, "<testsuite ");
            assert.includes(xml, "</testsuite>");
            assert.equal(xml.split("<testcase ").length - 1, 2, "one testcase per test");
            done();
        }, done.fail);
    });

    it("should report counts that agree with the runner's own summary", (done: IDoneFn) => {
        const sink = makeSink();

        doAwait(runWithReporterAndSummary(() => {
            selfDescribe("counted suite", () => {
                selfIt("passes", () => {});
                selfIt("fails", () => {
                    throw new Error("boom");
                });
                selfIt.skip("skipped", () => {});
                selfIt("pending");
            });
        }, createXunitReporter({ console: sink }).listener, sink), (result) => {
            const xml = result.sink.text();

            assert.equal(attr(xml, "testsuite", "tests"), String(result.summary.total), "tests attribute");
            assert.equal(attr(xml, "testsuite", "failures"), String(result.summary.failed), "failures attribute");
            // JUnit XML has a single `skipped` field, so this reporter deliberately merges the
            // two counts tripwire keeps apart -- unlike the spec reporter (see finding 2.4).
            assert.equal(attr(xml, "testsuite", "skipped"), String(result.summary.skipped + result.summary.pending),
                "skipped attribute merges skipped and pending, as the format requires");
            done();
        }, done.fail);
    });

    it("should use the supplied suite name", (done: IDoneFn) => {
        const sink = makeSink();

        doAwait(runWithReporter(() => {
            selfDescribe("named", () => {
                selfIt("a test", () => {});
            });
        }, createXunitReporter({ console: sink, suiteName: "My CI Run" }).listener, sink), (captured: ICaptureSink) => {
            assert.equal(attr(captured.text(), "testsuite", "name"), "My CI Run");
            done();
        }, done.fail);
    });

    it("should default the suite name when none is supplied", (done: IDoneFn) => {
        const sink = makeSink();

        doAwait(runWithReporter(() => {
            selfDescribe("unnamed", () => {
                selfIt("a test", () => {});
            });
        }, createXunitReporter({ console: sink }).listener, sink), (captured: ICaptureSink) => {
            assert.equal(attr(captured.text(), "testsuite", "name"), "Tripwire Tests");
            done();
        }, done.fail);
    });

    it("should escape the five XML entities in test names", (done: IDoneFn) => {
        const sink = makeSink();

        doAwait(runWithReporter(() => {
            selfDescribe("escaping", () => {
                selfIt("a < b && c > d with \"quotes\" and 'apostrophes'", () => {});
            });
        }, createXunitReporter({ console: sink }).listener, sink), (captured: ICaptureSink) => {
            const xml = captured.text();
            const name = attr(xml, "testcase", "name");

            assert.equal(name, "a &lt; b &amp;&amp; c &gt; d with &quot;quotes&quot; and &apos;apostrophes&apos;");
            // The raw characters must not survive anywhere in the attribute -- an unescaped
            // `"` alone ends the attribute early and corrupts the rest of the element.
            assert.isFalse(/name="[^"]*[<>]/.test(xml), "no raw angle brackets inside an attribute");
            done();
        }, done.fail);
    });

    it("should escape the suite name into the classname attribute", (done: IDoneFn) => {
        const sink = makeSink();

        doAwait(runWithReporter(() => {
            selfDescribe("suite <with> markup", () => {
                selfIt("a test", () => {});
            });
        }, createXunitReporter({ console: sink }).listener, sink), (captured: ICaptureSink) => {
            // The synthetic root suite ("root") is not part of the title -- the classname is
            // the suite path a user would recognise, and the same one --grep matches against.
            assert.equal(attr(captured.text(), "testcase", "classname"), "suite &lt;with&gt; markup");
            done();
        }, done.fail);
    });

    it("should emit a failure element carrying the message and a CDATA body", (done: IDoneFn) => {
        const sink = makeSink();

        doAwait(runWithReporter(() => {
            selfDescribe("failing", () => {
                selfIt("blows up", () => {
                    throw new Error("kaboom");
                });
            });
        }, createXunitReporter({ console: sink }).listener, sink), (captured: ICaptureSink) => {
            const xml = captured.text();

            assert.includes(xml, "<failure message=\"kaboom\">");
            assert.includes(xml, "<![CDATA[");
            assert.includes(xml, "</failure>");
            done();
        }, done.fail);
    });

    // `]]>` inside a CDATA section terminates it early; the fix is to split the section around
    // the sequence rather than to escape it (CDATA has no escapes).
    it("should split the CDATA section around a ]]> sequence in the error", (done: IDoneFn) => {
        const sink = makeSink();

        doAwait(runWithReporter(() => {
            selfDescribe("cdata", () => {
                selfIt("throws a terminator", () => {
                    const error = new Error("payload ]]> tail");
                    error.stack = "stack with ]]> inside";
                    throw error;
                });
            });
        }, createXunitReporter({ console: sink }).listener, sink), (captured: ICaptureSink) => {
            const xml = captured.text();
            const body = /<failure[^>]*>([\s\S]*?)<\/failure>/.exec(xml)![1];

            assert.includes(body, "]]]]><![CDATA[>", "the terminator should be split across two sections");
            assert.equal(body.indexOf("<![CDATA["), 0, "the body should still open with a CDATA section");
            assert.isTrue(body.lastIndexOf("]]>") === body.length - 3, "and still close with one");
            done();
        }, done.fail);
    });

    // Control characters are invalid in XML 1.0 even as a numeric reference, so a message
    // carrying an ANSI escape (0x1B) -- which assertion messages routinely do -- produced a
    // document Jenkins/JUnit parsers reject outright. There is no escape for them; they go.
    it("should strip control characters that XML cannot represent at all", (done: IDoneFn) => {
        const sink = makeSink();

        doAwait(runWithReporter(() => {
            selfDescribe("control chars", () => {
                selfIt("has an \u001b[31mansi escape\u001b[39m and a \u0000null", () => {
                    throw new Error("message with \u001b[31mcolour\u001b[39m and a \u0007bell");
                });
            });
        }, createXunitReporter({ console: sink }).listener, sink), (captured: ICaptureSink) => {
            const xml = captured.logs.join("\n");

            for (let cp = 0; cp < xml.length; cp++) {
                const code = xml.charCodeAt(cp);
                const invalid = (code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d) || code === 0xfffe || code === 0xffff;
                assert.isFalse(invalid, "character 0x" + code.toString(16) + " at " + cp + " is invalid in XML and should have been stripped");
            }
            assert.includes(xml, "ansi escape", "the readable text around it is kept");
            assert.includes(xml, "colour", "including inside the failure message attribute");
            assert.includes(xml, "bell", "and inside the CDATA body");
            done();
        }, done.fail);
    });

    it("should keep the whitespace XML does allow", (done: IDoneFn) => {
        const sink = makeSink();

        doAwait(runWithReporter(() => {
            selfDescribe("whitespace", () => {
                selfIt("fails", () => {
                    throw new Error("line one\nline\ttwo");
                });
            });
        }, createXunitReporter({ console: sink }).listener, sink), (captured: ICaptureSink) => {
            const body = /<failure[^>]*>([\s\S]*?)<\/failure>/.exec(captured.logs.join("\n"))![1];

            assert.includes(body, "line one\nline\ttwo", "tab, newline and carriage return are valid XML and must survive");
            done();
        }, done.fail);
    });

    it("should keep astral characters, whose surrogate pairs are valid XML", (done: IDoneFn) => {
        const sink = makeSink();

        doAwait(runWithReporter(() => {
            selfDescribe("astral", () => {
                selfIt("handles 🚀 an emoji", () => {});
            });
        }, createXunitReporter({ console: sink }).listener, sink), (captured: ICaptureSink) => {
            assert.equal(attr(captured.logs.join("\n"), "testcase", "name"), "handles 🚀 an emoji");
            done();
        }, done.fail);
    });

    it("should emit a self-closing skipped element for skipped and pending tests", (done: IDoneFn) => {
        const sink = makeSink();

        doAwait(runWithReporter(() => {
            selfDescribe("skips", () => {
                selfIt.skip("statically skipped", () => {});
                selfIt("no body");
            });
        }, createXunitReporter({ console: sink }).listener, sink), (captured: ICaptureSink) => {
            const xml = captured.text();

            assert.equal(xml.split("<skipped/>").length - 1, 2, "both should be marked skipped");
            done();
        }, done.fail);
    });

    it("should report durations in seconds to three decimal places", (done: IDoneFn) => {
        const sink = makeSink();

        doAwait(runWithReporter(() => {
            selfDescribe("timing", () => {
                selfIt("a test", () => {});
            });
        }, createXunitReporter({ console: sink }).listener, sink), (captured: ICaptureSink) => {
            const xml = captured.text();

            assert.isTrue(/<testsuite\b[^>]*\btime="\d+\.\d{3}"/.test(xml), "the suite time should be seconds.mmm");
            assert.isTrue(/<testcase\b[^>]*\btime="\d+\.\d{3}"/.test(xml), "each testcase time should be seconds.mmm");
            done();
        }, done.fail);
    });

    it("should not carry results over from a previous run", (done: IDoneFn) => {
        const sink = makeSink();
        const reporter = createXunitReporter({ console: sink });

        const define = () => {
            selfDescribe("reuse", () => {
                selfIt("only test", () => {});
            });
        };

        doAwait(runWithReporter(define, reporter.listener, sink), () => {
            sink.logs.length = 0;

            doAwait(runWithReporter(define, reporter.listener, sink), (captured: ICaptureSink) => {
                assert.equal(captured.text().split("<testcase ").length - 1, 1, "the second document should hold one testcase");
                done();
            }, done.fail);
        }, done.fail);
    });
});
