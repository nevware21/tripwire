/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "../../../../src/assert/assertClass";
import { createSuiteInstanceFilter, createTestInstanceFilter } from "../../../../src/suite/filters/instanceFilter";
import { createTestRunner } from "../../../../src/suite/runner";
import { doAwait } from "@nevware21/ts-async";
import { describe as suiteDescribe, createSuite, useSuite } from "../../../../src/suite/suite";
import { it as suiteIt } from "../../../../src/suite/it";

describe("suiteInstanceFilter", function () {
    it("should run no tests when empty suite array", function (done) {
        const suite = createSuite();

        let test1Executed = false;
        let test2Executed = false;

        useSuite(suite, function () {
            suiteDescribe("Suite", function () {
                suiteIt("test 1", function () {
                    test1Executed = true;
                });

                suiteIt("test 2", function () {
                    test2Executed = true;
                });
            });
        });

        const filter = createSuiteInstanceFilter([]);
        const runner = createTestRunner(suite);
        runner.addFilter(filter);

        doAwait(runner.run(), function () {
            assert.isFalse(test1Executed);
            assert.isFalse(test2Executed);
            done();
        });
    });

    it("should not execute anything when suite instance does not match", function (done) {
        const suite = createSuite();
        const otherSuite = createSuite();

        let testExecuted = false;

        useSuite(suite, function () {
            suiteDescribe("Suite", function () {
                suiteIt("test", function () {
                    testExecuted = true;
                });
            });
        });

        // Pass a different suite instance
        const filter = createSuiteInstanceFilter([otherSuite]);
        const runner = createTestRunner(suite);
        runner.addFilter(filter);

        doAwait(runner.run(), function () {
            assert.isFalse(testExecuted);
            const results = runner.getResults();
            assert.equal(results.passed, 0);
            done();
        });
    });

    it("should run all tests in suite when suite instance matches", function (done) {
        const suite = createSuite();

        let test1Executed = false;
        let test2Executed = false;

        useSuite(suite, function () {
            suiteDescribe("Target Suite", function () {
                suiteIt("test 1", function () {
                    test1Executed = true;
                });

                suiteIt("test 2", function () {
                    test2Executed = true;
                });
            });
        });

        const targetSuite = suite.suites[0];
        const filter = createSuiteInstanceFilter([targetSuite]);
        const runner = createTestRunner(suite);
        runner.addFilter(filter);

        doAwait(runner.run(), function () {
            assert.isTrue(test1Executed);
            assert.isTrue(test2Executed);
            done();
        });
    });

    it("should filter multiple suite instances", function (done) {
        const suite = createSuite();

        let suite1Test1Executed = false;
        let suite2Test1Executed = false;
        let suite3Test1Executed = false;

        useSuite(suite, function () {
            suiteDescribe("Suite 1", function () {
                suiteIt("test 1", function () {
                    suite1Test1Executed = true;
                });
            });

            suiteDescribe("Suite 2", function () {
                suiteIt("test 1", function () {
                    suite2Test1Executed = true;
                });
            });

            suiteDescribe("Suite 3", function () {
                suiteIt("test 1", function () {
                    suite3Test1Executed = true;
                });
            });
        });

        const filter = createSuiteInstanceFilter([suite.suites[0], suite.suites[2]]);
        const runner = createTestRunner(suite);
        runner.addFilter(filter);

        doAwait(runner.run(), function () {
            assert.isTrue(suite1Test1Executed);
            assert.isFalse(suite2Test1Executed);
            assert.isTrue(suite3Test1Executed);
            done();
        });
    });

    it("should run nested suite tests when nested suite instance matches", function (done) {
        const suite = createSuite();

        let parentTestExecuted = false;
        let childTestExecuted = false;
        let otherTestExecuted = false;

        useSuite(suite, function () {
            suiteDescribe("Parent Suite", function () {
                suiteIt("parent test", function () {
                    parentTestExecuted = true;
                });

                suiteDescribe("Child Suite", function () {
                    suiteIt("child test", function () {
                        childTestExecuted = true;
                    });
                });
            });

            suiteDescribe("Other Suite", function () {
                suiteIt("other test", function () {
                    otherTestExecuted = true;
                });
            });
        });

        const childSuite = suite.suites[0].suites[0];
        const filter = createSuiteInstanceFilter([childSuite]);
        const runner = createTestRunner(suite);
        runner.addFilter(filter);

        doAwait(runner.run(), function () {
            assert.isTrue(parentTestExecuted, "parent test should run because parent suite contains matching child");
            assert.isTrue(childTestExecuted, "child test should run");
            assert.isFalse(otherTestExecuted, "other test should not run");
            done();
        });
    });

    it("should run all nested tests when parent suite instance matches", function (done) {
        const suite = createSuite();

        let parentTestExecuted = false;
        let childTestExecuted = false;
        let otherTestExecuted = false;

        useSuite(suite, function () {
            suiteDescribe("Parent Suite", function () {
                suiteIt("parent test", function () {
                    parentTestExecuted = true;
                });

                suiteDescribe("Child Suite", function () {
                    suiteIt("child test", function () {
                        childTestExecuted = true;
                    });
                });
            });

            suiteDescribe("Other Suite", function () {
                suiteIt("other test", function () {
                    otherTestExecuted = true;
                });
            });
        });

        const parentSuite = suite.suites[0];
        const filter = createSuiteInstanceFilter([parentSuite]);
        const runner = createTestRunner(suite);
        runner.addFilter(filter);

        doAwait(runner.run(), function () {
            assert.isTrue(parentTestExecuted, "parent test should run");
            assert.isTrue(childTestExecuted, "child test should run");
            assert.isFalse(otherTestExecuted, "other test should not run");
            done();
        });
    });
});

