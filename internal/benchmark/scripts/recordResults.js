/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

"use strict";

/*
 * Recording benchmark results for the repository.
 *
 * `--json` writes everything the harness knows about a run, including the exact command and
 * working directory of every arm, into a file of the caller's choosing. That is right for a
 * one-off investigation and wrong for anything checked in: the commands carry absolute paths, the
 * paths carry a user name, and `os.release()` carries a build number -- none of which belongs in
 * a public repository, and none of which a chart needs.
 *
 * `--record` writes a *scrubbed* record into `docs/performance/results/` (so GitHub Pages serves it
 * next to the performance page), named by date and commit, and rebuilds `index.json` there so the
 * history page can find every record without a directory listing. What a record holds is exactly
 * what the history chart and the performance page need to say where a number came from: the
 * measurements, the options, the commit, the versions of the things being measured, and the
 * machine class (CPU, cores, memory, OS *name*). What it never holds: paths, host names, user
 * names, OS build numbers, the text of any error, or the branch name -- branch names routinely
 * carry a person's handle (`someone/feature`), and the commit identifies the run on its own.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const url = require("url");
const { spawnSync } = require("child_process");

const { BENCH_DIR, REPO_DIR } = require("./paths");

/**
 * Bumped when the meaning of a field changes in a way a reader of older records would get wrong.
 * Adding a field does not bump it.
 */
const SCHEMA_VERSION = 1;

/**
 * Where records live by default -- under `docs/` because GitHub Pages serves that tree, so the
 * history page can fetch them with a relative URL.
 */
const RESULTS_DIR = path.join(REPO_DIR, "docs", "performance", "results");

const INDEX_FILE = "index.json";

/**
 * A git value for the working tree, or `null` when git is unavailable. Never throws: a record
 * without a commit is still a record.
 */
function _git(args) {
    try {
        const result = spawnSync("git", args, { cwd: REPO_DIR, encoding: "utf8", windowsHide: true });

        return result.status === 0 ? result.stdout.trim() : null;
    } catch (e) {
        return null;
    }
}

/**
 * The version of a package as resolved from the benchmark directory, or `null`.
 */
function _versionOf(pkgName, from) {
    try {
        return require(require.resolve(pkgName + "/package.json", { paths: [ from || BENCH_DIR ] })).version || null;
    } catch (e) {
        return null;
    }
}

/**
 * The directory of a package resolved from the benchmark directory, or the benchmark directory
 * itself when it cannot be resolved (so a dependent lookup still fails soft to `null`).
 */
function _packageDir(pkgName) {
    try {
        return path.dirname(require.resolve(pkgName + "/package.json", { paths: [ BENCH_DIR ] }));
    } catch (e) {
        return BENCH_DIR;
    }
}

/**
 * The platform as a product name. Deliberately not `os.release()`: a Windows build number or a
 * Darwin kernel version identifies a machine more precisely than a benchmark reader needs, and
 * pins the record to one install's patch level rather than the class of machine it ran on.
 */
function _osName() {
    switch (os.platform()) {
    case "win32":
        return "Windows";
    case "darwin":
        return "macOS";
    case "linux":
        return "Linux";
    default:
        return os.platform();
    }
}

/**
 * Loads a resolved module file, with require() where it can and import() where it cannot.
 * puppeteer 25 and later ship only ES modules, which require() can load only on Node.js 20.19+ and
 * 22.12+; on Node 18 it throws ERR_REQUIRE_ESM, so the module is imported instead. A module that
 * fails to load either way rejects.
 */
function _loadModule(resolved) {
    try {
        return Promise.resolve(require(resolved));
    } catch (e) {
        return import(url.pathToFileURL(resolved).href).then((mod) => mod.default || mod);
    }
}

/**
 * Resolves the Chrome version puppeteer would launch, without recording where it lives.
 *
 * Puppeteer's cache lays browsers out as `<cache>/chrome/<platform>-<version>/...`, and
 * `executablePath()` (a promise from puppeteer 22 on, a string before) points inside that, so the
 * version can be read off the path and the path itself discarded. An explicit
 * `PUPPETEER_EXECUTABLE_PATH` points at some other browser whose version this cannot know; the
 * record then says so rather than guessing, because "measured against puppeteer's bundled Chrome"
 * is one of the facts the performance page states.
 */
function _resolveChrome() {
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        return Promise.resolve({ version: null, source: "executable-path override" });
    }

    let resolved;
    try {
        resolved = require.resolve("puppeteer", { paths: [ BENCH_DIR ] });
    } catch (e) {
        return Promise.resolve({ version: null, source: "puppeteer not resolvable" });
    }

    return _loadModule(resolved)
        .then((puppeteer) => puppeteer.executablePath())
        .then((exePath) => {
            const match = /[\\/](?:chrome|chromium|chrome-headless-shell)[\\/][a-z0-9_]+-(\d+(?:\.\d+)+)[\\/]/i.exec(String(exePath || ""));

            return match
                ? { version: match[1], source: "puppeteer cache" }
                : { version: null, source: "puppeteer cache (version not in path)" };
        })
        .catch(() => ({ version: null, source: "puppeteer executablePath() failed" }));
}

