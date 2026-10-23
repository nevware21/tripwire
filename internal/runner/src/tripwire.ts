/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */
import * as fs from "fs";
import * as path from "path";
import { loadConfig } from "./config/loader";
import { _createBrowserWorkerModuleGraph, _execute } from "./execute/execute";
import { IGraphWorkerResult } from "./execute/graphWorker";
import { _registerTypeScriptHook } from "./execute/compile";
import { runCoverageReport } from "./codecov/nodeCoverageReport";
import { _parseArgs, _REPORTER_NAMES } from "./cli/parseArgs";
import { _reportCliError, _setDebugStack, _wantsDebugStack } from "./cli/errorReport";
import { _isUserError, _userError, _userErrorHints } from "./internal/userError";
import { _setGraphTypeCheck } from "./execute/compile";

// Deliberately lazy (called just before _execute() below, not at module load time): the
// opt-in TRIPWIRE_PREFER_SOURCE branch needs `parsed.project` (the *test* project's own
// tsconfig, eg. test/tsconfig.test.json) so that this eager `core/src/index.ts` load and
// execute.ts's own later `_registerTypeScriptHook(parsed.project, ...)` call transpile every
// shared source file with identical compiler options. Using a different tsconfig here (eg.
// core's own bare tsconfig.json) would still load correctly, but would emit *slightly*
// different JS for the same .ts files (different removeComments/target/etc settings) --
// harmless for execution, but nyc's coverage instrumentation would then see two structurally
// different statementMaps for the same reported file path (once from this early load, cached
// forever in require.cache; once from nyc's own end-of-run `addFile()`/"all: true" zero-fill
// walk, which always goes through whichever hook is registered *last*) and its merge silently
// produces a corrupted, all-zero report instead of erroring.
function _loadTripwire(cwd: string, projectPath?: string, tsconfigOverrides?: { [key: string]: any }) {
    const coreBaseCandidates = [
        path.resolve(__dirname, "../../core"),
        path.resolve(__dirname, "../../../core")
    ];

    // Opt-in only (never affects normal/packaged consumers): this repo's own dogfood test run
    // (`core`'s `test:node` script) sets this so the CLI's own describe/it/assert/config-host
    // machinery loads from the same live, require-hook-instrumented `core/src` copy the test
    // files themselves import by relative path, instead of the prebuilt `core/dist` bundle --
    // two otherwise-separate module instances whose one-time singleton-init code (see
    // _configHost.ts's/suite.ts's _gblSlot doc comments) would each only run in whichever copy
    // wins the race to initialize first, undercounting coverage for whichever copy nyc actually
    // instruments.
    if (process.env.TRIPWIRE_PREFER_SOURCE === "1") {
        const preferSourceBaseCandidates = [cwd, path.resolve(cwd, "..", "core")].concat(coreBaseCandidates);

        for (let lp = 0; lp < preferSourceBaseCandidates.length; lp++) {
            const src = path.resolve(preferSourceBaseCandidates[lp], "src/index.ts");

            // eslint-disable-next-line security/detect-non-literal-fs-filename
            if (fs.existsSync(src)) {
                try {
                    _registerTypeScriptHook(projectPath || "tsconfig.json", cwd, undefined, tsconfigOverrides);

                    // eslint-disable-next-line security/detect-non-literal-require, @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
                    return require(src);
                } catch (e) {
                    // Fall through to the normal resolution order below.
                }
            }
        }
    }

    const cwdModuleCandidates = [
        "@nevware21/tripwire",
        "../dist/es5/main/tripwire",
        "../build/es5/mod/index"
    ];

    for (let lp = 0; lp < cwdModuleCandidates.length; lp++) {
        try {
            const resolved = require.resolve(cwdModuleCandidates[lp], {
                paths: [process.cwd()]
            });

            // eslint-disable-next-line security/detect-non-literal-require, @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
            return require(resolved);
        } catch (e) {
            // Fall through to source and absolute fallback candidates.
        }
    }

    const sourceCandidates = [
        {
            src: path.resolve(__dirname, "../src/index.ts"),
            tsconfig: path.resolve(__dirname, "../tsconfig.json")
        }
    ];

    for (let lp = 0; lp < coreBaseCandidates.length; lp++) {
        sourceCandidates.push({
            src: path.resolve(coreBaseCandidates[lp], "src/index.ts"),
            tsconfig: path.resolve(coreBaseCandidates[lp], "tsconfig.json")
        });
    }

    for (let lp = 0; lp < sourceCandidates.length; lp++) {
        const candidate = sourceCandidates[lp];

        // eslint-disable-next-line security/detect-non-literal-fs-filename
        if (fs.existsSync(candidate.src) && fs.existsSync(candidate.tsconfig)) {
            try {
                _registerTypeScriptHook(candidate.tsconfig, path.dirname(candidate.tsconfig));

                // eslint-disable-next-line security/detect-non-literal-require, @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
                return require(candidate.src);
            } catch (e) {
                // Fall through to packaged fallbacks.
            }
        }
    }

    const fallbackCandidates = [
        path.resolve(__dirname, "../dist/es5/main/tripwire"),
        path.resolve(__dirname, "../build/es5/mod/index")
    ];

    for (let lp = 0; lp < coreBaseCandidates.length; lp++) {
        fallbackCandidates.push(path.resolve(coreBaseCandidates[lp], "dist/es5/main/tripwire"));
        fallbackCandidates.push(path.resolve(coreBaseCandidates[lp], "build/es5/mod/index"));
    }

    let lastError = null;
    for (let lp = 0; lp < fallbackCandidates.length; lp++) {
        try {
            // eslint-disable-next-line security/detect-non-literal-require, @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
            return require(fallbackCandidates[lp]);
        } catch (e: any) {
            lastError = e;
        }
    }

    const message = lastError && (lastError as any).message ? (lastError as any).message : String(lastError);
    throw _userError("Unable to load tripwire runtime from source or built output. Details: " + message, [
        "npm install --save-dev @nevware21/tripwire"
    ]);
}

