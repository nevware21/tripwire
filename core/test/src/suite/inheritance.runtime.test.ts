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

describe("Suite/Test Runtime Inheritance", () => {
    it("inherits updated parent timeout when child overrides are undefined", async function() {
        this.timeout(10000);
        const isolatedSuite = createSuite();
        let inheritedTimeout = 0;

        useSuite(isolatedSuite, function() {
            selfDescribe("parent", function() {
                selfIt("updates parent timeout during execution", function() {
                    isolatedSuite.suites[0].timeout = 4500;
                });

                selfDescribe("child", function() {
                    selfIt("inherits timeout", function() {
                        inheritedTimeout = this.timeout();
                    });
                });
            });
        });

        const parentSuite = isolatedSuite.suites[0];
        const childSuite = parentSuite.suites[0];
        const childTest = childSuite.tests[0];

        childSuite.timeout = undefined;
        childTest.timeout = undefined;

        const runner = createTestRunner(isolatedSuite);
        await runner.run();
        const results = runner.getResults();
        assert.equal(results.passed, 2);
        assert.equal(inheritedTimeout, 4500, "Child test should inherit updated parent timeout");
    });

    it("inherits updated parent slow when child overrides are undefined", async function() {
        this.timeout(10000);
        const isolatedSuite = createSuite();
        let inheritedSlow = 0;

        useSuite(isolatedSuite, function() {
            selfDescribe("parent", function() {
                selfIt("updates parent slow during execution", function() {
                    isolatedSuite.suites[0].slow = 333;
                });

                selfDescribe("child", function() {
                    selfIt("inherits slow", function() {
                        inheritedSlow = this.slow();
                    });
                });
            });
        });

        const parentSuite = isolatedSuite.suites[0];
        const childSuite = parentSuite.suites[0];
        const childTest = childSuite.tests[0];

        childSuite.slow = undefined;
        childTest.slow = undefined;

        const runner = createTestRunner(isolatedSuite);
        await runner.run();
        const results = runner.getResults();
        assert.equal(results.passed, 2);
        assert.equal(inheritedSlow, 333, "Child test should inherit updated parent slow");
    });

    it("inherits updated parent retries when child overrides are undefined", async function() {
        this.timeout(10000);
        const isolatedSuite = createSuite();
        let childAttempts = 0;

        useSuite(isolatedSuite, function() {
            selfDescribe("parent", function() {
                selfIt("updates parent retries during execution", function() {
                    isolatedSuite.suites[0].retries = 1;
                });

                selfDescribe("child", function() {
                    selfIt("inherits retries", function() {
                        childAttempts++;
                        if (childAttempts === 1) {
                            throw new Error("fail first attempt");
                        }
                    });
                });
            });
        });

        const parentSuite = isolatedSuite.suites[0];
        const childSuite = parentSuite.suites[0];
        const childTest = childSuite.tests[0];

        childSuite.retries = undefined;
        childTest.retries = undefined;

        const runner = createTestRunner(isolatedSuite);
        await runner.run();
        const results = runner.getResults();
        assert.equal(results.passed, 2);
        assert.equal(results.failed, 0);
        assert.equal(childAttempts, 2, "Child test should retry once via inherited parent retries");
    });
});
