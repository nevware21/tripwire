/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "../../../../src/assert/assertClass";
import { createSuiteIDFilter, createTestIDFilter } from "../../../../src/suite/filters/idFilter";
import { createTestRunner } from "../../../../src/suite/runner";
import { doAwait } from "@nevware21/ts-async";
import { describe as suiteDescribe, createSuite, useSuite } from "../../../../src/suite/suite";
import { it as suiteIt } from "../../../../src/suite/it";

describe("suiteIdFilter", function () {
    it("should run no tests when empty ID array", function (done) {
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

        const filter = createSuiteIDFilter([]);
        const runner = createTestRunner(suite);
        runner.addFilter(filter);

        doAwait(runner.run(), function () {
            assert.isFalse(test1Executed);
            assert.isFalse(test2Executed);
            done();
        });
    });

    it("should not execute anything when suite ID does not match", function (done) {
        const suite = createSuite();

        let testExecuted = false;

        useSuite(suite, function () {
            suiteDescribe("Suite", function () {
                suiteIt("test", function () {
                    testExecuted = true;
                });
            });
        });

        const filter = createSuiteIDFilter(["non-existent-id"]);
        const runner = createTestRunner(suite);
        runner.addFilter(filter);

        doAwait(runner.run(), function () {
            assert.isFalse(testExecuted);
            const results = runner.getResults();
            assert.equal(results.passed, 0);
            done();
        });
    });

    it("should run all tests in suite when suite ID matches", function (done) {
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

        const suiteId = suite.suites[0].id;
        const filter = createSuiteIDFilter([suiteId || ""]);
        const runner = createTestRunner(suite);
        runner.addFilter(filter);

        doAwait(runner.run(), function () {
            assert.isTrue(test1Executed);
            assert.isTrue(test2Executed);
            done();
        });
    });

    it("should run tests from multiple suites when multiple suite IDs match", function (done) {
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

        const suiteId1 = suite.suites[0].id;
        const suiteId3 = suite.suites[2].id;
        const filter = createSuiteIDFilter([suiteId1 || "", suiteId3 || ""]);
        const runner = createTestRunner(suite);
        runner.addFilter(filter);

        doAwait(runner.run(), function () {
            assert.isTrue(suite1Test1Executed);
            assert.isFalse(suite2Test1Executed);
            assert.isTrue(suite3Test1Executed);
            done();
        });
    });

    it("should run nested suite tests when nested suite ID matches", function (done) {
        const suite = createSuite();

        let parentTest1Executed = false;
        let childTest1Executed = false;
        let otherTest1Executed = false;

        useSuite(suite, function () {
            suiteDescribe("Parent Suite", function () {
                suiteIt("parent test", function () {
                    parentTest1Executed = true;
                });

                suiteDescribe("Child Suite", function () {
                    suiteIt("child test", function () {
                        childTest1Executed = true;
                    });
                });
            });

            suiteDescribe("Other Suite", function () {
                suiteIt("other test", function () {
                    otherTest1Executed = true;
                });
            });
        });

        const childSuiteId = suite.suites[0].suites[0].id;
        const filter = createSuiteIDFilter([childSuiteId || ""]);
        const runner = createTestRunner(suite);
        runner.addFilter(filter);

        doAwait(runner.run(), function () {
            assert.isTrue(parentTest1Executed, "parent test should run because parent suite contains matching child");
            assert.isTrue(childTest1Executed, "child test should run");
            assert.isFalse(otherTest1Executed, "other test should not run");
            done();
        });
    });

    it("should run all nested tests when parent suite ID matches", function (done) {
        const suite = createSuite();

        let parentTest1Executed = false;
        let childTest1Executed = false;
        let otherTest1Executed = false;

        useSuite(suite, function () {
            suiteDescribe("Parent Suite", function () {
                suiteIt("parent test", function () {
                    parentTest1Executed = true;
                });

                suiteDescribe("Child Suite", function () {
                    suiteIt("child test", function () {
                        childTest1Executed = true;
                    });
                });
            });

            suiteDescribe("Other Suite", function () {
                suiteIt("other test", function () {
                    otherTest1Executed = true;
                });
            });
        });

        const parentSuiteId = suite.suites[0].id;
        const filter = createSuiteIDFilter([parentSuiteId || ""]);
        const runner = createTestRunner(suite);
        runner.addFilter(filter);

        doAwait(runner.run(), function () {
            assert.isTrue(parentTest1Executed, "parent test should run");
            assert.isTrue(childTest1Executed, "child test should run");
            assert.isFalse(otherTest1Executed, "other test should not run");
            done();
        });
    });
});