function _printUsage() {
    console.log("tripwire [options] <glob...>");
    console.log("");
    console.log("Options:");
    console.log("  -p, --project <tsconfig.json> TypeScript project file (default: ./tsconfig.json)");
    console.log("  --target <node|browser|worker> Test runtime target (default: node)");
    console.log("  --env <node|browser|worker> Alias for --target");
    console.log("  --browser-launch <mode[:style]> Browser launch mode for browser/worker targets (mode: puppeteer|open|manual; style: classic|slate)");
    console.log("  --browser-style <classic|slate> Browser UI style for interactive mode (default: classic)");
    console.log("  --ux-provider <module>     Custom browser UX provider module, overriding the built-in one");
    console.log("  --open-browser              Alias for --browser-launch open");
    console.log("  --manual-browser            Alias for --browser-launch manual");
    console.log("  --tsProject <tsconfig.json> Alias for --project (ts-mocha style)");
    console.log("  --ts-project <tsconfig.json> Alias for --project (ts-mocha style)");
    console.log("  (config file only) tsconfig: string | object -- a string path sets project (a CLI");
    console.log("                               --project/-p flag still wins); an object always overrides");
    console.log("                               compiler options on the loaded project, even with --project");
    console.log("  --type-check                Report TypeScript type errors and fail the run on any. Applies to all");
    console.log("                               three targets (node, browser, worker). Off by default; the module");
    console.log("                               graph is built either way, so this adds the type-checker walk over a");
    console.log("                               ts.Program that already exists -- not a second compile or a tsc process");
    console.log("  --transpile-only            Transpile without reporting type errors (default). The exact opposite");
    console.log("                               of --type-check: whichever appears last on the command line wins, and");
    console.log("                               either beats a config file typeCheck setting");
    console.log("  --no-type-check             Alias for --transpile-only");
    console.log("  --no-transpile-only         Alias for --type-check");
    console.log("  --compile                   Alias for --type-check");
    console.log("  --no-compile                Alias for --transpile-only");
    console.log("  (config file only) typeCheck: boolean -- makes --type-check a project's default;");
    console.log("                               override it per-run with --transpile-only");
    console.log("  --strict-type-check         Fail the run when matched files fall outside the type-checked project.");
    console.log("                               --type-check checks the tsconfig *project*; the run executes whatever");
    console.log("                               the glob matched. When those drift apart the files that ran were never");
    console.log("                               checked, and the run still reports success. Warned about by default;");
    console.log("                               this makes it an error. Implies --type-check, unless --transpile-only");
    console.log("                               was passed explicitly.");
    console.log("  --no-strict-type-check      Only warn about matched files outside the project (default)");
    console.log("  --type-check-scope <scope>  What --type-check covers: 'project' (every file the tsconfig resolves");
    console.log("                               to, the default) or 'run' (the files this run matched, everything they");
    console.log("                               import, and anything declaring globals). 'run' is faster on a project");
    console.log("                               far larger than one run, but narrows what a green run proves.");
    console.log("                               Node target only: browser/worker always check the whole project.");
    console.log("  --emit-cache                Reuse compiled output, and a clean type-check, between runs when nothing");
    console.log("                               has changed (default). Cached under node_modules/.cache/tripwire; every");
    console.log("                               node run prints what the cache did and, when it rebuilt, what changed.");
    console.log("                               Node target only: browser/worker compile their module graph every run.");
    console.log("  --no-emit-cache             Reuse no cached compiled output or type-check result (--incremental,");
    console.log("                               when on, still keeps its own state)");
    console.log("  --isolated-transpile        Compile each file on its own instead of through a whole program, when");
    console.log("                               not type-checking. Faster, but cannot resolve an ambient");
    console.log("                               'declare const enum' from a dependency -- such a project fails at load");
    console.log("                               with 'Cannot read properties of undefined'. Off by default. Node target only.");
    console.log("  --no-isolated-transpile     Always compile through a whole program (default)");
    console.log("  --incremental               Keep TypeScript's own incremental type-check state between runs. Off by");
    console.log("                               default: it measured no benefit, and --emit-cache supersedes it.");
    console.log("                               Node target only.");
    console.log("  --no-incremental            Do not keep incremental type-check state (default)");
    console.log("  --graph-thread              Build the browser/worker module graph on a worker thread. Off by");
    console.log("                               default: it measured no benefit, since the build then competes for the");
    console.log("                               CPU the browser needs to start.");
    console.log("  --no-graph-thread           Build the module graph on the main thread (default)");
    console.log("  --debug-stack               Print tripwire's own stack trace beneath a failure, mapped back to its");
    console.log("                               TypeScript sources. Off by default (the CLI is a minified bundle, so an");
    console.log("                               unmapped stack buries the message). Also enabled by TRIPWIRE_DEBUG_STACK=1.");
    console.log("  -s, --slow <ms>             Mark tests slower than the threshold");
    console.log("  -t, --timeout <ms>          Set timeout for each test");
    console.log("  --retries <count>           Set retries for each test");
    console.log("  -g, --grep <pattern>        Run tests matching pattern");
    console.log("  -f, --fgrep <text>          Run tests containing text");
    console.log("  --invert                    Invert grep/fgrep matches");
    console.log("  --ignore <glob>             Exclude files matching glob");
    console.log("  -b, --bail                  Abort on first test failure");
    console.log("  --fail-on-hook              Fail the run when a lifecycle hook (before/beforeEach/afterEach/");
    console.log("                               after) fails or times out, even if every test itself passed.");
    console.log("                               Such a failure is otherwise easy to miss: it belongs to no test,");
    console.log("                               so it never reaches the pass/fail counts. Reports each failing");
    console.log("                               hook and exits non-zero.");
    console.log("  --no-fail-on-hook           Only warn about failing hooks (default)");
    console.log("  --trace                     Show each test and assertion as it executes");
    console.log("  --coverage                  Collect and write browser/worker coverage when using Puppeteer");
    console.log("  --no-coverage               Disable browser/worker coverage collection (default)");
    console.log("  --coverage-instrumenter <module|none> Coverage instrumenter module (default: istanbul-lib-instrument)");
    console.log("  --erased-coverage-mode <zero|full|ignore> How to report untouched files whose content is fully erased by");
    console.log("                               TypeScript (interfaces/type-only declarations that produce no runtime code):");
    console.log("                               zero = report as computed/0% (default, matches nyc's --all); full = report");
    console.log("                               as 100% covered; ignore = omit the file from the report entirely");
    console.log("  --coverage-reporter <name>   nyc reporter to use for tripwire's own coverage summary (default: text).");
    console.log("                               Repeatable, or comma-separated, for multiple reporters (eg. text,html).");
    console.log("  --coverage-src <glob>        Where this project's sources live, so files no test imported are still");
    console.log("                               reported (default: src/**/*.ts). Repeatable, or comma-separated. Set this");
    console.log("                               when sources are not under src/, or they are silently left out of coverage.");
    console.log("  --reporter <name>            Test-result reporter to use (default: spec). One of: " + _REPORTER_NAMES.join(", ") + ".");
    console.log("                               Repeatable, or comma-separated, for multiple reporters (eg. spec,xunit).");
    console.log("                               (config file only) reporters: string[] (or 'reporter', an accepted");
    console.log("                               alias) -- any --reporter flag(s) on the CLI replace the config file's");
    console.log("                               list entirely rather than adding to it.");
    console.log("  --reporter <module>          Also takes a custom reporter module (node target only): a path such as");
    console.log("                               ./reporters/mine.js, a scoped package, or module:<package> for a bare");
    console.log("                               package name. See the Custom reporters section of docs/reporters.md.");
    console.log("  --source-maps                Generate per-module source maps for browser/worker so DevTools can show/step");
    console.log("                               through the real .ts source. Adds processing time; off by default.");
    console.log("  --no-source-maps             Disable source map generation (default)");
    console.log("  --show-files                Show matched files before running");
    console.log("  --verbose                   Log each HTTP request and response status served by the browser runner");
    console.log("  --watch                     Node target, and browser/worker with --browser-launch puppeteer");
    console.log("                               (default): after the first run, watch the resolved test files (node:");
    console.log("                               also whatever they transitively require) and automatically re-run on");
    console.log("                               change until interrupted (Ctrl+C). No effect on open/manual launches,");
    console.log("                               which already auto-reload on change via the page's own toggle.");
    console.log("  --server-root <path>        Root folder the server's filesystem fallback serves directly at its");
    console.log("                               root (eg. /README.md -> <path>/README.md); no /fs/ prefix (default: cwd)");
    console.log("  --bind-address <address>    Interface the server binds to, and the host its URLs are built from");
    console.log("                               (default: 127.0.0.1, loopback only). Use 0.0.0.0 or one interface's");
    console.log("                               address when the browser is on another host. The port is always");
    console.log("                               chosen automatically.");
    console.log("  --no-server                 Disable starting the embedded HTTP server by default");
    console.log("  --server                    Force-enable starting the embedded HTTP server");
    console.log("  --bundle                    Serve the browser/worker module graph as a single concatenated");
    console.log("                               bundle with one composite source map instead of one request");
    console.log("                               per module (default)");
    console.log("  --no-bundle                 Serve one network request per module instead, each with its");
    console.log("                               own source map");
    console.log("  --spec <glob>               Add Mocha-style spec pattern");
    console.log("  --file <path>               Preload setup file before tests");
    console.log("  -r, --require <module>      Preload module before tests");
    console.log("  (Unsupported options fail with an error)");
    console.log("  -h, --help                  Show help");
    console.log("");
    console.log("Commands:");
    console.log("  coverage-report [--erased-coverage-mode <zero|full|ignore>] [--nyc-output-dir <dir>]");
    console.log("                               Reprint nyc's node-target coverage report (from an existing");
    console.log("                               .nyc_output directory) with --erased-coverage-mode applied.");
    console.log("                               Needed because --erased-coverage-mode has no effect on the main");
    console.log("                               `nyc ... node ./bin/tripwire.js ...` run itself: for the node");
    console.log("                               target, nyc instruments and reports coverage entirely on its own,");
    console.log("                               never touching tripwire's coverage pipeline (that pipeline, where");
    console.log("                               --erased-coverage-mode is implemented, only runs for the");
    console.log("                               browser/worker targets). This command runs as a separate step");
    console.log("                               after nyc finishes collecting to reprint the same data corrected.");
}


