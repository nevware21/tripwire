/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2025-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

/**
 * Example test suite demonstrating the suite API
 * This example shows how to use Mocha and Jasmine compatible test suite functions
 */

import {
    assert, after, afterAll, afterEach, before, beforeAll, beforeEach, it,
    describe, getRootSuite, resetSuite, createTestRunner
} from "@nevware21/tripwire";

// Reset suite state before defining tests
resetSuite();

// Example using Mocha/Jasmine style describe/it
describe("Example Test Suite", () => {
    let counter = 0;

    // Runs once before all tests in this suite
    before(() => {
        console.log("Running before hook");
        counter = 0;
    });

    // Runs once after all tests in this suite
    after(() => {
        console.log("Running after hook");
    });

    // Runs before each test in this suite
    beforeEach(() => {
        counter++;
    });

    // Runs after each test in this suite
    afterEach(() => {
        console.log(`Test ${counter} completed`);
    });

    it("should pass a simple test", () => {
        assert.equal(1 + 1, 2);
    });

    it("should handle async tests with promises", async () => {
        const result = await Promise.resolve(42);
        assert.equal(result, 42);
    });

    it("should handle async tests with done callback", (done) => {
        setTimeout(() => {
            assert.equal(counter, 3);
            done();
        }, 10);
    });

    // Nested describe blocks
    describe("Nested Suite", () => {
        it("should work in nested suites", () => {
            assert.isTrue(counter > 0);
        });

        it.skip("should skip this test", () => {
            assert.fail("This should not run");
        });
    });

    describe.skip("Skipped Suite", () => {
        it("should not run", () => {
            assert.fail("This should not run");
        });
    });
});

// Alternative Jasmine style
describe("Jasmine Style Suite", () => {
    beforeAll(() => {
        console.log("Jasmine beforeAll hook");
    });

    afterAll(() => {
        console.log("Jasmine afterAll hook");
    });

    it("should use Jasmine aliases", () => {
        assert.isTrue(true);
    });
});

// Run the tests
async function runTests() {
    const runner = createTestRunner(getRootSuite());

    console.log("Running tests...");
    await runner.run();

    const results = runner.getResults();
    console.log("\nTest Results:");
    console.log(`Total: ${results.total}`);
    console.log(`Passed: ${results.passed}`);
    console.log(`Failed: ${results.failed}`);
    console.log(`Skipped: ${results.skipped}`);
    console.log(`Pending: ${results.pending}`);

    // Display failed tests
    const rootSuite = runner.getRootSuite();
    const displayResults = (suite: any, indent = "") => {
        for (const test of suite.tests) {
            if (test.status === "failed") {
                console.log(`${indent}✗ ${test.description}`);
                console.log(`${indent}  Error: ${test.error.message}`);
            } else if (test.status === "passed") {
                console.log(`${indent}✓ ${test.description}`);
            } else if (test.status === "skipped") {
                console.log(`${indent}- ${test.description} (skipped)`);
            }
        }

        for (const childSuite of suite.suites) {
            console.log(`${indent}${childSuite.description}`);
            displayResults(childSuite, indent + "  ");
        }
    };

    console.log("\nDetailed Results:");
    displayResults(rootSuite);
}

// Uncomment to run when this file is executed directly
// runTests().catch(console.error);
