/*
 * @nevware21/tripwire-globals
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

// Runtime half of this package's tests (`npm run test:runtime`); test/globals.check.ts is the
// type half. This file exists because "npm test" used to be nothing but `tsc --noEmit`, which
// proves index.d.ts declares what it should and never once executes index.js -- the runtime
// installer that `import "@nevware21/tripwire-globals"` is, and one of the two migration paths
// offered for tripwire no longer declaring ambient globals.
//
// Every assertion about the global object runs in a **child process**, deliberately. The bare
// names are process-wide and whatever runs this file may already have installed them, so a probe
// run in-process could not tell "the package installed them" from "they were already there".
// Each probe starts from a clean global, reports what it saw as JSON, and the parent asserts on
// that. The `before` field of each probe is what makes the test discriminate: a probe that finds
// the names already present fails rather than passing for the wrong reason.
//
// No dependency beyond node itself -- this package is published, and a test harness has no place
// in its dependency graph (see the benchmark project for where that tooling lives).

"use strict";

var fs = require("fs");
var os = require("os");
var path = require("path");
var url = require("url");
var childProcess = require("child_process");

var PKG_ROOT = path.resolve(__dirname, "..", "..");
var PKG_INDEX = path.join(PKG_ROOT, "index.js");

// The core entry this package wraps, resolved the same way index.js resolves it.
var CORE_GLOBALS = require.resolve("@nevware21/tripwire/globals", { paths: [PKG_ROOT] });
var CORE_MAIN = require.resolve("@nevware21/tripwire", { paths: [PKG_ROOT] });

// core/src/globals.ts declares the TripwireGlobals interface, which core/globals.js names as the
// list to keep in sync. Reading it makes that comment enforceable: a name added to the interface
// and not to either globals.js fails this suite.
var GLOBALS_TS = path.resolve(path.dirname(CORE_GLOBALS), "src", "globals.ts");

/**
 * The names TripwireGlobals declares, read from the interface rather than hardcoded here so this
 * suite cannot drift from the source of truth the way a copied list would.
 */
function readDeclaredNames() {
    if (!fs.existsSync(GLOBALS_TS)) {
        throw new Error("Cannot read the declared global names -- " + GLOBALS_TS + " does not exist");
    }

    var src = fs.readFileSync(GLOBALS_TS, "utf8");
    var block = /export\s+interface\s+TripwireGlobals\s*\{([\s\S]*?)\r?\n\}/.exec(src);

    if (!block) {
        throw new Error("Could not find the TripwireGlobals interface in " + GLOBALS_TS);
    }

    var names = [];
    block[1].split(/\r?\n/).forEach(function (line) {
        var field = /^\s+([A-Za-z_$][\w$]*)\??\s*:/.exec(line);
        if (field) {
            names.push(field[1]);
        }
    });

    if (names.length === 0) {
        throw new Error("TripwireGlobals in " + GLOBALS_TS + " parsed to zero names");
    }

    return names;
}

var NAMES = readDeclaredNames();

/**
 * Runs `script` in a clean child node process and parses the JSON it writes to stdout. Anything
 * the child writes to stderr, and a non-zero exit, are surfaced as a failure rather than being
 * swallowed -- a probe that crashed must not read as a probe that found nothing.
 *
 * The script is written to a temp **file** rather than passed with `node -e`, for two reasons
 * that both matter to what is being measured here:
 *
 * - `-e` evaluates in a context that exposes node's builtin modules as lazy globals, so
 *   `globalThis.assert` is already a function before anything is required -- the probe would
 *   report a name as installed that node itself provided.
 * - top-level `var`s in `-e` land on the global object, and this package installs globals called
 *   `before` and `after`, so the probe's own bookkeeping variables were overwritten by the very
 *   names under test.
 *
 * A module file has neither problem: builtins are not global and top-level `var` is module-scoped.
 */
function probe(script, esm) {
    var dir = fs.mkdtempSync(path.join(os.tmpdir(), "tripwire-globals-"));
    var file = path.join(dir, esm ? "probe.mjs" : "probe.cjs");
    var res;

    try {
        fs.writeFileSync(file, script, "utf8");
        res = childProcess.spawnSync(process.execPath, [ file ], {
            cwd: PKG_ROOT,
            encoding: "utf8"
        });
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }

    if (res.error) {
        throw res.error;
    }

    if (res.status !== 0) {
        throw new Error("probe exited " + res.status + "\n--- stdout ---\n" + res.stdout + "\n--- stderr ---\n" + res.stderr);
    }

    try {
        return JSON.parse(res.stdout);
    } catch (e) {
        throw new Error("probe did not emit JSON (" + e.message + ")\n--- stdout ---\n" + res.stdout + "\n--- stderr ---\n" + res.stderr);
    }
}

function json(value) {
    return JSON.stringify(value);
}

// ---------------------------------------------------------------------------------------------
// A minimal harness. Tripwire cannot run these -- it installs the very globals under test into
// the process before the first test runs, and it is devDependency weight this published package
// does not carry.
// ---------------------------------------------------------------------------------------------

var tests = [];

function test(name, fn) {
    tests.push({ name: name, fn: fn });
}

function fail(message) {
    throw new Error(message);
}

function isTrue(value, message) {
    if (value !== true) {
        fail(message);
    }
}

function sameNames(actual, expected, what) {
    var missing = expected.filter(function (n) { return actual.indexOf(n) === -1; });
    var extra = actual.filter(function (n) { return expected.indexOf(n) === -1; });

    if (missing.length || extra.length) {
        fail(what + " does not match: missing " + json(missing) + ", unexpected " + json(extra));
    }
}

