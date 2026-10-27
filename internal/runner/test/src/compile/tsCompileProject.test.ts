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
import { createRequire } from "module";
import { assert } from "@nevware21/tripwire";
import {
    compileTypeScript, getCompileCacheStatus, getProjectFileNames, invalidateTypeScriptProgramCache, loadTypescript,
    registerTypeScriptHook, setGraphTypeCheck, transpileTypeScriptSource, transpileTypeScriptSourceWithMap
} from "../../../src/compile/tsCompile";
import { getCompileProvider } from "../../../src/compile/provider";
import { _isUserError } from "../../../src/internal/userError";

const _require = createRequire(__filename);
const _PROJECT_PREFIX = path.join(os.tmpdir(), "tripwire-tsproject-");

const TS_CONFIG = { compilerOptions: { target: "es2018", module: "commonjs", lib: [ "es2018" ], types: [] as string[] } };

// A const enum is only inlined when the file is emitted from a program that also holds the enum's
// declaration, so it tells a program emit apart from a file transpiled on its own.
const ENUMS = "export const enum Color {\n    Red = 1,\n    Green = 2\n}\n";
const MAIN = "import { Color } from \"./enums\";\nexport const red: number = Color.Red;\n";
const TYPE_ERROR = "export const count: number = \"not a number\";\n";

function _configWith(extra: any): any {
    return { compilerOptions: TS_CONFIG.compilerOptions, ...extra };
}

function _caught(fn: () => any): any {
    try {
        fn();
    } catch (e) {
        return e;
    }

    return null;
}

function _hasText(text: string, value: string): boolean {
    return text.indexOf(value) !== -1;
}

function _filesUnder(dir: string, matcher: (name: string) => boolean): string[] {
    const found: string[] = [];
    if (fs.existsSync(dir)) {
        fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                found.push(..._filesUnder(full, matcher));
            } else if (matcher(entry.name)) {
                found.push(full);
            }
        });
    }

    return found;
}

/**
 * Compiling real, throwaway TypeScript projects: the transpile entry points the browser and worker module
 * graph uses, the project file list, the tsc check, and the node require hook with its compile cache.
 */
