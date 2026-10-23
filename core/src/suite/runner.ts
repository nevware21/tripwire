/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2025-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { arrAppend, arrForEach, arrIndexOf, arrSlice, fnCall, getDeferred, getKnownSymbol, getLazy, isPromiseLike, isUndefined, ITimerHandler, scheduleTimeout, WellKnownSymbols } from "@nevware21/ts-utils";
import { arrForEachAsync, createPromise, createResolvedPromise, createSyncPromise, doAwait, doWhileAsync, IPromise } from "@nevware21/ts-async";
import { ITestCase } from "../interfaces/suite/ITestCase";
import { ITestSuite } from "./interfaces/ITestSuite";
import { ITestRunner } from "../interfaces/runner/ITestRunner";
import { ITestRunnerOptions } from "../interfaces/runner/ITestRunnerOptions";
import { TestStatus } from "./interfaces/ITestStatus";
import { ITestResult } from "../interfaces/runner/ITestResult";
import { ISuiteResult } from "../interfaces/runner/ISuiteResult";
import { HookFunction } from "../interfaces/suite/IHookFunction";
import { IDoneFn } from "../interfaces/suite/IDoneFn";
import { IHookDefinition } from "./interfaces/IHookDefinition";
import { ITestContext } from "../interfaces/suite/ITestContext";
import { IListener } from "../interfaces/IListener";
import { eListenerEvent, ListenerEvent } from "../types/ListenerEvent";
import { IListenerContext } from "../interfaces/IListenerContext";
import { ITestSummary } from "../interfaces/runner/ITestSummary";
import { eListenerAction } from "../types/ListenerAction";
import { INotifyResult } from "../interfaces/INotifyResult";
import { _gblConfigHost } from "../internal/_configHost";
import { useHost } from "../config/configHost";
import { IConfigHost } from "../interfaces/IConfigHost";
import { ITestFilter } from "./interfaces/ITestFilter";
import { IRemovable } from "../interfaces/IRemovable";
import { _noOpFn } from "../internal/_noOp";
import { _ITestRunContext, ITestRunContext } from "../interfaces/runner/ITestRunContext";
import { IListenerEndContext } from "../interfaces/IListenerEndContext";
import { createOnlyFilter } from "./filters/onlyFilter";
import { IGetSetChainableFn } from "../interfaces/suite/IGetSetChainableFn";
import {
    IRunnerMetrics,
    IRunnerMetricExecutionSample,
    IRunnerMetricTrace,
    IRunnerPerTestWaitMetric,
    IRunnerRetryDetail,
    IRunnerTimeoutHotspot,
    IRunnerTracePattern,
    RunnerMetricType
} from "../interfaces/runner/IRunnerMetrics";
import { TimeoutError } from "../errors/timeoutError";
import { SkipError } from "../errors/skipError";
import { AbortError } from "../errors/abortError";
import { createNotifyMgr } from "../notify/NotificationManager";

interface IExecResp<V, E extends Error = Error> {
    v?: V;
    err?: E;
    skipped?: boolean;
    timedOut?: boolean;
}

interface IHookResponse {
    skipped?: boolean;
    timedOut?: boolean;
}

interface ITestAttemptState {
    test: ITestCase;
    suite: ITestSuite;
    runContext: ITestRunContext;
    testResult: ITestResult;
    attemptStartTime: number;
    completed: boolean;
    onComplete: (result: ITestResult) => void;
}

interface IExecMetricsInfo {
    type: "hook" | "test-body";
    name: string;
    group?: string;
    suitePath?: string;
    testId?: string;
}

interface IMetricScopeToken {
    order: number;
    type: RunnerMetricType;
    name: string;
    startTime: number;
    tracksDepth: boolean;
}

interface IAsyncDepthScopeToken {
    previousDepth: number;
}

interface IRunnerMetricsState extends IRunnerMetrics {
    /**
     * Whether the full (allocation heavy) metrics are being captured -- see ITestRunnerOptions.metrics
     */
    _full: boolean;
    _order: number;
    _traceLimit: number;
    _sampleLimit: number;
    _executionSamples: IRunnerMetricExecutionSample[];
    _droppedExecutionSamples: number;
    _testWaitStats: { [testId: string]: IRunnerPerTestWaitMetric };
    _retryByTest: { [testId: string]: IRunnerRetryDetail };
    _timeoutHotspots: { [hotspotKey: string]: IRunnerTimeoutHotspot };
}

const _METRIC_TRACE_LIMIT = 10000;
const _METRIC_SAMPLE_LIMIT = 10000;
const _METRIC_TOP_N = 10;

const _METRICS_DISABLED_MSG = "Full runner metrics were not captured because the runner was created without the metrics option enabled: " +
    "pass { metrics: true } as the options argument of createTestRunner() to capture the execution trace, execution samples, " +
    "per-test wait ratios and the timeout / retry diagnostics. Only the basic counters and timing totals are included.";

const _hasInstanceSymbol = /* #__PURE__ */ getLazy(() => getKnownSymbol(WellKnownSymbols.hasInstance));

function _createRunnerMetricsState(fullMetrics: boolean): IRunnerMetricsState {
    return {
        _full: fullMetrics,
        currentStackDepth: 0,
        stackNestedDepth: 0,
        maxStackDepth: 0,
        maxStackNestedDepth: 0,
        executionMode: "unknown",
        totalExecutionTime: 0,
        totalWaitTime: 0,
        totalActiveTime: 0,
        criticalPathDuration: 0,
        counts: {
            suites: 0,
            tests: 0,
            hooks: 0,
            testBodies: 0,
            syncExecutions: 0,
            asyncExecutions: 0,
            retries: 0,
            timedOut: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            pending: 0,
            aborted: 0
        },
        perTestWaitRatios: [],
        slowestExecutions: {
            byDuration: [],
            byWaitTime: []
        },
        retryDiagnostics: {
            totalRetries: 0,
            tests: []
        },
        timeoutDiagnostics: {
            totalTimeouts: 0,
            hotspots: []
        },
        traceCompression: {
            totalEvents: 0,
            uniqueSignatures: 0,
            repeatedSignatures: 0,
            compressedRuns: 0,
            compressionRatio: 1,
            topPatterns: []
        },
        trace: [],
        droppedTraceEvents: 0,
        _order: 0,
        _traceLimit: _METRIC_TRACE_LIMIT,
        _sampleLimit: _METRIC_SAMPLE_LIMIT,
        _executionSamples: [],
        _droppedExecutionSamples: 0,
        _testWaitStats: {},
        _retryByTest: {},
        _timeoutHotspots: {}
    };
}

function _resetRunnerMetrics(metrics: IRunnerMetricsState, startTime: number): void {
    metrics.currentStackDepth = 0;
    metrics.stackNestedDepth = 0;
    metrics.maxStackDepth = 0;
    metrics.maxStackNestedDepth = 0;
    metrics.executionMode = "unknown";
    metrics.totalExecutionTime = 0;
    metrics.totalWaitTime = 0;
    metrics.totalActiveTime = 0;
    metrics.criticalPathDuration = 0;
    metrics.startTime = startTime;
    metrics.endTime = undefined;
    metrics.runDuration = undefined;
    metrics.trace = [];
    metrics.droppedTraceEvents = 0;
    metrics._order = 0;
    metrics._executionSamples = [];
    metrics._droppedExecutionSamples = 0;
    metrics._testWaitStats = {};
    metrics._retryByTest = {};
    metrics._timeoutHotspots = {};
    metrics.counts = {
        suites: 0,
        tests: 0,
        hooks: 0,
        testBodies: 0,
        syncExecutions: 0,
        asyncExecutions: 0,
        retries: 0,
        timedOut: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        pending: 0,
        aborted: 0
    };
    metrics.perTestWaitRatios = [];
    metrics.slowestExecutions = {
        byDuration: [],
        byWaitTime: []
    };
    metrics.retryDiagnostics = {
        totalRetries: 0,
        tests: []
    };
    metrics.timeoutDiagnostics = {
        totalTimeouts: 0,
        hotspots: []
    };
    metrics.traceCompression = {
        totalEvents: 0,
        uniqueSignatures: 0,
        repeatedSignatures: 0,
        compressedRuns: 0,
        compressionRatio: 1,
        topPatterns: []
    };
}

function _createTraceCompression(trace: IRunnerMetricTrace[]): { totalEvents: number; uniqueSignatures: number; repeatedSignatures: number; compressedRuns: number; compressionRatio: number; topPatterns: IRunnerTracePattern[] } {
    const totalEvents = trace.length;
    const patterns: { [signature: string]: IRunnerTracePattern } = {};

    let compressedRuns = 0;
    let currentSig: string = "";
    let currentRunLength = 0;

    for (let idx = 0; idx < trace.length; idx++) {
        const item = trace[idx];
        const sig = item.event + ":" + item.type + ":" + item.name;

        let pattern = patterns[sig];
        if (!pattern) {
            pattern = {
                signature: sig,
                count: 0,
                maxRunLength: 0
            };
            patterns[sig] = pattern;
        }

        pattern.count++;

        if (sig === currentSig) {
            currentRunLength++;
        } else {
            if (currentRunLength > 0) {
                const prev = patterns[currentSig];
                if (prev && currentRunLength > prev.maxRunLength) {
                    prev.maxRunLength = currentRunLength;
                }
            }

            currentSig = sig;
            currentRunLength = 1;
            compressedRuns++;
        }
    }

    if (currentRunLength > 0 && patterns[currentSig]) {
        const prev = patterns[currentSig];
        if (currentRunLength > prev.maxRunLength) {
            prev.maxRunLength = currentRunLength;
        }
    }

    const patternList = Object.keys(patterns).map((key) => patterns[key]);
    const repeatedSignatures = patternList.filter((item) => item.count > 1).length;
    patternList.sort((a, b) => {
        if (b.count === a.count) {
            return b.maxRunLength - a.maxRunLength;
        }

        return b.count - a.count;
    });

    return {
        totalEvents: totalEvents,
        uniqueSignatures: patternList.length,
        repeatedSignatures: repeatedSignatures,
        compressedRuns: compressedRuns,
        compressionRatio: totalEvents > 0 ? (compressedRuns / totalEvents) : 1,
        topPatterns: patternList.slice(0, _METRIC_TOP_N)
    };
}

function _getCriticalPathDuration(metrics: IRunnerMetricsState): number {
    if (typeof metrics.runDuration === "number") {
        return metrics.runDuration;
    }

    let maxDuration = 0;
    arrForEach(metrics.trace, (item) => {
        if (item.event === "end" && typeof item.duration === "number" && item.duration > maxDuration) {
            maxDuration = item.duration;
        }
    });

    return maxDuration;
}

