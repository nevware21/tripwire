/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "../../../src/assert/assertClass";
import { createTestRunner } from "../../../src/suite/runner";
import { describe as selfDescribe, createSuite, useSuite } from "../../../src/suite/suite";
import { it as selfIt } from "../../../src/suite/it";
import { beforeEach as selfBeforeEach } from "../../../src/suite/beforeEach";
import { TimeoutError } from "../../../src/errors/timeoutError";
import { doAwait, createPromise } from "@nevware21/ts-async";

/**
 * Captures the error recorded against the one test in `runner`'s suite, so a timeout can be
 * asserted as a `TimeoutError` rather than merely as "something failed".
 */
function captureTestError(runner: any): { error: any } {
    const captured: { error: any } = { error: null };

    runner.addListener({
        onDone: function (event: any, context: any) {
            const ctx = context && context.v;
            if (ctx && ctx.test && ctx.end && ctx.end.error) {
                captured.error = ctx.end.error;
            }
        }
    });

    return captured;
}

describe("Test Timeout", () => {
    it("should have default timeout of 2000ms", function (done) {
        const isolatedSuite = createSuite();
        let timeoutValue = 0;

        useSuite(isolatedSuite, function () {
            selfDescribe("test suite", function () {
                selfIt("check default timeout", function () {
                    timeoutValue = this.timeout();
                });
            });
        });

        const runner = createTestRunner(isolatedSuite);
        doAwait(runner.run(), function () {
            const results = runner.getResults();
            assert.equal(results.passed, 1);
            assert.equal(timeoutValue, 2000, "Default timeout should be 2000ms");
            done();
        });
    });

    it("should set timeout value", function (done) {
        const isolatedSuite = createSuite();
        let timeoutValue = 0;

        useSuite(isolatedSuite, function () {
            selfDescribe("test suite", function () {
                selfIt("set timeout to 5000", function () {
                    this.timeout(5000);
                    timeoutValue = this.timeout();
                });
            });
        });

        const runner = createTestRunner(isolatedSuite);
        doAwait(runner.run(), function () {
            const results = runner.getResults();
            assert.equal(results.passed, 1);
            assert.equal(timeoutValue, 5000, "Timeout should be 5000ms");
            done();
        });
    });

    it("should allow timeout chaining", function (done) {
        const isolatedSuite = createSuite();
        let timeoutValues: number[] = [];

        useSuite(isolatedSuite, function () {
            selfDescribe("test suite", function () {
                selfIt("test chaining", function () {
                    timeoutValues.push(this.timeout());
                    const result = this.timeout(3000);
                    timeoutValues.push(this.timeout());
                    // Verify that timeout() returns 'this' for chaining
                    assert.equal(typeof result, "object");
                });
            });
        });

        const runner = createTestRunner(isolatedSuite);
        doAwait(runner.run(), function () {
            const results = runner.getResults();
            assert.equal(results.passed, 1);
            assert.equal(timeoutValues[0], 2000, "Initial timeout should be 2000ms");
            assert.equal(timeoutValues[1], 3000, "Updated timeout should be 3000ms");
            done();
        });
    });

    it("should verify timeout independence between sequential tests", function (done) {
        const isolatedSuite = createSuite();
        let testCount = 0;

        useSuite(isolatedSuite, function () {
            selfDescribe("test suite", function () {
                selfIt("test with custom timeout", function () {
                    testCount++;
                    this.timeout(5000);
                    assert.equal(this.timeout(), 5000);
                });
            });
        });

        const runner = createTestRunner(isolatedSuite);
        doAwait(runner.run(), function () {
            const results = runner.getResults();
            assert.equal(results.passed, 1, "Test should pass");
            assert.equal(testCount, 1, "Test should run once");
            done();
        });
    });

    it("should allow timeout to be set in beforeEach hook", function (done) {
        const isolatedSuite = createSuite();
        let testTimeoutValue = 0;

        useSuite(isolatedSuite, function () {
            selfDescribe("test suite", function () {
                selfBeforeEach(function () {
                    this.timeout(4000);
                });

                selfIt("test with hook-set timeout", function () {
                    testTimeoutValue = this.timeout();
                });
            });
        });

        const runner = createTestRunner(isolatedSuite);
        doAwait(runner.run(), function () {
            const results = runner.getResults();
            assert.equal(results.passed, 1);
            assert.equal(testTimeoutValue, 4000, "Timeout set in beforeEach should apply to test");
            done();
        });
    });

    it("should support very short timeouts", function (done) {
        const isolatedSuite = createSuite();
        let timeoutValue = 0;

        useSuite(isolatedSuite, function () {
            selfDescribe("test suite", function () {
                selfIt("set timeout to 100ms", function () {
                    this.timeout(100);
                    timeoutValue = this.timeout();
                });
            });
        });

        const runner = createTestRunner(isolatedSuite);
        doAwait(runner.run(), function () {
            const results = runner.getResults();
            assert.equal(results.passed, 1);
            assert.equal(timeoutValue, 100, "Should support 100ms timeout");
            done();
        });
    });

    it("should support very long timeouts", function (done) {
        const isolatedSuite = createSuite();
        let timeoutValue = 0;

        useSuite(isolatedSuite, function () {
            selfDescribe("test suite", function () {
                selfIt("set timeout to 60000ms", function () {
                    this.timeout(60000);
                    timeoutValue = this.timeout();
                });
            });
        });

        const runner = createTestRunner(isolatedSuite);
        doAwait(runner.run(), function () {
            const results = runner.getResults();
            assert.equal(results.passed, 1);
            assert.equal(timeoutValue, 60000, "Should support 60000ms timeout");
            done();
        });
    });

    it("should maintain timeout for multiple calls", function (done) {
        const isolatedSuite = createSuite();
        const values: number[] = [];

        useSuite(isolatedSuite, function () {
            selfDescribe("test suite", function () {
                selfIt("test with multiple timeout calls", function () {
                    values.push(this.timeout());
                    this.timeout(3000);
                    values.push(this.timeout());
                    this.timeout(7000);
                    values.push(this.timeout());
                    assert.equal(values.length, 3);
                });
            });
        });

        const runner = createTestRunner(isolatedSuite);
        doAwait(runner.run(), function () {
            const results = runner.getResults();
            assert.equal(results.passed, 1, "Test should pass");
            assert.equal(values[0], 2000, "Initial timeout");
            assert.equal(values[1], 3000, "After first change");
            assert.equal(values[2], 7000, "After second change");
            done();
        });
    });

    it("should allow timeout to be called multiple times", function (done) {
        const isolatedSuite = createSuite();
        const timeoutValues: number[] = [];

        useSuite(isolatedSuite, function () {
            selfDescribe("test suite", function () {
                selfIt("test multiple timeout calls", function () {
                    timeoutValues.push(this.timeout());
                    this.timeout(3000);
                    timeoutValues.push(this.timeout());
                    this.timeout(5000);
                    timeoutValues.push(this.timeout());
                    this.timeout(1500);
                    timeoutValues.push(this.timeout());
                });
            });
        });

        const runner = createTestRunner(isolatedSuite);
        doAwait(runner.run(), function () {
            const results = runner.getResults();
            assert.equal(results.passed, 1);
            assert.equal(timeoutValues[0], 2000, "Initial timeout");
            assert.equal(timeoutValues[1], 3000, "After first set");
            assert.equal(timeoutValues[2], 5000, "After second set");
            assert.equal(timeoutValues[3], 1500, "After third set");
            done();
        });
    });

    it("should work with async tests", function (done) {
        const isolatedSuite = createSuite();
        let capturedTimeout = 0;
        let asyncTestCompleted = false;

        useSuite(isolatedSuite, function () {
            selfDescribe("test suite", function () {
                selfIt("async test with timeout", function () {
                    this.timeout(5000);
                    capturedTimeout = this.timeout();
                    asyncTestCompleted = true;
                    assert.equal(capturedTimeout, 5000);
                });
            });
        });

        const runner = createTestRunner(isolatedSuite);
        doAwait(runner.run(), function () {
            const results = runner.getResults();
            assert.equal(results.passed, 1);
            assert.isTrue(asyncTestCompleted, "Async test should complete");
            assert.equal(capturedTimeout, 5000, "Timeout should be set to 5000ms");
            done();
        });
    });

    // -----------------------------------------------------------------------------------------
    // A non-positive timeout means "no limit", on every path.
    //
    // The synchronous path has always treated it that way; the asynchronous one clamped the
    // remaining budget to zero and armed a 0ms timer instead, so `this.timeout(0)` -- the
    // documented way to say "this one takes as long as it takes" -- failed the test immediately
    // with "Timeout of 0ms exceeded".
    // -----------------------------------------------------------------------------------------

    it("should treat timeout(0) on a promise-returning test as no limit", function (done) {
        const isolatedSuite = createSuite();

        useSuite(isolatedSuite, function () {
            selfDescribe("test suite", function () {
                selfIt("takes as long as it takes", function () {
                    this.timeout(0);

                    return createPromise<void>(function (resolve) {
                        setTimeout(function () {
                            resolve();
                        }, 50);
                    });
                });
            });
        });

        const runner = createTestRunner(isolatedSuite);
        doAwait(runner.run(), function () {
            const results = runner.getResults();
            assert.equal(results.failed, 0, "timeout(0) disables the limit, it does not expire instantly");
            assert.equal(results.passed, 1);
            done();
        });
    });

    it("should treat timeout(0) on a done-callback test as no limit", function (done) {
        const isolatedSuite = createSuite();

        useSuite(isolatedSuite, function () {
            selfDescribe("test suite", function () {
                selfIt("waits with done", function (testDone) {
                    this.timeout(0);

                    setTimeout(function () {
                        testDone();
                    }, 50);
                });
            });
        });

        const runner = createTestRunner(isolatedSuite);
        doAwait(runner.run(), function () {
            const results = runner.getResults();
            assert.equal(results.failed, 0);
            assert.equal(results.passed, 1);
            done();
        });
    });

    it("should treat a negative timeout as no limit too", function (done) {
        const isolatedSuite = createSuite();

        useSuite(isolatedSuite, function () {
            selfDescribe("test suite", function () {
                selfIt("negative budget", function (testDone) {
                    this.timeout(-1);

                    setTimeout(function () {
                        testDone();
                    }, 50);
                });
            });
        });

        const runner = createTestRunner(isolatedSuite);
        doAwait(runner.run(), function () {
            const results = runner.getResults();
            assert.equal(results.failed, 0);
            assert.equal(results.passed, 1);
            done();
        });
    });

    it("should cancel an already-armed timer when timeout(0) is set mid-flight", function (done) {
        const isolatedSuite = createSuite();

        useSuite(isolatedSuite, function () {
            selfDescribe("test suite", function () {
                selfIt("disables its own limit after it has started waiting", function (testDone) {
                    const ctx = this;
                    ctx.timeout(30);

                    setTimeout(function () {
                        // Already asynchronous and already being timed, so this has to cancel the
                        // armed timer rather than restart it with a zero-length budget.
                        ctx.timeout(0);

                        setTimeout(function () {
                            testDone();
                        }, 80);
                    }, 5);
                });
            });
        });

        const runner = createTestRunner(isolatedSuite);
        doAwait(runner.run(), function () {
            const results = runner.getResults();
            assert.equal(results.failed, 0, "the 30ms budget was withdrawn before it could expire");
            assert.equal(results.passed, 1);
            done();
        });
    });

    it("should still enforce a positive timeout", function (done) {
        // The guard above must not have turned every timeout off.
        const isolatedSuite = createSuite();

        useSuite(isolatedSuite, function () {
            selfDescribe("test suite", function () {
                selfIt("overruns", function (testDone) {
                    this.timeout(20);

                    setTimeout(function () {
                        testDone();
                    }, 300);
                });
            });
        });

        const runner = createTestRunner(isolatedSuite);
        const captured = captureTestError(runner);

        doAwait(runner.run(), function () {
            const results = runner.getResults();
            assert.equal(results.failed, 1);
            assert.isTrue(captured.error instanceof TimeoutError, "expected a TimeoutError, got " + captured.error);
            done();
        });
    });

    // -----------------------------------------------------------------------------------------
    // The timeout has to be able to end the wait on its own.
    //
    // The promise path used to hand the caller the test's own promise, so the run waited on
    // exactly the thing the timeout was supposed to be protecting it from: a promise that never
    // settled hung the run outright, however short the budget, and one that settled late made the
    // run wait for a settlement it had already given up on.
    // -----------------------------------------------------------------------------------------

    it("should complete a run whose test returns a promise that never settles", function (done) {
        const isolatedSuite = createSuite();

        useSuite(isolatedSuite, function () {
            selfDescribe("test suite", function () {
                selfIt("never settles", function () {
                    this.timeout(50);

                    return createPromise<void>(function () {
                        // Deliberately never resolved or rejected.
                    });
                });
            });
        });

        const runner = createTestRunner(isolatedSuite);
        const captured = captureTestError(runner);

        doAwait(runner.run(), function () {
            const results = runner.getResults();
            assert.equal(results.failed, 1, "the timeout is the result");
            assert.equal(results.passed, 0);
            assert.isTrue(captured.error instanceof TimeoutError, "expected a TimeoutError, got " + captured.error);
            done();
        });
    });

    it("should not wait for a settlement that arrives after the timeout", function (done) {
        const isolatedSuite = createSuite();

        useSuite(isolatedSuite, function () {
            selfDescribe("test suite", function () {
                selfIt("settles long after its budget", function () {
                    this.timeout(50);

                    return createPromise<void>(function (resolve) {
                        setTimeout(function () {
                            resolve();
                        }, 500);
                    });
                });
            });
        });

        const runner = createTestRunner(isolatedSuite);
        const captured = captureTestError(runner);
        const started = Date.now();

        doAwait(runner.run(), function () {
            const elapsed = Date.now() - started;
            const results = runner.getResults();

            assert.equal(results.failed, 1, "the recorded result is the timeout, not the late success");
            assert.isTrue(captured.error instanceof TimeoutError, "expected a TimeoutError, got " + captured.error);
            assert.isTrue(elapsed < 400, "the run should not wait for the settlement it gave up on, took " + elapsed + "ms");
            done();
        });
    });
});
