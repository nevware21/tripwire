/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

/**
 * Describes a single lifecycle hook (`before`/`beforeEach`/`afterEach`/`after`) that failed or
 * timed out during a run.
 *
 * Hook failures are otherwise easy to lose: an `afterEach` that throws after its test already
 * failed is discarded (the test is already failed, there is nothing left to mark), and a
 * `before`/`after` failure aborts the surrounding suite without ever appearing in the pass/fail
 * counts -- no test "owns" it. Every failure is recorded here instead so the run summary can
 * surface them, and so `--fail-on-hook` has something to fail the run on.
 *
 * Deliberately plain and fully serializable (the error is captured as its message/stack strings
 * rather than as an `Error`) because the browser and worker targets return their summary to the
 * CLI across a `postMessage` boundary.
 * @since 0.2.0
 */
export interface IHookFailure {
    /**
     * Which lifecycle group the hook belongs to, eg. `"beforeAll"`, `"beforeEach"`,
     * `"afterEach"`, `"afterAll"`.
     */
    group?: string;

    /**
     * The hook's own name, eg. `"before"` or the description passed when it was registered.
     */
    name: string;

    /**
     * The `>`-separated path of the suite the hook was registered against.
     */
    suite?: string;

    /**
     * The description of the test the hook was running for, for the per-test
     * (`beforeEach`/`afterEach`) groups only.
     */
    test?: string;

    /**
     * Whether the hook exceeded its timeout rather than throwing.
     */
    timedOut?: boolean;

    /**
     * The failure message.
     */
    message: string;

    /**
     * The failure stack, when the thrown value carried one.
     */
    stack?: string;
}
