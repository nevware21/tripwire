/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IPromise } from "@nevware21/ts-async";
import { IConfigInst, IHookDefinitionFn, INotificationManager, ISuiteDefinitionFn, ITestDefinitionFn, ITestSummary } from "@nevware21/tripwire";

/**
 * Interface for a Tripwire test framework module, providing methods to create test suites, reporters, and runners,
 * as well as the standard BDD-style test definitions and hooks.
 */
export interface ITripwireModule {
    assertConfig: IConfigInst

    /**
     * Creates a new test suite.
     * @returns The created test suite.
     */
    createSuite: () => any;

    /**
     * Uses the provided test suite for the duration of the callback.
     * @param suite - The test suite to use.
     * @param callback - The callback function to execute with the test suite.
     * @returns A promise that resolves when the callback has completed.
     */
    useSuite: (suite: any, callback: () => void) => void | IPromise<void>;

    /**
     * Creates a test runner for the provided test suite.
     * @param suite - The test suite to run.
     * @param host - Optional runner host (eg. server integration) to use for the run.
     * @returns An object containing methods to interact with the test runner.
     */
    createTestRunner: (suite: any, host?: any) => {
        addFilter: (filter: any) => void;
        addListener: (listener: any) => void;
        run: () => IPromise<void>;
        getResults: () => ITestSummary;
    };

    createNotifyMgr: (parent?: INotificationManager | null) => INotificationManager;

    describe: ISuiteDefinitionFn;
    suite: ISuiteDefinitionFn;
    xdescribe: ISuiteDefinitionFn;
    fdescribe: ISuiteDefinitionFn;
    it: ITestDefinitionFn;
    spec: ITestDefinitionFn;
    test: ITestDefinitionFn;
    xit: ITestDefinitionFn;
    fit: ITestDefinitionFn;
    before: IHookDefinitionFn;
    beforeAll: IHookDefinitionFn;
    beforeEach: IHookDefinitionFn;
    after: IHookDefinitionFn;
    afterAll: IHookDefinitionFn;
    afterEach: IHookDefinitionFn;
    assert: any;
    expect: any;
    resetSuite: () => void;
}
