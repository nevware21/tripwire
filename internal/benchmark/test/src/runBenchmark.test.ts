/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import * as childProcess from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const bench = require("../../scripts/runBenchmark");
const records = require("../../scripts/recordResults");
const paths = require("../../scripts/paths");

const SCRIPT = path.join(paths.BENCH_DIR, "scripts", "runBenchmark.js");

function runScript(args: string[]): { status: number; stdout: string; stderr: string } {
    const result = childProcess.spawnSync(process.execPath, [ SCRIPT ].concat(args), {
        cwd: paths.BENCH_DIR,
        encoding: "utf8"
    });

    return { status: result.status, stdout: result.stdout || "", stderr: result.stderr || "" };
}

/**
 * Runs `fn` with console.log and process.stdout.write captured, so the progress and tables the
 * benchmark prints can be asserted on (and do not interleave with the test reporter's output).
 */
function captureOutput(fn: () => void): string {
    const out: string[] = [];
    const orgLog = console.log;
    const orgWrite = process.stdout.write;
    console.log = (...args: any[]) => {
        out.push(args.join(" ") + "\n");
    };
    (process.stdout as any).write = (chunk: any) => {
        out.push(String(chunk));
        return true;
    };

    try {
        fn();
    } finally {
        console.log = orgLog;
        (process.stdout as any).write = orgWrite;
    }

    return out.join("");
}

// The tests that start node child processes do so synchronously, and a synchronous test that overruns
// its timeout fails once it returns. Node's own startup is well under the 2 second default here but can
// be several times slower on a loaded CI worker, so every group that spawns gets this budget instead.
const SPAWN_TIMEOUT = 30000;

function fakeArm(key: string, script: string): any {
    return {
        key: key,
        suite: { id: "core", label: "core" },
        target: "node",
        runner: { id: "tripwire", label: "tripwire" },
        file: process.execPath,
        args: [ "-e", script ],
        cwd: os.tmpdir(),
        env: {}
    };
}

function result(runner: string, avgMs: number | null, overrides?: any): any {
    return Object.assign({
        key: "core-node-" + runner,
        suite: "core",
        suiteLabel: "core",
        target: "node",
        runner: runner,
        runnerLabel: runner,
        failures: avgMs === null ? 1 : 0,
        measured: avgMs === null ? 0 : 1,
        avgMs: avgMs,
        medianMs: avgMs,
        minMs: avgMs,
        maxMs: avgMs
    }, overrides || {});
}

