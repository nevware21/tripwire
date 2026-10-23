/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import * as fs from "fs";
import * as path from "path";
import { spawnSync } from "child_process";
import { createRequire } from "module";
import { arrForEach, objAssign } from "@nevware21/ts-utils";
import { ICompileHookOptions } from "@nevware21/tripwire";
import { _markUserError, _userError } from "../internal/userError";
import {
    buildInfoPath, checkProgramManifest, createProgramManifest, emitCacheKey, getCacheDir, hashText, IProgramManifest, pruneEmitCache,
    lockSignatures, optionsFingerprint, readEmitCache, readProgramManifest, writeEmitCache, writeProgramManifest
} from "./cacheStore";

const _nativeRequire = createRequire(__filename);
const _nodeModule = _nativeRequire("module");

function _getExtensionRegistry(): any {
    return (_nativeRequire as any).extensions || (_nodeModule && (_nodeModule as any)._extensions) || null;
}

function _getTypeScriptLookupPaths(cwd: string): string[] {
    const candidates = [
        cwd,
        path.resolve(cwd, "node_modules"),
        path.resolve(cwd, "../node_modules"),
        path.resolve(cwd, "common/temp/node_modules"),
        path.resolve(cwd, "../common/temp/node_modules"),
        __dirname,
        path.resolve(__dirname, "../node_modules"),
        path.resolve(__dirname, "../../node_modules"),
        path.resolve(__dirname, "../../common/temp/node_modules"),
        path.resolve(__dirname, "../../../common/temp/node_modules")
    ];

    const seen: { [key: string]: boolean } = {};
    const paths: string[] = [];
    arrForEach(candidates, (candidate) => {
        const normalized = path.resolve(candidate);
        if (!seen[normalized]) {
            seen[normalized] = true;
            paths.push(normalized);
        }
    });

    return paths;
}

function _resolveTypeScriptModule(request: string, cwd: string): string | null {
    const lookupPaths = _getTypeScriptLookupPaths(cwd);
    for (let lp = 0; lp < lookupPaths.length; lp++) {
        try {
            return _nativeRequire.resolve(request, {
                paths: [lookupPaths[lp]]
            });
        } catch (e) {
            // Try next lookup path.
        }
    }

    try {
        return _nativeRequire.resolve(request);
    } catch (e) {
        return null;
    }
}

/**
 * The compile provider's `compile` entry (see `ICompileProvider.compile`): a standalone
 * `tsc --noEmit` pass over the project, in a child process.
 *
 * The CLI itself no longer calls this. `--type-check` is answered by `registerTypeScriptHook`,
 * which checks the same `ts.Program` it has to build to emit from, and the browser/worker graph
 * by `setGraphTypeCheck`; both avoid the second parse and the process spawn this costs. It is kept
 * because it is part of the published provider contract, and a custom provider may still want a
 * whole-project check that is independent of any emit.
 */
export function compileTypeScript(projectPath: string, cwd: string): void {
    const tscPath = _resolveTypeScriptModule("typescript/bin/tsc", cwd);
    if (!tscPath) {
        throw _userError("TypeScript compiler not found from '" + cwd + "'. Install 'typescript' in the target project.", [
            "npm install --save-dev typescript",
            "Or pass --transpile-only to skip TypeScript compilation entirely."
        ]);
    }

    const fullProjectPath = path.resolve(cwd, projectPath);
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    if (!fs.existsSync(fullProjectPath)) {
        throw _userError("TypeScript project file not found: " + fullProjectPath, [
            "Pass the right project with --project <tsconfig.json> (alias -p).",
            "The default is ./tsconfig.json, relative to the directory tripwire was run from."
        ]);
    }

    const result = spawnSync(process.execPath, [tscPath, "-p", fullProjectPath, "--noEmit"], {
        cwd,
        stdio: "inherit"
    });

    if (result.status !== 0) {
        throw _userError("TypeScript compile failed with exit code " + result.status + ".");
    }
}

export function loadTypescript(cwd: string): any {
    const tsPath = _resolveTypeScriptModule("typescript", cwd);
    if (!tsPath) {
        throw _userError("TypeScript runtime not found from '" + cwd + "'. Install 'typescript' in the target project.", [
            "npm install --save-dev typescript",
            "Or pass --transpile-only to skip TypeScript compilation entirely."
        ]);
    }

    return _nativeRequire(tsPath);
}

/**
 * The absolute file list a tsconfig actually resolves to -- ie. exactly the set `--type-check`
 * checks, which is *not* necessarily the set the run is about to execute.
 *
 * Populated as a side effect of {@link registerTypeScriptHook} (which has to parse the project
 * anyway) and otherwise computed on demand. Keyed by resolved project path; cleared alongside
 * the Program cache, since a file appearing or disappearing changes both.
 */
const _projectFileNamesCache: { [configPath: string]: string[] } = {};

/**
 * Returns the files the TypeScript project at `projectPath` resolves to, so a caller can tell
 * whether the files it is about to run are among them.
 *
 * `--type-check` checks the *project*; the run executes whatever the glob matched. When those
 * two sets drift apart, the type-check passes over files that are never executed and stays
 * silent about files that are -- reporting green having checked nothing that ran. Comparing the
 * two needs this list.
 *
 * @param projectPath - Path to the tsconfig, relative to `cwd` or absolute.
 * @param cwd - The current working directory.
 * @returns The resolved absolute file names, or `null` if the project is missing or unreadable
 * (in which case the caller has nothing to compare against and should stay quiet).
 */
export function getProjectFileNames(projectPath: string, cwd: string): string[] | null {
    const fullProjectPath = path.resolve(cwd, projectPath);
    if (_projectFileNamesCache[fullProjectPath]) {
        return _projectFileNamesCache[fullProjectPath];
    }

    // eslint-disable-next-line security/detect-non-literal-fs-filename
    if (!fs.existsSync(fullProjectPath)) {
        return null;
    }

    const ts = loadTypescript(cwd);
    const loadedConfig = ts.readConfigFile(fullProjectPath, ts.sys.readFile);
    if (loadedConfig.error) {
        return null;
    }

    const parsed = ts.parseJsonConfigFileContent(loadedConfig.config, ts.sys, path.dirname(fullProjectPath));
    if (!parsed || (parsed.errors && parsed.errors.length)) {
        return null;
    }

    const fileNames = (parsed.fileNames || []).slice(0);
    _projectFileNamesCache[fullProjectPath] = fileNames;

    return fileNames;
}

