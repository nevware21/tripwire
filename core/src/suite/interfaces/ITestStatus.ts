/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2025 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

/**
 * Test result status
 * @since 0.2.0
 */
export enum TestStatus {
    Pending = "pending",
    Passed = "passed",
    Failed = "failed",

    /**
     * Identifies tests that were skipped by the test definition. This is different from aborted tests as they were
     * explicitly marked as skipped in the test definition, whereas aborted tests were not marked as skipped but
     * were aborted during execution by a listener.
     */
    Skipped = "skipped",

    /**
     * Identifies tests that were aborted by a listener. This is different from skipped tests as they were not skipped
     * by the test definition but were aborted during execution by a listener.
     */
    Aborted = "aborted"
}
