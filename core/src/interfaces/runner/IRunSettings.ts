/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { ISerializedRegExp } from "./ISerializedRegExp";

/**
 * Defines the structure of the settings that control the behavior of the test run.
 * @since 0.2.0
 */
export interface IRunSettings {

    /**
     * The "slow" threshold in milliseconds, which is used to determine when a test is considered slow.
     */
    slow?: number;

    /**
     * The timeout duration in milliseconds for each test.
     */
    timeout?: number;

    /**
     * The number of times to retry a failed test before marking it as failed.
     */
    retries?: number;

    /**
     * An array of serialized regular expressions used to filter which tests should be run.
     */
    grep: ISerializedRegExp[];

    /**
     * When true, the test runner will invert the grep filter.
     */
    invert: boolean;

    /**
     * When true, the test runner will stop executing tests after the first failure.
     */
    bail: boolean;

    /**
     * When true, the test runner will enable tracing of test execution.
     */
    trace: boolean;

    /**
     * Test-result reporter name(s) to register for this run (eg. `["spec"]`, `["dot", "xunit"]`)
     * -- one of `"spec"`, `"dot"`, `"tap"`, `"json"`, `"json-stream"`, `"min"`, `"list"`,
     * `"progress"`, `"landing"`, `"nyan"`, `"doc"`, `"markdown"`, `"xunit"`. Defaults to
     * `["spec"]` when omitted.
     */
    reporter?: string[];

    /**
     * Optional configuration for the test runner server.
     */
    server?: {
        url: string;
        port: number;
        isRunning: boolean;
    };
}