function _findNearestTsConfig(filePath: string): string | null {
    let current = path.dirname(path.resolve(filePath));

    // eslint-disable-next-line no-constant-condition
    while (true) {
        const candidate = path.join(current, "tsconfig.json");
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        if (fs.existsSync(candidate)) {
            return candidate;
        }

        const parent = path.dirname(current);
        if (parent === current) {
            break;
        }

        current = parent;
    }

    return null;
}

function _normCasePath(filePath: string, caseSensitive: boolean): string {
    const normalized = filePath.replace(/\\/g, "/");
    return caseSensitive ? normalized : normalized.toLowerCase();
}

/**
 * Per-process cache of TypeScript programs keyed by "<configPath>:<includeSourceMap>".
 * Creating a TypeScript program is expensive (it parses all project files). By caching the
 * program we pay that cost once per unique tsconfig per process run and reuse the same
 * program for every subsequent file in the module graph — mirroring the approach used by
 * registerTypeScriptHook for the Node.js require path.
 */
const _tsProgCache: {
    [key: string]: {
        program: any;
        ts: any;
        compilerOptions: any;
        fileNames: string[];
        emittedCache: { [fileKey: string]: string };
        useCaseSensitiveFileNames: boolean;
    }
} = {};

/**
 * Whether the browser/worker module-graph path should report type errors, and the set of
 * Program cache keys already checked.
 *
 * The graph path reaches TypeScript through `transpileTypeScriptSourceWithMap`, several
 * layers below the CLI, and the compile provider's `transpile()` signature is a published
 * seam -- so the flag is set once by the caller rather than threaded through as an extra
 * parameter, the same shape `--debug-stack` uses for `_setDebugStack`.
 *
 * `_checkedPrograms` is what keeps this a *single* pass: diagnostics run once per Program,
 * at the moment that Program is created, and every later per-file emit reuses it. Cleared
 * with the Program cache, since a new Program is a new thing to check.
 */
let _graphTypeCheck = false;
const _checkedPrograms: { [cacheKey: string]: boolean } = {};

/**
 * What the compile cache did on the last {@link registerTypeScriptHook} call, so the CLI can say so.
 * @since 0.2.0
 */
export interface ICompileCacheStatus {
    /**
     * `"reused"` when nothing had changed and the previous run's compiled output was used;
     * `"rebuilt"` when it had to compile; `"isolated"` when each file is compiled on its own and
     * cached by its own text, so whether it is reused is decided per file as each one loads;
     * `"off"` when caching was disabled or does not apply.
     */
    state: "reused" | "rebuilt" | "isolated" | "off";

    /**
     * Whether this run's type-check was answered from the cache rather than run again.
     */
    checkSkipped: boolean;

    /**
     * Why it rebuilt, or why caching does not apply. Empty when it was reused.
     */
    reason: string;
}

let _cacheStatus: ICompileCacheStatus = { state: "off", checkSkipped: false, reason: "" };

/**
 * What the compile cache did on the last hook registration. Reset by each registration, so a caller
 * reads it after registering and before anything else registers.
 * @since 0.2.0
 */
export function getCompileCacheStatus(): ICompileCacheStatus {
    return _cacheStatus;
}

/**
 * Enables or disables type-error reporting for the browser/worker module-graph transpile.
 *
 * Off by default, matching `--transpile-only`. The node target does not use this -- it gets
 * its diagnostics from `registerTypeScriptHook`'s `checkDiagnostics` argument instead.
 * @since 0.2.0
 */
export function setGraphTypeCheck(enabled: boolean): void {
    _graphTypeCheck = !!enabled;
}

/**
 * Discards every cached `ts.Program` (and the per-file emit output cached alongside it -- see
 * `_getOrCreateTsProgramEntry`'s doc comment). A `ts.Program` is an immutable snapshot of every
 * project file's parsed content *as of the moment it was created* -- nothing about `ts.Program`
 * or the cache above is "live" against later disk changes, so a rebuild that only clears
 * `entry.emittedCache[fileKey]` (without discarding `entry.program` itself) would still re-emit
 * from the *same stale parsed AST*, producing byte-identical output regardless of what actually
 * changed on disk. Callers that know a rebuild is genuinely needed (the browser/worker module
 * graph walk, on every call -- see `_createBrowserWorkerModuleGraph` in execute.ts) call this
 * first so the next file this process transpiles forces a fresh `ts.createProgram(...)` (and
 * therefore a fresh `ts.sys.readFile` of every project file) rather than serving whatever was
 * cached from a potentially much earlier build in the same long-lived `--watch` process.
 */
export function invalidateTypeScriptProgramCache(): void {
    Object.keys(_tsProgCache).forEach((key) => {
        delete _tsProgCache[key];
    });

    // The resolved project file list is a snapshot of the same on-disk state -- a test file
    // created since the last build changes what the tsconfig's `include` expands to, so it goes
    // stale for exactly the same reasons and has to be dropped with it.
    Object.keys(_projectFileNamesCache).forEach((key) => {
        delete _projectFileNamesCache[key];
    });

    // A discarded Program has not been checked -- the replacement is a fresh snapshot of
    // whatever is on disk now, which is precisely the state a --watch rebuild needs checked
    // again. Leaving these set would make every iteration after the first silently skip the
    // type-check.
    Object.keys(_checkedPrograms).forEach((key) => {
        delete _checkedPrograms[key];
    });
}