/**
 * Everything about the environment a record keeps. See the file comment for what is left out.
 * @returns A promise, because puppeteer's executable resolution is one.
 */
function collectEnvironment() {
    const cpus = os.cpus() || [];
    const corePkg = path.join(REPO_DIR, "core", "package.json");
    let tripwireVersion = null;
    try {
        tripwireVersion = require(corePkg).version || null;
    } catch (e) {
        // Recorded as unknown.
    }

    return _resolveChrome().then((chrome) => ({
        machine: {
            os: _osName(),
            arch: os.arch(),
            cpu: cpus.length ? String(cpus[0].model).trim() : null,
            logicalProcessors: cpus.length || null,
            memoryGB: Math.round(os.totalmem() / (1024 * 1024 * 1024))
        },
        versions: {
            node: process.version,
            tripwire: tripwireVersion,
            puppeteer: _versionOf("puppeteer"),
            chrome: chrome.version,
            chromeSource: chrome.source,
            typescript: _versionOf("typescript"),
            karma: _versionOf("karma"),
            "karma-typescript": _versionOf("karma-typescript"),
            "ts-mocha": _versionOf("ts-mocha"),
            // mocha reaches this package only as a peer of ts-mocha, so it resolves from there.
            mocha: _versionOf("mocha", _packageDir("ts-mocha")),
            nyc: _versionOf("nyc", REPO_DIR)
        },
        git: {
            commit: _git([ "rev-parse", "--short", "HEAD" ]),
            dirty: (() => {
                const status = _git([ "status", "--porcelain" ]);

                return status === null ? null : status.length > 0;
            })()
        }
    }));
}

/**
 * One arm's measurements with everything path-shaped removed: `command`, `cwd` and `spawnError`
 * stay in the console output and in `--json`, never here.
 */
function scrubResult(result, opts) {
    return {
        key: result.key,
        suite: result.suite,
        target: result.target,
        runner: result.runner,
        coverage: !!opts.coverage,
        typeCheck: opts.typeCheck !== false,
        measured: result.measured,
        failures: result.failures,
        durationsMs: result.durationsMs.slice(0),
        avgMs: result.avgMs,
        medianMs: result.medianMs,
        minMs: result.minMs,
        maxMs: result.maxMs
    };
}

/**
 * Builds the record for a finished run.
 * @param results - The harness results (from `measure`).
 * @param opts - The parsed options.
 * @param environment - From {@link collectEnvironment}.
 * @param recordedAt - The time to stamp; defaults to now. A parameter so tests get stable names.
 */
function buildRecord(results, opts, environment, recordedAt) {
    const when = recordedAt || new Date();

    return {
        schemaVersion: SCHEMA_VERSION,
        recordedAt: when.toISOString(),
        git: environment.git,
        machine: environment.machine,
        versions: environment.versions,
        options: {
            runs: opts.runs,
            warmup: !!opts.warmup,
            coverage: !!opts.coverage,
            typeCheck: opts.typeCheck !== false,
            suites: opts.suites.slice(0),
            targets: opts.targets.slice(0),
            runners: opts.runners.slice(0)
        },
        results: results.map((r) => scrubResult(r, opts))
    };
}

/**
 * `2026-10-18T143207-abc1234-coverage.json`: sorts by date as text, names the commit, and says
 * whether it was an instrumented run -- the three things someone browsing the directory wants.
 * Seconds are included so two recordings of the same commit a minute apart (a partial matrix, a
 * quick re-run) cannot overwrite one another.
 */
function recordFileName(record) {
    const d = new Date(record.recordedAt);
    const pad = (n) => (n < 10 ? "0" : "") + n;
    const stamp = d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate()) +
        "T" + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds());
    const commit = (record.git && record.git.commit) ? record.git.commit : "nocommit";

    return stamp + "-" + commit + (record.options.coverage ? "-coverage" : "") + ".json";
}

/**
 * The checks a record must pass to be written or indexed. Returns the problems, empty when fine.
 * Kept deliberately structural -- it guards the chart against a hand-edited file, not against a
 * wrong number.
 */
