/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 *
 * Karma arm of the benchmark: the `chai` suite's worker tests, run by mocha inside Chrome
 * via karma. Compare against the tripwire arm for the same suite/target -- see ../README.md.
 */

"use strict";

const path = require("path");
const { createConfig } = require("./createConfig");
const { REPO_DIR } = require("../scripts/paths");

module.exports = function (config) {
    config.set(createConfig({
        suite: "chai",
        suiteDir: path.join(REPO_DIR, "shim", "chai"),
        target: "worker",
        tsconfig: path.resolve(__dirname, "../tsconfig/chai.worker.json"),
        coverageExclude: [ /\.(d|spec|test)\.ts$/i, /index\.ts$/i, /globalErr\.ts$/i, /\/node_modules\//i ],
        debug: process.argv.indexOf("--watch") !== -1
    }));
};
