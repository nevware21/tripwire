/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "../../../src/assert/assertClass";
import { findMatchingTestsAndSuites, findMatchingSuites, findMatchingTests } from "../../../src/suite/filterHelpers";
import { createSuiteIDFilter, createTestIDFilter } from "../../../src/suite/filters/idFilter";
import { createSuiteNameFilter, createTestNameFilter } from "../../../src/suite/filters/nameFilter";
import { createSuiteInstanceFilter, createTestInstanceFilter } from "../../../src/suite/filters/instanceFilter";
import { createOnlyFilter } from "../../../src/suite/filters/onlyFilter";
import { describe as suiteDescribe, createSuite, useSuite } from "../../../src/suite/suite";
import { it as suiteIt } from "../../../src/suite/it";

describe("findMatchingTestsAndSuites", function () {
    it("should find all tests and suites with test ID filter", function () {
        const suite = createSuite();

        useSuite(suite, function () {
            suiteDescribe("Suite 1", function () {
                suiteIt("test 1", function () {});
                suiteIt("test 2", function () {});
            });

            suiteDescribe("Suite 2", function () {
                suiteIt("test 3", function () {});
            });
        });

        const targetTestId = suite.suites[0].tests[0].id;
        const filter = createTestIDFilter([targetTestId || ""]);
        const result = findMatchingTestsAndSuites(suite, filter);

        assert.equal(result.tests.length, 1, "should find 1 test");
        assert.equal(result.tests[0].id, targetTestId, "should find the correct test");
        assert.equal(result.suites.length, 1, "should find 1 suite (parent)");
        assert.equal(result.suites[0], suite.suites[0], "should find the parent suite");
    });

    it("should find all tests and suites with suite ID filter", function () {
        const suite = createSuite();

        useSuite(suite, function () {
            suiteDescribe("Suite 1", function () {
                suiteIt("test 1", function () {});
                suiteIt("test 2", function () {});
            });

            suiteDescribe("Suite 2", function () {
                suiteIt("test 3", function () {});
            });
        });

        const targetSuiteId = suite.suites[0].id;
        const filter = createSuiteIDFilter([targetSuiteId || ""]);
        const result = findMatchingTestsAndSuites(suite, filter);

        assert.equal(result.tests.length, 2, "should find 2 tests in suite");
        assert.equal(result.suites.length, 1, "should find 1 suite");
        assert.equal(result.suites[0].id, targetSuiteId, "should find the correct suite");
    });

    it("should find tests by name filter", function () {
        const suite = createSuite();

        useSuite(suite, function () {
            suiteDescribe("Suite 1", function () {
                suiteIt("validate something", function () {});
                suiteIt("test something", function () {});
            });
        });

        const filter = createTestNameFilter(["validate"]);
        const result = findMatchingTestsAndSuites(suite, filter);

        assert.equal(result.tests.length, 1, "should find 1 test");
        assert.isTrue(result.tests[0].description?.indexOf("validate") !== -1, "should find validate test");
        assert.equal(result.suites.length, 1, "should find parent suite");
    });

    it("should find suites by name filter", function () {
        const suite = createSuite();

        useSuite(suite, function () {
            suiteDescribe("Validation Suite", function () {
                suiteIt("test 1", function () {});
                suiteIt("test 2", function () {});
            });

            suiteDescribe("Other Suite", function () {
                suiteIt("test 3", function () {});
            });
        });

        const filter = createSuiteNameFilter(["validation"]);
        const result = findMatchingTestsAndSuites(suite, filter);

        assert.equal(result.tests.length, 2, "should find 2 tests in matching suite");
        assert.equal(result.suites.length, 1, "should find 1 suite");
        assert.isTrue(result.suites[0].description?.toLowerCase().indexOf("validation") !== -1, "should find validation suite");
    });

    it("should find only-marked tests and suites", function () {
        const suite = createSuite();

        useSuite(suite, function () {
            suiteDescribe("Suite 1", function () {
                suiteIt.only("test 1", function () {});
                suiteIt("test 2", function () {});
            });

            suiteDescribe.only("Suite 2", function () {
                suiteIt("test 3", function () {});
            });
        });

        const filter = createOnlyFilter(suite);
        assert.isNotNull(filter, "filter should not be null when only is present");

        if (filter) {
            const result = findMatchingTestsAndSuites(suite, filter);

            assert.equal(result.tests.length, 2, "should find 2 tests (1 only test + 1 test in only suite)");
            assert.equal(result.suites.length, 2, "should find 2 suites");
        }
    });

    it("should find tests by instance filter", function () {
        const suite = createSuite();

        useSuite(suite, function () {
            suiteDescribe("Suite 1", function () {
                suiteIt("test 1", function () {});
                suiteIt("test 2", function () {});
            });
        });

        const targetTest = suite.suites[0].tests[0];
        const filter = createTestInstanceFilter([targetTest]);
        const result = findMatchingTestsAndSuites(suite, filter);

        assert.equal(result.tests.length, 1, "should find 1 test");
        assert.equal(result.tests[0], targetTest, "should find the exact test instance");
        assert.equal(result.suites.length, 1, "should find parent suite");
    });

    it("should find suites by instance filter", function () {
        const suite = createSuite();

        useSuite(suite, function () {
            suiteDescribe("Suite 1", function () {
                suiteIt("test 1", function () {});
                suiteIt("test 2", function () {});
            });

            suiteDescribe("Suite 2", function () {
                suiteIt("test 3", function () {});
            });
        });

        const targetSuite = suite.suites[0];
        const filter = createSuiteInstanceFilter([targetSuite]);
        const result = findMatchingTestsAndSuites(suite, filter);

        assert.equal(result.tests.length, 2, "should find 2 tests in target suite");
        assert.equal(result.suites.length, 1, "should find 1 suite");
        assert.equal(result.suites[0], targetSuite, "should find the exact suite instance");
    });

    it("should handle nested suites", function () {
        const suite = createSuite();

        useSuite(suite, function () {
            suiteDescribe("Parent Suite", function () {
                suiteIt("parent test", function () {});

                suiteDescribe("Child Suite", function () {
                    suiteIt("child test", function () {});
                });
            });
        });

        const parentSuiteId = suite.suites[0].id;
        const filter = createSuiteIDFilter([parentSuiteId || ""]);
        const result = findMatchingTestsAndSuites(suite, filter);

        assert.equal(result.tests.length, 2, "should find 2 tests (parent + child)");
        assert.equal(result.suites.length, 2, "should find 2 suites (parent + child)");
    });

    it("should return empty arrays when no matches", function () {
        const suite = createSuite();

        useSuite(suite, function () {
            suiteDescribe("Suite 1", function () {
                suiteIt("test 1", function () {});
            });
        });

        const filter = createTestIDFilter(["non-existent-id"]);
        const result = findMatchingTestsAndSuites(suite, filter);

        assert.equal(result.tests.length, 0, "should find no tests");
        assert.equal(result.suites.length, 0, "should find no suites");
    });

    it("should handle multiple matching tests across suites", function () {
        const suite = createSuite();

        useSuite(suite, function () {
            suiteDescribe("Suite 1", function () {
                suiteIt("validate test", function () {});
            });

            suiteDescribe("Suite 2", function () {
                suiteIt("validate another", function () {});
            });

            suiteDescribe("Suite 3", function () {
                suiteIt("other test", function () {});
            });
        });

        const filter = createTestNameFilter(["validate"]);
        const result = findMatchingTestsAndSuites(suite, filter);

        assert.equal(result.tests.length, 2, "should find 2 validate tests");
        assert.equal(result.suites.length, 2, "should find 2 suites containing validate tests");
    });
});

