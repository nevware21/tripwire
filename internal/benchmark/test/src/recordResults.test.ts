/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const records = require("../../scripts/recordResults");

/**
 * Records are checked in under docs/performance/results, so the one property that matters above all is
 * that nothing identifying the machine or the user (a path, a host name) can ever reach one.
 */
function sampleResult(overrides?: any): any {
    return Object.assign({
        key: "core-node-tripwire",
        suite: "core",
        suiteLabel: "core",
        target: "node",
        runner: "tripwire",
        runnerLabel: "tripwire",
        command: "node core/bin/tripwire.js",
        cwd: "/somewhere/core",
        spawnError: null,
        failures: 0,
        measured: 2,
        durationsMs: [ 100, 200 ],
        avgMs: 150,
        medianMs: 150,
        minMs: 100,
        maxMs: 200
    }, overrides || {});
}

function sampleOpts(overrides?: any): any {
    return Object.assign({
        runs: 2,
        warmup: true,
        coverage: false,
        typeCheck: true,
        suites: [ "core" ],
        targets: [ "node" ],
        runners: [ "tripwire" ]
    }, overrides || {});
}

const environment = {
    git: { commit: "abc1234", dirty: false },
    machine: { os: "Linux", arch: "x64", cpu: "Test CPU", logicalProcessors: 4, memoryGB: 16 },
    versions: { node: "v20.0.0", tripwire: "0.1.8" }
};

function sampleRecord(overrides?: any, when?: Date): any {
    return Object.assign(records.buildRecord([ sampleResult() ], sampleOpts(), environment, when || new Date(Date.UTC(2026, 0, 2, 3, 4, 5))), overrides || {});
}