function _cloneRunnerMetrics(metrics: IRunnerMetricsState): IRunnerMetrics {
    // The mode is derived from the counters rather than maintained on every execution
    _setExecutionMode(metrics);

    const full = metrics._full;
    let perTestWaitRatios: IRunnerPerTestWaitMetric[] = [];
    let byDuration: IRunnerMetricExecutionSample[] = [];
    let byWaitTime: IRunnerMetricExecutionSample[] = [];
    let retryTests: IRunnerRetryDetail[] = [];
    let hotspots: IRunnerTimeoutHotspot[] = [];

    if (full) {
        perTestWaitRatios = Object.keys(metrics._testWaitStats).map((key) => {
            const item = metrics._testWaitStats[key];
            const totalActiveTime = item.totalExecutionTime - item.totalWaitTime;
            const waitRatio = item.totalExecutionTime > 0 ? (item.totalWaitTime / item.totalExecutionTime) : 0;

            return {
                testId: item.testId,
                name: item.name,
                suitePath: item.suitePath,
                totalExecutionTime: item.totalExecutionTime,
                totalWaitTime: item.totalWaitTime,
                totalActiveTime: totalActiveTime,
                waitRatio: waitRatio,
                executionCount: item.executionCount,
                retries: item.retries,
                timedOut: item.timedOut
            };
        });

        perTestWaitRatios.sort((a, b) => b.waitRatio - a.waitRatio);

        byDuration = arrSlice(metrics._executionSamples).sort((a, b) => b.duration - a.duration).slice(0, _METRIC_TOP_N);
        byWaitTime = arrSlice(metrics._executionSamples).sort((a, b) => b.waitTime - a.waitTime).slice(0, _METRIC_TOP_N);

        retryTests = Object.keys(metrics._retryByTest).map((key) => metrics._retryByTest[key]).sort((a, b) => b.retries - a.retries);
        hotspots = Object.keys(metrics._timeoutHotspots).map((key) => metrics._timeoutHotspots[key])
            .filter((item) => item.timedOut > 0)
            .sort((a, b) => b.timedOut - a.timedOut);
    }

    const traceCompression = _createTraceCompression(metrics.trace);
    const criticalPathDuration = _getCriticalPathDuration(metrics);

    const result: IRunnerMetrics = {
        currentStackDepth: metrics.currentStackDepth,
        stackNestedDepth: metrics.stackNestedDepth,
        maxStackDepth: metrics.maxStackDepth,
        maxStackNestedDepth: metrics.maxStackNestedDepth,
        executionMode: metrics.executionMode,
        totalExecutionTime: metrics.totalExecutionTime,
        totalWaitTime: metrics.totalWaitTime,
        totalActiveTime: metrics.totalActiveTime,
        criticalPathDuration: criticalPathDuration,
        startTime: metrics.startTime,
        endTime: metrics.endTime,
        runDuration: metrics.runDuration,
        counts: {
            suites: metrics.counts.suites,
            tests: metrics.counts.tests,
            hooks: metrics.counts.hooks,
            testBodies: metrics.counts.testBodies,
            syncExecutions: metrics.counts.syncExecutions,
            asyncExecutions: metrics.counts.asyncExecutions,
            retries: metrics.counts.retries,
            timedOut: metrics.counts.timedOut,
            passed: metrics.counts.passed,
            failed: metrics.counts.failed,
            skipped: metrics.counts.skipped,
            pending: metrics.counts.pending,
            aborted: metrics.counts.aborted
        },
        perTestWaitRatios: perTestWaitRatios,
        slowestExecutions: {
            byDuration: byDuration,
            byWaitTime: byWaitTime
        },
        retryDiagnostics: {
            totalRetries: metrics.counts.retries,
            tests: retryTests
        },
        timeoutDiagnostics: {
            totalTimeouts: metrics.counts.timedOut,
            hotspots: hotspots
        },
        traceCompression: traceCompression,
        trace: arrSlice(metrics.trace),
        droppedTraceEvents: metrics.droppedTraceEvents
    };

    if (!full) {
        result.message = _METRICS_DISABLED_MSG;
    }

    return result;
}

function _startAsyncDepthScope(runContext: ITestRunContext, inheritedDepth?: number): IAsyncDepthScopeToken | null {
    const metrics = runContext.metrics as IRunnerMetricsState;
    if (!metrics) {
        return null;
    }

    const previousDepth = metrics.stackNestedDepth;
    const baseDepth = inheritedDepth === undefined
        ? (metrics.stackNestedDepth > metrics.currentStackDepth ? metrics.stackNestedDepth : metrics.currentStackDepth)
        : inheritedDepth;

    const nextDepth = baseDepth + 1;
    metrics.stackNestedDepth = nextDepth;
    if (nextDepth > metrics.maxStackNestedDepth) {
        metrics.maxStackNestedDepth = nextDepth;
    }

    return {
        previousDepth: previousDepth
    };
}

function _endAsyncDepthScope(runContext: ITestRunContext, token: IAsyncDepthScopeToken | null): void {
    const metrics = runContext.metrics as IRunnerMetricsState;
    if (!metrics || !token) {
        return;
    }

    metrics.stackNestedDepth = token.previousDepth;
}

function _useAsyncDepthScope<T>(runContext: ITestRunContext, callback: () => T, inheritedDepth?: number): T {
    const token = _startAsyncDepthScope(runContext, inheritedDepth);

    try {
        return callback();
    } finally {
        _endAsyncDepthScope(runContext, token);
    }
}

function _setExecutionMode(metrics: IRunnerMetricsState): void {
    if (metrics.counts.asyncExecutions > 0 && metrics.counts.syncExecutions > 0) {
        metrics.executionMode = "mixed";
    } else if (metrics.counts.asyncExecutions > 0) {
        metrics.executionMode = "async";
    } else if (metrics.counts.syncExecutions > 0) {
        metrics.executionMode = "sync";
    } else {
        metrics.executionMode = "unknown";
    }
}

/**
 * Whether a trace event may be recorded: only when the full metrics are enabled and the trace cap has
 * not been reached. Checked *before* the entry is built so that nothing is allocated for an event that
 * would only be dropped (or that nobody asked for).
 * @internal
 */
function _canTrace(metrics: IRunnerMetricsState): boolean {
    if (!metrics._full) {
        return false;
    }

    if (metrics.trace.length < metrics._traceLimit) {
        return true;
    }

    metrics.droppedTraceEvents = (metrics.droppedTraceEvents || 0) + 1;

    return false;
}

function _pushExecutionSample(metrics: IRunnerMetricsState, sample: IRunnerMetricExecutionSample): void {
    if (metrics._executionSamples.length < metrics._sampleLimit) {
        metrics._executionSamples.push(sample);
    } else {
        metrics._droppedExecutionSamples++;
    }
}

function _getSuitePath(suite?: ITestSuite): string {
    if (!suite) {
        return "";
    }

    const parts: string[] = [];
    let current: ITestSuite | undefined = suite;
    while (current) {
        parts.push(current.description || current.id || "suite");
        current = current.parent;
    }

    parts.reverse();
    return parts.join(" > ");
}

function _startMetricScope(runContext: ITestRunContext, type: RunnerMetricType, name: string): IMetricScopeToken | null {
    const metrics = runContext.metrics as IRunnerMetricsState;
    if (!metrics) {
        return null;
    }

    const tracksDepth = type === "suite" || type === "test" || type === "hook";

    if (tracksDepth) {
        metrics.currentStackDepth++;
        if (metrics.currentStackDepth > metrics.maxStackDepth) {
            metrics.maxStackDepth = metrics.currentStackDepth;
        }
        if (metrics.currentStackDepth > metrics.maxStackNestedDepth) {
            metrics.maxStackNestedDepth = metrics.currentStackDepth;
        }
    }

    const now = Date.now();
    const order = ++metrics._order;

    if (_canTrace(metrics)) {
        metrics.trace.push({
            order: order,
            event: "start",
            type: type,
            name: name,
            depth: metrics.currentStackDepth,
            timestamp: now
        });
    }

    return {
        order: order,
        type: type,
        name: name,
        startTime: now,
        tracksDepth: tracksDepth
    };
}

function _endMetricScope(runContext: ITestRunContext, token: IMetricScopeToken | null, isAsync?: boolean, waitTime?: number, error?: Error): void {
    const metrics = runContext.metrics as IRunnerMetricsState;
    if (!metrics || !token) {
        return;
    }

    const now = Date.now();
    const duration = now - token.startTime;
    const depth = metrics.currentStackDepth;
    const order = ++metrics._order;

    if (_canTrace(metrics)) {
        metrics.trace.push({
            order: order,
            event: "end",
            type: token.type,
            name: token.name,
            depth: depth,
            timestamp: now,
            async: isAsync,
            duration: duration,
            waitTime: waitTime,
            error: error ? error.message : undefined
        });
    }

    if (token.tracksDepth) {
        metrics.currentStackDepth = depth > 0 ? (depth - 1) : 0;
    }
}

function _useMetricScope<T>(
    runContext: ITestRunContext,
    type: RunnerMetricType,
    name: string,
    callback: () => T | IPromise<T>,
    getError?: (value: T) => Error | undefined
): T | IPromise<T> {
    const token = _startMetricScope(runContext, type, name);
    const inheritedAsyncDepth = (() => {
        const metrics = runContext.metrics as IRunnerMetricsState;
        if (!metrics) {
            return 0;
        }

        return metrics.stackNestedDepth > metrics.currentStackDepth ? metrics.stackNestedDepth : metrics.currentStackDepth;
    })();
    let finalized = false;

    function _finalize(value?: T, error?: Error): void {
        if (finalized) {
            return;
        }

        finalized = true;
        _endMetricScope(runContext, token, false, 0, error || (getError && value !== undefined ? getError(value) : undefined));
    }

    try {
        const value = callback();
        if (isPromiseLike(value)) {
            return doAwait(value, (resolvedValue: any) => {
                return _useAsyncDepthScope(runContext, () => {
                    _finalize(resolvedValue as T);
                    return resolvedValue;
                }, inheritedAsyncDepth);
            }, (reason: any) => {
                return _useAsyncDepthScope(runContext, () => {
                    _finalize(undefined, reason as Error);
                    throw reason;
                }, inheritedAsyncDepth);
            }) as T | IPromise<T>;
        }

        _finalize(value as T);
        return value;
    } catch (e) {
        _finalize(undefined, e as Error);
        throw e;
    }
}

