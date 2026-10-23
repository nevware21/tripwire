/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { ITestCase } from "../../interfaces/suite/ITestCase";
import { ITestFilter } from "../interfaces/ITestFilter";
import { ITestSuite } from "../interfaces/ITestSuite";

/**
 * Filter that only runs specific test suite instances.
 * All tests within matching suite instances will run.
 * Uses reference equality to match suite instances.
 * @param suites - Array of suite instances to include
 * @returns Filter that matches suite instances and includes all their tests
 * @since 0.2.0
 */
export function createSuiteInstanceFilter(suites: ITestSuite[]): ITestFilter {
    // Helper to check if a suite instance is in the list
    function suiteMatches(suite: ITestSuite): boolean {
        for (let i = 0; i < suites.length; i++) {
            if (suites[i] === suite) {
                return true;
            }
        }
        return false;
    }

    // Helper to check if suite has any matching descendant suites
    function hasMatchingDescendant(suite: ITestSuite): boolean {
        for (let i = 0; i < suite.suites.length; i++) {
            if (suiteMatches(suite.suites[i]) || hasMatchingDescendant(suite.suites[i])) {
                return true;
            }
        }
        return false;
    }

    return {
        canRunSuite(suite: ITestSuite): boolean {
            // If this suite instance matches, run it
            if (suiteMatches(suite)) {
                return true;
            }

            // If any ancestor matches, run it
            let current: ITestSuite | undefined = suite.parent;
            while (current) {
                if (suiteMatches(current)) {
                    return true;
                }
                current = current.parent;
            }

            // If any descendants match, run it
            if (hasMatchingDescendant(suite)) {
                return true;
            }

            return false;
        }
        // No canRunTest - all tests in matching suites will run
    };
}

/**
 * Filter that only runs specific test case instances.
 * Only the specific test instances will run.
 * Uses reference equality to match test instances.
 * @param tests - Array of test instances to include
 * @returns Filter that matches test instances and includes parent suites
 * @since 0.2.0
 */
export function createTestInstanceFilter(tests: ITestCase[]): ITestFilter {
    // Helper to check if a test instance is in the list
    function testMatches(test: ITestCase): boolean {
        for (let i = 0; i < tests.length; i++) {
            if (tests[i] === test) {
                return true;
            }
        }
        return false;
    }

    // Helper to check if suite has any matching descendant test instances
    function hasMatchingTestDescendant(suite: ITestSuite): boolean {
        for (let i = 0; i < suite.tests.length; i++) {
            if (testMatches(suite.tests[i])) {
                return true;
            }
        }

        for (let i = 0; i < suite.suites.length; i++) {
            if (hasMatchingTestDescendant(suite.suites[i])) {
                return true;
            }
        }

        return false;
    }

    return {
        canRunSuite(suite: ITestSuite): boolean {
            // Run suite if it has any descendant test instances that match
            return hasMatchingTestDescendant(suite);
        },

        canRunTest(test: ITestCase): boolean {
            // Run test only if the instance matches
            return testMatches(test);
        }
    };
}
