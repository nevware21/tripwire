/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2025-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const { OUT_DIR } = require("./paths");
const { SUITES, RUNNERS, TARGETS, buildMatrix } = require("./matrix");
const { NOT_MEASURED, formatMs, formatMsOrGap, stats, printTable } = require("./report");
const { RESULTS_DIR, collectEnvironment, buildRecord, writeRecord } = require("./recordResults");

const BASELINE = "tripwire";

const USAGE = [
    "",
    "Usage: node ./scripts/runBenchmark.js [options]",
    "",
    "  --runs=<n>            Measured runs per arm (default: 1). Also accepted bare, eg. -- 3",
    "  --warmup              Run each arm once, unmeasured, before the measured runs.",
    "  --suites=<a,b>        Suites to measure (default: " + SUITES.map((s) => s.id).join(",") + ").",
    "  --targets=<a,b>       Targets to measure (default: " + TARGETS.join(",") + ").",
    "  --runners=<a,b>       Runners to measure (default: " + RUNNERS.map((r) => r.id).join(",") + ").",
    "  --coverage            Instrument every arm (off by default -- see README, Coverage).",
    "  --no-type-check       Transpile without type checking on the arms that can be told to.",
    "  --json=<file>         Also write the raw measurements as JSON (includes commands and paths; for",
    "                        a one-off investigation, not for checking in).",
    "  --record              Record the run for the repository: a scrubbed JSON file under",
    "                        docs/performance/results/ (no paths, host or user names), named by date",
    "                        and commit, plus a rebuilt index.json. Charted at docs/performance/history.md.",
    "  --record-dir=<dir>    Record somewhere else (default: docs/performance/results).",
    "  --list                Print the resolved matrix and the exact command per arm, run nothing.",
    "  --verbose, -v         Let each run print its own output instead of discarding it.",
    "  -h, --help            Show this help.",
    ""
].join("\n");

function parseArgs(argv) {
    const opts = {
        runs: 1,
        warmup: false,
        verbose: false,
        coverage: false,
        typeCheck: true,
        list: false,
        json: null,
        record: false,
        recordDir: RESULTS_DIR,
        suites: SUITES.map((s) => s.id),
        targets: TARGETS.slice(),
        runners: RUNNERS.map((r) => r.id)
    };

    const list = (value) => value.split(",").map((s) => s.trim()).filter(Boolean);

    for (const arg of argv) {
        let match;

        if (arg === "-h" || arg === "--help") {
            console.log(USAGE);
            process.exit(0);
        } else if ((match = /^--runs=(\d+)$/.exec(arg))) {
            opts.runs = Math.max(1, parseInt(match[1], 10));
        } else if (/^\d+$/.test(arg)) {
            // Bare positional number (eg. `npm run bench -- 3`) as shorthand for --runs=3.
            opts.runs = Math.max(1, parseInt(arg, 10));
        } else if (arg === "--verbose" || arg === "-v") {
            opts.verbose = true;
        } else if (arg === "--warmup") {
            opts.warmup = true;
        } else if (arg === "--coverage") {
            opts.coverage = true;
        } else if (arg === "--no-coverage") {
            opts.coverage = false;
        } else if (arg === "--no-type-check" || arg === "--transpile-only") {
            opts.typeCheck = false;
        } else if (arg === "--type-check") {
            opts.typeCheck = true;
        } else if (arg === "--list") {
            opts.list = true;
        } else if ((match = /^--json=(.+)$/.exec(arg))) {
            opts.json = path.resolve(match[1]);
        } else if (arg === "--record") {
            opts.record = true;
        } else if ((match = /^--record-dir=(.+)$/.exec(arg))) {
            opts.record = true;
            opts.recordDir = path.resolve(match[1]);
        } else if ((match = /^--suites=(.+)$/.exec(arg))) {
            opts.suites = list(match[1]);
        } else if ((match = /^--targets=(.+)$/.exec(arg))) {
            opts.targets = list(match[1]);
        } else if ((match = /^--runners=(.+)$/.exec(arg))) {
            opts.runners = list(match[1]);
        } else {
            console.error("Unknown option: " + arg);
            console.error(USAGE);
            process.exit(1);
        }
    }

    return opts;
}

function validateSelection(opts) {
    const check = (name, requested, known) => {
        const bad = requested.filter((id) => known.indexOf(id) === -1);

        if (bad.length) {
            console.error("Unknown " + name + ": " + bad.join(", ") + " (known: " + known.join(", ") + ")");
            process.exit(1);
        }
    };

    check("suite", opts.suites, SUITES.map((s) => s.id));
    check("target", opts.targets, TARGETS);
    check("runner", opts.runners, RUNNERS.map((r) => r.id));
}

// An argument made only of these needs no quoting on that platform. Backslash is an ordinary path
// character on Windows but the escape character in a POSIX shell.
const _SAFE_ARG = {
    win32: /^[A-Za-z0-9_@%+=:,.\/\\-]+$/,
    posix: /^[A-Za-z0-9_@%+=:,.\/-]+$/
};

