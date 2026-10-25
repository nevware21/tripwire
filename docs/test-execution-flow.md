# Test Execution Flow and Promise Creation

This document explains how the Tripwire test runner executes tests and manages promise creation for both synchronous and asynchronous operations.

## Overview

The Tripwire test runner uses a **sync-or-async return pattern** where test functions and hooks return either a synchronous result or a `Promise`. The key insight is that **promises are created only when necessary** based on the actual runtime behavior of your code—not based on function declarations.

This design optimizes performance by avoiding unnecessary promise allocations for synchronous test suites while fully supporting asynchronous execution patterns.

## Core Execution Model

### The Sync-or-Async Pattern

Functions in the runner return `T | IPromise<T>`, where the actual type is determined at runtime:

```typescript
// Return type: IExecResp | IPromise<IExecResp>
// Actual type determined by function behavior, not declaration
```

The framework uses `doAwait` to handle both cases:
- **If result is synchronous**: continuation executes immediately (no promise overhead)
- **If result is a promise**: continuation chains asynchronously

## When Promises ARE Created

Promises are allocated in exactly **three scenarios**:

### Scenario 1: Function Returns a Promise

When a hook or test function explicitly returns a promise:

```typescript
// Using async/await
test(async () => {
    const response = await fetch('/api/data');
    assert.equal(response.status, 200);
});

// Using .then()
test(() => {
    return fetch('/api/data').then(response => {
        assert.equal(response.status, 200);
    });
});

// Using manual Promise
test(() => {
    return new Promise((resolve) => {
        setTimeout(() => {
            assert.equal(true, true);
            resolve();
        }, 100);
    });
});
```

**Result:** ✅ **Promise is created** and chained via `doAwait`

Implementation:
```typescript
const result = fn.call(theContext);  // fn returns Promise
if (isPromiseLike(result)) {
    return doAwait(result, onResolve, onReject);  // ← PROMISE CHAIN
}
```

---

### Scenario 2: Done Callback Called Asynchronously

When a function accepts the `done` callback but doesn't call it immediately:

```typescript
// Async completion via setTimeout
test((done) => {
    setTimeout(() => {
        assert.equal(true, true);
        done();
    }, 100);
});

// Async completion via external event
beforeEach((done) => {
    someEmitter.once('ready', () => {
        done();
    });
});

// Async completion via async operation
test((done) => {
    fetch('/api/data').then(() => {
        assert.equal(true, true);
        done();
    });
});
```

**Result:** ✅ **Promise is created** to wait for delayed `done` call

Implementation:
```typescript
const useDone = fn.length > 0;  // Check if function accepts done callback
const result = useDone ? fn.call(theContext, done) : fn.call(theContext);

if (!isPromiseLike(result) && useDone && !completed) {
    // done was not called inline
    return createSyncPromise((resolve) => {
        asyncResolve = resolve;  // ← PROMISE CREATED to await done
    });
}
```

**Race Protection:** If `done()` is called before the promise resolver is attached, the resolver is called immediately upon attachment, preventing lost completions.

---

### Scenario 3: Timeout Handler (Implicit)

When a function uses the done callback, a timeout handler is automatically created to prevent infinite waits:

```typescript
test((done) => {
    // If done is never called, test times out after the configured timeout (default: 2000ms)
    setTimeout(() => {
        assert.equal(true, true);
        done();
    }, 10);
});
```

**Result:** Timeout handler creates an implicit promise to represent the async completion window

---

## When Promises are NOT Created

Promises are **not** allocated in these scenarios:

### Scenario 1: Synchronous Functions Without Done Callback

Function has arity 0 (no `done` parameter) and returns synchronously:

```typescript
test(() => {
    assert.equal(1 + 1, 2);
    // No return value, no done callback
});

beforeEach(() => {
    someValue = 0;
    // Synchronous side effect
});
```

**Implementation:**
```typescript
const useDone = fn.length > 0;  // false, fn.length = 0
const result = fn.call(theContext);  // fn.length = 0, no done passed

if (!isPromiseLike(result) && !useDone) {
    return _complete({});  // ← NO PROMISE CREATED
}
```

---

### Scenario 2: Synchronous Functions With Done Callback Called Inline

Function accepts `done` but calls it synchronously:

```typescript
test((done) => {
    assert.equal(1 + 1, 2);
    done();  // Called immediately
});

afterEach((done) => {
    cleanup();
    done();  // Called synchronously
});
```

