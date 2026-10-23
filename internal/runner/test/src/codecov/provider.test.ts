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
import { DefaultCoverageFilter } from "../../../src/codecov/filter";
import { CoverageData, CoverageEntry, ICoverageInstrumenter, ICoverageReporter } from "../../../src/codecov/interfaces";
import { _asFullyCovered, _asZeroCovered, _isErasedEntry, createDefaultCoverageProvider, DefaultCoverageProvider } from "../../../src/codecov/provider";
import { NycCoverageReporter } from "../../../src/codecov/reporter";

function entry(file: string, statements: number, functions?: number): CoverageEntry {
    const statementMap: any = {};
    const s: any = {};
    for (let lp = 0; lp < statements; lp++) {
        statementMap[lp] = { start: { line: lp + 1, column: 0 }, end: { line: lp + 1, column: 5 } };
        s[lp] = 0;
    }

    const fnMap: any = {};
    const f: any = {};
    for (let lp = 0; lp < (functions || 0); lp++) {
        fnMap[lp] = { name: "f" + lp, decl: { start: { line: 1, column: 0 }, end: { line: 1, column: 1 } }, loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 1 } } };
        f[lp] = 0;
    }

    return { path: file, statementMap, fnMap, branchMap: {}, s, f, b: {} };
}

/**
 * An instrumenter that records what it was asked to instrument, and answers with a made-up coverage
 * map per file so the provider's bookkeeping can be checked without istanbul.
 */
function recordingInstrumenter(coverageFor?: (file: string) => CoverageEntry | null, failFor?: RegExp): ICoverageInstrumenter & { calls: any[] } {
    let last: CoverageEntry | null = null;
    const instrumenter = {
        calls: [] as any[],
        instrument(source: string, moduleId: string, inputSourceMap?: any): string {
            instrumenter.calls.push({ moduleId, hasMap: !!inputSourceMap });
            if (failFor && failFor.test(moduleId)) {
                throw new Error("cannot instrument " + moduleId);
            }

            last = coverageFor ? coverageFor(moduleId) : null;
            return "/*instrumented*/" + source;
        },
        getLastFileCoverage(): CoverageEntry | null {
            return last;
        }
    };

    return instrumenter;
}

function recordingReporter(): ICoverageReporter & { writes: any[] } {
    const reporter = {
        writes: [] as any[],
        write(coverage: CoverageData, cwd: string, target: string): void {
            reporter.writes.push({ coverage, cwd, target });
        }
    };

    return reporter;
}

function captureWarnings(fn: () => void): string[] {
    const warnings: string[] = [];
    const orgWarn = console.warn;
    console.warn = (...args: any[]) => {
        warnings.push(args.join(" "));
    };

    try {
        fn();
    } finally {
        console.warn = orgWarn;
    }

    return warnings;
}