/**
 * Quotes one argument so that it reads back unchanged when the printed command is pasted into the
 * platform's shell. JSON.stringify is not used: it doubles every backslash, so a Windows path such as
 * "C:\Program Files\nodejs\node.exe" printed by --list could not be pasted back as is.
 *
 * Windows follows the rules CommandLineToArgvW and the C runtime parse by: backslashes are literal
 * except in a run that precedes a double quote, so only those runs (and a run at the very end, which
 * would otherwise escape the closing quote) are doubled, and each embedded quote is escaped. POSIX
 * wraps the argument in single quotes, inside which nothing is special except the single quote
 * itself, written as '\''.
 */
function _quoteArg(arg, platform) {
    const value = String(arg);
    const isWindows = platform === "win32";

    if (value && (isWindows ? _SAFE_ARG.win32 : _SAFE_ARG.posix).test(value)) {
        return value;
    }

    if (isWindows) {
        return "\"" + value.replace(/(\\*)"/g, "$1$1\\\"").replace(/(\\+)$/, "$1$1") + "\"";
    }

    return "'" + value.replace(/'/g, "'\\''") + "'";
}

function describeCommand(arm, platform) {
    const target = platform || process.platform;

    return [ arm.file ].concat(arm.args).map((a) => _quoteArg(a, target)).join(" ");
}

/**
 * Run one arm once, timing the whole process. Each arm is spawned directly rather than through
 * `npm run <script>`, so what is measured is the runner rather than the runner plus a few hundred
 * milliseconds of npm start-up on both sides of every comparison.
 */
function runArm(arm, verbose) {
    const start = process.hrtime.bigint();
    const result = spawnSync(arm.file, arm.args, {
        cwd: arm.cwd,
        env: Object.assign({}, process.env, arm.env),
        stdio: verbose ? "inherit" : "ignore"
    });
    const end = process.hrtime.bigint();

    return {
        durationMs: Number(end - start) / 1e6,
        // A spawn that never started (a missing binary) has a null status and is a harness fault,
        // not a slow runner, so it is reported separately from a run that failed on its own terms.
        ok: result.status === 0,
        spawnError: result.error ? String(result.error.message) : null,
        status: result.status
    };
}

function measure(arms, opts) {
    const results = [];

    arms.forEach((arm) => {
        const label = arm.suite.label + " " + arm.target + " (" + arm.runner.label + ")";
        const durations = [];
        let failures = 0;
        let spawnError = null;

        if (opts.warmup) {
            process.stdout.write("  " + label + " warmup...");
            const warm = runArm(arm, opts.verbose);
            console.log(" " + formatMs(warm.durationMs) + (warm.ok ? "" : " (failed)"));
        }

        for (let i = 0; i < opts.runs; i++) {
            process.stdout.write("  " + label + " run " + (i + 1) + "/" + opts.runs + "...");
            const run = runArm(arm, opts.verbose);
            console.log(" " + formatMs(run.durationMs) + (run.ok ? "" : " (FAILED -- excluded)"));

            if (run.ok) {
                durations.push(run.durationMs);
            } else {
                failures++;
                spawnError = spawnError || run.spawnError;
            }
        }

        results.push(Object.assign({
            key: arm.key,
            suite: arm.suite.id,
            suiteLabel: arm.suite.label,
            target: arm.target,
            runner: arm.runner.id,
            runnerLabel: arm.runner.label,
            command: describeCommand(arm),
            cwd: arm.cwd,
            failures: failures,
            measured: durations.length,
            spawnError: spawnError,
            durationsMs: durations
        }, stats(durations)));
    });

    return results;
}

function printSummary(results, opts) {
    console.log("");
    console.log("Summary (" + opts.runs + " run" + (opts.runs > 1 ? "s" : "") + " per arm, " +
        (opts.coverage ? "instrumented" : "no coverage") + ", " +
        (opts.typeCheck ? "type-checked" : "transpile-only") + "):");
    console.log("");

    printTable(
        [ "Suite", "Target", "Runner", "Avg", "Median", "Min", "Max", "Status" ],
        results.map((r) => [
            r.suiteLabel, r.target, r.runnerLabel,
            formatMsOrGap(r.avgMs), formatMsOrGap(r.medianMs), formatMsOrGap(r.minMs), formatMsOrGap(r.maxMs),
            r.failures ? "FAILED " + r.failures + "/" + (r.failures + r.measured) : "ok"
        ])
    );
}

/**
 * Every non-baseline arm is compared against the tripwire arm for the same suite and target, which
 * is the only comparison that holds everything else constant. An arm with no measured run is
 * reported as not comparable rather than being folded into a number.
 */
function printComparisons(results) {
    const rows = [];

    results.filter((r) => r.runner !== BASELINE).forEach((alt) => {
        const base = results.filter((r) => {
            return r.runner === BASELINE && r.suite === alt.suite && r.target === alt.target;
        })[0];

        if (!base) {
            return;
        }

        const baseCell = BASELINE + " " + formatMsOrGap(base.avgMs);
        const altCell = alt.runnerLabel + " " + formatMsOrGap(alt.avgMs);

        if (base.avgMs === null || alt.avgMs === null) {
            const broken = [];
            if (base.avgMs === null) { broken.push(BASELINE); }
            if (alt.avgMs === null) { broken.push(alt.runnerLabel); }

            rows.push([ base.suiteLabel, alt.target, baseCell, altCell, NOT_MEASURED,
                "not comparable -- " + broken.join(" and ") + " failed" ]);
            return;
        }

        const deltaMs = alt.avgMs - base.avgMs;
        const faster = deltaMs >= 0 ? BASELINE : alt.runnerLabel;
        const pct = Math.abs((deltaMs / alt.avgMs) * 100).toFixed(1) + "%";

        rows.push([
            base.suiteLabel, alt.target, baseCell, altCell,
            (deltaMs >= 0 ? "-" : "+") + formatMs(Math.abs(deltaMs)),
            faster + " faster by " + pct
        ]);
    });

    if (!rows.length) {
        return;
    }

    console.log("");
    console.log("Differences (tripwire runner vs alternate runner):");
    console.log("");
    printTable([ "Suite", "Target", "Tripwire", "Alternate", "Delta", "Result" ], rows);
}

function writeJson(file, results, opts) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify({
        generated: new Date().toISOString(),
        node: process.version,
        platform: process.platform,
        options: { runs: opts.runs, warmup: opts.warmup, coverage: opts.coverage, typeCheck: opts.typeCheck },
        results: results
    }, null, 2));
    console.log("");
    console.log("Wrote " + file);
}

