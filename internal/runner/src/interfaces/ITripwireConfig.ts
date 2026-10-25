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
 * All configuration options that can appear in a tripwire config file.
 * CLI flags override values loaded from config files.
 *
 * Config files are searched from the current working directory up to the
 * filesystem / repository root, and finally from the user's home directory.
 * Files closer to `cwd` take precedence over files higher in the tree.
 *
 * Supported file names (checked in this order per directory):
 *   .tripwirerc
 *   .tripwirerc.json
 *   .tripwirerc.js  / .tripwirerc.cjs
 *   tripwire.config.json
 *   tripwire.config.js  / tripwire.config.cjs
 *
 * JSON files may use JSONC-style line comments (`// ...`).
 * JS/CJS files must export the config object as `module.exports`.
 */
export interface ITripwireConfig {
    /**
     * Module name for a custom browser UX provider, overriding the built-in one.
     * Defaults to the built-in provider when omitted.
     */
    uxProvider?: string;

    /**
     * Default runtime target (default: "node").
     */
    target?: TestTarget;

    /**
     * Default browser launch mode (default: "puppeteer").
     */
    browserLaunch?: BrowserLaunchMode;

    /**
     * Default browser UI style for interactive mode (default: "classic").
     */
    browserStyle?: BrowserUiStyle;

    /**
     * Path to the TypeScript project file (default: "tsconfig.json").
     */
    project?: string;

    /**
     * Additional TypeScript project control, layered on top of `project`:
     * - As a `string`, a path to a tsconfig.json that *supersedes* `project` when `project`
     *   came from a config file. An explicit CLI `--project`/`-p`/`--tsProject` flag still
     *   wins over this, the same as it wins over every other config-file value -- this is
     *   just an alternate way to set `project` from a config file, not a bypass of the
     *   CLI-always-wins rule.
     * - As an object, a set of compiler options that override whatever the loaded project
     *   (resolved from `project`/the string form above/its default, whichever applies)
     *   specifies for those same keys. Unlike the string form this always applies, even when
     *   `project` was set via an explicit CLI flag -- it isn't an alternate way to choose
     *   *which* project file loads, only a layer on top of whichever one did.
     */
    tsconfig?: string | { [key: string]: any };

    /**
     * Type-check the TypeScript project before running, failing the run on any type error
     * (CLI: `--type-check`; default: `false`, ie. transpile-only).
     *
     * Transpiling and type-checking are separate questions asked of the same TypeScript
     * Program. The Program is built either way -- it has to be, so `const enum` values from
     * project dependencies resolve -- and `program.emit()` deliberately does not surface
     * semantic diagnostics, since TypeScript emits despite type errors by design. Enabling
     * this adds the checker walk over that same Program: it does not add a second parse and
     * does not spawn a `tsc` process.
     *
     * Set it here to make type-checking a project's default, and override it per-run from the
     * command line with `--transpile-only`. A CLI flag always wins over this value, and when
     * both `--type-check` and `--transpile-only` appear, the last one on the command line wins.
     *
     * @since 0.2.0
     */
    typeCheck?: boolean;

    /**
     * Fail the run when `--type-check` did not actually cover every matched TypeScript file
     * (CLI: `--strict-type-check`; default: `false`, which warns instead).
     *
     * `--type-check` checks the tsconfig **project**; the run executes whatever the file glob
     * matched. Nothing makes those two sets agree, and when they drift apart -- a new test
     * directory, a moved package, a glob widened without the tsconfig following -- the files
     * that ran were never checked, and the run still reports `Type-check completed`. A file
     * with a real type error can execute, pass, and leave the run green.
     *
     * Warning is the default because the mismatch is sometimes deliberate (a shared helper
     * compiled by another project). Set this when `--type-check` passing is supposed to *mean*
     * something, eg. in CI. Implies `--type-check` unless `--transpile-only`/`--no-compile`
     * explicitly turned it off.
     */
    strictTypeCheck?: boolean;

    /**
     * Whether the type-check may keep TypeScript's own incremental state (`.tsbuildinfo`) between
     * runs, so that a later run re-checks only the files affected by what changed. The state is
     * written under `node_modules/.cache/tripwire` rather than next to the tsconfig.
     *
     * Off by default because it measured no benefit: emitting a file needs much of the work the check
     * does, so what a warm check saves, the emit pays back. `emitCache` supersedes it for the common
     * case by skipping the program entirely when nothing changed.
     *
     * Node target only: the browser/worker module graph does not use it.
     *
     * CLI: `--incremental` / `--no-incremental`. Default: `false`
     */
    incremental?: boolean;

