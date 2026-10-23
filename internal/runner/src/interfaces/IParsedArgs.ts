/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { BrowserLaunchMode, TestTarget } from "@nevware21/tripwire";
import { BrowserUiStyle } from "../ux/types/BrowserUiStyle";

/**
 * The parsed command-line arguments for the runner.
 * This is the result of parsing the raw arguments passed to the runner, and is used to configure the test run.
 */
export interface IParsedArgs {
    /**
     * Module name for the browser UX provider package.
     */
    uxProvider?: string;

    /**
     * Whether to show the help message and exit.
     * This is typically set by the presence of `--help` or `-h` in the command-line arguments.
     */
    help?: boolean;

    /**
     * An error message to display if the arguments are invalid.
     */
    error?: string;

    /**
     * Patterns to match test files against.
     */
    patterns?: string[];

    /**
     * The project to run tests for.
     */
    project?: string;

    /**
     * The target environment for the tests.
     */
    target?: TestTarget;

    /**
     * The browser launch mode.
     */
    browserLaunch?: BrowserLaunchMode;

    /**
     * The browser UI style.
     */
    browserStyle?: BrowserUiStyle;

    /**
     * Whether to compile the tests before running.
     */
    compile?: boolean;

    /**
     * Whether a matched file the type-check did not cover fails the run instead of warning.
     * See `ITripwireConfig.strictTypeCheck`.
     */
    strictTypeCheck?: boolean;

    /**
     * Whether the type-check may keep its state between runs. See `ITripwireConfig.incremental`.
     */
    incremental?: boolean;

    /**
     * Whether the browser/worker module graph is built on a worker thread. See
     * `ITripwireConfig.graphThread`.
     */
    graphThread?: boolean;

    /**
     * Whether each file may be compiled on its own instead of through a whole program, when not
     * type-checking. See `ITripwireConfig.isolatedTranspile`.
     */
    isolatedTranspile?: boolean;

    /**
     * Whether emitted JavaScript may be cached on disk between runs. See
     * `ITripwireConfig.emitCache`.
     */
    emitCache?: boolean;

    /**
     * What the type-check covers, `"run"` or `"project"`. See `ITripwireConfig.typeCheckScope`.
     */
    typeCheckScope?: "run" | "project";

    /**
     * Whether a failing run prints the runner's own stack trace (mapped back to its TypeScript
     * sources) beneath the error message. See `ITripwireConfig.debugStack`.
     */
    debugStack?: boolean;

    /**
     * The delay in milliseconds between test steps.
     */
    slow?: number;

    /**
     * The maximum time in milliseconds a test can run before timing out.
     */
    timeout?: number;

    /**
     * The number of times to retry a failed test.
     */
    retries?: number;

    /**
     * Patterns to match test names against.
     */
    grep?: RegExp[];

    /**
     * Whether to invert the grep patterns.
     */
    invert?: boolean;

    /**
     * Patterns to ignore test files.
     */
    ignore?: string[];

    /**
     * Whether to bail after the first test failure.
     */
    bail?: boolean;

    /**
     * Whether a failing lifecycle hook fails the whole run.
     */
    failOnHook?: boolean;

    /**
     * Whether to enable tracing.
     */
    trace?: boolean;

    /**
     * Whether to show test files.
     */
    showFiles?: boolean;

    /**
     * Whether to enable code coverage.
     */
    coverage?: boolean;

    /**
     * The code coverage instrumenter to use.
     */
    coverageInstrumenter?: string;

    /**
     * How to report coverage for a source file that was never reached during the run and
     * whose content is fully erased by TypeScript (a pure `interface`/type-only file that
     * produces no runtime code) -- `"zero"` (default, matches nyc's own `--all` behavior),
     * `"full"` (report as 100% covered), or `"ignore"` (omit from the report entirely).
     */
    erasedCoverageMode?: "zero" | "full" | "ignore";

    /**
     * `nyc` reporter(s) tripwire's own code uses when it explicitly spawns `nyc report` (the
     * browser/worker `--coverage` write step and the `coverage-report` node-target command).
     * Default: `["text"]`.
     */
    coverageReporters?: string[];

    /**
     * Glob(s) locating the project's own sources, for the browser/worker `--coverage` steps that
     * must consider files no test imported. Default: `["src/**\/*.ts"]`. See
     * `ITripwireConfig.coverageSrc`.
     */
    coverageSrc?: string[];

    /**
     * Test-result reporter name(s) to register for this run (default: `["spec"]`). See
     * `ITripwireConfig.reporter` for the full list of built-in names. An entry may also be a
     * custom reporter module specifier (node target only) -- see `execute/reporter.ts`.
     */
    reporter?: string[];

    /**
     * Whether to generate per-module source maps for the browser/worker targets, so DevTools
     * can show/step through the real .ts source instead of the transpiled JS. Default: `false`
     * (pure processing overhead for anyone not actually debugging).
     */
    sourceMaps?: boolean;

    /**
     * Browser/worker targets only. When set with `--browser-launch puppeteer` (the default),
     * the CLI doesn't exit after the first run -- it watches the resolved test files for
     * changes and automatically re-runs (a fresh graph build, fresh server, fresh browser
     * launch each time), printing a new report each iteration, until interrupted (Ctrl+C). No
     * effect on `open`/`manual` launches, which already re-build/re-run on change via the
     * interactive page's own "Auto-reload" toggle. Default: `false`.
     */
    watch?: boolean;

    /**
     * Additional files or modules to preload before running tests.
     */
    preload?: string[];

    /**
     * The root directory to serve files from when running in browser mode.
     * This is used by the built-in static file server to resolve requests for test files and dependencies.
     * If not specified, it defaults to the current working directory.
     * This option is ignored if `noServer` is true.
     */
    serverRoot?: string;

    /**
     * The network interface the built-in server binds to, and the host every URL handed to a
     * browser/worker/puppeteer instance is built from. Defaults to `127.0.0.1` (loopback only).
     * See `ITripwireConfig.bindAddress` for when to change it and what exposing the server
     * means.
     */
    bindAddress?: string;

    /**
     * Whether to disable the built-in static file server when running in browser mode.
     * If true, the runner will not serve any files and will expect all test files and dependencies
     * to be served by an external server. This can be useful if you have a custom server setup or
     * want to use a different development server. If false (the default), the runner will serve
     * files from `serverRoot` or the current working directory. Note that if `noServer` is true,
     * the runner will not be able to run tests in browser mode.
     * This option is ignored if not running in browser or worker mode.
     */
    noServer?: boolean;

    /**
     * Whether to serve the browser/worker module graph as a single concatenated bundle
     * instead of one network request per module. Default: `true`. See `ITripwireConfig.bundle`
     * for the full tradeoff.
     */
    bundle?: boolean;
}