describe("testInstanceFilter", function () {
    it("should run no tests when empty test array", function (done) {
        const suite = createSuite();

        let test1Executed = false;
        let test2Executed = false;

        useSuite(suite, function () {
            suiteDescribe("Suite", function () {
                suiteIt("test 1", function () {
                    test1Executed = true;
                });

                suiteIt("test 2", function () {
                    test2Executed = true;
                });
            });
        });

        const filter = createTestInstanceFilter([]);
        const runner = createTestRunner(suite);
        runner.addFilter(filter);

        doAwait(runner.run(), function () {
            assert.isFalse(test1Executed);
            assert.isFalse(test2Executed);
            done();
        });
    });

    it("should not execute anything when test instance does not match", function (done) {
        const suite = createSuite();
        const otherSuite = createSuite();

        let testExecuted = false;

        useSuite(suite, function () {
            suiteDescribe("Suite", function () {
                suiteIt("test", function () {
                    testExecuted = true;
                });
            });
        });

        useSuite(otherSuite, function () {
            suiteDescribe("Other Suite", function () {
                suiteIt("other test", function () {});
            });
        });

        // Pass a test from a different suite
        const filter = createTestInstanceFilter([otherSuite.suites[0].tests[0]]);
        const runner = createTestRunner(suite);
        runner.addFilter(filter);

        doAwait(runner.run(), function () {
            assert.isFalse(testExecuted);
            const results = runner.getResults();
            assert.equal(results.passed, 0);
            done();
        });
    });

    it("should run only specific test when test instance matches", function (done) {
        const suite = createSuite();

        let test1Executed = false;
        let test2Executed = false;

        useSuite(suite, function () {
            suiteDescribe("Suite", function () {
                suiteIt("test 1", function () {
                    test1Executed = true;
                });

                suiteIt("test 2", function () {
                    test2Executed = true;
                });
            });
        });

        const targetTest = suite.suites[0].tests[0];
        const filter = createTestInstanceFilter([targetTest]);
        const runner = createTestRunner(suite);
        runner.addFilter(filter);

        doAwait(runner.run(), function () {
            assert.isTrue(test1Executed);
            assert.isFalse(test2Executed);
            done();
        });
    });

    it("should filter multiple test instances", function (done) {
        const suite = createSuite();

        let test1Executed = false;
        let test2Executed = false;
        let test3Executed = false;

        useSuite(suite, function () {
            suiteDescribe("Suite", function () {
                suiteIt("test 1", function () {
                    test1Executed = true;
                });

                suiteIt("test 2", function () {
                    test2Executed = true;
                });

                suiteIt("test 3", function () {
                    test3Executed = true;
                });
            });
        });

        const tests = [suite.suites[0].tests[0], suite.suites[0].tests[2]];
        const filter = createTestInstanceFilter(tests);
        const runner = createTestRunner(suite);
        runner.addFilter(filter);

        doAwait(runner.run(), function () {
            assert.isTrue(test1Executed);
            assert.isFalse(test2Executed);
            assert.isTrue(test3Executed);
            done();
        });
    });

    it("should run test from nested suite when test instance matches", function (done) {
        const suite = createSuite();

        let parentTestExecuted = false;
        let childTestExecuted = false;
        let otherTestExecuted = false;

        useSuite(suite, function () {
            suiteDescribe("Parent Suite", function () {
                suiteIt("parent test", function () {
                    parentTestExecuted = true;
                });

                suiteDescribe("Child Suite", function () {
                    suiteIt("child test", function () {
                        childTestExecuted = true;
                    });
                });
            });

            suiteDescribe("Other Suite", function () {
                suiteIt("other test", function () {
                    otherTestExecuted = true;
                });
            });
        });

        const childTest = suite.suites[0].suites[0].tests[0];
        const filter = createTestInstanceFilter([childTest]);
        const runner = createTestRunner(suite);
        runner.addFilter(filter);

        doAwait(runner.run(), function () {
            assert.isFalse(parentTestExecuted, "parent test should not run");
            assert.isTrue(childTestExecuted, "child test should run");
            assert.isFalse(otherTestExecuted, "other test should not run");
            done();
        });
    });

    it("should filter tests from different suites at different nesting levels", function (done) {
        const suite = createSuite();

        let suite1TestExecuted = false;
        let nestedTestExecuted = false;
        let suite2TestExecuted = false;

        useSuite(suite, function () {
            suiteDescribe("Suite 1", function () {
                suiteIt("suite 1 test", function () {
                    suite1TestExecuted = true;
                });

                suiteDescribe("Nested Suite", function () {
                    suiteIt("nested test", function () {
                        nestedTestExecuted = true;
                    });
                });
            });

            suiteDescribe("Suite 2", function () {
                suiteIt("suite 2 test", function () {
                    suite2TestExecuted = true;
                });
            });
        });

        const suite1Test = suite.suites[0].tests[0];
        const suite2Test = suite.suites[1].tests[0];
        const filter = createTestInstanceFilter([suite1Test, suite2Test]);
        const runner = createTestRunner(suite);
        runner.addFilter(filter);

        doAwait(runner.run(), function () {
            assert.isTrue(suite1TestExecuted, "suite 1 test should run");
            assert.isFalse(nestedTestExecuted, "nested test should not run");
            assert.isTrue(suite2TestExecuted, "suite 2 test should run");
            done();
        });
    });
});