    /**
     * Whether the browser/worker module graph is built on a worker thread instead of on the main
     * one, for `--target browser` and `--target worker`.
     *
     * Off by default because it measured no benefit. The build is synchronous and holds the event
     * loop for seconds, which stops the browser launch completing alongside it -- but moving it to a
     * thread only trades that for competing with the browser for CPU, and the browser's startup is
     * the longer pole either way. Three interleaved A/B pairs had the main-thread build ahead every
     * time. Kept because the result is machine-specific: more cores, or a slower compile against a
     * faster browser, could land the other way, and this is the only way to find out.
     *
     * CLI: `--graph-thread` / `--no-graph-thread`. Default: `false`
     */
    graphThread?: boolean;

    /**
     * Whether each file may be compiled on its own (TypeScript's `transpileModule`) rather than
     * through a whole program, when `typeCheck` is off. It is substantially faster and its output can
     * be cached between runs (see `emitCache`), but it cannot resolve an **ambient**
     * `declare const enum` -- one declared in a `.d.ts`, usually by a dependency -- because nothing
     * emits an object for the member access to resolve against. A project using one (including any
     * project using `@nevware21/ts-utils`, which declares `WellKnownSymbols` that way) fails at load
     * with `Cannot read properties of undefined` and must leave this off. A project's own
     * `const enum` is fine.
     *
     * Node target only: the browser/worker module graph always compiles through a whole program.
     *
     * CLI: `--isolated-transpile` / `--no-isolated-transpile`. Default: `false`
     */
    isolatedTranspile?: boolean;

    /**
     * Whether compiled output may be cached on disk between runs, under
     * `node_modules/.cache/tripwire`, so that running the same tests again over an unchanged tree
     * does not compile (or type-check) anything a second time.
     *
     * With `isolatedTranspile` each file is keyed by its own text, since that is all its output
     * depends on. Otherwise the whole program's inputs are recorded -- every source file it used,
     * its roots, the compiler and options, and the files that decide how imports resolve -- and the
     * cache is keyed by the identity of that entire set. Any change to any of them turns the whole
     * cache over at once. Identical inputs also mean identical diagnostics, so a `typeCheck` run
     * whose recorded state still matches skips checking as well.
     *
     * Entries that nothing has read for a week are removed by a sweep that runs at most once a day,
     * so an edit-and-run loop cannot grow the cache directory without bound.
     *
     * Node target only: the browser/worker module graph is compiled afresh on every run.
     *
     * CLI: `--emit-cache` / `--no-emit-cache`. Default: `true`
     */
    emitCache?: boolean;

    /**
     * What `typeCheck` covers.
     *
     * - `"project"` checks every file the tsconfig resolves to, whether or not this run reaches it.
     * - `"run"` roots the check at the files this run matched, so it covers those and everything they
     *   import, transitively -- every file the run can reach -- plus anything declaring globals.
     *   Files in the project that no test reaches are not checked, which is what makes it faster, and
     *   is also why it is not the default: it narrows what a green run proves.
     *
     * Either way a matched file the project does not contain is still reported as unchecked, and
     * still fails the run under `strictTypeCheck`.
     *
     * Node target only: browser and worker runs always check the whole project.
     *
     * CLI: `--type-check-scope <run|project>`. Default: `"project"`
     */
    typeCheckScope?: "run" | "project";

    /**
     * Print the runner's own stack trace beneath a failure message (CLI: `--debug-stack`;
     * environment: `TRIPWIRE_DEBUG_STACK=1`; default: `false`).
     *
     * Off by default because the CLI ships as one minified bundle: an unmapped stack is a wall
     * of `at yo (tripwire.js:2:143518)` that buries the message actually worth reading. When
     * enabled the frames are mapped back through the bundle's source map, so what prints is in
     * terms of `runner/src/**.ts` -- useful for debugging the runner itself, and noise for
     * anything else.
     */
    debugStack?: boolean;

    /**
     * Milliseconds threshold for slow-test marking.
     */
    slow?: number;

    /**
     * Default test timeout in milliseconds.
     */
    timeout?: number;

    /**
     * Default retry count for failing tests.
     */
    retries?: number;

    /**
     * Grep patterns (strings; compiled to RegExp with `i` flag).
     * CLI `--grep` patterns are appended after config file patterns.
     */
    grep?: string[];

    /**
     * Invert grep / fgrep matching.
     */
    invert?: boolean;

    /**
     * Glob patterns for files to exclude.
     */
    ignore?: string[];

    /**
     * Abort the run on first test failure.
     */
    bail?: boolean;