describe("codecov provider", () => {
    describe("erased entries", () => {
        it("treats a file with no functions, no branches and at most one statement as erased", () => {
            assert.isTrue(_isErasedEntry({ path: "a" }));
            assert.isTrue(_isErasedEntry(entry("a", 0)));
            assert.isTrue(_isErasedEntry(entry("a", 1)));
            assert.isFalse(_isErasedEntry(entry("a", 2)));
            assert.isFalse(_isErasedEntry(entry("a", 0, 1)));
            assert.isFalse(_isErasedEntry(Object.assign(entry("a", 0), { branchMap: { 0: {} }, b: { 0: [ 0 ] } })));
        });

        it("zeroes every counter without touching the original", () => {
            const original = Object.assign(entry("a", 2, 1), { b: { 0: [ 3, 4 ] }, branchMap: { 0: {} } });
            original.s[0] = 5;
            original.f[0] = 2;

            const zeroed = _asZeroCovered(original);

            assert.deepEqual(zeroed.s, { 0: 0, 1: 0 });
            assert.deepEqual(zeroed.f, { 0: 0 });
            assert.deepEqual(zeroed.b, { 0: [ 0, 0 ] });
            assert.equal(original.s[0], 5, "the original is not changed");
            assert.deepEqual(_asZeroCovered({ path: "empty" }).s, {});
        });

        it("marks every counter covered, giving a file without statements one covered statement", () => {
            const covered = _asFullyCovered(Object.assign(entry("a", 2, 1), { b: { 0: [ 0, 0 ] }, branchMap: { 0: {} } }));

            assert.deepEqual(covered.s, { 0: 1, 1: 1 });
            assert.deepEqual(covered.f, { 0: 1 });
            assert.deepEqual(covered.b, { 0: [ 1, 1 ] });

            const synthetic = _asFullyCovered(entry("types", 0));
            assert.deepEqual(synthetic.s, { 0: 1 });
            assert.deepEqual(Object.keys(synthetic.statementMap), [ "0" ]);
            assert.deepEqual(synthetic.fnMap, {});
            assert.deepEqual(synthetic.b, {});
            assert.deepEqual(_asFullyCovered({ path: "bare", statementMap: { 0: {} } }).f, {}, "missing counters are treated as empty");
        });
    });

    describe("instrumentPayload", () => {
        const cwd = "/proj";
        const sourceMapComment = "//# sourceMappingURL=data:application/json;base64," + Buffer.from(JSON.stringify({ version: 3, sources: [ "b.ts" ], mappings: "AAAA" })).toString("base64");

        function payload(): any {
            return {
                settings: { timeout: 10 },
                entryIds: [ "/proj/test/a.test.js" ],
                tripwireModuleId: "/proj/node_modules/@nevware21/tripwire/tripwire.js",
                coverageOnlyIds: [ "/proj/src/only.js" ],
                modules: {
                    "/proj/test/a.test.js": "require('/proj/src/b.js'); require(\"/proj/src/throws.js\");",
                    "/proj/src/b.js": "require( '/proj/src/c.js' ); require('/proj/src/missing.js');\n" + sourceMapComment,
                    "/proj/src/c.js": "module.exports = 1; require('/proj/src/b.js');",
                    "/proj/src/only.js": "module.exports = 'only';",
                    "/proj/src/unused.js": "module.exports = 'never required';",
                    "/proj/src/throws.js": "module.exports = 'breaks the instrumenter';",
                    "/proj/test/helper.test.js": "module.exports = 'a test file';",
                    "/proj/node_modules/@nevware21/tripwire/tripwire.js": "require('/proj/node_modules/dep/index.js');",
                    "/proj/node_modules/dep/index.js": "module.exports = 'dependency';"
                }
            };
        }

        it("instruments only the reachable, in-scope, non-test modules", () => {
            const instrumenter = recordingInstrumenter(undefined, /throws\.js$/);
            const provider = new DefaultCoverageProvider(instrumenter, new DefaultCoverageFilter(), recordingReporter());

            const result = provider.instrumentPayload(payload(), cwd, {});
            const instrumented = Object.keys(result.modules).filter((id) => result.modules[id].indexOf("/*instrumented*/") === 0).sort();

            assert.deepEqual(instrumented, [ "/proj/src/b.js", "/proj/src/c.js", "/proj/src/only.js" ]);
            assert.equal(result.modules["/proj/src/unused.js"], "module.exports = 'never required';", "an unreachable module is left alone");
            assert.equal(result.modules["/proj/src/throws.js"], "module.exports = 'breaks the instrumenter';", "a module the instrumenter rejects is served as it was");
            assert.equal(result.modules["/proj/test/a.test.js"], payload().modules["/proj/test/a.test.js"], "the entry (a test) is never instrumented");
            assert.isFalse(result.modules["/proj/node_modules/dep/index.js"].indexOf("/*instrumented*/") === 0, "dependencies are out of scope");
        });

        it("passes a module's own source map to the instrumenter", () => {
            const instrumenter = recordingInstrumenter();
            new DefaultCoverageProvider(instrumenter, new DefaultCoverageFilter(), recordingReporter()).instrumentPayload(payload(), cwd, {});

            const calls: { [id: string]: boolean } = {};
            instrumenter.calls.forEach((call) => {
                calls[call.moduleId] = call.hasMap;
            });

            assert.isTrue(calls["/proj/src/b.js"]);
            assert.isFalse(calls["/proj/src/c.js"]);
        });

        it("keeps the settings, entries and tripwire module but not the coverage-only list", () => {
            const result = new DefaultCoverageProvider(recordingInstrumenter(), new DefaultCoverageFilter(), recordingReporter()).instrumentPayload(payload(), cwd, {});

            assert.deepEqual(result.settings, { timeout: 10 });
            assert.deepEqual(result.entryIds, [ "/proj/test/a.test.js" ]);
            assert.equal(result.tripwireModuleId, "/proj/node_modules/@nevware21/tripwire/tripwire.js");
            assert.isUndefined(result.coverageOnlyIds);
        });

        it("returns a payload without modules as it is", () => {
            const provider = new DefaultCoverageProvider(recordingInstrumenter(), new DefaultCoverageFilter(), recordingReporter());
            const empty = { entryIds: [ "a" ] };

            assert.equal(provider.instrumentPayload(empty, cwd, {}), empty);
            assert.isNull(provider.instrumentPayload(null, cwd, {}));
        });

        it("copes with a payload that names no entries or tripwire module", () => {
            const result = new DefaultCoverageProvider(recordingInstrumenter(), new DefaultCoverageFilter(), recordingReporter())
                .instrumentPayload({ modules: { "/proj/src/a.js": "x" } }, cwd, {});

            assert.equal(result.modules["/proj/src/a.js"], "x", "nothing is reachable, so nothing is instrumented");
        });
    });

    describe("writeCoverage and fillUninstrumentedFiles", function () {
        // Filling in the uninstrumented files transpiles them with TypeScript
        this.timeout(60000);

        let project: string;
        const file = (rel: string) => path.join(project, rel).split(path.sep).join("/");

        before(() => {
            project = fs.mkdtempSync(path.join(os.tmpdir(), "tripwire-provider-"));
            fs.mkdirSync(path.join(project, "src"));
            fs.mkdirSync(path.join(project, "lib"));
            fs.writeFileSync(path.join(project, "src", "covered.ts"), "export const covered = 1;\n", "utf8");
            fs.writeFileSync(path.join(project, "src", "never.ts"), "export function never(): number { return 2; }\n", "utf8");
            fs.writeFileSync(path.join(project, "src", "types.ts"), "export interface IShape { size: number; }\n", "utf8");
            fs.writeFileSync(path.join(project, "src", "broken.ts"), "export const broken = 3;\n", "utf8");
            fs.writeFileSync(path.join(project, "src", "index.ts"), "export * from \"./covered\";\n", "utf8");
            fs.writeFileSync(path.join(project, "src", "spec.test.ts"), "export const t = 1;\n", "utf8");
            fs.writeFileSync(path.join(project, "lib", "other.ts"), "export const other = 4;\n", "utf8");
        });

        after(() => {
            fs.rmSync(project, { recursive: true, force: true });
        });

        function coverageFor(moduleId: string): CoverageEntry | null {
            const normalized = moduleId.split("\\").join("/");
            if (/types\.ts$/.test(normalized)) {
                return Object.assign(entry(normalized, 0), { all: true });
            }

            return entry(normalized, 2, 1);
        }

        it("adds a zero-coverage entry for every source file the run never loaded", () => {
            const instrumenter = recordingInstrumenter(coverageFor, /broken\.ts$/);
            const provider = new DefaultCoverageProvider(instrumenter, new DefaultCoverageFilter(), recordingReporter(), {});
            const loaded: CoverageData = {};
            loaded[file("src/covered.ts")] = entry(file("src/covered.ts"), 3);

            const filled = provider.fillUninstrumentedFiles(loaded, project);
            const keys = Object.keys(filled).map((k) => path.basename(k)).sort();

            assert.deepEqual(keys, [ "covered.ts", "never.ts", "types.ts" ], "index files, tests and files that fail to instrument are left out");
            assert.equal(Object.keys(filled[file("src/covered.ts")].statementMap).length, 3, "a loaded file keeps its own coverage");
            assert.isFalse(instrumenter.calls.some((c) => /covered\.ts$/.test(c.moduleId)), "a loaded file is not instrumented again");
        });

        it("reads the source patterns from the run options", () => {
            const provider = new DefaultCoverageProvider(recordingInstrumenter(coverageFor), new DefaultCoverageFilter(), recordingReporter(), { coverageSrc: [ "lib/**/*.ts" ] });

            assert.deepEqual(Object.keys(provider.fillUninstrumentedFiles({}, project)).map((k) => path.basename(k)), [ "other.ts" ]);
        });

        it("applies the erased coverage mode to files that compile away entirely", () => {
            function typesEntryFor(mode?: string): CoverageEntry | undefined {
                const provider = new DefaultCoverageProvider(recordingInstrumenter(coverageFor), new DefaultCoverageFilter(), recordingReporter(), mode ? { erasedCoverageMode: mode } : {});
                return provider.fillUninstrumentedFiles({}, project)[file("src/types.ts")];
            }

            assert.deepEqual(typesEntryFor().s, {}, "zero is the default: the empty file stays uncovered");
            assert.deepEqual(typesEntryFor("zero").s, {});
            assert.deepEqual(typesEntryFor("full").s, { 0: 1 }, "full counts it as covered");
            assert.isUndefined(typesEntryFor("ignore"), "ignore leaves it out of the report");
        });

        it("does not add files when the instrumenter cannot report a file's coverage", () => {
            const noLast: ICoverageInstrumenter = { instrument: (source) => source };
            const provider = new DefaultCoverageProvider(noLast, new DefaultCoverageFilter(), recordingReporter(), {});

            assert.deepEqual(provider.fillUninstrumentedFiles({}, project), {});
        });

        it("writes the filled and filtered coverage through the reporter", () => {
            const reporter = recordingReporter();
            const provider = new DefaultCoverageProvider(recordingInstrumenter(coverageFor), new DefaultCoverageFilter(), reporter, {});
            const loaded: CoverageData = {};
            loaded[file("src/covered.ts")] = entry(file("src/covered.ts"), 1, 1);
            loaded[file("src/spec.test.ts")] = entry(file("src/spec.test.ts"), 1, 1);

            provider.writeCoverage(loaded, project, "worker");

            assert.equal(reporter.writes.length, 1);
            assert.equal(reporter.writes[0].target, "worker");
            assert.equal(reporter.writes[0].cwd, project);
            const written = Object.keys(reporter.writes[0].coverage).map((k) => path.basename(k)).sort();
            assert.deepEqual(written, [ "broken.ts", "covered.ts", "never.ts", "types.ts" ], "the test file is filtered out");
        });

        it("writes nothing for missing coverage, and warns when nothing but tests is left", () => {
            const reporter = recordingReporter();
            const provider = new DefaultCoverageProvider(recordingInstrumenter(), new DefaultCoverageFilter(), reporter, { coverageSrc: [ "nothing/**/*.ts" ] });
            const onlyTests: CoverageData = {};
            onlyTests[file("src/spec.test.ts")] = entry(file("src/spec.test.ts"), 2);

            provider.writeCoverage(null, project, "browser");
            provider.writeCoverage("not coverage" as any, project, "browser");
            const warnings = captureWarnings(() => {
                provider.writeCoverage(onlyTests, project, "browser");
                provider.writeCoverage(onlyTests, project, "worker");
            });

            assert.equal(reporter.writes.length, 0);
            assert.deepEqual(warnings, [
                "No non-test coverage entries available for browser report.",
                "No non-test coverage entries available for worker report."
            ]);
        });
    });

    describe("createDefaultCoverageProvider", () => {
        it("assembles the provider from the run options", () => {
            const provider = createDefaultCoverageProvider("/proj", { coverageInstrumenter: " none ", coverageReporters: [ "lcov" ] });

            assert.ok(provider instanceof DefaultCoverageProvider);
            assert.ok(provider.filter instanceof DefaultCoverageFilter);
            assert.ok(provider.reporter instanceof NycCoverageReporter);
            assert.equal(provider.instrumenter.instrument("x", "/proj/a.js"), "x", "the instrumenter name is trimmed and 'none' disables it");
        });

        it("defaults to istanbul-lib-instrument", () => {
            const provider = createDefaultCoverageProvider(process.cwd(), null);

            assert.includes(provider.instrumenter.instrument("var a = 1;", path.join(process.cwd(), "src", "a.js")), "__coverage__");
        });
    });
});
