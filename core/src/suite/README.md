# Test Suite Module

The `suite` module provides Mocha and Jasmine compatible test suite functionality for tripwire.

## Features

- **Mocha-style API**: `describe`, `it`, `before`, `after`, `beforeEach`, `afterEach`
- **Jasmine-style API**: `beforeAll`, `afterAll`, `fit`, `fdescribe`, `xit`, `xdescribe`
- **TDD-style API**: `suite`, `test`
- **Async support**: Promises and done callbacks
- **Test hooks**: Setup and teardown at suite and test levels, with every hook failure tracked on the run summary
- **Focused/Skipped tests**: `.only` and `.skip` modifiers
- **Deterministic IDs**: Each test suite and test case has a unique, deterministic ID (like QUnit)

## Importing vs. the global names

The `tripwire` runner installs `describe`, `it`, the hooks, `assert` and `expect` as real globals
before it loads any test file, so a file run through the CLI can use the bare names without
importing anything.

For TypeScript, those global *names* are opt-in: importing `@nevware21/tripwire` declares no
ambient globals, which is what keeps it from colliding with `@types/mocha`, `@types/jest` or
`@types/jasmine`. Either import the API (as every example below does), or opt in with
`"types": ["@nevware21/tripwire/globals"]` in tsconfig.json -- see
[Cannot find name 'describe'](https://github.com/nevware21/tripwire/blob/main/docs/runner-troubleshooting.md#cannot-find-name-describe)
for all of the opt-in forms.

## Usage

### Basic Example

```typescript
import { describe, it, expect } from "@nevware21/tripwire";

describe("My Test Suite", () => {
    it("should pass a simple test", () => {
        expect(1 + 1).to.equal(2);
    });

    it("should handle async tests", async () => {
        const result = await Promise.resolve(42);
        expect(result).to.equal(42);
    });
});
```

### With Hooks

```typescript
import { describe, it, before, after, beforeEach, afterEach, assert } from "@nevware21/tripwire";

describe("Suite with Hooks", () => {
    let counter = 0;

    before(() => {
        // Runs once before all tests
        counter = 0;
    });

    after(() => {
        // Runs once after all tests
        console.log("All tests completed");
    });

    beforeEach(() => {
        // Runs before each test
        counter++;
    });

    afterEach(() => {
        // Runs after each test
        console.log(`Test ${counter} completed`);
    });

    it("first test", () => {
        assert.equal(counter, 1);
    });

    it("second test", () => {
        assert.equal(counter, 2);
    });
});
```

### Async Tests with Done Callback

```typescript
import { describe, it, assert } from "@nevware21/tripwire";

describe("Async Tests", () => {
    it("should handle done callback", (done) => {
        setTimeout(() => {
            assert.isTrue(true);
            done();
        }, 100);
    });

    it("should handle done with error", (done) => {
        setTimeout(() => {
            try {
                assert.equal(1, 2);
                done();
            } catch (error) {
                done(error);
            }
        }, 100);
    });
});
```

### Focused and Skipped Tests

```typescript
import { describe, it, assert } from "@nevware21/tripwire";

describe("Focus and Skip", () => {
    it.only("only this test runs", () => {
        assert.isTrue(true);
    });

    it.skip("this test is skipped", () => {
        assert.fail("Should not run");
    });

    it("this test is also skipped (due to .only above)", () => {
        assert.isTrue(true);
    });
});

describe.skip("Skipped Suite", () => {
    it("all tests in this suite are skipped", () => {
        assert.fail("Should not run");
    });
});
```

### Jasmine Style

```typescript
import { describe, it, beforeAll, afterAll, fit, fdescribe, xit, xdescribe, expect } from "@nevware21/tripwire";

describe("Jasmine Style", () => {
    beforeAll(() => {
        // Runs once before all tests
    });

    afterAll(() => {
        // Runs once after all tests
    });

    fit("focused test", () => {
        expect(true).to.be.true;
    });

    xit("skipped test", () => {
        expect(false).to.be.true;
    });
});

fdescribe("Focused Suite", () => {
    it("runs", () => {
        expect(true).to.be.true;
    });
});

xdescribe("Skipped Suite", () => {
    it("does not run", () => {
        expect(false).to.be.true;
    });
});
```

### Running Tests

```typescript
import { createTestRunner, getRootSuite, resetSuite } from "@nevware21/tripwire";

// Reset suite state before defining tests
resetSuite();

// Define your test suites here using describe/it

// Run the tests
async function runTests() {
    const runner = createTestRunner(getRootSuite());
    
    await runner.run();
    
    const results = runner.getResults();
    console.log(`Total: ${results.total}`);
    console.log(`Passed: ${results.passed}`);
    console.log(`Failed: ${results.failed}`);
    console.log(`Skipped: ${results.skipped}`);

    // Only present when a before/beforeEach/afterEach/after hook failed or timed out
    for (const failure of results.hookFailures || []) {
        console.log(`Hook failed: ${failure.group} in ${failure.suite} -- ${failure.message}`);
    }
}

runTests().catch(console.error);
```

### Using Filters to Run Specific Tests

```typescript
import { 
    createTestRunner, getRootSuite, resetSuite,
    createTestIDFilter, createTestNameFilter, createOnlyFilter,
    findMatchingTests, findMatchingTestsAndSuites
} from "@nevware21/tripwire";

// Define your tests
describe("Math", () => {
    it("addition", () => { /* test */ });
    it("subtraction", () => { /* test */ });
    it("multiplication", () => { /* test */ });
});

describe("String", () => {
    it("concatenation", () => { /* test */ });
    it("validation", () => { /* test */ });
});

// Example 1: Find and run tests by name
const nameFilter = createTestNameFilter(["validation"]);
const matchingTests = findMatchingTests(getRootSuite(), nameFilter);
console.log(`Found ${matchingTests.length} tests matching 'validation'`);

const runner = createTestRunner(getRootSuite());
runner.addFilter(nameFilter);
await runner.run();

// Example 2: Find tests and suites matching a filter
const onlyFilter = createOnlyFilter(getRootSuite());
if (onlyFilter) {
    const result = findMatchingTestsAndSuites(getRootSuite(), onlyFilter);
    console.log(`Found ${result.suites.length} suites and ${result.tests.length} tests marked with .only`);
}

// Example 3: Run specific tests by ID
const testIds = matchingTests.map(t => t.id || "");
const idFilter = createTestIDFilter(testIds);
const runner2 = createTestRunner(getRootSuite());
runner2.addFilter(idFilter);
await runner2.run();
```

## API Reference

### Suite Definition

- `describe(description, fn)` - Define a test suite (Mocha/Jasmine)
- `describe.only(description, fn)` - Focus this suite
- `describe.skip(description, fn)` - Skip this suite
- `suite(description, fn)` - TDD-style suite (alias for describe)
- `fdescribe(description, fn)` - Jasmine focused suite (alias for describe.only)
- `xdescribe(description, fn)` - Jasmine skipped suite (alias for describe.skip)

### Test Definition

- `it(description, fn?)` - Define a test case
- `it.only(description, fn?)` - Focus this test
- `it.skip(description, fn?)` - Skip this test
- `test(description, fn?)` - TDD-style test (alias for it)
- `spec(description, fn?)` - Alternative alias for it
- `fit(description, fn?)` - Jasmine focused test (alias for it.only)
- `xit(description, fn?)` - Jasmine skipped test (alias for it.skip)

### Hooks

- `before(fn)` - Run once before all tests in suite
- `before(name, fn)` - Named before hook
- `after(fn)` - Run once after all tests in suite
- `after(name, fn)` - Named after hook
- `beforeEach(fn)` - Run before each test
- `beforeEach(name, fn)` - Named beforeEach hook
- `afterEach(fn)` - Run after each test
- `afterEach(name, fn)` - Named afterEach hook
- `beforeAll(fn)` - Jasmine alias for before
- `afterAll(fn)` - Jasmine alias for after

#### Hook failures

A hook that throws or times out is recorded on the run summary as an `IHookFailure`
(`getResults().hookFailures`), whether or not any test result ends up carrying it:

- `beforeEach`/`afterEach` - the owning test is marked failed with the hook's error (an
  `afterEach` failure after the test has already failed keeps the test's own error)
- `before`/`after` - no test owns the failure; a failed `before` means the suite's own tests
  cannot run, so its un-run tests are reported as **skipped**, its `after` hooks still run,
  sibling suites carry on, and `run()` still **resolves** rather than rejects

See [Test Execution Flow](https://github.com/nevware21/tripwire/blob/main/docs/test-execution-flow.md#hook-failure-handling) for the
full behavior, and the CLI's `--fail-on-hook` in
[Test Runner, CLI & Configuration](https://github.com/nevware21/tripwire/blob/main/docs/test-runner.md#hook-failures) for turning hook
failures into a failed run.

### Test Runner

- `createTestRunner(rootSuite, parentHost?, options?)` - Create an `ITestRunner` for running test suites
  - `run()` - Execute all tests
  - `getResults()` - Get test results summary (counts, timings, and `hookFailures` when any hook failed)
  - `getRootSuite()` - Get root test suite
  - `addFilter(filter)` - Add a filter to control which tests run; returns an object with a `remove()` method
  - `addListener(listener)` / `removeListener(listener)` - Add or remove a listener for test execution notifications
  - `getTestResult(test)` - Get the `ITestResult` (status, error, timings) for a test case, or `undefined` if it has not run
  - `getSuiteResult(suite)` - Get the `ISuiteResult` for a suite, or `undefined` if it has not run
  - `getMetrics()` - Get execution monitoring metrics for the current/last run (full metrics only when created with the `metrics` option)

### Filters

Filters control which tests and suites are executed during a test run.

#### Filter Types

- `createOnlyFilter(rootSuite)` - Filter to run only tests/suites marked with `.only`
- `createSuiteIDFilter(ids)` - Filter suites by their IDs
- `createTestIDFilter(ids)` - Filter tests by their IDs
- `createSuiteNameFilter(names, exactMatch?)` - Filter suites by name (substring or exact match)
- `createTestNameFilter(names, exactMatch?)` - Filter tests by name (substring or exact match)
- `createSuiteInstanceFilter(suites)` - Filter by specific suite instances
- `createTestInstanceFilter(tests)` - Filter by specific test instances

#### Filter Helpers

Helper functions to find matching tests and suites without running them:

- `findMatchingTestsAndSuites(rootSuite, filter)` - Returns `{ suites: ITestSuite[], tests: ITestCase[] }`
- `findMatchingSuites(rootSuite, filter)` - Returns array of matching suites
- `findMatchingTests(rootSuite, filter)` - Returns array of matching tests

**Example:**

```typescript
import { 
    createTestRunner, getRootSuite, 
    createTestIDFilter, findMatchingTests 
} from "@nevware21/tripwire";

// Find tests matching a filter
const filter = createTestIDFilter(["test-1", "test-2"]);
const matchedTests = findMatchingTests(getRootSuite(), filter);
console.log(`Found ${matchedTests.length} matching tests`);

// Run with filter
const runner = createTestRunner(getRootSuite());
runner.addFilter(filter);
await runner.run();
```

### Utilities

- `getRootSuite()` - Get the root test suite
- `resetSuite()` - Reset suite state
- `createSuite()` - Create a new isolated test suite
- `useSuite(suite, fn)` - Define tests in a specific suite context

## Deterministic Test IDs

Each test suite and test case is assigned a unique, deterministic ID based on its position in the test hierarchy. These IDs are similar to QUnit's test IDs and remain consistent across multiple test runs for the same test structure.

### Features

- **Deterministic**: Same test structure always generates the same IDs
- **Unique**: Different tests and suites have different IDs
- **Hierarchical**: IDs are based on the full path from root to the test/suite
- **Hex format**: IDs are represented as hexadecimal strings for readability

### Example

```typescript
import { describe, it, getRootSuite } from "@nevware21/tripwire";

describe("Calculator", () => {
    describe("Addition", () => {
        it("should add two numbers", () => {
            // Test implementation
        });
    });
});

const rootSuite = getRootSuite();
const calculatorSuite = rootSuite.suites[0];
console.log(calculatorSuite.id); // e.g., "a1b2c3d4"

const additionSuite = calculatorSuite.suites[0];
console.log(additionSuite.id); // e.g., "e5f6a7b8"

const addTest = additionSuite.tests[0];
console.log(addTest.id); // e.g., "f9a1b2c3"
```

### Use Cases

- **Test isolation**: Identify specific tests for debugging
- **Test history**: Track test results across runs
- **Parallel execution**: Distribute tests reliably
- **CI/CD integration**: Reference specific tests in build pipelines

## TypeScript Types

```typescript
// Test and hook functions run with the test context as `this`; they may be
// synchronous, return a promise, or accept a done callback
type TestFn = ((this: ITestContext) => void | IPromise<void>) | ((this: ITestContext, done: IDoneFn) => void);
type HookFn = ((this: ITestContext) => void | IPromise<void>) | ((this: ITestContext, done: IDoneFn) => void);
type SuiteFn = (this: ISuiteContext) => void | IPromise<void>;

interface IDoneFn {
    (error?: any): void;
    fail(error?: any): void;
}

interface ISuiteDefinitionFn {
    (description: string, specDefinitions: SuiteFn): void | IPromise<void>;
    only(description: string, specDefinitions: SuiteFn): void | IPromise<void>;
    skip(description: string, specDefinitions: SuiteFn): void | IPromise<void>;
}

interface ITestDefinitionFn {
    (description: string, testFunction?: TestFn): void;
    only(description: string, testFunction?: TestFn): void;
    skip(description: string, testFunction?: TestFn): void;
}

interface IHookDefinitionFn {
    (hookFunction: HookFn): void;
    (name: string, hookFunction: HookFn): void;
}

interface ITestSuite {
    id: string;                     // Unique, deterministic identifier
    description: string;
    parent?: ITestSuite;
    suites: ITestSuite[];
    tests: ITestCase[];
    beforeAllHooks: IHookDefinition[];
    afterAllHooks: IHookDefinition[];
    beforeEachHooks: IHookDefinition[];
    afterEachHooks: IHookDefinition[];
    only: boolean;
    skip: boolean;
    timeout?: number;
    slow?: number;
    retries?: number;
}

interface ITestCase {
    id: string;                     // Unique, deterministic identifier
    description: string;
    fn?: TestFn;
    only: boolean;
    skip: boolean;
    timeout?: number;
    slow?: number;
    retries?: number;
}

// Execution outcome, obtained from the runner via runner.getTestResult(test)
interface ITestResult {
    test: ITestCase;
    status: TestStatus;
    error?: Error;
    deferredErrors?: Error[];
    reason?: any;
    startTime?: number;
    endTime?: number;
    duration?: number;
    retries?: number;
}
```

## Compatibility

This module provides compatibility with:
- **Mocha** - describe, it, before, after, beforeEach, afterEach
- **Jasmine** - beforeAll, afterAll, fit, fdescribe, xit, xdescribe

The API is designed to be a drop-in replacement for basic Mocha/Jasmine usage, making it easy to migrate existing tests or use familiar syntax.