function _recordFunctionMetrics(runContext: ITestRunContext, metricInfo: IExecMetricsInfo | undefined, isAsync: boolean, totalTime: number, waitTime: number, activeTime: number, resp: IExecResp<any>): void {
    const metrics = runContext.metrics as IRunnerMetricsState;
    if (!metrics) {
        return;
    }

    if (metricInfo && metricInfo.type === "hook") {
        metrics.counts.hooks++;
    } else {
        metrics.counts.testBodies++;
    }

    if (isAsync) {
        metrics.counts.asyncExecutions++;
    } else {
        metrics.counts.syncExecutions++;
    }

    if (resp && resp.timedOut) {
        metrics.counts.timedOut++;
    }

    metrics.totalExecutionTime += totalTime;
    metrics.totalWaitTime += waitTime;
    metrics.totalActiveTime += activeTime;

    if (!metrics._full) {
        // Only the counters and totals above are maintained unless full metrics were requested
        return;
    }

    const sample: IRunnerMetricExecutionSample = {
        type: metricInfo && metricInfo.type ? metricInfo.type : "test-body",
        name: metricInfo && metricInfo.name ? metricInfo.name : "anonymous",
        suitePath: metricInfo && metricInfo.suitePath ? metricInfo.suitePath : undefined,
        group: metricInfo && metricInfo.group ? metricInfo.group : undefined,
        testId: metricInfo && metricInfo.testId ? metricInfo.testId : undefined,
        duration: totalTime,
        waitTime: waitTime,
        async: isAsync,
        timedOut: !!(resp && resp.timedOut)
    };
    _pushExecutionSample(metrics, sample);

    const hotspotKey = sample.type + "|" + (sample.suitePath || "") + "|" + (sample.group || "") + "|" + sample.name;
    let hotspot = metrics._timeoutHotspots[hotspotKey];
    if (!hotspot) {
        hotspot = {
            type: sample.type,
            name: sample.name,
            suitePath: sample.suitePath,
            group: sample.group,
            count: 0,
            timedOut: 0,
            totalDuration: 0,
            totalWaitTime: 0
        };
        metrics._timeoutHotspots[hotspotKey] = hotspot;
    }

    hotspot.count++;
    hotspot.totalDuration += totalTime;
    hotspot.totalWaitTime += waitTime;
    if (resp && resp.timedOut) {
        hotspot.timedOut++;
    }

    if (sample.type === "test-body" && sample.testId) {
        let testStat = metrics._testWaitStats[sample.testId];
        if (!testStat) {
            testStat = {
                testId: sample.testId,
                name: sample.name,
                suitePath: sample.suitePath || "",
                totalExecutionTime: 0,
                totalWaitTime: 0,
                totalActiveTime: 0,
                waitRatio: 0,
                executionCount: 0,
                retries: 0,
                timedOut: 0
            };
            metrics._testWaitStats[sample.testId] = testStat;
        }

        testStat.totalExecutionTime += totalTime;
        testStat.totalWaitTime += waitTime;
        testStat.totalActiveTime += activeTime;
        testStat.executionCount++;
        if (resp && resp.timedOut) {
            testStat.timedOut++;
        }
    }
}

function _getDefaultTimeout(runContext: ITestRunContext): number {
    let timeout = runContext.cfg && runContext.cfg.opts && runContext.cfg.opts.v ? runContext.cfg.opts.v.timeout : undefined;

    return typeof timeout === "number" ? timeout : 2000;
}

function _getExecutionTimeout(runContext: ITestRunContext, suite?: ITestSuite, test?: ITestCase): number {
    if (test && typeof test.timeout === "number") {
        return test.timeout;
    }

    let s: ITestSuite | undefined = suite;
    while (s) {
        if (typeof s.timeout === "number") {
            return s.timeout;
        }
        s = s.parent;
    }

    return _getDefaultTimeout(runContext);
}

function _getExecutionSlow(runContext: ITestRunContext, suite?: ITestSuite, test?: ITestCase): number {
    const cfgSlow = runContext.cfg && runContext.cfg.opts && runContext.cfg.opts.v ? runContext.cfg.opts.v.slow : undefined;
    const defaultSlow = typeof cfgSlow === "number" ? cfgSlow : 75;

    if (test && typeof test.slow === "number") {
        return test.slow;
    }

    let s: ITestSuite | undefined = suite;
    while (s) {
        if (typeof s.slow === "number") {
            return s.slow;
        }
        s = s.parent;
    }

    return defaultSlow;
}

function _getExecutionRetries(runContext: ITestRunContext, suite?: ITestSuite, test?: ITestCase): number {
    const cfgRetries = runContext.cfg && runContext.cfg.opts && runContext.cfg.opts.v ? (runContext.cfg.opts.v as any).retries : undefined;
    const defaultRetries = typeof cfgRetries === "number" ? cfgRetries : 0;

    if (test && typeof test.retries === "number") {
        return test.retries;
    }

    let s: ITestSuite | undefined = suite;
    while (s) {
        if (typeof s.retries === "number") {
            return s.retries;
        }
        s = s.parent;
    }

    return defaultRetries;
}

/**
 * Create a test execution context
 * @internal
 */
function _createTestExecutionContext(defaultTimeout?: number, defaultSlow?: number, defaultRetries?: number): ITestContext {
    let testTimeout = typeof defaultTimeout === "number" ? defaultTimeout : 2000;
    let slowThreshold = typeof defaultSlow === "number" ? defaultSlow : 75;
    let retryCount = typeof defaultRetries === "number" ? defaultRetries : 0;

    let context: ITestContext = {
        [_hasInstanceSymbol.v]: () => false,
        timeout: function(ms?: number): any {
            if (ms !== undefined) {
                testTimeout = ms;
                return this;
            }

            return testTimeout;
        },
        slow: function(ms?: number): any {
            if (ms !== undefined) {
                slowThreshold = ms;
                return this;
            }

            return slowThreshold;
        },
        retries: function(count?: number): any {
            if (count !== undefined) {
                retryCount = count;
                return this;
            }

            return retryCount;
        },
        skip: function(): never {
            throw new SkipError("Test skipped");
        }
    };

    return context;
}

/**
 * Execute a hook or test function
 * @internal
 */
function _executeFunctionWithResult<R>(fn: HookFunction, runContext: ITestRunContext, metricInfo?: IExecMetricsInfo): IExecResp<R> | IPromise<IExecResp<R>> {
    let timeoutHdlr: ITimerHandler | null = null;
    let completed = false;
    let theContext = runContext.context || _createTestExecutionContext(_getDefaultTimeout(runContext));
    let orgTimeout = theContext.timeout;
    let orgSlow = theContext.slow;
    let timeout: number = orgTimeout ? fnCall(orgTimeout, theContext) as unknown as number : _getDefaultTimeout(runContext);
    let syncResp: IExecResp<R> = {};
    let asyncResolve: ((resp: IExecResp<R>) => void) | null = null;
    let callReturnTime = -1;
    let asyncExecution = false;
    let metricsFinalized = false;
    const inheritedAsyncDepth = (() => {
        const metrics = runContext.metrics as IRunnerMetricsState;
        if (!metrics) {
            return 0;
        }

        return metrics.stackNestedDepth > metrics.currentStackDepth ? metrics.stackNestedDepth : metrics.currentStackDepth;
    })();
    const metricScope = _startMetricScope(runContext, metricInfo ? metricInfo.type : "test-body", metricInfo && metricInfo.name ? metricInfo.name : "anonymous");
    const startTime = metricScope ? metricScope.startTime : Date.now();

    function _finalizeMetrics(resp: IExecResp<R>): void {
        if (metricsFinalized) {
            return;
        }

        const endTime = Date.now();
        if (callReturnTime < 0) {
            callReturnTime = endTime;
        }

        const activeTime = callReturnTime > 0 && metricScope ? (callReturnTime - metricScope.startTime) : 0;
        const totalTime = metricScope ? (endTime - metricScope.startTime) : 0;
        const waitTime = asyncExecution ? (totalTime - activeTime > 0 ? (totalTime - activeTime) : 0) : 0;

        _recordFunctionMetrics(runContext, metricInfo, asyncExecution, totalTime, waitTime, activeTime > 0 ? activeTime : 0, resp);
        _endMetricScope(runContext, metricScope, asyncExecution, waitTime, resp.err);
        metricsFinalized = true;
    }

    function _complete(resp: IExecResp<R>): IExecResp<R> {
        if (completed) {
            // Already completed (eg. the timeout fired before a returned promise settled): the first
            // response is the definitive one, a late completion must not override it.
            return syncResp;
        }

        completed = true;

        _cancelTimeout();

        theContext.timeout = orgTimeout;
        theContext.slow = orgSlow;
        syncResp = resp;

        done.fail = _noOpFn as any;

        if (asyncResolve) {
            asyncResolve(resp);
            asyncResolve = null;
        }

        _finalizeMetrics(resp);

        return resp;
    }

    const done: IDoneFn = (error?: any) => {
        if (error) {
            _complete({ err: error });
        } else {
            _complete({});
        }
    };

    done.fail = (error?: any) => {
        done(error || new Error("Test failed"));
    };

    function _timeoutResp(): IExecResp<R> {
        return {
            err: new TimeoutError("Timeout of " + timeout + "ms exceeded", { timeoutMs: timeout }),
            timedOut: true
        };
    }

    /**
     * Schedules (or re-schedules) the timeout timer. This is only ever called once the function is known
     * to be asynchronous -- it returned a promise or is waiting on `done` -- because a timer can never
     * interrupt a synchronous function anyway; scheduling and cancelling one for every synchronous hook
     * and test body was pure overhead. A synchronous function's elapsed time is checked once it returns
     * instead (see _syncResp).
     */
    function _cancelTimeout(): void {
        if (timeoutHdlr) {
            timeoutHdlr.cancel();
            timeoutHdlr = null;
        }
    }

    function _startTimeout(delay: number): void {
        _cancelTimeout();

        timeoutHdlr = scheduleTimeout(() => {
            if (!completed) {
                _complete(_timeoutResp());
            }
        }, delay);
    }

    /**
     * Arms the timer now that the function has been detected as asynchronous, with whatever part of the
     * budget its synchronous portion has not already consumed.
     *
     * A non-positive timeout means "no limit" and arms nothing, matching Mocha and the synchronous
     * path's own check in {@link _syncResp}. The two used to disagree: `this.timeout(0)` -- the
     * documented way to say "this one takes as long as it takes" -- clamped the remaining budget to
     * 0, armed a 0ms timer, and failed the test with `Timeout of 0ms exceeded` before its body could
     * get anywhere.
     */
    function _armTimeout(): void {
        if (timeout <= 0) {
            _cancelTimeout();
            return;
        }

        const remaining = timeout - (Date.now() - startTime);
        _startTimeout(remaining > 0 ? remaining : 0);
    }

    /**
     * The promise the caller waits on while an asynchronous function is outstanding, resolved by
     * {@link _complete} -- from whichever reaches it first, the function settling or the timer
     * firing. Shared by both asynchronous paths so that neither can wait on something the timeout
     * has no way to interrupt.
     */
    function _asyncCompletion(): IExecResp<R> | IPromise<IExecResp<R>> {
        if (completed) {
            return syncResp;
        }

        return createSyncPromise<IExecResp<R>>((resolve) => {
            asyncResolve = resolve;

            if (completed) {
                resolve(syncResp);
                asyncResolve = null;
            }
        });
    }

    /**
     * The response for a function that completed synchronously: a timeout failure when it overran its
     * budget, otherwise success. A non-positive timeout is treated as no limit for this check, matching
     * how such a function has always behaved (its timer never had a chance to fire before completion).
     */
    function _syncResp(): IExecResp<R> {
        return (timeout > 0 && (callReturnTime - startTime) > timeout) ? _timeoutResp() : {};
    }

    function _timeout(ms?: number): number | ITestContext {
        if (ms === undefined) {
            return fnCall(orgTimeout, theContext);
        }

        fnCall(orgTimeout, theContext, ms);

        if (asyncExecution && timeoutHdlr && ms === timeout) {
            timeoutHdlr.refresh();
        } else {
            timeout = ms;
            if (asyncExecution) {
                if (timeout > 0) {
                    // Already waiting, so restart with the full new budget from now
                    _startTimeout(timeout);
                } else {
                    // 0 disables the limit, so stop timing this function rather than expiring it on
                    // the next tick -- see _armTimeout.
                    _cancelTimeout();
                }
            }
        }

        return theContext;
    }

    function _slow(ms?: number): number | ITestContext {
        if (ms === undefined) {
            return fnCall(orgSlow, theContext);
        }

        fnCall(orgSlow, theContext, ms);

        if (theContext.currentTest) {
            theContext.currentTest.slow = ms;
        }

        return theContext;
    }

    try {
        theContext.timeout = _timeout as IGetSetChainableFn<ITestContext, number>;
        theContext.slow = _slow as IGetSetChainableFn<ITestContext, number>;

        const useDone = fn.length > 0;
        const result = useDone ? fnCall(fn, theContext, done) : fnCall(fn, theContext);
        callReturnTime = Date.now();

        if (isPromiseLike(result)) {
            asyncExecution = true;
            _armTimeout();

            // These handlers record the outcome, but the promise they derive is deliberately *not*
            // what gets returned. Returning it made the caller wait on the test's own promise, so a
            // body that returned one which never settles hung the entire run no matter how short the
            // timeout was -- the timer fired, recorded its TimeoutError, and had nobody listening --
            // and one that settled late made the run wait for the settlement it had already given up
            // on. What is returned instead is the completion promise both asynchronous paths share,
            // which the timer can resolve on its own. A settlement arriving after the timeout still
            // lands in _complete, which keeps the first response and discards the late one.
            doAwait(result, () => {
                return _useAsyncDepthScope(runContext, () => {
                    return _complete({});
                }, inheritedAsyncDepth);
            }, (error: any) => {
                return _useAsyncDepthScope(runContext, () => {
                    return _complete({ err: error as Error });
                }, inheritedAsyncDepth);
            });

            return _asyncCompletion();
        }

        if (!useDone) {
            return _complete(_syncResp());
        }

        if (completed) {
            return syncResp;
        }

        asyncExecution = true;
        _armTimeout();

        return _asyncCompletion();
    } catch (error) {
        callReturnTime = Date.now();
        return _complete({ err: error as Error });
    }
}