function main() {
    const opts = parseArgs(process.argv.slice(2));
    validateSelection(opts);

    const arms = buildMatrix(
        { suites: opts.suites, targets: opts.targets, runners: opts.runners },
        { typeCheck: opts.typeCheck, coverage: opts.coverage }
    );

    if (!arms.length) {
        console.error("Nothing to run: no runner supports the requested suite/target combination.");
        process.exit(1);
    }

    if (opts.list) {
        console.log("");
        arms.forEach((arm) => {
            console.log(arm.key);
            console.log("  cwd: " + arm.cwd);
            console.log("  cmd: " + describeCommand(arm));
        });
        console.log("");
        return;
    }

    fs.mkdirSync(OUT_DIR, { recursive: true });

    console.log("");
    console.log("Benchmarking " + arms.length + " arm" + (arms.length > 1 ? "s" : "") +
        " (" + opts.runs + " run" + (opts.runs > 1 ? "s" : "") + " each)" +
        (opts.verbose ? "" : " -- pass --verbose to see the output of each run") + "...");
    console.log("");

    const results = measure(arms, opts);

    printSummary(results, opts);
    printComparisons(results);

    const failed = results.filter((r) => r.failures > 0);

    if (failed.length) {
        console.log("");
        failed.forEach((r) => {
            console.log("FAILED: " + r.key + (r.spawnError ? " -- " + r.spawnError : ""));
            console.log("  cwd: " + r.cwd);
            console.log("  cmd: " + r.command);
        });
    }

    console.log("");

    if (opts.json) {
        writeJson(opts.json, results, opts);
    }

    if (!opts.record) {
        process.exit(failed.length ? 1 : 0);
    }

    // A run with a failed arm is still recorded (the arm shows as failed, with no durations), so
    // the history is honest about runs that did not go cleanly rather than silently thinner.
    collectEnvironment().then((environment) => {
        const file = writeRecord(opts.recordDir, buildRecord(results, opts, environment));
        console.log("Recorded " + path.relative(process.cwd(), file));
        if (environment.versions.chromeSource !== "puppeteer cache" && opts.targets.some((t) => t !== "node")) {
            console.log("  note: the browser was not puppeteer's bundled Chrome (" + environment.versions.chromeSource +
                "); the record says so, and the performance page documents results against the bundled browser.");
        }
        console.log("");
        process.exit(failed.length ? 1 : 0);
    }).catch((e) => {
        // .catch rather than a second .then argument, so a throw inside the success path (a record
        // refused for containing a path, an unwritable results directory) is reported here too.
        console.error("Recording failed: " + (e && e.message ? e.message : e));
        process.exit(1);
    });
}

// Only run when executed as a script (`npm run bench`), so the tests can load this module and
// exercise the argument parsing, measurement and reporting on their own.
if (require.main === module) {
    main();
}

module.exports = {
    BASELINE, USAGE,
    parseArgs, validateSelection, describeCommand, runArm, measure, printSummary, printComparisons
};