    /**
     * Fail the whole run when a lifecycle hook (`before`/`beforeEach`/`afterEach`/`after`) fails
     * or times out, even if every test itself passed. Equivalent to `--fail-on-hook`.
     */
    failOnHook?: boolean;

    /**
     * Show each test and assertion as it executes.
     */
    trace?: boolean;

    /**
     * Collect browser / worker coverage when using Puppeteer.
     */
    coverage?: boolean;

    /**
     * Coverage instrumenter module name.
     * Use `"none"` to disable instrumentation.
     * Default: `"istanbul-lib-instrument"`.
     */
    coverageInstrumenter?: string;

    /**
     * How to report coverage for a source file whose content is fully *erased* by TypeScript --
     * `interface`/type-only declarations that produce no JavaScript at all, leaving nothing but
     * the module-registration boilerplate (`Object.defineProperty(exports, "__esModule", ...)`)
     * every CommonJS file gets. Detected structurally: zero functions, zero branches, at most
     * one statement.
     *
     * The browser/worker coverage pipeline only instruments files actually reached by a run's
     * `require()` graph; a file nothing imports would otherwise be silently absent from the
     * report rather than counted as untested, inflating the "All files" percentage. Once such
     * files are included, an erased file raises a real question with no single right answer --
     * it has no runtime logic, so is "0% covered" even meaningful? -- so it's a switch rather
     * than a hardcoded choice:
     * - `"zero"` (default) -- report as computed, i.e. 0% (matches nyc's own `--all` behavior,
     *   verified against nyc's real implementation, not just its docs).
     * - `"full"` -- report as 100% covered (there is no code, so vacuously nothing is untested).
     * - `"ignore"` -- omit the file from the report entirely, as if it were never instrumented.
     *
     * Only applies to files matching the erased shape above -- a real, untested application
     * file with actual functions/branches is always reported honestly at 0%, in every mode.
     */
    erasedCoverageMode?: "zero" | "full" | "ignore";

    /**
     * Glob pattern(s) locating the project's own source files, for the two `--coverage` steps that
     * have to consider files *no test imported*: the browser/worker force-load pass (so an
     * unreferenced-but-real file gets genuine execution-based coverage) and the zero-fill pass that
     * reports whatever is still missing at 0%. Default: `["src/**\/*.ts"]`.
     *
     * Set this when sources do not live in `src/`. Both steps exist to stop an untested file being
     * quietly omitted from the report rather than counted against it, so a wrong root here does not
     * fail loudly -- it silently narrows coverage to the files the tests happened to reach, which
     * *raises* the reported percentage by dropping exactly the files the feature was meant to
     * expose.
     *
     * Only affects the browser/worker targets. The node target's coverage is produced by wrapping
     * the run in `nyc` externally, which has its own `include`/`exclude` in `.nycrc`.
     */
    coverageSrc?: string[];

    /**
     * `nyc` reporter(s) to use for the coverage summary tripwire itself prints/writes -- for
     * the browser/worker `--coverage` write step and the `coverage-report` node-target command.
     * Any name `nyc report --reporter <name>` accepts is valid (eg. `"text"`, `"html"`,
     * `"lcov"`, `"json"`); multiple reporters run together, same as configuring an array for
     * nyc's own `.nycrc`. Default: `["text"]`.
     *
     * This is intentionally separate from `.nycrc`'s own `reporter` setting: nyc's automatic
     * end-of-run report (for the node target's `nyc <command>` step) already reads `.nycrc`
     * directly and is unaffected by this option -- this only controls the reports tripwire's
     * own code explicitly spawns `nyc report` for afterward.
     */
    coverageReporters?: string[];

    /**
     * Test-result reporter(s) to use while a run is in progress (as opposed to
     * `coverageReporters` above, which only controls the separate coverage summary) -- one of
     * `"spec"`, `"dot"`, `"tap"`, `"json"`, `"json-stream"`, `"min"`, `"list"`, `"progress"`,
     * `"landing"`, `"nyan"`, `"doc"`, `"markdown"`, `"xunit"`, `"cargo"`. Multiple reporters run
     * together (each gets every event), same as `coverageReporters`. Default: `["spec"]`.
     *
     * An entry may also be a **custom reporter module** instead of a built-in name -- a relative
     * path (`"./reporters/mine.js"`), a scoped package (`"@me/tripwire-reporter"`), or a bare
     * package name marked with the `"module:"` prefix (`"module:my-reporter"`). It is required
     * from the config file's own directory-independent resolution root (`cwd`) and must export a
     * listener, a `{ listener }` object, or a `createReporter(options)` factory returning either.
     * Custom modules are a node-target feature: the browser and worker targets build their
     * reporters inside the page/worker, so selecting one there fails the run with a message
     * saying so. See `docs/reporters.md`'s "Custom reporters".
     *
     * Unlike most other config-file settings (which CLI flags layer on top of), any
     * `--reporter` flag(s) on the CLI replace this list entirely rather than adding to it --
     * otherwise there would be no way to select a single reporter on the CLI once a config
     * file already lists one or more.
     */
    reporters?: string[];

