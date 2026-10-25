/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

"use strict";

/*
 * This package's `build` and `test`. It deliberately runs no suite: a benchmark takes minutes and
 * has no pass/fail of its own, so putting it in `rush test` would only make CI slow.
 *
 * What it does instead is check every assumption the benchmark makes about the rest of the
 * repository -- that each suite directory, test project, spec pattern, karma config and tool
 * binary still resolves. That is the failure this package exists to prevent: the karma configs it
 * now owns rotted quietly for months inside `core` precisely because nothing ever loaded them.
 */

const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const { BENCH_DIR, REPO_DIR, TRIPWIRE_BIN, resolveBin } = require("./paths");
const { SUITES, RUNNERS, TARGETS, buildMatrix } = require("./matrix");

const problems = [];
const checks = [];

function check(what, fn) {
    try {
        const detail = fn();
        checks.push("  ok   " + what + (detail ? " -- " + detail : ""));
    } catch (e) {
        problems.push(what + ": " + e.message);
        checks.push("  FAIL " + what + " -- " + e.message);
    }
}

function mustExist(target, what) {
    if (!fs.existsSync(target)) {
        throw new Error(what + " not found at " + target);
    }

    return target;
}

/**
 * Count the `*.test.ts` files a spec pattern of the form `./test/src/!(a|b)/star-star/star.test.ts`
 * would match, by applying the one construct those patterns use -- an excluded set of immediate
 * subdirectories. A pattern that matches nothing is the silent failure mode worth catching: the
 * run still exits 0, having tested nothing.
 */
function countSpecs(suiteDir, pattern) {
    const match = /^\.\/(.*?)\/!\(([^)]*)\)\//.exec(pattern);

    if (!match) {
        throw new Error("unrecognised spec pattern: " + pattern);
    }

    const root = path.join(suiteDir, match[1]);
    const excluded = match[2].split("|");

    mustExist(root, "spec root");

    let count = 0;

    const walk = (dir) => {
        fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
            const full = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                walk(full);
            } else if (/\.test\.ts$/.test(entry.name)) {
                count++;
            }
        });
    };

    fs.readdirSync(root, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && excluded.indexOf(entry.name) === -1)
        .forEach((entry) => walk(path.join(root, entry.name)));

    if (count === 0) {
        throw new Error("pattern matches no test files: " + pattern);
    }

    return count + " test files";
}

/**
 * Parse a karma-only project exactly as karma-typescript will, and assert it still resolves to a
 * real set of files. These projects live in this package and point back into `core` / `shim/chai`
 * with relative paths, so a moved or renamed test directory shows up here as an empty program
 * rather than as a mystery at benchmark time.
 */
function parseProject(tsconfigPath) {
    mustExist(tsconfigPath, "karma project");

    const text = fs.readFileSync(tsconfigPath, "utf8");
    const json = ts.parseConfigFileTextToJson(tsconfigPath, text);

    if (json.error) {
        throw new Error(ts.flattenDiagnosticMessageText(json.error.messageText, " "));
    }

    const parsed = ts.parseJsonConfigFileContent(json.config, ts.sys, path.dirname(tsconfigPath), {}, tsconfigPath);

    if (parsed.errors.length) {
        throw new Error(parsed.errors.map((d) => ts.flattenDiagnosticMessageText(d.messageText, " ")).join("; "));
    }

    if (!parsed.fileNames.length) {
        throw new Error("include patterns match no files");
    }

    return parsed.fileNames.length + " files";
}

/**
 * Load a karma config the way karma does, and check the parts that reach outside this package.
 */
