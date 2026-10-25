/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

"use strict";

const path = require("path");

// Everything this package points at is outside it -- the suites it measures live in `core/` and
// `shim/chai/`, and the runner under test is the bundle `runner`'s build drops into `core/bin`.
// Resolving all of them from one place keeps the matrix declarative and gives `validate.js` a
// single list to check for existence.
const BENCH_DIR = path.resolve(__dirname, "..");
// This package lives at internal/benchmark, so the repo root is two levels up, not one. Every
// out-of-package path below is derived from here rather than spelled out again, so moving this
// package only ever costs this one line -- the karma configs' own `../..` reaches are the
// exception and are relative to their tsconfig files, not to this.
const REPO_DIR = path.resolve(BENCH_DIR, "..", "..");

// Benchmark runs write here and nowhere else, so a benchmark can never overwrite the coverage
// artifacts the real `npm test` pipelines produce (see README, "Coverage").
const OUT_DIR = path.join(BENCH_DIR, ".benchmark");

const TRIPWIRE_BIN = path.join(REPO_DIR, "core", "bin", "tripwire.js");

/**
 * Resolve the entry point of a tool.
 *
 * Karma and ts-mocha resolve from *this* package: that is the whole point of the split, since
 * `core` and `shim/chai` no longer carry them, so the harness has to bring its own. `nyc` is
 * deliberately not among this package's dependencies -- it is declared once at the repo root and
 * every suite already invokes it from there, so the benchmark resolves it the same way rather than
 * introducing a second copy.
 */
function resolveBin(pkgName, relative) {
    let manifest;

    try {
        manifest = require.resolve(pkgName + "/package.json", { paths: [ BENCH_DIR ] });
    } catch (e) {
        throw new Error("Unable to resolve \"" + pkgName + "\" from " + BENCH_DIR +
            ". Run \"rush update\" (and \"npm install\" at the repo root for nyc) and try again.");
    }

    return path.join(path.dirname(manifest), relative);
}

module.exports = { BENCH_DIR, REPO_DIR, OUT_DIR, TRIPWIRE_BIN, resolveBin };
