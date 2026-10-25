/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

/**
 * Aggregate execution mode for the current run.
 * @since 0.2.0
 */
export type RunnerExecutionMode = "unknown" | "sync" | "async" | "mixed";

/**
 * Metric event type used in the execution trace.
 * @since 0.2.0
 */
export type RunnerMetricEvent = "start" | "end";

/**
 * Metric scope type used in the execution trace.
 * @since 0.2.0
 */
export type RunnerMetricType = "run" | "suite" | "test" | "hook" | "test-body";

/**
 * A normalized execution sample used for ranked diagnostics.
 * @since 0.2.0
 */
export interface IRunnerMetricExecutionSample {
    /**
     * Scope type.
     */
    type: "hook" | "test-body";

    /**
     * Display name for the scope.
     */
    name: string;

    /**
     * Optional suite path where the scope executed.
     */
    suitePath?: string;

    /**
     * Optional hook group for hooks.
     */
    group?: string;

    /**
     * Optional test id for test body executions.
     */
    testId?: string;

    /**
     * Total execution duration in milliseconds.
     */
    duration: number;

    /**
     * Measured waiting time in milliseconds.
     */
    waitTime: number;

    /**
     * Whether this execution completed asynchronously.
     */
    async: boolean;

    /**
     * Whether this execution timed out.
     */
    timedOut?: boolean;
}

/**
 * Per-test wait ratio metric.
 * @since 0.2.0
 */
export interface IRunnerPerTestWaitMetric {
    /**
     * Test id.
     */
    testId: string;

    /**
     * Test description.
     */
    name: string;

    /**
     * Suite path for this test.
     */
    suitePath: string;

    /**
     * Total test-body execution time in milliseconds.
     */
    totalExecutionTime: number;

    /**
     * Total wait time in milliseconds.
     */
    totalWaitTime: number;

    /**
     * Total active time in milliseconds.
     */
    totalActiveTime: number;

    /**
     * Wait ratio in range [0, 1].
     */
    waitRatio: number;

    /**
     * Number of times this test body executed.
     */
    executionCount: number;

    /**
     * Number of retries recorded for this test.
     */
    retries: number;

    /**
     * Number of timed-out test-body executions.
     */
    timedOut: number;
}

/**
 * Retry diagnostic entry.
 * @since 0.2.0
 */
export interface IRunnerRetryDetail {
    /**
     * Test id.
     */
    testId: string;

    /**
     * Test description.
     */
    name: string;

    /**
     * Suite path for the test.
     */
    suitePath: string;

    /**
     * Number of retries for this test.
     */
    retries: number;
}

/**
 * Timeout hotspot aggregate entry.
 * @since 0.2.0
 */
export interface IRunnerTimeoutHotspot {
    /**
     * Scope type.
     */
    type: "hook" | "test-body";

    /**
     * Display name for the scope.
     */
    name: string;

    /**
     * Optional suite path where this scope appears.
     */
    suitePath?: string;

    /**
     * Optional hook group for hooks.
     */
    group?: string;

    /**
     * Number of executions observed.
     */
    count: number;

    /**
     * Number of timed-out executions.
     */
    timedOut: number;

    /**
     * Aggregate duration in milliseconds.
     */
    totalDuration: number;

    /**
     * Aggregate wait time in milliseconds.
     */
    totalWaitTime: number;
}

/**
 * Trace pattern aggregate for compression statistics.
 * @since 0.2.0
 */
export interface IRunnerTracePattern {
    /**
     * Pattern signature key.
     */
    signature: string;

    /**
     * Number of occurrences in the trace.
     */
    count: number;

    /**
     * Maximum consecutive run length for this signature.
     */
    maxRunLength: number;
}

/**
 * Slowest execution diagnostics.
 * @since 0.2.0
 */
export interface IRunnerSlowestExecutions {
    /**
     * Top execution samples by total duration.
     */
    byDuration: IRunnerMetricExecutionSample[];

    /**
     * Top execution samples by wait time.
     */
    byWaitTime: IRunnerMetricExecutionSample[];
}

/**
 * Retry diagnostics.
 * @since 0.2.0
 */
export interface IRunnerRetryDiagnostics {
    /**
     * Total number of retries.
     */
    totalRetries: number;

    /**
     * Retry details by test.
     */
    tests: IRunnerRetryDetail[];
}

/**
 * Timeout hotspot diagnostics.
 * @since 0.2.0
 */
export interface IRunnerTimeoutDiagnostics {
    /**
     * Total number of timed out executions.
     */
    totalTimeouts: number;

    /**
     * Timeout hotspots sorted by timed-out count.
     */
    hotspots: IRunnerTimeoutHotspot[];
}

/**
 * Trace compression diagnostics.
 * @since 0.2.0
 */
export interface IRunnerTraceCompression {
    /**
     * Number of events in the captured trace.
     */
    totalEvents: number;

    /**
     * Number of unique signatures.
     */
    uniqueSignatures: number;

    /**
     * Number of signatures with more than one occurrence.
     */
    repeatedSignatures: number;

