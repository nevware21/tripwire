/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "../../../../src/assert/assertClass";
import { createOnlyFilter } from "../../../../src/suite/filters/onlyFilter";
import { createTestRunner } from "../../../../src/suite/runner";
import { doAwait } from "@nevware21/ts-async";
import { createSuite, useSuite } from "../../../../src/suite/suite";
import { describe as selfDescribe } from "../../../../src/suite/suite";
import { it as selfIt } from "../../../../src/suite/it";

describe("onlyFilter", function () {
    it("should return null when nothing is marked only", function () {
        const suite = createSuite();

        useSuite(suite, function () {
            selfDescribe("Suite 1", function () {
                selfIt("test 1", function () {});
                selfIt("test 2", function () {});
            });
        });

        const filter = createOnlyFilter(suite);
        assert.isNull(filter);
    });

    it("should filter when suite is marked only", function (done) {
        const suite = createSuite();

        let test1Executed = false;
        let test2Executed = false;
        let test3Executed = false;

        useSuite(suite, function () {
            selfDescribe("Suite 1", function () {
                selfIt("test 1", function () {
                    test1Executed = true;
                });
            });

            selfDescribe.only("Suite 2", function () {
                selfIt("test 2", function () {
                    test2Executed = true;
                });
            });

            selfDescribe("Suite 3", function () {
                selfIt("test 3", function () {
                    test3Executed = true;
                });
            });
        });

        const filter = createOnlyFilter(suite);
        assert.isNotNull(filter);

        const runner = createTestRunner(suite);
        if (filter) {
            runner.addFilter(filter);
        }

        doAwait(runner.run(), function () {
            assert.isFalse(test1Executed);
            assert.isTrue(test2Executed);
            assert.isFalse(test3Executed);
            done();
        });
    });

    it("should filter when test is marked only", function (done) {
        const suite = createSuite();

        let test1Executed = false;
        let test2Executed = false;
        let test3Executed = false;

        useSuite(suite, function () {
            selfDescribe("Suite 1", function () {
                selfIt("test 1", function () {
                    test1Executed = true;
                });

                selfIt.only("test 2", function () {
                    test2Executed = true;
                });

                selfIt("test 3", function () {
                    test3Executed = true;
                });
            });
        });

        const filter = createOnlyFilter(suite);
        assert.isNotNull(filter);

        const runner = createTestRunner(suite);
        if (filter) {
            runner.addFilter(filter);
        }

        doAwait(runner.run(), function () {
            assert.isFalse(test1Executed);
            assert.isTrue(test2Executed);
            assert.isFalse(test3Executed);
            done();
        });
    });

    it("should include parent suites when child is marked only", function (done) {
        const suite = createSuite();

        let childTestRun = false;

        useSuite(suite, function () {
            selfDescribe("Parent Suite", function () {
                selfDescribe("Child Suite", function () {
                    selfIt.only("only test", function () {
                        childTestRun = true;
                    });
                });
            });
        });

        const filter = createOnlyFilter(suite);
        assert.isNotNull(filter);

        const runner = createTestRunner(suite);
        if (filter) {
            runner.addFilter(filter);
        }

        doAwait(runner.run(), function () {
            assert.isTrue(childTestRun);
            const results = runner.getResults();
            assert.equal(results.passed, 1);
            done();
        });
    });

    it("should run multiple only-marked tests", function (done) {
        const suite = createSuite();

        let test1Executed = false;
        let test2Executed = false;
        let test3Executed = false;

        useSuite(suite, function () {
            selfDescribe("Suite", function () {
                selfIt.only("test 1", function () {
                    test1Executed = true;
                });

                selfIt("test 2", function () {
                    test2Executed = true;
                });

                selfIt.only("test 3", function () {
                    test3Executed = true;
                });
            });
        });

        const filter = createOnlyFilter(suite);
        assert.isNotNull(filter);

        const runner = createTestRunner(suite);
        if (filter) {
            runner.addFilter(filter);
        }

        doAwait(runner.run(), function () {
            assert.isTrue(test1Executed);
            assert.isFalse(test2Executed);
            assert.isTrue(test3Executed);
            done();
        });
    });

    it("should handle only at different nesting levels", function (done) {
        const suite = createSuite();

        let suite1Test1Run = false;
        let suite2Test1Run = false;
        let suite3Test1Run = false;

        useSuite(suite, function () {
            selfDescribe.only("Suite 1", function () {
                selfIt("test 1", function () {
                    suite1Test1Run = true;
                });
            });

            selfDescribe("Suite 2", function () {
                selfIt("test 1", function () {
                    suite2Test1Run = true;
                });
            });

            selfDescribe("Suite 3", function () {
                selfIt.only("test 1", function () {
                    suite3Test1Run = true;
                });
            });
        });

        const filter = createOnlyFilter(suite);
        assert.isNotNull(filter);

        const runner = createTestRunner(suite);
        if (filter) {
            runner.addFilter(filter);
        }

        doAwait(runner.run(), function () {
            assert.isTrue(suite1Test1Run);
            assert.isFalse(suite2Test1Run);
            assert.isTrue(suite3Test1Run);
            done();
        });
    });

    it("should run all tests in only-marked suite", function (done) {
        const suite = createSuite();

        let test1Executed = false;
        let test2Executed = false;
        let test3Executed = false;

        useSuite(suite, function () {
            selfDescribe.only("Only Suite", function () {
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

        const filter = createOnlyFilter(suite);
        assert.isNotNull(filter);

        const runner = createTestRunner(suite);
        if (filter) {
            runner.addFilter(filter);
        }

        doAwait(runner.run(), function () {
            assert.isTrue(test1Executed, "test 1 should run when parent suite is marked only");
            assert.isTrue(test2Executed, "test 2 should run when parent suite is marked only");
            assert.isTrue(test3Executed, "test 3 should run when parent suite is marked only");
            done();
        });
    });

    it("should only run only-marked tests within non-only suite", function (done) {
        const suite = createSuite();

        let test1Executed = false;
        let test2Executed = false;
        let test3Executed = false;

        useSuite(suite, function () {
            selfDescribe("Normal Suite", function () {
                selfIt.only("only test 1", function () {
                    test1Executed = true;
                });

                selfIt("normal test", function () {
                    test2Executed = true;
                });

                selfIt.only("only test 2", function () {
                    test3Executed = true;
                });
            });
        });

        const filter = createOnlyFilter(suite);
        assert.isNotNull(filter);

        const runner = createTestRunner(suite);
        if (filter) {
            runner.addFilter(filter);
        }

        doAwait(runner.run(), function () {
            assert.isTrue(test1Executed, "only-marked test 1 should run");
            assert.isFalse(test2Executed, "non-only test should not run");
            assert.isTrue(test3Executed, "only-marked test 2 should run");
            done();
        });
    });

    it("should handle both suite and test marked only", function (done) {
        const suite = createSuite();

        let suite1Test1Executed = false;
        let suite1Test2Executed = false;
        let suite2Test1Executed = false;

        useSuite(suite, function () {
            selfDescribe.only("Only Suite 1", function () {
                selfIt.only("only test", function () {
                    suite1Test1Executed = true;
                });

                selfIt("normal test", function () {
                    suite1Test2Executed = true;
                });
            });

            selfDescribe("Normal Suite 2", function () {
                selfIt("test", function () {
                    suite2Test1Executed = true;
                });
            });
        });

        const filter = createOnlyFilter(suite);
        assert.isNotNull(filter);

        const runner = createTestRunner(suite);
        if (filter) {
            runner.addFilter(filter);
        }

        doAwait(runner.run(), function () {
            assert.isTrue(suite1Test1Executed, "test in only-marked suite should run");
            assert.isTrue(suite1Test2Executed, "all tests in only-marked suite should run, even if not marked only");
            assert.isFalse(suite2Test1Executed, "test in non-only suite should not run");
            done();
        });
    });
});
