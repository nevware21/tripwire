/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { createPromise } from "@nevware21/ts-async";
import { ICachedValue, scheduleTimeout } from "@nevware21/ts-utils";
import { assert } from "../../../src/assert/assertClass";
import { withHost } from "../../../src/config/configHost";
import { AbortError } from "../../../src/errors/abortError";
import { SkipError } from "../../../src/errors/skipError";
import { IListener } from "../../../src/interfaces/IListener";
import { IListenerContext } from "../../../src/interfaces/IListenerContext";
import { INotifyResult } from "../../../src/interfaces/INotifyResult";
import { IRunnerMetrics } from "../../../src/interfaces/runner/IRunnerMetrics";
import { ITestRunner } from "../../../src/interfaces/runner/ITestRunner";
import { ITestContext } from "../../../src/interfaces/suite/ITestContext";
import { after as selfAfter } from "../../../src/suite/after";
import { afterEach as selfAfterEach } from "../../../src/suite/afterEach";
import { before as selfBefore } from "../../../src/suite/before";
import { beforeEach as selfBeforeEach } from "../../../src/suite/beforeEach";
import { createTestNameFilter } from "../../../src/suite/filters/nameFilter";
import { ITestFilter } from "../../../src/suite/interfaces/ITestFilter";
import { ITestSuite } from "../../../src/suite/interfaces/ITestSuite";
import { TestStatus } from "../../../src/suite/interfaces/ITestStatus";
import { it as selfIt } from "../../../src/suite/it";
import { createTestRunner } from "../../../src/suite/runner";
import { createSuite, describe as selfDescribe, useSuite } from "../../../src/suite/suite";
import { eListenerAction } from "../../../src/types/ListenerAction";
import { eListenerEvent, ListenerEvent } from "../../../src/types/ListenerEvent";

function wait(ms: number): Promise<void> {
    return createPromise<void>((resolve) => {
        scheduleTimeout(resolve, ms);
    }) as any;
}

function build(define: () => void): ITestSuite {
    const root = createSuite();
    useSuite(root, define);

    return root;
}

/**
 * A listener that answers with `action` for the start (or end) of events of one type whose context
 * satisfies `match`, and records every event it is handed.
 */
function answering(when: "start" | "done", type: ListenerEvent, action: eListenerAction, reason?: string, match?: (ctx: IListenerContext) => boolean): IListener & { events: string[] } {
    const listener: IListener & { events: string[] } = {
        events: [],
        onStart: (event: ListenerEvent, lazy: ICachedValue<IListenerContext>): INotifyResult | void => {
            listener.events.push("start:" + event);
            if (when === "start" && event === type && (!match || match(lazy.v))) {
                return { action, reason };
            }
        },
        onDone: (event: ListenerEvent, lazy: ICachedValue<IListenerContext>): INotifyResult | void => {
            listener.events.push("done:" + event);
            if (when === "done" && event === type && (!match || match(lazy.v))) {
                return { action, reason };
            }
        }
    };

    return listener;
}

