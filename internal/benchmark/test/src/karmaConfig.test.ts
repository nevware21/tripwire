/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import * as childProcess from "child_process";
import * as fs from "fs";
import * as path from "path";

const paths = require("../../scripts/paths");

const CREATE_CONFIG = path.join(paths.BENCH_DIR, "karma", "createConfig.js");

function loadConf(name: string): any {
    let captured: any = null;
    require(path.join(paths.BENCH_DIR, "karma", name))({
        set: (value: any) => {
            captured = value;
        }
    });

    return captured;
}

/**
 * The karma configs are the only place the benchmark configures karma, so what they hand karma is
 * checked here: which files are served, how the worker arm is wired, and that coverage is only
 * switched on when the benchmark asks for it.
 */
describe("benchmark karma configs", () => {
    const savedEnv: { [name: string]: string | undefined } = {};

    before(() => {
        [ "CHROME_BIN", "CHROMIUM_BIN", "TRIPWIRE_BENCH_COVERAGE" ].forEach((name) => {
            savedEnv[name] = process.env[name];
        });
    });

    after(() => {
        Object.keys(savedEnv).forEach((name) => {
            if (savedEnv[name] === undefined) {
                delete process.env[name];
            } else {
                process.env[name] = savedEnv[name];
            }
        });
    });

    it("points karma at puppeteer's own browser when none is configured", function () {
        this.timeout(60000);
        delete process.env.CHROME_BIN;
        delete process.env.CHROMIUM_BIN;
        delete require.cache[require.resolve(CREATE_CONFIG)];

        loadConf("chai.browser.conf.js");

        assert.isString(process.env.CHROME_BIN);
        assert.isTrue(fs.existsSync(process.env.CHROME_BIN), "the resolved browser exists");
        assert.equal(process.env.CHROMIUM_BIN, process.env.CHROME_BIN);
    });

    it("leaves a browser that is already configured alone", () => {
        process.env.CHROME_BIN = "preconfigured-browser";
        delete require.cache[require.resolve(CREATE_CONFIG)];

        loadConf("chai.browser.conf.js");

        assert.equal(process.env.CHROME_BIN, "preconfigured-browser");
    });

    it("serves the sources and the browser tests for a browser arm", () => {
        process.env.TRIPWIRE_BENCH_COVERAGE = "0";
        const conf = loadConf("core.browser.conf.js");

        assert.equal(path.resolve(path.dirname(CREATE_CONFIG), conf.basePath), path.join(paths.REPO_DIR, "core"));
        assert.deepEqual(conf.files, [ { pattern: "src/**/*.ts" }, { pattern: "test/src/!(node|worker)/**/*.ts" } ]);
        assert.deepEqual(conf.frameworks, [ "mocha", "karma-typescript" ]);
        assert.deepEqual(conf.browsers, [ "Chromium_without_security" ]);
        assert.equal(conf.customLaunchers.Chromium_without_security.base, "ChromeHeadless");
        assert.equal(conf.plugins.length, 4, "the plugins are listed so karma does not glob for them");
        assert.equal(conf.karmaTypescriptConfig.tsconfig.split(path.sep).join("/"), "../internal/benchmark/tsconfig/core.browser.json");
        assert.isTrue(conf.karmaTypescriptConfig.compilerOptions.sourceMap);
    });

    it("wraps the worker tests with the shared worker adapter and runner", () => {
        const conf = loadConf("core.worker.conf.js");
        const patterns = conf.files.map((f: any) => f.pattern);

        assert.equal(patterns[0], "src/**/*.ts");
        assert.includes(patterns[1], "common/test/worker-adapter.js");
        assert.equal(patterns[2], "test/src/!(browser|node)/**/*.ts");
        assert.includes(patterns[3], "common/test/worker-test-runner.js");
        assert.deepEqual([ conf.files[3].included, conf.files[3].served, conf.files[3].watched ], [ false, true, false ],
            "the worker runner is served for the worker to load, not included in the page");
        assert.equal(conf.karmaTypescriptConfig.compilerOptions.module, "commonjs");
        assert.isFalse(conf.karmaTypescriptConfig.bundlerOptions.sourceMap);

        conf.files.forEach((f: any) => {
            if (f.pattern.indexOf("*") === -1) {
                assert.isTrue(fs.existsSync(path.join(paths.REPO_DIR, "core", f.pattern)), f.pattern + " exists");
            }
        });
    });

    it("loads every config the benchmark matrix refers to, each for its own suite and target", () => {
        const matrix = require("../../scripts/matrix");

        matrix.SUITES.forEach((suite: any) => {
            Object.keys(suite.karma).forEach((target) => {
                const conf = loadConf(path.basename(suite.karma[target]));

                assert.equal(path.resolve(path.dirname(CREATE_CONFIG), conf.basePath), suite.dir, suite.id + "." + target);
                assert.includes(conf.karmaTypescriptConfig.tsconfig.split(path.sep).join("/"), "tsconfig/" + suite.id + "." + target + ".json");
                assert.equal(conf.files.length, target === "worker" ? 4 : 2);
            });
        });
    });

    it("only instruments and reports coverage when the benchmark asks for it", () => {
        process.env.TRIPWIRE_BENCH_COVERAGE = "0";
        const plain = loadConf("chai.browser.conf.js");

        assert.isFalse(plain.karmaTypescriptConfig.coverageOptions.instrumentation);
        assert.deepEqual(plain.reporters, [ "spec" ]);
        assert.deepEqual(plain.karmaTypescriptConfig.reports, {});

        process.env.TRIPWIRE_BENCH_COVERAGE = "1";
        const covered = loadConf("chai.browser.conf.js");

        assert.isTrue(covered.karmaTypescriptConfig.coverageOptions.instrumentation);
        assert.deepEqual(covered.reporters, [ "spec", "karma-typescript" ]);
        assert.equal(covered.karmaTypescriptConfig.reports.json.directory, path.join(paths.OUT_DIR, "coverage", "chai-browser-karma"));
        assert.equal(covered.karmaTypescriptConfig.reports.json.filename, "coverage-final.json");
    });

    it("opens a visible browser without instrumentation when debugging", () => {
        process.env.TRIPWIRE_BENCH_COVERAGE = "1";
        const { createConfig } = require(CREATE_CONFIG);
        const conf = createConfig({
            suite: "chai",
            suiteDir: path.join(paths.REPO_DIR, "shim", "chai"),
            target: "worker",
            tsconfig: path.join(paths.BENCH_DIR, "tsconfig", "chai.worker.json"),
            coverageExclude: [],
            debug: true
        });

        assert.equal(conf.customLaunchers.Chromium_without_security.base, "Chrome");
        assert.isFalse(conf.karmaTypescriptConfig.coverageOptions.instrumentation, "debugging never instruments");
        assert.isTrue(conf.karmaTypescriptConfig.compilerOptions.inlineSourceMap);
        assert.isTrue(conf.karmaTypescriptConfig.coverageOptions.sourceMap);
    });
});