function _getOrCreateTsProgramEntry(ts: any, configPath: string, includeSourceMap: boolean, cwd?: string): typeof _tsProgCache[string] | null {
    const cacheKey = configPath + ":" + (includeSourceMap ? "1" : "0");
    if (_tsProgCache[cacheKey]) {
        return _tsProgCache[cacheKey];
    }

    const loadedConfig = ts.readConfigFile(configPath, ts.sys.readFile);
    if (loadedConfig.error) {
        return null;
    }

    const parsed = ts.parseJsonConfigFileContent(loadedConfig.config, ts.sys, path.dirname(configPath));
    if (!parsed || (parsed.errors && parsed.errors.length)) {
        return null;
    }

    if (!ts.createProgram) {
        return null;
    }

    const compilerOptions: any = objAssign({}, parsed.options || {}, {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2018,
        esModuleInterop: true,
        noEmit: false,
        emitDeclarationOnly: false,
        declaration: false,
        // Setting both sourceMap and inlineSourceMap simultaneously causes TypeScript to only
        // call the write callback for the .map file (never the .js), so outputText stays null.
        // Use inlineSourceMap exclusively when source maps are needed.
        // inlineSources embeds the actual source text (base64) directly in the map, so the
        // browser/worker runner (the only consumer of includeSourceMap=true, cached under a
        // separate Program entry -- see the cache key above) doesn't need a second network
        // fetch to show "authored" source in DevTools; module scripts are now served at URLs
        // that mirror the real project layout, so a separate fetchable "original source" URL
        // can't be assumed to exist at all. Left off for includeSourceMap=false (Node target
        // and other consumers), which never reaches this branch.
        sourceMap: false,
        inlineSourceMap: !!includeSourceMap,
        inlineSources: !!includeSourceMap,
        preserveConstEnums: false
    });

    const useCaseSensitiveFileNames = !!(ts.sys && ts.sys.useCaseSensitiveFileNames);
    const fileNames: string[] = (parsed.fileNames || []).slice(0);
    const program = ts.createProgram(fileNames, compilerOptions);
    const emittedCache: { [fileKey: string]: string } = {};

    // Deliberately no bulk `program.emit(undefined, ...)` here -- the caller (the browser/
    // worker module graph walk) only ever asks for files actually reachable from a specific
    // target's entry points, which is consistently a real subset of this tsconfig's full
    // `include` scope (eg. this project's own test/tsconfig.test.json covers node+browser+
    // worker test dirs combined, but any single target run only reaches its own). Emitting
    // everything up front paid for type-checking files that were never going to be requested;
    // per-file emit on demand (see `_emitTypeScriptWithProgram` below, which reuses this same
    // Program instance and its `emittedCache`) measurably wins in that scenario. `createProgram`
    // above still does the shared, one-time parse/bind of the whole project either way.
    // Single pass, and the whole of TYPECHECK-TARGETS' fix. This Program is the one the graph
    // walk is about to emit from -- checking it here costs the checker walk and nothing else:
    // no second `createProgram`, no `tsc` child process, and no second parse. It runs before
    // the entry is cached so a failing check cannot leave a half-registered program behind,
    // and `_checkedPrograms` stops a rebuilt Program being re-checked needlessly.
    if (_graphTypeCheck && !_checkedPrograms[cacheKey]) {
        _checkedPrograms[cacheKey] = true;
        _throwOnProgramErrors(ts, program, cwd || path.dirname(configPath));
    }

    const entry = {
        program,
        ts,
        compilerOptions,
        fileNames,
        emittedCache,
        useCaseSensitiveFileNames
    };
    _tsProgCache[cacheKey] = entry;
    return entry;
}

function _emitTypeScriptWithProgram(filePath: string, cwd: string, includeSourceMap: boolean, projectPath?: string): string | null {
    const ts = loadTypescript(cwd);
    const fullFilePath = path.resolve(filePath);
    const configPath = projectPath ? path.resolve(cwd, projectPath) : _findNearestTsConfig(fullFilePath);

    if (!configPath) {
        return null;
    }

    // eslint-disable-next-line security/detect-non-literal-fs-filename
    if (!fs.existsSync(configPath)) {
        return null;
    }

    const entry = _getOrCreateTsProgramEntry(ts, configPath, includeSourceMap, cwd);
    if (!entry) {
        return null;
    }

    const fileKey = _normCasePath(fullFilePath, entry.useCaseSensitiveFileNames);

    // Return cached emission if available (each file is only compiled once per program).
    if (entry.emittedCache[fileKey] !== undefined) {
        return entry.emittedCache[fileKey] || null;
    }

    let program = entry.program;
    let sourceFile = program.getSourceFile(fullFilePath) || program.getSourceFile(filePath);

    // If the file isn't already included in the configured project (e.g. out-of-project files
    // such as test helpers), recreate the program with the extra file added so that const enum
    // values from the project dependencies are still resolved and inlined.
    if (!sourceFile) {
        const normalizedFull = _normCasePath(fullFilePath, entry.useCaseSensitiveFileNames);
        const rootNames = entry.fileNames.slice(0);
        let found = false;
        for (let lp = 0; lp < rootNames.length; lp++) {
            if (_normCasePath(rootNames[lp], entry.useCaseSensitiveFileNames) === normalizedFull) {
                found = true;
                break;
            }
        }
        if (!found) {
            rootNames.push(fullFilePath);
        }

        entry.program = ts.createProgram(rootNames, entry.compilerOptions);
        entry.fileNames = rootNames;
        program = entry.program;
        sourceFile = program.getSourceFile(fullFilePath) || program.getSourceFile(filePath);
    }

    if (!sourceFile) {
        entry.emittedCache[fileKey] = "";
        return null;
    }

    let outputText: string | null = null;
    const normalizedSourceFile = _normCasePath(path.resolve(sourceFile.fileName), entry.useCaseSensitiveFileNames);

    program.emit(sourceFile, (fileName: string, text: string, _bom?: boolean, _onError?: (message: string) => void, sourceFiles?: any[]) => {
        if (!/\.js$/i.test(fileName)) {
            return;
        }

        if (sourceFiles && sourceFiles.length) {
            for (let lp = 0; lp < sourceFiles.length; lp++) {
                if (_normCasePath(path.resolve(sourceFiles[lp].fileName), entry.useCaseSensitiveFileNames) === normalizedSourceFile) {
                    outputText = text;
                    return;
                }
            }
            return;
        }

        if (outputText === null) {
            outputText = text;
        }
    }, undefined, false);

    entry.emittedCache[fileKey] = outputText || "";
    return outputText;
}