    /**
     * Number of compressed runs after run-length encoding.
     */
    compressedRuns: number;

    /**
     * Compression ratio: compressedRuns / totalEvents.
     */
    compressionRatio: number;

    /**
     * Top patterns by occurrence count.
     */
    topPatterns: IRunnerTracePattern[];
}

/**
 * A single execution trace entry.
 * @since 0.2.0
 */
export interface IRunnerMetricTrace {
    /**
     * Monotonically increasing sequence number.
     */
    order: number;

    /**
     * Trace event phase.
     */
    event: RunnerMetricEvent;

    /**
     * Scope type.
     */
    type: RunnerMetricType;

    /**
     * Scope name or identifier.
     */
    name: string;

    /**
     * Current stack depth at the time of the event.
     */
    depth: number;

    /**
     * Event timestamp in milliseconds since epoch.
     */
    timestamp: number;

    /**
     * Optional async indicator for completed execution units.
     */
    async?: boolean;

    /**
     * Optional execution duration in milliseconds for completed units.
     */
    duration?: number;

    /**
     * Optional wait time in milliseconds for completed units.
     */
    waitTime?: number;

    /**
     * Optional error message if execution ended with an error.
     */
    error?: string;
}

/**
 * Aggregate execution counters for the current run.
 * @since 0.2.0
 */
export interface IRunnerMetricCounts {
    /**
     * Number of suite execution scopes entered.
     */
    suites: number;

    /**
     * Number of test execution scopes entered.
     */
    tests: number;

    /**
     * Number of hook functions executed.
     */
    hooks: number;

    /**
     * Number of test body functions executed.
     */
    testBodies: number;

    /**
     * Number of sync function executions.
     */
    syncExecutions: number;

    /**
     * Number of async function executions.
     */
    asyncExecutions: number;

    /**
     * Number of retries performed.
     */
    retries: number;

    /**
     * Number of timed out function executions.
     */
    timedOut: number;

    /**
     * Number of passed tests.
     */
    passed: number;

    /**
     * Number of failed tests.
     */
    failed: number;

    /**
     * Number of skipped tests.
     */
    skipped: number;

    /**
     * Number of pending tests.
     */
    pending: number;

    /**
     * Number of aborted tests.
     */
    aborted: number;
}

/**
 * Runner monitoring metrics for execution flow and behavior.
 * @since 0.2.0
 */
export interface IRunnerMetrics {
    /**
     * Current execution stack depth.
     */
    currentStackDepth: number;

    /**
     * Current nested (async continuation) stack depth. Incremented when an async
     * callback inherits depth from its calling context; 0 outside async continuations.
     */
    stackNestedDepth: number;

    /**
     * Maximum observed execution stack depth (scope-entry depth).
     */
    maxStackDepth: number;

    /**
     * Maximum observed nested stack depth. For synchronous executions this equals
     * `maxStackDepth`. For asynchronous executions it also tracks the depth
     * inherited by async continuations, which may exceed `maxStackDepth`.
     */
    maxStackNestedDepth: number;

    /**
     * Aggregate execution mode.
     */
    executionMode: RunnerExecutionMode;

    /**
     * Sum of all instrumented function execution durations.
     */
    totalExecutionTime: number;

    /**
     * Sum of all measured wait times for instrumented async function executions.
     */
    totalWaitTime: number;

    /**
     * Sum of active (non-waiting) time for instrumented function executions.
     */
    totalActiveTime: number;

    /**
     * Estimated critical-path duration in milliseconds.
     */
    criticalPathDuration: number;

    /**
     * Timestamp when the run started (milliseconds since epoch).
     */
    startTime?: number;

    /**
     * Timestamp when the run completed (milliseconds since epoch).
     */
    endTime?: number;

    /**
     * Full run duration in milliseconds.
     */
    runDuration?: number;

    /**
     * Aggregate counters.
     */
    counts: IRunnerMetricCounts;

    /**
     * Per-test wait ratio metrics.
     */
    perTestWaitRatios: IRunnerPerTestWaitMetric[];

    /**
     * Slowest execution diagnostics.
     */
    slowestExecutions: IRunnerSlowestExecutions;

    /**
     * Retry diagnostics.
     */
    retryDiagnostics: IRunnerRetryDiagnostics;

    /**
     * Timeout diagnostics.
     */
    timeoutDiagnostics: IRunnerTimeoutDiagnostics;

    /**
     * Trace compression diagnostics.
     */
    traceCompression: IRunnerTraceCompression;

    /**
     * Execution trace entries in observed order.
     */
    trace: IRunnerMetricTrace[];

    /**
     * Number of dropped trace events after the capture limit was reached.
     */
    droppedTraceEvents?: number;

    /**
     * Only present when the runner was created without the `metrics` option enabled (see
     * {@link ITestRunnerOptions.metrics}). Explains that only the basic counters and timing totals were
     * captured and that the trace, execution samples, wait ratios and diagnostics are empty.
     */
    message?: string;
}