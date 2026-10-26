/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

"use strict";

const childProcess = require("child_process");
const path = require("path");

const { BENCH_DIR, REPO_DIR, OUT_DIR } = require("../scripts/paths");

// Karma and its plugins live in *this* package now, not in the suite being measured, so they are
// required by name from here rather than left to karma's `karma-*` cwd glob -- which would look
// in whatever directory karma happened to be started from.
const PLUGINS = [
    require("karma-mocha"),
    require("karma-chrome-launcher"),
    require("karma-typescript"),
    require("karma-spec-reporter")
];

const COMMON_TEST_DIR = path.join(REPO_DIR, "common", "test");

/**
 * The first puppeteer release that ships only ES modules, and whose executablePath() answers with a
 * Promise of the path instead of the path itself.
 */
const PUPPETEER_ESM_MAJOR = 25;

let _chromeBin;

/**
 * Whether this Node.js can require() an ES module: unflagged from 20.19 and 22.12, and from 23 on.
 * Node 18, 20.0 - 20.18, 21 and 22.0 - 22.11 throw ERR_REQUIRE_ESM instead.
 * @param nodeVersion - The version to check, `process.versions.node` by default
 */
function _nodeCanRequireEsm(nodeVersion) {
    const parts = String(nodeVersion || process.versions.node).replace(/^v/, "").split(".");
    const major = parseInt(parts[0], 10) || 0;
    const minor = parseInt(parts[1], 10) || 0;

    return major >= 23 || (major === 22 && minor >= 12) || (major === 20 && minor >= 19);
}

/**
 * The major version of the puppeteer the benchmark resolves, or `null` when it is not installed.
 * Read from its package.json, which loads with require() whatever module format puppeteer ships.
 */
function _puppeteerMajor() {
    try {
        const pkg = require(require.resolve("puppeteer/package.json", { paths: [ BENCH_DIR ] }));

        return parseInt(String(pkg.version), 10) || null;
    } catch (e) {
        return null;
    }
}

/**
 * How to find puppeteer's browser for a given puppeteer and Node.js version.
 *
 * Before puppeteer 25 the module is CommonJS and executablePath() returns the path, so it is read in
 * this process. From 25 on executablePath() returns a Promise, which this synchronous config cannot
 * wait for, so a subprocess resolves it -- loading puppeteer with require() where this Node.js can
 * require an ES module and with import() where it cannot. An unknown version is treated as the newest.
 * @returns `{ inProcess, loader }`, where loader is "require" or "import"
 */
function _chromeLookupPlan(puppeteerMajor, nodeVersion) {
    const esmOnly = !puppeteerMajor || puppeteerMajor >= PUPPETEER_ESM_MAJOR;

    return {
        inProcess: !esmOnly,
        loader: (esmOnly && !_nodeCanRequireEsm(nodeVersion)) ? "import" : "require"
    };
}

/**
 * The path from a loaded puppeteer module's executablePath(), when it answers with a string;
 * `null` when it answers with a Promise (which is then left settled quietly, so it cannot surface
 * as an unhandled rejection) and the path has to be resolved out of process instead.
 */
function _executablePathFrom(puppeteerModule) {
    const puppeteer = puppeteerModule && puppeteerModule.default ? puppeteerModule.default : puppeteerModule;
    const result = puppeteer.executablePath();

    if (typeof result === "string") {
        return result;
    }

    if (result && typeof result.then === "function") {
        result.then(null, () => { /* resolved out of process instead */ });
    }

    return null;
}

/**
 * The script a subprocess runs to print puppeteer's browser path, loading it with the given loader.
 */
function _chromeLookupScript(loader) {
    const load = loader === "import"
        ? "import('puppeteer')"
        : "Promise.resolve().then(() => require('puppeteer'))";

    return load + ".then((m) => (m.default || m).executablePath()).then((p) => process.stdout.write(p || ''))";
}

/**
 * Resolves the browser karma should launch, synchronously, because karma reads CHROME_BIN when it
 * launches Chrome straight after this config is built. Cached because validate.js loads all four
 * configs in one process.
 */
function _resolveChromeSync() {
    if (_chromeBin === undefined) {
        const plan = _chromeLookupPlan(_puppeteerMajor(), process.versions.node);
        let chromePath = null;

        if (plan.inProcess) {
            chromePath = _executablePathFrom(require(require.resolve("puppeteer", { paths: [ BENCH_DIR ] })));
        }

        if (chromePath === null) {
            chromePath = childProcess.execFileSync(process.execPath, [ "-e", _chromeLookupScript(plan.loader) ], {
                cwd: BENCH_DIR,
                encoding: "utf8"
            }).trim();
        }

        _chromeBin = chromePath;
    }

    return _chromeBin;
}