/**
 * Formats and throws if `program` has any error-level pre-emit diagnostics. Used in place of
 * spawning a separate `tsc --noEmit` child process (see `compileTypeScript` above) to validate
 * a project: that approach re-parses and re-checks the *entire* project a second time, in a
 * brand new Node process, duplicating work `registerTypeScriptHook` already has to do to build
 * the Program it uses for emission. Checking diagnostics directly against that same Program
 * gets the same "fail the run on type errors" behavior for roughly half the cost.
 */
function _throwOnProgramErrors(ts: any, program: any, cwd: string): void {
    _throwOnDiagnostics(ts, ts.getPreEmitDiagnostics(program), cwd);
}

/**
 * Formats and throws if `diagnostics` contains anything error-level. Shared by the whole-program
 * check above and the incremental builder check below, which collect their diagnostics differently
 * but report them identically.
 */
function _throwOnDiagnostics(ts: any, diagnostics: any[], cwd: string): void {
    const errors = (diagnostics || []).filter((d: any) => d.category === ts.DiagnosticCategory.Error);
    if (!errors.length) {
        return;
    }

    const host = {
        getCurrentDirectory: () => cwd,
        getCanonicalFileName: (f: string) => f,
        getNewLine: () => (ts.sys && ts.sys.newLine) || "\n"
    };

    const formatted = ts.formatDiagnosticsWithColorAndContext
        ? ts.formatDiagnosticsWithColorAndContext(errors, host)
        : ts.formatDiagnostics(errors, host);

    // A type error in the user's own code, fully described by the formatted diagnostic above --
    // a runner stack trace on top of it adds nothing but noise.
    throw _markUserError(new Error("TypeScript compile failed with " + errors.length + " error(s):\n" + formatted));
}

/**
 * Every diagnostic an incremental builder can produce, in the order `tsc` itself reports them.
 *
 * `getSemanticDiagnostics()` is the reason this exists: on a builder it walks only the files the
 * `.tsbuildinfo` says are *affected* by what changed since the last run and reuses the recorded
 * result for everything else, which is the whole point of the incremental path. Asking the
 * underlying `Program` for the same thing (as `ts.getPreEmitDiagnostics` does) would re-check the
 * lot and throw the saved state away.
 */
function _builderDiagnostics(builder: any): any[] {
    let diagnostics: any[] = [];

    if (builder.getConfigFileParsingDiagnostics) {
        diagnostics = diagnostics.concat(builder.getConfigFileParsingDiagnostics() || []);
    }

    return diagnostics
        .concat(builder.getOptionsDiagnostics() || [])
        .concat(builder.getGlobalDiagnostics() || [])
        .concat(builder.getSyntacticDiagnostics() || [])
        .concat(builder.getSemanticDiagnostics() || []);
}

/**
 * Creates the incremental builder used to type-check `rootNames`, or `null` when this TypeScript
 * cannot provide one (or has nowhere to keep its state), leaving the caller to fall back to a plain
 * `ts.createProgram`.
 *
 * The builder is *not* created with `noEmit` -- the program it wraps is the one the require hook
 * goes on to emit each required file from (see the note inside) -- but its host is wrapped so that
 * nothing except the `.tsbuildinfo` can reach the disk: a checking program writing `.js` files
 * next to someone's sources would be a surprising thing for a test runner to do. The caller,
 * `_createCheckedProgram`, takes `builder.getProgram()` as the emitting program.
 */
function _createIncrementalChecker(ts: any, rootNames: string[], compilerOptions: any, infoPath: string): any {
    try {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        fs.mkdirSync(path.dirname(infoPath), { recursive: true });

        // Deliberately *not* `noEmit`: the program this builder wraps is the same one the require
        // hook goes on to emit each required file from. Building a separate emitting program instead
        // (even one handed this one as its `oldProgram`) measured slower overall than no incremental
        // state at all -- the second program starts with a cold checker, so the per-file emit pays
        // again for binding work the check had already done.
        const options: any = objAssign({}, compilerOptions, {
            incremental: true,
            tsBuildInfoFile: infoPath
        });

        const host = ts.createIncrementalCompilerHost(options);
        const orgWriteFile = host.writeFile;
        host.writeFile = function (fileName: string, text: string, writeBom?: boolean, onError?: any, sourceFiles?: any) {
            // Only the build info may reach disk. A test runner emitting `.js` files next to
            // someone's sources would be a surprising thing to do, and the require hook takes its
            // output from an in-memory emit callback rather than from disk anyway.
            if (/\.tsbuildinfo$/i.test(fileName)) {
                orgWriteFile.call(host, fileName, text, writeBom, onError, sourceFiles);
            }
        };

        return ts.createIncrementalProgram({
            rootNames: rootNames,
            options: options,
            host: host
        });
    } catch (e) {
        return null;
    }
}

/**
 * Builds the program the require hook emits from, having first type-checked it.
 *
 * With `useIncremental` (`--incremental`, off by default) the check runs against an incremental builder whose state is
 * kept in the cache directory, so a repeated run only re-checks the files that actually changed --
 * the first run pays the full cost, later ones approach the cost of emitting alone. The emitting
 * program is then created from the builder's, which lets TypeScript reuse every parsed source file
 * rather than reading and parsing the project a second time.
 *
 * Any failure of the incremental path (an old TypeScript, no writable cache directory, a corrupt
 * `.tsbuildinfo`) falls back to the plain whole-program check, so the only thing that can be lost is
 * the speed-up. A type error is not such a failure -- it is thrown, exactly as before.
 */