describe("findMatchingSuites", function () {
    it("should return only matching suites", function () {
        const suite = createSuite();

        useSuite(suite, function () {
            suiteDescribe("Suite 1", function () {
                suiteIt("test 1", function () {});
            });

            suiteDescribe("Suite 2", function () {
                suiteIt("test 2", function () {});
            });
        });

        const targetSuiteId = suite.suites[0].id;
        const filter = createSuiteIDFilter([targetSuiteId || ""]);
        const suites = findMatchingSuites(suite, filter);

        assert.equal(suites.length, 1, "should find 1 suite");
        assert.equal(suites[0].id, targetSuiteId, "should find correct suite");
    });

    it("should return empty array when no suites match", function () {
        const suite = createSuite();

        useSuite(suite, function () {
            suiteDescribe("Suite 1", function () {
                suiteIt("test 1", function () {});
            });
        });

        const filter = createSuiteIDFilter(["non-existent"]);
        const suites = findMatchingSuites(suite, filter);

        assert.equal(suites.length, 0, "should find no suites");
    });
});

describe("findMatchingTests", function () {
    it("should return only matching tests", function () {
        const suite = createSuite();

        useSuite(suite, function () {
            suiteDescribe("Suite 1", function () {
                suiteIt("test 1", function () {});
                suiteIt("test 2", function () {});
            });
        });

        const targetTestId = suite.suites[0].tests[0].id;
        const filter = createTestIDFilter([targetTestId || ""]);
        const tests = findMatchingTests(suite, filter);

        assert.equal(tests.length, 1, "should find 1 test");
        assert.equal(tests[0].id, targetTestId, "should find correct test");
    });

    it("should return empty array when no tests match", function () {
        const suite = createSuite();

        useSuite(suite, function () {
            suiteDescribe("Suite 1", function () {
                suiteIt("test 1", function () {});
            });
        });

        const filter = createTestIDFilter(["non-existent"]);
        const tests = findMatchingTests(suite, filter);

        assert.equal(tests.length, 0, "should find no tests");
    });

    it("should find tests across multiple nested suites", function () {
        const suite = createSuite();

        useSuite(suite, function () {
            suiteDescribe("Suite 1", function () {
                suiteIt("validate test 1", function () {});

                suiteDescribe("Nested Suite", function () {
                    suiteIt("validate test 2", function () {});
                });
            });
        });

        const filter = createTestNameFilter(["validate"]);
        const tests = findMatchingTests(suite, filter);

        assert.equal(tests.length, 2, "should find 2 validate tests");
    });
});
