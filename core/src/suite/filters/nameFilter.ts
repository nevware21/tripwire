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
 * Filter that only runs test suites matching specified names (descriptions).
 * All tests within matching suites will run.
 * Matching is case-insensitive substring match by default.
 * Dynamically searches without pre-building maps.
 * @param names - Array of suite names (descriptions) to include
 * @param exactMatch - If true, requires exact match; if false (default), uses substring match
 * @returns Filter that matches suites by name and includes all their tests
 * @since 0.2.0
 */
export function createSuiteNameFilter(names: string[], exactMatch: boolean = false): ITestFilter {
    function nameMatches(description: string | undefined): boolean {
        if (!description) {
            return false;
        }

        const desc = exactMatch ? description : description.toLowerCase();

        for (let i = 0; i < names.length; i++) {
            const name = exactMatch ? names[i] : names[i].toLowerCase();
            if (exactMatch) {
                if (desc === name) {
                    return true;
                }
            } else {
                if (desc.indexOf(name) !== -1) {
                    return true;
                }
            }
        }

        return false;
    }

    // Helper to check if suite has any matching descendant suites
    function hasMatchingSuiteDescendant(suite: ITestSuite): boolean {
        for (let i = 0; i < suite.suites.length; i++) {
            if (nameMatches(suite.suites[i].description) || hasMatchingSuiteDescendant(suite.suites[i])) {
                return true;
            }
        }
        return false;
    }

    return {
        canRunSuite(suite: ITestSuite): boolean {
            // If this suite's description matches, run it
            if (nameMatches(suite.description)) {
                return true;
            }

            // If any ancestor description matches, run it
            let current: ITestSuite | undefined = suite.parent;
            while (current) {
                if (nameMatches(current.description)) {
                    return true;
                }
                current = current.parent;
            }

            // If any descendant suites have matching names, run it
            if (hasMatchingSuiteDescendant(suite)) {
                return true;
            }

            return false;
        }
        // No canRunTest - all tests in matching suites will run
    };
}

/**
 * Filter that only runs test cases matching specified names (descriptions).
 * Only the specific tests with matching names will run.
 * Matching is case-insensitive substring match by default.
 * Dynamically searches without pre-building maps.
 * @param names - Array of test names (descriptions) to include
 * @param exactMatch - If true, requires exact match; if false (default), uses substring match
 * @returns Filter that matches tests by name and includes parent suites
 * @since 0.2.0
 */
export function createTestNameFilter(names: string[], exactMatch: boolean = false): ITestFilter {
    function nameMatches(description: string | undefined): boolean {
        if (!description) {
            return false;
        }

        const desc = exactMatch ? description : description.toLowerCase();

        for (let i = 0; i < names.length; i++) {
            const name = exactMatch ? names[i] : names[i].toLowerCase();
            if (exactMatch) {
                if (desc === name) {
                    return true;
                }
            } else {
                if (desc.indexOf(name) !== -1) {
                    return true;
                }
            }
        }

        return false;
    }

    // Helper to check if suite has any matching descendant tests
    function hasMatchingTestDescendant(suite: ITestSuite): boolean {
        for (let i = 0; i < suite.tests.length; i++) {
            if (nameMatches(suite.tests[i].description)) {
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
            // Run suite if it has any descendant tests with matching names
            return hasMatchingTestDescendant(suite);
        },

        canRunTest(test: ITestCase): boolean {
            // Run test only if its description matches
            return nameMatches(test.description);
        }
    };
}