function loadKarmaConfig(confPath) {
    mustExist(confPath, "karma config");

    let captured = null;
    const factory = require(confPath);

    factory({
        set: (value) => { captured = value; },
        LOG_INFO: "INFO"
    });

    if (!captured) {
        throw new Error("config factory never called config.set()");
    }

    const basePath = path.resolve(path.dirname(confPath), captured.basePath);
    mustExist(basePath, "karma basePath");

    // karma-typescript joins its `tsconfig` onto basePath, so verify that join, not just the file.
    mustExist(path.join(basePath, captured.karmaTypescriptConfig.tsconfig), "karma-typescript tsconfig");

    captured.files.forEach((entry) => {
        // Patterns with a glob are checked through the project parse above; the fixed paths (the
        // worker adapter and runner) are the ones a relocation silently breaks.
        if (entry.pattern.indexOf("*") === -1) {
            mustExist(path.resolve(basePath, entry.pattern), "karma file");
        }
    });

    if (!captured.plugins || !captured.plugins.length) {
        throw new Error("no plugins declared, karma would glob the working directory instead");
    }

    return captured.files.length + " file patterns, " + captured.plugins.length + " plugins";
}

console.log("");
console.log("Validating the benchmark harness against the repository...");
console.log("");

check("tripwire CLI bundle", () => {
    if (!fs.existsSync(TRIPWIRE_BIN)) {
        throw new Error("not found at " + TRIPWIRE_BIN + " -- run `rush build` (the runner package produces it)");
    }

    return path.relative(REPO_DIR, TRIPWIRE_BIN);
});

[ "karma/bin/karma", "ts-mocha/bin/ts-mocha", "nyc/bin/nyc.js" ].forEach((spec) => {
    const slash = spec.indexOf("/");
    const pkg = spec.slice(0, slash);
    const rel = spec.slice(slash + 1);

    check("tool " + pkg, () => path.relative(REPO_DIR, mustExist(resolveBin(pkg, rel), pkg)));
});

SUITES.forEach((suite) => {
    check("suite " + suite.id, () => path.relative(REPO_DIR, mustExist(suite.dir, "suite directory")));
    check("suite " + suite.id + " test project", () => {
        return path.relative(REPO_DIR, mustExist(path.join(suite.dir, suite.tsconfig), "test project"));
    });

    TARGETS.forEach((target) => {
        check("suite " + suite.id + " " + target + " specs", () => countSpecs(suite.dir, suite.specs[target]));
    });

    Object.keys(suite.karma).forEach((target) => {
        check("karma project " + suite.id + "." + target, () => {
            return parseProject(path.join(BENCH_DIR, "tsconfig", suite.id + "." + target + ".json"));
        });
        check("karma config " + suite.id + "." + target, () => loadKarmaConfig(suite.karma[target]));
    });
});

check("recorded results", () => {
    const { RESULTS_DIR, validateResultsDir } = require("./recordResults");
    const problems = validateResultsDir(RESULTS_DIR);

    if (problems.length) {
        throw new Error(problems.join("; "));
    }

    const indexPath = path.join(RESULTS_DIR, "index.json");
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    if (!fs.existsSync(indexPath)) {
        return "none recorded yet";
    }

    const count = JSON.parse(fs.readFileSync(indexPath, "utf8")).records.length;

    return count + " record" + (count === 1 ? "" : "s") + " in " + path.relative(REPO_DIR, RESULTS_DIR);
});

check("matrix", () => {
    const arms = buildMatrix({
        suites: SUITES.map((s) => s.id),
        targets: TARGETS,
        runners: RUNNERS.map((r) => r.id)
    }, { typeCheck: true, coverage: true });

    const keys = arms.map((a) => a.key);
    const duplicates = keys.filter((k, i) => keys.indexOf(k) !== i);

    if (duplicates.length) {
        throw new Error("duplicate arm keys: " + duplicates.join(", "));
    }

    arms.forEach((arm) => {
        mustExist(arm.cwd, "working directory for " + arm.key);
        mustExist(arm.args[0], "entry point for " + arm.key);
    });

    return arms.length + " arms";
});

checks.forEach((line) => console.log(line));
console.log("");

if (problems.length) {
    console.error(problems.length + " problem" + (problems.length > 1 ? "s" : "") + " found.");
    process.exit(1);
}

console.log("Benchmark harness OK.");
console.log("");
