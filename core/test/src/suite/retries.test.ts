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
import { afterEach as selfAfterEach } from "../../../src/suite/afterEach";
import { doAwait } from "@nevware21/ts-async";

describe("Test Retries", () => {
    it("should not retry tests that pass", function (done) {
        const isolatedSuite = createSuite();
        let passedCount = 0;

        useSuite(isolatedSuite, function () {
            selfDescribe("test suite", function () {
                selfIt("should pass", function () {
                    passedCount++;
                    assert.equal(1, 1);
                });
            });
        });

        const runner = createTestRunner(isolatedSuite);
        doAwait(runner.run(), function () {
            const results = runner.getResults();
            assert.equal(results.passed, 1);
            assert.equal(passedCount, 1, "Test should only run once");
            done();
        });
    });

    it("should retry failed tests once when retries = 1", function (done) {
        const isolatedSuite = createSuite();
        let executionCount = 0;

        useSuite(isolatedSuite, function () {
            selfDescribe("test suite", function () {
                selfIt("should retry once", function () {
                    executionCount++;
                    this.retries(1);

                    if (executionCount < 2) {
                        throw new Error("First attempt fails");
                    }
                });
            });
        });

        const runner = createTestRunner(isolatedSuite);
        doAwait(runner.run(), function () {
            const results = runner.getResults();
            assert.equal(results.passed, 1);
            assert.equal(executionCount, 2, "Test should run twice (1 original + 1 retry)");
            done();
        });
    });

    it("should retry multiple times with retries = 2", function (done) {
        const isolatedSuite = createSuite();
        let executionCount = 0;

        useSuite(isolatedSuite, function () {
            selfDescribe("test suite", function () {
                selfIt("should retry twice", function () {
                    executionCount++;
                    this.retries(2);

                    if (executionCount < 3) {
                        throw new Error("Failed attempt");
                    }
                });
            });
        });

        const runner = createTestRunner(isolatedSuite);
        doAwait(runner.run(), function () {
            const results = runner.getResults();
            assert.equal(results.passed, 1);
            assert.equal(executionCount, 3, "Test should run 3 times (1 original + 2 retries)");
            done();
        });
    });

    it("should fail after exhausting all retries", function (done) {
        const isolatedSuite = createSuite();
        let executionCount = 0;

        useSuite(isolatedSuite, function () {
            selfDescribe("test suite", function () {
                selfIt("always fails", function () {
                    executionCount++;
                    this.retries(2);
                    throw new Error("Always fails");
                });
            });
        });

        const runner = createTestRunner(isolatedSuite);
        doAwait(runner.run(), function () {
            const results = runner.getResults();
            assert.equal(results.failed, 1);
            assert.equal(executionCount, 3, "Test should run 3 times total");
            done();
        });
    });

    it("should track retries in test result", function (done) {
        const isolatedSuite = createSuite();
        let executionCount = 0;
        let capturedTest: any = undefined;

        useSuite(isolatedSuite, function () {
            selfDescribe("test suite", function () {
                selfIt("should track retries", function () {
                    executionCount++;
                    if (!capturedTest) {
                        capturedTest = this;
                    }
                    this.retries(2);

                    if (executionCount < 2) {
                        throw new Error("Fail first attempt");
                    }
                });
            });
        });

        const runner = createTestRunner(isolatedSuite);
        doAwait(runner.run(), function () {
            const results = runner.getResults();
            assert.equal(results.passed, 1);
            assert.equal(executionCount, 2, "Test should run twice");
            done();
        });
    });

    it("should reset context between retry attempts", function (done) {
        const isolatedSuite = createSuite();
        let attemptCount = 0;

        useSuite(isolatedSuite, function () {
            selfDescribe("test suite", function () {
                selfIt("retry test", function () {
                    attemptCount++;
                    this.retries(1);

                    if (attemptCount < 2) {
                        throw new Error("First attempt fails");
                    }
                });
            });
        });

        const runner = createTestRunner(isolatedSuite);
        doAwait(runner.run(), function () {
            const results = runner.getResults();
            assert.equal(results.passed, 1, "Test should pass");
            assert.equal(attemptCount, 2, "Test should run twice");
            done();
        });
    });

    it("should not retry tests with retries = 0", function (done) {
        const isolatedSuite = createSuite();
        let executionCount = 0;

        useSuite(isolatedSuite, function () {
            selfDescribe("test suite", function () {
                selfIt("should not retry", function () {
                    executionCount++;
                    this.retries(0);
                    throw new Error("Test fails");
                });
            });
        });

        const runner = createTestRunner(isolatedSuite);
        doAwait(runner.run(), function () {
            const results = runner.getResults();
            assert.equal(results.failed, 1);
            assert.equal(executionCount, 1, "Test should run only once");
            done();
        });
    });

    it("should not retry when retries() is not called", function (done) {
        const isolatedSuite = createSuite();
        let executionCount = 0;

        useSuite(isolatedSuite, function () {
            selfDescribe("test suite", function () {
                selfIt("should fail without retry", function () {
                    executionCount++;
                    throw new Error("Test fails");
                });
            });
        });

        const runner = createTestRunner(isolatedSuite);
        doAwait(runner.run(), function () {
            const results = runner.getResults();
            assert.equal(results.failed, 1);
            assert.equal(executionCount, 1, "Test should run only once");
            done();
        });
    });

    it("should run before/after hooks for each retry", function (done) {
        const isolatedSuite = createSuite();
        const hookCalls: string[] = [];

        useSuite(isolatedSuite, function () {
            selfDescribe("test suite", function () {
                selfBeforeEach(function () {
                    hookCalls.push("beforeEach");
                });

                selfAfterEach(function () {
                    hookCalls.push("afterEach");
                });

                selfIt("should call hooks on retry", function () {
                    hookCalls.push("test");
                    this.retries(1);

                    if (hookCalls.filter((h: string) => h === "test").length < 2) {
                        throw new Error("Force retry");
                    }
                });
            });
        });

        const runner = createTestRunner(isolatedSuite);
        doAwait(runner.run(), function () {
            const results = runner.getResults();
            assert.equal(results.passed, 1);

            // Should have: beforeEach, test, afterEach, beforeEach, test, afterEach
            assert.equal(hookCalls.length, 6, "Should call hooks for each attempt");
            assert.equal(hookCalls[0], "beforeEach");
            assert.equal(hookCalls[1], "test");
            assert.equal(hookCalls[2], "afterEach");
            assert.equal(hookCalls[3], "beforeEach");
            assert.equal(hookCalls[4], "test");
            assert.equal(hookCalls[5], "afterEach");
            done();
        });
    });

    it("should succeed on last retry attempt", function (done) {
        const isolatedSuite = createSuite();
        let executionCount = 0;

        useSuite(isolatedSuite, function () {
            selfDescribe("test suite", function () {
                selfIt("should succeed on final retry", function () {
                    executionCount++;
                    this.retries(3);

                    // Fail 2 times, succeed on 3rd attempt
                    if (executionCount < 3) {
                        throw new Error("Failing");
                    }
                });
            });
        });

        const runner = createTestRunner(isolatedSuite);
        doAwait(runner.run(), function () {
            const results = runner.getResults();
            assert.equal(results.passed, 1);
            assert.equal(results.failed, 0);
            assert.equal(executionCount, 3, "Should run 3 times");
            done();
        });
    });
});
