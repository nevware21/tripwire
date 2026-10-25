/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 *
 * Karma arm of the benchmark: the `core` suite's worker tests, run by mocha inside Chrome
 * via karma. Compare against the tripwire arm for the same suite/target -- see ../README.md.
 */

"use strict";

const path = require("path");
const { createConfig } = require("./createConfig");
const { REPO_DIR } = require("../scripts/paths");

module.exports = function (config) {
    config.set(createConfig({
        suite: "core",
        suiteDir: path.join(REPO_DIR, "core"),
        target: "worker",
        tsconfig: path.resolve(__dirname, "../tsconfig/core.worker.json"),
        coverageExclude: [ /\.(d|spec|test)\.ts$/i, /index\.ts$/i, /checkError\.ts$/i, /\/node_modules\//i ],
        debug: process.argv.indexOf("--watch") !== -1
    }));
};