/**
 * The resolved `beforeEach` / `afterEach` hook chain for a suite, together with the snapshot of each
 * suite's own hook lists it was built from so that a hook added or removed while the run is executing
 * (eg. from inside a test) is detected and the chain rebuilt.
 * @internal
 */
interface IHookChain {
    /**
     * The beforeEach hooks to run, outermost suite first
     */
    before: IHookDefinition[];

    /**
     * The afterEach hooks to run, innermost suite first
     */
    after: IHookDefinition[];

    /**
     * The suite chain the hooks were collected from, innermost (the suite itself) first
     */
    chain: ITestSuite[];

    /**
     * Copy of each chain suite's beforeEachHooks at the time the chain was built (same order as `chain`)
     */
    beforeSnap: IHookDefinition[][];

    /**
     * Copy of each chain suite's afterEachHooks at the time the chain was built (same order as `chain`)
     */
    afterSnap: IHookDefinition[][];
}

function _sameHooks(current: IHookDefinition[] | undefined, snapshot: IHookDefinition[]): boolean {
    const len = current ? current.length : 0;
    if (len !== snapshot.length) {
        return false;
    }

    for (let idx = 0; idx < len; idx++) {
        if (current[idx] !== snapshot[idx]) {
            return false;
        }
    }

    return true;
}

function _isHookChainCurrent(entry: IHookChain): boolean {
    const chain = entry.chain;
    for (let idx = 0; idx < chain.length; idx++) {
        const theSuite = chain[idx];
        if (!_sameHooks(theSuite.beforeEachHooks, entry.beforeSnap[idx]) || !_sameHooks(theSuite.afterEachHooks, entry.afterSnap[idx])) {
            return false;
        }
    }

    return true;
}

function _buildHookChain(suite: ITestSuite): IHookChain {
    const chain: ITestSuite[] = [];
    const beforeSnap: IHookDefinition[][] = [];
    const afterSnap: IHookDefinition[][] = [];
    const after: IHookDefinition[] = [];
    let currentSuite: ITestSuite | undefined = suite;

    while (currentSuite) {
        const beforeHooks = currentSuite.beforeEachHooks ? arrSlice(currentSuite.beforeEachHooks) : [];
        const afterHooks = currentSuite.afterEachHooks ? arrSlice(currentSuite.afterEachHooks) : [];

        chain.push(currentSuite);
        beforeSnap.push(beforeHooks);
        afterSnap.push(afterHooks);

        // afterEach hooks run innermost suite first
        arrAppend(after, afterHooks);
        currentSuite = currentSuite.parent;
    }

    // beforeEach hooks run outermost suite first
    const before: IHookDefinition[] = [];
    for (let idx = chain.length - 1; idx >= 0; idx--) {
        arrAppend(before, beforeSnap[idx]);
    }

    return {
        before: before,
        after: after,
        chain: chain,
        beforeSnap: beforeSnap,
        afterSnap: afterSnap
    };
}

/**
 * Returns the `beforeEach` / `afterEach` hook chain for the suite, computed once per suite per run and
 * reused for every test in it. The cached chain is validated against the suites' current hook lists on
 * every request, so hooks added or removed dynamically during the run are picked up by the next test.
 * @internal
 */
function _getHookChain(suite: ITestSuite, runContext: _ITestRunContext): IHookChain {
    const chains: { [suiteId: string]: IHookChain } = runContext._hookChains || (runContext._hookChains = {});
    let entry = chains[suite.id];
    if (!entry || !_isHookChainCurrent(entry)) {
        entry = _buildHookChain(suite);
        chains[suite.id] = entry;
    }

    return entry;
}

/**
 * The suite path is only needed by the full metrics (execution samples / hotspots), so it is only built
 * when they are being captured.
 * @internal
 */
function _metricSuitePath(runContext: ITestRunContext, suite: ITestSuite): string | undefined {
    const metrics = runContext.metrics as IRunnerMetricsState;

    return metrics && metrics._full ? _getSuitePath(suite) : undefined;
}

/**
 * Notifies the listeners that an event is starting. The context is supplied as a factory rather than an
 * already built deferred so that nothing at all is allocated when there is nobody listening.
 * @internal
 */
function _notifyStart(cfgHost: IConfigHost, event: ListenerEvent, getContext: () => any): INotifyResult | undefined {
    const notifyMgr = cfgHost.notifyMgr;
    if (notifyMgr && (!notifyMgr.hasListeners || notifyMgr.hasListeners())) {
        return notifyMgr.notifyStart(event, getDeferred(getContext));
    }

    return undefined;
}

/**
 * Notifies the listeners that an event has completed -- see _notifyStart for the factory rationale.
 * @internal
 */
function _notifyEnd(cfgHost: IConfigHost, event: ListenerEvent, getContext: () => any): INotifyResult | undefined {
    const notifyMgr = cfgHost.notifyMgr;
    if (notifyMgr && (!notifyMgr.hasListeners || notifyMgr.hasListeners())) {
        return notifyMgr.notifyDone(event, getDeferred(getContext));
    }

    return undefined;
}

/**
 * Records a hook that failed (threw or timed out) against the run, so that it survives in the run
 * summary regardless of whether any test result ends up carrying it -- an `afterEach` failing
 * after its test already failed is dropped by `_runAfterEachForAttempt`, and a `beforeAll`/
 * `afterAll` failure belongs to no test at all. Deliberately *not* recorded: skips (`SkipError`),
 * and listener-driven aborts (`AbortError`), neither of which is the hook itself failing.
 * @internal
 */
function _recordHookFailure(runContext: ITestRunContext, hook: IHookDefinition, suite: ITestSuite, currentTest: ITestCase | undefined, hookGroup: string | undefined, err: Error | undefined, timedOut?: boolean): void {
    if (err && (err instanceof SkipError || err instanceof AbortError)) {
        return;
    }

    if (!err && !timedOut) {
        return;
    }

    const failures = runContext.hookFailures || (runContext.hookFailures = []);
    if (err) {
        (runContext.hookErrors || (runContext.hookErrors = [])).push(err);
    }

    failures.push({
        group: hookGroup,
        // Hooks registered without a name (the common `after(() => {...})` form) have nothing
        // better to identify them by than their lifecycle group.
        name: (hook && hook.name) || hookGroup || "hook",
        suite: _getSuitePath(suite),
        test: currentTest ? (currentTest.description || currentTest.id) : undefined,
        timedOut: timedOut || undefined,
        // Captured as plain strings rather than the Error itself: the browser/worker targets
        // return this summary to the CLI over postMessage.
        message: (err && err.message) ? err.message : (timedOut ? "Hook timed out" : "Hook failed"),
        stack: err && err.stack ? err.stack : undefined
    });
}

/**
 * Whether `error` is one already recorded as a hook failure for this run (compared by reference,
 * hence `hookErrors` holding the errors themselves).
 *
 * A failing `beforeAll`/`afterAll` no longer propagates as a throw at all -- it is recorded on the
 * summary and the run continues (see `_applyAfterAllOutcome` and the `beforeAll` failure branch of
 * `_runSuiteAsync`), so nothing routine reaches the run-level catch any more. This remains as the
 * guard for anything that still does: an error already described on the summary resolves rather
 * than rejects, since rejecting would leave the caller with an exception and no results at all,
 * not even for the suites that had already finished. Any *other* error still rejects -- those are
 * genuine runner faults with nothing recorded.
 * @internal
 */
function _isRecordedHookError(runContext: ITestRunContext, error: any): boolean {
    return !!error && !!runContext.hookErrors && arrIndexOf(runContext.hookErrors, error) >= 0;
}

/**
 * Run hooks in sequence
 * @internal
 */
