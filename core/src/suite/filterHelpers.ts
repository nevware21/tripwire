/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { ITestCase } from "../interfaces/suite/ITestCase";
import { ITestFilter } from "./interfaces/ITestFilter";
import { ITestSuite } from "./interfaces/ITestSuite";

/**
 * Result of applying a filter to find matching suites and tests
 * @since 0.2.0
 */
export interface IFilterMatchResult {
    /**
     * Array of suites that match the filter criteria
     */
    suites: ITestSuite[];

    /**
     * Array of test cases that match the filter criteria
     */
    tests: ITestCase[];
}

/**
 * Applies a filter to a root suite and returns all matching suites and tests.
 * This walks through the entire suite tree and collects suites/tests that pass the filter.
 *
 * @param rootSuite - The root suite to search through
 * @param filter - The filter to apply for determining matches
 * @returns Object containing arrays of matched suites and tests
 * @since 0.2.0
 *
 * @example
 * ```typescript
 * const suite = createSuite();
 * // ... add tests and suites ...
 *
 * const filter = createTestIDFilter(["test-1", "test-2"]);
 * const result = findMatchingTestsAndSuites(suite, filter);
 *
 * console.log(`Found ${result.tests.length} matching tests`);
 * console.log(`Found ${result.suites.length} matching suites`);
 * ```
 */
export function findMatchingTestsAndSuites(rootSuite: ITestSuite, filter: ITestFilter): IFilterMatchResult {
    const matchedSuites: ITestSuite[] = [];
    const matchedTests: ITestCase[] = [];

    function processSuite(suite: ITestSuite): void {
        // Check if this suite matches the filter
        let suiteMatches = true;
        if (filter.canRunSuite) {
            suiteMatches = filter.canRunSuite(suite);
        }

        if (suiteMatches) {
            // Only add non-root suites to the result
            if (suite !== rootSuite) {
                matchedSuites.push(suite);
            }

            // Check all tests in this suite
            for (let i = 0; i < suite.tests.length; i++) {
                const test = suite.tests[i];
                let testMatches = true;

                if (filter.canRunTest) {
                    testMatches = filter.canRunTest(test, suite);
                }

                if (testMatches) {
                    matchedTests.push(test);
                }
            }
        }

        // Process child suites recursively
        for (let i = 0; i < suite.suites.length; i++) {
            processSuite(suite.suites[i]);
        }
    }

    processSuite(rootSuite);

    return {
        suites: matchedSuites,
        tests: matchedTests
    };
}

/**
 * Finds all suites that match the given filter criteria.
 * This is a convenience method that only returns matching suites.
 *
 * @param rootSuite - The root suite to search through
 * @param filter - The filter to apply for determining matches
 * @returns Array of matched suites
 * @since 0.2.0
 *
 * @example
 * ```typescript
 * const filter = createSuiteIDFilter(["suite-1", "suite-2"]);
 * const suites = findMatchingSuites(rootSuite, filter);
 * ```
 */
export function findMatchingSuites(rootSuite: ITestSuite, filter: ITestFilter): ITestSuite[] {
    return findMatchingTestsAndSuites(rootSuite, filter).suites;
}

/**
 * Finds all test cases that match the given filter criteria.
 * This is a convenience method that only returns matching tests.
 *
 * @param rootSuite - The root suite to search through
 * @param filter - The filter to apply for determining matches
 * @returns Array of matched test cases
 * @since 0.2.0
 *
 * @example
 * ```typescript
 * const filter = createTestIDFilter(["test-1", "test-2"]);
 * const tests = findMatchingTests(rootSuite, filter);
 * ```
 */
export function findMatchingTests(rootSuite: ITestSuite, filter: ITestFilter): ITestCase[] {
    return findMatchingTestsAndSuites(rootSuite, filter).tests;
}
