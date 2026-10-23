/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

/**
 * Options that control how a test runner created by {@link createTestRunner} behaves.
 * @since 0.2.0
 */
export interface ITestRunnerOptions {
    /**
     * Enables the collection of the full runner execution metrics (the execution trace, per-execution
     * samples, per-test wait ratios, timeout hotspots and retry diagnostics) that are returned by
     * {@link ITestRunner.getMetrics}.
     *
     * Full metrics are **disabled** by default because collecting them allocates several objects for
     * every hook and test body that runs, which measurably slows down large test runs. When disabled the
     * runner still maintains the cheap counters and timing totals, and `getMetrics()` returns those basic
     * values along with a `message` explaining that the full metrics were not captured.
     *
     * @defaultValue false
     */
    metrics?: boolean;
}
