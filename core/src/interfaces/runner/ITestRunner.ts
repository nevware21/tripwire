/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2025-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IPromise } from "@nevware21/ts-async";
import { IListener } from "../../interfaces/IListener";
import { IRemovable } from "../../interfaces/IRemovable";
import { ITestFilter } from "../../suite/interfaces/ITestFilter";
import { ITestSummary } from "./ITestSummary";
import { ITestSuite } from "../../suite/interfaces/ITestSuite";
import { ITestCase } from "../suite/ITestCase";
import { ITestResult } from "./ITestResult";
import { ISuiteResult } from "./ISuiteResult";
import { IRunnerMetrics } from "./IRunnerMetrics";

/**
 * Test runner interface for executing test suites
 * @since 0.2.0
 */
export interface ITestRunner {
    /**
     * Add a filter to determine which suites and/or tests should be run
     * @param filter - The filter to add
     * @returns An object with a remove() method to remove the filter
     */
    addFilter(filter: ITestFilter): IRemovable;

    /**
     * Run all tests in the suite
     */
    run(): IPromise<void>;

    /**
     * Get test results summary
     */
    getResults(): ITestSummary;

    /**
     * Get the root test suite
     */
    getRootSuite(): ITestSuite;

    /**
     * Add a listener to receive test execution notifications
     * @param listener - The listener to add
     */
    addListener(listener: IListener): void;

    /**
     * Remove a listener
     * @param listener - The listener to remove
     */
    removeListener(listener: IListener): void;

    /**
     * Add a reporter to receive test execution notifications (legacy alias for addListener)
     * @param reporter - The reporter to add
     * @deprecated Use addListener instead
     */
    addReporter(reporter: IListener): void;

    /**
     * Remove a reporter (legacy alias for removeListener)
     * @param reporter - The reporter to remove
     * @deprecated Use removeListener instead
     */
    removeReporter(reporter: IListener): void;

    /**
     * Get the execution result for a specific test
     * @param test - The test case to get the result for
     * @returns The test result if the test has been executed, undefined otherwise
     */
    getTestResult(test: ITestCase): ITestResult | undefined;

    /**
     * Get the execution result for a specific suite
     * @param suite - The test suite to get the result for
     * @returns The suite result if the suite has been executed, undefined otherwise
     */
    getSuiteResult(suite: ITestSuite): ISuiteResult | undefined;

    /**
     * Get execution monitoring metrics for the current/last run.
     *
     * The full metrics (execution trace, per-execution samples, per-test wait ratios, timeout hotspots and
     * retry diagnostics) are only collected when the runner was created with the `metrics` option enabled
     * (see {@link ITestRunnerOptions.metrics}). When it was not, the returned object still carries the
     * basic counters and timing totals, the collection based values are empty and `message` explains that
     * the full metrics were not captured.
     */
    getMetrics(): IRunnerMetrics;
}
