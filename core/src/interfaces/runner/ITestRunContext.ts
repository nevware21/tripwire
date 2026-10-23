/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IRunnerMetrics } from "./IRunnerMetrics";
import { IConfigHost, ITestContext } from "../..";
import { ITestCase } from "../../interfaces/suite/ITestCase";
import { ITestSuite } from "../../suite/interfaces/ITestSuite";
import { ITestFilter } from "../../suite/interfaces/ITestFilter";
import { ISuiteResult } from "./ISuiteResult";
import { ITestResult } from "./ITestResult";
import { IHookFailure } from "./IHookFailure";

/**
 * Context defining which test suites and/or test cases to run
 * @since 0.2.0
 */
export interface ITestRunContext {
    /**
     * Root suite to run (including all child suites and tests)
     * Will be set before the test run starts
     */
    root: ITestSuite;

    /**
     * Configuration host providing access to global configuration and utilities
     * Will be set before the test run starts
     */
    cfg: IConfigHost;

    /**
     * The start time of the test run (milliseconds since epoch)
     * Will be set when the test run starts
     */
    start: number;

    /**
     * The end time of the test run (milliseconds since epoch)
     * Will be set when the test run completes
     */
    end?: number;

    /**
     * Optional filters to control which suites and/or tests should be run
     * Filters are applied in the order they are added, and all filters must allow a suite/test for it to be run
     * Filters can be added/removed dynamically during the test run
     */
    filters?: ITestFilter[];

    /**
     * The context used as the 'this' value when executing test functions
     * Can be used to share state or utilities across tests
     * Will be set before the test run starts
     */
    context: ITestContext;

    /**
     * Runner execution metrics for the current run
     */
    metrics?: IRunnerMetrics;

    /**
     * Every lifecycle hook that failed or timed out so far during the current run, in failure
     * order -- reset at the start of each run() and surfaced on the run summary.
     */
    hookFailures?: IHookFailure[];

    /**
     * The raw errors behind {@link hookFailures}, kept (unserialized, by reference) so that a
     * rejection propagating out of the run can be recognised as one already recorded above --
     * see the runner's own `_isRecordedHookError`.
     */
    hookErrors?: Error[];

    /**
     * Retrieves the current result for a given suite, if none currently exists a new result will be created.
     * @param suite
     */
    suiteResult(suite: ITestSuite): ISuiteResult;

    /**
     * Retrieves the current result for a given test, if none currently exists a new result will be created.
     * @param test
     */
    testResult(test: ITestCase): ITestResult;
}

/**
 * Internal extended context used for defining which test suites and/or test cases to run
 * Which includes additional internal properties used by the runner to manage the run state
 * and hook chains. Anything prefixed with an underscore is considered internal and not part
 * of the public contract and should not be used outside of the runner implementation.
 * @since 0.2.0
 * @internal
 */
export interface _ITestRunContext extends ITestRunContext {
    /**
     * Per-run cache of the resolved `beforeEach` / `afterEach` hook chains keyed by suite id, populated
     * and validated by the runner as tests execute. Not part of the public contract.
     * @internal
     */
    _hookChains?: { [suiteId: string]: any };
}
