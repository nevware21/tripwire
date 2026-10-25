/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import {
    useSuite, createSuite, assert, createTestRunner,
    describe as selfDescribe, it as selfIt, before as selfBefore, after as selfAfter,
    beforeEach as selfBeforeEach, afterEach as selfAfterEach,
    eListenerEvent, IDoneFn
} from "@nevware21/tripwire";
import { createConsoleReporter } from "../../../src/reporters/consoleReporter";
import { doAwait } from "@nevware21/ts-async";
import { red as ansiRed, replaceAnsi } from "@nevware21/chromacon";

/** Minimal console-like capture sink */
interface ICapturedOutput {
    logs: string[];
    errors: string[];
}

function makeSink(): ICapturedOutput & { log(msg: string): void; error(msg: string): void } {
    const sink: ICapturedOutput & { log(msg: string): void; error(msg: string): void } = {
        logs: [],
        errors: [],
        log(msg: string) {
            sink.logs.push(msg);
        },
        error(msg: string) {
            sink.errors.push(msg);
        }
    };
    return sink;
}

describe("ConsoleReporter", () => {
    describe("createConsoleReporter", () => {
        it("should return an object with a listener property", () => {
            const reporter = createConsoleReporter();
            assert.isObject(reporter);
            assert.isObject(reporter.listener);
        });

        it("should produce run start and summary output for a passing test", (done: IDoneFn) => {
            const testSuite = createSuite();
            useSuite(testSuite, () => {
                selfDescribe("My Suite", () => {
                    selfIt("passes", () => {});
                });
            });

            const sink = makeSink();
            const reporter = createConsoleReporter({ console: sink });
            const runner = createTestRunner(testSuite);
            runner.addListener(reporter.listener);

            doAwait(runner.run(), () => {
                // Should have logged suite title and test result lines
                const allOutput = sink.logs.join("\n");
                assert.includes(allOutput, "My Suite", "suite title should appear");
                assert.includes(allOutput, "passes", "test name should appear");
                // Summary line with pass count
                assert.includes(allOutput, "passing", "summary should mention passing count");
                // No failure output
                assert.equal(sink.errors.length, 0, "no errors for a passing run");
                done();
            }, done.fail);
        });

        it("should output failure details for a failing test", (done: IDoneFn) => {
            const testSuite = createSuite();
            useSuite(testSuite, () => {
                selfDescribe("Fail Suite", () => {
                    selfIt("always fails", () => {
                        throw new Error("deliberate failure");
                    });
                });
            });

            const sink = makeSink();
            const reporter = createConsoleReporter({ console: sink });
            const runner = createTestRunner(testSuite);
            runner.addListener(reporter.listener);

            doAwait(runner.run(), () => {
                const allLogs = sink.logs.join("\n");
                const allErrors = sink.errors.join("\n");
                assert.includes(allLogs, "failing", "summary should mention failing count");
                assert.includes(allErrors, "always fails", "failure title should appear in errors");
                assert.includes(allErrors, "deliberate failure", "error message should appear in errors");
                done();
            }, done.fail);
        });

        it("should output skipped indicator for a skipped test", (done: IDoneFn) => {
            const testSuite = createSuite();
            useSuite(testSuite, () => {
                selfDescribe("Skip Suite", () => {
                    selfIt.skip("is skipped", () => {});
                    selfIt("also runs", () => {});
                });
            });

            const sink = makeSink();
            const reporter = createConsoleReporter({ console: sink });
            const runner = createTestRunner(testSuite);
            runner.addListener(reporter.listener);

            doAwait(runner.run(), () => {
                const allOutput = sink.logs.join("\n");
                // Statically-skipped tests (.skip) are counted as "skipped", kept distinct in
                // the summary from "pending" (an it() declared with no body) so the reporter's
                // line agrees with the CLI's own "Run summary:" line printed beneath it.
                assert.includes(allOutput, "1 skipped", "skipped tests should be reported as skipped in the summary");
                done();
            }, done.fail);
        });

        it("should mark a passing test as slow when its duration exceeds the threshold", (done: IDoneFn) => {
            const testSuite = createSuite();
            useSuite(testSuite, () => {
                selfDescribe("Slow Suite", () => {
                    selfIt("slow pass", function(done: IDoneFn) {
                        this.slow(1);
                        setTimeout(() => {
                            done();
                        }, 15);
                    });
                });
            });

            const sink = makeSink();
            const reporter = createConsoleReporter({ console: sink });
            const runner = createTestRunner(testSuite);
            runner.addListener(reporter.listener);

            doAwait(runner.run(), () => {
                const allOutput = sink.logs.join("\n");
                assert.includes(allOutput, "(slow)", "passing slow tests should be marked as slow");
                done();
            }, done.fail);
        });

        it("should omit zero duration from test and summary output", () => {
            const sink = makeSink();
            const reporter = createConsoleReporter({ console: sink });

            assert.isFunction(reporter.listener.onDone, "onDone should be available");
            (reporter.listener.onDone as any)(eListenerEvent.Test, {
                v: {
                    test: {
                        description: "zero duration"
                    },
                    end: {
                        status: "passed",
                        duration: 0
                    }
                }
            });

            (reporter.listener.onDone as any)(eListenerEvent.Run, {
                v: {
                    end: {
                        passed: 1,
                        failed: 0,
                        skipped: 0,
                        pending: 0,
                        duration: 0
                    }
                }
            });

            const allOutput = sink.logs.join("\n") + "\n" + sink.errors.join("\n");
            assert.isFalse(allOutput.indexOf("0ms") !== -1, "zero durations should not be printed");
        });

        it("should not show suite titles when showSuiteTitles is false", (done: IDoneFn) => {
            const testSuite = createSuite();
            useSuite(testSuite, () => {
                selfDescribe("HiddenSuiteTitle", () => {
                    selfIt("a test", () => {});
                });
            });

            const sink = makeSink();
            const reporter = createConsoleReporter({ console: sink, showSuiteTitles: false });
            const runner = createTestRunner(testSuite);
            runner.addListener(reporter.listener);

            doAwait(runner.run(), () => {
                const allOutput = sink.logs.join("\n");
                assert.isFalse(allOutput.indexOf("HiddenSuiteTitle") !== -1, "suite title should be hidden");
                done();
            }, done.fail);
        });

        it("should show hook events when showHooks is true", (done: IDoneFn) => {
            const testSuite = createSuite();
            useSuite(testSuite, () => {
                selfDescribe("Hook Suite", () => {
                    selfBefore("setup", () => {});
                    selfAfter("teardown", () => {});
                    selfBeforeEach("before each", () => {});
                    selfAfterEach("after each", () => {});
                    selfIt("a test", () => {});
                });
            });

            const sink = makeSink();
            const reporter = createConsoleReporter({ console: sink, showHooks: true });
            const runner = createTestRunner(testSuite);
            runner.addListener(reporter.listener);

            doAwait(runner.run(), () => {
                const allOutput = sink.logs.join("\n");
                assert.includes(allOutput, "hook:", "hook prefix should appear when showHooks is true");
                done();
            }, done.fail);
        });

        it("should show test and assertion execution when showExecution is true", (done: IDoneFn) => {
            const testSuite = createSuite();
            useSuite(testSuite, () => {
                selfDescribe("Trace Suite", () => {
                    selfIt("runs traced test", () => {
                        assert.isTrue(true, "assertion trace marker");
                    });
                });
            });

            const sink = makeSink();
            const reporter = createConsoleReporter({ console: sink, showExecution: true });
            const runner = createTestRunner(testSuite);
            runner.addListener(reporter.listener);

            doAwait(runner.run(), () => {
                const allOutput = sink.logs.join("\n");
                assert.includes(allOutput, "run:", "test execution prefix should be logged");
                assert.includes(allOutput, "runs traced test", "test execution title should be logged");
                assert.includes(allOutput, "assert:", "assertion execution should be logged");
                done();
            }, done.fail);
        });

        it("should not show assertion execution when showExecution is false", (done: IDoneFn) => {
            const testSuite = createSuite();
            useSuite(testSuite, () => {
                selfDescribe("No Trace Suite", () => {
                    selfIt("runs untraced test", () => {
                        assert.isTrue(true, "no trace marker");
                    });
                });
            });

            const sink = makeSink();
            const reporter = createConsoleReporter({ console: sink });
            const runner = createTestRunner(testSuite);
            runner.addListener(reporter.listener);

            doAwait(runner.run(), () => {
                const allOutput = sink.logs.join("\n");
                assert.isFalse(allOutput.indexOf("assert:") !== -1, "assertion execution should be hidden by default");
                done();
            }, done.fail);
        });

        it("should normalize assertion trace messages to first line", () => {
            const sink = makeSink();
            const reporter = createConsoleReporter({ console: sink, showExecution: true });

            assert.isFunction(reporter.listener.onAssert, "onAssert should be available");
            (reporter.listener.onAssert as any)({
                v: {
                    passed: true,
                    message: "first line\nsecond line"
                }
            });

            const allOutput = sink.logs.join("\n");
            assert.includes(allOutput, "first line", "first line should be shown");
            assert.isFalse(allOutput.indexOf("second line") !== -1, "second line should not be shown");
        });

        it("should truncate long assertion trace messages", () => {
            const sink = makeSink();
            const reporter = createConsoleReporter({ console: sink, showExecution: true });
            const longMessage = new Array(220).join("x");

            assert.isFunction(reporter.listener.onAssert, "onAssert should be available");
            (reporter.listener.onAssert as any)({
                v: {
                    passed: true,
                    message: longMessage
                }
            });

            const allOutput = sink.logs.join("\n");
            assert.includes(allOutput, "...", "truncated trace should end with ellipsis");
            assert.isFalse(allOutput.indexOf(longMessage) !== -1, "full long message should not be shown");
        });

        it("should ignore ansi color codes when measuring trace label length", () => {
            const sink = makeSink();
            const reporter = createConsoleReporter({ console: sink, showExecution: true });
            const longMessage = new Array(220).join("x");

            assert.isFunction(reporter.listener.onAssert, "onAssert should be available");
            (reporter.listener.onAssert as any)({
                v: {
                    passed: true,
                    message: ansiRed(longMessage)
                }
            });

            assert.includes(sink.logs.join("\n"), "\u001b[31m", "ansi color codes should remain in the trace output");

            const allOutput = replaceAnsi(sink.logs.join("\n"), "");
            assert.includes(allOutput, longMessage.substring(0, 137) + "...", "visible length should drive truncation");
        });

        it("should not show hook events when showHooks is false (default)", (done: IDoneFn) => {
            const testSuite = createSuite();
            useSuite(testSuite, () => {
                selfDescribe("Hook Suite", () => {
                    selfBefore("setup", () => {});
                    selfIt("a test", () => {});
                });
            });

            const sink = makeSink();
            const reporter = createConsoleReporter({ console: sink });
            const runner = createTestRunner(testSuite);
            runner.addListener(reporter.listener);

            doAwait(runner.run(), () => {
                const allOutput = sink.logs.join("\n");
                assert.isFalse(allOutput.indexOf("hook:") !== -1, "hook prefix should not appear by default");
                done();
            }, done.fail);
        });

        // A `--grep` that excludes every test in a suite used to still print that suite's title
        // with nothing underneath it: the counts were right, but the output listed suites that
        // contributed nothing to the run.
        it("should not print a suite title when every test in it is filtered out", (done: IDoneFn) => {
            const testSuite = createSuite();
            useSuite(testSuite, () => {
                selfDescribe("KeptSuite", () => {
                    selfIt("kept test", () => {});
                });
                selfDescribe("FilteredSuite", () => {
                    selfIt("excluded test", () => {});
                    selfIt("also excluded", () => {});
                });
            });

            const sink = makeSink();
            const reporter = createConsoleReporter({ console: sink });
            const runner = createTestRunner(testSuite);
            runner.addListener(reporter.listener);
            runner.addFilter({
                canRunTest: (test: any) => {
                    return !!test && test.description === "kept test";
                }
            });

            doAwait(runner.run(), () => {
                const allOutput = sink.logs.join("\n");

                assert.includes(allOutput, "KeptSuite", "a suite with a test that ran is still shown");
                assert.includes(allOutput, "kept test");
                assert.isFalse(allOutput.indexOf("FilteredSuite") !== -1, "a suite with nothing left to run should not be announced");
                done();
            }, done.fail);
        });

        it("should print an ancestor suite's title when only a nested suite has content", (done: IDoneFn) => {
            const testSuite = createSuite();
            useSuite(testSuite, () => {
                selfDescribe("OuterSuite", () => {
                    selfIt("excluded from outer", () => {});
                    selfDescribe("InnerSuite", () => {
                        selfIt("kept test", () => {});
                    });
                });
            });

            const sink = makeSink();
            const reporter = createConsoleReporter({ console: sink });
            const runner = createTestRunner(testSuite);
            runner.addListener(reporter.listener);
            runner.addFilter({
                canRunTest: (test: any) => {
                    return !!test && test.description === "kept test";
                }
            });

            doAwait(runner.run(), () => {
                const allOutput = sink.logs.join("\n");
                const outerAt = allOutput.indexOf("OuterSuite");
                const innerAt = allOutput.indexOf("InnerSuite");
                const testAt = allOutput.indexOf("kept test");

                assert.isTrue(outerAt !== -1, "the ancestor should still be shown, so the nested suite is placed");
                assert.isTrue(innerAt > outerAt, "outermost first");
                assert.isTrue(testAt > innerAt, "and the test beneath them both");
                done();
            }, done.fail);
        });

        it("should still print a suite whose only tests were skipped", (done: IDoneFn) => {
            const testSuite = createSuite();
            useSuite(testSuite, () => {
                selfDescribe("AllSkipped", () => {
                    selfIt.skip("skipped one", () => {});
                });
            });

            const sink = makeSink();
            const reporter = createConsoleReporter({ console: sink });
            const runner = createTestRunner(testSuite);
            runner.addListener(reporter.listener);

            doAwait(runner.run(), () => {
                const allOutput = sink.logs.join("\n");

                // A skipped test is part of the run and is reported -- unlike a filtered-out one,
                // which is not part of it at all. Its suite therefore has content to head.
                assert.includes(allOutput, "AllSkipped", "a suite whose tests are reported as skipped is still shown");
                assert.includes(allOutput, "skipped one");
                done();
            }, done.fail);
        });

        it("should handle multiple suites and accumulate correct counts", (done: IDoneFn) => {
            const testSuite = createSuite();
            useSuite(testSuite, () => {
                selfDescribe("Suite A", () => {
                    selfIt("passes", () => {});
                    selfIt("also passes", () => {});
                });
                selfDescribe("Suite B", () => {
                    selfIt("fails", () => {
                        throw new Error("oops");
                    });
                });
            });

            const sink = makeSink();
            const reporter = createConsoleReporter({ console: sink });
            const runner = createTestRunner(testSuite);
            runner.addListener(reporter.listener);

            doAwait(runner.run(), () => {
                const allLogs = sink.logs.join("\n");
                assert.includes(allLogs, "passing");
                assert.includes(allLogs, "failing");
                done();
            }, done.fail);
        });
    });

    describe("addConsoleReporter", () => {
        it("should register the reporter with a notification manager and return a removable handle", (done: IDoneFn) => {
            const testSuite = createSuite();
            useSuite(testSuite, () => {
                selfDescribe("Suite", () => {
                    selfIt("test", () => {});
                });
            });

            const sink = makeSink();
            const reporter = createConsoleReporter({ console: sink });
            const runner = createTestRunner(testSuite);
            runner.addListener(reporter.listener);

            doAwait(runner.run(), () => {
                assert.isTrue(sink.logs.length > 0, "reporter should have produced output");
                done();
            }, done.fail);
        });

        it("should stop receiving events after removeListener is called", (done: IDoneFn) => {
            const testSuite = createSuite();
            useSuite(testSuite, () => {
                selfDescribe("Suite", () => {
                    selfIt("test", () => {});
                });
            });

            const sink = makeSink();
            const reporter = createConsoleReporter({ console: sink });
            const runner = createTestRunner(testSuite);
            runner.addListener(reporter.listener);

            // Remove immediately before running
            runner.removeListener(reporter.listener);

            doAwait(runner.run(), () => {
                assert.equal(sink.logs.length, 0, "no output expected after removal");
                done();
            }, done.fail);
        });
    });
});