describe("testIdFilter", function () {
    it("should run no tests when empty ID array", function (done) {
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

        const filter = createTestIDFilter([]);
        const runner = createTestRunner(suite);
        runner.addFilter(filter);

        doAwait(runner.run(), function () {
            assert.isFalse(test1Executed);
            assert.isFalse(test2Executed);
            done();
        });
    });

    it("should not execute anything when test ID does not match", function (done) {
        const suite = createSuite();

        let testExecuted = false;

        useSuite(suite, function () {
            suiteDescribe("Suite", function () {
                suiteIt("test", function () {
                    testExecuted = true;
                });
            });
        });

        const filter = createTestIDFilter(["non-existent-id"]);
        const runner = createTestRunner(suite);
        runner.addFilter(filter);

        doAwait(runner.run(), function () {
            assert.isFalse(testExecuted);
            const results = runner.getResults();
            assert.equal(results.passed, 0);
            done();
        });
    });

    it("should run only specific test when test ID matches", function (done) {
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

        const targetId = suite.suites[0].tests[0].id;
        const filter = createTestIDFilter([targetId || ""]);
        const runner = createTestRunner(suite);
        runner.addFilter(filter);

        doAwait(runner.run(), function () {
            assert.isTrue(test1Executed);
            assert.isFalse(test2Executed);
            done();
        });
    });

    it("should run multiple tests when multiple test IDs match", function (done) {
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

        const testId1 = suite.suites[0].tests[0].id;
        const testId3 = suite.suites[0].tests[2].id;
        const filter = createTestIDFilter([testId1 || "", testId3 || ""]);
        const runner = createTestRunner(suite);
        runner.addFilter(filter);

        doAwait(runner.run(), function () {
            assert.isTrue(test1Executed);
            assert.isFalse(test2Executed);
            assert.isTrue(test3Executed);
            done();
        });
    });

    it("should run tests from different suites when their test IDs match", function (done) {
        const suite = createSuite();

        let suite1Test1Executed = false;
        let suite1Test2Executed = false;
        let suite2Test1Executed = false;

        useSuite(suite, function () {
            suiteDescribe("Suite 1", function () {
                suiteIt("test 1", function () {
                    suite1Test1Executed = true;
                });

                suiteIt("test 2", function () {
                    suite1Test2Executed = true;
                });
            });

            suiteDescribe("Suite 2", function () {
                suiteIt("test 1", function () {
                    suite2Test1Executed = true;
                });
            });
        });

        const suite1TestId = suite.suites[0].tests[0].id;
        const suite2TestId = suite.suites[1].tests[0].id;
        const filter = createTestIDFilter([suite1TestId || "", suite2TestId || ""]);
        const runner = createTestRunner(suite);
        runner.addFilter(filter);

        doAwait(runner.run(), function () {
            assert.isTrue(suite1Test1Executed);
            assert.isFalse(suite1Test2Executed);
            assert.isTrue(suite2Test1Executed);
            done();
        });
    });

    it("should run nested suite test when test ID in nested suite matches", function (done) {
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

        const childTestId = suite.suites[0].suites[0].tests[0].id;
        const filter = createTestIDFilter([childTestId || ""]);
        const runner = createTestRunner(suite);
        runner.addFilter(filter);

        doAwait(runner.run(), function () {
            assert.isFalse(parentTestExecuted, "parent test should not run");
            assert.isTrue(childTestExecuted, "child test should run");
            assert.isFalse(otherTestExecuted, "other test should not run");
            done();
        });
    });
});
