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
 * Filter that only runs test suites matching specified IDs.
 * All tests within matching suites will run.
 * Dynamically searches without pre-building maps.
 * @param ids - Array of suite IDs to include
 * @returns Filter that matches suites by ID and includes all their tests
 * @since 0.2.0
 */
export function createSuiteIDFilter(ids: string[]): ITestFilter {
    // Helper to check if an ID is in the list
    function idMatches(id: string | undefined): boolean {
        if (!id) {
            return false;
        }

        for (let i = 0; i < ids.length; i++) {
            if (ids[i] === id) {
                return true;
            }
        }
        return false;
    }

    // Helper to check if suite has any matching descendants
    function hasMatchingDescendant(suite: ITestSuite): boolean {
        for (let i = 0; i < suite.suites.length; i++) {
            if (idMatches(suite.suites[i].id) || hasMatchingDescendant(suite.suites[i])) {
                return true;
            }
        }
        return false;
    }

    return {
        canRunSuite(suite: ITestSuite): boolean {
            // If this suite's ID matches, run it
            if (idMatches(suite.id)) {
                return true;
            }

            // If any ancestor ID matches, run it
            let current: ITestSuite | undefined = suite.parent;
            while (current) {
                if (idMatches(current.id)) {
                    return true;
                }
                current = current.parent;
            }

            // If any descendants have matching IDs, run it
            if (hasMatchingDescendant(suite)) {
                return true;
            }

            return false;
        }
        // No canRunTest - all tests in matching suites will run
    };
}

/**
 * Filter that only runs test cases matching specified IDs.
 * Only the specific tests with matching IDs will run.
 * Dynamically searches without pre-building maps.
 * @param ids - Array of test IDs to include
 * @returns Filter that matches tests by ID and includes parent suites
 * @since 0.2.0
 */
export function createTestIDFilter(ids: string[]): ITestFilter {
    // Helper to check if an ID is in the list
    function idMatches(id: string | undefined): boolean {
        if (!id) {
            return false;
        }
        for (let i = 0; i < ids.length; i++) {
            if (ids[i] === id) {
                return true;
            }
        }
        return false;
    }

    // Helper to check if suite has any matching descendant tests
    function hasMatchingTestDescendant(suite: ITestSuite): boolean {
        for (let i = 0; i < suite.tests.length; i++) {
            if (idMatches(suite.tests[i].id)) {
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
            // Run suite if it has any descendant tests with matching IDs
            return hasMatchingTestDescendant(suite);
        },

        canRunTest(test: ITestCase): boolean {
            // Run test only if its ID matches
            return idMatches(test.id);
        }
    };
}