function _runCoverageReportCommand(args: string[]): number {
    const fileConfig = loadConfig(process.cwd());
    let erasedCoverageMode: "zero" | "full" | "ignore" = fileConfig.erasedCoverageMode || "zero";
    let nycOutputDir: string | undefined;
    const coverageReporters: string[] = (fileConfig.coverageReporters || []).slice();

    for (let lp = 0; lp < args.length; lp++) {
        const value = args[lp];
        const eq = value.indexOf("=");
        const name = eq >= 0 ? value.slice(0, eq) : value;
        const inlineValue = eq >= 0 ? value.slice(eq + 1) : undefined;

        if (name === "--erased-coverage-mode") {
            const val = inlineValue !== undefined ? inlineValue : args[++lp];
            if (val !== "zero" && val !== "full" && val !== "ignore") {
                console.error("Invalid --erased-coverage-mode '" + val + "'. Expected zero, full, or ignore.");
                return 1;
            }
            erasedCoverageMode = val;
            continue;
        }

        if (name === "--nyc-output-dir") {
            nycOutputDir = inlineValue !== undefined ? inlineValue : args[++lp];
            continue;
        }

        if (name === "--coverage-reporter") {
            const val = inlineValue !== undefined ? inlineValue : args[++lp];
            const names = (val || "").split(",");
            for (let ni = 0; ni < names.length; ni++) {
                const trimmed = names[ni].trim();
                if (trimmed) {
                    coverageReporters.push(trimmed);
                }
            }
            continue;
        }
    }

    return runCoverageReport(process.cwd(), { erasedCoverageMode, nycOutputDir, coverageReporters });
}