function _runHooksWithResult(hooks: IHookDefinition[], suite: ITestSuite, runContext: ITestRunContext, currentTest?: ITestCase, hookGroup?: string): IExecResp<IHookResponse> | IPromise<IExecResp<IHookResponse>> {
    let aggregateSkip = false;
    let finalResp: IExecResp<IHookResponse>;

    return doAwait(arrForEachAsync(hooks || [], (hook) => {
        if (finalResp) {
            return -1;
        }

        if (!hook || !hook.fn) {
            return;
        }

        try {
            const startResult = _notifyStart(runContext.cfg, eListenerEvent.Hook, () => ({
                type: eListenerEvent.Hook,
                hook,
                suite,
                test: currentTest
            }));

            if (startResult && startResult.action === eListenerAction.Skip) {
                return;
            } else if (startResult && startResult.action === eListenerAction.Abort) {
                finalResp = {
                    err: new AbortError(startResult.reason || "Hook execution aborted by listener")
                };

                return -1;
            }
        } catch (error) {
            if (error instanceof SkipError) {
                aggregateSkip = true;
                return;
            }

            finalResp = { err: error as Error };
            return -1;
        }

        const hookStartTime = Date.now();
        return doAwait(_executeFunctionWithResult(hook.fn, runContext, {
            type: "hook",
            name: hook.name || "hook",
            group: hookGroup,
            suitePath: _metricSuitePath(runContext, suite),
            testId: currentTest && currentTest.id ? currentTest.id : undefined
        }), (resp) => {
            const hookEndTime = Date.now();

            // Recorded *before* the Hook end event is notified, not after: a listener may abort
            // from that event, and an abort short-circuits straight out of this callback -- which
            // meant the very failure the listener was reacting to was the one missing from the run
            // summary. `_recordHookFailure` ignores skips and aborts itself, so this stays a no-op
            // for them.
            _recordHookFailure(runContext, hook, suite, currentTest, hookGroup, resp.err, resp.timedOut);

            try {
                const endResult = _notifyEnd(runContext.cfg, eListenerEvent.Hook, () => ({
                    type: eListenerEvent.Hook,
                    hook,
                    suite,
                    test: currentTest,
                    end: {
                        duration: hookEndTime - hookStartTime,
                        error: resp.err
                    }
                }));

                if (endResult && endResult.action === eListenerAction.Abort) {
                    finalResp = {
                        err: new AbortError(endResult.reason || "Hook aborted by listener")
                    };

                    return -1;
                }
            } catch (error) {
                finalResp = { err: error as Error };
                return -1;
            }

            if (resp.err instanceof SkipError) {
                finalResp = {
                    err: resp.err,
                    skipped: true,
                    v: {
                        skipped: true
                    }
                };

                return -1;
            }

            if (resp.err || resp.timedOut || resp.skipped) {
                // (the failure was recorded above, before the end event could be aborted from)
                finalResp = {
                    err: resp.err,
                    timedOut: resp.timedOut,
                    skipped: resp.skipped,
                    v: {
                        timedOut: resp.timedOut,
                        skipped: resp.skipped
                    }
                };

                return -1;
            }

            return;
        }, (error) => {
            _recordHookFailure(runContext, hook, suite, currentTest, hookGroup, error as Error);
            finalResp = { err: error as Error };
            return -1;
        });
    }), () => {
        return finalResp || {
            v: {
                skipped: aggregateSkip || undefined
            },
            skipped: aggregateSkip || undefined
        };
    }, (error) => {
        return { err: error as Error };
    });
}

function _setAborted(testResult: ITestResult, reason?: any, error?: Error): void {
    testResult.status = TestStatus.Aborted;
    testResult.aborted = true;
    testResult.reason = reason;
    if (error) {
        testResult.error = error;
    }
}

function _applyExecutionResponse(testResult: ITestResult, resp: IExecResp<any>): void {
    if (resp.timedOut) {
        testResult.status = TestStatus.Failed;
        testResult.error = resp.err;
        return;
    }

    if (resp.skipped || resp.err instanceof SkipError) {
        testResult.status = TestStatus.Skipped;
        testResult.error = resp.err;
        return;
    }

    if (resp.err instanceof AbortError) {
        _setAborted(testResult, resp.err.message, resp.err);
        return;
    }

    if (resp.err) {
        testResult.status = TestStatus.Failed;
        testResult.error = resp.err;

        if ((resp.err as any).props) {
            const props = (resp.err as any).props;
            if (props.aborted) {
                _setAborted(testResult, props.abortReason, resp.err);
            }
        }

        return;
    }

    testResult.status = TestStatus.Passed;
}

function _completeTestAttempt(state: ITestAttemptState): void {
    if (!state.completed) {
        state.completed = true;
        if ((state.runContext.cfg as any)._activeTestResult === state.testResult) {
            (state.runContext.cfg as any)._activeTestResult = null;
        }
        state.testResult.endTime = Date.now();
        state.testResult.duration = state.testResult.endTime - state.attemptStartTime;
        state.onComplete(state.testResult);
    }
}

function _runAfterEachForAttempt(state: ITestAttemptState): void {
    const afterHooks = _getHookChain(state.suite, state.runContext).after;
    if (afterHooks.length === 0) {
        _completeTestAttempt(state);
        return;
    }

    doAwait(_runHooksWithResult(afterHooks, state.suite, state.runContext, state.test, "afterEach"), (hookResp) => {
        if ((state.testResult.status === TestStatus.Passed || state.testResult.status === TestStatus.Pending) && (hookResp.err || hookResp.timedOut || hookResp.skipped)) {
            _applyExecutionResponse(state.testResult, hookResp);
        }

        _completeTestAttempt(state);
    }, (error) => {
        if (state.testResult.status === TestStatus.Passed || state.testResult.status === TestStatus.Pending) {
            _applyExecutionResponse(state.testResult, { err: error as Error });
        }

        _completeTestAttempt(state);
    });
}

function _handleTestExecutionComplete(state: ITestAttemptState, resp: IExecResp<any>): void {
    _applyExecutionResponse(state.testResult, resp);

    if (state.testResult.deferredErrors && state.testResult.deferredErrors.length > 0) {
        state.testResult.status = TestStatus.Failed;
        if (!state.testResult.error) {
            state.testResult.error = state.testResult.deferredErrors[0];
        }
    }

    _runAfterEachForAttempt(state);
}

function _handleBeforeEachComplete(state: ITestAttemptState, resp: IExecResp<IHookResponse>): void {
    if (resp.skipped) {
        state.testResult.status = TestStatus.Skipped;
        state.testResult.error = resp.err;
        _completeTestAttempt(state);
        return;
    }

    if (resp.err || resp.timedOut) {
        _applyExecutionResponse(state.testResult, resp);
        _runAfterEachForAttempt(state);
        return;
    }

    doAwait(_executeFunctionWithResult(state.test.fn as HookFunction, state.runContext, {
        type: "test-body",
        name: state.test.description || state.test.id,
        testId: state.test.id,
        suitePath: _metricSuitePath(state.runContext, state.suite)
    }), (testResp) => {
        _handleTestExecutionComplete(state, testResp);
    }, (error) => {
        _handleTestExecutionComplete(state, { err: error as Error });
    });
}

/**
 * Run a single test execution attempt
 * @internal
 */
function _runSingleTestAttemptAsync(test: ITestCase, suite: ITestSuite, runContext: ITestRunContext, onComplete: (resp: ITestResult) => void): void {
    const testResult = runContext.testResult(test);
    let state: ITestAttemptState = {
        test: test,
        suite: suite,
        runContext: runContext,
        testResult: testResult,
        attemptStartTime: Date.now(),
        completed: false,
        onComplete: onComplete
    };

    testResult.startTime = state.attemptStartTime;
    (runContext.cfg as any)._activeTestResult = testResult;

    if (!test.fn) {
        testResult.status = TestStatus.Pending;
        _completeTestAttempt(state);
        return;
    }

    const beforeHooks = _getHookChain(suite, runContext).before;
    doAwait(_runHooksWithResult(beforeHooks, suite, runContext, test, "beforeEach"), (resp) => {
        _handleBeforeEachComplete(state, resp);
    }, (error) => {
        _handleBeforeEachComplete(state, { err: error as Error });
    });
}

function _runSingleTestAttemptWithResult(test: ITestCase, suite: ITestSuite, runContext: ITestRunContext): ITestResult | IPromise<ITestResult> {
    let hasSyncResp = false;
    let syncResp: ITestResult | undefined;
    let asyncResolve: (resp: ITestResult) => void;

    _runSingleTestAttemptAsync(test, suite, runContext, (resp) => {
        if (asyncResolve) {
            asyncResolve(resp);
            return;
        }

        hasSyncResp = true;
        syncResp = resp;
    });

    if (hasSyncResp) {
        return syncResp as ITestResult;
    }

    return createSyncPromise((resolve) => {
        asyncResolve = resolve;
    });
}

function _notifyTestDone(runContext: ITestRunContext, suite: ITestSuite, test: ITestCase, testResult: ITestResult): void {
    const slowThreshold = test.slow;
    const duration = testResult.duration;

    const endResult = _notifyEnd(runContext.cfg, eListenerEvent.Test, () => ({
        type: eListenerEvent.Test,
        test,
        suite,
        end: {
            status: testResult.status as any,
            duration: duration,
            slow: typeof slowThreshold === "number" && typeof duration === "number" ? duration > slowThreshold : undefined,
            slowThreshold: slowThreshold,
            error: testResult.error
        }
    }));

    if (endResult && endResult.action === eListenerAction.Abort) {
        _setAborted(testResult, endResult.reason || "Test aborted by listener", new AbortError(endResult.reason || "Test aborted by listener"));
    }

    // Counted once the listeners have answered, so a test a listener aborts from its end event is counted
    // as aborted -- the status it ends the run with -- rather than as the pass or failure it reported.
    const metrics = runContext.metrics as IRunnerMetricsState;
    if (metrics) {
        if (testResult.status === TestStatus.Passed) {
            metrics.counts.passed++;
        } else if (testResult.status === TestStatus.Failed) {
            metrics.counts.failed++;
        } else if (testResult.status === TestStatus.Skipped) {
            metrics.counts.skipped++;
        } else if (testResult.status === TestStatus.Pending) {
            metrics.counts.pending++;
        } else if (testResult.status === TestStatus.Aborted) {
            metrics.counts.aborted++;
            metrics.counts.failed++;
        }
    }
}

/**
 * Run a single test with retry support
 * @internal
 */