**Implementation:**
```typescript
const useDone = fn.length > 0;  // true, fn.length = 1
const result = fn.call(theContext, done);  // passed done callback

if (completed) {  // done was called inline
    return syncResp;  // ← NO PROMISE CREATED
}
```

---

### Scenario 3: Sync Functions in Hook Chains

When hooks execute synchronously, `doAwait` detects the non-promise result and runs the next hook immediately:

```typescript
beforeEach(() => { order.push('hook1'); });
beforeEach(() => { order.push('hook2'); });
test(() => { order.push('test'); });
afterEach(() => { order.push('cleanup'); });

// Result: order = ['hook1', 'hook2', 'test', 'cleanup']
// All executed synchronously without creating promises
```

---

## Promise Creation Summary

| Scenario | Code Pattern | Promise Created? | Why |
|----------|--------------|------------------|-----|
| Pure sync | `test(() => { assert(true); })` | ❌ No | No return value, no done usage |
| Sync with inline done | `test((done) => { assert(true); done(); })` | ❌ No | Done called synchronously |
| Async/await | `test(async () => { await delay(10); })` | ✅ Yes | Function returns promise |
| Async with done callback | `test((done) => { setTimeout(() => done(), 100); })` | ✅ Yes | Promise waits for delayed done |
| Promise return | `test(() => Promise.resolve())` | ✅ Yes | Function returns promise |
| Sync in chain | Hook returns sync, next hook added | ❌ No | doAwait short-circuits |
| Mixed suite | Some sync, some async tests | ✅ Yes | Only if any test/hook is async |

---

## Hierarchical Test Execution Flow

Tests execute in a structured hierarchy:

```
_runSuiteAsync(suite)
│
├─ beforeAll hooks
│  └─ Each hook: _executeFunctionWithResult
│     ├─ Returns sync if: no promise returned AND done called inline
│     └─ Returns promise if: promise returned OR done pending
│
├─ Tests (per test)
│  ├─ beforeEach hooks (from parent suites)
│  ├─ Test execution: _executeFunctionWithResult
│  ├─ afterEach hooks (from parent suites)
│  └─ Retry loop if test fails (configurable)
│
├─ Child suites
│  └─ Recursive: _runSuiteAsync per child (same hierarchy)
│
└─ afterAll hooks
   └─ Each hook: _executeFunctionWithResult
```

### Function Detection with Arity Checking

The framework uses JavaScript function **arity** (parameter count) to determine execution style:

```typescript
const useDone = fn.length > 0;  // Check parameter count

if (useDone) {
    // fn has parameters, pass done callback: fn(done)
    result = fn.call(theContext, done);
} else {
    // fn has no parameters, don't pass done
    result = fn.call(theContext);
}
```

This means:
- `test(() => {})` → arity 0 → no done callback
- `test((done) => {})` → arity 1 → done callback provided
- `test((done, other) => {})` → arity 2 → done callback provided (extra params ignored)

---

## Promise Chain Example: Mixed Sync/Async Suite

```typescript
describe('Mixed Test Suite', () => {
    beforeAll(() => { 
        // Sync execution
    });
    
    test('sync test', () => {
        assert(true);
    });
    
    test('async test', async () => {
        await delay(100);
        assert(true);
    });
    
    test('done-callback test', (done) => {
        setTimeout(() => done(), 100);
    });
    
    afterAll(() => {
        // Sync execution
    });
});
```

**Execution Timeline:**
```
beforeAll (sync)
  ↓ NO PROMISE
sync test (sync)
  ↓ NO PROMISE
async test (returns Promise)
  ↓ PROMISE CREATED & CHAINED
[waits 100ms]
  ↓ promise resolves
done-callback test (awaits done)
  ↓ PROMISE CREATED
[waits for setTimeout]
  ↓ done() called, promise resolves
afterAll (sync)
  ↓ NO PROMISE

Final result: IPromise<ISuiteResult>
(because async test and done-callback test created promises)
```

---

## Testing Patterns

### Pattern 1: Pure Synchronous Tests

Best for: Unit tests with no I/O

```typescript
describe('Synchronous Tests', () => {
    it('should add numbers', () => {
        assert.equal(add(2, 3), 5);
    });
    
    it('should validate inputs', () => {
        assert.throws(() => add('a', 3));
    });
});

// ✅ FAST: No promise overhead
```

---

### Pattern 2: Async/Await Tests

Best for: Tests with async/await code

