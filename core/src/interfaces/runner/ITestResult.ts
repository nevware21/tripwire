/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { ITestCase } from "../../interfaces/suite/ITestCase";
import { TestStatus } from "../../suite/interfaces/ITestStatus";

/**
 * Execution result for a test case
 * @since 0.2.0
 */
export interface ITestResult {
    /**
     * Reference to the test definition
     */
    test: ITestCase;

    /**
     * Test execution status
     */
    status: TestStatus;

    /**
     * Error if test failed
     */
    error?: Error;

    /**
     * Deferred assertion errors collected when listeners return Continue action for failed assertions.
     * Allows tests to continue executing and collect all assertion failures instead of stopping at the first one.
     */
    deferredErrors?: Error[];

    /**
     * Whether the test execution was aborted by a listener
     * @internal
     */
    aborted?: boolean;

    /**
     * Reason for test abortion if aborted by a listener
     */
    reason?: any;

    /**
     * Timestamp when test execution started (milliseconds since epoch)
     */
    startTime?: number;

    /**
     * Timestamp when test execution completed (milliseconds since epoch)
     */
    endTime?: number;

    /**
     * Test execution duration in milliseconds
     */
    duration?: number;

    /**
     * Number of retries performed for this test
     */
    retries?: number;
}
