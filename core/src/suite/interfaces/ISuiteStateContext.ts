/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2025 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { ITestSuite } from "./ITestSuite";

/**
 * @internal
 * Suite context for isolation
 * @since 0.2.0
 */
export interface ISuiteStateContext {
    /**
     * Identifies the current root {@link ITestSuite}
     */
    root: ITestSuite | null;

    /**
     * This is the current {@link ITestSuite}
     * @returns
     */
    readonly current: ITestSuite;

    /**
     * The number of suites in the context
     */
    readonly length: number;

    /**
     * Reset the current suite context to empty
     */
    reset: () => void;

    /**
     * Add the suite as the new current {@link ITestSuite}
     * @param suite - The suite to set as the current
     */
    add: (suite: ITestSuite) => void;

    /**
     * Remove the given {@link ITestSuite} from wherever it sits in the context, leaving the suites
     * added above and below it in place. Definitions that finish asynchronously may settle in a
     * different order than they were added in, so the current suite is not necessarily the one
     * being closed.
     * @param suite - The suite to remove
     * @returns `true` when the suite was present and has been removed
     */
    rm: (suite: ITestSuite) => boolean;
}