```typescript
describe('Async Tests', () => {
    it('should fetch data', async () => {
        const data = await fetchData();
        assert.equal(data.status, 'success');
    });
    
    it('should handle errors', async () => {
        const error = await assert.throwsAsync(() => fetchData());
        assert.equal(error.message, 'Network error');
    });
});

// ✅ CLEAN: Natural async/await syntax
```

---

### Pattern 3: Done Callback Tests

Best for: Legacy code or callback-based APIs

```typescript
describe('Callback Tests', () => {
    it('should handle callbacks', (done) => {
        asyncFunction((err, result) => {
            assert.isUndefined(err);
            assert.equal(result, 'success');
            done();
        });
    });
    
    it('should report callback errors', (done) => {
        asyncFunction((err, result) => {
            assert.equal(err.message, 'Failed');
            done(err);  // or done.fail(err)
        });
    });
});

// ✅ COMPATIBLE: Works with callback APIs
```

---

### Pattern 4: Mixed Sync/Async

Best for: Realistic test suites

```typescript
describe('Mixed Pattern Suite', () => {
    // Sync setup
    beforeEach(() => {
        testData = { count: 0 };
    });
    
    // Sync test
    it('should initialize', () => {
        assert.equal(testData.count, 0);
    });
    
    // Async test
    it('should increment async', async () => {
        await incrementAsync(testData);
        assert.equal(testData.count, 1);
    });
    
    // Done callback test
    it('should handle callbacks', (done) => {
        incrementCallback(testData, () => {
            assert.equal(testData.count, 2);
            done();
        });
    });
});

// ✅ OPTIMAL: Promises only where needed
```

---

## Performance Implications

### Sync-Heavy Suites
- **No promise allocation** for synchronous operations
- **No microtask queue overhead**
- **Reduced memory usage**
- **Faster execution** (direct function call stack)

Example: 100 sync tests = 0 promises created

---

### Async-Heavy Suites
- **Promises created only for actual async operations**
- **Iterator-based progression** avoids recursion depth limits
- **Proper error handling** throughout chain

Example: 50 sync + 50 async tests = 50 promises created (not 100)

---

### Mixed Suites
- **Optimal allocation**: promises only where needed
- **Sync tests before/after async ones stay synchronous**
- **No artificial promise wrapping**

---

## Timeout Handling

Every test and hook has a **default timeout of 2000ms**:

```typescript
// Using done callback - timeout guards against infinite wait
test((done) => {
    // If done() never called, test fails after 2000ms
    setTimeout(() => done(), 10000);  // Will timeout
});

// Using async/await - timeout still applies
test(async () => {
    // If function doesn't complete within 2000ms, test fails
    await heavyComputation();
});

// Custom timeout
test(function (done) {
    this.timeout(10000);  // Increase to 10 seconds
    setTimeout(() => done(), 8000);
});

// No timeout at all
test(function () {
    this.timeout(0);      // 0 -- or any non-positive value -- disables the limit entirely
    return somethingThatTakesAsLongAsItTakes();
});
```

**Implementation:** the timer is armed once the function is known to be asynchronous. A synchronous
function cannot be interrupted by a timer anyway, so its elapsed time is checked against the budget
when it returns instead.

Whichever happens first -- the function settling, or the timer firing -- decides the result, and the
loser is discarded. That is what lets the timeout end the wait on its own: a returned promise that
settles late, or never settles at all, no longer holds the run open, and a late settlement cannot
overwrite the timeout already recorded against the test.

---

## Hook Failure Handling

A hook that throws or times out is handled differently depending on its lifecycle group, because
only the per-test groups have a test result to attribute the failure to:

| Hook | Effect on the run |
|---|---|
| `beforeEach` | The test is marked **failed** with the hook's error and its body never runs. Remaining `beforeEach` hooks for that test are skipped; its `afterEach` hooks still run. |
| `afterEach` | If the test passed, it is marked **failed** with the hook's error. If the test had *already* failed, it keeps its own error -- the hook's failure has nowhere to go. |
| `beforeAll` | The suite's `afterAll` hooks still run, but none of its tests do -- they are reported and counted as **skipped**, like any other never-ran test. The rest of the run is **unaffected**: sibling suites have their own fixtures and continue normally. |
| `afterAll` | The suite's tests have already run and keep their results. The rest of the run continues, exactly as for `beforeAll`. |

Skips are not failures: a hook that calls `this.skip()` (or throws a `SkipError`) marks its
tests skipped, and a listener that aborts a hook aborts rather than fails it. Neither is recorded
as a hook failure.