describe("benchmark recordResults", () => {
    let tempDir: string;

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "tripwire-bench-"));
    });

    afterEach(() => {
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    describe("scrubResult", () => {
        it("keeps the measurements and drops the command, working directory and spawn error", () => {
            const scrubbed = records.scrubResult(sampleResult({ spawnError: "spawn ENOENT" }), sampleOpts({ coverage: true, typeCheck: false }));

            assert.isUndefined(scrubbed.command);
            assert.isUndefined(scrubbed.cwd);
            assert.isUndefined(scrubbed.spawnError);
            assert.isUndefined(scrubbed.suiteLabel, "only the stable ids are kept");
            assert.equal(scrubbed.key, "core-node-tripwire");
            assert.deepEqual(scrubbed.durationsMs, [ 100, 200 ]);
            assert.isTrue(scrubbed.coverage);
            assert.isFalse(scrubbed.typeCheck);
        });

        it("copies the durations rather than sharing them", () => {
            const result = sampleResult();
            const scrubbed = records.scrubResult(result, sampleOpts());

            result.durationsMs.push(999);
            assert.deepEqual(scrubbed.durationsMs, [ 100, 200 ]);
        });
    });

    describe("buildRecord", () => {
        it("stamps the schema, the time, the environment and the selection", () => {
            const record = sampleRecord();

            assert.equal(record.schemaVersion, records.SCHEMA_VERSION);
            assert.equal(record.recordedAt, "2026-01-02T03:04:05.000Z");
            assert.deepEqual(record.git, environment.git);
            assert.deepEqual(record.machine, environment.machine);
            assert.deepEqual(record.options, {
                runs: 2, warmup: true, coverage: false, typeCheck: true,
                suites: [ "core" ], targets: [ "node" ], runners: [ "tripwire" ]
            });
            assert.equal(record.results.length, 1);
            assert.isUndefined(record.results[0].command);
        });

        it("records the current time when none is given", () => {
            const before = Date.now();
            const record = records.buildRecord([ sampleResult() ], sampleOpts(), environment);

            assert.isTrue(new Date(record.recordedAt).getTime() >= before);
        });
    });

    describe("recordFileName", () => {
        it("names a record by its UTC time and commit", () => {
            assert.equal(records.recordFileName(sampleRecord()), "2026-01-02T030405-abc1234.json");
        });

        it("marks a coverage run and copes with no commit", () => {
            const record = records.buildRecord([ sampleResult() ], sampleOpts({ coverage: true }), { git: null, machine: {}, versions: {} }, new Date(Date.UTC(2026, 10, 12, 13, 14, 15)));

            assert.equal(records.recordFileName(record), "2026-11-12T131415-nocommit-coverage.json");
        });
    });

    describe("validateRecord", () => {
        it("accepts a well formed record", () => {
            assert.deepEqual(records.validateRecord(sampleRecord()), []);
        });

        it("rejects something that is not an object", () => {
            assert.deepEqual(records.validateRecord(null, "x.json"), [ "x.json: not an object" ]);
        });

        it("reports every missing or wrong field", () => {
            const problems = records.validateRecord({
                schemaVersion: 99,
                recordedAt: "not a date",
                options: {},
                results: []
            }, "bad.json");

            assert.equal(problems.length, 4);
            assert.includes(problems[0], "schemaVersion 99");
            assert.includes(problems[1], "recordedAt is not a date");
            assert.includes(problems[2], "options.runs missing");
            assert.includes(problems[3], "results missing or empty");
        });

        it("reports results without their ids or durations", () => {
            const problems = records.validateRecord(sampleRecord({ results: [ { suite: "core", target: "", durationsMs: null } ] }));

            assert.includes(problems.join("\n"), "results[0].target missing");
            assert.includes(problems.join("\n"), "results[0].runner missing");
            assert.includes(problems.join("\n"), "results[0].durationsMs missing");
        });

        it("refuses results that carry the command, working directory or spawn error", () => {
            const raw = Object.assign(records.scrubResult(sampleResult(), sampleOpts()), { command: "x", cwd: "y", spawnError: "z" });
            const problems = records.validateRecord(sampleRecord({ results: [ raw ] }));

            assert.includes(problems.join("\n"), "results[0].command must not be recorded");
            assert.includes(problems.join("\n"), "results[0].cwd must not be recorded");
            assert.includes(problems.join("\n"), "results[0].spawnError must not be recorded");
        });

        it("refuses any file-system path, whatever the platform", () => {
            [
                "C:\\Users\\someone\\project",
                "d:/work/project",
                "\\\\server\\share\\project",
                "file:///project/core",
                " /home/someone/project",
                " /Users/someone/project",
                " /tmp/build"
            ].forEach((value) => {
                const problems = records.validateRecord(sampleRecord({ machine: { cpu: value } }));

                assert.includes(problems.join("\n"), "contains a file-system path", value);
            });
        });
    });

    describe("writeRecord and rebuildIndex", () => {
        it("writes the record under its own name and indexes it", () => {
            const file = records.writeRecord(tempDir, sampleRecord());

            assert.equal(path.basename(file), "2026-01-02T030405-abc1234.json");
            assert.deepEqual(JSON.parse(fs.readFileSync(file, "utf8")), sampleRecord());

            const index = JSON.parse(fs.readFileSync(path.join(tempDir, records.INDEX_FILE), "utf8"));
            assert.equal(index.records.length, 1);
            assert.deepEqual(index.invalid, []);
            assert.equal(index.records[0].file, path.basename(file));
            assert.equal(index.records[0].commit, "abc1234");
            assert.equal(index.records[0].arms, 1);
            assert.equal(index.records[0].failures, 0);
        });

        it("creates the results directory when it does not exist", () => {
            const nested = path.join(tempDir, "a", "b");
            records.writeRecord(nested, sampleRecord());

            assert.isTrue(fs.existsSync(path.join(nested, records.INDEX_FILE)));
        });

        it("refuses to write a record that would leak a path", () => {
            assert.throws(() => {
                records.writeRecord(tempDir, sampleRecord({ machine: { cpu: "C:\\Users\\someone" } }));
            }, /Refusing to record/);

            assert.deepEqual(fs.readdirSync(tempDir), [], "nothing was written");
        });

        it("orders the index by time and lists unreadable or invalid files separately", () => {
            records.writeRecord(tempDir, sampleRecord({}, new Date(Date.UTC(2026, 5, 1))));
            records.writeRecord(tempDir, sampleRecord({}, new Date(Date.UTC(2026, 0, 1))));
            fs.writeFileSync(path.join(tempDir, "broken.json"), "{ not json", "utf8");
            fs.writeFileSync(path.join(tempDir, "empty.json"), JSON.stringify({ schemaVersion: 1 }), "utf8");

            const index = records.rebuildIndex(tempDir);

            assert.deepEqual(index.records.map((e: any) => e.recordedAt), [ "2026-01-01T00:00:00.000Z", "2026-06-01T00:00:00.000Z" ]);
            assert.deepEqual(index.invalid.map((e: any) => e.file), [ "broken.json", "empty.json" ]);
            assert.deepEqual(index.invalid[0].problems, [ "not valid JSON" ]);
        });

        it("sums the failures of a run's arms", () => {
            records.writeRecord(tempDir, records.buildRecord(
                [ sampleResult({ failures: 2 }), sampleResult({ key: "core-node-mocha", runner: "mocha", failures: 1 }) ],
                sampleOpts(), environment, new Date(Date.UTC(2026, 0, 2))));

            const index = records.rebuildIndex(tempDir);
            assert.equal(index.records[0].failures, 3);
            assert.equal(index.records[0].arms, 2);
        });
    });

    describe("validateResultsDir", () => {
        it("has nothing to report for a directory that does not exist", () => {
            assert.deepEqual(records.validateResultsDir(path.join(tempDir, "missing")), []);
        });

        it("accepts records written by writeRecord", () => {
            records.writeRecord(tempDir, sampleRecord());

            assert.deepEqual(records.validateResultsDir(tempDir), []);
        });

        it("reports records without an index", () => {
            fs.writeFileSync(path.join(tempDir, "2026-01-02T030405-abc1234.json"), JSON.stringify(sampleRecord()), "utf8");

            assert.includes(records.validateResultsDir(tempDir).join("\n"), "index.json missing");
        });

        it("reports a record whose name does not match its contents", () => {
            records.writeRecord(tempDir, sampleRecord());
            fs.renameSync(path.join(tempDir, "2026-01-02T030405-abc1234.json"), path.join(tempDir, "renamed.json"));
            records.rebuildIndex(tempDir);

            assert.includes(records.validateResultsDir(tempDir).join("\n"), "renamed.json: name does not match its contents (expected 2026-01-02T030405-abc1234.json)");
        });

        it("reports an index that is stale or unreadable", () => {
            records.writeRecord(tempDir, sampleRecord());
            fs.writeFileSync(path.join(tempDir, "2026-02-02T000000-abc1234.json"),
                JSON.stringify(sampleRecord({}, new Date(Date.UTC(2026, 1, 2)))), "utf8");

            assert.includes(records.validateResultsDir(tempDir).join("\n"), "does not list exactly the valid records (1 listed, 2 on disk)");

            fs.writeFileSync(path.join(tempDir, records.INDEX_FILE), "{", "utf8");
            assert.includes(records.validateResultsDir(tempDir).join("\n"), "index.json: not valid JSON");
        });

        it("reports invalid and unreadable records", () => {
            fs.writeFileSync(path.join(tempDir, "bad.json"), "{", "utf8");
            fs.writeFileSync(path.join(tempDir, "worse.json"), JSON.stringify({}), "utf8");
            records.rebuildIndex(tempDir);

            const problems = records.validateResultsDir(tempDir).join("\n");
            assert.includes(problems, "bad.json: not valid JSON");
            assert.includes(problems, "worse.json: schemaVersion");
        });

        it("finds the checked in records consistent", () => {
            assert.deepEqual(records.validateResultsDir(records.RESULTS_DIR), []);
        });
    });

    describe("collectEnvironment", () => {
        it("describes the machine, the tool versions and the commit without leaking a path", async () => {
            const env = await records.collectEnvironment();

            assert.isString(env.machine.os);
            assert.isString(env.machine.arch);
            assert.isTrue(env.machine.logicalProcessors > 0);
            assert.equal(env.versions.node, process.version);
            assert.isString(env.versions.tripwire);
            assert.isString(env.versions.karma);
            assert.isString(env.versions["ts-mocha"]);
            assert.isString(env.versions.chromeSource);
            assert.isString(env.git.commit);

            if (!process.env.PUPPETEER_EXECUTABLE_PATH) {
                // puppeteer 25 is ES modules only: on Node 18 a require() of it fails, and the record
                // used to say "puppeteer not resolvable" although puppeteer was installed
                assert.isTrue([ "puppeteer not resolvable", "puppeteer executablePath() failed" ].indexOf(env.versions.chromeSource) === -1,
                    "puppeteer was loaded and answered, not " + env.versions.chromeSource);
                assert.isString(env.versions.puppeteer);
            }

            // The whole point of the scrubbing: a real record built from the real environment must pass
            assert.deepEqual(records.validateRecord(records.buildRecord([ sampleResult() ], sampleOpts(), env)), []);
        });
    });
});
