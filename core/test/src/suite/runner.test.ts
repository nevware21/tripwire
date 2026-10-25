/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "../../../src/assert/assertClass";
import { createTestRunner } from "../../../src/suite/runner";
import { doAwait, createPromise } from "@nevware21/ts-async";
import { describe as selfDescribe, createSuite, useSuite } from "../../../src/suite/suite";
import { it as selfIt } from "../../../src/suite/it";
import { after as selfAfter } from "../../../src/suite/after";
import { afterEach as selfAfterEach } from "../../../src/suite/afterEach";
import { before as selfBefore } from "../../../src/suite/before";
import { beforeEach as selfBeforeEach } from "../../../src/suite/beforeEach";
import { IListener } from "../../../src/interfaces/IListener";
import { eListenerAction } from "../../../src/types/ListenerAction";
import { eListenerEvent } from "../../../src/types/ListenerEvent";
import { TestStatus } from "../../../src/suite/interfaces/ITestStatus";
import { TimeoutError } from "../../../src/errors/timeoutError";
import { ITestSuite } from "../../../src/suite/interfaces/ITestSuite";

describe("runner", function () {

    describe("createTestRunner", function () {

        it("should create a test runner", function () {
            const isolatedSuite = createSuite();

            useSuite(isolatedSuite, function () {
                selfDescribe("Suite", function () {
                    selfIt("test", function () {});
                });
            });

            const runner = createTestRunner(isolatedSuite);
            assert.isObject(runner);
            assert.isFunction(runner.run);
            assert.isFunction(runner.getResults);
            assert.isFunction(runner.getRootSuite);
        });

        it("should return root suite", function () {
            const isolatedSuite = createSuite();
            const runner = createTestRunner(isolatedSuite);
            assert.equal(runner.getRootSuite(), isolatedSuite);
        });
    });

    describe("run", function () {

        it("should execute passing tests", function (done) {
            const isolatedSuite = createSuite();

            let executed = false;

            useSuite(isolatedSuite, function () {
                selfDescribe("Suite", function () {
                    selfIt("test", function () {
                        executed = true;
                    });
                });
            });

            const runner = createTestRunner(isolatedSuite);
            doAwait(runner.run(), function () {
                assert.isTrue(executed);
                const results = runner.getResults();
                assert.equal(results.passed, 1);
                assert.equal(results.failed, 0);
                done();
            });
        });

        it("should execute failing tests", function (done) {
            const isolatedSuite = createSuite();

            useSuite(isolatedSuite, function () {
                selfDescribe("Suite", function () {
                    selfIt("test", function () {
                        throw new Error("Test error");
                    });
                });
            });

            const runner = createTestRunner(isolatedSuite);
            doAwait(runner.run(), function () {
                const results = runner.getResults();
                assert.equal(results.passed, 0);
                assert.equal(results.failed, 1);
                done();
            });
        });

        it("should skip skipped tests", function (done) {
            const isolatedSuite = createSuite();

            useSuite(isolatedSuite, function () {
                selfDescribe("Suite", function () {
                    selfIt.skip("skipped test", function () {
                        throw new Error("Should not run");
                    });
                });
            });

            const runner = createTestRunner(isolatedSuite);
            doAwait(runner.run(), function () {
                const results = runner.getResults();
                assert.equal(results.skipped, 1);
                assert.equal(results.failed, 0);
                done();
            });
        });

        it("should mark tests without function as pending", function (done) {
            const isolatedSuite = createSuite();

            useSuite(isolatedSuite, function () {
                selfDescribe("Suite", function () {
                    selfIt("pending test");
                });
            });

            const runner = createTestRunner(isolatedSuite);
            doAwait(runner.run(), function () {
                const results = runner.getResults();
                assert.equal(results.pending, 1);
                done();
            });
        });

        it("should execute beforeEach hooks", function (done) {
            const isolatedSuite = createSuite();

            let hookExecuted = false;

            useSuite(isolatedSuite, function () {
                selfDescribe("Suite", function () {
                    selfBeforeEach(function () {
                        hookExecuted = true;
                    });

                    selfIt("test", function () {
                        assert.isTrue(hookExecuted);
                    });
                });
            });

            const runner = createTestRunner(isolatedSuite);
            doAwait(runner.run(), function () {
                const results = runner.getResults();
                assert.equal(results.passed, 1);
                done();
            });
        });

        it("should execute afterEach hooks", function (done) {
            const isolatedSuite = createSuite();

            let hookExecuted = false;

            useSuite(isolatedSuite, function () {
                selfDescribe("Suite", function () {
                    selfAfterEach(function () {
                        hookExecuted = true;
                    });

                    selfIt("test", function () {});
                });
            });

            const runner = createTestRunner(isolatedSuite);
            doAwait(runner.run(), function () {
                assert.isTrue(hookExecuted);
                done();
            });
        });

        it("should execute before hooks", function (done) {
            const isolatedSuite = createSuite();

            let hookExecuted = false;

            useSuite(isolatedSuite, function () {
                selfDescribe("Suite", function () {
                    selfBefore(function () {
                        hookExecuted = true;
                    });

                    selfIt("test", function () {
                        assert.isTrue(hookExecuted);
                    });
                });
            });

            const runner = createTestRunner(isolatedSuite);
            doAwait(runner.run(), function () {
                const results = runner.getResults();
                assert.equal(results.passed, 1);
                done();
            });
        });

        it("should execute after hooks", function (done) {
            const isolatedSuite = createSuite();

            let hookExecuted = false;

            useSuite(isolatedSuite, function () {
                selfDescribe("Suite", function () {
                    selfAfter(function () {
                        hookExecuted = true;
                    });

                    selfIt("test", function () {});
                });
            });

            const runner = createTestRunner(isolatedSuite);
            doAwait(runner.run(), function () {
                assert.isTrue(hookExecuted);
                done();
            });
        });

        it("should execute hooks in correct order", function (done) {
            const isolatedSuite = createSuite();

            const order: string[] = [];

            useSuite(isolatedSuite, function () {
                selfDescribe("Suite", function () {
                    selfBefore(function () {
                        order.push("before");
                    });

                    selfBeforeEach(function () {
                        order.push("beforeEach");
                    });

                    selfAfterEach(function () {
                        order.push("afterEach");
                    });

                    selfAfter(function () {
                        order.push("after");
                    });

                    selfIt("test", function () {
                        order.push("test");
                    });
                });
            });

            const runner = createTestRunner(isolatedSuite);
            doAwait(runner.run(), function () {
                assert.deepEqual(order, ["before", "beforeEach", "test", "afterEach", "after"]);
                done();
            });
        });

        it("should execute hooks for multiple tests in order", function (done) {
            const isolatedSuite = createSuite();

            const order: string[] = [];

            useSuite(isolatedSuite, function () {
                selfDescribe("Suite", function () {
                    selfBefore(function () {
                        order.push("before");
                    });

                    selfBeforeEach(function () {
                        order.push("beforeEach");
                    });

                    selfAfterEach(function () {
                        order.push("afterEach");
                    });

                    selfAfter(function () {
                        order.push("after");
                    });

                    selfIt("test1", function () {
                        order.push("test1");
                    });

                    selfIt("test2", function () {
                        order.push("test2");
                    });

                    selfIt("test3", function () {
                        order.push("test3");
                    });
                });
            });

            const runner = createTestRunner(isolatedSuite);
            doAwait(runner.run(), function () {
                assert.deepEqual(order, [
                    "before",
                    "beforeEach", "test1", "afterEach",
                    "beforeEach", "test2", "afterEach",
                    "beforeEach", "test3", "afterEach",
                    "after"
                ]);
                done();
            });
        });

        it("should execute multiple hooks in registration order", function (done) {
            const isolatedSuite = createSuite();

            const order: string[] = [];

            useSuite(isolatedSuite, function () {
                selfDescribe("Suite", function () {
                    selfBefore(function () {
                        order.push("before1");
                    });

                    selfBefore(function () {
                        order.push("before2");
                    });

                    selfBeforeEach(function () {
                        order.push("beforeEach1");
                    });

                    selfBeforeEach(function () {
                        order.push("beforeEach2");
                    });

                    selfAfterEach(function () {
                        order.push("afterEach1");
                    });

                    selfAfterEach(function () {
                        order.push("afterEach2");
                    });

                    selfAfter(function () {
                        order.push("after1");
                    });

                    selfAfter(function () {
                        order.push("after2");
                    });

                    selfIt("test", function () {
                        order.push("test");
                    });
                });
            });

            const runner = createTestRunner(isolatedSuite);
            doAwait(runner.run(), function () {
                assert.deepEqual(order, [
                    "before1", "before2",
                    "beforeEach1", "beforeEach2", "test", "afterEach1", "afterEach2",
                    "after1", "after2"
                ]);
                done();
            });
        });

        it("should execute nested suite hooks in correct order", function (done) {
            const isolatedSuite = createSuite();

            const order: string[] = [];

            useSuite(isolatedSuite, function () {
                selfDescribe("Outer", function () {
                    selfBefore(function () {
                        order.push("outer-before");
                    });

                    selfBeforeEach(function () {
                        order.push("outer-beforeEach");
                    });

                    selfAfterEach(function () {
                        order.push("outer-afterEach");
                    });

                    selfAfter(function () {
                        order.push("outer-after");
                    });

                    selfIt("outer-test", function () {
                        order.push("outer-test");
                    });

                    selfDescribe("Inner", function () {
                        selfBefore(function () {
                            order.push("inner-before");
                        });

                        selfBeforeEach(function () {
                            order.push("inner-beforeEach");
                        });

                        selfAfterEach(function () {
                            order.push("inner-afterEach");
                        });

                        selfAfter(function () {
                            order.push("inner-after");
                        });

                        selfIt("inner-test", function () {
                            order.push("inner-test");
                        });
                    });
                });
            });

            const runner = createTestRunner(isolatedSuite);
            doAwait(runner.run(), function () {
                assert.deepEqual(order, [
                    "outer-before",
                    "outer-beforeEach", "outer-test", "outer-afterEach",
                    "inner-before",
                    "outer-beforeEach", "inner-beforeEach", "inner-test", "inner-afterEach", "outer-afterEach",
                    "inner-after",
                    "outer-after"
                ]);
                done();
            });
        });

        it("should execute multiple inline suites in order", function (done) {
            const isolatedSuite = createSuite();

            const order: string[] = [];

            useSuite(isolatedSuite, function () {
                selfDescribe("Suite1", function () {
                    selfBefore(function () {
                        order.push("suite1-before");
                    });

                    selfAfter(function () {
                        order.push("suite1-after");
                    });

                    selfIt("test1", function () {
                        order.push("suite1-test");
                    });
                });

                selfDescribe("Suite2", function () {
                    selfBefore(function () {
                        order.push("suite2-before");
                    });

                    selfAfter(function () {
                        order.push("suite2-after");
                    });

                    selfIt("test2", function () {
                        order.push("suite2-test");
                    });
                });

                selfDescribe("Suite3", function () {
                    selfBefore(function () {
                        order.push("suite3-before");
                    });

                    selfAfter(function () {
                        order.push("suite3-after");
                    });

                    selfIt("test3", function () {
                        order.push("suite3-test");
                    });
                });
            });

            const runner = createTestRunner(isolatedSuite);
            doAwait(runner.run(), function () {
                assert.deepEqual(order, [
                    "suite1-before", "suite1-test", "suite1-after",
                    "suite2-before", "suite2-test", "suite2-after",
                    "suite3-before", "suite3-test", "suite3-after"
                ]);
                done();
            });
        });

        it("should execute deeply nested suite hooks in correct order", function (done) {
            const isolatedSuite = createSuite();

            const order: string[] = [];

            useSuite(isolatedSuite, function () {
                selfDescribe("Level1", function () {
                    selfBefore(function () {
                        order.push("L1-before");
                    });

                    selfBeforeEach(function () {
                        order.push("L1-beforeEach");
                    });

                    selfAfterEach(function () {
                        order.push("L1-afterEach");
                    });

                    selfAfter(function () {
                        order.push("L1-after");
                    });

                    selfDescribe("Level2", function () {
                        selfBefore(function () {
                            order.push("L2-before");
                        });

                        selfBeforeEach(function () {
                            order.push("L2-beforeEach");
                        });

                        selfAfterEach(function () {
                            order.push("L2-afterEach");
                        });

                        selfAfter(function () {
                            order.push("L2-after");
                        });

                        selfDescribe("Level3", function () {
                            selfBefore(function () {
                                order.push("L3-before");
                            });

                            selfBeforeEach(function () {
                                order.push("L3-beforeEach");
                            });

                            selfAfterEach(function () {
                                order.push("L3-afterEach");
                            });

                            selfAfter(function () {
                                order.push("L3-after");
                            });

                            selfIt("test", function () {
                                order.push("L3-test");
                            });
                        });
                    });
                });
            });

            const runner = createTestRunner(isolatedSuite);
            doAwait(runner.run(), function () {
                assert.deepEqual(order, [
                    "L1-before",
                    "L2-before",
                    "L3-before",
                    "L1-beforeEach", "L2-beforeEach", "L3-beforeEach", "L3-test", "L3-afterEach", "L2-afterEach", "L1-afterEach",
                    "L3-after",
                    "L2-after",
                    "L1-after"
                ]);
                done();
            });
        });

        it("should execute async hooks in correct order", function (done) {
            const isolatedSuite = createSuite();

            const order: string[] = [];

            useSuite(isolatedSuite, function () {
                selfDescribe("Suite", function () {
                    selfBefore(function (hookDone) {
                        setTimeout(function () {
                            order.push("before");
                            hookDone();
                        }, 5);
                    });

                    selfBeforeEach(function (hookDone) {
                        setTimeout(function () {
                            order.push("beforeEach");
                            hookDone();
                        }, 5);
                    });

                    selfAfterEach(function (hookDone) {
                        setTimeout(function () {
                            order.push("afterEach");
                            hookDone();
                        }, 5);
                    });

                    selfAfter(function (hookDone) {
                        setTimeout(function () {
                            order.push("after");
                            hookDone();
                        }, 5);
                    });

                    selfIt("test", function (testDone) {
                        setTimeout(function () {
                            order.push("test");
                            testDone();
                        }, 5);
                    });
                });
            });

            const runner = createTestRunner(isolatedSuite);
            doAwait(runner.run(), function () {
                assert.deepEqual(order, ["before", "beforeEach", "test", "afterEach", "after"]);
                done();
            });
        });

        it("should execute async hooks with multiple tests in order", function (done) {
            const isolatedSuite = createSuite();

            const order: string[] = [];

            useSuite(isolatedSuite, function () {
                selfDescribe("Suite", function () {
                    selfBefore(function (hookDone) {
                        setTimeout(function () {
                            order.push("before");
                            hookDone();
                        }, 5);
                    });

                    selfBeforeEach(function (hookDone) {
                        setTimeout(function () {
                            order.push("beforeEach");
                            hookDone();
                        }, 5);
                    });

                    selfAfterEach(function (hookDone) {
                        setTimeout(function () {
                            order.push("afterEach");
                            hookDone();
                        }, 5);
                    });

                    selfAfter(function (hookDone) {
                        setTimeout(function () {
                            order.push("after");
                            hookDone();
                        }, 5);
                    });

                    selfIt("test1", function (testDone) {
                        setTimeout(function () {
                            order.push("test1");
                            testDone();
                        }, 5);
                    });

                    selfIt("test2", function (testDone) {
                        setTimeout(function () {
                            order.push("test2");
                            testDone();
                        }, 5);
                    });
                });
            });

            const runner = createTestRunner(isolatedSuite);
            doAwait(runner.run(), function () {
                assert.deepEqual(order, [
                    "before",
                    "beforeEach", "test1", "afterEach",
                    "beforeEach", "test2", "afterEach",
                    "after"
                ]);
                done();
            });
        });

        it("should execute async nested suite hooks in correct order", function (done) {
            const isolatedSuite = createSuite();

            const order: string[] = [];

            useSuite(isolatedSuite, function () {
                selfDescribe("Outer", function () {
                    selfBefore(function (hookDone) {
                        setTimeout(function () {
                            order.push("outer-before");
                            hookDone();
                        }, 5);
                    });

                    selfBeforeEach(function (hookDone) {
                        setTimeout(function () {
                            order.push("outer-beforeEach");
                            hookDone();
                        }, 5);
                    });

                    selfAfterEach(function (hookDone) {
                        setTimeout(function () {
                            order.push("outer-afterEach");
                            hookDone();
                        }, 5);
                    });

                    selfAfter(function (hookDone) {
                        setTimeout(function () {
                            order.push("outer-after");
                            hookDone();
                        }, 5);
                    });

                    selfIt("outer-test", function (testDone) {
                        setTimeout(function () {
                            order.push("outer-test");
                            testDone();
                        }, 5);
                    });

                    selfDescribe("Inner", function () {
                        selfBefore(function (hookDone) {
                            setTimeout(function () {
                                order.push("inner-before");
                                hookDone();
                            }, 5);
                        });

                        selfBeforeEach(function (hookDone) {
                            setTimeout(function () {
                                order.push("inner-beforeEach");
                                hookDone();
                            }, 5);
                        });

                        selfAfterEach(function (hookDone) {
                            setTimeout(function () {
                                order.push("inner-afterEach");
                                hookDone();
                            }, 5);
                        });

                        selfAfter(function (hookDone) {
                            setTimeout(function () {
                                order.push("inner-after");
                                hookDone();
                            }, 5);
                        });

                        selfIt("inner-test", function (testDone) {
                            setTimeout(function () {
                                order.push("inner-test");
                                testDone();
                            }, 5);
                        });
                    });
                });
            });

            const runner = createTestRunner(isolatedSuite);
            doAwait(runner.run(), function () {
                assert.deepEqual(order, [
                    "outer-before",
                    "outer-beforeEach", "outer-test", "outer-afterEach",
                    "inner-before",
                    "outer-beforeEach", "inner-beforeEach", "inner-test", "inner-afterEach", "outer-afterEach",
                    "inner-after",
                    "outer-after"
                ]);
                done();
            });
        });

        it("should execute async inline suites in order", function (done) {
            const isolatedSuite = createSuite();

            const order: string[] = [];

            useSuite(isolatedSuite, function () {
                selfDescribe("Suite1", function () {
                    selfBefore(function (hookDone) {
                        setTimeout(function () {
                            order.push("suite1-before");
                            hookDone();
                        }, 5);
                    });

                    selfAfter(function (hookDone) {
                        setTimeout(function () {
                            order.push("suite1-after");
                            hookDone();
                        }, 5);
                    });

                    selfIt("test1", function (testDone) {
                        setTimeout(function () {
                            order.push("suite1-test");
                            testDone();
                        }, 5);
                    });
                });

                selfDescribe("Suite2", function () {
                    selfBefore(function (hookDone) {
                        setTimeout(function () {
                            order.push("suite2-before");
                            hookDone();
                        }, 5);
                    });

                    selfAfter(function (hookDone) {
                        setTimeout(function () {
                            order.push("suite2-after");
                            hookDone();
                        }, 5);
                    });

                    selfIt("test2", function (testDone) {
                        setTimeout(function () {
                            order.push("suite2-test");
                            testDone();
                        }, 5);
                    });
                });
            });

            const runner = createTestRunner(isolatedSuite);
            doAwait(runner.run(), function () {
                assert.deepEqual(order, [
                    "suite1-before", "suite1-test", "suite1-after",
                    "suite2-before", "suite2-test", "suite2-after"
                ]);
                done();
            });
        });

        it("should execute promise-returning hooks in correct order", function (done) {
            const isolatedSuite = createSuite();

            const order: string[] = [];

            useSuite(isolatedSuite, function () {
                selfDescribe("Suite", function () {
                    selfBefore(function () {
                        return createPromise<void>(function (resolve) {
                            setTimeout(function () {
                                order.push("before");
                                resolve();
                            }, 5);
                        });
                    });

                    selfBeforeEach(function () {
                        return createPromise<void>(function (resolve) {
                            setTimeout(function () {
                                order.push("beforeEach");
                                resolve();
                            }, 5);
                        });
                    });

                    selfAfterEach(function () {
                        return createPromise<void>(function (resolve) {
                            setTimeout(function () {
                                order.push("afterEach");
                                resolve();
                            }, 5);
                        });
                    });

                    selfAfter(function () {
                        return createPromise<void>(function (resolve) {
                            setTimeout(function () {
                                order.push("after");
                                resolve();
                            }, 5);
                        });
                    });

                    selfIt("test", function () {
                        return createPromise<void>(function (resolve) {
                            setTimeout(function () {
                                order.push("test");
                                resolve();
                            }, 5);
                        });
                    });
                });
            });

            const runner = createTestRunner(isolatedSuite);
            doAwait(runner.run(), function () {
                assert.deepEqual(order, ["before", "beforeEach", "test", "afterEach", "after"]);
                done();
            });
        });

        it("should execute promise-returning tests with multiple tests in order", function (done) {
            const isolatedSuite = createSuite();

            const order: string[] = [];

            useSuite(isolatedSuite, function () {
                selfDescribe("Suite", function () {
                    selfBefore(function () {
                        return createPromise<void>(function (resolve) {
                            setTimeout(function () {
                                order.push("before");
                                resolve();
                            }, 5);
                        });
                    });

                    selfBeforeEach(function () {
                        return createPromise<void>(function (resolve) {
                            setTimeout(function () {
                                order.push("beforeEach");
                                resolve();
                            }, 5);
                        });
                    });

                    selfAfterEach(function () {
                        return createPromise<void>(function (resolve) {
                            setTimeout(function () {
                                order.push("afterEach");
                                resolve();
                            }, 5);
                        });
                    });

                    selfAfter(function () {
                        return createPromise<void>(function (resolve) {
                            setTimeout(function () {
                                order.push("after");
                                resolve();
                            }, 5);
                        });
                    });

                    selfIt("test1", function () {
                        return createPromise<void>(function (resolve) {
                            setTimeout(function () {
                                order.push("test1");
                                resolve();
                            }, 5);
                        });
                    });

                    selfIt("test2", function () {
                        return createPromise<void>(function (resolve) {
                            setTimeout(function () {
                                order.push("test2");
                                resolve();
                            }, 5);
                        });
                    });

                    selfIt("test3", function () {
                        return createPromise<void>(function (resolve) {
                            setTimeout(function () {
                                order.push("test3");
                                resolve();
                            }, 5);
                        });
                    });
                });
            });

            const runner = createTestRunner(isolatedSuite);
            doAwait(runner.run(), function () {
                assert.deepEqual(order, [
                    "before",
                    "beforeEach", "test1", "afterEach",
                    "beforeEach", "test2", "afterEach",
                    "beforeEach", "test3", "afterEach",
                    "after"
                ]);
                done();
            });
        });

        it("should execute promise-returning nested suite hooks in correct order", function (done) {
            const isolatedSuite = createSuite();

            const order: string[] = [];

            useSuite(isolatedSuite, function () {
                selfDescribe("Outer", function () {
                    selfBefore(function () {
                        return createPromise<void>(function (resolve) {
                            setTimeout(function () {
                                order.push("outer-before");
                                resolve();
                            }, 5);
                        });
                    });

                    selfBeforeEach(function () {
                        return createPromise<void>(function (resolve) {
                            setTimeout(function () {
                                order.push("outer-beforeEach");
                                resolve();
                            }, 5);
                        });
                    });

                    selfAfterEach(function () {
                        return createPromise<void>(function (resolve) {
                            setTimeout(function () {
                                order.push("outer-afterEach");
                                resolve();
                            }, 5);
                        });
                    });

                    selfAfter(function () {
                        return createPromise<void>(function (resolve) {
                            setTimeout(function () {
                                order.push("outer-after");
                                resolve();
                            }, 5);
                        });
                    });

                    selfIt("outer-test", function () {
                        return createPromise<void>(function (resolve) {
                            setTimeout(function () {
                                order.push("outer-test");
                                resolve();
                            }, 5);
                        });
                    });

                    selfDescribe("Inner", function () {
                        selfBefore(function () {
                            return createPromise<void>(function (resolve) {
                                setTimeout(function () {
                                    order.push("inner-before");
                                    resolve();
                                }, 5);
                            });
                        });

                        selfBeforeEach(function () {
                            return createPromise<void>(function (resolve) {
                                setTimeout(function () {
                                    order.push("inner-beforeEach");
                                    resolve();
                                }, 5);
                            });
                        });

                        selfAfterEach(function () {
                            return createPromise<void>(function (resolve) {
                                setTimeout(function () {
                                    order.push("inner-afterEach");
                                    resolve();
                                }, 5);
                            });
                        });

                        selfAfter(function () {
                            return createPromise<void>(function (resolve) {
                                setTimeout(function () {
                                    order.push("inner-after");
                                    resolve();
                                }, 5);
                            });
                        });

                        selfIt("inner-test", function () {
                            return createPromise<void>(function (resolve) {
                                setTimeout(function () {
                                    order.push("inner-test");
                                    resolve();
                                }, 5);
                            });
                        });
                    });
                });
            });

            const runner = createTestRunner(isolatedSuite);
            doAwait(runner.run(), function () {
                assert.deepEqual(order, [
                    "outer-before",
                    "outer-beforeEach", "outer-test", "outer-afterEach",
                    "inner-before",
                    "outer-beforeEach", "inner-beforeEach", "inner-test", "inner-afterEach", "outer-afterEach",
                    "inner-after",
                    "outer-after"
                ]);
                done();
            });
        });

        it("should execute promise-returning inline suites in order", function (done) {
            const isolatedSuite = createSuite();

            const order: string[] = [];

            useSuite(isolatedSuite, function () {
                selfDescribe("Suite1", function () {
                    selfBefore(function () {
                        return createPromise<void>(function (resolve) {
                            setTimeout(function () {
                                order.push("suite1-before");
                                resolve();
                            }, 5);
                        });
                    });

                    selfAfter(function () {
                        return createPromise<void>(function (resolve) {
                            setTimeout(function () {
                                order.push("suite1-after");
                                resolve();
                            }, 5);
                        });
                    });

                    selfIt("test1", function () {
                        return createPromise<void>(function (resolve) {
                            setTimeout(function () {
                                order.push("suite1-test");
                                resolve();
                            }, 5);
                        });
                    });
                });

                selfDescribe("Suite2", function () {
                    selfBefore(function () {
                        return createPromise<void>(function (resolve) {
                            setTimeout(function () {
                                order.push("suite2-before");
                                resolve();
                            }, 5);
                        });
                    });

                    selfAfter(function () {
                        return createPromise<void>(function (resolve) {
                            setTimeout(function () {
                                order.push("suite2-after");
                                resolve();
                            }, 5);
                        });
                    });

                    selfIt("test2", function () {
                        return createPromise<void>(function (resolve) {
                            setTimeout(function () {
                                order.push("suite2-test");
                                resolve();
                            }, 5);
                        });
                    });
                });

                selfDescribe("Suite3", function () {
                    selfBefore(function () {
                        return createPromise<void>(function (resolve) {
                            setTimeout(function () {
                                order.push("suite3-before");
                                resolve();
                            }, 5);
                        });
                    });

                    selfAfter(function () {
                        return createPromise<void>(function (resolve) {
                            setTimeout(function () {
                                order.push("suite3-after");
                                resolve();
                            }, 5);
                        });
                    });

                    selfIt("test3", function () {
                        return createPromise<void>(function (resolve) {
                            setTimeout(function () {
                                order.push("suite3-test");
                                resolve();
                            }, 5);
                        });
                    });
                });
            });

            const runner = createTestRunner(isolatedSuite);
            doAwait(runner.run(), function () {
                assert.deepEqual(order, [
                    "suite1-before", "suite1-test", "suite1-after",
                    "suite2-before", "suite2-test", "suite2-after",
                    "suite3-before", "suite3-test", "suite3-after"
                ]);
                done();
            });
        });

        it("should execute mixed sync and promise-returning functions in order", function (done) {
            const isolatedSuite = createSuite();

            const order: string[] = [];

            useSuite(isolatedSuite, function () {
                selfDescribe("Suite", function () {
                    selfBefore(function () {
                        order.push("before-sync");
                    });

                    selfBefore(function () {
                        return createPromise<void>(function (resolve) {
                            setTimeout(function () {
                                order.push("before-promise");
                                resolve();
                            }, 5);
                        });
                    });

                    selfBeforeEach(function () {
                        return createPromise<void>(function (resolve) {
                            setTimeout(function () {
                                order.push("beforeEach-promise");
                                resolve();
                            }, 5);
                        });
                    });

                    selfBeforeEach(function () {
                        order.push("beforeEach-sync");
                    });

                    selfAfterEach(function () {
                        order.push("afterEach-sync");
                    });

                    selfAfterEach(function () {
                        return createPromise<void>(function (resolve) {
                            setTimeout(function () {
                                order.push("afterEach-promise");
                                resolve();
                            }, 5);
                        });
                    });

                    selfAfter(function () {
                        return createPromise<void>(function (resolve) {
                            setTimeout(function () {
                                order.push("after-promise");
                                resolve();
                            }, 5);
                        });
                    });

                    selfAfter(function () {
                        order.push("after-sync");
                    });

                    selfIt("sync-test", function () {
                        order.push("sync-test");
                    });

                    selfIt("promise-test", function () {
                        return createPromise<void>(function (resolve) {
                            setTimeout(function () {
                                order.push("promise-test");
                                resolve();
                            }, 5);
                        });
                    });
                });
            });

            const runner = createTestRunner(isolatedSuite);
            doAwait(runner.run(), function () {
                assert.deepEqual(order, [
                    "before-sync", "before-promise",
                    "beforeEach-promise", "beforeEach-sync", "sync-test", "afterEach-sync", "afterEach-promise",
                    "beforeEach-promise", "beforeEach-sync", "promise-test", "afterEach-sync", "afterEach-promise",
                    "after-promise", "after-sync"
                ]);
                done();
            });
        });

        it("should handle promise rejection in hooks", function (done) {
            const isolatedSuite = createSuite();

            useSuite(isolatedSuite, function () {
                selfDescribe("Suite", function () {
                    selfBeforeEach(function () {
                        return createPromise<void>(function (resolve, reject) {
                            setTimeout(function () {
                                reject(new Error("Hook failed"));
                            }, 5);
                        });
                    });

                    selfIt("test", function () {});
                });
            });

            const runner = createTestRunner(isolatedSuite);
            doAwait(runner.run(), function () {
                const results = runner.getResults();
                assert.equal(results.failed, 1);
                const suite = runner.getRootSuite();
                const testResult = runner.getTestResult(suite.suites[0].tests[0]);
                assert.equal(testResult.error.message, "Hook failed");
                done();
            });
        });

        it("should handle promise rejection in tests", function (done) {
            const isolatedSuite = createSuite();

            useSuite(isolatedSuite, function () {
                selfDescribe("Suite", function () {
                    selfIt("test", function () {
                        return createPromise(function (resolve, reject) {
                            setTimeout(function () {
                                reject(new Error("Test failed"));
                            }, 5);
                        });
                    });
                });
            });

            const runner = createTestRunner(isolatedSuite);
            doAwait(runner.run(), function () {
                const results = runner.getResults();
                assert.equal(results.failed, 1);
                const suite = runner.getRootSuite();
                const testResult = runner.getTestResult(suite.suites[0].tests[0]);
                assert.equal(testResult.error.message, "Test failed");
                done();
            });
        });

        it("should handle async tests with done callback", function (done) {
            const isolatedSuite = createSuite();

            let executed = false;

            useSuite(isolatedSuite, function () {
                selfDescribe("Suite", function () {
                    selfIt("async test", function (testDone) {
                        setTimeout(function () {
                            executed = true;
                            testDone();
                        }, 10);
                    });
                });
            });

            const runner = createTestRunner(isolatedSuite);
            doAwait(runner.run(), function () {
                assert.isTrue(executed);
                const results = runner.getResults();
                assert.equal(results.passed, 1);
                done();
            });
        });

        it("should handle async test errors with done.fail", function (done) {
            const isolatedSuite = createSuite();

            useSuite(isolatedSuite, function () {
                selfDescribe("Suite", function () {
                    selfIt("async test", function (testDone) {
                        testDone.fail(new Error("Test failed"));
                    });
                });
            });

            const runner = createTestRunner(isolatedSuite);
            doAwait(runner.run(), function () {
                const results = runner.getResults();
                assert.equal(results.failed, 1);
                done();
            });
        });

        it("should skip skipped suites", function (done) {
            const isolatedSuite = createSuite();

            useSuite(isolatedSuite, function () {
                selfDescribe.skip("Skipped Suite", function () {
                    selfIt("test", function () {
                        throw new Error("Should not run");
                    });
                });
            });

            const runner = createTestRunner(isolatedSuite);
            doAwait(runner.run(), function () {
                const results = runner.getResults();
                assert.equal(results.total, 1);
                assert.equal(results.skipped, 1);
                done();
            });
        });

        it("should execute nested suites", function (done) {
            const isolatedSuite = createSuite();

            let outerExecuted = false;
            let innerExecuted = false;

            useSuite(isolatedSuite, function () {
                selfDescribe("Outer", function () {
                    selfIt("outer test", function () {
                        outerExecuted = true;
                    });

                    selfDescribe("Inner", function () {
                        selfIt("inner test", function () {
                            innerExecuted = true;
                        });
                    });
                });
            });

            const runner = createTestRunner(isolatedSuite);
            doAwait(runner.run(), function () {
                assert.isTrue(outerExecuted);
                assert.isTrue(innerExecuted);
                const results = runner.getResults();
                assert.equal(results.passed, 2);
                done();
            });
        });

        it("should inherit beforeEach hooks from parent", function (done) {
            const isolatedSuite = createSuite();

            let parentHookExecuted = false;
            let childHookExecuted = false;

            useSuite(isolatedSuite, function () {
                selfDescribe("Parent", function () {
                    selfBeforeEach(function () {
                        parentHookExecuted = true;
                    });

                    selfDescribe("Child", function () {
                        selfBeforeEach(function () {
                            childHookExecuted = true;
                        });

                        selfIt("test", function () {
                            assert.isTrue(parentHookExecuted);
                            assert.isTrue(childHookExecuted);
                        });
                    });
                });
            });

            const runner = createTestRunner(isolatedSuite);
            doAwait(runner.run(), function () {
                const results = runner.getResults();
                assert.equal(results.passed, 1);
                done();
            });
        });

        it("should fail test if beforeEach hook throws", function (done) {
            const isolatedSuite = createSuite();

            useSuite(isolatedSuite, function () {
                selfDescribe("Suite", function () {
                    selfBeforeEach(function () {
                        throw new Error("Hook error");
                    });

                    selfIt("test", function () {});
                });
            });

            const runner = createTestRunner(isolatedSuite);
            doAwait(runner.run(), function () {
                const results = runner.getResults();
                assert.equal(results.failed, 1);
                const suite = runner.getRootSuite();
                const testResult = runner.getTestResult(suite.suites[0].tests[0]);
                assert.equal(testResult.error.message, "Hook error");
                done();
            });
        });

        it("should still run afterEach if test fails", function (done) {
            const isolatedSuite = createSuite();

            let afterEachExecuted = false;

            useSuite(isolatedSuite, function () {
                selfDescribe("Suite", function () {
                    selfAfterEach(function () {
                        afterEachExecuted = true;
                    });

                    selfIt("test", function () {
                        throw new Error("Test error");
                    });
                });
            });

            const runner = createTestRunner(isolatedSuite);
            doAwait(runner.run(), function () {
                assert.isTrue(afterEachExecuted);
                done();
            });
        });
    });

    describe("hook failures", function () {

        it("should not report any hook failures when every hook passes", function (done) {
            const isolatedSuite = createSuite();

            useSuite(isolatedSuite, function () {
                selfDescribe("Suite", function () {
                    selfBefore(function () {});
                    selfAfter(function () {});
                    selfIt("test", function () {});
                });
            });

            const runner = createTestRunner(isolatedSuite);
            doAwait(runner.run(), function () {
                assert.isUndefined(runner.getResults().hookFailures);
                done();
            });
        });

        it("should record an after hook failure without failing any test", function (done) {
            const isolatedSuite = createSuite();

            useSuite(isolatedSuite, function () {
                selfDescribe("Suite", function () {
                    selfAfter(function () {
                        throw new Error("after error");
                    });

                    selfIt("test", function () {});
                });
            });

            const runner = createTestRunner(isolatedSuite);
            // A failing after hook unwinds the run, but the run itself still resolves -- what to
            // do about it is the caller's call (see the runner CLI's --fail-on-hook).
            doAwait(runner.run(), function () {
                const results = runner.getResults();
                const failures = results.hookFailures || [];
                assert.equal(results.passed, 1);
                assert.equal(results.failed, 0);
                assert.equal(failures.length, 1);
                assert.equal(failures[0].group, "afterAll");
                assert.equal(failures[0].message, "after error");
                assert.equal(failures[0].suite, "root > Suite");
                assert.isUndefined(failures[0].test);
                done();
            }, function (error) {
                done(error || new Error("run should not have been rejected"));
            });
        });

        it("should record a before hook failure", function (done) {
            const isolatedSuite = createSuite();

            useSuite(isolatedSuite, function () {
                selfDescribe("Suite", function () {
                    selfBefore(function () {
                        throw new Error("before error");
                    });

                    selfIt("test", function () {});
                });
            });

            const runner = createTestRunner(isolatedSuite);
            doAwait(runner.run(), function () {
                const failures = runner.getResults().hookFailures || [];
                assert.equal(failures.length, 1);
                assert.equal(failures[0].group, "beforeAll");
                assert.equal(failures[0].message, "before error");
                done();
            }, function (error) {
                done(error || new Error("run should not have been rejected"));
            });
        });

        it("should record an afterEach failure for a test that had already failed", function (done) {
            const isolatedSuite = createSuite();

            useSuite(isolatedSuite, function () {
                selfDescribe("Suite", function () {
                    selfAfterEach(function () {
                        throw new Error("afterEach error");
                    });

                    selfIt("test", function () {
                        throw new Error("Test error");
                    });
                });
            });

            const runner = createTestRunner(isolatedSuite);
            doAwait(runner.run(), function () {
                const results = runner.getResults();
                const failures = results.hookFailures || [];
                // The test keeps its own error (the hook failure has nowhere to go on a result
                // that is already failed) -- which is exactly why it is tracked separately.
                assert.equal(results.failed, 1);
                assert.equal(failures.length, 1);
                assert.equal(failures[0].group, "afterEach");
                assert.equal(failures[0].message, "afterEach error");
                assert.equal(failures[0].test, "test");
                done();
            });
        });

        it("should record a named hook by name", function (done) {
            const isolatedSuite = createSuite();

            useSuite(isolatedSuite, function () {
                selfDescribe("Suite", function () {
                    selfAfter("teardown db", function () {
                        throw new Error("after error");
                    });

                    selfIt("test", function () {});
                });
            });

            const runner = createTestRunner(isolatedSuite);
            doAwait(runner.run(), function () {
                assert.equal((runner.getResults().hookFailures || [])[0].name, "teardown db");
                done();
            });
        });

        it("should discard hook failures from a previous run", function (done) {
            const isolatedSuite = createSuite();
            let shouldThrow = true;

            useSuite(isolatedSuite, function () {
                selfDescribe("Suite", function () {
                    selfAfter(function () {
                        if (shouldThrow) {
                            throw new Error("after error");
                        }
                    });

                    selfIt("test", function () {});
                });
            });

            const runner = createTestRunner(isolatedSuite);
            doAwait(runner.run(), function () {
                assert.equal((runner.getResults().hookFailures || []).length, 1);
                shouldThrow = false;

                doAwait(runner.run(), function () {
                    assert.isUndefined(runner.getResults().hookFailures);
                    done();
                });
            });
        });
    });

    /*
     * A failing `beforeAll`/`afterAll` used to `throw`, which unwound every enclosing suite and
     * ended the run there -- tests queued behind it were still counted by `_countAll` but never
     * reported, so reporters announced totals they never accounted for (an unsatisfiable TAP plan,
     * a progress bar stuck short of 100%) and the run still exited 0.
     *
     * It now stops only the suite whose own setup failed, and the run carries on: one suite's
     * setup/teardown says nothing about the next one's. Promoting a hook failure to a failed *run*
     * is `--fail-on-hook`'s job and reads the summary; `--bail` is about test failures and does not
     * look at hooks at all. The one thing that still stops the run here is a listener that aborts
     * from the Hook event, which reaches the same `suiteResult.aborted` propagation an aborted test
     * uses -- covered by the last two cases below.
     */
    describe("hook failures do not end the run", function () {

        function _abortOnHookFailureListener(): IListener {
            return {
                onDone: function (_event, context) {
                    const ctx: any = context && (context as any).v;
                    if (ctx && ctx.hook && ctx.end && ctx.end.error) {
                        return { action: eListenerAction.Abort, reason: "Bail: hook failure" };
                    }

                    return undefined;
                }
            } as IListener;
        }

        function _threeSuites(bad: "beforeAll" | "afterAll") {
            const isolatedSuite = createSuite();

            useSuite(isolatedSuite, function () {
                selfDescribe("healthy first", function () {
                    selfIt("gamma", function () {});
                });

                selfDescribe("broken", function () {
                    if (bad === "beforeAll") {
                        selfBefore(function () {
                            throw new Error("boom in beforeAll");
                        });
                    } else {
                        selfAfter(function () {
                            throw new Error("boom in afterAll");
                        });
                    }

                    selfIt("alpha", function () {});
                });

                selfDescribe("healthy after", function () {
                    selfIt("delta", function () {});
                });
            });

            return isolatedSuite;
        }

        it("should run the sibling suites queued after a failed beforeAll", function (done) {
            const runner = createTestRunner(_threeSuites("beforeAll"));

            doAwait(runner.run(), function () {
                const results = runner.getResults();

                // "delta" is in an unrelated sibling suite -- the broken setup says nothing about
                // it, so it runs. "alpha" could not run (its own setup failed) and is reported as
                // skipped, the same as every other never-ran test.
                assert.equal(results.total, 3, "total");
                assert.equal(results.passed, 2, "passed (gamma + delta)");
                assert.equal(results.skipped, 1, "skipped (alpha)");
                assert.equal(results.failed, 0, "failed");
                assert.equal((results.hookFailures || []).length, 1, "hook recorded");
                assert.equal((results.hookFailures || [])[0].group, "beforeAll");
                done();
            }, function (error) {
                done(error || new Error("run should not have been rejected"));
            });
        });

        it("should run the sibling suites queued after a failed afterAll", function (done) {
            const runner = createTestRunner(_threeSuites("afterAll"));

            doAwait(runner.run(), function () {
                const results = runner.getResults();

                // The broken suite's own test already ran and passed before its teardown failed.
                assert.equal(results.total, 3, "total");
                assert.equal(results.passed, 3, "passed");
                assert.equal((results.hookFailures || []).length, 1, "hook recorded");
                assert.equal((results.hookFailures || [])[0].group, "afterAll");
                done();
            }, function (error) {
                done(error || new Error("run should not have been rejected"));
            });
        });

        it("should report every counted test even though one suite never ran", function (done) {
            const seen: string[] = [];
            const runner = createTestRunner(_threeSuites("beforeAll"));

            runner.addListener({
                onDone: function (event, context) {
                    const ctx: any = context && (context as any).v;
                    if (event === eListenerEvent.Test && ctx && ctx.test) {
                        seen.push(ctx.test.description);
                    }

                    return undefined;
                }
            } as IListener);

            doAwait(runner.run(), function () {
                // The defect this pins: `total` promised 3 while only 1 Test done event was ever
                // emitted, so a TAP plan of 1..3 was followed by a single result line.
                assert.equal(runner.getResults().total, seen.length, "every counted test reported");
                assert.equal(seen.length, 3, "gamma + alpha + delta");
                done();
            });
        });

        it("should stop the run when a listener aborts from a failing hook", function (done) {
            const runner = createTestRunner(_threeSuites("beforeAll"));
            runner.addListener(_abortOnHookFailureListener());

            doAwait(runner.run(), function () {
                const results = runner.getResults();

                // The abort stops the run, so "delta" never runs -- but it is still reported, so
                // the totals and the emitted events continue to agree.
                assert.equal(results.total, 3, "total");
                assert.equal(results.passed, 1, "passed (gamma only)");
                assert.equal(results.skipped, 2, "skipped (alpha + delta)");
                done();
            }, function (error) {
                done(error || new Error("run should not have been rejected"));
            });
        });

        it("should still record the hook failure a listener aborted from", function (done) {
            const runner = createTestRunner(_threeSuites("beforeAll"));
            runner.addListener(_abortOnHookFailureListener());

            doAwait(runner.run(), function () {
                // The abort short-circuits out of the hook runner, so the failure has to be
                // recorded before the Hook end event is notified -- otherwise the very hook that
                // stopped the run is the one missing from the summary.
                const failures = runner.getResults().hookFailures || [];
                assert.equal(failures.length, 1, "hook recorded despite the abort");
                assert.equal(failures[0].group, "beforeAll");
                assert.equal(failures[0].message, "boom in beforeAll");
                done();
            });
        });
    });

    describe("getResults", function () {

        it("should count total tests", function (done) {
            const isolatedSuite = createSuite();

            useSuite(isolatedSuite, function () {
                selfDescribe("Suite", function () {
                    selfIt("test 1", function () {});
                    selfIt("test 2", function () {});
                    selfIt("test 3", function () {});
                });
            });

            const runner = createTestRunner(isolatedSuite);
            doAwait(runner.run(), function () {
                const results = runner.getResults();
                assert.equal(results.total, 3);
                done();
            });
        });

        it("should count passed tests", function (done) {
            const isolatedSuite = createSuite();

            useSuite(isolatedSuite, function () {
                selfDescribe("Suite", function () {
                    selfIt("test 1", function () {});
                    selfIt("test 2", function () {});
                });
            });

            const runner = createTestRunner(isolatedSuite);
            doAwait(runner.run(), function () {
                const results = runner.getResults();
                assert.equal(results.passed, 2);
                done();
            });
        });

        it("should count failed tests", function (done) {
            const isolatedSuite = createSuite();

            useSuite(isolatedSuite, function () {
                selfDescribe("Suite", function () {
                    selfIt("test 1", function () {
                        throw new Error("Fail");
                    });
                    selfIt("test 2", function () {});
                });
            });

            const runner = createTestRunner(isolatedSuite);
            doAwait(runner.run(), function () {
                const results = runner.getResults();
                assert.equal(results.failed, 1);
                assert.equal(results.passed, 1);
                done();
            });
        });

        it("should count skipped tests", function (done) {
            const isolatedSuite = createSuite();

            useSuite(isolatedSuite, function () {
                selfDescribe("Suite", function () {
                    selfIt.skip("test 1", function () {});
                    selfIt("test 2", function () {});
                });
            });

            const runner = createTestRunner(isolatedSuite);
            doAwait(runner.run(), function () {
                const results = runner.getResults();
                assert.equal(results.skipped, 1);
                assert.equal(results.passed, 1);
                done();
            });
        });

        it("should count pending tests", function (done) {
            const isolatedSuite = createSuite();

            useSuite(isolatedSuite, function () {
                selfDescribe("Suite", function () {
                    selfIt("test 1");
                    selfIt("test 2", function () {});
                });
            });

            const runner = createTestRunner(isolatedSuite);
            doAwait(runner.run(), function () {
                const results = runner.getResults();
                assert.equal(results.pending, 1);
                assert.equal(results.passed, 1);
                done();
            });
        });

        it("should count tests in nested suites", function (done) {
            const isolatedSuite = createSuite();

            useSuite(isolatedSuite, function () {
                selfDescribe("Outer", function () {
                    selfIt("test 1", function () {});

                    selfDescribe("Inner", function () {
                        selfIt("test 2", function () {});
                        selfIt("test 3", function () {});
                    });
                });
            });

            const runner = createTestRunner(isolatedSuite);
            doAwait(runner.run(), function () {
                const results = runner.getResults();
                assert.equal(results.total, 3);
                assert.equal(results.passed, 3);
                done();
            });
        });
    });

    describe("result validation", function () {

        describe("runner metrics", function () {

            it("should capture sync execution metrics", function (done) {
                const suite = createSuite();

                useSuite(suite, function () {
                    selfDescribe("Suite", function () {
                        selfBefore(function () {});
                        selfBeforeEach(function () {});
                        selfAfterEach(function () {});
                        selfAfter(function () {});

                        selfIt("test", function () {});
                    });
                });

                const runner = createTestRunner(suite, undefined, { metrics: true });
                doAwait(runner.run(), function () {
                    try {
                        const metrics = runner.getMetrics();

                        assert.equal(metrics.executionMode, "sync");
                        assert.equal(metrics.counts.tests, 1);
                        assert.equal(metrics.counts.suites, 2);
                        assert.equal(metrics.counts.hooks, 4);
                        assert.equal(metrics.counts.testBodies, 1);
                        assert.equal(metrics.counts.syncExecutions, 5);
                        assert.equal(metrics.counts.asyncExecutions, 0);
                        assert.equal(metrics.totalWaitTime, 0);
                        assert.equal(metrics.perTestWaitRatios.length, 1);
                        assert.equal(metrics.perTestWaitRatios[0].waitRatio, 0);
                        assert.equal(metrics.retryDiagnostics.totalRetries, 0);
                        assert.equal(metrics.timeoutDiagnostics.totalTimeouts, 0);
                        assert.isTrue(metrics.criticalPathDuration >= 0);
                        assert.isTrue(metrics.slowestExecutions.byDuration.length > 0);
                        assert.isTrue(metrics.traceCompression.totalEvents > 0);
                        assert.equal(metrics.currentStackDepth, 0);
                        assert.equal(metrics.stackNestedDepth, 0);

                        /*
                         * Structure: root(1) -> Suite(2) -> test(3).
                         * before/after run inside Suite scope (depth=2) -> push to depth=3.
                         * beforeEach/afterEach run inside test scope (depth=3) -> push to depth=4.
                         */
                        assert.equal(metrics.maxStackDepth, 4);
                        /*
                         * For synchronous execution, maxStackNestedDepth equals maxStackDepth
                         * because scope-entry depth IS the full logical execution depth.
                         */
                        assert.equal(metrics.maxStackNestedDepth, 4);

                        assert.isTrue(metrics.trace.length > 0);
                        done();
                    } catch (e) {
                        done(e as any);
                    }
                });
            });

            it("should capture async execution and wait time metrics", function (done) {
                const suite = createSuite();

                useSuite(suite, function () {
                    selfDescribe("Suite", function () {
                        selfBeforeEach(function () {
                            return createPromise<void>(function (resolve) {
                                setTimeout(function () {
                                    resolve();
                                }, 5);
                            });
                        });

                        selfIt("async test", function (testDone) {
                            setTimeout(function () {
                                testDone();
                            }, 10);
                        });
                    });
                });

                const runner = createTestRunner(suite, undefined, { metrics: true });
                doAwait(runner.run(), function () {
                    const metrics = runner.getMetrics();

                    assert.equal(metrics.counts.tests, 1);
                    assert.equal(metrics.counts.hooks, 1);
                    assert.equal(metrics.counts.testBodies, 1);
                    assert.equal(metrics.counts.asyncExecutions, 2);
                    assert.equal(metrics.counts.syncExecutions, 0);
                    assert.equal(metrics.executionMode, "async");
                    assert.isTrue(metrics.totalExecutionTime >= metrics.totalWaitTime);
                    assert.isTrue(metrics.totalWaitTime > 0);
                    assert.equal(metrics.perTestWaitRatios.length, 1);
                    assert.isTrue(metrics.perTestWaitRatios[0].waitRatio > 0);
                    assert.isTrue(metrics.slowestExecutions.byWaitTime.length > 0);
                    assert.isTrue(metrics.traceCompression.repeatedSignatures >= 0);
                    assert.equal(metrics.currentStackDepth, 0);
                    assert.equal(metrics.stackNestedDepth, 0);
                    /*
                     * Structure: root(1) -> Suite(2) -> test(3) -> beforeEach(4).
                     * Async continuation inherits depth 3 (captured before hook scope entry) -> depth 4.
                     * For deeper nesting or chained async continuations, this would exceed maxStackDepth.
                     */
                    assert.equal(metrics.maxStackNestedDepth, 4);
                    done();
                });
            });

            it("should mark execution mode as mixed for sync and async test functions", function (done) {
                const suite = createSuite();

                useSuite(suite, function () {
                    selfDescribe("Suite", function () {
                        selfIt("sync test", function () {});

                        selfIt("async test", function () {
                            return createPromise<void>(function (resolve) {
                                setTimeout(function () {
                                    resolve();
                                }, 5);
                            });
                        });
                    });
                });

                const runner = createTestRunner(suite, undefined, { metrics: true });
                doAwait(runner.run(), function () {
                    const metrics = runner.getMetrics();

                    assert.equal(metrics.counts.tests, 2);
                    assert.equal(metrics.counts.testBodies, 2);
                    assert.equal(metrics.counts.syncExecutions, 1);
                    assert.equal(metrics.counts.asyncExecutions, 1);
                    assert.equal(metrics.executionMode, "mixed");
                    done();
                });
            });

            it("should capture retry diagnostics", function (done) {
                const suite = createSuite();
                let attempt = 0;

                useSuite(suite, function () {
                    selfDescribe("Suite", function () {
                        selfBeforeEach(function () {
                            this.retries(1);
                        });

                        selfIt("retry test", function () {
                            attempt++;
                            if (attempt === 1) {
                                throw new Error("retry");
                            }
                        });
                    });
                });

                const runner = createTestRunner(suite, undefined, { metrics: true });
                doAwait(runner.run(), function () {
                    const metrics = runner.getMetrics();

                    assert.equal(metrics.retryDiagnostics.totalRetries, 1);
                    assert.equal(metrics.retryDiagnostics.tests.length, 1);
                    assert.equal(metrics.retryDiagnostics.tests[0].retries, 1);
                    done();
                });
            });

            it("should capture timeout hotspots", function (done) {
                const suite = createSuite();

                useSuite(suite, function () {
                    selfDescribe("Suite", function () {
                        selfIt("timeout test", function (testDone) {
                            this.timeout(5);

                            setTimeout(function () {
                                testDone();
                            }, 20);
                        });
                    });
                });

                const runner = createTestRunner(suite, undefined, { metrics: true });
                doAwait(runner.run(), function () {
                    const metrics = runner.getMetrics();

                    assert.isTrue(metrics.timeoutDiagnostics.totalTimeouts > 0);
                    assert.isTrue(metrics.timeoutDiagnostics.hotspots.length > 0);
                    assert.isTrue(metrics.timeoutDiagnostics.hotspots[0].timedOut > 0);
                    done();
                });
            });

            it("should have maxStackDepth of 4 for one suite level with multiple tests and all hook types", function (done) {
                /*
                 * Structure: root(1) -> Suite(2) -> [test1,test2,test3](3)
                 * before/after run inside Suite scope (depth=2) -> push to depth=3.
                 * beforeEach/afterEach run inside test scope (depth=3) -> push to depth=4.
                 * Sequential tests execute at the same depth and never stack.
                 */
                const suite = createSuite();

                useSuite(suite, function () {
                    selfDescribe("Suite", function () {
                        selfBefore(function () {});
                        selfBefore(function () {});
                        selfBeforeEach(function () {});
                        selfBeforeEach(function () {});
                        selfAfterEach(function () {});
                        selfAfterEach(function () {});
                        selfAfter(function () {});
                        selfAfter(function () {});

                        selfIt("test1", function () {});
                        selfIt("test2", function () {});
                        selfIt("test3", function () {});
                    });
                });

                const runner = createTestRunner(suite, undefined, { metrics: true });
                doAwait(runner.run(), function () {
                    try {
                        const metrics = runner.getMetrics();
                        assert.equal(metrics.currentStackDepth, 0);
                        assert.equal(metrics.maxStackDepth, 4);
                        done();
                    } catch (e) {
                        done(e as any);
                    }
                });
            });

            it("should have maxStackDepth of 5 for one level of embedded suites with hooks and multiple tests", function (done) {
                /*
                 * Structure: root(1) -> Outer(2) -> Inner(3) -> [test1,test2](4)
                 * before/after at Outer (depth=2) push to depth=3; before/after at Inner (depth=3) push to depth=4.
                 * beforeEach/afterEach run inside test scope (depth=4) -> push to depth=5.
                 */
                const suite = createSuite();

                useSuite(suite, function () {
                    selfDescribe("Outer", function () {
                        selfBefore(function () {});
                        selfBeforeEach(function () {});
                        selfAfterEach(function () {});
                        selfAfter(function () {});

                        selfDescribe("Inner", function () {
                            selfBefore(function () {});
                            selfBeforeEach(function () {});
                            selfAfterEach(function () {});
                            selfAfter(function () {});

                            selfIt("test1", function () {});
                            selfIt("test2", function () {});
                        });
                    });
                });

                const runner = createTestRunner(suite, undefined, { metrics: true });
                doAwait(runner.run(), function () {
                    try {
                        const metrics = runner.getMetrics();
                        assert.equal(metrics.currentStackDepth, 0);
                        assert.equal(metrics.maxStackDepth, 5);
                        done();
                    } catch (e) {
                        done(e as any);
                    }
                });
            });

            it("should have maxStackDepth of 5 for two levels of embedded suites", function (done) {
                /*
                 * Structure: root(1) -> L1(2) -> L2(3) -> L3(4) -> test(5)
                 * before/after at each level push +1 within their suite scope.
                 * before at L3 (depth=4) -> depth=5, test at L3 (depth=4) -> depth=5. Max = 5.
                 * No beforeEach hooks here, so test scope is not exceeded further.
                 */
                const suite = createSuite();

                useSuite(suite, function () {
                    selfDescribe("L1", function () {
                        selfBefore(function () {});
                        selfAfter(function () {});

                        selfDescribe("L2", function () {
                            selfBefore(function () {});
                            selfAfter(function () {});

                            selfDescribe("L3", function () {
                                selfBefore(function () {});
                                selfAfter(function () {});

                                selfIt("test", function () {});
                            });
                        });
                    });
                });

                const runner = createTestRunner(suite, undefined, { metrics: true });
                doAwait(runner.run(), function () {
                    try {
                        const metrics = runner.getMetrics();
                        assert.equal(metrics.currentStackDepth, 0);
                        assert.equal(metrics.maxStackDepth, 5);
                        done();
                    } catch (e) {
                        done(e as any);
                    }
                });
            });

            it("should have maxStackDepth of 4 for multiple sibling suites each with multiple tests", function (done) {
                /*
                 * Sibling suites execute sequentially, not nested.
                 * Structure: root(1) -> [SuiteA(2) -> tests(3), SuiteB(2) -> tests(3), SuiteC(2) -> tests(3)]
                 * before/after run inside Suite scope (depth=2) -> push to depth=3.
                 * beforeEach/afterEach run inside test scope (depth=3) -> push to depth=4.
                 * No suite stacks on top of another sibling so max is always 4.
                 */
                const suite = createSuite();

                useSuite(suite, function () {
                    selfDescribe("SuiteA", function () {
                        selfBefore(function () {});
                        selfBeforeEach(function () {});
                        selfAfterEach(function () {});
                        selfAfter(function () {});

                        selfIt("A-test1", function () {});
                        selfIt("A-test2", function () {});
                        selfIt("A-test3", function () {});
                    });

                    selfDescribe("SuiteB", function () {
                        selfBefore(function () {});
                        selfBeforeEach(function () {});
                        selfAfterEach(function () {});
                        selfAfter(function () {});

                        selfIt("B-test1", function () {});
                        selfIt("B-test2", function () {});
                        selfIt("B-test3", function () {});
                    });

                    selfDescribe("SuiteC", function () {
                        selfBefore(function () {});
                        selfBeforeEach(function () {});
                        selfAfterEach(function () {});
                        selfAfter(function () {});

                        selfIt("C-test1", function () {});
                        selfIt("C-test2", function () {});
                        selfIt("C-test3", function () {});
                    });
                });

                const runner = createTestRunner(suite, undefined, { metrics: true });
                doAwait(runner.run(), function () {
                    try {
                        const metrics = runner.getMetrics();
                        assert.equal(metrics.currentStackDepth, 0);
                        assert.equal(metrics.maxStackDepth, 4);
                        done();
                    } catch (e) {
                        done(e as any);
                    }
                });
            });

            it("should have maxStackDepth of 5 for sibling suites that themselves contain embedded suites", function (done) {
                /*
                 * Each sibling's inner suite reaches depth 4. Siblings run sequentially.
                 * Structure: root(1) -> SuiteA(2) -> InnerA(3) -> test(4)
                 *                   -> SuiteB(2) -> InnerB(3) -> test(4)  [sequential, not stacked]
                 * beforeEach collected from SuiteA+InnerA chain runs inside test scope (depth=4) -> push to depth=5.
                 * maxStackDepth stays at 5 regardless of how many siblings there are.
                 */
                const suite = createSuite();

                useSuite(suite, function () {
                    selfDescribe("SuiteA", function () {
                        selfBeforeEach(function () {});
                        selfAfterEach(function () {});

                        selfDescribe("InnerA", function () {
                            selfBeforeEach(function () {});
                            selfAfterEach(function () {});

                            selfIt("A-inner-test1", function () {});
                            selfIt("A-inner-test2", function () {});
                        });
                    });

                    selfDescribe("SuiteB", function () {
                        selfBeforeEach(function () {});
                        selfAfterEach(function () {});

                        selfDescribe("InnerB", function () {
                            selfBeforeEach(function () {});
                            selfAfterEach(function () {});

                            selfIt("B-inner-test1", function () {});
                            selfIt("B-inner-test2", function () {});
                        });
                    });
                });

                const runner = createTestRunner(suite, undefined, { metrics: true });
                doAwait(runner.run(), function () {
                    try {
                        const metrics = runner.getMetrics();
                        assert.equal(metrics.currentStackDepth, 0);
                        assert.equal(metrics.maxStackDepth, 5);
                        done();
                    } catch (e) {
                        done(e as any);
                    }
                });
            });

            it("should have maxStackDepth of 3 regardless of test count (10 suites x 25 tests)", function (done) {
                /*
                 * Width (more suites/tests) never increases depth since siblings are sequential.
                 * Structure: root(1) -> SuiteN(2) -> testN(3). No hooks, so max stays at 3.
                 */
                const isolatedSuite = createSuite();

                useSuite(isolatedSuite, function () {
                    for (let suiteIdx = 0; suiteIdx < 10; suiteIdx++) {
                        selfDescribe("Suite " + suiteIdx, function () {
                            for (let testIdx = 0; testIdx < 25; testIdx++) {
                                selfIt("test " + suiteIdx + ":" + testIdx, function () {});
                            }
                        });
                    }
                });

                const runner = createTestRunner(isolatedSuite);
                doAwait(runner.run(), function () {
                    try {
                        const metrics = runner.getMetrics();
                        /*
                         * Structure: root(1) -> SuiteN(2) -> testN(3)
                         * 10 x 25 = 250 tests, all at depth 3.
                         */
                        assert.equal(metrics.counts.tests, 250);
                        assert.equal(metrics.currentStackDepth, 0);
                        assert.equal(metrics.maxStackDepth, 3);
                        done();
                    } catch (e) {
                        done(e as any);
                    }
                });
            });
        });

        describe("test result aborted and reason", function () {

            it("should mark test result as aborted when listener aborts in onStart", function (done) {
                const suite = createSuite();

                useSuite(suite, function () {
                    selfDescribe("Suite", function () {
                        selfIt("test", function () {
                            // Should not execute
                        });
                    });
                });

                const runner = createTestRunner(suite);
                const listener: IListener = {
                    onStart(event, lazyContext) {
                        const context = lazyContext.v;
                        if (context.type === eListenerEvent.Test) {
                            return { action: eListenerAction.Abort };
                        }
                    }
                };

                runner.addListener(listener);
                doAwait(runner.run(), function () {
                    const test = suite.suites[0].tests[0];
                    const testResult = runner.getTestResult(test);
                    assert.isDefined(testResult);
                    assert.isTrue(testResult.aborted, "Test should be marked as aborted");
                    done();
                });
            });

            it("should capture abort reason in test result", function (done) {
                const suite = createSuite();

                useSuite(suite, function () {
                    selfDescribe("Suite", function () {
                        selfIt("test", function () {
                            // Should not execute
                        });
                    });
                });

                const runner = createTestRunner(suite);
                const listener: IListener = {
                    onStart(event, lazyContext) {
                        const context = lazyContext.v;
                        if (context.type === eListenerEvent.Test) {
                            return {
                                action: eListenerAction.Abort,
                                reason: "Test aborted by listener for testing"
                            };
                        }
                    }
                };

                runner.addListener(listener);
                doAwait(runner.run(), function () {
                    const test = suite.suites[0].tests[0];
                    const testResult = runner.getTestResult(test);
                    assert.isTrue(testResult.aborted, "Test should be marked as aborted");
                    assert.equal(testResult.reason, "Test aborted by listener for testing", "Should capture abort reason");
                    done();
                });
            });

            it("should mark test result as aborted when listener aborts in onDone", function (done) {
                const suite = createSuite();
                let testExecuted = false;

                useSuite(suite, function () {
                    selfDescribe("Suite", function () {
                        selfIt("test", function () {
                            testExecuted = true;
                        });
                    });
                });

                const runner = createTestRunner(suite);
                const listener: IListener = {
                    onDone(event, lazyContext) {
                        const context = lazyContext.v;
                        if (context.type === eListenerEvent.Test) {
                            return {
                                action: eListenerAction.Abort,
                                reason: "Aborted in onDone"
                            };
                        }
                    }
                };

                runner.addListener(listener);
                doAwait(runner.run(), function () {
                    assert.isTrue(testExecuted, "Test should have executed");
                    const test = suite.suites[0].tests[0];
                    const testResult = runner.getTestResult(test);
                    assert.isTrue(testResult.aborted, "Test should be marked as aborted");
                    assert.equal(testResult.reason, "Aborted in onDone");
                    done();
                });
            });

            it("should mark test result as aborted when assertion listener aborts", function (done) {
                const suite = createSuite();

                useSuite(suite, function () {
                    selfDescribe("Suite", function () {
                        selfIt("test", function () {
                            assert.equal(1, 2); // This will fail and trigger abort
                        });
                    });
                });

                const runner = createTestRunner(suite);
                const listener: IListener = {
                    onAssert(lazyContext) {
                        const context = lazyContext.v;
                        if (!context.passed) {
                            return {
                                action: eListenerAction.Abort,
                                reason: "Failed assertion triggered abort"
                            };
                        }
                    }
                };

                runner.addListener(listener);
                doAwait(runner.run(), function () {
                    const test = suite.suites[0].tests[0];
                    const testResult = runner.getTestResult(test);
                    assert.isTrue(testResult.aborted, "Test should be marked as aborted");
                    assert.equal(testResult.reason, "Failed assertion triggered abort");
                    done();
                });
            });

            it("should not mark test result as aborted for normal execution", function (done) {
                const suite = createSuite();

                useSuite(suite, function () {
                    selfDescribe("Suite", function () {
                        selfIt("test", function () {
                            assert.equal(1, 1);
                        });
                    });
                });

                const runner = createTestRunner(suite);
                doAwait(runner.run(), function () {
                    const test = suite.suites[0].tests[0];
                    const testResult = runner.getTestResult(test);
                    assert.isNotTrue(testResult.aborted, "Test should not be marked as aborted");
                    assert.isUndefined(testResult.reason, "Should not have abort reason");
                    done();
                });
            });

            it("should not mark test result as aborted when listener returns Skip", function (done) {
                const suite = createSuite();

                useSuite(suite, function () {
                    selfDescribe("Suite", function () {
                        selfIt("test", function () {
                            assert.equal(1, 1);
                        });
                    });
                });

                const runner = createTestRunner(suite);
                const listener: IListener = {
                    onStart(event, lazyContext) {
                        const context = lazyContext.v;
                        if (context.type === eListenerEvent.Test) {
                            return { action: eListenerAction.Skip };
                        }
                    }
                };

                runner.addListener(listener);
                doAwait(runner.run(), function () {
                    const test = suite.suites[0].tests[0];
                    const testResult = runner.getTestResult(test);
                    assert.isNotTrue(testResult.aborted, "Test should not be marked as aborted for Skip");
                    done();
                });
            });
        });

        describe("suite result aborted and reason", function () {

            it("should mark suite result as aborted when listener aborts in onStart", function (done) {
                const suite = createSuite();

                useSuite(suite, function () {
                    selfDescribe("Suite", function () {
                        selfIt("test1", function () {});
                        selfIt("test2", function () {});
                    });
                });

                const runner = createTestRunner(suite);
                const listener: IListener = {
                    onStart(event, lazyContext) {
                        const context = lazyContext.v;
                        // Only abort child suites, not the root suite
                        if (context.type === eListenerEvent.Suite && context.suite && context.suite.parent) {
                            return { action: eListenerAction.Abort };
                        }
                    }
                };

                runner.addListener(listener);
                doAwait(runner.run(), function () {
                    const childSuite = suite.suites[0];
                    const suiteResult = runner.getSuiteResult(childSuite);
                    assert.isTrue(suiteResult.aborted, "Suite should be marked as aborted");
                    done();
                });
            });

            it("should capture abort reason in suite result", function (done) {
                const suite = createSuite();

                useSuite(suite, function () {
                    selfDescribe("Suite", function () {
                        selfIt("test1", function () {});
                        selfIt("test2", function () {});
                    });
                });

                const runner = createTestRunner(suite);
                const listener: IListener = {
                    onStart(event, lazyContext) {
                        const context = lazyContext.v;
                        // Only abort child suites, not the root suite
                        if (context.type === eListenerEvent.Suite && context.suite && context.suite.parent) {
                            return {
                                action: eListenerAction.Abort,
                                reason: "Suite aborted for testing purposes"
                            };
                        }
                    }
                };

                runner.addListener(listener);
                doAwait(runner.run(), function () {
                    const childSuite = suite.suites[0];
                    const suiteResult = runner.getSuiteResult(childSuite);
                    assert.isTrue(suiteResult.aborted, "Suite should be marked as aborted");
                    assert.equal(suiteResult.reason, "Suite aborted for testing purposes", "Should capture abort reason");
                    done();
                });
            });

            it("should mark suite result as aborted when listener aborts in onDone", function (done) {
                const suite = createSuite();
                let testsExecuted = 0;

                useSuite(suite, function () {
                    selfDescribe("Suite", function () {
                        selfIt("test1", function () {
                            testsExecuted++;
                        });
                        selfIt("test2", function () {
                            testsExecuted++;
                        });
                    });
                });

                const runner = createTestRunner(suite);
                const listener: IListener = {
                    onDone(event, lazyContext) {
                        const context = lazyContext.v;
                        // Only abort child suites, not the root suite
                        if (context.type === eListenerEvent.Suite && context.suite && context.suite.parent) {
                            return {
                                action: eListenerAction.Abort,
                                reason: "Suite aborted in onDone"
                            };
                        }
                    }
                };

                runner.addListener(listener);
                doAwait(runner.run(), function () {
                    assert.equal(testsExecuted, 2, "All tests should have executed");
                    const childSuite = suite.suites[0];
                    const suiteResult = runner.getSuiteResult(childSuite);
                    assert.isTrue(suiteResult.aborted, "Suite should be marked as aborted");
                    assert.equal(suiteResult.reason, "Suite aborted in onDone");
                    done();
                });
            });

            it("should not mark suite result as aborted for normal execution", function (done) {
                const suite = createSuite();

                useSuite(suite, function () {
                    selfDescribe("Suite", function () {
                        selfIt("test1", function () {});
                        selfIt("test2", function () {});
                    });
                });

                const runner = createTestRunner(suite);
                doAwait(runner.run(), function () {
                    const childSuite = suite.suites[0];
                    const suiteResult = runner.getSuiteResult(childSuite);
                    assert.isNotTrue(suiteResult.aborted, "Suite should not be marked as aborted");
                    assert.isUndefined(suiteResult.reason, "Should not have abort reason");
                    done();
                });
            });

            it("should not mark suite result as aborted when listener returns Skip", function (done) {
                const suite = createSuite();

                useSuite(suite, function () {
                    selfDescribe("Suite", function () {
                        selfIt("test1", function () {});
                        selfIt("test2", function () {});
                    });
                });

                const runner = createTestRunner(suite);
                const listener: IListener = {
                    onStart(event, lazyContext) {
                        const context = lazyContext.v;
                        // Only respond to child suites, not root suite
                        if (context.type === eListenerEvent.Suite && context.suite && context.suite.parent) {
                            return { action: eListenerAction.Skip };
                        }
                    }
                };

                runner.addListener(listener);
                doAwait(runner.run(), function () {
                    const childSuite = suite.suites[0];
                    const suiteResult = runner.getSuiteResult(childSuite);
                    assert.isNotTrue(suiteResult.aborted, "Suite should not be marked as aborted for Skip");
                    done();
                });
            });

            it("should mark nested suite results as aborted when parent aborts", function (done) {
                const suite = createSuite();

                useSuite(suite, function () {
                    selfDescribe("Parent Suite", function () {
                        selfDescribe("Child Suite", function () {
                            selfIt("test", function () {});
                        });
                    });
                });

                const runner = createTestRunner(suite);
                const listener: IListener = {
                    onStart(event, lazyContext) {
                        const context = lazyContext.v;
                        if (context.type === eListenerEvent.Suite && context.suite && context.suite.description === "Parent Suite") {
                            return {
                                action: eListenerAction.Abort,
                                reason: "Parent suite aborted"
                            };
                        }
                    }
                };

                runner.addListener(listener);
                doAwait(runner.run(), function () {
                    const parentSuite = suite.suites[0];
                    const parentResult = runner.getSuiteResult(parentSuite);
                    assert.isTrue(parentResult.aborted, "Parent suite should be marked as aborted");
                    assert.equal(parentResult.reason, "Parent suite aborted");

                    const childSuite = parentSuite.suites[0];
                    const childResult = runner.getSuiteResult(childSuite);
                    assert.isTrue(childResult.aborted, "Child suite should also be marked as aborted when parent aborts");

                    const test = childSuite.tests[0];
                    const testResult = runner.getTestResult(test);
                    assert.isTrue(testResult.aborted, "Test in child suite should also be marked as aborted when parent aborts");
                    done();
                });
            });
        });

        describe("combined test and suite result validation", function () {

            it("should track both test and suite abort states independently", function (done) {
                const suite = createSuite();

                useSuite(suite, function () {
                    selfDescribe("Suite", function () {
                        selfIt("test1", function () {});
                        selfIt("test2", function () {});
                    });
                });

                const runner = createTestRunner(suite);
                let testAbortTriggered = false;

                const listener: IListener = {
                    onStart(event, lazyContext) {
                        const context = lazyContext.v;
                        if (context.type === eListenerEvent.Test && context.test && context.test.description === "test2") {
                            testAbortTriggered = true;
                            return {
                                action: eListenerAction.Abort,
                                reason: "Second test aborted"
                            };
                        }
                    }
                };

                runner.addListener(listener);
                doAwait(runner.run(), function () {
                    assert.isTrue(testAbortTriggered, "Test abort should have been triggered");

                    const test1 = suite.suites[0].tests[0];
                    const test1Result = runner.getTestResult(test1);
                    assert.isNotTrue(test1Result.aborted, "First test should not be aborted");

                    const test2 = suite.suites[0].tests[1];
                    const test2Result = runner.getTestResult(test2);
                    assert.isTrue(test2Result.aborted, "Second test should be aborted");
                    assert.equal(test2Result.reason, "Second test aborted");

                    const childSuite = suite.suites[0];
                    const suiteResult = runner.getSuiteResult(childSuite);
                    // Suite itself should not be marked as aborted if only a test was aborted
                    assert.isNotTrue(suiteResult.aborted, "Suite should not be marked as aborted when only test aborts");

                    done();
                });
            });

            it("should mark un-run sibling tests and descendant child-suite tests as skipped-because-aborted rather than leaving them pending", function (done) {
                const suite = createSuite();

                useSuite(suite, function () {
                    selfDescribe("Suite", function () {
                        selfIt("test1", function () {});
                        selfIt("test2", function () {});

                        selfDescribe("ChildSuite", function () {
                            selfIt("test3", function () {});
                        });
                    });
                });

                const runner = createTestRunner(suite);

                const listener: IListener = {
                    onDone(event, lazyContext) {
                        const context = lazyContext.v;
                        if (context.type === eListenerEvent.Test && context.test && context.test.description === "test1") {
                            return {
                                action: eListenerAction.Abort,
                                reason: "First test aborted"
                            };
                        }
                    }
                };

                runner.addListener(listener);
                doAwait(runner.run(), function () {
                    const childSuite = suite.suites[0];
                    const grandchildSuite = childSuite.suites[0];

                    const test1Result = runner.getTestResult(childSuite.tests[0]);
                    assert.isDefined(test1Result);
                    assert.isTrue(test1Result.aborted, "First test should be aborted (it triggered the abort)");
                    assert.equal(test1Result.status, TestStatus.Aborted);

                    // A test the abort never left room to run carries `aborted` and the reason --
                    // nothing about *why* it did not run is lost -- but its status is Skipped, not
                    // Aborted: it never ran, so it is not a failure. Aborted is reserved for the
                    // test that was actually running when the abort happened (test1 above), which
                    // is what keeps `--bail` reporting one failure rather than one per remaining
                    // test.
                    const test2Result = runner.getTestResult(childSuite.tests[1]);
                    assert.isDefined(test2Result);
                    assert.isTrue(test2Result.aborted, "Sibling test that never ran should be marked aborted, not left pending");
                    assert.equal(test2Result.status, TestStatus.Skipped, "Sibling test that never ran should be Skipped, not Pending or Aborted");
                    assert.equal(test2Result.reason, "First test aborted");

                    const test3Result = runner.getTestResult(grandchildSuite.tests[0]);
                    assert.isDefined(test3Result);
                    assert.isTrue(test3Result.aborted, "Test in un-run descendant suite should be marked aborted, not left pending");
                    assert.equal(test3Result.status, TestStatus.Skipped, "Descendant suite's test never ran, so it should be Skipped");

                    const grandchildResult = runner.getSuiteResult(grandchildSuite);
                    assert.isDefined(grandchildResult);
                    assert.isTrue(grandchildResult.aborted, "Un-run descendant suite itself should be marked aborted");

                    done();
                });
            });

            it("should preserve abort reason as string", function (done) {
                const suite = createSuite();
                const abortReason = "Test aborted due to condition - code: TEST_ABORT, severity: high";

                useSuite(suite, function () {
                    selfDescribe("Suite", function () {
                        selfIt("test", function () {});
                    });
                });

                const runner = createTestRunner(suite);
                const listener: IListener = {
                    onStart(event, lazyContext) {
                        const context = lazyContext.v;
                        if (context.type === eListenerEvent.Test) {
                            return {
                                action: eListenerAction.Abort,
                                reason: abortReason
                            };
                        }
                    }
                };

                runner.addListener(listener);
                doAwait(runner.run(), function () {
                    const test = suite.suites[0].tests[0];
                    const testResult = runner.getTestResult(test);
                    assert.isTrue(testResult.aborted, "Test should be aborted");
                    assert.equal(testResult.reason, abortReason, "Should preserve abort reason string");
                    done();
                });
            });
        });
    });

    describe("doAwait error propagation", function () {

        it("should propagate errors thrown in success callback to rejection handler", function (done) {
            const isolatedSuite = createSuite();

            useSuite(isolatedSuite, function () {
                selfDescribe("Suite", function () {
                    selfIt("test", function () {});
                });
            });

            const runner = createTestRunner(isolatedSuite);
            const expectedError = new Error("Error thrown in success callback");

            doAwait(doAwait(runner.run(), function () {
                throw expectedError;
            }), null, function (err) {
                assert.equal(err, expectedError, "Rejection handler should receive the thrown error");
                done();
            });
        });

        it("should propagate assertion errors from success callback to rejection handler", function (done) {
            const isolatedSuite = createSuite();

            useSuite(isolatedSuite, function () {
                selfDescribe("Suite", function () {
                    selfIt("test", function () {});
                });
            });

            const runner = createTestRunner(isolatedSuite);

            doAwait(doAwait(runner.run(), function () {
                assert.equal(1, 2, "This assertion will fail");
            }), null, function (err) {
                assert.isDefined(err, "Rejection handler should be called with the assertion error");
                assert.isTrue(err instanceof Error, "Error should be an Error instance");
                done();
            });
        });

        it("should not invoke rejection handler when success callback does not throw", function (done) {
            const isolatedSuite = createSuite();

            useSuite(isolatedSuite, function () {
                selfDescribe("Suite", function () {
                    selfIt("test", function () {});
                });
            });

            const runner = createTestRunner(isolatedSuite);

            doAwait(runner.run(), function () {
                const results = runner.getResults();
                assert.equal(results.passed, 1);
                done();
            }, function (err) {
                done(new Error("Rejection handler should not have been called: " + err));
            });
        });
    });


    describe("runner options", function () {

        it("should only capture the basic metrics by default", function (done) {
            const suite = createSuite();

            useSuite(suite, function () {
                selfDescribe("Suite", function () {
                    selfBeforeEach(function () {});
                    selfIt("test", function () {});
                });
            });

            const runner = createTestRunner(suite);
            doAwait(runner.run(), function () {
                try {
                    const metrics = runner.getMetrics();

                    // The cheap counters, totals and depth values are always maintained
                    assert.equal(metrics.counts.tests, 1);
                    assert.equal(metrics.counts.hooks, 1);
                    assert.equal(metrics.counts.testBodies, 1);
                    assert.equal(metrics.counts.syncExecutions, 2);
                    assert.equal(metrics.counts.passed, 1);
                    assert.equal(metrics.executionMode, "sync");
                    assert.equal(metrics.maxStackDepth, 4);
                    assert.isTrue(metrics.runDuration >= 0);

                    // The allocation heavy collections are not
                    assert.equal(metrics.trace.length, 0);
                    assert.equal(metrics.perTestWaitRatios.length, 0);
                    assert.equal(metrics.slowestExecutions.byDuration.length, 0);
                    assert.equal(metrics.slowestExecutions.byWaitTime.length, 0);
                    assert.equal(metrics.retryDiagnostics.tests.length, 0);
                    assert.equal(metrics.timeoutDiagnostics.hotspots.length, 0);
                    assert.equal(metrics.traceCompression.totalEvents, 0);

                    assert.equal(typeof metrics.message, "string");
                    assert.isTrue(metrics.message.indexOf("metrics: true") !== -1, "message should say how to enable the full metrics");
                    done();
                } catch (e) {
                    done(e as any);
                }
            });
        });

        it("should capture the full metrics without a message when enabled", function (done) {
            const suite = createSuite();

            useSuite(suite, function () {
                selfDescribe("Suite", function () {
                    selfBeforeEach(function () {});
                    selfIt("test", function () {});
                });
            });

            const runner = createTestRunner(suite, undefined, { metrics: true });
            doAwait(runner.run(), function () {
                try {
                    const metrics = runner.getMetrics();

                    assert.equal(metrics.counts.tests, 1);
                    assert.isTrue(metrics.trace.length > 0);
                    assert.equal(metrics.perTestWaitRatios.length, 1);
                    assert.isTrue(metrics.slowestExecutions.byDuration.length > 0);
                    assert.isTrue(metrics.traceCompression.totalEvents > 0);
                    assert.equal(metrics.message, undefined);
                    done();
                } catch (e) {
                    done(e as any);
                }
            });
        });
    });

    describe("synchronous timeouts", function () {

        function _busyWait(ms: number) {
            const start = Date.now();
            while (Date.now() - start < ms) {
                // spin
            }
        }

        it("should fail a synchronous test that exceeds its timeout", function (done) {
            const suite = createSuite();

            useSuite(suite, function () {
                selfDescribe("Suite", function () {
                    selfIt("slow sync", function () {
                        this.timeout(5);
                        _busyWait(25);
                    });
                });
            });

            const runner = createTestRunner(suite);
            doAwait(runner.run(), function () {
                try {
                    const results = runner.getResults();
                    assert.equal(results.failed, 1);
                    assert.equal(results.passed, 0);

                    const testResult = runner.getTestResult(suite.suites[0].tests[0]);
                    assert.isTrue(testResult.error instanceof TimeoutError, "expected a TimeoutError but got: " + testResult.error);
                    done();
                } catch (e) {
                    done(e as any);
                }
            });
        });

        it("should fail a synchronous hook that exceeds its timeout", function (done) {
            const suite = createSuite();

            useSuite(suite, function () {
                selfDescribe("Suite", function () {
                    selfBeforeEach(function () {
                        this.timeout(5);
                        _busyWait(25);
                    });

                    selfIt("test", function () {});
                });
            });

            const runner = createTestRunner(suite);
            doAwait(runner.run(), function () {
                try {
                    const results = runner.getResults();
                    assert.equal(results.failed, 1);

                    const testResult = runner.getTestResult(suite.suites[0].tests[0]);
                    assert.isTrue(testResult.error instanceof TimeoutError, "expected a TimeoutError but got: " + testResult.error);
                    done();
                } catch (e) {
                    done(e as any);
                }
            });
        });

        it("should not fail a synchronous test that overruns a zero timeout", function (done) {
            const suite = createSuite();

            useSuite(suite, function () {
                selfDescribe("Suite", function () {
                    selfIt("no limit", function () {
                        this.timeout(0);
                        _busyWait(10);
                    });
                });
            });

            const runner = createTestRunner(suite);
            doAwait(runner.run(), function () {
                try {
                    const results = runner.getResults();
                    assert.equal(results.passed, 1);
                    assert.equal(results.failed, 0);
                    done();
                } catch (e) {
                    done(e as any);
                }
            });
        });

        it("should pass a synchronous test that completes within its timeout", function (done) {
            const suite = createSuite();

            useSuite(suite, function () {
                selfDescribe("Suite", function () {
                    selfIt("fast sync", function () {
                        this.timeout(500);
                        _busyWait(5);
                    });
                });
            });

            const runner = createTestRunner(suite);
            doAwait(runner.run(), function () {
                try {
                    const results = runner.getResults();
                    assert.equal(results.passed, 1);
                    assert.equal(results.failed, 0);
                    done();
                } catch (e) {
                    done(e as any);
                }
            });
        });

        it("should still time out an asynchronous test", function (done) {
            const suite = createSuite();

            useSuite(suite, function () {
                selfDescribe("Suite", function () {
                    selfIt("slow async", function (testDone) {
                        this.timeout(5);
                        setTimeout(function () {
                            testDone();
                        }, 40);
                    });
                });
            });

            const runner = createTestRunner(suite);
            doAwait(runner.run(), function () {
                try {
                    const results = runner.getResults();
                    assert.equal(results.failed, 1);

                    const testResult = runner.getTestResult(suite.suites[0].tests[0]);
                    assert.isTrue(testResult.error instanceof TimeoutError, "expected a TimeoutError but got: " + testResult.error);
                    done();
                } catch (e) {
                    done(e as any);
                }
            });
        });

        it("should report a timeout for a promise-returning test even when the promise later resolves", function (done) {
            const suite = createSuite();

            useSuite(suite, function () {
                selfDescribe("Suite", function () {
                    selfIt("late promise", function () {
                        this.timeout(5);

                        return createPromise<void>(function (resolve) {
                            setTimeout(function () {
                                resolve();
                            }, 40);
                        });
                    });
                });
            });

            const runner = createTestRunner(suite);
            doAwait(runner.run(), function () {
                try {
                    const results = runner.getResults();
                    assert.equal(results.failed, 1);
                    assert.equal(results.passed, 0);

                    const testResult = runner.getTestResult(suite.suites[0].tests[0]);
                    assert.isTrue(testResult.error instanceof TimeoutError, "expected a TimeoutError but got: " + testResult.error);
                    done();
                } catch (e) {
                    done(e as any);
                }
            });
        });

        it("should count synchronous time before an asynchronous wait against the timeout", function (done) {
            const suite = createSuite();

            useSuite(suite, function () {
                selfDescribe("Suite", function () {
                    selfIt("sync then async", function () {
                        this.timeout(40);
                        // 30ms synchronously, then 30ms asynchronously: 60ms total against a 40ms budget
                        _busyWait(30);

                        return createPromise<void>(function (resolve) {
                            setTimeout(function () {
                                resolve();
                            }, 30);
                        });
                    });
                });
            });

            const runner = createTestRunner(suite);
            doAwait(runner.run(), function () {
                try {
                    const results = runner.getResults();
                    assert.equal(results.failed, 1);

                    const testResult = runner.getTestResult(suite.suites[0].tests[0]);
                    assert.isTrue(testResult.error instanceof TimeoutError, "expected a TimeoutError but got: " + testResult.error);
                    done();
                } catch (e) {
                    done(e as any);
                }
            });
        });
    });

    describe("dynamic hooks", function () {

        it("should run beforeEach hooks added or removed while the run is executing", function (done) {
            const suite = createSuite();
            const calls: string[] = [];
            let theSuite: ITestSuite;

            useSuite(suite, function () {
                selfDescribe("Suite", function () {
                    selfBeforeEach(function () {
                        calls.push("hook");
                    });

                    selfIt("first", function () {
                        calls.push("first");
                        // Added from inside a test: must run before the *next* test
                        theSuite.beforeEachHooks.push({
                            name: "dynamic",
                            fn: function () {
                                calls.push("dynamic");
                            }
                        });
                    });

                    selfIt("second", function () {
                        calls.push("second");
                        // Removed again: must not run before the third test
                        theSuite.beforeEachHooks.pop();
                    });

                    selfIt("third", function () {
                        calls.push("third");
                    });
                });
            });

            theSuite = suite.suites[0];

            const runner = createTestRunner(suite);
            doAwait(runner.run(), function () {
                try {
                    assert.equal(runner.getResults().passed, 3);
                    assert.deepEqual(calls, ["hook", "first", "hook", "dynamic", "second", "hook", "third"]);
                    done();
                } catch (e) {
                    done(e as any);
                }
            });
        });

        it("should run afterEach hooks added or removed while the run is executing", function (done) {
            const suite = createSuite();
            const calls: string[] = [];
            let theSuite: ITestSuite;

            useSuite(suite, function () {
                selfDescribe("Suite", function () {
                    selfIt("first", function () {
                        calls.push("first");
                        // Added from inside a test: the afterEach chain is resolved after the body, so it
                        // already applies to this test
                        theSuite.afterEachHooks.push({
                            name: "dynamic",
                            fn: function () {
                                calls.push("dynamic");
                            }
                        });
                    });

                    selfIt("second", function () {
                        calls.push("second");
                        theSuite.afterEachHooks.pop();
                    });

                    selfIt("third", function () {
                        calls.push("third");
                    });
                });
            });

            theSuite = suite.suites[0];

            const runner = createTestRunner(suite);
            doAwait(runner.run(), function () {
                try {
                    assert.equal(runner.getResults().passed, 3);
                    assert.deepEqual(calls, ["first", "dynamic", "second", "third"]);
                    done();
                } catch (e) {
                    done(e as any);
                }
            });
        });

        it("should apply a hook added to a parent suite to the tests of nested suites", function (done) {
            const suite = createSuite();
            const calls: string[] = [];
            let parentSuite: ITestSuite;

            useSuite(suite, function () {
                selfDescribe("Parent", function () {
                    selfDescribe("Child", function () {
                        selfIt("first", function () {
                            calls.push("first");
                            parentSuite.beforeEachHooks.push({
                                fn: function () {
                                    calls.push("parent-dynamic");
                                }
                            });
                        });

                        selfIt("second", function () {
                            calls.push("second");
                        });
                    });
                });
            });

            parentSuite = suite.suites[0];

            const runner = createTestRunner(suite);
            doAwait(runner.run(), function () {
                try {
                    assert.equal(runner.getResults().passed, 2);
                    assert.deepEqual(calls, ["first", "parent-dynamic", "second"]);
                    done();
                } catch (e) {
                    done(e as any);
                }
            });
        });

        it("should run each same-named sibling suite's own hooks when they were declared in separate useSuite() calls", function (done) {
            // Regression: the per-suite hook-chain cache is keyed by suite ID. When two useSuite()
            // calls against one root each declared describe("A") with its own beforeEach, both
            // suites received the same ID (every useSuite() call restarted the occurrence count),
            // so the second suite's test ran the *first* suite's hook: hookA1,tA1,hookA1,tA2.
            const root = createSuite();
            const order: string[] = [];

            function declare(tag: string) {
                useSuite(root, function () {
                    selfDescribe("A", function () {
                        selfBeforeEach(function () {
                            order.push("hook" + tag);
                        });

                        selfIt("t" + tag, function () {
                            order.push("t" + tag);
                        });
                    });
                });
            }

            declare("A1");
            declare("A2");

            assert.notEqual(root.suites[0].id, root.suites[1].id, "the two sibling suites must have distinct IDs");

            const runner = createTestRunner(root);
            doAwait(runner.run(), function () {
                try {
                    assert.equal(runner.getResults().passed, 2);
                    assert.deepEqual(order, ["hookA1", "tA1", "hookA2", "tA2"]);
                    done();
                } catch (e) {
                    done(e as any);
                }
            });
        });
    });

});