function _applyChromeBin() {
    // An explicitly set CHROME_BIN wins, so a debug session can be pointed at whichever
    // chromium-based browser is preferred. The configs this replaced hardcoded a Windows Edge
    // path in a source file, which meant editing the config to use anything else.
    if (process.env.CHROME_BIN) {
        return;
    }

    try {
        const chromePath = _resolveChromeSync();

        if (chromePath) {
            process.env.CHROME_BIN = chromePath;
            process.env.CHROMIUM_BIN = chromePath;
        }
    } catch (error) {
        // The configs this replaced called process.exit(0) here, so a missing browser looked like
        // a clean run. Under a benchmark that is worse than useless -- the arm would be recorded
        // as a one-second success and averaged in. Warn and let karma fail to launch instead, so
        // the driver reports the arm as FAILED and excludes it from the statistics.
        console.warn("Puppeteer executable path could not be resolved; karma has no browser to launch.");
    }
}

/**
 * Instrumentation is the single largest cost difference between a coverage and a non-coverage
 * run, so the benchmark driver turns it on or off for *every* arm at once rather than letting
 * each config decide. See scripts/runBenchmark.js and the README's "Coverage" section.
 */
function _coverageRequested() {
    return process.env.TRIPWIRE_BENCH_COVERAGE === "1";
}

/**
 * Build a Karma configuration for one (suite, target) arm of the benchmark.
 *
 * @param {object} options
 * @param {string} options.suite      Suite id, used to name the coverage output directory.
 * @param {string} options.suiteDir   Absolute path of the package whose tests are being run.
 * @param {"browser"|"worker"} options.target
 * @param {string} options.tsconfig   Absolute path of the karma-only project for this arm.
 * @param {RegExp[]} options.coverageExclude Patterns kept out of the coverage numbers.
 * @param {boolean} [options.debug]   Headful Chrome and no instrumentation, for `debug:karma:*`.
 */
function createConfig(options) {
    const { suite, suiteDir, target, tsconfig, coverageExclude } = options;
    const debug = !!options.debug;
    const isWorker = target === "worker";
    const instrument = !debug && _coverageRequested();

    _applyChromeBin();

    // Karma resolves `basePath` against the directory holding the config file, and
    // karma-typescript resolves `karmaTypescriptConfig.tsconfig` against `basePath`. Both of
    // those reach back out of this package into the suite, so both are made relative here.
    const basePath = path.relative(__dirname, suiteDir);
    const relTsconfig = path.relative(suiteDir, tsconfig);
    const rel = (abs) => path.relative(suiteDir, abs).split(path.sep).join("/");

    const testGlob = isWorker
        ? "test/src/!(browser|node)/**/*.ts"
        : "test/src/!(node|worker)/**/*.ts";

    const files = [
        { pattern: "src/**/*.ts" }
    ];

    if (isWorker) {
        // The adapter intercepts mocha.run() and hands the suite to the worker runner, which is
        // served but not included so the worker can fetch it itself.
        files.push({ pattern: rel(path.join(COMMON_TEST_DIR, "worker-adapter.js")) });
        files.push({ pattern: testGlob });
        files.push({
            pattern: rel(path.join(COMMON_TEST_DIR, "worker-test-runner.js")),
            included: false,
            served: true,
            watched: false
        });
    } else {
        files.push({ pattern: testGlob });
    }

    // Benchmark runs never write into the measured package's own `coverage/` directory -- that is
    // where the real `npm test` pipelines put the artifacts CI uploads to Codecov.
    const reportDir = path.join(OUT_DIR, "coverage", suite + "-" + target + "-karma");

    return {
        basePath: basePath,
        browsers: [ "Chromium_without_security" ],
        listenAddress: "localhost",
        hostname: "localhost",
        plugins: PLUGINS,
        frameworks: [ "mocha", "karma-typescript" ],
        files: files,
        preprocessors: {
            "src/**/*.ts": [ "karma-typescript" ],
            "test/src/**/*.ts": [ "karma-typescript" ]
        },
        karmaTypescriptConfig: {
            tsconfig: relTsconfig,
            compilerOptions: isWorker
                ? {
                    sourceMap: false,
                    inlineSourceMap: debug,
                    inlineSources: debug,
                    module: "commonjs"
                }
                : {
                    sourceMap: true
                },
            bundlerOptions: {
                sourceMap: !isWorker
            },
            coverageOptions: {
                instrumentation: instrument,
                sourceMap: !isWorker || debug,
                exclude: coverageExclude
            },
            reports: instrument
                ? {
                    "json": {
                        "directory": reportDir,
                        "subdirectory": ".",
                        "filename": "coverage-final.json"
                    },
                    "text": ""
                }
                : {}
        },
        reporters: [ "spec" ].concat(instrument ? [ "karma-typescript" ] : []),
        customLaunchers: {
            Chromium_without_security: {
                base: debug ? "Chrome" : "ChromeHeadless",
                flags: [ "--disable-web-security", "--disable-site-isolation-trials", "--no-sandbox" ]
            }
        },
        logLevel: "INFO",
        captureTimeout: 60000,
        browserNoActivityTimeout: 60000
    };
}

module.exports = {
    createConfig,
    // Exposed for the benchmark's tests
    PUPPETEER_ESM_MAJOR, _nodeCanRequireEsm, _puppeteerMajor, _chromeLookupPlan, _executablePathFrom, _chromeLookupScript
};