function validateRecord(record, fileName) {
    const problems = [];
    const where = fileName ? fileName + ": " : "";

    if (!record || typeof record !== "object") {
        return [ where + "not an object" ];
    }
    if (record.schemaVersion !== SCHEMA_VERSION) {
        problems.push(where + "schemaVersion " + record.schemaVersion + " (expected " + SCHEMA_VERSION + ")");
    }
    if (!record.recordedAt || isNaN(new Date(record.recordedAt).getTime())) {
        problems.push(where + "recordedAt is not a date");
    }
    if (!record.options || typeof record.options.runs !== "number") {
        problems.push(where + "options.runs missing");
    }
    if (!Array.isArray(record.results) || !record.results.length) {
        problems.push(where + "results missing or empty");
    } else {
        record.results.forEach((r, i) => {
            [ "suite", "target", "runner" ].forEach((k) => {
                if (typeof r[k] !== "string" || !r[k]) {
                    problems.push(where + "results[" + i + "]." + k + " missing");
                }
            });
            if (!Array.isArray(r.durationsMs)) {
                problems.push(where + "results[" + i + "].durationsMs missing");
            }
            [ "command", "cwd", "spawnError" ].forEach((k) => {
                if (k in r) {
                    problems.push(where + "results[" + i + "]." + k + " must not be recorded");
                }
            });
        });
    }

    // Belt and braces for the one thing this file exists to prevent: a drive letter followed by a
    // separator, a UNC prefix, a file URL, or a home directory where a path would start (after a
    // quote or whitespace, so a value such as a branch named "feature/home/page" is not a path).
    const text = JSON.stringify(record);
    if (/[A-Za-z]:[\\/]|\\\\\\\\[^\\]|file:\/\/|["\s](?:\/home\/|\/Users\/|\/root\/|\/tmp\/|\/var\/)/.test(text)) {
        problems.push(where + "contains a file-system path");
    }

    return problems;
}

/**
 * Rebuilds `index.json` from every record in `dir`. Records that fail validation are listed
 * under `invalid` rather than silently dropped, so a bad hand edit is visible on the page.
 */
function rebuildIndex(dir) {
    const entries = [];
    const invalid = [];

    fs.readdirSync(dir).filter((f) => /\.json$/i.test(f) && f !== INDEX_FILE).sort().forEach((file) => {
        let record;
        try {
            record = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
        } catch (e) {
            invalid.push({ file: file, problems: [ "not valid JSON" ] });
            return;
        }

        const problems = validateRecord(record, file);
        if (problems.length) {
            invalid.push({ file: file, problems: problems });
            return;
        }

        entries.push({
            file: file,
            recordedAt: record.recordedAt,
            commit: record.git ? record.git.commit : null,
            coverage: !!record.options.coverage,
            typeCheck: record.options.typeCheck !== false,
            runs: record.options.runs,
            suites: record.options.suites,
            targets: record.options.targets,
            runners: record.options.runners,
            arms: record.results.length,
            failures: record.results.reduce((n, r) => n + (r.failures || 0), 0)
        });
    });

    entries.sort((a, b) => a.recordedAt < b.recordedAt ? -1 : a.recordedAt > b.recordedAt ? 1 : 0);

    const index = {
        schemaVersion: SCHEMA_VERSION,
        generated: new Date().toISOString(),
        records: entries,
        invalid: invalid
    };

    fs.writeFileSync(path.join(dir, INDEX_FILE), JSON.stringify(index, null, 2) + "\n", "utf8");

    return index;
}

/**
 * Writes the record and rebuilds the index.
 * @returns The path written.
 */
function writeRecord(dir, record) {
    const problems = validateRecord(record);
    if (problems.length) {
        throw new Error("Refusing to record: " + problems.join("; "));
    }

    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, recordFileName(record));
    fs.writeFileSync(file, JSON.stringify(record, null, 2) + "\n", "utf8");
    rebuildIndex(dir);

    return file;
}

/**
 * Validates an existing results directory: every record parses and passes {@link validateRecord},
 * and `index.json` lists exactly the valid records. Returns the problems, empty when fine; a
 * directory that does not exist is fine too (nothing recorded yet).
 */
function validateResultsDir(dir) {
    if (!fs.existsSync(dir)) {
        return [];
    }

    const problems = [];
    const files = fs.readdirSync(dir).filter((f) => /\.json$/i.test(f) && f !== INDEX_FILE).sort();
    const valid = [];

    files.forEach((file) => {
        try {
            const record = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
            const recordProblems = validateRecord(record, file);
            if (recordProblems.length) {
                problems.push.apply(problems, recordProblems);
            } else {
                valid.push(file);
                const expected = recordFileName(record);
                if (expected !== file) {
                    problems.push(file + ": name does not match its contents (expected " + expected + ")");
                }
            }
        } catch (e) {
            problems.push(file + ": not valid JSON");
        }
    });

    const indexPath = path.join(dir, INDEX_FILE);
    if (!fs.existsSync(indexPath)) {
        if (files.length) {
            problems.push(INDEX_FILE + " missing; run the benchmark with --record, or rebuild it");
        }
        return problems;
    }

    try {
        const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
        const listed = (index.records || []).map((e) => e.file).sort();
        if (listed.join("\n") !== valid.join("\n")) {
            problems.push(INDEX_FILE + " does not list exactly the valid records (" + listed.length + " listed, " + valid.length + " on disk)");
        }
    } catch (e) {
        problems.push(INDEX_FILE + ": not valid JSON");
    }

    return problems;
}

module.exports = {
    SCHEMA_VERSION, RESULTS_DIR, INDEX_FILE,
    collectEnvironment, buildRecord, scrubResult, recordFileName, validateRecord, rebuildIndex, writeRecord, validateResultsDir
};
