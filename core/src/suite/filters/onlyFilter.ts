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
 * Filter that only runs test suites and tests marked with only=true.
 * If any suite or test in the tree is marked as only, all other suites/tests are filtered out.
 * Dynamically checks for only-marked items without pre-building maps.
 * @since 0.2.0
 */
export function createOnlyFilter(rootSuite: ITestSuite): ITestFilter | null {

    // Helper to check if the suite or any of its descendants are marked as only
    function _hasAnyOnlyChildren(suite: ITestSuite): boolean {
        let result = suite.only;

        let lp = 0;
        while(!result && lp < suite.tests.length) {
            result = suite.tests[lp++].only;
        }

        lp = 0;
        while (!result && lp < suite.suites.length) {
            result = _hasAnyOnlyChildren(suite.suites[lp++]);
        }

        return result;
    }

    // Helper to check if the suite is a child of any only-marked suite
    function _isChildOfOnlySuite(suite: ITestSuite): boolean {
        let current: ITestSuite | undefined = suite;
        let result = false;

        while (current && !result) {
            result = current.only;
            current = current.parent;
        }

        return result;
    }

    // Check if there are any only-marked items at all
    if (!_hasAnyOnlyChildren(rootSuite)) {
        return null;
    }

    return {
        canRunSuite(suite: ITestSuite): boolean {
            /*
             * Root suite always runs
             * If this suite or any ancestor is marked as only, run it
             * If any descendant is marked as only, run it
             */
            return (!suite.parent || _isChildOfOnlySuite(suite) || _hasAnyOnlyChildren(suite));
        },

        canRunTest(test: ITestCase, parent?: ITestSuite): boolean {
            /*
             * If test is marked as only, run it
             * Check if test is in a suite (or nested suite) marked as only
             */
            return test.only || _isChildOfOnlySuite(parent);
        }
    };
}