export async function runCli(args: string[]) {
    // Separate from the main test-runner flow below: reprints a corrected `nyc report` text
    // summary for the node target, where `erasedCoverageMode` can't apply during the main run
    // itself (see runCoverageReport's own doc comment for why).
    if (args[0] === "coverage-report") {
        return _runCoverageReportCommand(args.slice(1));
    }

    const parsed = _parseArgs(args);
    // A config file can ask for stacks too; `main()`'s raw-argv scan can't see that, and by the
    // time anything below throws, it has been parsed.
    _setDebugStack(!!(parsed as any).debugStack);

    if (parsed.help) {
        _printUsage();
        return 0;
    }

    if (parsed.error) {
        console.error(parsed.error);
        _printUsage();
        return 1;
    }

    const _tripwire = _loadTripwire(process.cwd(), parsed.project, parsed.tsconfigOverrides);
    return _execute(_tripwire, parsed);
}

/**
 * Builds the browser/worker module graph on a worker thread and posts it back to the thread that
 * asked for it -- the other half of `_startGraphWorker`, which explains why the build is moved off
 * the main thread at all.
 *
 * It lives here, in the bundle's entry module, for two reasons: this is the module the worker can
 * reach (the bootstrap re-requires the bundle and calls this export by name), and putting it beside
 * the parent half would make `graphWorker.ts` and `execute.ts` import each other.
 *
 * Takes no arguments and returns nothing because it is an entry point: everything comes from
 * `workerData`, and the answer goes back over the port.
 */