// ---------------------------------------------------------------------------------------------
// The tests
// ---------------------------------------------------------------------------------------------

test("requiring @nevware21/tripwire alone installs nothing (the premise of this package)", function () {
    var result = probe(
        "var names = " + json(NAMES) + ";" +
        "var before = names.filter(function (n) { return typeof globalThis[n] !== 'undefined'; });" +
        "require(" + json(CORE_MAIN) + ");" +
        "var after = names.filter(function (n) { return typeof globalThis[n] !== 'undefined'; });" +
        "process.stdout.write(JSON.stringify({ before: before, after: after }));");

    isTrue(result.before.length === 0, "names were already global before the require: " + json(result.before));
    isTrue(result.after.length === 0, "@nevware21/tripwire installed globals it promises not to: " + json(result.after));
});

test("requiring the package installs every declared name onto globalThis", function () {
    var result = probe(
        "var names = " + json(NAMES) + ";" +
        "var before = names.filter(function (n) { return typeof globalThis[n] !== 'undefined'; });" +
        "require(" + json(PKG_INDEX) + ");" +
        "var after = {};" +
        "names.forEach(function (n) { after[n] = typeof globalThis[n]; });" +
        "process.stdout.write(JSON.stringify({ before: before, after: after }));");

    isTrue(result.before.length === 0, "names were already global before the require: " + json(result.before));

    var notInstalled = NAMES.filter(function (n) {
        return result.after[n] === "undefined";
    });

    // Note what this does and does not pin: the installing is core/globals.js's job, so a name
    // dropped from *this* package's export list is still global after the require. That gap is
    // what the two export-surface tests below are for.
    isTrue(notInstalled.length === 0, "not installed onto globalThis: " + json(notInstalled));

    // All seventeen are callable, `assert` included -- it is a callable class carrying the
    // assertion methods, not a plain namespace object.
    var wrongType = NAMES.filter(function (n) {
        return result.after[n] !== "function";
    });

    isTrue(wrongType.length === 0, "installed with an unusable typeof: " + json(wrongType.map(function (n) {
        return n + "=" + result.after[n];
    })));
});

test("the installed assert and expect actually work, and actually fail", function () {
    var result = probe(
        "require(" + json(PKG_INDEX) + ");" +
        "function outcome(fn) { try { fn(); return 'passed'; } catch (e) { return 'threw'; } }" +
        "process.stdout.write(JSON.stringify({" +
        "  assertPass: outcome(function () { assert.equal(1, 1); })," +
        "  assertFail: outcome(function () { assert.equal(1, 2); })," +
        "  expectPass: outcome(function () { expect(1).equal(1); })," +
        "  expectFail: outcome(function () { expect(1).equal(2); })" +
        "}));");

    isTrue(result.assertPass === "passed", "assert.equal(1, 1) " + result.assertPass);
    isTrue(result.assertFail === "threw", "assert.equal(1, 2) " + result.assertFail + " -- it must throw");
    isTrue(result.expectPass === "passed", "expect(1).equal(1) " + result.expectPass);
    isTrue(result.expectFail === "threw", "expect(1).equal(2) " + result.expectFail + " -- it must throw");
});

test("the names it exports are the same values it installs", function () {
    var result = probe(
        "var names = " + json(NAMES) + ";" +
        "var mod = require(" + json(PKG_INDEX) + ");" +
        "var differs = names.filter(function (n) { return mod[n] !== globalThis[n]; });" +
        "process.stdout.write(JSON.stringify({ differs: differs, exports: Object.keys(mod) }));");

    isTrue(result.differs.length === 0, "export and global disagree for: " + json(result.differs));
    sameNames(result.exports, NAMES, "the package's export surface");
});

test("its export surface matches @nevware21/tripwire/globals exactly", function () {
    var result = probe(
        "var pkg = Object.keys(require(" + json(PKG_INDEX) + "));" +
        "var core = Object.keys(require(" + json(CORE_GLOBALS) + "));" +
        "process.stdout.write(JSON.stringify({ pkg: pkg, core: core }));");

    sameNames(result.core, NAMES, "core's globals entry, against the TripwireGlobals interface");
    sameNames(result.pkg, result.core, "this package's export surface, against core's");
});

test("its named exports are visible to ESM, not just to require()", function () {
    // index.js writes its exports out one per line specifically so cjs-module-lexer can see them;
    // a refactor into a loop would still pass every test above and break this one.
    var href = url.pathToFileURL(PKG_INDEX).href;
    var result = probe(
        "import { " + NAMES.join(", ") + " } from " + json(href) + ";\n" +
        "const bound = { " + NAMES.join(", ") + " };\n" +
        "const missing = " + json(NAMES) + ".filter((n) => bound[n] === undefined);\n" +
        "process.stdout.write(JSON.stringify({ missing }));",
        true);

    isTrue(result.missing.length === 0, "not importable as ESM named exports: " + json(result.missing));
});

// ---------------------------------------------------------------------------------------------

function run() {
    var failures = 0;

    console.log("@nevware21/tripwire-globals runtime tests (" + NAMES.length + " declared names)\n");

    tests.forEach(function (entry) {
        try {
            entry.fn();
            console.log("  ok   " + entry.name);
        } catch (e) {
            failures++;
            console.log("  FAIL " + entry.name);
            console.log("       " + String((e && e.message) || e).split(/\r?\n/).join("\n       "));
        }
    });

    console.log("\n" + (tests.length - failures) + " passing, " + failures + " failing");

    if (failures) {
        process.exitCode = 1;
    }
}

run();
