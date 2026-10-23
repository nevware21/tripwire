/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IHookFailure } from "./runner/IHookFailure";

/**
 * Context provided when any event ends
 * @since 0.2.0
 */
export interface IListenerEndContext {
    /**
     * Total number of tests executed (Run events only)
     */
    total?: number;

    /**
     * Start timestamp (Run events only)
     */
    start?: number;

    /**
     * End timestamp (Run events only)
     */
    end?: number;

    /**
     * Test status after execution (Test events only)
     */
    status?: "passed" | "failed" | "skipped" | "pending" | "aborted";

    /**
     * Number of tests that passed
     */
    passed?: number;

    /**
     * Number of tests that failed
     */
    failed?: number;

    /**
     * Number of tests that were skipped
     */
    skipped?: number;

    /**
     * Number of pending tests
     */
    pending?: number;

    /**
     * Execution duration in milliseconds
     */
    duration?: number;

    /**
     * Whether the completed test exceeded its configured slow threshold.
     */
    slow?: boolean;

    /**
     * Effective slow threshold in milliseconds for the completed test.
     */
    slowThreshold?: number;

    /**
     * Error if the test/hook/suite failed
     */
    error?: Error;

    /**
     * Every lifecycle hook that failed or timed out during the run (Run events only), omitted
     * when none did.
     * @since 0.2.0
     */
    hookFailures?: IHookFailure[];
}
