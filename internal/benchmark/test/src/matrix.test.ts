/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import * as path from "path";

const matrix = require("../../scripts/matrix");
const paths = require("../../scripts/paths");

function allArms(opts?: any): any[] {
    return matrix.buildMatrix({
        suites: matrix.SUITES.map((s: any) => s.id),
        targets: matrix.TARGETS,
        runners: matrix.RUNNERS.map((r: any) => r.id)
    }, opts || { typeCheck: true, coverage: false });
}

function armFor(suite: string, target: string, runner: string, opts?: any): any {
    return matrix.buildMatrix({ suites: [ suite ], targets: [ target ], runners: [ runner ] }, opts || { typeCheck: true, coverage: false })[0];
}

describe("benchmark matrix", () => {
    it("knows the two suites, the three targets and the three runners", () => {
        assert.deepEqual(matrix.SUITES.map((s: any) => s.id), [ "core", "chai" ]);
        assert.deepEqual(matrix.TARGETS, [ "node", "browser", "worker" ]);
        assert.deepEqual(matrix.RUNNERS.map((r: any) => r.id), [ "tripwire", "mocha", "karma" ]);
    });

    it("builds twelve arms with unique keys, only for the targets each runner supports", () => {
        const arms = allArms();
        const keys = arms.map((a) => a.key);

        assert.equal(arms.length, 12);
        assert.equal(new Set(keys).size, 12);
        assert.deepEqual(arms.filter((a) => a.runner.id === "mocha").map((a) => a.target), [ "node", "node" ]);
        assert.deepEqual(arms.filter((a) => a.runner.id === "karma").map((a) => a.target), [ "browser", "worker", "browser", "worker" ]);
        assert.isTrue(keys.indexOf("chai-worker-tripwire") !== -1);
    });

    it("builds nothing for an empty selection or an unsupported combination", () => {
        assert.deepEqual(matrix.buildMatrix({ suites: [], targets: matrix.TARGETS, runners: [ "tripwire" ] }, {}), []);
        assert.deepEqual(matrix.buildMatrix({ suites: [ "core" ], targets: [ "node" ], runners: [ "karma" ] }, {}), []);
    });

    it("finds suites and runners by id", () => {
        assert.equal(matrix.findSuite("chai").label, "shim/chai");
        assert.equal(matrix.findRunner("karma").label, "karma");
        assert.isUndefined(matrix.findSuite("nope"));
        assert.isUndefined(matrix.findRunner("nope"));
    });

    describe("tripwire arms", () => {
        it("runs the CLI in-process on node, from the suite's own directory", () => {
            const arm = armFor("core", "node", "tripwire");

            assert.equal(arm.file, process.execPath);
            assert.equal(arm.cwd, path.join(paths.REPO_DIR, "core"));
            assert.equal(arm.args[0], paths.TRIPWIRE_BIN);
            assert.isTrue(arm.args.indexOf("--target") === -1, "node is the CLI's default target");
            assert.isTrue(arm.args.indexOf("--type-check") !== -1);
            assert.deepEqual(arm.args.slice(-2), [ "--", "--trace-uncaught" ]);
            assert.isTrue(arm.args.indexOf("./test/src/!(browser|worker)/**/*.test.ts") !== -1);
        });

        it("names the target for the browser and worker", () => {
            const browser = armFor("chai", "browser", "tripwire");
            const worker = armFor("chai", "worker", "tripwire");

            assert.deepEqual(browser.args.slice(1, 3), [ "--target", "browser" ]);
            assert.deepEqual(worker.args.slice(1, 3), [ "--target", "worker" ]);
            assert.isTrue(browser.args.indexOf("--") === -1, "node options only apply to the node target");
        });

        it("instruments node runs through nyc and the others through the CLI's own --coverage", () => {
            const node = armFor("core", "node", "tripwire", { typeCheck: false, coverage: true });
            const browser = armFor("core", "browser", "tripwire", { typeCheck: false, coverage: true });

            assert.equal(node.args[0], paths.resolveBin("nyc", "bin/nyc.js"));
            assert.isTrue(node.args.indexOf("--temp-dir") !== -1);
            assert.equal(node.args[node.args.indexOf("--temp-dir") + 1], path.join(paths.OUT_DIR, "nyc", "core-node-tripwire"));
            assert.isTrue(node.args.indexOf(paths.TRIPWIRE_BIN) !== -1, "nyc wraps the CLI");
            assert.isTrue(node.args.indexOf("--type-check") === -1);

            assert.isTrue(browser.args.indexOf("--coverage") !== -1);
            assert.equal(browser.args[0], paths.TRIPWIRE_BIN, "no nyc wrapper outside node");
        });
    });

    describe("mocha arms", () => {
        it("runs ts-mocha with the suite's project and loads the files the project lists", () => {
            const arm = armFor("core", "node", "mocha");

            assert.equal(arm.args[0], paths.resolveBin("ts-mocha", "bin/ts-mocha"));
            assert.deepEqual(arm.env, { TS_NODE_FILES: "true" });
            assert.isTrue(arm.args.indexOf("--type-check") !== -1);
            assert.equal(arm.args[arm.args.length - 1], "--trace-uncaught");
        });

        it("wraps ts-mocha in nyc for coverage", () => {
            const arm = armFor("chai", "node", "mocha", { typeCheck: false, coverage: true });

            assert.equal(arm.args[0], paths.resolveBin("nyc", "bin/nyc.js"));
            assert.isTrue(arm.args.indexOf(paths.resolveBin("ts-mocha", "bin/ts-mocha")) !== -1);
            assert.isTrue(arm.args.indexOf("--type-check") === -1);
        });
    });

    describe("karma arms", () => {
        it("starts a single karma run of the suite's config from the benchmark directory", () => {
            const arm = armFor("core", "worker", "karma");

            assert.equal(arm.args[0], paths.resolveBin("karma", "bin/karma"));
            assert.deepEqual(arm.args.slice(1), [ "start", path.join(paths.BENCH_DIR, "karma", "core.worker.conf.js"), "--single-run" ]);
            assert.equal(arm.cwd, paths.BENCH_DIR);
        });

        it("passes the coverage request to the karma config through the environment", () => {
            assert.deepEqual(armFor("chai", "browser", "karma", { coverage: false }).env, { TRIPWIRE_BENCH_COVERAGE: "0" });
            assert.deepEqual(armFor("chai", "browser", "karma", { coverage: true }).env, { TRIPWIRE_BENCH_COVERAGE: "1" });
        });
    });

    describe("paths", () => {
        it("locates the repository, the benchmark and the CLI bundle", () => {
            assert.equal(path.basename(paths.BENCH_DIR), "benchmark");
            assert.equal(paths.TRIPWIRE_BIN, path.join(paths.REPO_DIR, "core", "bin", "tripwire.js"));
            assert.equal(paths.OUT_DIR, path.join(paths.BENCH_DIR, ".benchmark"));
        });

        it("explains how to install a tool it cannot resolve", () => {
            assert.throws(() => paths.resolveBin("definitely-not-an-installed-package", "bin/x"), /Run "rush update"/);
        });
    });
});