/**
 * How the karma configs find puppeteer's browser before karma launches it. puppeteer 25 ships only ES
 * modules and answers executablePath() with a Promise; earlier releases are CommonJS and answer with the
 * path. Node.js 20.19+ and 22.12+ can require() an ES module, older versions cannot.
 */
describe("benchmark karma browser lookup", function () {
    // The script tests start node and load puppeteer in a child process
    this.timeout(60000);

    const config = require(CREATE_CONFIG);

    function lookupWith(loader: string): childProcess.SpawnSyncReturns<string> {
        return childProcess.spawnSync(process.execPath, [ "-e", config._chromeLookupScript(loader) ], {
            cwd: paths.BENCH_DIR,
            encoding: "utf8"
        });
    }

    describe("_nodeCanRequireEsm", () => {
        it("knows which Node.js versions can require() an ES module", () => {
            const expected: { [version: string]: boolean } = {
                "18.20.8": false,
                "20.0.0": false,
                "20.18.3": false,
                "20.19.0": true,
                "20.19.5": true,
                "21.7.3": false,
                "22.11.0": false,
                "22.12.0": true,
                "23.0.0": true,
                "24.1.0": true,
                "v20.19.5": true
            };

            Object.keys(expected).forEach((version) => {
                assert.equal(config._nodeCanRequireEsm(version), expected[version], version);
            });
        });

        it("checks the running Node.js by default", () => {
            assert.equal(config._nodeCanRequireEsm(), config._nodeCanRequireEsm(process.versions.node));
        });
    });

    describe("_puppeteerMajor", () => {
        it("reads the major version of the installed puppeteer", () => {
            const pkg = require(require.resolve("puppeteer/package.json", { paths: [ paths.BENCH_DIR ] }));

            assert.equal(config._puppeteerMajor(), parseInt(pkg.version, 10));
        });
    });

    describe("_chromeLookupPlan", () => {
        it("reads the path in-process before puppeteer 25, on any Node.js", () => {
            assert.deepEqual(config._chromeLookupPlan(24, "18.20.8"), { inProcess: true, loader: "require" });
            assert.deepEqual(config._chromeLookupPlan(19, "24.1.0"), { inProcess: true, loader: "require" });
        });

        it("resolves the Promise out of process from puppeteer 25 on, importing it where require() cannot load it", () => {
            assert.deepEqual(config._chromeLookupPlan(25, "18.20.8"), { inProcess: false, loader: "import" });
            assert.deepEqual(config._chromeLookupPlan(25, "22.11.0"), { inProcess: false, loader: "import" });
            assert.deepEqual(config._chromeLookupPlan(25, "20.19.0"), { inProcess: false, loader: "require" });
            assert.deepEqual(config._chromeLookupPlan(26, "24.1.0"), { inProcess: false, loader: "require" });
        });

        it("treats an unknown puppeteer version as the newest", () => {
            assert.deepEqual(config._chromeLookupPlan(null, "18.20.8"), { inProcess: false, loader: "import" });
            assert.deepEqual(config._chromeLookupPlan(null, "24.1.0"), { inProcess: false, loader: "require" });
        });

        it("matches the version that ships only ES modules", () => {
            assert.equal(config.PUPPETEER_ESM_MAJOR, 25);
        });
    });

    describe("_executablePathFrom", () => {
        it("uses the path an older puppeteer answers with", () => {
            assert.equal(config._executablePathFrom({ executablePath: () => "/cache/chrome/linux-1/chrome" }), "/cache/chrome/linux-1/chrome");
            assert.equal(config._executablePathFrom({ default: { executablePath: () => "/from/default" } }), "/from/default");
        });

        it("signals an out of process lookup when puppeteer answers with a Promise", () => {
            assert.isNull(config._executablePathFrom({ executablePath: () => Promise.resolve("/later") }));
        });

        it("leaves a rejected Promise settled rather than unhandled", async () => {
            const unhandled: any[] = [];
            const onUnhandled = (reason: any) => {
                unhandled.push(reason);
            };
            process.on("unhandledRejection", onUnhandled);

            try {
                assert.isNull(config._executablePathFrom({ executablePath: () => Promise.reject(new Error("no browser")) }));
                await new Promise((resolve) => setTimeout(resolve, 10));
            } finally {
                process.removeListener("unhandledRejection", onUnhandled);
            }

            assert.deepEqual(unhandled, []);
        });
    });

    describe("_chromeLookupScript", () => {
        it("loads puppeteer with the requested loader", () => {
            assert.includes(config._chromeLookupScript("import"), "import('puppeteer')");
            assert.isFalse(config._chromeLookupScript("import").indexOf("require(") !== -1);
            assert.includes(config._chromeLookupScript("require"), "require('puppeteer')");
        });

        it("finds the browser with import() on every Node.js", () => {
            const run = lookupWith("import");

            assert.equal(run.status, 0, run.stderr);
            assert.isTrue(fs.existsSync(run.stdout.trim()), "the printed path exists");
        });

        it("finds the browser with require() where this Node.js can load the installed puppeteer that way", function () {
            if (config._puppeteerMajor() >= config.PUPPETEER_ESM_MAJOR && !config._nodeCanRequireEsm()) {
                // eg. Node 18 with puppeteer 25: the plan never picks require() here, see _chromeLookupPlan
                assert.equal(config._chromeLookupPlan(config._puppeteerMajor(), process.versions.node).loader, "import");
                return;
            }

            const run = lookupWith("require");

            assert.equal(run.status, 0, run.stderr);
            assert.isTrue(fs.existsSync(run.stdout.trim()), "the printed path exists");
        });

        it("plans a lookup that works for the installed puppeteer on this Node.js", () => {
            const plan = config._chromeLookupPlan(config._puppeteerMajor(), process.versions.node);
            const run = lookupWith(plan.loader);

            assert.equal(run.status, 0, run.stderr);
            assert.isTrue(fs.existsSync(run.stdout.trim()));
        });
    });
});