describe("benchmark runBenchmark", () => {
    it("does not start a benchmark when it is loaded as a module", () => {
        assert.isFunction(bench.parseArgs);
        assert.equal(bench.BASELINE, "tripwire");
        assert.includes(bench.USAGE, "--record");
    });

    describe("parseArgs", () => {
        it("defaults to one measured run of every arm, type-checked and uninstrumented", () => {
            const opts = bench.parseArgs([]);

            assert.equal(opts.runs, 1);
            assert.isFalse(opts.warmup);
            assert.isFalse(opts.coverage);
            assert.isTrue(opts.typeCheck);
            assert.isFalse(opts.record);
            assert.isFalse(opts.list);
            assert.isNull(opts.json);
            assert.equal(opts.recordDir, records.RESULTS_DIR);
            assert.deepEqual(opts.suites, [ "core", "chai" ]);
            assert.deepEqual(opts.targets, [ "node", "browser", "worker" ]);
            assert.deepEqual(opts.runners, [ "tripwire", "mocha", "karma" ]);
        });

        it("reads the run count from --runs or a bare number, never below one", () => {
            assert.equal(bench.parseArgs([ "--runs=3" ]).runs, 3);
            assert.equal(bench.parseArgs([ "5" ]).runs, 5);
            assert.equal(bench.parseArgs([ "--runs=0" ]).runs, 1);
        });

        it("reads every switch", () => {
            const opts = bench.parseArgs([ "--warmup", "--coverage", "--no-type-check", "--list", "-v" ]);

            assert.isTrue(opts.warmup);
            assert.isTrue(opts.coverage);
            assert.isFalse(opts.typeCheck);
            assert.isTrue(opts.list);
            assert.isTrue(opts.verbose);

            const undone = bench.parseArgs([ "--coverage", "--no-coverage", "--transpile-only", "--type-check", "--verbose" ]);
            assert.isFalse(undone.coverage, "the last of --coverage/--no-coverage wins");
            assert.isTrue(undone.typeCheck, "the last of --transpile-only/--type-check wins");
            assert.isTrue(undone.verbose);
        });

        it("splits and trims the suite, target and runner lists", () => {
            const opts = bench.parseArgs([ "--suites=chai, core", "--targets=node,,worker", "--runners= mocha " ]);

            assert.deepEqual(opts.suites, [ "chai", "core" ]);
            assert.deepEqual(opts.targets, [ "node", "worker" ]);
            assert.deepEqual(opts.runners, [ "mocha" ]);
        });

        it("resolves the json and record locations, and a record location implies recording", () => {
            const opts = bench.parseArgs([ "--json=out/raw.json", "--record-dir=somewhere/else" ]);

            assert.equal(opts.json, path.resolve("out/raw.json"));
            assert.isTrue(opts.record);
            assert.equal(opts.recordDir, path.resolve("somewhere/else"));
            assert.isTrue(bench.parseArgs([ "--record" ]).record);
        });
    });

    describe("validateSelection", () => {
        it("accepts the known ids", () => {
            bench.validateSelection(bench.parseArgs([ "--suites=core", "--targets=browser", "--runners=karma" ]));
        });
    });

    describe("describeCommand", () => {
        const glob = "./test/src/!(browser|worker)/**/*.test.ts";

        it("quotes for the shell of the platform it runs on by default", () => {
            assert.equal(bench.describeCommand({ file: "node", args: [ "has space" ] }),
                bench.describeCommand({ file: "node", args: [ "has space" ] }, process.platform));
        });

        describe("on Windows", () => {
            function win(file: string, args: string[]): string {
                return bench.describeCommand({ file: file, args: args }, "win32");
            }

            it("leaves plain arguments and paths unquoted", () => {
                assert.equal(win("node", [ "D:\\repo\\x.js", "--flag", "-p", "./test/tsconfig.json" ]), "node D:\\repo\\x.js --flag -p ./test/tsconfig.json");
            });

            it("keeps the backslashes of a quoted path as written so the command can be pasted back", () => {
                assert.equal(win("C:\\Program Files\\nodejs\\node.exe", []), "\"C:\\Program Files\\nodejs\\node.exe\"");
            });

            it("quotes an argument the shell would otherwise interpret, such as a spec glob", () => {
                assert.equal(win("node", [ glob ]), "node \"" + glob + "\"");
                assert.equal(win("node", [ "" ]), "node \"\"", "an empty argument still takes a slot");
            });

            it("escapes an embedded quote and doubles only the backslashes that precede one", () => {
                assert.equal(win("node", [ "say \"hi\"" ]), "node \"say \\\"hi\\\"\"");
                assert.equal(win("node", [ "a\\\"b c" ]), "node \"a\\\\\\\"b c\"", "a\\\"b c: the backslash before the quote is doubled, then the quote escaped");
            });

            it("doubles a trailing backslash run so it cannot escape the closing quote", () => {
                assert.equal(win("node", [ "C:\\dir with space\\" ]), "node \"C:\\dir with space\\\\\"");
                assert.equal(win("node", [ "C:\\a b\\\\" ]), "node \"C:\\a b\\\\\\\\\"");
            });
        });

        describe("on POSIX", () => {
            function posix(file: string, args: string[]): string {
                return bench.describeCommand({ file: file, args: args }, "linux");
            }

            it("leaves plain arguments and paths unquoted", () => {
                assert.equal(posix("/usr/bin/node", [ "core/bin/tripwire.js", "--target", "browser" ]), "/usr/bin/node core/bin/tripwire.js --target browser");
            });

            it("single-quotes an argument with whitespace or shell characters, such as a spec glob", () => {
                assert.equal(posix("node", [ "has space", glob ]), "node 'has space' '" + glob + "'");
                assert.equal(posix("node", [ "a\\b", "say \"hi\"" ]), "node 'a\\b' 'say \"hi\"'", "a backslash or double quote is literal inside single quotes");
                assert.equal(posix("node", [ "" ]), "node ''");
            });

            it("closes and reopens the quotes around an embedded single quote", () => {
                assert.equal(posix("node", [ "it's" ]), "node 'it'\\''s'");
            });
        });
    });

    describe("runArm", function () {
        this.timeout(SPAWN_TIMEOUT);

        it("times a run and reports whether it succeeded", () => {
            const ok = bench.runArm(fakeArm("ok", "process.exit(0)"), false);
            const failed = bench.runArm(fakeArm("failed", "process.exit(3)"), false);

            assert.isTrue(ok.ok);
            assert.equal(ok.status, 0);
            assert.isNull(ok.spawnError);
            assert.isTrue(ok.durationMs > 0);
            assert.isFalse(failed.ok);
            assert.equal(failed.status, 3);
        });

        it("reports a command that could not be started", () => {
            const run = bench.runArm(Object.assign(fakeArm("missing", ""), { file: path.join(os.tmpdir(), "no-such-binary-for-tripwire-bench") }), false);

            assert.isFalse(run.ok);
            assert.isString(run.spawnError);
        });

        it("passes the arm's environment to the run", () => {
            const arm = fakeArm("env", "process.exit(process.env.TRIPWIRE_BENCH_PROBE === 'yes' ? 0 : 1)");
            arm.env = { TRIPWIRE_BENCH_PROBE: "yes" };

            assert.isTrue(bench.runArm(arm, false).ok);
        });
    });

    describe("measure", function () {
        // Six child processes for the first test alone: two arms, each with a warmup and two runs
        this.timeout(SPAWN_TIMEOUT);

        it("measures every run, excludes failed ones and keeps the warmup out of the numbers", () => {
            let results: any[];
            const output = captureOutput(() => {
                results = bench.measure([
                    fakeArm("good", "process.exit(0)"),
                    fakeArm("bad", "process.exit(1)")
                ], { runs: 2, warmup: true, verbose: false });
            });

            assert.equal(results.length, 2);
            assert.equal(results[0].measured, 2);
            assert.equal(results[0].failures, 0);
            assert.equal(results[0].durationsMs.length, 2);
            assert.isTrue(results[0].avgMs > 0);
            assert.equal(results[0].command, bench.describeCommand(fakeArm("good", "process.exit(0)")));

            assert.equal(results[1].measured, 0);
            assert.equal(results[1].failures, 2);
            assert.isNull(results[1].avgMs, "a run that never succeeded has no numbers");

            assert.includes(output, "core node (tripwire) warmup...");
            assert.includes(output, "run 2/2...");
            assert.includes(output, "(FAILED -- excluded)");
        });

        it("keeps the first spawn error of an arm that could not be started", () => {
            let results: any[];
            captureOutput(() => {
                results = bench.measure([
                    Object.assign(fakeArm("missing", ""), { file: path.join(os.tmpdir(), "no-such-binary-for-tripwire-bench") })
                ], { runs: 1, warmup: false, verbose: false });
            });

            assert.isString(results[0].spawnError);
        });
    });

    describe("printSummary", () => {
        it("describes the options and marks failed arms", () => {
            const output = captureOutput(() => {
                bench.printSummary([ result("tripwire", 1500), result("mocha", null) ], { runs: 2, coverage: true, typeCheck: false });
            });

            assert.includes(output, "Summary (2 runs per arm, instrumented, transpile-only):");
            assert.includes(output, "1.50s");
            assert.includes(output, "FAILED 1/1");
            assert.includes(output, "ok");
        });

        it("uses the singular for a single run", () => {
            const output = captureOutput(() => {
                bench.printSummary([ result("tripwire", 1000) ], { runs: 1, coverage: false, typeCheck: true });
            });

            assert.includes(output, "Summary (1 run per arm, no coverage, type-checked):");
        });
    });

    describe("printComparisons", () => {
        it("compares each alternate runner with tripwire on the same suite and target", () => {
            const output = captureOutput(() => {
                bench.printComparisons([
                    result("tripwire", 6000),
                    result("mocha", 9000),
                    result("tripwire", 2000, { target: "browser" }),
                    result("karma", 1000, { target: "browser" })
                ]);
            });

            assert.includes(output, "Differences (tripwire runner vs alternate runner):");
            assert.includes(output, "tripwire faster by 33.3%");
            assert.includes(output, "-3.00s");
            assert.includes(output, "karma faster by 100.0%");
            assert.includes(output, "+1.00s");
        });

        it("says which side failed when they cannot be compared", () => {
            const output = captureOutput(() => {
                bench.printComparisons([ result("tripwire", null), result("mocha", null) ]);
            });

            assert.includes(output, "not comparable -- tripwire and mocha failed");
        });

        it("prints nothing without a tripwire result to compare against", () => {
            assert.equal(captureOutput(() => bench.printComparisons([ result("mocha", 1000) ])), "");
            assert.equal(captureOutput(() => bench.printComparisons([ result("tripwire", 1000) ])), "", "nothing to compare tripwire with");
        });
    });

    describe("as a script", function () {
        this.timeout(SPAWN_TIMEOUT);

        it("prints the usage for --help", () => {
            const run = runScript([ "--help" ]);

            assert.equal(run.status, 0);
            assert.includes(run.stdout, "Usage: node ./scripts/runBenchmark.js [options]");
        });

        it("rejects an unknown option", () => {
            const run = runScript([ "--bogus" ]);

            assert.equal(run.status, 1);
            assert.includes(run.stderr, "Unknown option: --bogus");
        });

        it("rejects an unknown suite, target or runner", () => {
            assert.includes(runScript([ "--suites=nope" ]).stderr, "Unknown suite: nope (known: core, chai)");
            assert.includes(runScript([ "--targets=nope" ]).stderr, "Unknown target: nope");
            assert.includes(runScript([ "--runners=nope" ]).stderr, "Unknown runner: nope");
        });

        it("refuses a selection no runner supports", () => {
            const run = runScript([ "--targets=node", "--runners=karma" ]);

            assert.equal(run.status, 1);
            assert.includes(run.stderr, "Nothing to run");
        });

        it("lists the arms and their commands without running them", () => {
            const run = runScript([ "--list", "--suites=chai", "--targets=node" ]);

            assert.equal(run.status, 0);
            assert.includes(run.stdout, "chai-node-tripwire");
            assert.includes(run.stdout, "chai-node-mocha");
            assert.includes(run.stdout, "cmd: ");
        });

        it("measures a real arm and records it without any path in the record", function () {
            this.timeout(180000);
            const recordDir = fs.mkdtempSync(path.join(os.tmpdir(), "tripwire-bench-record-"));
            const jsonFile = path.join(recordDir, "raw", "raw.json");

            try {
                const run = runScript([ "--suites=chai", "--targets=node", "--runners=tripwire", "--record-dir=" + recordDir, "--json=" + jsonFile ]);

                assert.equal(run.status, 0, run.stdout + run.stderr);
                assert.includes(run.stdout, "Recorded ");

                const files = fs.readdirSync(recordDir).filter((f) => /\.json$/.test(f));
                assert.equal(files.length, 2, "one record and its index");
                assert.deepEqual(records.validateResultsDir(recordDir), [], "the record is valid, named after its contents and indexed");

                const record = JSON.parse(fs.readFileSync(path.join(recordDir, files.filter((f) => f !== records.INDEX_FILE)[0]), "utf8"));
                assert.equal(record.results.length, 1);
                assert.equal(record.results[0].key, "chai-node-tripwire");
                assert.equal(record.results[0].measured, 1);

                const raw = JSON.parse(fs.readFileSync(jsonFile, "utf8"));
                assert.equal(raw.results.length, 1);
                assert.isString(raw.results[0].command, "the raw measurements keep the command, the record does not");
            } finally {
                fs.rmSync(recordDir, { recursive: true, force: true });
            }
        });
    });
});
