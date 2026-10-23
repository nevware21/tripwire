/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2025-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { TestFn } from "../../types/TestFn";

/**
 * Test case definition
 * @since 0.2.0
 */
export interface ITestCase {
    /**
     * Unique identifier for this test (deterministic across runs)
     */
    id: string;

    /**
     * Test description
     */
    description: string;

    /**
     * Test function
     */
    fn?: TestFn;

    /**
     * Whether this test is marked as only
     */
    only: boolean;

    /**
     * Whether this test is skipped in the definition
     */
    skip: boolean;

    /**
     * Test timeout in milliseconds for this test case (overrides suite timeout if set).
     * If not set, the suite timeout or default timeout from the configuration will be used.
     */
    timeout?: number;

    /**
     * Threshold in milliseconds for considering this test slow.
     * If not set, the containing suite value is used, then the global configuration value.
     */
    slow?: number;

    /**
     * Number of retries for this test case.
     * If not set, the containing suite value is used, then the global configuration value.
     */
    retries?: number;
}
