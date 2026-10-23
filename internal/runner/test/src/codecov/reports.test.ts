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
import { assert } from "@nevware21/tripwire";
import { runCoverageReport } from "../../../src/codecov/nodeCoverageReport";
import { _buildReporterArgs, _nycCwd, _spawnNycReport } from "../../../src/codecov/nycReport";
import { NycCoverageReporter } from "../../../src/codecov/reporter";

function covered(file: string, hits: number): any {
    return {
        path: file,
        statementMap: {
            0: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
            1: { start: { line: 2, column: 0 }, end: { line: 2, column: 10 } }
        },
        fnMap: {},
        branchMap: {},
        s: { 0: hits, 1: 0 },
        f: {},
        b: {}
    };
}

function erased(file: string): any {
    return { path: file, statementMap: {}, fnMap: {}, branchMap: {}, s: {}, f: {}, b: {}, all: true };
}

function captureConsole(fn: () => any): { result: any; warnings: string[]; logs: string[] } {
    const warnings: string[] = [];
    const logs: string[] = [];
    const orgWarn = console.warn;
    const orgLog = console.log;
    console.warn = (...args: any[]) => {
        warnings.push(args.join(" "));
    };
    console.log = (...args: any[]) => {
        logs.push(args.join(" "));
    };

    try {
        return { result: fn(), warnings, logs };
    } finally {
        console.warn = orgWarn;
        console.log = orgLog;
    }
}

function summaryOf(dir: string): any {
    return JSON.parse(fs.readFileSync(path.join(dir, "coverage-summary.json"), "utf8"));
}

/**
 * Writing and reporting coverage: the browser and worker reporter, the node report that merges nyc's raw
 * output, and the nyc invocation both share. nyc is run for real with the json-summary reporter, which
 * writes a file rather than printing, so the results can be read back.
 */