describe("tsCompile projects", function () {
    // Every case builds at least one TypeScript program, and one runs tsc in a child process
    this.timeout(120000);

    let projects: string[] = [];

    function makeProject(files: { [name: string]: string }, tsconfig?: any): string {
        const dir = fs.mkdtempSync(_PROJECT_PREFIX);

        // A node_modules folder keeps the compile cache inside the project, so it is removed with it
        fs.mkdirSync(path.join(dir, "node_modules"));
        if (tsconfig !== null) {
            fs.writeFileSync(path.join(dir, "tsconfig.json"), typeof tsconfig === "string" ? tsconfig : JSON.stringify(tsconfig || TS_CONFIG), "utf8");
        }

        Object.keys(files).forEach((name) => {
            const target = path.join(dir, name);
            fs.mkdirSync(path.dirname(target), { recursive: true });
            fs.writeFileSync(target, files[name], "utf8");
        });

        projects.push(dir);

        return dir;
    }

    afterEach(() => {
        setGraphTypeCheck(false);
        invalidateTypeScriptProgramCache();
        projects.forEach((dir) => {
            fs.rmSync(dir, { recursive: true, force: true });
        });
        projects = [];
    });

    describe("loadTypescript", () => {
        it("loads the compiler, falling back to the runner's own install", () => {
            const ts = loadTypescript(makeProject({}));

            assert.isFunction(ts.transpileModule);
            assert.isString(ts.version);
        });
    });

    describe("getProjectFileNames", () => {
        it("lists the project's files and keeps them until the program cache is invalidated", () => {
            const dir = makeProject({ "enums.ts": ENUMS, "main.ts": MAIN });
            const names = () => (getProjectFileNames("tsconfig.json", dir) || []).map((f) => path.basename(f)).sort();

            assert.deepEqual(names(), [ "enums.ts", "main.ts" ]);

            fs.writeFileSync(path.join(dir, "later.ts"), "export {};\n", "utf8");
            assert.deepEqual(names(), [ "enums.ts", "main.ts" ], "the cached list is kept");

            invalidateTypeScriptProgramCache();
            assert.deepEqual(names(), [ "enums.ts", "later.ts", "main.ts" ]);
        });

        it("returns null for a missing, unreadable or empty project", () => {
            assert.isNull(getProjectFileNames("missing.json", makeProject({})));
            assert.isNull(getProjectFileNames("tsconfig.json", makeProject({}, "{")));
            assert.isNull(getProjectFileNames("tsconfig.json", makeProject({}, _configWith({ include: [ "nothing/**" ] }))));
        });
    });

    describe("compileTypeScript", () => {
        it("type-checks a clean project with tsc", () => {
            const dir = makeProject({ "enums.ts": ENUMS, "main.ts": MAIN });

            compileTypeScript("tsconfig.json", dir);
        });

        it("reports a missing project file as a user error", () => {
            const dir = makeProject({});
            const failure = _caught(() => compileTypeScript("missing.json", dir));

            assert.isTrue(_isUserError(failure));
            assert.includes(failure.message, "TypeScript project file not found: " + path.join(dir, "missing.json"));
        });
    });

    describe("transpileTypeScriptSource", () => {
        it("emits from the nearest tsconfig's program, inlining const enums from other project files", () => {
            const dir = makeProject({ "enums.ts": ENUMS, "src/main.ts": MAIN.replace("./enums", "../enums") });

            const output = transpileTypeScriptSource(path.join(dir, "src", "main.ts"), "", dir);

            assert.includes(output, "1 /* Color.Red */");
            assert.isFalse(_hasText(output, "require("), "the const enum import is erased");
            assert.isFalse(_hasText(output, "sourceMappingURL"), "no source map is asked for");
        });

        it("uses an explicit project path relative to cwd", () => {
            const dir = makeProject({ "enums.ts": ENUMS, "main.ts": MAIN }, null);
            fs.mkdirSync(path.join(dir, "config"));
            fs.writeFileSync(path.join(dir, "config", "tsconfig.app.json"), JSON.stringify(_configWith({ files: [ "../enums.ts", "../main.ts" ] })), "utf8");

            assert.includes(transpileTypeScriptSource(path.join(dir, "main.ts"), "", dir, "config/tsconfig.app.json"), "1 /* Color.Red */");
        });

        it("keeps each file's emit until the program cache is invalidated", () => {
            const dir = makeProject({ "enums.ts": ENUMS, "main.ts": MAIN });
            const file = path.join(dir, "main.ts");

            const first = transpileTypeScriptSource(file, "", dir);
            fs.writeFileSync(file, "export const red: number = 7;\n", "utf8");

            assert.equal(transpileTypeScriptSource(file, "", dir), first, "the cached emit is returned");

            invalidateTypeScriptProgramCache();
            assert.includes(transpileTypeScriptSource(file, "", dir), "exports.red = 7");
        });

        it("adds a file the project does not include to its program, still inlining the project's const enums", () => {
            const dir = makeProject({ "enums.ts": ENUMS, "extra.ts": MAIN }, _configWith({ files: [ "enums.ts" ] }));

            assert.includes(transpileTypeScriptSource(path.join(dir, "extra.ts"), "", dir), "1 /* Color.Red */");
        });

        it("transpiles the given source on its own when the program has no such file", () => {
            const dir = makeProject({ "enums.ts": ENUMS });
            const file = path.join(dir, "notOnDisk.ts");

            const output = transpileTypeScriptSource(file, MAIN, dir);
            assert.includes(output, "require(\"./enums\")");
            assert.includes(output, "Color.Red");

            assert.equal(transpileTypeScriptSource(file, MAIN, dir), output, "the missing file is remembered, and the source transpiled again");
        });

        it("transpiles the given source on its own when the project is missing, broken or empty", () => {
            const check = (dir: string, projectPath?: string) => {
                const output = transpileTypeScriptSource(path.join(dir, "main.ts"), MAIN, dir, projectPath);
                assert.includes(output, "require(\"./enums\")", dir);
                assert.isFalse(_hasText(output, "sourceMappingURL"));
            };

            check(makeProject({ "enums.ts": ENUMS, "main.ts": MAIN }), "missing.json");
            check(makeProject({ "enums.ts": ENUMS, "main.ts": MAIN }, "{"));
            check(makeProject({ "enums.ts": ENUMS, "main.ts": MAIN }, _configWith({ include: [ "nothing/**" ] })));
        });

        it("transpiles the given source on its own when no tsconfig is found above the file", function () {
            const dir = makeProject({ "enums.ts": ENUMS, "main.ts": MAIN }, null);
            for (let current = dir; ; current = path.dirname(current)) {
                if (fs.existsSync(path.join(current, "tsconfig.json"))) {
                    // A tsconfig above the temp folder would be found instead
                    this.skip();
                }

                if (path.dirname(current) === current) {
                    break;
                }
            }

            assert.includes(transpileTypeScriptSource(path.join(dir, "main.ts"), MAIN, dir), "require(\"./enums\")");
        });
    });

    describe("transpileTypeScriptSourceWithMap", () => {
        function inlineMap(output: string): any {
            const parts = output.split("sourceMappingURL=data:application/json;base64,");
            assert.equal(parts.length, 2, "one inline source map");

            return JSON.parse(Buffer.from(parts[1].trim(), "base64").toString("utf8"));
        }

        it("embeds an inline source map holding the original source", () => {
            const dir = makeProject({ "enums.ts": ENUMS, "main.ts": MAIN });

            const output = transpileTypeScriptSourceWithMap(path.join(dir, "main.ts"), "", dir);

            assert.includes(output, "1 /* Color.Red */");
            assert.includes(inlineMap(output).sourcesContent[0], "Color.Red");
        });

        it("keeps a program of its own, apart from the one emitting without maps", () => {
            const dir = makeProject({ "enums.ts": ENUMS, "main.ts": MAIN });
            const file = path.join(dir, "main.ts");

            assert.isFalse(_hasText(transpileTypeScriptSource(file, "", dir), "sourceMappingURL"));
            assert.includes(transpileTypeScriptSourceWithMap(file, "", dir), "sourceMappingURL");
            assert.isFalse(_hasText(transpileTypeScriptSource(file, "", dir), "sourceMappingURL"));
        });

        it("embeds the map in the fallback transpile as well", () => {
            const dir = makeProject({ "enums.ts": ENUMS, "main.ts": MAIN });

            const output = transpileTypeScriptSourceWithMap(path.join(dir, "main.ts"), MAIN, dir, "missing.json");

            assert.includes(output, "require(\"./enums\")");
            assert.includes(inlineMap(output).sourcesContent[0], "Color.Red");
        });
    });

    describe("getCompileProvider", () => {
        it("shares one provider backed by the TypeScript compiler", () => {
            const provider = getCompileProvider();

            assert.equal(getCompileProvider(), provider);
            assert.equal(provider.compile, compileTypeScript);
            assert.equal(provider.registerHook, registerTypeScriptHook);
        });

        it("transpiles with a source map only when one is asked for", () => {
            const dir = makeProject({ "enums.ts": ENUMS, "main.ts": MAIN });
            const file = path.join(dir, "main.ts");

            assert.isFalse(_hasText(getCompileProvider().transpile(file, "", dir), "sourceMappingURL"));
            assert.includes(getCompileProvider().transpile(file, "", dir, true), "sourceMappingURL");
            assert.includes(getCompileProvider().transpile(file, MAIN, dir, true, "missing.json"), "require(\"./enums\")");
        });
    });

    describe("graph type-check", () => {
        it("checks the program it emits from, reporting a type error as a user error", () => {
            const dir = makeProject({ "enums.ts": ENUMS, "main.ts": MAIN, "bad.ts": TYPE_ERROR });
            setGraphTypeCheck(true);

            const failure = _caught(() => transpileTypeScriptSource(path.join(dir, "main.ts"), "", dir));

            assert.isTrue(_isUserError(failure));
            assert.includes(failure.message, "TypeScript compile failed with 1 error(s)");
            assert.includes(failure.message, "TS2322");
            assert.includes(failure.message, "bad.ts");
        });

        it("does not check when it is turned off", () => {
            const dir = makeProject({ "enums.ts": ENUMS, "main.ts": MAIN, "bad.ts": TYPE_ERROR });

            assert.includes(transpileTypeScriptSource(path.join(dir, "main.ts"), "", dir), "1 /* Color.Red */");
        });

        it("checks a rebuilt program again once the program cache is invalidated", () => {
            const dir = makeProject({ "enums.ts": ENUMS, "main.ts": MAIN });
            const file = path.join(dir, "main.ts");
            setGraphTypeCheck(true);

            assert.includes(transpileTypeScriptSource(file, "", dir), "1 /* Color.Red */");

            fs.writeFileSync(path.join(dir, "bad.ts"), TYPE_ERROR, "utf8");
            assert.includes(transpileTypeScriptSource(file, "", dir), "1 /* Color.Red */", "the checked program is reused");

            invalidateTypeScriptProgramCache();
            assert.includes(_caught(() => transpileTypeScriptSource(file, "", dir)).message, "TypeScript compile failed with 1 error(s)");
        });
    });

    describe("registerTypeScriptHook", () => {
        const extensions: any = (_require as any).extensions;

        // Installs the hook for one session, then restores the hook the runner itself loads .ts files
        // with. Re-assigning the earlier hook is also how nyc's require wrapper expects to be unwound.
        function session<T>(register: () => void, fn?: () => T): T {
            const savedTs = extensions[".ts"];
            const savedTsx = extensions[".tsx"];

            try {
                register();

                return fn ? fn() : undefined;
            } finally {
                extensions[".ts"] = savedTs;
                if (savedTsx === undefined) {
                    delete extensions[".tsx"];
                } else {
                    extensions[".tsx"] = savedTsx;
                }

                Object.keys(_require.cache).forEach((key) => {
                    if (key.indexOf(_PROJECT_PREFIX) === 0) {
                        delete _require.cache[key];
                    }
                });
            }
        }

        function hookSession<T>(dir: string, fn: () => T, checkDiagnostics?: boolean, overrides?: any, options?: any, projectPath?: string): T {
            return session(() => registerTypeScriptHook(projectPath || "tsconfig.json", dir, checkDiagnostics, overrides, options), fn);
        }

        function load(dir: string, name: string): any {
            return _require(path.join(dir, name));
        }

        it("compiles required .ts and .tsx files through the project's program", () => {
            const dir = makeProject({ "enums.ts": ENUMS, "main.ts": MAIN, "view.tsx": "export const kind: string = \"tsx\";\n" });

            hookSession(dir, () => {
                assert.equal(load(dir, "main.ts").red, 1);
                assert.equal(load(dir, "view.tsx").kind, "tsx");
                assert.isUndefined(_require.cache[path.join(dir, "enums.ts")], "the const enum import was erased");
            });

            assert.deepEqual(getCompileCacheStatus(), { state: "rebuilt", checkSkipped: false, reason: "nothing cached for this project yet" });
        });

        it("reuses the cached compile while nothing changes, and rebuilds when a file does", () => {
            const dir = makeProject({ "enums.ts": ENUMS, "main.ts": MAIN });

            hookSession(dir, () => load(dir, "main.ts"));

            hookSession(dir, () => {
                assert.deepEqual(getCompileCacheStatus(), { state: "reused", checkSkipped: false, reason: "" });
                assert.equal(load(dir, "main.ts").red, 1, "loaded from the emit cache");
            });

            fs.writeFileSync(path.join(dir, "enums.ts"), ENUMS.replace("Red = 1", "Red = 5"), "utf8");
            hookSession(dir, () => {
                const status = getCompileCacheStatus();
                assert.equal(status.state, "rebuilt");
                assert.includes(status.reason, "enums.ts changed");
                assert.equal(load(dir, "main.ts").red, 5);
            });
        });

        it("type-checks the project first when asked, reporting a type error as a user error", () => {
            const dir = makeProject({ "enums.ts": ENUMS, "main.ts": MAIN, "bad.ts": TYPE_ERROR });

            const failure = _caught(() => hookSession(dir, () => null, true));

            assert.isTrue(_isUserError(failure));
            assert.includes(failure.message, "TypeScript compile failed with 1 error(s)");
            hookSession(dir, () => assert.equal(load(dir, "main.ts").red, 1), false);
        });

        it("checks only the files the run reaches under the run scope", () => {
            const dir = makeProject({ "enums.ts": ENUMS, "main.ts": MAIN, "bad.ts": TYPE_ERROR });
            const scoped = { typeCheckScope: "run", scopeFiles: [ path.join(dir, "main.ts") ] };

            hookSession(dir, () => assert.equal(load(dir, "main.ts").red, 1), true, undefined, scoped);
            assert.isNotNull(_caught(() => hookSession(dir, () => null, true)), "the whole project still fails");
        });

        it("skips the type-check when the cached compile was already checked", () => {
            const dir = makeProject({ "enums.ts": ENUMS, "main.ts": MAIN });

            hookSession(dir, () => load(dir, "main.ts"), false);

            hookSession(dir, () => load(dir, "main.ts"), true);
            assert.deepEqual(getCompileCacheStatus(), { state: "reused", checkSkipped: false, reason: "the cached compile came from a run that did not type-check" });

            hookSession(dir, () => load(dir, "main.ts"), true);
            assert.deepEqual(getCompileCacheStatus(), { state: "reused", checkSkipped: true, reason: "" });
        });

        it("applies the tsconfig overrides", () => {
            const dir = makeProject({ "loose.ts": "export function echo(value) {\n    return value;\n}\n" });

            hookSession(dir, () => assert.equal(load(dir, "loose.ts").echo(3), 3), true);

            const failure = _caught(() => hookSession(dir, () => null, true, { noImplicitAny: true }));
            assert.includes(failure.message, "TS7006");
        });

        it("keeps incremental build info for a checked run, even when the check fails", () => {
            const dir = makeProject({ "enums.ts": ENUMS, "main.ts": MAIN });
            const buildInfo = () => _filesUnder(path.join(dir, "node_modules"), (name) => /\.tsbuildinfo$/.test(name));

            hookSession(dir, () => assert.equal(load(dir, "main.ts").red, 1), true, undefined, { incremental: true });
            assert.equal(buildInfo().length, 1);
            const emitted = _filesUnder(dir, (name) => /\.js$/.test(name)).filter((file) => file.indexOf(path.join(dir, "node_modules")) !== 0);
            assert.equal(emitted.length, 0, "no .js is written next to the sources");

            fs.writeFileSync(path.join(dir, "bad.ts"), TYPE_ERROR, "utf8");
            const failure = _caught(() => hookSession(dir, () => null, true, undefined, { incremental: true }));
            assert.includes(failure.message, "TypeScript compile failed with 1 error(s)");
            assert.equal(buildInfo().length, 2, "the new root set keeps its own state");
        });

        it("transpiles each file on its own when isolated, reusing the emit cache", () => {
            const dir = makeProject({ "enums.ts": ENUMS, "main.ts": MAIN });

            hookSession(dir, () => {
                assert.equal(load(dir, "main.ts").red, 1);
                assert.isObject(_require.cache[path.join(dir, "enums.ts")], "the preserved enum is required at runtime");
            }, false, undefined, { isolatedTranspile: true });

            const status = getCompileCacheStatus();
            assert.equal(status.state, "isolated");
            assert.includes(status.reason, "each file is compiled on its own");

            const cached = _filesUnder(path.join(dir, "node_modules"), () => true).length;
            assert.isAbove(cached, 0, "the emitted files are cached");

            hookSession(dir, () => assert.equal(load(dir, "main.ts").red, 1), false, undefined, { isolatedTranspile: true });
            assert.equal(_filesUnder(path.join(dir, "node_modules"), () => true).length, cached, "the second run only reads the cache");
        });

        it("runs without the compile cache when it is turned off", () => {
            const dir = makeProject({ "enums.ts": ENUMS, "main.ts": MAIN });

            hookSession(dir, () => assert.equal(load(dir, "main.ts").red, 1), false, undefined, { emitCache: false });

            assert.deepEqual(getCompileCacheStatus(), { state: "off", checkSkipped: false, reason: "the compile cache is disabled" });
            assert.equal(_filesUnder(path.join(dir, "node_modules"), () => true).length, 0);
        });

        it("adds a required file the project does not include to its program", () => {
            const dir = makeProject({ "enums.ts": ENUMS, "main.ts": MAIN, "extra.ts": MAIN.replace("red", "extra") }, _configWith({ files: [ "enums.ts", "main.ts" ] }));

            hookSession(dir, () => {
                assert.equal(load(dir, "main.ts").red, 1);
                assert.equal(load(dir, "extra.ts").extra, 1);
            });

            hookSession(dir, () => assert.equal(load(dir, "extra.ts").extra, 1));
            assert.equal(getCompileCacheStatus().state, "reused", "the added file was recorded with the program");
        });

        it("transpiles a file on its own when the program will not emit it", () => {
            const dir = makeProject({
                "enums.ts": ENUMS,
                "loose.ts": "const count: number = \"text\";\nexport const value = count;\n"
            }, _configWith({ compilerOptions: { ...TS_CONFIG.compilerOptions, noEmitOnError: true } }));

            hookSession(dir, () => assert.equal(load(dir, "loose.ts").value, "text"));
        });

        it("compiles with its default options when the project file is missing or broken", () => {
            const missing = makeProject({ "enums.ts": ENUMS, "main.ts": MAIN }, null);
            const broken = makeProject({ "enums.ts": ENUMS, "main.ts": MAIN }, "{");

            hookSession(missing, () => assert.equal(load(missing, "main.ts").red, 1));
            hookSession(broken, () => assert.equal(load(broken, "main.ts").red, 1));
        });
    });
});