function _runTestAsync(test: ITestCase, suite: ITestSuite, runContext: ITestRunContext): ITestResult | IPromise<ITestResult> {
    const metrics = runContext.metrics as IRunnerMetricsState;
    if (metrics) {
        metrics.counts.tests++;
    }

    return _useMetricScope(runContext, "test", test.description || test.id || "test", () => {
        const testResult = runContext.testResult(test);

        // Excluded by an active filter: not part of this run at all. It is counted nowhere (see
        // _countAll) and, consistently with that, reported nowhere -- no Test event is emitted.
        if (_isTestFiltered(test, suite, runContext)) {
            testResult.status = TestStatus.Skipped;
            return createResolvedPromise(testResult);
        }

        testResult.startTime = Date.now();

        // `it.skip`/`xit`: unlike a filtered-out test this one *is* part of the run and is
        // counted as skipped in the summary, so it has to be reported as such too. Returning
        // early here without notifying (as this used to) left every reporter's totals promising
        // results it would never be handed -- an unsatisfiable TAP plan line most visibly, and
        // the "(skipped)" branches the spec/list reporters already carry were simply unreachable.
        if (test.skip) {
            testResult.status = TestStatus.Skipped;
            testResult.endTime = testResult.startTime;
            testResult.duration = 0;
            _notifyStart(runContext.cfg, eListenerEvent.Test, () => ({
                type: eListenerEvent.Test,
                test,
                suite
            }));
            _notifyTestDone(runContext, suite, test, testResult);
            return createResolvedPromise(testResult);
        }

        const startResult = _notifyStart(runContext.cfg, eListenerEvent.Test, () => ({
            type: eListenerEvent.Test,
            test,
            suite
        }));

        if (startResult && startResult.action === eListenerAction.Skip) {
            testResult.status = TestStatus.Skipped;
            _notifyTestDone(runContext, suite, test, testResult);
            return createResolvedPromise(testResult);
        }

        if (startResult && startResult.action === eListenerAction.Abort) {
            _setAborted(testResult, startResult.reason, new AbortError(startResult.reason || "Test aborted by listener"));
            _notifyTestDone(runContext, suite, test, testResult);
            return createResolvedPromise(testResult);
        }

        let shouldRetry = false;
        return doAwait(doWhileAsync(() => {
            runContext.context = _createTestExecutionContext(_getExecutionTimeout(runContext, suite, test), _getExecutionSlow(runContext, suite, test), _getExecutionRetries(runContext, suite, test));
            runContext.context.currentTest = test;

            return _runSingleTestAttemptWithResult(test, suite, runContext);
        }, () => {
            let retryCount = runContext.context && runContext.context.retries ? runContext.context.retries() : 0;
            let currentRetries = testResult.retries || 0;

            shouldRetry = testResult.status === TestStatus.Failed && currentRetries < retryCount;
            if (shouldRetry) {
                if (metrics) {
                    metrics.counts.retries++;
                }

                if (metrics && metrics._full) {
                    let retryDetail = metrics._retryByTest[test.id];
                    if (!retryDetail) {
                        retryDetail = {
                            testId: test.id,
                            name: test.description || test.id,
                            suitePath: _getSuitePath(suite),
                            retries: 0
                        };
                        metrics._retryByTest[test.id] = retryDetail;
                    }

                    retryDetail.retries++;

                    if (metrics._testWaitStats[test.id]) {
                        metrics._testWaitStats[test.id].retries++;
                    }
                }

                testResult.retries = currentRetries + 1;
                testResult.error = undefined;
                testResult.deferredErrors = undefined;
                testResult.endTime = undefined;
                testResult.duration = undefined;
                testResult.status = TestStatus.Pending;
                testResult.aborted = false;
                testResult.reason = undefined;
            }

            return !shouldRetry;
        }), () => {
            _notifyTestDone(runContext, suite, test, testResult);
            return testResult;
        }, (error) => {
            testResult.status = TestStatus.Failed;
            testResult.error = error as Error;
            _notifyTestDone(runContext, suite, test, testResult);
            return testResult;
        }) as ITestResult | IPromise<ITestResult>;
    }, (result) => (result as ITestResult).error) as ITestResult | IPromise<ITestResult>;
}

function _runAfterAllHooksWithResult(suite: ITestSuite, runContext: ITestRunContext): IExecResp<IHookResponse> | IPromise<IExecResp<IHookResponse>> {
    runContext.context = _createTestExecutionContext(_getExecutionTimeout(runContext, suite));
    return _runHooksWithResult(arrSlice(suite.afterAllHooks || []), suite, runContext, undefined, "afterAll");
}

/**
 * Applies the outcome of a suite's `afterAll` hooks.
 *
 * A failing `afterAll` is recorded on the run summary (by `_runHooksWithResult`) and otherwise left
 * alone: its suite's tests have all already run and reported, and the *next* suite's teardown has
 * nothing to do with this one's, so the run carries on. This used to `throw`, which unwound every
 * enclosing suite and ended the run silently -- a suite that passed cleanly but failed to tear
 * itself down took every test queued behind it with it, counted but never reported. Turning hook
 * failures into a failed *run* is `--fail-on-hook`'s job, off the summary.
 *
 * A listener abort is the exception, and the supported way to stop early: it marks the suite
 * aborted, which `_runNextSuiteWithResult` propagates so the remaining siblings are reported as
 * un-run rather than vanishing.
 * @internal
 */
function _applyAfterAllOutcome(suite: ITestSuite, runContext: ITestRunContext, resp: IExecResp<IHookResponse>): void {
    if (!resp.err && !resp.timedOut) {
        return;
    }

    const suiteResult = runContext.suiteResult(suite);
    if (resp.timedOut) {
        suiteResult.timedOut = true;
    }

    if (resp.err instanceof AbortError) {
        suiteResult.aborted = true;
        suiteResult.reason = resp.err.message;
    }
}

function _runNextSuiteWithResult(suite: ITestSuite, runContext: ITestRunContext, suiteIdx: number): void | IPromise<void> {
    if (suiteIdx >= suite.suites.length) {
        return doAwait(_runAfterAllHooksWithResult(suite, runContext), (resp) => {
            _applyAfterAllOutcome(suite, runContext, resp);
        }) as void | IPromise<void>;
    }

    let failed = false;
    let failedError: any;
    let aborted = false;
    let abortedAtIdx = -1;
    let abortReason: string | undefined;

    return doAwait(arrForEachAsync(suite.suites, (childSuite, idx) => {
        if (idx < suiteIdx || failed || aborted) {
            return (failed || aborted) ? -1 : undefined;
        }

        return doAwait(_runSuiteAsync(childSuite, runContext), () => {
            const childResult = runContext.suiteResult(childSuite);
            if (childResult.aborted) {
                aborted = true;
                abortedAtIdx = idx;
                abortReason = childResult.reason;
                return -1;
            }
        }, (error) => {
            failed = true;
            failedError = error;
            return -1;
        });
    }), () => {
        if (failed) {
            throw failedError;
        }

        if (aborted) {
            // Mark and report any remaining not-yet-run sibling suites (and their descendants)
            // rather than leaving them at their default Pending status, unreported and counted as
            // results no reporter was ever handed -- see _notifyUnrunTest.
            for (let i = abortedAtIdx + 1; i < suite.suites.length; i++) {
                if (!_isSuiteFiltered(suite.suites[i], runContext)) {
                    _notifyUnrunSuiteTree(suite.suites[i], runContext, true, abortReason);
                }
            }
        }

        return doAwait(_runAfterAllHooksWithResult(suite, runContext), (resp) => {
            _applyAfterAllOutcome(suite, runContext, resp);
        });
    }, (error) => {
        throw error;
    }) as void | IPromise<void>;
}

function _runNextTestWithResult(suite: ITestSuite, runContext: ITestRunContext, testIdx: number): void | IPromise<void> {
    if (testIdx >= suite.tests.length) {
        return _runNextSuiteWithResult(suite, runContext, 0);
    }

    let failed = false;
    let failedError: any;
    let aborted = false;
    let abortedAtIdx = -1;
    let abortReason: string | undefined;

    return doAwait(arrForEachAsync(suite.tests, (test, idx) => {
        if (idx < testIdx || failed || aborted) {
            return (failed || aborted) ? -1 : undefined;
        }

        return doAwait(_runTestAsync(test, suite, runContext), () => {
            const testResult = runContext.testResult(test);
            if (testResult.aborted) {
                aborted = true;
                abortedAtIdx = idx;
                abortReason = testResult.reason;
                return -1;
            }
        }, (error) => {
            failed = true;
            failedError = error;
            return -1;
        });
    }), () => {
        if (failed) {
            throw failedError;
        }

        if (aborted) {
            // Note: the containing suite's own result is deliberately left untouched here -- a
            // test-level abort only halts the remaining work *within* this suite (sibling tests
            // and child suites below), it does not mark the suite itself as aborted.
            // Mark and report any remaining not-yet-run sibling tests, and every child suite
            // (recursively), rather than leaving them at their default Pending status,
            // unreported and counted as results no reporter was ever handed -- see
            // _notifyUnrunTest.
            _notifyUnrunSuiteBody(suite, runContext, true, abortReason, Date.now(), abortedAtIdx + 1);
        }

        return _runNextSuiteWithResult(suite, runContext, aborted ? suite.suites.length : 0);
    }, (error) => {
        throw error;
    });
}

/**
 * Marks and reports a single test that never ran -- because its suite was skipped, or because
 * something earlier aborted the run out from under it.
 *
 * Every test `_countAll` counted has to produce a Test done event, or the totals promise results
 * that never arrive: an unsatisfiable TAP plan line, progress-style bars stuck short of 100%.
 * Since the plan is emitted from `start.totalTests` before a single test runs, "just don't count
 * it" is not available as an answer once the run is underway -- these have to be reported.
 *
 * A test that never ran is reported as **skipped**, not as failed, whichever of the two reasons
 * put it here. `--bail` on a suite whose first test fails is one real failure and a pile of tests
 * that were never given a chance, and that is what it now says; counting the collateral as
 * failures turned one broken test into three on every CI dashboard. When the cause was an abort
 * the result still carries `aborted` and the abort `reason`, so nothing about *why* it did not run
 * is lost -- only the pass/fail arithmetic changed.
 * @internal
 */
function _notifyUnrunTest(test: ITestCase, suite: ITestSuite, runContext: ITestRunContext, aborted: boolean, reason: string | undefined, now: number): void {
    const testResult = runContext.testResult(test);
    testResult.status = TestStatus.Skipped;
    testResult.startTime = now;
    testResult.endTime = now;
    testResult.duration = 0;

    if (aborted) {
        testResult.aborted = true;
        testResult.reason = reason;
    }

    _notifyStart(runContext.cfg, eListenerEvent.Test, () => ({
        type: eListenerEvent.Test,
        test,
        suite
    }));
    _notifyTestDone(runContext, suite, test, testResult);
}

/**
 * Reports the contents of a suite that will not run any further: its own remaining tests (from
 * `fromTestIdx` on, so a suite that aborted part-way through reports only what was left) and every
 * child suite beneath it.
 *
 * Tests and child suites an active filter excluded are left out, to stay consistent with
 * `_countAll`, which does not count them.
 * @returns the number of tests reported as skipped.
 * @internal
 */