describe("codecov reports", function () {
    // Each report starts nyc in a child process
    this.timeout(120000);

    let scratch: string;

    beforeEach(() => {
        scratch = fs.mkdtempSync(path.join(os.tmpdir(), "tripwire-reports-"));
    });

    afterEach(() => {
        fs.rmSync(scratch, { recursive: true, force: true });
    });

    describe("nycReport", () => {
        it("works in the nearest folder with a package.json, as nyc itself would", () => {
            const project = path.join(scratch, "project");
            fs.mkdirSync(path.join(project, "src", "deep"), { recursive: true });
            fs.writeFileSync(path.join(project, "package.json"), "{}", "utf8");

            assert.equal(_nycCwd(path.join(project, "src", "deep")), project);
            assert.equal(_nycCwd(project), project);
        });

        it("falls back to the folder it was given when no package.json is above it", () => {
            const loose = path.join(scratch, "loose");
            fs.mkdirSync(loose);

            assert.equal(_nycCwd(loose), path.resolve(loose));
        });

        it("defaults to the text reporter and repeats --reporter for each one", () => {
            assert.deepEqual(_buildReporterArgs(), [ "--reporter", "text" ]);
            assert.deepEqual(_buildReporterArgs([]), [ "--reporter", "text" ]);
            assert.deepEqual(_buildReporterArgs([ "lcov", "json" ]), [ "--reporter", "lcov", "--reporter", "json" ]);
        });

        it("runs nyc report and returns its exit code", () => {
            const tempDir = path.join(scratch, "raw");
            fs.mkdirSync(tempDir);
            const data: any = {};
            data[path.join(scratch, "src", "a.js")] = covered(path.join(scratch, "src", "a.js"), 1);
            fs.writeFileSync(path.join(tempDir, "out.json"), JSON.stringify(data), "utf8");

            const status = _spawnNycReport(scratch, [ "--temp-dir", tempDir, "--report-dir", path.join(scratch, "report"), "--reporter", "json-summary" ], "test");

            assert.equal(status, 0);
            assert.equal(summaryOf(path.join(scratch, "report")).total.statements.pct, 50);
        });

        it("reports this project's files even when an outer nyc points NYC_CWD at another project", () => {
            const tempDir = path.join(scratch, "raw");
            fs.mkdirSync(tempDir);
            const data: any = {};
            data[path.join(scratch, "src", "a.js")] = covered(path.join(scratch, "src", "a.js"), 1);
            fs.writeFileSync(path.join(tempDir, "out.json"), JSON.stringify(data), "utf8");

            // Another project whose .nycrc would include none of this one's files
            const outer = path.join(scratch, "outer");
            fs.mkdirSync(outer);
            fs.writeFileSync(path.join(outer, "package.json"), "{}", "utf8");
            fs.writeFileSync(path.join(outer, ".nycrc"), JSON.stringify({ include: [ "nothing/**" ] }), "utf8");

            const saved = process.env.NYC_CWD;
            process.env.NYC_CWD = outer;
            try {
                assert.equal(_spawnNycReport(scratch, [ "--temp-dir", tempDir, "--report-dir", path.join(scratch, "report"), "--reporter", "json-summary" ], "test"), 0);
            } finally {
                if (saved === undefined) {
                    delete process.env.NYC_CWD;
                } else {
                    process.env.NYC_CWD = saved;
                }
            }

            assert.equal(summaryOf(path.join(scratch, "report")).total.statements.pct, 50, "this project's file was reported");
        });

        it("warns with the label when nyc report fails", () => {
            const run = captureConsole(() => _spawnNycReport(scratch, [ "--temp-dir", scratch, "--reporter", "no-such-reporter-anywhere" ], "my label"));

            assert.notEqual(run.result, 0);
            assert.includes(run.warnings.join("\n"), "nyc report failed for my label with exit code");
        });
    });

    describe("NycCoverageReporter", () => {
        it("writes the browser coverage without the embedded sources and reports it", () => {
            const file = path.join(scratch, "src", "a.js");
            const data: any = {};
            data[file] = Object.assign(covered(file, 3), { inputSourceMap: { version: 3, sources: [ "a.ts" ], sourcesContent: [ "huge source" ], mappings: "AAAA" } });
            data[path.join(scratch, "src", "b.js")] = covered(path.join(scratch, "src", "b.js"), 0);

            const run = captureConsole(() => new NycCoverageReporter([ "json-summary" ]).write(data, scratch, "browser"));

            const written = JSON.parse(fs.readFileSync(path.join(scratch, "coverage", "browser", "coverage-final.json"), "utf8"));
            assert.isUndefined(written[file].inputSourceMap.sourcesContent, "the sources are stripped");
            assert.deepEqual(written[file].inputSourceMap.sources, [ "a.ts" ], "the rest of the map is kept");
            assert.deepEqual(written[file].s, { 0: 3, 1: 0 });
            assert.includes(run.logs.join("\n"), "coverage-final.json");
            assert.isTrue(fs.existsSync(path.join(scratch, "coverage", "browser", "report", "coverage-summary.json")), "the report was generated");
        });

        it("writes worker coverage to its own folder, with the text reporter by default", () => {
            const reporter = new NycCoverageReporter();
            const data: any = {};
            data[path.join(scratch, "src", "w.js")] = covered(path.join(scratch, "src", "w.js"), 1);

            captureConsole(() => reporter.write(data, scratch, "worker"));

            assert.isTrue(fs.existsSync(path.join(scratch, "coverage", "worker", "coverage-final.json")));
            assert.isFalse(fs.existsSync(path.join(scratch, "coverage", "browser")));
        });

        it("warns rather than throws when the coverage folder cannot be written", () => {
            fs.writeFileSync(path.join(scratch, "coverage"), "a file where the folder should be", "utf8");

            const run = captureConsole(() => new NycCoverageReporter([ "json-summary" ]).write({}, scratch, "browser"));

            assert.includes(run.warnings.join("\n"), "Failed to write browser coverage file");
        });
    });

    describe("runCoverageReport", () => {
        function writeNycOutput(dir: string): { real: string; empty: string } {
            const real = path.join(scratch, "src", "real.js");
            const empty = path.join(scratch, "src", "types.js");
            const data: any = {};
            data[real] = covered(real, 2);
            data[empty] = erased(empty);

            fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(path.join(dir, "process-1.json"), JSON.stringify(data), "utf8");
            fs.writeFileSync(path.join(dir, "broken.json"), "{ not coverage", "utf8");
            fs.writeFileSync(path.join(dir, "notes.txt"), "ignored", "utf8");

            return { real, empty };
        }

        it("warns and fails when there is no nyc output to report", () => {
            const run = captureConsole(() => runCoverageReport(scratch, {}));

            assert.equal(run.result, 1);
            assert.includes(run.warnings.join("\n"), "No nyc coverage data found at");
        });

        it("reports erased files as uncovered by default", () => {
            const files = writeNycOutput(path.join(scratch, ".nyc_output"));

            const run = captureConsole(() => runCoverageReport(scratch, { coverageReporters: [ "json-summary" ] }));
            const summary = summaryOf(path.join(scratch, "coverage"));

            assert.equal(run.result, 0);
            assert.includes(run.logs.join("\n"), "zero");
            assert.isObject(summary[files.real]);
            assert.isObject(summary[files.empty], "the erased file is still listed");
            assert.equal(summary[files.real].statements.pct, 50);
        });

        it("counts erased files as covered in full mode and drops them in ignore mode", () => {
            const files = writeNycOutput(path.join(scratch, "raw"));

            captureConsole(() => runCoverageReport(scratch, { nycOutputDir: "raw", erasedCoverageMode: "full", coverageReporters: [ "json-summary" ] }));
            const full = summaryOf(path.join(scratch, "coverage"));
            assert.equal(full[files.empty].statements.pct, 100);

            fs.rmSync(path.join(scratch, "coverage"), { recursive: true, force: true });
            captureConsole(() => runCoverageReport(scratch, { nycOutputDir: "raw", erasedCoverageMode: "ignore", coverageReporters: [ "json-summary" ] }));
            const ignored = summaryOf(path.join(scratch, "coverage"));
            assert.isUndefined(ignored[files.empty]);
            assert.isObject(ignored[files.real]);
        });

        it("removes its temporary merge folder", () => {
            writeNycOutput(path.join(scratch, ".nyc_output"));
            const before = fs.readdirSync(os.tmpdir()).filter((f) => f.indexOf("tripwire-node-coverage-") === 0).length;

            captureConsole(() => runCoverageReport(scratch, { coverageReporters: [ "json-summary" ] }));

            const after = fs.readdirSync(os.tmpdir()).filter((f) => f.indexOf("tripwire-node-coverage-") === 0).length;
            assert.equal(after, before);
        });
    });
});
