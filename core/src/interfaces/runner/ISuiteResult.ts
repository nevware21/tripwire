/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { ITestResult } from "../../interfaces/runner/ITestResult";
import { ITestSuite } from "../../suite/interfaces/ITestSuite";

/**
 * Execution result for a test suite
 * @since 0.2.0
 */
export interface ISuiteResult {
    /**
     * Reference to the suite definition
     */
    suite: ITestSuite;

    /**
     * Test execution results for tests in this suite
     */
    testResults: ITestResult[];

    /**
     * Child suite execution results
     */
    suiteResults: ISuiteResult[];

    /**
     * Whether the suite was skipped due to filters or parent suite being skipped
     */
    skipped?: boolean;

    /**
     * Whether the suite execution was aborted by a listener
     * @internal
     */
    aborted?: boolean;

    /**
     * Whether the suite execution timed out
     */
    timedOut?: boolean;

    /**
     * Reason for suite abortion if aborted by a listener
     */
    reason?: any;

    /**
     * Timestamp when suite execution started (milliseconds since epoch)
     */
    startTime?: number;

    /**
     * Timestamp when suite execution completed (milliseconds since epoch)
     */
    endTime?: number;

    /**
     * Suite execution duration in milliseconds
     */
    duration?: number;
}
