/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "../../../src/assert/assertClass";
import { describe as selfDescribe, createSuite, useSuite } from "../../../src/suite/suite";
import { it as selfIt } from "../../../src/suite/it";
import { createTestRunner } from "../../../src/suite/runner";
import { findMatchingSuites, findMatchingTests } from "../../../src/suite/filterHelpers";
import { createSuiteIDFilter, createTestIDFilter } from "../../../src/suite/filters/idFilter";
import { createSuiteInstanceFilter, createTestInstanceFilter } from "../../../src/suite/filters/instanceFilter";
import { doAwait } from "@nevware21/ts-async";

describe("Filter helpers for finding and running tests", function () {

    describe("findMatchingSuites", function () {

        it("should find all suites when no filter is specified", function (done: any) {
            const suite = createSuite();

            useSuite(suite, function () {
                selfDescribe("Suite 1", function () {
                    selfIt("test 1", function () {});
                });

                selfDescribe("Suite 2", function () {
                    selfIt("test 2", function () {});
                });
            });

            // Create a filter that matches everything
            const filter = { canRunSuite: () => true };
            const allSuites = findMatchingSuites(suite, filter);

            assert.equal(allSuites.length, 2);
            done();
        });

        it("should find suites by id", function (done: any) {
            const suite = createSuite();

            useSuite(suite, function () {
                selfDescribe("Suite 1", function () {
                    selfIt("test 1", function () {});
                });

                selfDescribe("Suite 2", function () {
                    selfIt("test 2", function () {});
                });
            });

            const targetSuite = suite.suites[0];
            const filter = createSuiteIDFilter([targetSuite.id || ""]);
            const foundSuites = findMatchingSuites(suite, filter);

            assert.equal(foundSuites.length, 1);
            assert.equal(foundSuites[0].id, targetSuite.id);
            done();
        });

        it("should find suites marked as only", function (done: any) {
            const suite = createSuite();

            useSuite(suite, function () {
                selfDescribe("Suite 1", function () {
                    selfIt("test 1", function () {});
                });

                selfDescribe.only("Suite 2", function () {
                    selfIt("test 2", function () {});
                });
            });

            // Create filter to find only-marked suites
            const filter = { canRunSuite: (s: any) => s.only === true };
            const onlySuites = findMatchingSuites(suite, filter);

            assert.equal(onlySuites.length, 1);
            assert.isTrue(onlySuites[0].only);
            done();
        });

        it("should find suites marked as skipped", function (done: any) {
            const suite = createSuite();

            useSuite(suite, function () {
                selfDescribe("Suite 1", function () {
                    selfIt("test 1", function () {});
                });

                selfDescribe.skip("Suite 2", function () {
                    selfIt("test 2", function () {});
                });
            });

            // Create filter to find skipped suites
            const filter = { canRunSuite: (s: any) => s.skip === true };
            const skippedSuites = findMatchingSuites(suite, filter);

            assert.equal(skippedSuites.length, 1);
            assert.isTrue(skippedSuites[0].skip);
            done();
        });

        it("should find nested suites", function (done: any) {
            const suite = createSuite();

            useSuite(suite, function () {
                selfDescribe("Parent", function () {
                    selfIt("test 1", function () {});

                    selfDescribe("Child 1", function () {
                        selfIt("test 2", function () {});
                    });

                    selfDescribe("Child 2", function () {
                        selfIt("test 3", function () {});
                    });
                });
            });

            // Create a filter that matches everything
            const filter = { canRunSuite: () => true };
            const allSuites = findMatchingSuites(suite, filter);

            // Should find Parent and both Child suites
            assert.equal(allSuites.length, 3);
            done();
        });
    });

    describe("findMatchingTests", function () {

        it("should find all test cases when no filter is specified", function (done: any) {
            const suite = createSuite();

            useSuite(suite, function () {
                selfDescribe("Suite", function () {
                    selfIt("test 1", function () {});
                    selfIt("test 2", function () {});
                    selfIt("test 3", function () {});
                });
            });

            // Create a filter that matches everything
            const filter = { canRunTest: () => true };
            const allTests = findMatchingTests(suite, filter);

            assert.equal(allTests.length, 3);
            done();
        });

        it("should find test cases by id", function (done: any) {
            const suite = createSuite();

            useSuite(suite, function () {
                selfDescribe("Suite", function () {
                    selfIt("test 1", function () {});
                    selfIt("test 2", function () {});
                });
            });

            const targetTest = suite.suites[0].tests[0];
            const filter = createTestIDFilter([targetTest.id || ""]);
            const foundTests = findMatchingTests(suite, filter);

            assert.equal(foundTests.length, 1);
            assert.equal(foundTests[0].id, targetTest.id);
            done();
        });

        it("should find tests marked as only", function (done: any) {
            const suite = createSuite();

            useSuite(suite, function () {
                selfDescribe("Suite", function () {
                    selfIt("test 1", function () {});
                    selfIt.only("test 2", function () {});
                    selfIt("test 3", function () {});
                });
            });

            // Create filter to find only-marked tests
            const filter = { canRunTest: (t: any) => t.only === true };
            const onlyTests = findMatchingTests(suite, filter);

            assert.equal(onlyTests.length, 1);
            assert.isTrue(onlyTests[0].only);
            done();
        });

        it("should find tests marked as skipped", function (done: any) {
            const suite = createSuite();

            useSuite(suite, function () {
                selfDescribe("Suite", function () {
                    selfIt("test 1", function () {});
                    selfIt.skip("test 2", function () {});
                    selfIt("test 3", function () {});
                });
            });

            // Create filter to find skipped tests
            const filter = { canRunTest: (t: any) => t.skip === true };
            const skippedTests = findMatchingTests(suite, filter);

            assert.equal(skippedTests.length, 1);
            assert.isTrue(skippedTests[0].skip);
            done();
        });

        it("should find tests across multiple suites", function (done: any) {
            const suite = createSuite();

            useSuite(suite, function () {
                selfDescribe("Suite 1", function () {
                    selfIt("test 1", function () {});
                    selfIt.only("test 2", function () {});
                });

                selfDescribe("Suite 2", function () {
                    selfIt("test 3", function () {});
                    selfIt.only("test 4", function () {});
                });
            });

            // Create filter to find only-marked tests
            const filter = { canRunTest: (t: any) => t.only === true };
            const onlyTests = findMatchingTests(suite, filter);

            assert.equal(onlyTests.length, 2);
            done();
        });
    });

    describe("runTests with filters", function () {

        it("should run specific test cases", function (done: any) {
            const suite = createSuite();

            let test1Executed = false;
            let test2Executed = false;
            let test3Executed = false;

            useSuite(suite, function () {
                selfDescribe("Suite", function () {
                    selfIt("test 1", function () {
                        test1Executed = true;
                    });

                    selfIt("test 2", function () {
                        test2Executed = true;
                    });

                    selfIt("test 3", function () {
                        test3Executed = true;
                    });
                });
            });

            const runner = createTestRunner(suite);
            const testsToRun = [suite.suites[0].tests[0], suite.suites[0].tests[2]];
            const filter = createTestInstanceFilter(testsToRun);
            runner.addFilter(filter);

            doAwait(runner.run(), function () {
                assert.isTrue(test1Executed, "test 1 should execute");
                assert.isFalse(test2Executed, "test 2 should not execute");
                assert.isTrue(test3Executed, "test 3 should execute");
                const results = runner.getResults();
                assert.equal(results.passed, 2);
                done();
            });
        });

        it("should run specific test suites", function (done: any) {
            const suite = createSuite();

            let suite1Test1Executed = false;
            let suite1Test2Executed = false;
            let suite2TestExecuted = false;

            useSuite(suite, function () {
                selfDescribe("Suite 1", function () {
                    selfIt("test 1", function () {
                        suite1Test1Executed = true;
                    });

                    selfIt("test 2", function () {
                        suite1Test2Executed = true;
                    });
                });

                selfDescribe("Suite 2", function () {
                    selfIt("test", function () {
                        suite2TestExecuted = true;
                    });
                });
            });

            const runner = createTestRunner(suite);
            const suitesToRun = [suite.suites[0]];
            const filter = createSuiteInstanceFilter(suitesToRun);
            runner.addFilter(filter);

            doAwait(runner.run(), function () {
                assert.isTrue(suite1Test1Executed, "suite 1 test 1 should execute");
                assert.isTrue(suite1Test2Executed, "suite 1 test 2 should execute");
                assert.isFalse(suite2TestExecuted, "suite 2 test should not execute");
                const results = runner.getResults();
                assert.equal(results.passed, 2);
                done();
            });
        });

        it("should run tests using find results", function (done: any) {
            const suite = createSuite();

            let onlyTestExecuted = false;
            let skippedTestExecuted = false;
            let normalTestExecuted = false;

            useSuite(suite, function () {
                selfDescribe("Suite", function () {
                    selfIt.only("only test", function () {
                        onlyTestExecuted = true;
                    });

                    selfIt.skip("skipped test", function () {
                        skippedTestExecuted = true;
                    });

                    selfIt("normal test", function () {
                        normalTestExecuted = true;
                    });
                });
            });

            const runner = createTestRunner(suite);
            // Find only-marked tests
            const onlyFilter = { canRunTest: (t: any) => t.only === true };
            const onlyTests = findMatchingTests(suite, onlyFilter);

            // Run using test instance filter
            const filter = createTestInstanceFilter(onlyTests);
            runner.addFilter(filter);

            doAwait(runner.run(), function () {
                assert.isTrue(onlyTestExecuted, "only test should execute");
                assert.isFalse(skippedTestExecuted, "skipped test should not execute");
                assert.isFalse(normalTestExecuted, "normal test should not execute");
                const results = runner.getResults();
                assert.equal(results.passed, 1);
                done();
            });
        });

        it("should handle empty test collection", function (done: any) {
            const suite = createSuite();

            let test1Executed = false;
            let test2Executed = false;

            useSuite(suite, function () {
                selfDescribe("Suite", function () {
                    selfIt("test 1", function () {
                        test1Executed = true;
                    });
                    selfIt("test 2", function () {
                        test2Executed = true;
                    });
                });
            });

            const runner = createTestRunner(suite);
            // Empty filter - no tests should run
            const filter = createTestInstanceFilter([]);
            runner.addFilter(filter);

            doAwait(runner.run(), function () {
                // Verify no tests executed
                assert.isFalse(test1Executed, "test 1 should not execute");
                assert.isFalse(test2Executed, "test 2 should not execute");
                done();
            });
        });

        it("should run nested suites when suite is specified", function (done: any) {
            const suite = createSuite();

            let parentTestExecuted = false;
            let nestedTestExecuted = false;

            useSuite(suite, function () {
                selfDescribe("Parent Suite", function () {
                    selfIt("parent test", function () {
                        parentTestExecuted = true;
                    });

                    selfDescribe("Nested Suite", function () {
                        selfIt("nested test", function () {
                            nestedTestExecuted = true;
                        });
                    });
                });
            });

            const runner = createTestRunner(suite);
            const parentSuite = suite.suites[0];
            const filter = createSuiteInstanceFilter([parentSuite]);
            runner.addFilter(filter);

            doAwait(runner.run(), function () {
                assert.isTrue(parentTestExecuted, "parent test should execute");
                assert.isTrue(nestedTestExecuted, "nested test should execute");
                const results = runner.getResults();
                assert.equal(results.passed, 2);
                done();
            });
        });
    });
});