function _createCheckedProgram(ts: any, rootNames: string[], compilerOptions: any, cwd: string, projectPath: string, useIncremental: boolean): any {
    if (useIncremental && ts.createIncrementalProgram && ts.createIncrementalCompilerHost) {
        // The root set is part of the key: a run-scoped check (see _resolveCheckRoots) and a
        // whole-project one describe different work, and sharing one state file between them would
        // have each invalidating the other's on every alternation.
        const fingerprint = optionsFingerprint(ts.version, compilerOptions) + hashText(rootNames.join("\n")).substring(0, 16);
        const infoPath = buildInfoPath(getCacheDir(cwd), projectPath, fingerprint);

        if (infoPath) {
            const builder = _createIncrementalChecker(ts, rootNames, compilerOptions, infoPath);
            if (builder) {
                const diagnostics = _builderDiagnostics(builder);

                // Persisted before the throw below, so a run that fails to compile still leaves the
                // next one with usable state -- the common "fix the error and run again" loop.
                // `emitOnlyDtsFiles` keeps this to what it is for: the project does not emit
                // declarations, so nothing is produced but the build info itself.
                try {
                    builder.emit(undefined, undefined, undefined, true);
                } catch (e) {
                    // The state could not be saved; the next run simply starts from scratch.
                }

                _throwOnDiagnostics(ts, diagnostics, cwd);

                return builder.getProgram();
            }
        }
    }

    const program = ts.createProgram(rootNames, compilerOptions);
    _throwOnProgramErrors(ts, program, cwd);

    return program;
}

/**
 * Whether a project file contributes declarations to the *global* scope, and so has to stay in the
 * program even when nothing imports it.
 *
 * A `.d.ts` always qualifies. Beyond that this is a text match rather than a parse, deliberately: it
 * runs over every file in the project and only has to be conservative in the right direction -- a
 * false positive keeps a file that did not need keeping (correct, just not as fast), while a false
 * negative would silently remove a declaration the run depends on. This project's own
 * `ambientGlobals.ts` is exactly the case: an ordinary module, imported by nothing, whose
 * `declare global` block is the only thing that makes `describe` and `it` exist for every test file.
 */
export function _isGlobalScopeFile(fileName: string): boolean {
    if (/\.d\.tsx?$/i.test(fileName)) {
        return true;
    }

    try {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        const text = fs.readFileSync(fileName, "utf8");

        return /(^|[^\w.])declare\s+(global|module|namespace)\b/.test(text) || /^\s*\/\/\/\s*<reference\b/m.test(text);
    } catch (e) {
        // Unreadable: keep it, and let the compiler produce the real error.
        return true;
    }
}

/**
 * The files the type-check should be rooted at.
 *
 * `--type-check` checks the whole tsconfig project, which for a typical test project is a good deal
 * more than one run touches -- this repo's own test project covers the node, browser and worker
 * suites plus all of `src`, so a node-only run also checks two suites that were never going to
 * execute. Under `--type-check-scope run` the program is instead rooted at the files the run matched,
 * which checks those *and everything they import*, transitively: every file the run can reach.
 *
 * Two sets of files are kept regardless of what the run matched:
 *
 * - Anything contributing global declarations (see `_isGlobalScopeFile`), because "nothing imports
 *   it" is precisely how ambient declarations look, and dropping them makes every test file fail to
 *   compile for want of `describe`.
 * - Nothing, if the run matched no file the project contains -- the full project is used instead, so
 *   that the scope reconciliation still has something to describe rather than reporting a vacuous
 *   clean check.
 *
 * Files the run matched that the project does *not* contain are deliberately never added: they are
 * what the reconciliation reports as unchecked (see `_findUncheckedFiles`), and quietly checking them
 * would turn a mistyped `--project` into a silent success.
 */
export function _resolveCheckRoots(projectFileNames: string[], scopeFiles: string[] | undefined, scope: string | undefined, caseSensitive: boolean): string[] {
    if (scope !== "run" || !scopeFiles || !scopeFiles.length) {
        return projectFileNames;
    }

    const inProject: { [key: string]: string } = {};
    arrForEach(projectFileNames, (fileName) => {
        inProject[_normCasePath(path.resolve(fileName), caseSensitive)] = fileName;
    });

    const roots: string[] = [];
    const seen: { [key: string]: boolean } = {};

    arrForEach(scopeFiles, (fileName) => {
        if (!/\.tsx?$/i.test(fileName)) {
            return;
        }

        const key = _normCasePath(path.resolve(fileName), caseSensitive);
        if (inProject[key] && !seen[key]) {
            seen[key] = true;
            roots.push(inProject[key]);
        }
    });

    if (!roots.length) {
        return projectFileNames;
    }

    arrForEach(projectFileNames, (fileName) => {
        const key = _normCasePath(path.resolve(fileName), caseSensitive);
        if (!seen[key] && _isGlobalScopeFile(fileName)) {
            seen[key] = true;
            roots.push(fileName);
        }
    });

    return roots;
}

/**
 * Whether files may be emitted one at a time, without the type checker having seen the rest of the
 * project -- much faster, and cacheable on disk, but not always correct.
 *
 * Off unless asked for, because of one failure mode that cannot be detected cheaply: an **ambient**
 * `declare const enum` (one declared in a `.d.ts`, typically by a dependency) has no emitting file,
 * so a member access against it can neither be inlined by the checker nor resolved at runtime -- it
 * compiles fine and then fails with `Cannot read properties of undefined`. This is not exotic:
 * `@nevware21/ts-utils` declares `WellKnownSymbols` exactly that way, so tripwire's own core hits it.
 * A project's *own* `const enum` is fine (see `preserveConstEnums` where the isolated options are
 * built, which emits the enum object rather than relying on inlining).
 *
 * `emitDecoratorMetadata` is refused outright even when asked for: the metadata it emits *is* type
 * information, so there is nothing for an isolated emit to derive it from.
 */
export function _canIsolate(compilerOptions: any, hookOptions: ICompileHookOptions): boolean {
    return !!hookOptions.isolatedTranspile && !compilerOptions.emitDecoratorMetadata;
}