    /**
     * Alias for `reporters` above (singular, matching the `--reporter` CLI flag's name rather
     * than `coverageReporters`' plural convention). Accepted so either spelling in a config
     * file works; `reporters` wins if both are present.
     */
    reporter?: string[];

    /**
     * Whether to generate per-module source maps for the browser/worker targets (an inline
     * data-URI map embedded in each served module, extracted server-side into a companion
     * `<module>.js.map` -- see `moduleAssets.ts`), so DevTools can show/step through the real
     * `.ts` source instead of the transpiled JS. Measured at ~3-4x the served size of the
     * actual executable code per module, so it's pure download+transpile overhead for anyone
     * not actually debugging (eg. a puppeteer/CI run, where nobody opens DevTools at all --
     * maps are never generated there regardless of this setting).
     *
     * Default: `false`. Turn on for an interactive `--browser-launch open`/`manual` session
     * where you actually want to set breakpoints in the original source; leave off for
     * everyday test runs where the extra processing time isn't buying anything.
     */
    sourceMaps?: boolean;

    /**
     * Show matched files before running.
     */
    showFiles?: boolean;

    /**
     * Log each HTTP request URL and response status code served by the browser runner server.
     */
    verbose?: boolean;

    /**
     * Keeps the CLI running after the first run -- watches the resolved test files (for the node
     * target, also everything they transitively `require`) and automatically re-runs on change,
     * printing a new report each iteration, until interrupted (Ctrl+C). Applies to the node
     * target and to browser/worker with `--browser-launch puppeteer` (the default); no effect on
     * `open`/`manual` launches, which reload from the page's own toggle. Default: `false`.
     */
    watch?: boolean;

    /**
     * Root folder that the server's filesystem fallback handler is allowed to serve --
     * requests that don't match a registered action/asset are served directly from this
     * root (eg. `/README.md` -> `<serverRoot>/README.md`), not from a dedicated `/fs/...`
     * prefix (there is no such prefix).
     * Requests resolving outside this folder are rejected with 403.
     * Defaults to the current working directory when not set.
     */
    serverRoot?: string;

    /**
     * Network interface the embedded HTTP server binds to, and the host every URL handed to a
     * browser, worker or puppeteer instance is built from. Default: `127.0.0.1` -- loopback
     * only, so the dev server is not reachable from the network.
     *
     * Set this when the browser is not on the same host as the runner (a container, a VM, a
     * remote device pointed at `--browser-launch manual`): `0.0.0.0` binds every interface, or
     * name one interface's address to bind just that one. Doing so exposes the server -- which
     * serves the compiled test files and the filesystem fallback rooted at `serverRoot` -- to
     * anything that can reach that address, so it is deliberately opt-in.
     */
    bindAddress?: string;

    /**
     * Disable starting the embedded HTTP server by default.
     * Browser/worker runs still require a server for UI/API transport.
     */
    noServer?: boolean;

    /**
     * Glob patterns for test files (equiv. to positional CLI args).
     */
    spec?: string[];

    /**
     * Modules / files to preload before tests (equiv. to `--require` / `--file`).
     */
    require?: string[];

    /**
     * Serve the browser/worker module graph as a single concatenated bundle (one script
     * tag / `importScripts()` call) instead of one network request per module. Each module
     * is still wrapped and registered exactly the same way (`__tripwireDefine__(url,
     * factory)`), so `require()` resolution and coverage instrumentation are unaffected
     * either way -- and the bundle carries one composite source map (built from every
     * module's own map, each shifted to its real position in the bundle; see
     * `moduleAssets.ts`'s `_buildBundledModuleAsset`) rather than dropping mapping data, so
     * DevTools still shows genuine per-file "Authored" source and real breakpoints/stepping
     * even in bundle mode.
     *
     * Default: `true`, for every `browserLaunch` mode including interactive `open`/`manual`
     * sessions -- the per-module request overhead this avoids is a real, measured cost, with
     * no remaining DevTools-quality tradeoff now that bundling carries a real composite map.
     * Set to `false` (or pass `--no-bundle`) to fall back to one network request per module
     * with its own individual source map, eg. to compare the two or work around a source-map
     * edge case.
     */
    bundle?: boolean;
}
