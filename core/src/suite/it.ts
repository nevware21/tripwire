/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { _getCurrentSuite } from "./suite";
import { _childOccurrence, _generateId } from "./idGenerator";
import { ITestSuite } from "./interfaces/ITestSuite";
import { TestFn } from "../types/TestFn";
import { ITestCase } from "../interfaces/suite/ITestCase";
import { ITestDefinitionFn } from "../interfaces/suite/ITestDefinitionFn";

/**
 * Create a new test case
 * @internal
 */
function _createTest(suite: ITestSuite, description: string, fn?: TestFn): ITestCase {
    let testCase: ITestCase = {
        // The occurrence must be counted before the caller pushes this test into the suite.
        id: _generateId(description, suite.id, _childOccurrence(suite, description)),
        description: description,
        fn: fn,
        only: false,
        skip: false,
        timeout: suite.timeout,
        slow: suite.slow,
        retries: suite.retries
    };

    return testCase;
}

/**
 * Define a test case (Mocha/Jasmine style)
 * @internal
 */
function _itFn(description: string, testFunction?: TestFn): void {
    const suite = _getCurrentSuite();
    const test = _createTest(suite, description, testFunction);
    suite.tests.push(test);
}

/**
 * Define a test case that should be the only one to run
 */
_itFn.only = function (description: string, testFunction?: TestFn): void {
    const suite = _getCurrentSuite();
    const test = _createTest(suite, description, testFunction);
    test.only = true;
    suite.tests.push(test);
};

/**
 * Skip a test case
 */
_itFn.skip = function (description: string, testFunction?: TestFn): void {
    const suite = _getCurrentSuite();
    const test = _createTest(suite, description, testFunction);
    test.skip = true;
    suite.tests.push(test);
};

/**
 * Mocha/Jasmine style it
 * @since 0.2.0
 */
export const it: ITestDefinitionFn = _itFn as ITestDefinitionFn;

/**
 * Mocha/Jasmine style spec (alias for it)
 * @since 0.2.0
 */
export const spec: ITestDefinitionFn = _itFn as ITestDefinitionFn;

/**
 * Mocha TDD style test (alias for it)
 * @since 0.2.0
 */
export const test: ITestDefinitionFn = _itFn as ITestDefinitionFn;

/**
 * Jasmine style xit (alias for it.skip)
 * @since 0.2.0
 */
export const xit: ITestDefinitionFn = _itFn.skip as ITestDefinitionFn;

/**
 * Jasmine style fit (alias for it.only)
 * @since 0.2.0
 */
export const fit: ITestDefinitionFn = _itFn.only as ITestDefinitionFn;