function _notifyUnrunSuiteBody(suite: ITestSuite, runContext: ITestRunContext, aborted: boolean, reason: string | undefined, now: number, fromTestIdx: number): number {
    let skipped = 0;

    for (let lp = fromTestIdx; lp < suite.tests.length; lp++) {
        const test = suite.tests[lp];
        if (_isTestFiltered(test, suite, runContext)) {
            continue;
        }

        _notifyUnrunTest(test, suite, runContext, aborted, reason, now);
        skipped++;
    }

    arrForEach(suite.suites, (childSuite) => {
        if (!_isSuiteFiltered(childSuite, runContext)) {
            skipped += _notifyUnrunSuiteTree(childSuite, runContext, aborted, reason);
        }
    });

    return skipped;
}

/**
 * Emits the full Suite start / Test / Suite end sequence for a subtree that never ran -- a
 * `describe.skip`ed suite, a suite a listener skipped or aborted, or one the abort of an earlier
 * sibling never left room for -- marking every result as it goes. See {@link _notifyUnrunTest} for
 * why these are reported at all, and why they are reported as skipped.
 *
 * Used for suites whose own `Suite` start event has *not* been emitted yet; where it has (the
 * early-exit paths inside `_runSuiteAsync`), `_notifyUnrunSuiteBody` reports the contents and the
 * caller closes the suite itself with its own `Suite` end.
 * @returns the number of tests reported as skipped.
 * @internal
 */
function _notifyUnrunSuiteTree(suite: ITestSuite, runContext: ITestRunContext, aborted: boolean, reason?: string): number {
    const isRootSuite = !suite.parent;
    const now = Date.now();
    const suiteResult = runContext.suiteResult(suite);
    suiteResult.startTime = now;
    suiteResult.endTime = now;
    suiteResult.duration = 0;

    if (aborted) {
        suiteResult.aborted = true;
        suiteResult.reason = reason;
    } else {
        suiteResult.skipped = true;
    }

    if (!isRootSuite) {
        _notifyStart(runContext.cfg, eListenerEvent.Suite, () => ({
            type: eListenerEvent.Suite,
            suite
        }));
    }

    const skipped = _notifyUnrunSuiteBody(suite, runContext, aborted, reason, now, 0);

    if (!isRootSuite) {
        _notifySuiteEnd(suite, runContext, skipped, 0);
    }

    return skipped;
}

/**
 * Emits the `Suite` end event for a suite that ran nothing, so that every `Suite` start has a
 * matching end. Suites that did run tests build their own end context from the real per-test
 * results (see `_runSuiteAsync`); here everything counted is a skip by definition.
 * @internal
 */
function _notifySuiteEnd(suite: ITestSuite, runContext: ITestRunContext, skipped: number, duration: number): void {
    _notifyEnd(runContext.cfg, eListenerEvent.Suite, () => ({
        type: eListenerEvent.Suite,
        suite,
        end: {
            passed: 0,
            failed: 0,
            skipped,
            pending: 0,
            duration
        }
    }));
}

/**
 * Run a test suite
 * @internal
 */
function _runSuiteAsync(suite: ITestSuite, runContext: ITestRunContext): ISuiteResult | IPromise<ISuiteResult> {
    const metrics = runContext.metrics as IRunnerMetricsState;
    if (metrics) {
        metrics.counts.suites++;
    }

    return _useMetricScope(runContext, "suite", suite.description || suite.id || "suite", () => {
        const suiteResult = runContext.suiteResult(suite);
        const isRootSuite = !suite.parent;

        if (!_canRunSuite(suite, runContext)) {
            suiteResult.skipped = true;

            // A suite excluded by a filter is reported nowhere and counted nowhere. A
            // `describe.skip`ed one is counted, so it is also reported -- see
            // _notifyUnrunSuiteTree.
            if (suite.skip && !_isSuiteFiltered(suite, runContext)) {
                _notifyUnrunSuiteTree(suite, runContext, false);
            }

            return createResolvedPromise(suiteResult);
        }

        return useHost(runContext.cfg, (cfgHost: IConfigHost) => {
            const suiteStartTime = Date.now();
            suiteResult.startTime = suiteStartTime;

            const notifyResult = isRootSuite ? null : _notifyStart(cfgHost, eListenerEvent.Suite, () => ({
                type: eListenerEvent.Suite,
                suite
            }));

            // Both early exits below have already emitted this suite's `Suite` start, so they
            // report their contents and then close the suite with a matching `Suite` end --
            // leaving the start unmatched (as the skip path used to) hands every reporter a suite
            // it can never finish rendering.
            if (notifyResult && notifyResult.action === eListenerAction.Skip) {
                const skipNow = Date.now();
                suiteResult.skipped = true;
                suiteResult.endTime = skipNow;
                suiteResult.duration = 0;
                const skipped = _notifyUnrunSuiteBody(suite, runContext, false, undefined, skipNow, 0);
                if (!isRootSuite) {
                    _notifySuiteEnd(suite, runContext, skipped, 0);
                }

                return suiteResult;
            }

            if (notifyResult && notifyResult.action === eListenerAction.Abort) {
                suiteResult.aborted = true;
                suiteResult.reason = notifyResult.reason;
                const abortNow = Date.now();
                suiteResult.startTime = abortNow;
                suiteResult.endTime = abortNow;
                suiteResult.duration = 0;
                const aborted = _notifyUnrunSuiteBody(suite, runContext, true, notifyResult.reason, abortNow, 0);
                if (!isRootSuite) {
                    _notifySuiteEnd(suite, runContext, aborted, 0);
                }

                return suiteResult;
            }

            runContext.context = _createTestExecutionContext(_getExecutionTimeout(runContext, suite));

            return doAwait(_runHooksWithResult(arrSlice(suite.beforeAllHooks || []), suite, runContext, undefined, "beforeAll"), (beforeResp) => {
                if (beforeResp.skipped) {
                    const now = Date.now();
                    suiteResult.skipped = true;
                    suiteResult.endTime = now;
                    suiteResult.duration = now - suiteStartTime;

                    // Reported before `afterAll` runs and the suite is closed, matching the order
                    // the normal path below produces (tests, then afterAll, then the suite's end).
                    const skipped = _notifyUnrunSuiteBody(suite, runContext, false, undefined, now, 0);

                    return doAwait(_runAfterAllHooksWithResult(suite, runContext), () => {
                        if (!isRootSuite) {
                            _notifySuiteEnd(suite, runContext, skipped, suiteResult.duration);
                        }

                        return suiteResult;
                    });
                }

                if (beforeResp.err || beforeResp.timedOut) {
                    const now = Date.now();
                    const isAbort = beforeResp.err instanceof AbortError;

                    if (beforeResp.timedOut) {
                        suiteResult.timedOut = true;
                    }

                    suiteResult.endTime = now;
                    suiteResult.duration = now - suiteStartTime;

                    if (isAbort) {
                        suiteResult.aborted = true;
                        suiteResult.reason = beforeResp.err && beforeResp.err.message;
                    }

                    /*
                     * A failed `beforeAll` means this suite's own tests cannot run -- its setup did
                     * not complete -- so they are reported (as skipped, like every other never-ran
                     * test; see _notifyUnrunTest) and the suite is closed. It does **not** stop the
                     * rest of the run: sibling suites have their own setup and are unaffected by
                     * this one's, so the run carries on and the hook failure is reported on the
                     * summary. This used to `throw`, which unwound every enclosing suite and
                     * silently ended the run -- tests queued after it were counted but never
                     * reported, and the run still exited 0. Promoting the failure to a *run*
                     * failure is `--fail-on-hook`'s job, and it reads the summary, not this.
                     *
                     * A listener abort is the one thing that still stops here: it arrives as an
                     * AbortError and propagates through the same `suiteResult.aborted` path an
                     * aborted test uses, so the suites left behind are reported rather than
                     * silently dropped.
                     */
                    const unrun = _notifyUnrunSuiteBody(suite, runContext, isAbort, suiteResult.reason, now, 0);

                    return doAwait(_runAfterAllHooksWithResult(suite, runContext), () => {
                        if (!isRootSuite) {
                            _notifySuiteEnd(suite, runContext, unrun, suiteResult.duration);
                        }

                        return suiteResult;
                    });
                }

                return doAwait(_runNextTestWithResult(suite, runContext, 0), () => {
                    const suiteEndTime = Date.now();
                    suiteResult.endTime = suiteEndTime;
                    suiteResult.duration = suiteEndTime - suiteStartTime;

                    let passed = 0;
                    let failed = 0;
                    let skipped = 0;
                    let pending = 0;

                    arrForEach(suite.tests, (test) => {
                        // Excluded by an active filter -- not part of this run, so not counted
                        // on this suite's end context either (see _countAll).
                        if (_isTestFiltered(test, suite, runContext)) {
                            return;
                        }

                        const testResult = runContext.testResult(test);
                        if (testResult.status === TestStatus.Passed) {
                            passed++;
                        } else if (testResult.status === TestStatus.Failed || testResult.status === TestStatus.Aborted) {
                            failed++;
                        } else if (testResult.status === TestStatus.Skipped) {
                            skipped++;
                        } else if (testResult.status === TestStatus.Pending) {
                            pending++;
                        }
                    });

                    const endResult = isRootSuite ? null : _notifyEnd(cfgHost, eListenerEvent.Suite, () => ({
                        type: eListenerEvent.Suite,
                        suite,
                        end: {
                            passed,
                            failed,
                            skipped,
                            pending,
                            duration: suiteResult.duration
                        }
                    }));

                    if (endResult && endResult.action === eListenerAction.Abort) {
                        suiteResult.aborted = true;
                        suiteResult.reason = endResult.reason;
                    }

                    return suiteResult;
                });
            });
        }) as ISuiteResult | IPromise<ISuiteResult>;
    }) as ISuiteResult | IPromise<ISuiteResult>;
}

function _getSummary(rootSuite: ITestSuite, runContext: ITestRunContext): IListenerContext {
    const endContext: IListenerEndContext = {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        pending: 0,
        start: runContext.start
    };

    if (!isUndefined(runContext.end)) {
        endContext.end = runContext.end;
        endContext.duration = runContext.end - runContext.start;
    }

    if (runContext.hookFailures && runContext.hookFailures.length > 0) {
        endContext.hookFailures = arrSlice(runContext.hookFailures);
    }

    const results: IListenerContext = {
        type: eListenerEvent.Run,
        suite: rootSuite,
        end: endContext
    };

    const countTests = (suite: ITestSuite, parentSkipped: boolean) => {
        // Filtered-out suites/tests are excluded from every total here for the same reason
        // _countAll excludes them from `totalTests`: they are not part of this run, and counting
        // them would make the summary disagree with both the Run start context and the Test
        // events the reporters actually saw.
        if (_isSuiteFiltered(suite, runContext)) {
            return;
        }

        const suiteResult = runContext.suiteResult(suite);
        const isSkipped = parentSkipped || !!suiteResult.skipped;

        arrForEach(suite.tests, (test) => {
            if (_isTestFiltered(test, suite, runContext)) {
                return;
            }

            const testResult = runContext.testResult(test);
            endContext.total++;

            if (isSkipped) {
                endContext.skipped++;
            } else if (testResult.status === TestStatus.Passed) {
                endContext.passed++;
            } else if (testResult.status === TestStatus.Failed || testResult.status === TestStatus.Aborted) {
                endContext.failed++;
            } else if (testResult.status === TestStatus.Skipped) {
                endContext.skipped++;
            } else if (testResult.status === TestStatus.Pending) {
                endContext.pending++;
            }
        });

        arrForEach(suite.suites, (childSuite) => {
            countTests(childSuite, isSkipped);
        });
    };

    countTests(rootSuite, false);
    return results;
}

