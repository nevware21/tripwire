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
import { _canIsolate, _isGlobalScopeFile, _resolveCheckRoots } from "../../../src/compile/tsCompile";

function _tempDir(name: string): string {
    const dir = path.join(os.tmpdir(), "tripwire-tscompile-test", name + "-" + process.pid + "-" + Math.random().toString(36).substring(2));
    fs.mkdirSync(dir, { recursive: true });

    return dir;
}

function _write(dir: string, name: string, text: string): string {
    const target = path.join(dir, name);
    fs.writeFileSync(target, text, "utf8");

    return target;
}

function _rm(dir: string): void {
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    } catch (e) {
        // Best effort -- a leftover temp directory is not worth failing a test over.
    }
}

describe("tsCompile helpers", () => {

    describe("_resolveCheckRoots", () => {
        let dir: string;
        let project: string[];
        let srcA: string;
        let matched: string;

        beforeEach(() => {
            // Real files on disk: _isGlobalScopeFile reads each project file to decide whether it
            // contributes global declarations, and deliberately keeps anything it cannot read.
            dir = _tempDir("roots");
            fs.mkdirSync(path.join(dir, "src"), { recursive: true });
            fs.mkdirSync(path.join(dir, "node"), { recursive: true });
            fs.mkdirSync(path.join(dir, "browser"), { recursive: true });

            srcA = _write(dir, path.join("src", "a.ts"), "export const a = 1;\n");
            const srcB = _write(dir, path.join("src", "b.ts"), "export const b = 2;\n");
            matched = _write(dir, path.join("node", "x.test.ts"), "export const x = 3;\n");
            const browser = _write(dir, path.join("browser", "y.test.ts"), "export const y = 4;\n");

            project = [ srcA, srcB, matched, browser ];
        });

        afterEach(() => {
            _rm(dir);
        });

        it("should use the whole project when the scope is not 'run'", () => {
            assert.deepEqual(_resolveCheckRoots(project, [ matched ], "project", true), project);
            assert.deepEqual(_resolveCheckRoots(project, [ matched ], undefined, true), project,
                "the default must stay the existing whole-project behaviour");
        });

        it("should use the whole project when the run matched nothing", () => {
            assert.deepEqual(_resolveCheckRoots(project, [], "run", true), project);
            assert.deepEqual(_resolveCheckRoots(project, undefined, "run", true), project);
        });

        it("should root at the matched files under the 'run' scope", () => {
            const roots = _resolveCheckRoots(project, [ matched ], "run", true);

            assert.deepEqual(roots, [ matched ],
                "the imports of that file are pulled in by the compiler; the unrelated browser suite is not");
        });

        it("should ignore matched files the project does not contain", () => {
            // These are what the scope reconciliation reports as unchecked -- quietly checking them
            // would turn a mistyped --project into a silent success.
            const roots = _resolveCheckRoots(project, [ matched, path.join(dir, "elsewhere", "z.test.ts") ], "run", true);

            assert.deepEqual(roots, [ matched ]);
        });

        it("should fall back to the project when no matched file is in it", () => {
            assert.deepEqual(_resolveCheckRoots(project, [ path.join(dir, "elsewhere", "z.test.ts") ], "run", true), project);
        });

        it("should not repeat a file the run matched twice", () => {
            assert.deepEqual(_resolveCheckRoots(project, [ matched, matched ], "run", true), [ matched ]);
        });

        it("should ignore non-TypeScript matches", () => {
            const script = _write(dir, path.join("node", "z.js"), "module.exports = {};\n");
            const roots = _resolveCheckRoots(project.concat([ script ]), [ script, matched ], "run", true);

            assert.deepEqual(roots, [ matched ]);
        });

        it("should match case-insensitively when the filesystem does", () => {
            const roots = _resolveCheckRoots(project, [ matched.toUpperCase() ], "run", false);

            assert.deepEqual(roots, [ matched ]);
        });

        it("should keep project files that declare globals even when nothing imports them", () => {
            const ambient = _write(dir, "ambientGlobals.ts", "export {};\ndeclare global {\n    function describe(name: string): void;\n}\n");
            const roots = _resolveCheckRoots(project.concat([ ambient ]), [ matched ], "run", true);

            assert.isTrue(roots.indexOf(matched) !== -1, "the matched file");
            assert.isTrue(roots.indexOf(ambient) !== -1, "the ambient globals file, which nothing imports");
            assert.isTrue(roots.indexOf(srcA) === -1, "an ordinary unreached module is still dropped");
        });

        it("should keep a project file it cannot read", () => {
            const missing = path.join(dir, "src", "gone.ts");
            const roots = _resolveCheckRoots(project.concat([ missing ]), [ matched ], "run", true);

            assert.isTrue(roots.indexOf(missing) !== -1,
                "unreadable is not the same as safe to drop -- keep it and let the compiler report");
        });
    });

    describe("_isGlobalScopeFile", () => {
        it("should treat any declaration file as global scope", () => {
            assert.isTrue(_isGlobalScopeFile("/p/src/types.d.ts"));
        });

        it("should detect declare global / module / namespace", () => {
            const dir = _tempDir("detect");
            try {
                assert.isTrue(_isGlobalScopeFile(_write(dir, "g.ts", "export {};\ndeclare global {\n    const x: number;\n}\n")));
                assert.isTrue(_isGlobalScopeFile(_write(dir, "m.ts", "declare module \"other\" {\n    const y: number;\n}\n")));
                assert.isTrue(_isGlobalScopeFile(_write(dir, "n.ts", "declare namespace Thing {\n    const z: number;\n}\n")));
                assert.isTrue(_isGlobalScopeFile(_write(dir, "r.ts", "/// <reference types=\"node\" />\nexport const a = 1;\n")));
            } finally {
                _rm(dir);
            }
        });

        it("should not treat an ordinary module as global scope", () => {
            const dir = _tempDir("ordinary");
            try {
                assert.isFalse(_isGlobalScopeFile(_write(dir, "p.ts", "export const value = 1;\n")));
                assert.isFalse(_isGlobalScopeFile(_write(dir, "q.ts", "export function declareGlobalish(): number {\n    return 1;\n}\n")));
            } finally {
                _rm(dir);
            }
        });

        it("should keep a file it cannot read", () => {
            // Unreadable is not the same as "safe to drop" -- keep it and let the compiler report.
            assert.isTrue(_isGlobalScopeFile(path.join(os.tmpdir(), "tripwire-does-not-exist-" + Math.random() + ".ts")));
        });
    });

    describe("_canIsolate", () => {
        it("should be off unless asked for", () => {
            assert.isFalse(_canIsolate({}, {}), "isolated emit cannot resolve an ambient const enum, so it is opt-in");
            assert.isFalse(_canIsolate({}, { isolatedTranspile: false }));
        });

        it("should be on when asked for", () => {
            assert.isTrue(_canIsolate({}, { isolatedTranspile: true }));
        });

        it("should refuse emitDecoratorMetadata even when asked for", () => {
            // The metadata *is* type information; there is nothing to derive it from per file.
            assert.isFalse(_canIsolate({ emitDecoratorMetadata: true }, { isolatedTranspile: true }));
        });
    });
});
