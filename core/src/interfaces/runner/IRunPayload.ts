/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IRunSettings } from "./IRunSettings";

/**
 * Defines the structure of the payload sent from the test runner to the browser client when initiating a test run.
 * @since 0.2.0
 */
export interface IRunPayload {

    /**
     * An array of entry module IDs that serve as the starting points for the test execution.
     */
    entryIds: string[];

    /**
     * The module ID of the Tripwire module, which serves as the main entry point for the test runner.
     */
    tripwireModuleId: string;

    /**
     * The settings that control the behavior of the test run.
     */
    settings: IRunSettings;

    /**
     * A mapping of module IDs to the URL each module's wrapped, network-servable source is
     * available at. Only populated for consumers that must explicitly load module scripts
     * themselves (e.g. a Web Worker via `importScripts()`); omitted when module scripts are
     * already embedded as `<script>` tags in the served host/frame HTML.
     */
    moduleUrls?: { [id: string]: string };

    /**
     * Module IDs for `src/**\/*.ts` files that a `--coverage` run should `require()` once,
     * purely to obtain real, execution-based coverage for files no test happens to import --
     * mirroring how karma-typescript/nyc's `all: true` load every file in their configured
     * scope regardless of use, rather than only what's actually reachable from a test entry
     * point. Not treated as test suites (registering no `describe`/`it` from them is expected
     * and not an error); load failures are swallowed per-module rather than failing the run.
     * Only populated when `--coverage` is on.
     */
    coverageOnlyIds?: string[];
}