/**
 * The number of tests this run will actually consider -- ie. every registered test *minus* the
 * ones an active filter (`--grep`, an explicit UI selection, ...) excluded. Filtered-out tests
 * are not part of the run at all: they emit no Test start/done notification (see
 * `_runTestAsync`), so counting them here would give every reporter a `totalTests` that no
 * amount of test events could ever add up to -- an unsatisfiable TAP plan line, progress bars
 * that stop short of 100%, and a total that disagrees with the summary. A test excluded by
 * `.skip` is *not* filtered out in this sense: it is part of the run and reported as skipped.
 * @internal
 */
function _countAll(runContext: ITestRunContext): number {
    let totalTests = 0;

    function _countAllSuites(suite: ITestSuite) {
        if (_isSuiteFiltered(suite, runContext)) {
            return;
        }

        arrForEach(suite.tests, (test) => {
            if (!_isTestFiltered(test, suite, runContext)) {
                totalTests++;
            }
        });

        arrForEach(suite.suites, (childSuite) => {
            _countAllSuites(childSuite);
        });
    }

    _countAllSuites(runContext.root);

    return totalTests;
}

/**
 * Whether an active filter excluded this suite -- `suite.skip` deliberately not considered, see
 * {@link _countAll}.
 * @internal
 */
function _isSuiteFiltered(suite: ITestSuite, runContext: ITestRunContext): boolean {
    let filtered = false;
    if (runContext.filters && runContext.filters.length > 0) {
        arrForEach(runContext.filters, (filter) => {
            if (filter.canRunSuite && !filter.canRunSuite(suite)) {
                filtered = true;
                return -1;
            }
        });
    }

    return filtered;
}

/**
 * Whether an active filter excluded this test -- `test.skip` deliberately not considered, see
 * {@link _countAll}.
 * @internal
 */
function _isTestFiltered(test: ITestCase, parent: ITestSuite, runContext: ITestRunContext): boolean {
    let filtered = false;
    if (runContext.filters && runContext.filters.length > 0) {
        arrForEach(runContext.filters, (filter) => {
            if (filter.canRunTest && !filter.canRunTest(test, parent)) {
                filtered = true;
                return -1;
            }
        });
    }

    return filtered;
}

function _canRunSuite(suite: ITestSuite, runContext: ITestRunContext): boolean {
    return !suite.skip && !_isSuiteFiltered(suite, runContext);
}

/**
 * Create a test runner for executing test suites
 * @param rootSuite - The root test suite to execute
 * @param parentHost - Optional parent configuration host the runner's own (isolated) host is cloned from
 * @param options - Optional runner options, see {@link ITestRunnerOptions}
 * @returns A test runner instance
 * @since 0.2.0
 */
export function createTestRunner(rootSuite: ITestSuite, parentHost?: IConfigHost, options?: ITestRunnerOptions): ITestRunner {
    let _runnerHost: IConfigHost;
    let _metrics = _createRunnerMetricsState(!!(options && options.metrics));
    let _testResults = new Map<ITestCase, ITestResult>();
    let _suiteResults = new Map<ITestSuite, ISuiteResult>();
    let _filters: ITestFilter[] | null = null;

    function _getTestResult(test: ITestCase): ITestResult {
        let result = _testResults.get(test);
        if (!result) {
            result = {
                test,
                status: test.skip ? TestStatus.Skipped : TestStatus.Pending,
                aborted: false
            };

            _testResults.set(test, result);
        }

        return result;
    }

    function _getSuiteResult(suite: ITestSuite): ISuiteResult {
        let result = _suiteResults.get(suite);
        if (!result) {
            result = {
                suite,
                testResults: [],
                suiteResults: []
            };

            _suiteResults.set(suite, result);
        }

        return result;
    }

    function _getRunnerHost(): IConfigHost {
        function _createIsolatedHost(baseHost: IConfigHost): IConfigHost {
            const hostClone = baseHost.clone();

            return {
                opts: hostClone.opts,
                notifyMgr: createNotifyMgr(),
                clone: () => {
                    return _createIsolatedHost(hostClone);
                }
            };
        }

        if (!_runnerHost) {
            _runnerHost = parentHost ? parentHost.clone() : _createIsolatedHost(_gblConfigHost());
        }

        return _runnerHost;
    }

    let runContext: _ITestRunContext = {
        root: rootSuite,
        cfg: null,
        start: 0,
        context: _createTestExecutionContext(),
        metrics: _metrics,
        suiteResult: _getSuiteResult,
        testResult: _getTestResult
    };

    let testRunner: ITestRunner = {
        addFilter(filter: ITestFilter): IRemovable {
            if (!_filters) {
                _filters = [];
                runContext.filters = _filters;
            }

            _filters.push(filter);

            let result: IRemovable = {
                rm: () => {
                    if (_filters) {
                        const idx = arrIndexOf(_filters, filter);
                        if (idx >= 0) {
                            if (_filters.length === 1) {
                                _filters = null;
                                runContext.filters = undefined;
                            } else {
                                _filters.splice(idx, 1);
                            }
                        }
                    }

                    result.rm = _noOpFn;
                }
            };

            return result;
        },

        run(): IPromise<void> {
            return useHost(_getRunnerHost(), (cfgHost: IConfigHost) => {
                runContext.cfg = cfgHost;
                runContext.context = _createTestExecutionContext(_getDefaultTimeout(runContext));
                runContext.start = Date.now();
                _resetRunnerMetrics(_metrics, runContext.start);
                runContext._hookChains = {};

                // Discard results from any previous run() on this runner -- otherwise stale
                // per-test/per-suite state (aborted, retries, deferredErrors, ...) from a prior
                // run would leak into this one (eg. a watch-mode rerun after an earlier abort).
                _testResults.clear();
                _suiteResults.clear();
                runContext.hookFailures = undefined;
                runContext.hookErrors = undefined;

                const runMetricScope = _startMetricScope(runContext, "run", "run");

                let totalTests = _countAll(runContext);
                const result = _notifyStart(cfgHost, eListenerEvent.Run, () => ({
                    type: eListenerEvent.Run,
                    suite: runContext.root,
                    start: {
                        totalTests
                    }
                }));

                if (result && (result.action === eListenerAction.Skip || result.action === eListenerAction.Abort)) {
                    return createSyncPromise<void>((resolve) => {
                        runContext.end = Date.now();
                        _metrics.endTime = runContext.end;
                        _metrics.runDuration = runContext.end - runContext.start;
                        _metrics.criticalPathDuration = _getCriticalPathDuration(_metrics);
                        const summary = _getSummary(rootSuite, runContext);
                        _notifyEnd(cfgHost, eListenerEvent.Run, () => summary);
                        _endMetricScope(runContext, runMetricScope, false, 0);
                        resolve();
                    });
                }

                return createPromise<void>((resolve, reject) => {
                    let completed = false;

                    const _complete = (error?: any) => {
                        if (completed) {
                            return;
                        }

                        completed = true;
                        runContext.end = Date.now();
                        _metrics.endTime = runContext.end;
                        _metrics.runDuration = runContext.end - runContext.start;
                        _metrics.criticalPathDuration = _getCriticalPathDuration(_metrics);
                        const summary = _getSummary(rootSuite, runContext);
                        _notifyEnd(cfgHost, eListenerEvent.Run, () => summary);

                        // A failing before/after hook unwound the run to get here, but it is
                        // already fully described on the summary -- see _isRecordedHookError.
                        const failed = !!error && !_isRecordedHookError(runContext, error);
                        _endMetricScope(runContext, runMetricScope, failed, 0, failed ? error as Error : undefined);

                        if (failed) {
                            reject(error);
                        } else {
                            resolve();
                        }
                    };

                    // An entirely synchronous suite unwinds synchronously too, so a `beforeAll`/
                    // `afterAll` throw can land here rather than on doAwait's rejection callback
                    // -- uncaught, that would escape the executor and reject this promise before
                    // the run was ever finalized (no end timestamp, no Run "done" notification,
                    // no reporter output).
                    try {
                        doAwait(_runSuiteAsync(runContext.root, runContext), () => {
                            _complete();
                        }, (error) => {
                            _complete(error);
                        });
                    } catch (error) {
                        _complete(error);
                    }
                });
            });
        },

        getResults(): ITestSummary {
            const summary = _getSummary(rootSuite, runContext);
            let endValues = summary.end || {};

            const results: ITestSummary = {
                total: endValues.total || 0,
                passed: endValues.passed || 0,
                failed: endValues.failed || 0,
                skipped: endValues.skipped || 0,
                pending: endValues.pending || 0,
                duration: endValues.duration || 0,
                start: endValues.start || 0,
                end: endValues.end || 0
            };

            // Only present when something actually failed, so an all-passing run's summary (and
            // the JSON reporters built from it) stays byte-for-byte what it was before.
            if (endValues.hookFailures && endValues.hookFailures.length > 0) {
                results.hookFailures = endValues.hookFailures;
            }

            return results;
        },

        getRootSuite(): ITestSuite {
            return rootSuite;
        },

        addListener(listener: IListener): void {
            _getRunnerHost().notifyMgr.addListener(listener);
        },

        removeListener(listener: IListener): void {
            _getRunnerHost().notifyMgr.removeListener(listener);
        },

        addReporter(reporter: IListener): void {
            _getRunnerHost().notifyMgr.addListener(reporter);
        },

        removeReporter(reporter: IListener): void {
            _getRunnerHost().notifyMgr.removeListener(reporter);
        },

        getTestResult(test: ITestCase): ITestResult | undefined {
            return _testResults.get(test);
        },

        getSuiteResult(suite: ITestSuite): ISuiteResult | undefined {
            return _suiteResults.get(suite);
        },

        getMetrics(): IRunnerMetrics {
            return _cloneRunnerMetrics(_metrics);
        }
    };

    const onlyFilter = createOnlyFilter(rootSuite);
    if (onlyFilter) {
        testRunner.addFilter(onlyFilter);
    }

    return testRunner;
}
