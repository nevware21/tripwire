/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2025 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { ITestCase } from "../../interfaces/suite/ITestCase";
import { IHookDefinition } from "./IHookDefinition";

/**
 * Test suite definition
 * @since 0.2.0
 */
export interface ITestSuite {
    /**
     * Unique identifier for this suite (deterministic across runs)
     */
    id: string;

    /**
     * Suite description
     */
    description: string;

    /**
     * Parent suite
     */
    parent?: ITestSuite;

    /**
     * Child suites
     */
    suites: ITestSuite[];

    /**
     * Test cases in this suite
     */
    tests: ITestCase[];

    /**
     * Before all hooks
     */
    beforeAllHooks: IHookDefinition[];

    /**
     * After all hooks
     */
    afterAllHooks: IHookDefinition[];

    /**
     * Before each hooks
     */
    beforeEachHooks: IHookDefinition[];

    /**
     * After each hooks
     */
    afterEachHooks: IHookDefinition[];

    /**
     * Whether this suite is marked as only
     */
    only: boolean;

    /**
     * Whether this suite should be skipped
     */
    skip: boolean;

    /**
     * Suite timeout in milliseconds, applied to tests and hooks in this suite if they don't
     * have their own timeout defined. If not set, the default timeout from the configuration will be used.
     */
    timeout?: number;

    /**
     * Default threshold in milliseconds for considering tests in this suite as slow.
     * If not set, the value is inherited from parent suites, then from the global configuration.
     */
    slow?: number;

    /**
     * Default number of retries for tests in this suite.
     * If not set, the value is inherited from parent suites, then from the global configuration.
     */
    retries?: number;
}