**A broken hook stops its own suite, not the run.** A `beforeAll` failure means that suite's setup
did not complete, so its tests cannot run -- but the next suite has its own fixtures and is
unaffected, so the run carries on and the failure is reported on the summary. Every test the run
counted is still reported, whether it ran or not, so a reporter's totals always match the events it
was handed.

Two things change that, both deliberately opt-in and independent of each other:

- [`--fail-on-hook`](test-runner.md#hook-failures) makes hook failures fail the **run** (reported in
  full, non-zero exit). It does not stop the run early -- every suite still executes.
- A **listener** that returns `eListenerAction.Abort` from a `Hook` event stops the run there. The
  suites left behind are still reported, as un-run. (`--bail` is *not* one of these: it reacts to
  failing tests only, and ignores hooks entirely.)

### Hook failures on the summary

Every hook failure -- including the two cases above that no test result can carry -- is recorded
on the run summary as an `IHookFailure`:

```typescript
const runner = createTestRunner(getRootSuite());
await runner.run();

const results = runner.getResults();
for (const failure of results.hookFailures || []) {
    // eg. "afterAll in root > Database: connection still open"
    console.log(`${failure.group} in ${failure.suite}: ${failure.message}`);
}
```

Each entry carries the hook's lifecycle `group`, its `name` (the group's own name for an unnamed
hook), the `suite` path, the owning `test` for the per-test groups, `timedOut`, and the error's
`message`/`stack` -- captured as strings rather than as an `Error` so the browser and worker
targets can return them to the CLI over `postMessage`. The property is **omitted entirely** when
no hook failed.

### `run()` resolves, it does not reject

A failing `beforeAll`/`afterAll` is fully described on the summary by the time the run ends, so
`run()` **resolves**: rejecting would leave the caller with an exception and no results at all --
not even for the suites that ran perfectly well. Only a genuine runner fault (an error with no
recorded hook failure behind it) rejects.