export function _graphWorkerEntry(): void {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const { workerData, parentPort } = require("worker_threads");

    function _post(result: IGraphWorkerResult): void {
        if (parentPort) {
            parentPort.postMessage(result);
        }
    }

    try {
        // Module state, and this thread has its own copy of every module -- what the parent set on
        // its copy is not visible here.
        _setGraphTypeCheck(!!workerData.typeCheck);

        _post({
            ok: true,
            graph: _createBrowserWorkerModuleGraph(workerData.entryFiles, workerData.cwd, workerData.parsed)
        });
    } catch (e) {
        // Reported rather than thrown: a throw here surfaces as an unhandled worker error, losing
        // the user-error marking that decides whether the CLI prints a stack trace.
        const error = e as Error;
        _post({
            ok: false,
            message: error && error.message ? error.message : String(e),
            stack: error && error.stack,
            user: _isUserError(e),
            hints: _userErrorHints(e)
        });
    }
}

export async function main() {
    const args = process.argv.slice(2);

    try {
        const exitCode = await runCli(args);
        process.exitCode = exitCode;
    } catch (error: any) {
        // Deliberately *not* `error.stack`. The CLI ships as one minified bundle, so the stack
        // this used to print unconditionally was ten frames of `at yo (tripwire.js:2:143518)`
        // wrapped around the one line that says what to do -- and for the first-run failures
        // ("install puppeteer", "install typescript") it reads as though the tool is broken
        // rather than as an instruction. `--debug-stack` opts back in and maps the frames back
        // onto runner/src. See cli/errorReport.ts.
        _reportCliError(error, {
            debugStack: _wantsDebugStack(args),
            cwd: process.cwd()
        });
        process.exitCode = 1;
    }
}
if (require.main === module) {
    main();
}
