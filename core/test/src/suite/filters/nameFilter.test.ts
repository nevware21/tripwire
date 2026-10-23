/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "../../../../src/assert/assertClass";
import { createSuiteNameFilter, createTestNameFilter } from "../../../../src/suite/filters/nameFilter";
import { createTestRunner } from "../../../../src/suite/runner";
import { doAwait } from "@nevware21/ts-async";
import { describe as suiteDescribe, createSuite, useSuite } from "../../../../src/suite/suite";
import { it as suiteIt } from "../../../../src/suite/it";

describe("suiteNameFilter", function () {
    it("should run no tests when empty name array", function (done) {
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

        const filter = createSuiteNameFilter([]);
        const runner = createTestRunner(suite);
        runner.addFilter(filter);

        doAwait(runner.run(), function () {
            assert.isFalse(test1Executed);
            assert.isFalse(test2Executed);
            done();
        });
    });

    it("should not execute anything when suite name does not match", function (done) {
        const suite = createSuite();

        let testExecuted = false;

        useSuite(suite, function () {
            suiteDescribe("Suite", function () {
                suiteIt("test something", function () {
                    testExecuted = true;
                });
            });
        });

        const filter = createSuiteNameFilter(["nonexistent"]);
        const runner = createTestRunner(suite);
        runner.addFilter(filter);

        doAwait(runner.run(), function () {
            assert.isFalse(testExecuted);
            const results = runner.getResults();
            assert.equal(results.passed, 0);
            done();
        });
    });

    it("should run all tests in suite when suite name matches", function (done) {
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

        const filter = createSuiteNameFilter(["target"]);
        const runner = createTestRunner(suite);
        runner.addFilter(filter);

        doAwait(runner.run(), function () {
            assert.isTrue(test1Executed);
            assert.isTrue(test2Executed);
            done();
        });
    });

    it("should be case-insensitive for substring match by default", function (done) {
        const suite = createSuite();

        let test1Executed = false;
        let test2Executed = false;

        useSuite(suite, function () {
            suiteDescribe("TEST UPPER Suite", function () {
                suiteIt("test 1", function () {
                    test1Executed = true;
                });
            });

            suiteDescribe("lower test suite", function () {
                suiteIt("test 2", function () {
                    test2Executed = true;
                });
            });
        });

        const filter = createSuiteNameFilter(["TEST"]);
        const runner = createTestRunner(suite);
        runner.addFilter(filter);

        doAwait(runner.run(), function () {
            assert.isTrue(test1Executed, "upper case suite should match");
            assert.isTrue(test2Executed, "lower case suite should match");
            done();
        });
    });

    it("should support exact match when exactMatch is true", function (done) {
        const suite = createSuite();

        let exactMatchExecuted = false;
        let partialMatchExecuted = false;

        useSuite(suite, function () {
            suiteDescribe("Exact Name", function () {
                suiteIt("test 1", function () {
                    exactMatchExecuted = true;
                });
            });

            suiteDescribe("Exact Name With More", function () {
                suiteIt("test 2", function () {
                    partialMatchExecuted = true;
                });
            });
        });

        const filter = createSuiteNameFilter(["Exact Name"], true);
        const runner = createTestRunner(suite);
        runner.addFilter(filter);

        doAwait(runner.run(), function () {
            assert.isTrue(exactMatchExecuted, "exact match should run");
            assert.isFalse(partialMatchExecuted, "partial match should not run with exactMatch=true");
            done();
        });
    });

    it("should match multiple suite names", function (done) {
        const suite = createSuite();

        let suite1Test1Executed = false;
        let suite2Test1Executed = false;
        let suite3Test1Executed = false;

        useSuite(suite, function () {
            suiteDescribe("Suite Alpha", function () {
                suiteIt("test 1", function () {
                    suite1Test1Executed = true;
                });
            });

            suiteDescribe("Suite Beta", function () {
                suiteIt("test 1", function () {
                    suite2Test1Executed = true;
                });
            });

            suiteDescribe("Suite Gamma", function () {
                suiteIt("test 1", function () {
                    suite3Test1Executed = true;
                });
            });
        });

        const filter = createSuiteNameFilter(["alpha", "gamma"]);
        const runner = createTestRunner(suite);
        runner.addFilter(filter);

        doAwait(runner.run(), function () {
            assert.isTrue(suite1Test1Executed, "suite alpha should run");
            assert.isFalse(suite2Test1Executed, "suite beta should not run");
            assert.isTrue(suite3Test1Executed, "suite gamma should run");
            done();
        });
    });

    it("should run nested suite tests when nested suite name matches", function (done) {
        const suite = createSuite();

        let parentTestExecuted = false;
        let childTestExecuted = false;
        let otherTestExecuted = false;

        useSuite(suite, function () {
            suiteDescribe("Parent Suite", function () {
                suiteIt("parent test", function () {
                    parentTestExecuted = true;
                });

                suiteDescribe("Special Child", function () {
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

        const filter = createSuiteNameFilter(["special"]);
        const runner = createTestRunner(suite);
        runner.addFilter(filter);

        doAwait(runner.run(), function () {
            assert.isTrue(parentTestExecuted, "parent test should run because parent suite contains matching child");
            assert.isTrue(childTestExecuted, "child test should run");
            assert.isFalse(otherTestExecuted, "other test should not run");
            done();
        });
    });

    it("should run all nested tests when parent suite name matches", function (done) {
        const suite = createSuite();

        let parentTestExecuted = false;
        let childTestExecuted = false;
        let otherTestExecuted = false;

        useSuite(suite, function () {
            suiteDescribe("Special Parent", function () {
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

        const filter = createSuiteNameFilter(["special"]);
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

describe("testNameFilter", function () {
    it("should run no tests when empty name array", function (done) {
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

        const filter = createTestNameFilter([]);
        const runner = createTestRunner(suite);
        runner.addFilter(filter);

        doAwait(runner.run(), function () {
            assert.isFalse(test1Executed);
            assert.isFalse(test2Executed);
            done();
        });
    });

    it("should be case-insensitive for substring match", function (done) {
        const suite = createSuite();

        let test1Executed = false;
        let test2Executed = false;

        useSuite(suite, function () {
            suiteDescribe("Suite", function () {
                suiteIt("Should Validate Foo", function () {
                    test1Executed = true;
                });

                suiteIt("should test bar", function () {
                    test2Executed = true;
                });
            });
        });

        const filter = createTestNameFilter(["validate"]);
        const runner = createTestRunner(suite);
        runner.addFilter(filter);

        doAwait(runner.run(), function () {
            assert.isTrue(test1Executed);
            assert.isFalse(test2Executed);
            done();
        });
    });

    it("should not execute anything when test name does not match", function (done) {
        const suite = createSuite();

        let testExecuted = false;

        useSuite(suite, function () {
            suiteDescribe("Suite", function () {
                suiteIt("test something", function () {
                    testExecuted = true;
                });
            });
        });

        const filter = createTestNameFilter(["nonexistent"]);
        const runner = createTestRunner(suite);
        runner.addFilter(filter);

        doAwait(runner.run(), function () {
            assert.isFalse(testExecuted);
            const results = runner.getResults();
            assert.equal(results.passed, 0);
            done();
        });
    });

    it("should run only specific test when test name matches", function (done) {
        const suite = createSuite();

        let test1Executed = false;
        let test2Executed = false;

        useSuite(suite, function () {
            suiteDescribe("Suite", function () {
                suiteIt("validate something", function () {
                    test1Executed = true;
                });

                suiteIt("test bar", function () {
                    test2Executed = true;
                });
            });
        });

        const filter = createTestNameFilter(["validate"]);
        const runner = createTestRunner(suite);
        runner.addFilter(filter);

        doAwait(runner.run(), function () {
            assert.isTrue(test1Executed);
            assert.isFalse(test2Executed);
            done();
        });
    });

    it("should support exact match when exactMatch is true", function (done) {
        const suite = createSuite();

        let exactMatchExecuted = false;
        let partialMatchExecuted = false;

        useSuite(suite, function () {
            suiteDescribe("Suite", function () {
                suiteIt("validate", function () {
                    exactMatchExecuted = true;
                });

                suiteIt("validate something more", function () {
                    partialMatchExecuted = true;
                });
            });
        });

        const filter = createTestNameFilter(["validate"], true);
        const runner = createTestRunner(suite);
        runner.addFilter(filter);

        doAwait(runner.run(), function () {
            assert.isTrue(exactMatchExecuted, "exact match should run");
            assert.isFalse(partialMatchExecuted, "partial match should not run with exactMatch=true");
            done();
        });
    });

    it("should match multiple test names", function (done) {
        const suite = createSuite();

        let test1Executed = false;
        let test2Executed = false;
        let test3Executed = false;

        useSuite(suite, function () {
            suiteDescribe("Suite", function () {
                suiteIt("alpha test", function () {
                    test1Executed = true;
                });

                suiteIt("beta test", function () {
                    test2Executed = true;
                });

                suiteIt("gamma test", function () {
                    test3Executed = true;
                });
            });
        });

        const filter = createTestNameFilter(["alpha", "gamma"]);
        const runner = createTestRunner(suite);
        runner.addFilter(filter);

        doAwait(runner.run(), function () {
            assert.isTrue(test1Executed, "alpha test should run");
            assert.isFalse(test2Executed, "beta test should not run");
            assert.isTrue(test3Executed, "gamma test should run");
            done();
        });
    });

    it("should run nested suite test when test name in nested suite matches", function (done) {
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
                    suiteIt("special child test", function () {
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

        const filter = createTestNameFilter(["special"]);
        const runner = createTestRunner(suite);
        runner.addFilter(filter);

        doAwait(runner.run(), function () {
            assert.isFalse(parentTestExecuted, "parent test should not run");
            assert.isTrue(childTestExecuted, "child test should run");
            assert.isFalse(otherTestExecuted, "other test should not run");
            done();
        });
    });

    it("should run multiple tests from nested suites", function (done) {
        const suite = createSuite();

        let parent1TestExecuted = false;
        let parent2TestExecuted = false;
        let child1TestExecuted = false;
        let child2TestExecuted = false;

        useSuite(suite, function () {
            suiteDescribe("Parent Suite 1", function () {
                suiteIt("regular test", function () {
                    parent1TestExecuted = true;
                });

                suiteDescribe("Child Suite 1", function () {
                    suiteIt("validation test", function () {
                        child1TestExecuted = true;
                    });
                });
            });

            suiteDescribe("Parent Suite 2", function () {
                suiteIt("validation test", function () {
                    parent2TestExecuted = true;
                });

                suiteDescribe("Child Suite 2", function () {
                    suiteIt("other test", function () {
                        child2TestExecuted = true;
                    });
                });
            });
        });

        const filter = createTestNameFilter(["validation"]);
        const runner = createTestRunner(suite);
        runner.addFilter(filter);

        doAwait(runner.run(), function () {
            assert.isFalse(parent1TestExecuted, "parent 1 regular test should not run");
            assert.isTrue(child1TestExecuted, "child 1 validation test should run");
            assert.isTrue(parent2TestExecuted, "parent 2 validation test should run");
            assert.isFalse(child2TestExecuted, "child 2 other test should not run");
            done();
        });
    });
});