This means a failing hook does not, by itself, make a run "fail" -- what to do about one is the
caller's decision. The CLI's `--fail-on-hook` is that decision for command-line runs: it reports
each failing hook and exits non-zero even when every test passed. See
[Test Runner, CLI & Configuration](test-runner.md#hook-failures).

---

## Best Practices

### ✅ DO

- Use **async/await** for modern code (clearest intent)
- Use **sync tests** when no async operations needed (fastest)
- Use **done callback** only when required by existing APIs
- Use `.timeout()` to customize timeout per test, or `.timeout(0)` to remove the limit
- Mix patterns in the same suite (Tripwire handles it)

### ❌ DON'T

- Don't return a promise AND use done callback
  ```typescript
  // BAD: Ambiguous completion
  test(async (done) => {
    await delay(100);
    done();
  });
  ```

- Don't forget to call done() or return a promise
  ```typescript
  // BAD: Test never completes
  test((done) => {
    asyncOperation();  // done never called!
  });
  ```

- Don't use promise return AND done callback simultaneously
  ```typescript
  // CONFUSING: Only one completion style per test
  test((done) => {
    return fetch('/data').then(() => done());
  });
  ```

---

## Examples by Runtime Environment

Tripwire tests run in **Node.js, Browser, and Web Worker** environments:

### Node.js Example

```typescript
import { describe, it } from '@nevware21/tripwire';

describe('Node.js Tests', () => {
    it('should use fs module', async () => {
        const data = await fs.promises.readFile('test.txt');
        assert.isString(data);
    });
});
```

### Browser Example

```typescript
import { describe, it } from '@nevware21/tripwire';

describe('Browser Tests', () => {
    it('should query DOM', () => {
        const elem = document.getElementById('test');
        assert.isObject(elem);
    });
    
    it('should handle fetch', async () => {
        const response = await fetch('/api/data');
        assert.equal(response.status, 200);
    });
});
```

### Web Worker Example

```typescript
import { describe, it } from '@nevware21/tripwire';

describe('Worker Tests', () => {
    it('should perform heavy computation', async () => {
        const result = await computeInWorker();
        assert.equal(result.status, 'complete');
    });
});
```

---

## Summary

**The Tripwire test runner optimizes performance by:**

1. **Creating promises only when necessary** (functions return promises or done callbacks are async)
2. **Supporting multiple completion styles** (async/await, done callbacks, synchronous)
3. **Using arity checking** to automatically detect if a function wants the done callback
4. **Providing race-protection** for delayed done callbacks
5. **Enabling mixed sync/async** test suites without overhead

**Key Design Decision:**
The framework doesn't branch on function **declaration**—it branches on function **runtime behavior**. This allows:
- ✅ Sync functions to execute synchronously (fast)
- ✅ Async functions to return promises (flexible)
- ✅ Done callbacks to work when needed (compatible)
- ✅ Everything to mix in the same suite (practical)

**Current Performance:**
- ✅ 2585+ tests passing
- ✅ Promises allocated only when truly necessary
- ✅ Zero overhead for synchronous execution
- ✅ Full async support across node, browser, and worker environments

---

## Runner Monitoring Metrics

The runner exposes runtime metrics via `runner.getMetrics()` to help validate execution order and execution behavior.

> **Full metrics must be enabled when the runner is created.** Collecting the execution trace, the
> per-execution samples, the per-test wait ratios and the timeout / retry diagnostics allocates several
> objects for every hook and test body that runs, which measurably slows down large test runs. They are
> therefore **off by default** and are only captured when `createTestRunner()` is given the `metrics`
> option:

```typescript
const runner = createTestRunner(suite, undefined, { metrics: true });
await runner.run();

const metrics = runner.getMetrics();
```

When the option is not enabled the runner still maintains the cheap values -- the `counts`, the
`totalExecutionTime` / `totalWaitTime` / `totalActiveTime` totals, the stack depth values, the
`executionMode` and the run timings -- and `getMetrics()` returns those along with a `message` stating
that the full metrics were not captured. The collection based values (`trace`, `perTestWaitRatios`,
`slowestExecutions`, `retryDiagnostics.tests`, `timeoutDiagnostics.hotspots` and `traceCompression`)
are empty in that case.

```typescript
const runner = createTestRunner(suite);
await runner.run();

const metrics = runner.getMetrics();
// metrics.counts.tests            -> populated
// metrics.trace.length            -> 0
// metrics.message                 -> "Full runner metrics were not captured because ..."
```

### Core Metrics

- `currentStackDepth`: Current execution depth at read time (normally `0` after run completion)
- `maxStackDepth`: Maximum observed depth during execution
- `executionMode`: Aggregate mode for function executions: `"sync" | "async" | "mixed" | "unknown"`
- `totalExecutionTime`: Sum of all instrumented test-body and hook durations
- `totalWaitTime`: Sum of measured async waiting time
- `totalActiveTime`: Sum of active execution time before waiting
- `runDuration`: Wall-clock run duration (`endTime - startTime`)

### Counters

- `counts.suites`: Number of suite scopes entered
- `counts.tests`: Number of test scopes entered
- `counts.hooks`: Number of executed hook functions
- `counts.testBodies`: Number of executed test body functions
- `counts.syncExecutions`: Hook/test-body executions completed synchronously
- `counts.asyncExecutions`: Hook/test-body executions completed asynchronously
- `counts.retries`: Total retries performed
- `counts.timedOut`: Timed-out hook/test-body executions
- `counts.passed`, `counts.failed`, `counts.skipped`, `counts.pending`, `counts.aborted`: Final test outcome counts

### Execution Trace

- `trace`: Ordered start/end events for `run`, `suite`, `test`, `hook`, and `test-body`
- Each trace entry includes: `order`, `event`, `type`, `name`, `depth`, `timestamp`
- End events may also include: `async`, `duration`, `waitTime`, and `error`
- `droppedTraceEvents`: Number of events dropped after the internal trace cap is reached

This trace is intended for sequence validation and diagnostic tooling.

### Additional Useful Derived Signals

You can derive more user-facing feedback from base metrics:

- `waitRatio = totalWaitTime / totalExecutionTime` (how async/wait-heavy the run is)
- `averageExecution = totalExecutionTime / (counts.hooks + counts.testBodies)`
- `retryRate = counts.retries / counts.tests`
- `asyncShare = counts.asyncExecutions / (counts.syncExecutions + counts.asyncExecutions)`

### Advanced Diagnostics Exposed by Runner

The following are now returned directly by `runner.getMetrics()` so a CLI can display them without extra post-processing:

- `criticalPathDuration`: Estimated critical-path duration for the run
- `perTestWaitRatios`: Per-test execution/wait totals and wait ratios
- `slowestExecutions.byDuration`: Top slowest hook/test-body executions by total duration
- `slowestExecutions.byWaitTime`: Top slowest hook/test-body executions by wait time
- `retryDiagnostics`: Retry totals and per-test retry breakdown
- `timeoutDiagnostics`: Timeout totals and timeout hotspots by scope
- `traceCompression`: Trace cardinality and repeated-pattern diagnostics
