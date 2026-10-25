/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IHookFailure } from "./IHookFailure";

/**
 * Defines the structure of the test summary object that is generated after running a suite of tests. This object contains
 * aggregated information about the total number of tests, how many passed, failed, were skipped, or are pending, as well as
 * the total duration of the test run in milliseconds.
 * @since 0.2.0
 */
export interface ITestSummary {

    /**
     * The total number of tests that were executed during the test run, including those that passed, failed, were skipped,
     * or are pending.
     */
    total: number;

    /**
     * The number of tests that passed during the test run.
     */
    passed: number;

    /**
     * The number of tests that failed during the test run.
     */
    failed: number;

    /**
     * The number of tests that were skipped during the test run.
     */
    skipped: number;

    /**
     * The number of tests that are pending and have not been executed yet.
     */
    pending: number;

    /**
     * The total duration of the test run in milliseconds.
     */
    duration: number;

    /**
     * Start timestamp
     */
    start: number;

    /**
     * End timestamp
     */
    end: number;

    /**
     * Every lifecycle hook that failed or timed out during the run, in the order they failed.
     * Omitted entirely when no hook failed.
     *
     * Hook failures are tracked separately from the counts above because they belong to no
     * single test -- see {@link IHookFailure} -- and the runner's `--fail-on-hook` option turns
     * a non-empty list here into a failed run.
     * @since 0.2.0
     */
    hookFailures?: IHookFailure[];
}
