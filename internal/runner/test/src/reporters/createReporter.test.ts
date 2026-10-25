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
import { createReporter, REPORTER_NAMES } from "../../../src/reporters/createReporter";
import { createConsoleReporter } from "../../../src/reporters/consoleReporter";
import { makeSink, runWithReporter, ICaptureSink } from "../support/reporterHarness";

/**
 * Strips the timings two otherwise-identical runs will never agree on -- including the
 * surrounding whitespace, since a run fast enough to measure 0ms has the segment omitted
 * altogether rather than printed as zero.
 */
function withoutTimings(text: string): string {
    return text.replace(/\s*\(?\d+(\.\d+)?(ms|s)\)?/g, "");
}

describe("createReporter", () => {
    it("should return a listener for every name it advertises", () => {
        for (let lp = 0; lp < REPORTER_NAMES.length; lp++) {
            const reporter = createReporter(REPORTER_NAMES[lp], { console: makeSink() });

            assert.isObject(reporter, REPORTER_NAMES[lp] + " should produce a reporter");
            assert.isObject(reporter.listener, REPORTER_NAMES[lp] + " should expose a listener");
        }
    });

    it("should advertise every name it actually dispatches on", () => {
        // A name reaching the `default` branch is indistinguishable from an unknown one, so the
        // only way to notice a reporter that was added to REPORTER_NAMES but never wired into
        // the switch is to compare its output against spec's.
        const specSink = makeSink();
        const specReporter = createReporter("spec", { console: specSink });

        for (let lp = 0; lp < REPORTER_NAMES.length; lp++) {
            const name = REPORTER_NAMES[lp];
            if (name === "spec") {
                continue;
            }

            const reporter = createReporter(name, { console: makeSink() });
            assert.isFalse(reporter.listener === specReporter.listener, name + " should not fall through to spec");
        }
    });

    // The CLI validates `--reporter` before this is reached, so an unknown name only arrives
    // from a programmatic caller -- which used to be handed spec's output with nothing said
    // about the name it actually passed.
    it("should warn on the console when the name is unknown", () => {
        const sink = makeSink();

        createReporter("no-such-reporter", { console: sink });

        assert.equal(sink.errors.length, 1, "exactly one warning should be emitted");
        assert.includes(sink.errorText(), "Unknown reporter 'no-such-reporter'");
        assert.includes(sink.errorText(), "falling back to 'spec'");
        assert.includes(sink.errorText(), "tap", "the message should list the valid names");
    });

    it("should not warn for any advertised name", () => {
        for (let lp = 0; lp < REPORTER_NAMES.length; lp++) {
            const sink = makeSink();

            createReporter(REPORTER_NAMES[lp], { console: sink });
            assert.equal(sink.errors.length, 0, REPORTER_NAMES[lp] + " is a valid name and should not warn");
        }
    });

    it("should not warn when no name is given, since spec is the documented default", () => {
        const sink = makeSink();

        createReporter(undefined, { console: sink });
        assert.equal(sink.errors.length, 0, "omitting the name is not a mistake");
    });

    it("should fall back to the spec reporter for an unknown or missing name", (done: IDoneFn) => {
        const fallbackSink = makeSink();
        const specSink = makeSink();

        const define = () => {
            selfDescribe("fallback suite", () => {
                selfIt("a test", () => {});
            });
        };

        doAwait(runWithReporter(define, createReporter("no-such-reporter", { console: fallbackSink }).listener, fallbackSink), () => {
            doAwait(runWithReporter(define, createConsoleReporter({ console: specSink }).listener, specSink), () => {
                assert.equal(withoutTimings(fallbackSink.text()), withoutTimings(specSink.text()), "an unknown name should behave exactly like spec");
                done();
            }, done.fail);
        }, done.fail);
    });

    it("should fall back to spec when given no name at all", (done: IDoneFn) => {
        const sink = makeSink();

        doAwait(runWithReporter(() => {
            selfDescribe("undefined name suite", () => {
                selfIt("a test", () => {});
            });
        }, createReporter(undefined, { console: sink }).listener, sink), (captured: ICaptureSink) => {
            assert.includes(captured.text(), "undefined name suite", "spec prints suite titles");
            assert.includes(captured.text(), "passing", "spec prints a summary line");
            done();
        }, done.fail);
    });

    it("should drive every reporter through a full run without throwing", (done: IDoneFn) => {
        const names = REPORTER_NAMES.slice();

        const runNext = (index: number) => {
            if (index >= names.length) {
                done();
                return;
            }

            const name = names[index];
            const sink = makeSink();

            doAwait(runWithReporter(() => {
                selfDescribe("coverage suite", () => {
                    selfIt("passes", () => {});
                    selfIt("fails", () => {
                        throw new Error("boom");
                    });
                    selfIt.skip("skipped", () => {});
                    selfIt("pending");
                });
            }, createReporter(name, { console: sink }).listener, sink), () => {
                const produced = sink.logs.length + sink.errors.length + sink.writes.length;
                assert.isTrue(produced > 0, name + " should have produced some output");
                runNext(index + 1);
            }, done.fail);
        };

        runNext(0);
    });

    it("should give each call its own independent reporter instance", () => {
        const first = createReporter("tap", { console: makeSink() });
        const second = createReporter("tap", { console: makeSink() });

        assert.isFalse(first === second, "each call should return a new reporter");
        assert.isFalse(first.listener === second.listener, "each call should return a new listener");
    });
});
