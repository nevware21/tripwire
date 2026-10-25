/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "../../../src/assert/assertClass";
import { createPromise, doAwait } from "@nevware21/ts-async";
import {
    describe as selfDescribe, resetSuite, getRootSuite, createSuite, useSuite, xdescribe, fdescribe
} from "../../../src/suite/suite";
import { it as selfIt, xit, fit } from "../../../src/suite/it";
import { after as selfAfter, afterAll as selfAfterAll } from "../../../src/suite/after";
import { afterEach as selfAfterEach } from "../../../src/suite/afterEach";
import { before as selfBefore, beforeAll as selfBeforeAll } from "../../../src/suite/before";
import { beforeEach as selfBeforeEach } from "../../../src/suite/beforeEach";

// Use Mocha's globals for outer tests, tripwire suite for inner isolated tests

describe("suite", function () {

    describe("describe and it", function () {

        it("should create a test suite", function () {
            const isolatedSuite = createSuite();

            useSuite(isolatedSuite, function () {
                selfDescribe("Test Suite", function () {
                    selfIt("test case", function () {
                        // Test implementation
                    });
                });
            });

            assert.equal(isolatedSuite.suites.length, 1);
            assert.equal(isolatedSuite.suites[0].description, "Test Suite");
            assert.equal(isolatedSuite.suites[0].tests.length, 1);
            assert.equal(isolatedSuite.suites[0].tests[0].description, "test case");
        });

        it("should support nested describe blocks", function () {
            const isolatedSuite = createSuite();

            useSuite(isolatedSuite, function () {
                selfDescribe("Outer Suite", function () {
                    selfDescribe("Inner Suite", function () {
                        selfIt("nested test", function () {
                            // Test implementation
                        });
                    });
                });
            });

            assert.equal(isolatedSuite.suites.length, 1);
            assert.equal(isolatedSuite.suites[0].description, "Outer Suite");
            assert.equal(isolatedSuite.suites[0].suites.length, 1);
            assert.equal(isolatedSuite.suites[0].suites[0].description, "Inner Suite");
            assert.equal(isolatedSuite.suites[0].suites[0].tests.length, 1);
        });

        it("should support multiple tests in a suite", function () {
            const isolatedSuite = createSuite();

            useSuite(isolatedSuite, function () {
                selfDescribe("Suite", function () {
                    selfIt("test 1", function () {});
                    selfIt("test 2", function () {});
                    selfIt("test 3", function () {});
                });
            });

            assert.equal(isolatedSuite.suites[0].tests.length, 3);
            assert.equal(isolatedSuite.suites[0].tests[0].description, "test 1");
            assert.equal(isolatedSuite.suites[0].tests[1].description, "test 2");
            assert.equal(isolatedSuite.suites[0].tests[2].description, "test 3");
        });
    });

    describe("hooks", function () {

        it("should register before hooks", function () {
            const isolatedSuite = createSuite();

            useSuite(isolatedSuite, function () {
                selfDescribe("Suite", function () {
                    selfBefore(function () {
                        // Hook implementation
                    });

                    selfIt("test", function () {});
                });
            });

            assert.equal(isolatedSuite.suites[0].beforeAllHooks.length, 1);
        });

        it("should register after hooks", function () {
            const isolatedSuite = createSuite();

            useSuite(isolatedSuite, function () {
                selfDescribe("Suite", function () {
                    selfAfter(function () {
                        // Hook implementation
                    });

                    selfIt("test", function () {});
                });
            });

            assert.equal(isolatedSuite.suites[0].afterAllHooks.length, 1);
        });

        it("should register beforeEach hooks", function () {
            const isolatedSuite = createSuite();

            useSuite(isolatedSuite, function () {
                selfDescribe("Suite", function () {
                    selfBeforeEach(function () {
                        // Hook implementation
                    });

                    selfIt("test", function () {});
                });
            });

            assert.equal(isolatedSuite.suites[0].beforeEachHooks.length, 1);
        });

        it("should register afterEach hooks", function () {
            const isolatedSuite = createSuite();

            useSuite(isolatedSuite, function () {
                selfDescribe("Suite", function () {
                    selfAfterEach(function () {
                        // Hook implementation
                    });

                    selfIt("test", function () {});
                });
            });

            assert.equal(isolatedSuite.suites[0].afterEachHooks.length, 1);
        });

        it("should support named hooks", function () {
            const isolatedSuite = createSuite();

            useSuite(isolatedSuite, function () {
                selfDescribe("Suite", function () {
                    selfBefore("setup hook", function () {
                        // Hook implementation
                    });

                    selfIt("test", function () {});
                });
            });

            assert.equal(isolatedSuite.suites[0].beforeAllHooks.length, 1);
            assert.equal(isolatedSuite.suites[0].beforeAllHooks[0].name, "setup hook");
        });

        it("should support Jasmine aliases", function () {
            const isolatedSuite = createSuite();

            useSuite(isolatedSuite, function () {
                selfDescribe("Suite", function () {
                    selfBeforeAll(function () {});
                    selfAfterAll(function () {});

                    selfIt("test", function () {});
                });
            });

            assert.equal(isolatedSuite.suites[0].beforeAllHooks.length, 1);
            assert.equal(isolatedSuite.suites[0].afterAllHooks.length, 1);
        });
    });

    describe("test modifiers", function () {

        it("should mark tests as only", function () {
            const isolatedSuite = createSuite();

            useSuite(isolatedSuite, function () {
                selfDescribe("Suite", function () {
                    selfIt("normal test", function () {});
                    selfIt.only("focused test", function () {});
                });
            });

            assert.equal(isolatedSuite.suites[0].tests[0].only, false);
            assert.equal(isolatedSuite.suites[0].tests[1].only, true);
        });

        it("should mark tests as skipped", function () {
            const isolatedSuite = createSuite();

            useSuite(isolatedSuite, function () {
                selfDescribe("Suite", function () {
                    selfIt("normal test", function () {});
                    selfIt.skip("skipped test", function () {});
                });
            });

            assert.equal(isolatedSuite.suites[0].tests[0].skip, false);
            assert.equal(isolatedSuite.suites[0].tests[1].skip, true);
        });

        it("should mark suites as only", function () {
            const isolatedSuite = createSuite();

            useSuite(isolatedSuite, function () {
                selfDescribe("normal suite", function () {
                    selfIt("test", function () {});
                });

                selfDescribe.only("focused suite", function () {
                    selfIt("test", function () {});
                });
            });

            assert.equal(isolatedSuite.suites[0].only, false);
            assert.equal(isolatedSuite.suites[1].only, true);
        });

        it("should mark suites as skipped", function () {
            const isolatedSuite = createSuite();

            useSuite(isolatedSuite, function () {
                selfDescribe("normal suite", function () {
                    selfIt("test", function () {});
                });

                selfDescribe.skip("skipped suite", function () {
                    selfIt("test", function () {});
                });
            });

            assert.equal(isolatedSuite.suites[0].skip, false);
            assert.equal(isolatedSuite.suites[1].skip, true);
        });
    });

    describe("Jasmine aliases", function () {

        it("should support xit", function () {
            const isolatedSuite = createSuite();

            useSuite(isolatedSuite, function () {
                selfDescribe("Suite", function () {
                    xit("skipped test", function () {});
                });
            });

            assert.equal(isolatedSuite.suites[0].tests[0].skip, true);
        });

        it("should support fit", function () {
            const isolatedSuite = createSuite();

            useSuite(isolatedSuite, function () {
                selfDescribe("Suite", function () {
                    fit("focused test", function () {});
                });
            });

            assert.equal(isolatedSuite.suites[0].tests[0].only, true);
        });

        it("should support xdescribe", function () {
            const isolatedSuite = createSuite();

            useSuite(isolatedSuite, function () {
                xdescribe("skipped suite", function () {
                    selfIt("test", function () {});
                });
            });

            assert.equal(isolatedSuite.suites[0].skip, true);
        });

        it("should support fdescribe", function () {
            const isolatedSuite = createSuite();

            useSuite(isolatedSuite, function () {
                fdescribe("focused suite", function () {
                    selfIt("test", function () {});
                });
            });

            assert.equal(isolatedSuite.suites[0].only, true);
        });
    });

    describe("test initialization", function () {

        /*
         * Test skipped: status is now part of ITestResult, not ITestCase
         * See runner.test.ts "should mark tests without function as pending" for equivalent test
         */
        it.skip("should initialize tests with pending status", function () {
            // const isolatedSuite = createSuite();

            /*
             * useSuite(isolatedSuite, function () {
             *     selfDescribe("Suite", function () {
             *         selfIt("test", function () {});
             *     });
             * });
             */

            // assert.equal(isolatedSuite.suites[0].tests[0].status, TestStatus.Pending);
        });

        it("should set default timeout", function () {
            const isolatedSuite = createSuite();

            useSuite(isolatedSuite, function () {
                selfDescribe("Suite", function () {
                    selfIt("test", function () {});
                });
            });

            assert.equal(isolatedSuite.suites[0].tests[0].timeout, undefined);
        });

        it("use a suite level timeout", function () {
            const isolatedSuite = createSuite();

            useSuite(isolatedSuite, function () {
                selfDescribe("Suite", function () {
                    this.timeout(5000);
                    selfIt("test", function () {});
                });
            });

            assert.equal(isolatedSuite.suites[0].tests[0].timeout, 5000);
        });

        it("should support tests without function", function () {
            const isolatedSuite = createSuite();

            useSuite(isolatedSuite, function () {
                selfDescribe("Suite", function () {
                    selfIt("pending test");
                });
            });

            assert.equal(isolatedSuite.suites[0].tests[0].fn, undefined);
        });
    });

    describe("resetSuite", function () {

        it("should clear suite stack", function () {

            useSuite(null as any, () => {
                selfDescribe("Suite 1", function () {
                    selfIt("test", function () {});
                });

                resetSuite();

                const root = getRootSuite();
                assert.equal(root.suites.length, 0);
            });
        });
    });

    describe("getRootSuite", function () {

        it("should return root suite", function () {
            useSuite(null, () => {
                resetSuite();

                const root = getRootSuite();
                assert.equal(root.description, "root");
                assert.isArray(root.suites);
                assert.isArray(root.tests);
            });
        });

        it("should create root suite if not exists", function () {
            useSuite(null, () => {
                resetSuite();
                const root1 = getRootSuite();
                const root2 = getRootSuite();
                assert.equal(root1, root2);
            });
        });
    });

    describe("useSuite async", function () {

        it("should handle synchronous callbacks", function (done) {
            const isolatedSuite = createSuite();
            let callbackExecuted = false;

            doAwait(useSuite(isolatedSuite, function () {
                callbackExecuted = true;
                selfDescribe("Sync Suite", function () {
                    selfIt("test", function () {});
                });
            }), function () {
                assert.equal(callbackExecuted, true);
                assert.equal(isolatedSuite.suites.length, 1);
                assert.equal(isolatedSuite.suites[0].description, "Sync Suite");
                done();
            });
        });

        it("should handle asynchronous callbacks", function (done) {
            const isolatedSuite = createSuite();
            let callbackExecuted = false;

            doAwait(useSuite(isolatedSuite, function () {
                return createPromise(function (resolve) {
                    setTimeout(function () {
                        callbackExecuted = true;
                        selfDescribe("Async Suite", function () {
                            selfIt("async test", function () {});
                        });
                        resolve();
                    }, 10);
                });
            }), function () {
                assert.equal(callbackExecuted, true);
                assert.equal(isolatedSuite.suites.length, 1);
                assert.equal(isolatedSuite.suites[0].description, "Async Suite");
                assert.equal(isolatedSuite.suites[0].tests.length, 1);
                done();
            });
        });

        it("should restore context after async callback completes", function (done) {
            const isolatedSuite = createSuite();
            const originalRoot = getRootSuite();

            doAwait(useSuite(isolatedSuite, function () {
                return createPromise(function (resolve) {
                    setTimeout(function () {
                        selfDescribe("Test Suite", function () {
                            selfIt("test", function () {});
                        });
                        resolve();
                    }, 10);
                });
            }), function () {
                const currentRoot = getRootSuite();
                assert.equal(currentRoot, originalRoot);
                assert.notEqual(currentRoot, isolatedSuite);
                done();
            });
        });

        it("should restore context even if async callback fails", function (done) {
            const isolatedSuite = createSuite();
            const originalRoot = getRootSuite();

            doAwait(useSuite(isolatedSuite, function () {
                return createPromise(function (resolve, reject) {
                    setTimeout(function () {
                        selfDescribe("Test Suite", function () {
                            selfIt("test", function () {});
                        });
                        reject(new Error("Test error"));
                    }, 10);
                });
            }), function () {
                done(new Error("Should have rejected"));
            }, function (error) {
                const currentRoot = getRootSuite();
                assert.equal(currentRoot, originalRoot);
                assert.notEqual(currentRoot, isolatedSuite);
                assert.equal(error.message, "Test error");
                done();
            });
        });

        it("should allow suite operations during async callback", function (done) {
            const isolatedSuite = createSuite();

            doAwait(useSuite(isolatedSuite, function () {
                return createPromise(function (resolve) {
                    selfDescribe("Suite 1", function () {
                        selfIt("test 1", function () {});
                    });

                    setTimeout(function () {
                        selfDescribe("Suite 2", function () {
                            selfIt("test 2", function () {});
                        });
                        resolve();
                    }, 10);
                });
            }), function () {
                assert.equal(isolatedSuite.suites.length, 2);
                assert.equal(isolatedSuite.suites[0].description, "Suite 1");
                assert.equal(isolatedSuite.suites[1].description, "Suite 2");
                done();
            });
        });
    });
});
