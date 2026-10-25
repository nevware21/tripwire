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

describe("Suite and Test ID generation", function () {

    it("should generate unique deterministic IDs for suites", function () {
        const suite1 = createSuite();
        const suite2 = createSuite();

        useSuite(suite1, function () {
            selfDescribe("Test Suite", function () {
                selfIt("test 1", function () {});
            });
        });

        useSuite(suite2, function () {
            selfDescribe("Test Suite", function () {
                selfIt("test 1", function () {});
            });
        });

        // Same description should produce same ID
        assert.equal(suite1.suites[0].id, suite2.suites[0].id, "Suite IDs should be deterministic");
        assert.ok(suite1.suites[0].id, "Suite ID should not be empty");
    });

    it("should generate unique deterministic IDs for tests", function () {
        const suite1 = createSuite();
        const suite2 = createSuite();

        useSuite(suite1, function () {
            selfDescribe("Test Suite", function () {
                selfIt("test 1", function () {});
            });
        });

        useSuite(suite2, function () {
            selfDescribe("Test Suite", function () {
                selfIt("test 1", function () {});
            });
        });

        // Same description in same suite hierarchy should produce same ID
        assert.equal(
            suite1.suites[0].tests[0].id,
            suite2.suites[0].tests[0].id,
            "Test IDs should be deterministic"
        );
        assert.ok(suite1.suites[0].tests[0].id, "Test ID should not be empty");
    });

    it("should generate different IDs for different suites", function () {
        const suite = createSuite();

        useSuite(suite, function () {
            selfDescribe("Suite 1", function () {});
            selfDescribe("Suite 2", function () {});
        });

        assert.notEqual(suite.suites[0].id, suite.suites[1].id, "Different suites should have different IDs");
    });

    it("should generate different IDs for different tests", function () {
        const suite = createSuite();

        useSuite(suite, function () {
            selfDescribe("Suite", function () {
                selfIt("test 1", function () {});
                selfIt("test 2", function () {});
            });
        });

        assert.notEqual(
            suite.suites[0].tests[0].id,
            suite.suites[0].tests[1].id,
            "Different tests should have different IDs"
        );
    });

    it("should generate different IDs for tests in nested suites", function () {
        const suite = createSuite();

        useSuite(suite, function () {
            selfDescribe("Parent Suite", function () {
                selfIt("test 1", function () {});

                selfDescribe("Child Suite", function () {
                    selfIt("test 1", function () {});
                });
            });
        });

        // Same test description in different suite hierarchy should have different IDs
        assert.notEqual(
            suite.suites[0].tests[0].id,
            suite.suites[0].suites[0].tests[0].id,
            "Tests with same name in different suite hierarchy should have different IDs"
        );
    });

    it("should include parent suite ID in child suite ID", function () {
        const suite = createSuite();

        useSuite(suite, function () {
            selfDescribe("Parent Suite", function () {
                selfDescribe("Child Suite", function () {});
            });
        });

        const parentId = suite.suites[0].id;
        const childId = suite.suites[0].suites[0].id;

        assert.ok(parentId, "Parent suite should have an ID");
        assert.ok(childId, "Child suite should have an ID");
        assert.notEqual(parentId, childId, "Parent and child should have different IDs");
    });

    it("should generate IDs in hex format", function () {
        const suite = createSuite();

        useSuite(suite, function () {
            selfDescribe("Test Suite", function () {
                selfIt("test 1", function () {});
            });
        });

        const suiteId = suite.suites[0].id;
        const testId = suite.suites[0].tests[0].id;

        // Check that IDs are hex strings (only contain 0-9 and a-f)
        assert.match(suiteId, /^[0-9a-f]+$/, "Suite ID should be a hex string");
        assert.match(testId, /^[0-9a-f]+$/, "Test ID should be a hex string");
    });

    it("should demonstrate deterministic behavior across multiple runs", function () {
        // Create multiple suites with identical structure
        const suites = [];

        for (let i = 0; i < 3; i++) {
            const suite = createSuite();
            useSuite(suite, function () {
                selfDescribe("Outer Suite", function () {
                    selfIt("outer test", function () {});

                    selfDescribe("Inner Suite", function () {
                        selfIt("inner test", function () {});
                    });
                });
            });
            suites.push(suite);
        }

        // All should have identical IDs
        for (let i = 1; i < suites.length; i++) {
            assert.equal(
                suites[0].suites[0].id,
                suites[i].suites[0].id,
                "Outer suite IDs should match across runs"
            );
            assert.equal(
                suites[0].suites[0].tests[0].id,
                suites[i].suites[0].tests[0].id,
                "Outer test IDs should match across runs"
            );
            assert.equal(
                suites[0].suites[0].suites[0].id,
                suites[i].suites[0].suites[0].id,
                "Inner suite IDs should match across runs"
            );
            assert.equal(
                suites[0].suites[0].suites[0].tests[0].id,
                suites[i].suites[0].suites[0].tests[0].id,
                "Inner test IDs should match across runs"
            );
        }
    });

    it("should handle special characters in suite and test names", function () {
        const suite = createSuite();

        useSuite(suite, function () {
            selfDescribe("Suite with spaces and-dashes", function () {
                selfIt("test with special chars: @#$%", function () {});
            });
        });

        const suiteId = suite.suites[0].id;
        const testId = suite.suites[0].tests[0].id;

        assert.ok(suiteId, "Suite with special chars should have an ID");
        assert.ok(testId, "Test with special chars should have an ID");
        assert.match(suiteId, /^[0-9a-f]+$/, "Suite ID should be hex");
        assert.match(testId, /^[0-9a-f]+$/, "Test ID should be hex");
    });

    it("should handle deeply nested suite structures", function () {
        const suite = createSuite();

        useSuite(suite, function () {
            selfDescribe("Level 1", function () {
                selfDescribe("Level 2", function () {
                    selfDescribe("Level 3", function () {
                        selfDescribe("Level 4", function () {
                            selfDescribe("Level 5", function () {
                                selfIt("deep test", function () {});
                            });
                        });
                    });
                });
            });
        });

        // Navigate to the deepest test
        let currentSuite = suite.suites[0];
        for (let i = 0; i < 4; i++) {
            currentSuite = currentSuite.suites[0];
        }

        const deepTestId = currentSuite.tests[0].id;
        assert.ok(deepTestId, "Deeply nested test should have an ID");
        assert.match(deepTestId, /^[0-9a-f]+$/, "Deep test ID should be hex");
    });

    it("should generate unique IDs for many tests in one suite", function () {
        const suite = createSuite();

        useSuite(suite, function () {
            selfDescribe("Suite with many tests", function () {
                for (let i = 0; i < 100; i++) {
                    selfIt(`test ${i}`, function () {});
                }
            });
        });

        const ids = new Set();
        suite.suites[0].tests.forEach(function (test) {
            ids.add(test.id);
        });

        assert.equal(ids.size, 100, "All 100 tests should have unique IDs");
    });

    it("should generate unique IDs for many suites", function () {
        const suite = createSuite();

        useSuite(suite, function () {
            for (let i = 0; i < 100; i++) {
                selfDescribe(`suite ${i}`, function () {
                    selfIt("test", function () {});
                });
            }
        });

        const ids = new Set();
        suite.suites.forEach(function (s) {
            ids.add(s.id);
        });

        assert.equal(ids.size, 100, "All 100 suites should have unique IDs");
    });

    it("should handle root suite ID", function () {
        const suite = createSuite();

        assert.ok(suite.id, "Root suite should have an ID");
        assert.match(suite.id, /^[0-9a-f]+$/, "Root suite ID should be hex");
    });

    it("should handle unicode in suite and test names", function () {
        const suite = createSuite();

        useSuite(suite, function () {
            selfDescribe("测试套件", function () {
                selfIt("тест", function () {});
                selfIt("🎉 celebration test", function () {});
            });
        });

        assert.ok(suite.suites[0].id, "Unicode suite should have ID");
        assert.ok(suite.suites[0].tests[0].id, "Unicode test should have ID");
        assert.ok(suite.suites[0].tests[1].id, "Emoji test should have ID");
    });

    it("should maintain ID consistency when tests are added in different order", function () {
        const suite1 = createSuite();
        const suite2 = createSuite();

        useSuite(suite1, function () {
            selfDescribe("Suite", function () {
                selfIt("test A", function () {});
                selfIt("test B", function () {});
            });
        });

        useSuite(suite2, function () {
            selfDescribe("Suite", function () {
                selfIt("test A", function () {});
                selfIt("test B", function () {});
            });
        });

        // IDs should match when tests are in same order
        assert.equal(suite1.suites[0].tests[0].id, suite2.suites[0].tests[0].id);
        assert.equal(suite1.suites[0].tests[1].id, suite2.suites[0].tests[1].id);
    });

    it("should handle empty string descriptions", function () {
        const suite = createSuite();

        useSuite(suite, function () {
            selfDescribe("", function () {
                selfIt("", function () {});
            });
        });

        assert.ok(suite.suites[0].id, "Empty suite name should have ID");
        assert.ok(suite.suites[0].tests[0].id, "Empty test name should have ID");
    });

    it("should differentiate between similar test names", function () {
        const suite = createSuite();

        useSuite(suite, function () {
            selfDescribe("Suite", function () {
                selfIt("test", function () {});
                selfIt("test ", function () {});
                selfIt(" test", function () {});
                selfIt("test1", function () {});
                selfIt("testa", function () {});
            });
        });

        const ids = new Set();
        suite.suites[0].tests.forEach(function (test) {
            ids.add(test.id);
        });

        assert.equal(ids.size, 5, "Similar test names should have unique IDs");
    });

    it("should work with .only and .skip tests", function () {
        const suite1 = createSuite();
        const suite2 = createSuite();

        useSuite(suite1, function () {
            selfDescribe("Suite", function () {
                selfIt.only("test 1", function () {});
                selfIt.skip("test 2", function () {});
            });
        });

        useSuite(suite2, function () {
            selfDescribe("Suite", function () {
                selfIt("test 1", function () {});
                selfIt("test 2", function () {});
            });
        });

        // IDs should be the same regardless of .only or .skip
        assert.equal(suite1.suites[0].tests[0].id, suite2.suites[0].tests[0].id);
        assert.equal(suite1.suites[0].tests[1].id, suite2.suites[0].tests[1].id);
    });

    it("should handle complex real-world test structure", function () {
        const suite = createSuite();

        useSuite(suite, function () {
            selfDescribe("Calculator", function () {
                selfDescribe("Addition", function () {
                    selfIt("should add two positive numbers", function () {});
                    selfIt("should add negative numbers", function () {});
                    selfIt("should add decimals", function () {});
                });

                selfDescribe("Subtraction", function () {
                    selfIt("should subtract two numbers", function () {});
                    selfIt("should handle negative results", function () {});
                });

                selfDescribe("Multiplication", function () {
                    selfIt("should multiply two numbers", function () {});
                    selfIt("should handle zero", function () {});
                });
            });
        });

        // Collect all IDs
        const ids = new Set();

        function collectIds(s: any): void {
            ids.add(s.id);
            s.tests.forEach(function (t: any) {
                ids.add(t.id);
            });
            s.suites.forEach(collectIds);
        }

        collectIds(suite);

        // Should have: root + 1 parent suite + 3 child suites + 7 tests = 12 unique IDs
        assert.equal(ids.size, 12, "All suites and tests should have unique IDs");
    });

    it("should handle parallel suite creation", function () {
        const suites = [];

        // Create multiple suites with same structure "in parallel"
        for (let i = 0; i < 10; i++) {
            const suite = createSuite();
            useSuite(suite, function () {
                selfDescribe("Parallel Suite", function () {
                    selfIt("parallel test", function () {});
                });
            });
            suites.push(suite);
        }

        // All should have the same IDs
        const firstSuiteId = suites[0].suites[0].id;
        const firstTestId = suites[0].suites[0].tests[0].id;

        suites.forEach(function (suite, index) {
            assert.equal(suite.suites[0].id, firstSuiteId, `Suite ${index} should have same ID`);
            assert.equal(suite.suites[0].tests[0].id, firstTestId, `Test ${index} should have same ID`);
        });
    });

    it("should give same-named siblings declared in separate useSuite() calls against one root distinct IDs", function () {
        // Two files (or two library callers) each contributing a describe("A") to the same root.
        // Before IDs were derived from the tree, every useSuite() call restarted the occurrence
        // count from zero, so both suites hashed to the same ID -- and the runner, which keys its
        // per-suite hook-chain cache by ID, ran the first suite's beforeEach for the second suite.
        const root = createSuite();

        useSuite(root, function () {
            selfDescribe("A", function () {
                selfIt("t", function () {});
            });
        });

        useSuite(root, function () {
            selfDescribe("A", function () {
                selfIt("t", function () {});
            });
        });

        assert.equal(root.suites.length, 2);
        assert.notEqual(root.suites[0].id, root.suites[1].id, "Same-named sibling suites must not share an ID");
        assert.notEqual(root.suites[0].tests[0].id, root.suites[1].tests[0].id, "Their same-named tests must not share an ID either");
    });

    it("should number same-named siblings identically whether declared in one useSuite() call or several", function () {
        const together = createSuite();
        const split = createSuite();

        useSuite(together, function () {
            selfDescribe("A", function () {
                selfIt("t", function () {});
            });
            selfDescribe("A", function () {
                selfIt("t", function () {});
            });
            selfDescribe("A", function () {
                selfIt("t", function () {});
            });
        });

        for (let i = 0; i < 3; i++) {
            useSuite(split, function () {
                selfDescribe("A", function () {
                    selfIt("t", function () {});
                });
            });
        }

        for (let i = 0; i < 3; i++) {
            assert.equal(split.suites[i].id, together.suites[i].id, `Suite ${i} must have the same ID regardless of how it was declared`);
            assert.equal(split.suites[i].tests[0].id, together.suites[i].tests[0].id, `Test under suite ${i} must have the same ID regardless of how it was declared`);
        }
    });

    it("should give a suite and a test with the same description under one parent distinct IDs", function () {
        const root = createSuite();

        useSuite(root, function () {
            selfDescribe("same", function () {});
            selfIt("same", function () {});
        });

        assert.notEqual(root.suites[0].id, root.tests[0].id, "Suites and tests share one ID namespace under a parent");
    });

    it("should not let declarations against one tree change the IDs produced for another", function () {
        const reference = createSuite();
        useSuite(reference, function () {
            selfDescribe("A", function () {
                selfIt("t", function () {});
            });
        });

        // Interleave: declare noise against an unrelated tree between the two halves of another.
        const target = createSuite();
        const noise = createSuite();

        useSuite(target, function () {
            selfDescribe("A", function () {
                selfIt("t", function () {});
            });
        });
        useSuite(noise, function () {
            selfDescribe("A", function () {
                selfIt("t", function () {});
            });
            selfDescribe("A", function () {
                selfIt("t", function () {});
            });
        });
        useSuite(target, function () {
            selfDescribe("A", function () {
                selfIt("t", function () {});
            });
        });

        assert.equal(target.suites[0].id, reference.suites[0].id, "The first A must match the reference tree");
        assert.notEqual(target.suites[1].id, target.suites[0].id, "The second A must be its own occurrence");
        assert.equal(noise.suites[0].id, reference.suites[0].id, "The noise tree's first A must match too");
        assert.equal(noise.suites[1].id, target.suites[1].id, "Second occurrences must agree across trees");
    });

    it("should give every createSuite() root the same ID", function () {
        const roots = [createSuite(), createSuite(), createSuite()];

        assert.equal(roots[1].id, roots[0].id);
        assert.equal(roots[2].id, roots[0].id);
    });
});