export function registerTypeScriptHook(projectPath: string, cwd: string, checkDiagnostics?: boolean, tsconfigOverrides?: { [key: string]: any }, hookOptions?: ICompileHookOptions): void {
    const ts = loadTypescript(cwd);
    const fullProjectPath = path.resolve(cwd, projectPath);
    let projectFileNames: string[] = [];

    let compilerOptions: any = {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2018,
        esModuleInterop: true,
        // Defaults to on so mismatches between the project's pinned `typescript` and its
        // `@types/*` packages (eg. `@types/node` shipping typings for a newer TS than is
        // installed) surface as broken *ambient* lib declarations, not project bugs -- those
        // errors live in node_modules/*.d.ts, not in any file this run actually compiles.
        // A project can still opt back into full lib checking via its own tsconfig, since
        // parsed.options is merged over this default below.
        skipLibCheck: true,
        // Always emit an inline source map (see the matching override below): this hook is
        // used for the node target, where coverage -- when present -- comes from an external
        // `nyc` process wrapping this require hook, not from a `--coverage` flag this
        // function can see. Without a map, nyc's istanbul instrumentation runs directly
        // against this hook's already-transpiled output (comments/type-only constructs
        // erased per the project's own tsconfig, e.g. removeComments), so recorded
        // statement/line positions drift further from the real .ts source the deeper into
        // the file they are -- exactly the "Uncovered Line #s" mismatch this fixes.
        sourceMap: false,
        inlineSourceMap: true,
        inlineSources: true
    };

    // eslint-disable-next-line security/detect-non-literal-fs-filename
    if (fs.existsSync(fullProjectPath)) {
        const loadedConfig = ts.readConfigFile(fullProjectPath, ts.sys.readFile);
        if (!loadedConfig.error) {
            const parsed = ts.parseJsonConfigFileContent(loadedConfig.config, ts.sys, path.dirname(fullProjectPath));
            if (!parsed.errors || !parsed.errors.length) {
                compilerOptions = objAssign({}, compilerOptions, parsed.options || {});
                projectFileNames = parsed.fileNames || [];
                // Publish the resolved list for `getProjectFileNames` -- the type-check scope
                // check needs exactly this set, and the project has just been parsed to get it.
                _projectFileNamesCache[fullProjectPath] = projectFileNames.slice(0);
            }
        }
    }

    // Explicit overrides (eg. from a `tsconfig` object in the tripwire config) win over
    // whatever the loaded project file specifies, but still fall below the hook's own
    // hardcoded requirements immediately below -- module/noEmit/sourceMap etc. aren't really
    // "tsconfig settings" so much as invariants this require hook needs to stay functional
    // (eg. emitting real ESNext modules instead of CommonJS would make the emitted code
    // un-`require()`-able), so those keep having the final word even over an explicit override.
    if (tsconfigOverrides) {
        compilerOptions = objAssign({}, compilerOptions, tsconfigOverrides);
    }

    compilerOptions.module = ts.ModuleKind.CommonJS;
    compilerOptions.noEmit = false;
    compilerOptions.emitDeclarationOnly = false;
    compilerOptions.declaration = false;
    // Re-assert inline source maps after merging the project's tsconfig above: setting both
    // sourceMap and inlineSourceMap causes TypeScript to only invoke the emit write callback
    // for the .map file (never the .js), leaving outputText null, so sourceMap must stay off
    // here regardless of what the tsconfig says.
    compilerOptions.sourceMap = false;
    compilerOptions.inlineSourceMap = true;
    compilerOptions.inlineSources = true;
    compilerOptions.preserveConstEnums = false;

    const options: ICompileHookOptions = hookOptions || {};
    const useCaseSensitiveFileNames = !!ts.sys.useCaseSensitiveFileNames;
    const emittedCache: { [key: string]: string } = {};
    let program: any = null;

    // Build the Program now (instead of lazily on first required file) and validate it,
    // replacing the separate `tsc --noEmit` child-process check `--type-check`/`--compile`
    // used to run beforehand. That spawned a whole new Node process to re-parse and re-check
    // the entire project a second time; checking diagnostics directly against this Program
    // (which the require hook below needs to build anyway) gets the same "fail on type
    // errors" behavior without the redundant parse/check pass or process-spawn overhead.
    // The lazy per-file emit path below reuses this same Program instance once created.
    const emitRootNames = _resolveCheckRoots(projectFileNames, options.scopeFiles, options.typeCheckScope, useCaseSensitiveFileNames);

    // Each file compiled on its own rather than through a whole program -- far cheaper, and because
    // the output then depends on nothing but that file's text it is cacheable by content alone. Not
    // safe for every project, so it is asked for rather than assumed: see `_canIsolate`.
    const isolated = !checkDiagnostics && _canIsolate(compilerOptions, options);
    const isolatedOptions = isolated ? objAssign({}, compilerOptions, {
        // Emit the enum object rather than relying on the checker to inline its members, which an
        // isolated emit has no way to do -- see `_canIsolate`.
        preserveConstEnums: true
    }) : null;

    const cacheDir = options.emitCache !== false ? getCacheDir(cwd) : null;
    if (cacheDir) {
        // Entries nothing has read for a while are the ones an edit-and-run cycle left behind: a
        // whole-program emit set is keyed by the signature of the inputs that produced it, so one
        // edit orphans the lot. Throttled inside, so most runs do not pay for the scan.
        pruneEmitCache(cacheDir);
    }
    const emitFingerprint = cacheDir ? optionsFingerprint(ts.version, isolated ? isolatedOptions : compilerOptions) : "";

    /*
     * The whole-program path caches its emitted output too, but it cannot be keyed by the file's own
     * text the way the isolated path is: a whole-program emit can inline a `const enum` member from
     * another file, and can elide an import whose binding turns out to be a type -- so an unrelated
     * file's contents genuinely change what this file compiles to.
     *
     * What it is keyed by instead is the identity of the *entire program input set* (see
     * `createProgramManifest`): every source file the program used, the roots it was built from, the
     * compiler, its options, and the files that decide how imports resolve. Any change to any of
     * those produces a different signature, so the whole cache turns over at once -- coarse, but
     * sound, and exactly right for the case it exists for: running the same tests again over an
     * unchanged tree.
     *
     * Identical inputs also mean identical *diagnostics*, which is the larger win: a run whose
     * manifest still validates and which recorded a clean check does not need to build a program or
     * check it at all.
     */
    const programLocks = cacheDir && !isolated ? lockSignatures(cwd) : [];
    const cachedManifest = cacheDir && !isolated ? readProgramManifest(cacheDir, fullProjectPath, emitFingerprint) : null;
    const manifestCheck = cacheDir && !isolated
        ? checkProgramManifest(cachedManifest, emitFingerprint, emitRootNames, programLocks)
        : { current: false, reason: isolated ? "each file is compiled on its own, and reused while its text is unchanged" : "the compile cache is disabled" };
    const inputsUnchanged = manifestCheck.current;
    const skipCheck = inputsUnchanged && !!cachedManifest.checked;

    _cacheStatus = {
        // Isolated emits are cached per file, and no file has been required yet, so "rebuilt" would
        // be a guess -- and usually a wrong one on a warm cache.
        state: !cacheDir ? "off" : (isolated ? "isolated" : (inputsUnchanged ? "reused" : "rebuilt")),
        checkSkipped: !!checkDiagnostics && skipCheck,
        reason: inputsUnchanged ? "" : manifestCheck.reason
    };

    if (inputsUnchanged && checkDiagnostics && !skipCheck) {
        // Nothing changed, but the run that populated the cache never type-checked, so this one has
        // to -- and the caller should be told why it is doing work it might have expected to skip.
        _cacheStatus.reason = "the cached compile came from a run that did not type-check";
    }
    let programSignature = inputsUnchanged ? cachedManifest.signature : "";
    let manifestRecorded = inputsUnchanged;
    // Whether the manifest behind the current signature records a clean check; carried over when
    // the manifest is re-recorded for a wider program (see _hasUnrecordedFiles).
    let recordedChecked = inputsUnchanged ? !!cachedManifest.checked : false;
    // The files the current manifest covers, so a program that pulled in something outside them can
    // be told apart from one that merely re-parsed the same set.
    let recordedFiles: { [key: string]: boolean } = {};
    if (inputsUnchanged) {
        arrForEach(cachedManifest.files || [], (entry: string[]) => {
            recordedFiles[_normalizePath(entry[0])] = true;
        });
    }

    /**
     * Records what the program was built from, so the next run can tell whether it would build the
     * same one. Called once, as soon as a program exists -- whether it was created eagerly for the
     * check or lazily by the first file that needed emitting.
     */
    function _recordProgram(theProgram: any, wasChecked: boolean): void {
        if (!cacheDir || isolated || !theProgram) {
            return;
        }

        const sourceFiles: string[] = [];
        arrForEach(theProgram.getSourceFiles() || [], (sourceFile: any) => {
            sourceFiles.push(path.resolve(sourceFile.fileName));
        });

        const manifest: IProgramManifest = createProgramManifest(emitFingerprint, emitRootNames, sourceFiles, programLocks, wasChecked);
        programSignature = manifest.signature;
        manifestRecorded = true;
        recordedChecked = wasChecked;
        recordedFiles = {};
        arrForEach(sourceFiles, (sourceFile) => {
            recordedFiles[_normalizePath(sourceFile)] = true;
        });
        writeProgramManifest(cacheDir, fullProjectPath, manifest);
    }

    /**
     * Whether `theProgram` used a source file the recorded manifest does not list. A matched file
     * outside the tsconfig is added to the program as an extra root (see _emitWithProgram) and brings
     * its own out-of-project imports with it; none of those are in the manifest, so a change to one
     * of them would otherwise be served stale. One set lookup per source file, so a program that
     * merely re-parsed the recorded set costs nothing here beyond that.
     */
    function _hasUnrecordedFiles(theProgram: any): boolean {
        if (!cacheDir || isolated || !theProgram || !manifestRecorded) {
            return false;
        }

        let unrecorded = false;
        arrForEach(theProgram.getSourceFiles() || [], (sourceFile: any) => {
            if (!recordedFiles[_normalizePath(sourceFile.fileName)]) {
                unrecorded = true;
                return -1;
            }
        });

        return unrecorded;
    }

    if (checkDiagnostics && !skipCheck && ts.createProgram && projectFileNames.length) {
        program = _createCheckedProgram(ts, emitRootNames, compilerOptions, cwd, fullProjectPath, !!options.incremental);
        // Reached only when the check passed -- a failure throws -- so this program is recorded as
        // checked, which is what lets a later run over the same inputs skip checking entirely.
        _recordProgram(program, true);
    }

    /**
     * The cache key for one file's whole-program emit, or `""` when it must not be cached: without a
     * validated (or freshly recorded) program signature there is nothing to describe which program
     * produced the output.
     */
    function _programEmitKey(filename: string, source: string): string {
        return cacheDir && !isolated && programSignature ? emitCacheKey(_normalizePath(filename), source, emitFingerprint + "\n" + programSignature) : "";
    }

    function _normalizePath(fileName: string): string {
        const normalized = path.resolve(fileName).replace(/\\/g, "/");
        return useCaseSensitiveFileNames ? normalized : normalized.toLowerCase();
    }

    function _normalizePathArr(values: string[]): string[] {
        const result: string[] = [];
        arrForEach(values, (value) => {
            result.push(_normalizePath(value));
        });
        return result;
    }

    // Deliberately per-file, lazy Program creation/emit rather than the bulk "emit the whole
    // configured project up front" strategy used by `_getOrCreateTsProgramEntry` above: the
    // require-hook's actual working set (whatever the CLI's glob pattern loads) is often a
    // *subset* of `projectPath`'s full `include` scope (eg. this project's own
    // test/tsconfig.test.json includes browser/worker test files even for a node-only run) --
    // bulk-emitting everything up front measurably lost to this lazy, only-compile-what's-
    // actually-required approach in exactly that scenario. Reusing one Program across calls
    // (recreated only when a not-yet-included file is hit) still keeps most of the
    // whole-program type-checking benefit without paying for files that are never loaded.
    function _emitWithProgram(filename: string): string | null {
        if (!ts.createProgram) {
            return null;
        }

        const resolvedFileName = path.resolve(filename);

        if (!program && projectFileNames.length) {
            // Rooted at the run's own files where possible (see _resolveCheckRoots): TypeScript then
            // parses those and whatever they import rather than every file the tsconfig lists, and a
            // file's emitted output does not depend on which other files happen to be roots. Any file
            // that turns out not to be in the program is added below, exactly as before.
            program = ts.createProgram(emitRootNames, compilerOptions);

            // First program of the run: record what it was built from unless a validated manifest
            // already describes exactly these inputs. `false` because nothing checked it -- a later
            // `--type-check` run must not skip checking on the strength of a transpile-only run.
            if (!manifestRecorded) {
                _recordProgram(program, false);
            }
        }

        let activeProgram = program;
        let sourceFile = activeProgram && (activeProgram.getSourceFile(resolvedFileName) || activeProgram.getSourceFile(filename));

        if (!sourceFile) {
            const rootNames = emitRootNames.length ? emitRootNames.slice(0) : [];
            if (_normalizePathArr(rootNames).indexOf(_normalizePath(resolvedFileName)) === -1) {
                rootNames.push(resolvedFileName);
            }

            activeProgram = ts.createProgram(rootNames, compilerOptions);
            sourceFile = activeProgram.getSourceFile(resolvedFileName) || activeProgram.getSourceFile(filename);
            program = activeProgram;

            // The wider program is what later emits come from, so the manifest has to describe it:
            // re-recorded only when it really added files, keeping the recorded check status, since
            // the project files were checked and the added ones are reported as unchecked by the
            // scope reconciliation either way. Output emitted before this point is keyed by the
            // previous signature and is simply re-emitted once on the next run.
            if (_hasUnrecordedFiles(activeProgram)) {
                _recordProgram(activeProgram, recordedChecked);
            }
        }

        if (!sourceFile) {
            return null;
        }

        let outputText: string | null = null;
        const sourceFileName = _normalizePath(sourceFile.fileName);
        activeProgram.emit(sourceFile, (fileName: string, text: string, _bom?: boolean, _onError?: (message: string) => void, sourceFiles?: any[]) => {
            if (/\.js$/i.test(fileName)) {
                if (sourceFiles && sourceFiles.length) {
                    let include = false;
                    for (let lp = 0; lp < sourceFiles.length; lp++) {
                        if (_normalizePath(sourceFiles[lp].fileName) === sourceFileName) {
                            include = true;
                            break;
                        }
                    }

                    if (include) {
                        outputText = text;
                    }
                } else if (outputText === null) {
                    outputText = text;
                }
            }
        }, undefined, false);

        return outputText;
    }

    /**
     * Emits one file from its own text, consulting (and populating) the on-disk cache so that a file
     * unchanged since a previous run is not compiled again at all.
     */
    function _emitIsolated(filename: string): string | null {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        const source = fs.readFileSync(filename, "utf8");
        const key = cacheDir ? emitCacheKey(_normalizePath(filename), source, emitFingerprint) : "";

        if (key) {
            const cached = readEmitCache(cacheDir, key);
            if (cached !== null) {
                return cached;
            }
        }

        const transpiled = ts.transpileModule(source, {
            compilerOptions: isolatedOptions,
            fileName: filename
        });

        const outputText = transpiled.outputText || "";
        if (key && outputText) {
            writeEmitCache(cacheDir, key, outputText);
        }

        return outputText;
    }

    /**
     * Emits one file through the program, consulting the on-disk cache first.
     *
     * A hit means every input the previous run compiled from is byte-for-byte unchanged (see the
     * manifest discussion above), so no program needs to exist at all -- which is what makes a
     * repeated run over an unchanged tree skip both the parse and the check.
     */
    function _emitFromProgramCache(filename: string): string | null {
        let source: string | null = null;
        let key = "";

        if (cacheDir && programSignature) {
            try {
                // eslint-disable-next-line security/detect-non-literal-fs-filename
                source = fs.readFileSync(filename, "utf8");
                key = _programEmitKey(filename, source);
            } catch (e) {
                key = "";
            }
        }

        if (key) {
            const cached = readEmitCache(cacheDir, key);
            if (cached !== null) {
                return cached;
            }
        }

        const outputText = _emitWithProgram(filename);

        // The signature can only have been established by _recordProgram above, which may have run
        // as a side effect of the emit, so the key is (re)built here rather than reused.
        if (outputText && cacheDir && source !== null) {
            const storeKey = _programEmitKey(filename, source);
            if (storeKey) {
                writeEmitCache(cacheDir, storeKey, outputText);
            }
        }

        return outputText;
    }

    const extensionRegistry = _getExtensionRegistry();
    if (!extensionRegistry) {
        throw new Error("TypeScript hook registration failed: unable to access require.extensions registry.");
    }

    extensionRegistry[".ts"] = function(module: any, filename: string) {
        const cacheKey = _normalizePath(filename);
        let outputText: string | null | undefined = emittedCache[cacheKey];
        if (!outputText) {
            if (isolated) {
                outputText = _emitIsolated(filename);
            } else {
                outputText = _emitFromProgramCache(filename);
            }

            if (!outputText) {
                // eslint-disable-next-line security/detect-non-literal-fs-filename
                const source = fs.readFileSync(filename, "utf8");
                const transpiled = ts.transpileModule(source, {
                    compilerOptions,
                    fileName: filename
                });

                outputText = transpiled.outputText;
            }
            emittedCache[cacheKey] = outputText || "";
        }

        module._compile(outputText || "", filename);
    };

    extensionRegistry[".tsx"] = extensionRegistry[".ts"];
}

export function transpileTypeScriptSource(filePath: string, source: string, cwd: string, projectPath?: string): string {
    const programOutput = _emitTypeScriptWithProgram(filePath, cwd, false, projectPath);
    if (programOutput !== null) {
        return programOutput;
    }

    const ts = loadTypescript(cwd);
    const transpiled = ts.transpileModule(source, {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2018,
            esModuleInterop: true,
            sourceMap: false,
            inlineSourceMap: false,
            inlineSources: false
        },
        fileName: filePath
    });

    return transpiled.outputText;
}

export function transpileTypeScriptSourceWithMap(filePath: string, source: string, cwd: string, projectPath?: string): string {
    const programOutput = _emitTypeScriptWithProgram(filePath, cwd, true, projectPath);
    if (programOutput !== null) {
        return programOutput;
    }

    const ts = loadTypescript(cwd);
    const transpiled = ts.transpileModule(source, {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2018,
            esModuleInterop: true,
            sourceMap: true,
            inlineSourceMap: true,
            inlineSources: true
        },
        fileName: filePath
    });

    return transpiled.outputText;
}