describe("runner behaviour", () => {

    describe("metrics", () => {
        it("should report only the counters and an explanation when metrics were not requested", async () => {
            const root = build(() => {
                selfDescribe("suite", () => {
                    selfIt("passes", () => {});
                });
            });

            const runner = createTestRunner(root);
            await runner.run();
            const metrics = runner.getMetrics();

            assert.isString(metrics.message, "the disabled explanation is attached");
            assert.includes(metrics.message, "metrics: true");
            assert.equal(metrics.counts.tests, 1);
            assert.equal(metrics.counts.passed, 1);
            assert.equal(metrics.trace.length, 0, "no trace without full metrics");
            assert.equal(metrics.perTestWaitRatios.length, 0);
            assert.equal(metrics.executionMode, "sync");
        });

        it("should capture the trace, samples, wait ratios and the retry and timeout diagnostics", async () => {
            let midRun: IRunnerMetrics = null;
            let runner: ITestRunner;
            const root = build(() => {
                selfDescribe("same", () => {
                    selfDescribe("same", () => {
                        selfBeforeEach("setup", () => {});
                        selfIt("sync passes", () => {});
                        selfIt("sync passes", () => {});
                        selfIt("async passes", () => wait(2));
                        selfIt("reads metrics while running", () => {
                            midRun = runner.getMetrics();
                        });
                        selfIt("fails then passes", function (this: ITestContext) {
                            this.retries(1);
                            if ((this.currentTest as any)._attempt === undefined) {
                                (this.currentTest as any)._attempt = 1;
                                throw new Error("first attempt fails");
                            }
                        });
                        selfIt("times out", function (this: ITestContext) {
                            this.timeout(10);
                            return createPromise<void>(() => {
                                // never settles
                            });
                        });
                    });
                });
            });

            runner = createTestRunner(root, undefined, { metrics: true });
            await runner.run();
            const metrics = runner.getMetrics();

            assert.isUndefined(metrics.message, "full metrics carry no disabled explanation");
            assert.equal(metrics.executionMode, "mixed");
            assert.isTrue(metrics.trace.length > 0);
            assert.isTrue(metrics.counts.hooks > 0);
            assert.equal(metrics.counts.timedOut, 1);
            assert.equal(metrics.counts.retries, 1);
            assert.isTrue(metrics.counts.suites >= 2);

            assert.isTrue(metrics.perTestWaitRatios.length > 0, "per test wait ratios are collected");
            const asyncRatio = metrics.perTestWaitRatios.filter((item) => item.name === "async passes")[0];
            assert.isObject(asyncRatio);
            assert.isTrue(asyncRatio.totalExecutionTime >= 0);

            assert.isTrue(metrics.slowestExecutions.byDuration.length > 0);
            assert.isTrue(metrics.slowestExecutions.byWaitTime.length > 0);

            assert.equal(metrics.retryDiagnostics.totalRetries, 1);
            assert.equal(metrics.retryDiagnostics.tests.length, 1);
            assert.equal(metrics.retryDiagnostics.tests[0].name, "fails then passes");

            assert.equal(metrics.timeoutDiagnostics.totalTimeouts, 1);
            assert.equal(metrics.timeoutDiagnostics.hotspots.length, 1);
            assert.equal(metrics.timeoutDiagnostics.hotspots[0].timedOut, 1);

            const compression = metrics.traceCompression;
            assert.equal(compression.totalEvents, metrics.trace.length);
            assert.isTrue(compression.repeatedSignatures > 0, "the two identically named tests repeat a signature");
            assert.isTrue(compression.topPatterns.some((pattern) => pattern.maxRunLength >= 2), "the nested suites with one name start back to back");
            assert.isTrue(compression.compressionRatio > 0 && compression.compressionRatio <= 1);

            assert.isObject(midRun, "metrics can be read while the run is in progress");
            assert.isUndefined(midRun.runDuration, "the run had not ended yet");
            assert.isTrue(midRun.criticalPathDuration >= 0, "the critical path is derived from the trace so far");
            assert.isTrue(typeof metrics.runDuration === "number");
            assert.equal(metrics.criticalPathDuration, metrics.runDuration, "once the run has ended the critical path is its duration");
        });

        it("should stop tracing and sampling once the limits are reached and count what was dropped", async () => {
            const root = build(() => {
                selfDescribe("many", () => {
                    selfBeforeEach(() => {});
                    selfBeforeEach(() => {});
                    selfAfterEach(() => {});
                    selfAfterEach(() => {});
                    for (let lp = 0; lp < 2600; lp++) {
                        selfIt("test " + lp, () => {});
                    }
                });
            });

            const runner = createTestRunner(root, undefined, { metrics: true });
            await runner.run();
            const metrics = runner.getMetrics();

            assert.equal(metrics.counts.tests, 2600);
            assert.equal(metrics.counts.hooks, 2600 * 4);
            assert.equal(metrics.trace.length, 10000, "the trace is capped");
            assert.isTrue(metrics.droppedTraceEvents > 0, "events beyond the cap are counted, not stored");
            assert.equal(metrics.slowestExecutions.byDuration.length, 10, "the slowest executions are a top list, not every sample");
        });

        it("should report an unknown execution mode when nothing ran", async () => {
            const root = build(() => {
                selfDescribe("empty", () => {});
            });

            const runner = createTestRunner(root, undefined, { metrics: true });
            await runner.run();

            assert.equal(runner.getMetrics().executionMode, "unknown");
            assert.equal(runner.getMetrics().counts.tests, 0);
        });

        it("should rank timeout hotspots by how often they timed out", async () => {
            const root = build(() => {
                selfDescribe("slow", () => {
                    selfIt("hangs once", function (this: ITestContext) {
                        this.timeout(5);
                        return createPromise<void>(() => {
                            // never settles
                        });
                    });
                    selfIt("hangs twice", function (this: ITestContext) {
                        this.timeout(5);
                        this.retries(1);
                        return createPromise<void>(() => {
                            // never settles
                        });
                    });
                });
            });

            const runner = createTestRunner(root, undefined, { metrics: true });
            await runner.run();
            const diagnostics = runner.getMetrics().timeoutDiagnostics;

            assert.equal(diagnostics.totalTimeouts, 3);
            assert.equal(diagnostics.hotspots.length, 2);
            assert.equal(diagnostics.hotspots[0].name, "hangs twice", "the hotspot with the most timeouts comes first");
            assert.equal(diagnostics.hotspots[0].timedOut, 2);
            assert.equal(diagnostics.hotspots[1].timedOut, 1);
        });
    });

    describe("timeouts, slow thresholds and retries recorded on the test", () => {
        it("should use the values the suite definition recorded on each test", async () => {
            let seen: { timeout: number; slow: number; retries: number } = null;
            let attempts = 0;
            const root = build(() => {
                selfDescribe("configured", function () {
                    this.timeout(400);
                    this.slow(3);
                    this.retries(1);
                    selfIt("reads them", function (this: ITestContext) {
                        attempts++;
                        seen = { timeout: this.timeout(), slow: this.slow(), retries: this.retries() };
                        if (attempts === 1) {
                            throw new Error("first attempt");
                        }
                    });
                });
            });

            const test = root.suites[0].tests[0];
            assert.equal(test.timeout, 400);
            assert.equal(test.slow, 3);
            assert.equal(test.retries, 1);

            const runner = createTestRunner(root);
            await runner.run();

            assert.deepEqual(seen, { timeout: 400, slow: 3, retries: 1 });
            assert.equal(attempts, 2, "the recorded retries allow a second attempt");
            assert.equal(runner.getTestResult(test).status, TestStatus.Passed);
            assert.equal(runner.getTestResult(test).retries, 1);
        });

        it("should mark the suite timed out when its afterAll hook exceeds the timeout", async () => {
            const root = build(() => {
                selfDescribe("suite", function () {
                    this.timeout(10);
                    selfAfter("slow teardown", () => createPromise<void>(() => {
                        // never settles
                    }));
                    selfIt("passes", () => {});
                });
            });

            const runner = createTestRunner(root);
            await runner.run();

            const suiteResult = runner.getSuiteResult(root.suites[0]);
            assert.isTrue(suiteResult.timedOut);
            assert.equal(runner.getResults().passed, 1, "the tests had already passed");
            assert.equal(runner.getResults().hookFailures.length, 1);
            assert.equal(runner.getResults().hookFailures[0].name, "slow teardown");
        });
    });

    describe("hook sequencing", () => {
        it("should not run the hooks after one that failed", async () => {
            const calls: string[] = [];
            const root = build(() => {
                selfDescribe("suite", () => {
                    selfBeforeEach("first", () => {
                        calls.push("first");
                        throw new Error("first failed");
                    });
                    selfBeforeEach("second", () => {
                        calls.push("second");
                    });
                    selfIt("test", () => {
                        calls.push("test");
                    });
                });
            });

            const runner = createTestRunner(root);
            await runner.run();

            assert.deepEqual(calls, ["first"]);
            assert.equal(runner.getTestResult(root.suites[0].tests[0]).status, TestStatus.Failed);
        });

        it("should ignore a hook registration without a function", async () => {
            let ran = false;
            const root = build(() => {
                selfDescribe("suite", () => {
                    selfIt("test", () => {
                        ran = true;
                    });
                });
            });
            root.suites[0].beforeEachHooks.push({ name: "no function" } as any);
            root.suites[0].beforeEachHooks.push(null as any);

            const runner = createTestRunner(root);
            await runner.run();

            assert.isTrue(ran);
            assert.equal(runner.getResults().passed, 1);
        });
    });

    describe("listener faults", () => {
        it("should reject the run when a listener throws at the start of a suite, after reporting the run end", async () => {
            let runEnded = false;
            const root = build(() => {
                selfDescribe("suite", () => {
                    selfIt("never runs", () => {});
                });
            });

            const runner = createTestRunner(root);
            runner.addListener({
                onStart: (event: ListenerEvent) => {
                    if (event === eListenerEvent.Suite) {
                        throw new Error("suite listener fault");
                    }
                },
                onDone: (event: ListenerEvent) => {
                    if (event === eListenerEvent.Run) {
                        runEnded = true;
                    }
                }
            });

            let rejected: any = null;
            try {
                await runner.run();
            } catch (e) {
                rejected = e;
            }

            assert.isNotNull(rejected, "a fault in the runner's own notifications is a run failure");
            assert.equal(rejected.message, "suite listener fault");
            assert.isTrue(runEnded, "the run is still reported as ended");
            assert.equal(runner.getResults().passed, 0);
        });

        it("should reject the run when a listener throws at the start of a suite reached asynchronously", async () => {
            const executed: string[] = [];
            const root = build(() => {
                selfDescribe("first", () => {
                    selfIt("async passes", () => wait(2).then(() => {
                        executed.push("first");
                    }));
                });
                selfDescribe("second", () => {
                    selfIt("never runs", () => {
                        executed.push("second");
                    });
                });
            });

            const runner = createTestRunner(root);
            runner.addListener({
                onStart: (event: ListenerEvent, lazy: ICachedValue<IListenerContext>) => {
                    if (event === eListenerEvent.Suite && lazy.v.suite.description === "second") {
                        throw new Error("second suite listener fault");
                    }
                }
            });

            let rejected: any = null;
            try {
                await runner.run();
            } catch (e) {
                rejected = e;
            }

            assert.deepEqual(executed, ["first"]);
            assert.isNotNull(rejected);
            assert.equal(rejected.message, "second suite listener fault");
            assert.equal(runner.getResults().passed, 1, "what ran before the fault is still summarised");
        });

        it("should reject the run when a listener throws at the start of a test reached asynchronously", async () => {
            const root = build(() => {
                selfDescribe("suite", () => {
                    selfIt("async passes", () => wait(2));
                    selfIt("faulted", () => {});
                });
            });

            const runner = createTestRunner(root);
            runner.addListener({
                onStart: (event: ListenerEvent, lazy: ICachedValue<IListenerContext>) => {
                    if (event === eListenerEvent.Test && lazy.v.test.description === "faulted") {
                        throw new Error("async test listener fault");
                    }
                }
            });

            let rejected: any = null;
            try {
                await runner.run();
            } catch (e) {
                rejected = e;
            }

            assert.isNotNull(rejected);
            assert.equal(rejected.message, "async test listener fault");
            assert.equal(runner.getTestResult(root.suites[0].tests[0]).status, TestStatus.Passed);
        });

        it("should reject the run when a listener throws at the end of an asynchronous test", async () => {
            const root = build(() => {
                selfDescribe("suite", () => {
                    selfIt("async passes", () => wait(2));
                    selfIt("never runs", () => {});
                });
            });

            const runner = createTestRunner(root);
            runner.addListener({
                onDone: (event: ListenerEvent, lazy: ICachedValue<IListenerContext>) => {
                    if (event === eListenerEvent.Test && lazy.v.test.description === "async passes") {
                        throw new Error("test end listener fault");
                    }
                }
            });

            let rejected: any = null;
            try {
                await runner.run();
            } catch (e) {
                rejected = e;
            }

            assert.isNotNull(rejected);
            assert.equal(rejected.message, "test end listener fault");
            assert.equal(runner.getTestResult(root.suites[0].tests[1]).status, TestStatus.Pending, "the run stopped before the next test");
        });

        it("should reject the run when a listener throws at the start of a test", async () => {
            const root = build(() => {
                selfDescribe("suite", () => {
                    selfIt("never runs", () => {});
                });
            });

            const runner = createTestRunner(root);
            runner.addListener({
                onStart: (event: ListenerEvent) => {
                    if (event === eListenerEvent.Test) {
                        throw new Error("test listener fault");
                    }
                }
            });

            let rejected: any = null;
            try {
                await runner.run();
            } catch (e) {
                rejected = e;
            }

            assert.isNotNull(rejected);
            assert.equal(rejected.message, "test listener fault");
        });
    });

    describe("run level listener answers", () => {
        it("should run nothing when a listener skips the run", async () => {
            let executed = 0;
            const root = build(() => {
                selfDescribe("suite", () => {
                    selfIt("a", () => {
                        executed++;
                    });
                    selfIt("b", () => {
                        executed++;
                    });
                });
            });

            const runner = createTestRunner(root);
            const listener = answering("start", eListenerEvent.Run, eListenerAction.Skip, "skip the run");
            runner.addListener(listener);
            await runner.run();

            assert.equal(executed, 0);
            assert.isTrue(listener.events.indexOf("done:" + eListenerEvent.Run) >= 0, "the run is still reported as ended");
            const results = runner.getResults();
            assert.equal(results.total, 2);
            assert.equal(results.passed, 0);
            assert.equal(results.pending, 2, "the tests never reached a verdict");
            assert.isTrue(results.end >= results.start);
        });

        it("should run nothing when a listener aborts the run", async () => {
            let executed = 0;
            const root = build(() => {
                selfDescribe("suite", () => {
                    selfIt("a", () => {
                        executed++;
                    });
                });
            });

            const runner = createTestRunner(root);
            runner.addListener(answering("start", eListenerEvent.Run, eListenerAction.Abort, "abort the run"));
            await runner.run();

            assert.equal(executed, 0);
            assert.equal(runner.getResults().passed, 0);
        });
    });

    describe("hook level listener answers", () => {
        function hookNamed(name: string) {
            return (ctx: IListenerContext) => !!ctx.hook && ctx.hook.name === name;
        }

        it("should skip a hook the listener skips and still run the test", async () => {
            let hookRan = false;
            let testRan = false;
            const root = build(() => {
                selfDescribe("suite", () => {
                    selfBeforeEach("skip me", () => {
                        hookRan = true;
                    });
                    selfIt("test", () => {
                        testRan = true;
                    });
                });
            });

            const runner = createTestRunner(root);
            runner.addListener(answering("start", eListenerEvent.Hook, eListenerAction.Skip, undefined, hookNamed("skip me")));
            await runner.run();

            assert.isFalse(hookRan, "the skipped hook never runs");
            assert.isTrue(testRan, "the test is unaffected");
            assert.equal(runner.getResults().passed, 1);
        });

        it("should abort the test when the listener aborts a beforeEach hook, skipping what follows", async () => {
            let hookRan = false;
            let executed: string[] = [];
            const root = build(() => {
                selfDescribe("suite", () => {
                    selfBeforeEach("abort me", () => {
                        hookRan = true;
                    });
                    selfIt("first", () => {
                        executed.push("first");
                    });
                    selfIt("second", () => {
                        executed.push("second");
                    });
                });
            });

            const runner = createTestRunner(root);
            runner.addListener(answering("start", eListenerEvent.Hook, eListenerAction.Abort, "hook aborted", hookNamed("abort me")));
            await runner.run();

            assert.isFalse(hookRan);
            assert.deepEqual(executed, [], "neither test body runs");
            const first = runner.getTestResult(root.suites[0].tests[0]);
            assert.equal(first.status, TestStatus.Aborted);
            assert.isTrue(first.aborted);
            assert.ok(first.error instanceof AbortError);
            assert.equal(first.error.message, "hook aborted");
            const second = runner.getTestResult(root.suites[0].tests[1]);
            assert.equal(second.status, TestStatus.Skipped, "the remaining test is reported as never run");
            assert.isTrue(second.aborted);
            assert.equal(runner.getResults().failed, 1);
        });

        it("should skip the test when a listener throws a SkipError for its beforeEach hook", async () => {
            let testRan = false;
            const root = build(() => {
                selfDescribe("suite", () => {
                    selfBeforeEach("throws skip", () => {});
                    selfIt("test", () => {
                        testRan = true;
                    });
                });
            });

            const runner = createTestRunner(root);
            runner.addListener({
                onStart: (event: ListenerEvent, lazy: ICachedValue<IListenerContext>) => {
                    if (event === eListenerEvent.Hook && lazy.v.hook && lazy.v.hook.name === "throws skip") {
                        throw new SkipError("listener skipped the hook");
                    }
                }
            });
            await runner.run();

            assert.isFalse(testRan);
            const result = runner.getTestResult(root.suites[0].tests[0]);
            assert.equal(result.status, TestStatus.Skipped);
            assert.equal(runner.getResults().skipped, 1);
        });

        it("should fail the test when a listener throws for its beforeEach hook", async () => {
            let testRan = false;
            const root = build(() => {
                selfDescribe("suite", () => {
                    selfBeforeEach("throws", () => {});
                    selfIt("test", () => {
                        testRan = true;
                    });
                });
            });

            const runner = createTestRunner(root);
            runner.addListener({
                onStart: (event: ListenerEvent, lazy: ICachedValue<IListenerContext>) => {
                    if (event === eListenerEvent.Hook && lazy.v.hook && lazy.v.hook.name === "throws") {
                        throw new Error("listener exploded");
                    }
                }
            });
            await runner.run();

            assert.isFalse(testRan);
            const result = runner.getTestResult(root.suites[0].tests[0]);
            assert.equal(result.status, TestStatus.Failed);
            assert.equal(result.error.message, "listener exploded");
        });

        it("should abort when the listener aborts at the end of a hook", async () => {
            let testRan = false;
            const root = build(() => {
                selfDescribe("suite", () => {
                    selfBeforeEach("abort at end", () => {});
                    selfIt("test", () => {
                        testRan = true;
                    });
                });
            });

            const runner = createTestRunner(root);
            runner.addListener(answering("done", eListenerEvent.Hook, eListenerAction.Abort, "aborted at hook end", hookNamed("abort at end")));
            await runner.run();

            assert.isFalse(testRan);
            const result = runner.getTestResult(root.suites[0].tests[0]);
            assert.equal(result.status, TestStatus.Aborted);
            assert.equal(result.error.message, "aborted at hook end");
        });

        it("should fail the test when a listener throws at the end of its hook", async () => {
            const root = build(() => {
                selfDescribe("suite", () => {
                    selfBeforeEach("throws at end", () => {});
                    selfIt("test", () => {});
                });
            });

            const runner = createTestRunner(root);
            runner.addListener({
                onDone: (event: ListenerEvent, lazy: ICachedValue<IListenerContext>) => {
                    if (event === eListenerEvent.Hook && lazy.v.hook && lazy.v.hook.name === "throws at end") {
                        throw new Error("end listener exploded");
                    }
                }
            });
            await runner.run();

            const result = runner.getTestResult(root.suites[0].tests[0]);
            assert.equal(result.status, TestStatus.Failed);
            assert.equal(result.error.message, "end listener exploded");
        });

        it("should mark the suite aborted when the listener aborts its afterAll hook and report later siblings as unrun", async () => {
            let laterRan = false;
            const root = build(() => {
                selfDescribe("first", () => {
                    selfAfter("teardown", () => {});
                    selfIt("passes", () => {});
                });
                selfDescribe("second", () => {
                    selfIt("never runs", () => {
                        laterRan = true;
                    });
                });
            });

            const runner = createTestRunner(root);
            runner.addListener(answering("done", eListenerEvent.Hook, eListenerAction.Abort, "teardown aborted", hookNamed("teardown")));
            await runner.run();

            const first = runner.getSuiteResult(root.suites[0]);
            assert.isTrue(first.aborted);
            assert.equal(first.reason, "teardown aborted");
            assert.isFalse(laterRan);
            const second = runner.getSuiteResult(root.suites[1]);
            assert.isTrue(second.aborted, "the sibling that never got to run is reported as aborted");
            const laterTest = runner.getTestResult(root.suites[1].tests[0]);
            assert.equal(laterTest.status, TestStatus.Skipped);
            assert.isTrue(laterTest.aborted);
            assert.equal(runner.getResults().passed, 1);
        });
    });

    describe("hooks that skip, fail or time out", () => {
        it("should skip the whole suite when a beforeAll hook calls this.skip() and still run afterAll", async () => {
            let executed = 0;
            let afterRan = false;
            const root = build(() => {
                selfDescribe("suite", () => {
                    selfBefore(function (this: ITestContext) {
                        this.skip();
                    });
                    selfAfter(() => {
                        afterRan = true;
                    });
                    selfIt("a", () => {
                        executed++;
                    });
                    selfIt("b", () => {
                        executed++;
                    });
                });
            });

            const runner = createTestRunner(root);
            const listener = answering("start", eListenerEvent.Run, eListenerAction.Continue);
            runner.addListener(listener);
            await runner.run();

            assert.equal(executed, 0);
            assert.isTrue(afterRan, "afterAll still runs for a skipped suite");
            const suiteResult = runner.getSuiteResult(root.suites[0]);
            assert.isTrue(suiteResult.skipped);
            assert.isTrue(suiteResult.duration >= 0);
            assert.equal(runner.getResults().skipped, 2);
            assert.equal(listener.events.filter((event) => event === "done:" + eListenerEvent.Test).length, 2, "every test is still reported");
            assert.equal(listener.events.filter((event) => event === "done:" + eListenerEvent.Suite).length, 1, "the suite is closed");
            assert.isUndefined(runner.getResults().hookFailures, "a skip is not a hook failure");
        });

        it("should mark the suite timed out when a beforeAll hook exceeds the suite timeout", async () => {
            let executed = 0;
            const root = build(() => {
                selfDescribe("suite", function () {
                    this.timeout(10);
                    selfBefore("slow setup", () => createPromise<void>(() => {
                        // never settles
                    }));
                    selfIt("a", () => {
                        executed++;
                    });
                });
                selfDescribe("sibling", () => {
                    selfIt("still runs", () => {
                        executed++;
                    });
                });
            });

            const runner = createTestRunner(root);
            await runner.run();

            assert.equal(executed, 1, "the sibling suite is unaffected");
            const suiteResult = runner.getSuiteResult(root.suites[0]);
            assert.isTrue(suiteResult.timedOut);
            assert.isFalse(!!suiteResult.aborted);
            const results = runner.getResults();
            assert.equal(results.skipped, 1);
            assert.equal(results.passed, 1);
            assert.equal(results.hookFailures.length, 1);
            assert.equal(results.hookFailures[0].name, "slow setup");
            assert.isTrue(results.hookFailures[0].timedOut);
        });

        it("should skip the test when a beforeEach hook calls this.skip()", async () => {
            let testRan = false;
            const root = build(() => {
                selfDescribe("suite", () => {
                    selfBeforeEach(function (this: ITestContext) {
                        this.skip();
                    });
                    selfIt("test", () => {
                        testRan = true;
                    });
                });
            });

            const runner = createTestRunner(root);
            await runner.run();

            assert.isFalse(testRan);
            const result = runner.getTestResult(root.suites[0].tests[0]);
            assert.equal(result.status, TestStatus.Skipped);
            assert.ok(result.error instanceof SkipError);
        });

        it("should fail a passing test when its afterEach hook fails", async () => {
            const root = build(() => {
                selfDescribe("suite", () => {
                    selfAfterEach("broken teardown", () => {
                        throw new Error("teardown failed");
                    });
                    selfIt("passes", () => {});
                });
            });

            const runner = createTestRunner(root);
            await runner.run();

            const result = runner.getTestResult(root.suites[0].tests[0]);
            assert.equal(result.status, TestStatus.Failed);
            assert.equal(result.error.message, "teardown failed");
            assert.equal(runner.getResults().hookFailures.length, 1);
            assert.equal(runner.getResults().hookFailures[0].test, "passes");
        });

        it("should skip a passing test when its afterEach hook calls this.skip()", async () => {
            const root = build(() => {
                selfDescribe("suite", () => {
                    selfAfterEach(function (this: ITestContext) {
                        this.skip();
                    });
                    selfIt("passes", () => {});
                });
            });

            const runner = createTestRunner(root);
            await runner.run();

            const result = runner.getTestResult(root.suites[0].tests[0]);
            assert.equal(result.status, TestStatus.Skipped);
        });
    });

    describe("test level abort", () => {
        it("should stop the remaining tests of the suite and report them, honouring an active filter", async () => {
            const executed: string[] = [];
            const root = build(() => {
                selfDescribe("suite", () => {
                    selfIt("alpha", () => {
                        executed.push("alpha");
                    });
                    selfIt("beta", () => {
                        executed.push("beta");
                    });
                    selfIt("charlie", () => {
                        executed.push("charlie");
                    });
                    selfDescribe("child", () => {
                        selfIt("delta", () => {
                            executed.push("delta");
                        });
                    });
                });
            });

            const runner = createTestRunner(root);
            runner.addFilter(createTestNameFilter(["alpha", "charlie", "delta"]));
            const listener = answering("done", eListenerEvent.Test, eListenerAction.Abort, "alpha aborted", (ctx) => !!ctx.test && ctx.test.description === "alpha");
            runner.addListener(listener);
            await runner.run();

            assert.deepEqual(executed, ["alpha"]);
            const tests = root.suites[0].tests;
            assert.equal(runner.getTestResult(tests[0]).status, TestStatus.Aborted);
            assert.isUndefined(runner.getTestResult(tests[1]), "the filtered out test is neither run nor reported, so it has no result");
            assert.equal(runner.getTestResult(tests[2]).status, TestStatus.Skipped);
            assert.isTrue(runner.getTestResult(tests[2]).aborted);
            assert.equal(runner.getTestResult(tests[2]).reason, "alpha aborted");
            assert.equal(runner.getTestResult(root.suites[0].suites[0].tests[0]).status, TestStatus.Skipped, "child suites are reported as unrun too");
            assert.equal(listener.events.filter((event) => event === "done:" + eListenerEvent.Test).length, 3, "alpha, charlie and delta are reported, beta is not part of the run");
            const results = runner.getResults();
            assert.equal(results.total, 3);
            assert.equal(results.failed, 1);
            assert.equal(results.skipped, 2);
        });
    });

    describe("abort from the test end event", () => {
        it("should count the test as aborted, not as the pass it reported", async () => {
            let reportedStatus: string = null;
            const root = build(() => {
                selfDescribe("suite", () => {
                    selfIt("passes then is aborted", () => {});
                    selfIt("never runs", () => {});
                });
            });

            const runner = createTestRunner(root, undefined, { metrics: true });
            runner.addListener({
                onDone: (event: ListenerEvent, lazy: ICachedValue<IListenerContext>): INotifyResult | void => {
                    if (event === eListenerEvent.Test && lazy.v.test.description === "passes then is aborted") {
                        reportedStatus = lazy.v.end.status;
                        return { action: eListenerAction.Abort, reason: "aborted at the end" };
                    }
                }
            });
            await runner.run();

            assert.equal(reportedStatus, TestStatus.Passed, "the end event carries the status the test finished with");
            const result = runner.getTestResult(root.suites[0].tests[0]);
            assert.equal(result.status, TestStatus.Aborted);
            assert.equal(result.reason, "aborted at the end");

            const counts = runner.getMetrics().counts;
            assert.equal(counts.passed, 0, "the aborted test is not counted as passed");
            assert.equal(counts.aborted, 1);
            assert.equal(counts.failed, 1);
            assert.equal(counts.skipped, 1, "the test that never ran is reported as skipped");
            assert.equal(runner.getResults().failed, 1);
            assert.equal(runner.getResults().passed, 0);
        });
    });

    describe("filters", () => {
        function noTests(): ITestFilter {
            return { canRunTest: () => false };
        }

        it("should remove a filter through its handle, restoring the run when none are left", async () => {
            const root = build(() => {
                selfDescribe("suite", () => {
                    selfIt("a", () => {});
                    selfIt("b", () => {});
                });
            });

            const runner = createTestRunner(root);
            const onlyA = runner.addFilter(createTestNameFilter(["a"]));
            const none = runner.addFilter(noTests());

            await runner.run();
            assert.equal(runner.getResults().total, 0, "both filters apply");

            none.rm();
            none.rm();
            await runner.run();
            assert.equal(runner.getResults().total, 1, "only the name filter remains");
            assert.equal(runner.getResults().passed, 1);

            onlyA.rm();
            await runner.run();
            assert.equal(runner.getResults().total, 2, "with no filters left every test runs");
            assert.equal(runner.getResults().passed, 2);
        });

        it("should remove the first of several filters without disturbing the others", async () => {
            const root = build(() => {
                selfDescribe("suite", () => {
                    selfIt("a", () => {});
                    selfIt("b", () => {});
                });
            });

            const runner = createTestRunner(root);
            const first = runner.addFilter(noTests());
            runner.addFilter(createTestNameFilter(["b"]));

            first.rm();
            await runner.run();
            assert.equal(runner.getResults().total, 1);
            assert.equal(runner.getTestResult(root.suites[0].tests[1]).status, TestStatus.Passed);
        });
    });

    describe("reporters", () => {
        it("should notify an added reporter and stop once it is removed", async () => {
            const root = build(() => {
                selfDescribe("suite", () => {
                    selfIt("a", () => {});
                });
            });

            const runner = createTestRunner(root);
            const reporter = answering("start", eListenerEvent.Run, eListenerAction.Continue);
            runner.addReporter(reporter);
            await runner.run();
            assert.isTrue(reporter.events.length > 0);

            const seen = reporter.events.length;
            runner.removeReporter(reporter);
            await runner.run();
            assert.equal(reporter.events.length, seen, "a removed reporter hears nothing more");
        });
    });

    describe("test context", () => {
        it("should let a test change its slow threshold and report it on the test end event", async () => {
            let slowThreshold: number = null;
            let slow: boolean = null;
            const root = build(() => {
                selfDescribe("suite", () => {
                    selfIt("sets slow", function (this: ITestContext) {
                        this.slow(1);
                        return wait(5);
                    });
                });
            });

            const runner = createTestRunner(root);
            runner.addListener({
                onDone: (event: ListenerEvent, lazy: ICachedValue<IListenerContext>) => {
                    if (event === eListenerEvent.Test) {
                        slowThreshold = lazy.v.end.slowThreshold;
                        slow = lazy.v.end.slow;
                    }
                }
            });
            await runner.run();

            assert.equal(slowThreshold, 1);
            assert.isTrue(slow, "a 5ms test is slow against a 1ms threshold");
            assert.equal(root.suites[0].tests[0].slow, 1, "the threshold is recorded on the test");
        });

        it("should refresh the timer when an asynchronous test re-applies its current timeout", async () => {
            const root = build(() => {
                selfDescribe("suite", () => {
                    selfIt("re-applies", function (this: ITestContext) {
                        const current = this.timeout();
                        return wait(5).then(() => {
                            this.timeout(current);
                            return wait(5);
                        });
                    });
                });
            });

            const runner = createTestRunner(root);
            await runner.run();
            assert.equal(runner.getTestResult(root.suites[0].tests[0]).status, TestStatus.Passed);
        });

        it("should restart the timer with the new budget when an asynchronous test raises its timeout", async () => {
            const root = build(() => {
                selfDescribe("suite", () => {
                    selfIt("extends", function (this: ITestContext) {
                        this.timeout(15);
                        return wait(5).then(() => {
                            this.timeout(200);
                            return wait(30);
                        });
                    });
                });
            });

            const runner = createTestRunner(root);
            await runner.run();
            assert.equal(runner.getTestResult(root.suites[0].tests[0]).status, TestStatus.Passed, "the raised timeout keeps the test alive");
        });

        it("should clone the runner's isolated host when a test opens a host scope", async () => {
            let cloned: any = null;
            const root = build(() => {
                selfDescribe("suite", () => {
                    selfIt("opens a scope", () => {
                        withHost((host) => {
                            cloned = host;
                        });
                    });
                });
            });

            const runner = createTestRunner(root);
            await runner.run();

            assert.isObject(cloned);
            assert.isObject(cloned.notifyMgr, "the clone has its own notification manager");
            assert.isObject(cloned.opts.v, "and the cloned options");
            assert.equal(runner.getResults().passed, 1);
        });
    });

    describe("done callbacks", () => {
        it("should accept a done callback invoked synchronously", async () => {
            const root = build(() => {
                selfDescribe("suite", () => {
                    selfIt("calls done at once", function (done) {
                        done();
                    });
                    selfIt("fails through done at once", function (done) {
                        done(new Error("failed synchronously"));
                    });
                    selfIt("calls done later", function (done) {
                        scheduleTimeout(() => done(), 1);
                    });
                });
            });

            const runner = createTestRunner(root);
            await runner.run();

            const tests = root.suites[0].tests;
            assert.equal(runner.getTestResult(tests[0]).status, TestStatus.Passed);
            assert.equal(runner.getTestResult(tests[1]).status, TestStatus.Failed);
            assert.equal(runner.getTestResult(tests[1]).error.message, "failed synchronously");
            assert.equal(runner.getTestResult(tests[2]).status, TestStatus.Passed);
        });
    });

    describe("hook chains", () => {
        it("should pick up a hook replaced while the suite is running", async () => {
            const calls: string[] = [];
            let suite: ITestSuite;
            const root = build(() => {
                selfDescribe("suite", () => {
                    selfBeforeEach("original", () => {
                        calls.push("original");
                    });
                    selfIt("first", () => {
                        suite.beforeEachHooks[0] = {
                            name: "replacement",
                            fn: () => {
                                calls.push("replacement");
                            }
                        };
                    });
                    selfIt("second", () => {});
                });
            });
            suite = root.suites[0];

            const runner = createTestRunner(root);
            await runner.run();

            assert.deepEqual(calls, ["original", "replacement"], "the second test runs the replaced hook");
            assert.equal(runner.getResults().passed, 2);
        });
    });
});
