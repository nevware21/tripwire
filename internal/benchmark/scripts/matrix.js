/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

"use strict";

const path = require("path");
const { BENCH_DIR, REPO_DIR, OUT_DIR, TRIPWIRE_BIN, resolveBin } = require("./paths");

const TARGETS = [ "node", "browser", "worker" ];

/**
 * The two suites the benchmark measures. Both are real, maintained test suites -- the point of
 * benchmarking against them rather than a synthetic fixture is that the numbers describe the work
 * this repository actually does.
 *
 * `tsconfig` and `specs` are the suite's *own* test project and globs, byte-identical to what its
 * `test:node` / `test:browser` / `test:worker` scripts pass, so the tripwire and mocha arms are
 * measuring the same run a developer gets. The karma arms need their own project (karma-typescript
 * requires `module: commonjs` for its bundler) and those live in ../tsconfig.
 */
const SUITES = [
    {
        id: "core",
        label: "core",
        dir: path.join(REPO_DIR, "core"),
        tsconfig: "./test/tsconfig.test.json",
        specs: {
            node: "./test/src/!(browser|worker)/**/*.test.ts",
            browser: "./test/src/!(node|worker)/**/*.test.ts",
            worker: "./test/src/!(node|browser)/**/*.test.ts"
        },
        karma: {
            browser: path.join(BENCH_DIR, "karma", "core.browser.conf.js"),
            worker: path.join(BENCH_DIR, "karma", "core.worker.conf.js")
        }
    },
    {
        id: "chai",
        label: "shim/chai",
        dir: path.join(REPO_DIR, "shim", "chai"),
        tsconfig: "./test/tsconfig.test.json",
        specs: {
            node: "./test/src/!(browser|worker)/**/*.test.ts",
            browser: "./test/src/!(node|worker)/**/*.test.ts",
            worker: "./test/src/!(node|browser)/**/*.test.ts"
        },
        karma: {
            browser: path.join(BENCH_DIR, "karma", "chai.browser.conf.js"),
            worker: path.join(BENCH_DIR, "karma", "chai.worker.conf.js")
        }
    }
];

function _key(suite, target, runner) {
    return suite.id + "-" + target + "-" + runner;
}

/**
 * Wrap a node command in nyc, with every nyc output path pointed inside this package. The suite's
 * own `.nycrc` is still picked up from `cwd`, so what gets instrumented matches its real run --
 * only where the results land is different, so a benchmark can never overwrite the coverage
 * artifacts CI uploads.
 */
function _withNyc(key, args) {
    return [
        resolveBin("nyc", "bin/nyc.js"),
        "--cache",
        "--temp-dir", path.join(OUT_DIR, "nyc", key),
        "--report-dir", path.join(OUT_DIR, "coverage", key),
        "--reporter=json",
        process.execPath
    ].concat(args);
}

/**
 * The three runners. Each declares the targets it can actually drive, so the matrix has holes
 * rather than pretending otherwise: mocha has no browser or worker story of its own (in the
 * browser it *is* the karma arm, driven by karma-mocha), and karma is browser-only.
 */
const RUNNERS = [
    {
        id: "tripwire",
        label: "tripwire",
        targets: TARGETS,
        describe: "tripwire's own CLI (core/bin/tripwire.js)",
        build(suite, target, opts) {
            const key = _key(suite, target, "tripwire");
            let args = [ TRIPWIRE_BIN ];

            if (target !== "node") {
                args.push("--target", target);
            }

            if (opts.typeCheck) {
                args.push("--type-check");
            }

            if (opts.coverage && target !== "node") {
                args.push("--coverage");
            }

            args.push("-p", suite.tsconfig, suite.specs[target]);

            if (target === "node") {
                args.push("--", "--trace-uncaught");

                if (opts.coverage) {
                    args = _withNyc(key, args);
                }
            }

            return { key, file: process.execPath, args, cwd: suite.dir, env: {} };
        }
    },
    {
        id: "mocha",
        label: "mocha",
        targets: [ "node" ],
        describe: "mocha via ts-mocha (the pre-tripwire node runner)",
        build(suite, target, opts) {
            const key = _key(suite, target, "mocha");
            let args = [ resolveBin("ts-mocha", "bin/ts-mocha") ];

            if (opts.typeCheck) {
                // ts-mocha transpiles without checking unless asked, exactly like tripwire's
                // --transpile-only default, so the same switch keeps both arms comparable.
                args.push("--type-check");
            }

            args.push("-p", suite.tsconfig, suite.specs[target], "--trace-uncaught");

            if (opts.coverage) {
                args = _withNyc(key, args);
            }

            return {
                key,
                file: process.execPath,
                args,
                cwd: suite.dir,
                // ts-node only type-checks files it is handed unless told to load the whole
                // program; without this the `--type-check` above checks far less than tripwire's.
                env: { TS_NODE_FILES: "true" }
            };
        }
    },
    {
        id: "karma",
        label: "karma",
        targets: [ "browser", "worker" ],
        describe: "mocha inside Chrome, driven by karma + karma-typescript",
        build(suite, target, opts) {
            return {
                key: _key(suite, target, "karma"),
                file: process.execPath,
                args: [ resolveBin("karma", "bin/karma"), "start", suite.karma[target], "--single-run" ],
                // Karma is started from this package so its plugins, and the Chrome puppeteer
                // downloaded for it, resolve from here rather than from the suite.
                cwd: BENCH_DIR,
                env: { TRIPWIRE_BENCH_COVERAGE: opts.coverage ? "1" : "0" }
            };
        }
    }
];

function findSuite(id) {
    return SUITES.filter((s) => s.id === id)[0];
}

function findRunner(id) {
    return RUNNERS.filter((r) => r.id === id)[0];
}

/**
 * Expand the requested selection into the arms that actually exist, dropping the combinations no
 * runner supports rather than reporting them as failures.
 */
function buildMatrix(selection, opts) {
    const arms = [];

    selection.suites.forEach((suiteId) => {
        selection.targets.forEach((target) => {
            selection.runners.forEach((runnerId) => {
                const suite = findSuite(suiteId);
                const runner = findRunner(runnerId);

                if (runner.targets.indexOf(target) === -1) {
                    return;
                }

                arms.push(Object.assign({
                    suite: suite,
                    target: target,
                    runner: runner
                }, runner.build(suite, target, opts)));
            });
        });
    });

    return arms;
}

module.exports = { SUITES, RUNNERS, TARGETS, buildMatrix, findSuite, findRunner };
