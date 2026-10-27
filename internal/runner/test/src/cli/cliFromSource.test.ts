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
import { execFile } from "child_process";
import { replaceAnsi } from "@nevware21/chromacon";
import { assert } from "@nevware21/tripwire";

const RUNNER_DIR = path.resolve(__dirname, "../../..");
const LAUNCHER = path.resolve(__dirname, "../support/cliFromSource.js");

const TS_CONFIG = {
    compilerOptions: { target: "es2018", module: "commonjs", esModuleInterop: true, skipLibCheck: true, types: [] as string[], lib: [ "es2018" ] },
    include: [ "test/**/*.ts" ]
};

// A stand-in for puppeteer, installed in the browser fixture's node_modules: its one page reports a run
// to the server it is pointed at, passing for the browser target and failing for the worker target.
// Any other page (the CLI's warm-up) fails to load.
const FAKE_PUPPETEER = [
    "const http = require(\"http\");",
    "function report(url) {",
    "    const target = new URL(url);",
    "    const failed = target.pathname.indexOf(\"/worker\") !== -1 ? 1 : 0;",
    "    const body = JSON.stringify({ summary: { total: 1, passed: 1 - failed, failed: failed, skipped: 0, pending: 0, duration: 1 } });",
    "    return new Promise((resolve, reject) => {",
    "        const req = http.request({ host: target.hostname, port: target.port, method: \"POST\", path: \"/api/result\", agent: false,",
    "            headers: { \"content-type\": \"application/json\", \"content-length\": Buffer.byteLength(body) } }, (res) => {",
    "            res.resume();",
    "            res.on(\"end\", resolve);",
    "        });",
    "        req.on(\"error\", reject);",
    "        req.end(body);",
    "    });",
    "}",
    "exports.launch = async function () {",
    "    const page = {",
    "        on: function () {},",
    "        goto: async function (url) {",
    "            if (url.indexOf(\"/__tripwire__/\") === -1) {",
    "                throw new Error(\"nothing is listening\");",
    "            }",
    "            await report(url);",
    "        }",
    "    };",
    "    return { pages: async () => [ page ], newPage: async () => page, close: async () => {} };",
    "};",
    ""
].join("\n");

const BROWSER_TEST = "import { describe, it } from \"@nevware21/tripwire\";\ndescribe(\"browser\", () => {\n    it(\"runs\", () => {\n    });\n});\n";

const BROWSER_FILES: { [file: string]: string } = {
    "package.json": JSON.stringify({ name: "@nevware21/tripwire", version: "0.0.0" }),
    "src/index.ts": "export function describe(name: string, fn: () => void): void {\n    fn();\n}\nexport function it(name: string, fn: () => void): void {\n    fn();\n}\n",
    "test/a.test.ts": BROWSER_TEST,
    "test/setup.ts": "export const setup = true;\n",
    "node_modules/puppeteer/package.json": JSON.stringify({ name: "puppeteer", version: "0.0.0", main: "index.js" }),
    "node_modules/puppeteer/index.js": FAKE_PUPPETEER
};

const BROWSER_TS_CONFIG = { compilerOptions: TS_CONFIG.compilerOptions, include: [ "src/**/*.ts", "test/**/*.ts" ] };

const BROKEN = "export const broken: number = \"not a number\";\n";

interface IInvocation {
    args: string[];
    exitCode: number;
    out: string[];
    err: string[];
    spawned: string[][];
}

/**
 * The tripwire CLI run end to end against small throwaway projects, loaded from the runner's sources so
 * a coverage run measures them (the rest of this suite runs under the bundled CLI). Every invocation
 * runs in one child process, one after another; each test below then checks what one of them printed
 * and the exit code it left.
 */
describe("tripwire cli, run from source", function () {
    // One child process compiles the runner and runs every invocation
    this.timeout(300000);

    let scratch: string;
    let projects: { [name: string]: string };
    let results: { [name: string]: IInvocation };

    function write(dir: string, name: string, text: string): string {
        const file = path.join(dir, name);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, text, "utf8");

        return file;
    }

    // A project whose node_modules links back to this repo's tripwire, as an installed one would --
    // unless `noTripwire` leaves it out
    function makeProject(name: string, files: { [file: string]: string }, tsconfig?: any, noTripwire?: boolean): string {
        const dir = path.join(scratch, name);
        fs.mkdirSync(path.join(dir, "node_modules", "@nevware21"), { recursive: true });
        if (!noTripwire) {
            fs.symlinkSync(path.dirname(require.resolve("@nevware21/tripwire/package.json")), path.join(dir, "node_modules", "@nevware21", "tripwire"), "junction");
        }

        write(dir, "tsconfig.json", JSON.stringify(tsconfig || TS_CONFIG));
        Object.keys(files).forEach((file) => write(dir, file, files[file]));

        return dir;
    }

    function run(name: string): IInvocation {
        const result = results[name];
        assert.isObject(result, "the '" + name + "' invocation ran");

        return result;
    }

    function out(name: string): string {
        return replaceAnsi(run(name).out.join("\n"), "");
    }

    function err(name: string): string {
        return replaceAnsi(run(name).err.join("\n"), "");
    }

    before(async () => {
        // The real path, as the CLI prints paths from its working directory (on macOS the temp folder is a link)
        scratch = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "tripwire-cli-source-")));

        const passing = [
            "import { describe, it, assert } from \"@nevware21/tripwire\";",
            "describe(\"passing\", () => {",
            "    it(\"adds\", () => {",
            "        assert.equal(1 + 1, 2);",
            "    });",
            "    it(\"joins\", () => {",
            "        assert.equal([ \"a\", \"b\" ].join(\"\"), \"ab\");",
            "    });",
            "});",
            ""
        ].join("\n");

        projects = {
            pass: makeProject("pass", {
                "test/pass.test.ts": passing,
                "setup.js": "console.log(\"setup loaded\");\n"
            }),
            fail: makeProject("fail", {
                "test/fail.test.ts": [
                    "import { describe, it, assert } from \"@nevware21/tripwire\";",
                    "describe(\"failing\", () => {",
                    "    it(\"fails\", () => {",
                    "        assert.equal(1, 2);",
                    "    });",
                    "    it(\"is never reached with --bail\", () => {",
                    "        assert.ok(true);",
                    "    });",
                    "});",
                    ""
                ].join("\n")
            }),
            hooks: makeProject("hooks", {
                // A failing `after` hook belongs to no test, so it reaches no pass/fail count
                "test/hook.test.ts": [
                    "import { describe, it, after } from \"@nevware21/tripwire\";",
                    "describe(\"hooked\", () => {",
                    "    after(() => {",
                    "        throw new Error(\"teardown broke\");",
                    "    });",
                    "    it(\"passes\", () => {",
                    "    });",
                    "});",
                    ""
                ].join("\n")
            }),
            typeError: makeProject("typeError", {
                "test/bad.test.ts": "import { it } from \"@nevware21/tripwire\";\nconst count: number = \"not a number\";\nit(\"never runs\", () => count);\n"
            }),
            scope: makeProject("scope", {
                "test/a.test.ts": passing,
                "test/b.test.ts": passing.replace("\"passing\"", "\"also passing\"")
            }, { compilerOptions: TS_CONFIG.compilerOptions, files: [ "test/a.test.ts" ] }),
            loadError: makeProject("loadError", {
                "test/load.test.ts": "throw new Error(\"broken at load\");\n"
            }),
            coverage: makeProject("coverage", {
                "package.json": "{}",
                ".tripwirerc.json": JSON.stringify({ erasedCoverageMode: "zero" })
            }),
            // Named @nevware21/tripwire, as core's own suite is, so the browser module graph uses this
            // project's small src/index.ts as the tripwire runtime instead of compiling all of core
            browser: makeProject("browser", BROWSER_FILES, BROWSER_TS_CONFIG),
            empty: makeProject("empty", { "test/empty.test.ts": "export const nothing = true;\n" }),
            // Nothing installed resolves @nevware21/tripwire, so the CLI falls back to tripwire's sources
            browserNoTripwire: makeProject("browserNoTripwire", BROWSER_FILES, BROWSER_TS_CONFIG, true),
            // The watch runs are left waiting on their files, so each has a project of its own. The
            // browser one starts with a type error, so its first round has built nothing to watch.
            watchNode: makeProject("watchNode", { "test/watch.test.ts": passing }),
            watchBrowser: makeProject("watchBrowser", Object.assign({}, BROWSER_FILES, { "test/a.test.ts": BROWSER_TEST + BROKEN }), BROWSER_TS_CONFIG)
        };

        // nyc output for the coverage-report command: one file, half covered
        const covered = path.join(projects.coverage, "src", "a.js");
        const data: any = {};
        data[covered] = {
            path: covered,
            statementMap: {
                0: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
                1: { start: { line: 2, column: 0 }, end: { line: 2, column: 10 } }
            },
            fnMap: {},
            branchMap: {},
            s: { 0: 1, 1: 0 },
            f: {},
            b: {}
        };
        write(projects.coverage, "raw/out.json", JSON.stringify(data));

        const manualReport = { summary: { total: 2, passed: 2, failed: 0, skipped: 0, pending: 0, duration: 1 } };
        const plan: Array<{ name: string, cwd: string, args: string[], report?: any, watch?: any, tty?: boolean, stubSpawn?: boolean, env?: any }> = [
            { name: "help", cwd: projects.pass, args: [ "--help" ] },
            { name: "badOption", cwd: projects.pass, args: [ "--no-such-option" ] },
            { name: "pass", cwd: projects.pass, args: [ "test/**/*.test.ts", "--type-check", "--show-files", "--require", "./setup.js" ] },
            { name: "passAgain", cwd: projects.pass, args: [ "test/**/*.test.ts", "--type-check" ] },
            { name: "isolated", cwd: projects.pass, args: [ "test/**/*.test.ts", "--isolated-transpile", "--reporter", "dot" ] },
            { name: "noGrepMatch", cwd: projects.pass, args: [ "test/**/*.test.ts", "--grep", "nothing-matches-this" ] },
            { name: "noFiles", cwd: projects.pass, args: [ "nothing/**/*.test.ts", "--ignore", "**/skip/**" ] },
            { name: "server", cwd: projects.pass, args: [ "test/**/*.test.ts", "--server", "--bind-address", "127.0.0.1" ] },
            { name: "browserReporter", cwd: projects.pass, args: [ "test/**/*.test.ts", "--target", "browser", "--reporter", "./my-reporter.js" ] },
            { name: "fail", cwd: projects.fail, args: [ "test/**/*.test.ts", "--bail" ] },
            { name: "hookWarn", cwd: projects.hooks, args: [ "test/**/*.test.ts" ] },
            { name: "hookFail", cwd: projects.hooks, args: [ "test/**/*.test.ts", "--fail-on-hook" ] },
            { name: "typeError", cwd: projects.typeError, args: [ "test/**/*.test.ts", "--type-check" ] },
            { name: "scopeWarn", cwd: projects.scope, args: [ "test/**/*.test.ts", "--type-check" ] },
            { name: "scopeStrict", cwd: projects.scope, args: [ "test/**/*.test.ts", "--strict-type-check" ] },
            { name: "loadError", cwd: projects.loadError, args: [ "test/**/*.test.ts" ] },
            { name: "coverageReport", cwd: projects.coverage, args: [ "coverage-report", "--nyc-output-dir", "raw", "--coverage-reporter", "json-summary", "--erased-coverage-mode=full" ] },
            { name: "coverageReportBadMode", cwd: projects.coverage, args: [ "coverage-report", "--erased-coverage-mode", "bogus" ] },
            { name: "browserPuppeteer", cwd: projects.browser, args: [ "test/**/*.test.ts", "--target", "browser", "--type-check", "--require", "./test/setup.ts" ] },
            { name: "workerPuppeteer", cwd: projects.browser, args: [ "test/**/*.test.ts", "--target", "worker" ] },
            { name: "browserGraphThread", cwd: projects.browser, args: [ "test/**/*.test.ts", "--target", "browser", "--graph-thread" ] },
            { name: "browserManual", cwd: projects.browser, args: [ "test/**/*.test.ts", "--target", "browser", "--browser-launch", "manual" ], report: manualReport },
            { name: "browserNoServer", cwd: projects.browser, args: [ "test/**/*.test.ts", "--target", "browser", "--no-server" ] },
            { name: "browserPreloadPackage", cwd: projects.browser, args: [ "test/**/*.test.ts", "--target", "browser", "--require", "some-package" ] },
            { name: "workerPreloadMissing", cwd: projects.browser, args: [ "test/**/*.test.ts", "--target", "worker", "--require", "./missing-setup.ts" ] },
            { name: "browserNoFiles", cwd: projects.browser, args: [ "nothing/**/*.test.ts", "--target", "browser" ] },
            { name: "browserTty", cwd: projects.browser, args: [ "test/**/*.test.ts", "--target", "browser" ], tty: true },
            {
                name: "browserOpen",
                cwd: projects.browser,
                args: [ "test/**/*.test.ts", "--target", "worker", "--browser-launch", "open", "--no-server" ],
                report: manualReport,
                stubSpawn: true
            },
            { name: "watchBrowserNoServer", cwd: projects.browser, args: [ "test/**/*.test.ts", "--target", "browser", "--watch", "--no-server" ] },
            { name: "watchBrowserNoFiles", cwd: projects.browser, args: [ "nothing/**/*.test.ts", "--target", "browser", "--watch" ] },
            { name: "emptyRun", cwd: projects.empty, args: [ "test/**/*.test.ts" ] },
            { name: "noProject", cwd: projects.pass, args: [ "test/**/*.test.ts", "--type-check", "-p", "missing.json", "--slow", "50" ] },
            { name: "nodeTty", cwd: projects.pass, args: [ "test/**/*.test.ts" ], tty: true },
            // The browser target does not run tests with the runtime the CLI loads, so these can load any
            { name: "preferSource", cwd: projects.browser, args: [ "test/**/*.test.ts", "--target", "browser" ], env: { TRIPWIRE_PREFER_SOURCE: "1" } },
            { name: "noTripwireInstalled", cwd: projects.browserNoTripwire, args: [ "test/**/*.test.ts", "--target", "browser" ] },

            // Last, as the launcher leaves each of these waiting on its files once it has gone round
            {
                name: "watchNode",
                cwd: projects.watchNode,
                args: [ "test/**/*.test.ts", "--watch" ],
                watch: { edits: [ { file: "test/watch.test.ts", text: passing.replace("describe(\"passing\", () => {", "describe(\"passing\", () => {\n    it(\"was added\", () => {\n    });") } ] }
            },
            {
                name: "watchBrowser",
                cwd: projects.watchBrowser,
                args: [ "test/**/*.test.ts", "--target", "browser", "--watch", "--type-check", "--require", "./test/setup.ts" ],
                watch: {
                    edits: [
                        { file: "test/a.test.ts", text: BROWSER_TEST + "export const fixed: number = 1;\n" },
                        { file: "test/a.test.ts", text: BROWSER_TEST + BROKEN }
                    ]
                }
            }
        ];

        const planFile = write(scratch, "plan.json", JSON.stringify(plan));
        const resultsFile = path.join(scratch, "results.json");

        await new Promise<void>((resolve, reject) => {
            execFile(process.execPath, [ LAUNCHER, RUNNER_DIR, planFile, resultsFile ], { cwd: scratch, maxBuffer: 64 * 1024 * 1024 }, (error, stdout, stderr) => {
                if (error || !fs.existsSync(resultsFile)) {
                    reject(new Error("The CLI launcher failed: " + (error ? error.message : "no results") + "\n" + stdout + "\n" + stderr));
                    return;
                }

                resolve();
            });
        });

        const ran: IInvocation[] = JSON.parse(fs.readFileSync(resultsFile, "utf8"));
        results = {};
        plan.forEach((step, idx) => {
            results[step.name] = ran[idx];
        });
    });

    after(() => {
        if (scratch) {
            fs.rmSync(scratch, { recursive: true, force: true });
        }
    });

    describe("usage", () => {
        it("prints the usage for --help", () => {
            assert.equal(run("help").exitCode, 0);
            assert.includes(out("help"), "tripwire [options] <glob...>");
            assert.includes(out("help"), "coverage-report [--erased-coverage-mode <zero|full|ignore>]");
        });

        it("rejects an unknown option with the usage", () => {
            assert.equal(run("badOption").exitCode, 1);
            assert.includes(err("badOption"), "--no-such-option");
            assert.includes(out("badOption"), "tripwire [options] <glob...>");
        });
    });

    describe("node target", () => {
        it("type-checks, runs and summarises a passing project", () => {
            const text = out("pass");

            assert.equal(run("pass").exitCode, 0, err("pass"));
            assert.includes(text, "setup loaded");
            assert.includes(text, "Matched 1 file(s)");
            assert.includes(text, "  - test/pass.test.ts");
            assert.includes(text, "Type-checking TypeScript project: " + path.join(projects.pass, "tsconfig.json"));
            assert.includes(text, "Type-check completed in ");
            assert.includes(text, "Compile cache: rebuilt");
            assert.includes(text, "Run summary: total=2 passed=2 failed=0");
        });

        it("reuses the compile cache, skipping a clean type-check, when nothing changed", () => {
            assert.equal(run("passAgain").exitCode, 0, err("passAgain"));
            assert.includes(out("passAgain"), "Compile cache: reused -- nothing changed, type-check skipped");
            assert.includes(out("passAgain"), "Run summary: total=2 passed=2");
        });

        it("compiles each file on its own when asked, with the chosen reporter", () => {
            assert.equal(run("isolated").exitCode, 0, err("isolated"));
            assert.includes(out("isolated"), "Compile cache: isolated");
            assert.includes(out("isolated"), "Run summary: total=2 passed=2");
        });

        it("fails a run whose --grep matches nothing", () => {
            assert.equal(run("noGrepMatch").exitCode, 1);
            assert.includes(err("noGrepMatch"), "No tests matched --grep nothing-matches-this. Check the pattern, or drop it to run the full suite.");
        });

        it("reports patterns that match no files as a user error", () => {
            assert.equal(run("noFiles").exitCode, 1);
            assert.includes(err("noFiles"), "No files matched: nothing/**/*.test.ts");
            assert.includes(err("noFiles"), "Files matching --ignore were excluded: **/skip/**");
        });

        it("runs with the embedded server when asked", () => {
            assert.equal(run("server").exitCode, 0, err("server"));
            assert.includes(out("server"), "Run summary: total=2 passed=2");
        });

        it("fails a run with a failing test, stopping at the first with --bail", () => {
            assert.equal(run("fail").exitCode, 1);
            assert.includes(out("fail"), "failed=1");
            assert.isFalse(out("fail").indexOf("passed=1") !== -1, "the test after the failure did not pass");
        });

        it("warns about a failing hook, and fails the run on one with --fail-on-hook", () => {
            assert.equal(run("hookWarn").exitCode, 0, err("hookWarn"));
            assert.includes(out("hookWarn"), "1 hook failed during this run -- run with --fail-on-hook to fail the run on them.");

            assert.equal(run("hookFail").exitCode, 1);
            assert.includes(out("hookFail"), "Hook failures (1 hook):");
            assert.includes(err("hookFail"), "teardown broke");
            assert.includes(err("hookFail"), "Run failed: 1 hook failed (--fail-on-hook).");
        });

        it("fails the run on a type error with --type-check", () => {
            assert.equal(run("typeError").exitCode, 1);
            assert.includes(err("typeError"), "TypeScript compile failed with 1 error(s)");
            assert.includes(err("typeError"), "TS2322");
        });

        it("warns when matched files are outside the type-checked project, and fails with --strict-type-check", () => {
            assert.equal(run("scopeWarn").exitCode, 0, err("scopeWarn"));
            assert.includes(err("scopeWarn"), "Warning: ");
            assert.includes(err("scopeWarn"), "b.test.ts");

            assert.equal(run("scopeStrict").exitCode, 1);
            assert.includes(err("scopeStrict"), "Type-check scope: ");
        });

        it("re-runs with --watch when a test file changes", () => {
            const text = out("watchNode");

            assert.includes(text, "Run summary: total=2 passed=2");
            assert.includes(text, "Run summary: total=3 passed=3", "the edited file was loaded again");
            assert.equal(text.split("Watching ").length - 1, 2);
            assert.includes(text, "for changes... (Ctrl+C to stop)");
        });

        it("fails a run whose files register no tests", () => {
            assert.equal(run("emptyRun").exitCode, 1);
            assert.includes(err("emptyRun"), "No tests were executed. Verify imports resolve to the same tripwire runtime and that your files register tests.");
        });

        it("warns when the project to type-check against cannot be read", () => {
            assert.equal(run("noProject").exitCode, 0, err("noProject"));
            assert.includes(err("noProject"), "the type-check covered no files: missing.json could not be read.");
            assert.includes(err("noProject"), "Use --strict-type-check to fail the run instead of warning.");
            assert.includes(out("noProject"), "Run summary: total=2 passed=2");
        });

        it("runs with the reporters writing to a terminal", () => {
            assert.equal(run("nodeTty").exitCode, 0, err("nodeTty"));
            assert.includes(out("nodeTty"), "Run summary: total=2 passed=2");
        });

        it("reports a test file that throws while loading", () => {
            assert.equal(run("loadError").exitCode, 1);
            assert.includes(err("loadError"), "broken at load");
        });
    });

    describe("browser and worker targets", () => {
        it("type-checks, builds and runs the browser target through puppeteer", () => {
            const text = out("browserPuppeteer");

            assert.equal(run("browserPuppeteer").exitCode, 0, err("browserPuppeteer"));
            assert.includes(text, "Matched 2 file(s)");
            assert.includes(text, "Type-checking TypeScript project: " + path.join(projects.browser, "tsconfig.json"));
            assert.includes(text, "Launching browser target via Puppeteer...");
            assert.includes(text, "Module graph: ");
            assert.includes(text, "Ready to run tests after ");
            assert.includes(text, "Run summary: total=1 passed=1 failed=0");
        });

        it("fails a worker run whose page reports a failure", () => {
            assert.equal(run("workerPuppeteer").exitCode, 1);
            assert.includes(out("workerPuppeteer"), "Launching worker target via Puppeteer...");
            assert.includes(out("workerPuppeteer"), "failed=1");
        });

        it("builds the graph on the main thread when the graph thread cannot", () => {
            assert.equal(run("browserGraphThread").exitCode, 0, err("browserGraphThread"));
            assert.includes(out("browserGraphThread"), "Run summary: total=1 passed=1");
        });

        it("serves a manual launch until the page reports its results", () => {
            const text = out("browserManual");

            assert.equal(run("browserManual").exitCode, 0, err("browserManual"));
            assert.includes(text, "Launching browser target via browser UI (mode: manual, style: classic)...");
            assert.includes(text, "Ready after ");
            assert.includes(text, "Open this URL in your browser to start the run: http://127.0.0.1:");
            assert.includes(text, "Run summary: total=2 passed=2");
        });

        it("rejects running without the server, a package preload, a missing preload file and patterns matching nothing", () => {
            assert.equal(run("browserNoServer").exitCode, 1);
            assert.includes(err("browserNoServer"), "--no-server is not supported for browser target when --browser-launch is 'puppeteer'.");

            assert.equal(run("browserPreloadPackage").exitCode, 1);
            assert.includes(err("browserPreloadPackage"), "Browser/worker preload currently supports file paths only. Unsupported preload module: some-package");

            assert.equal(run("workerPreloadMissing").exitCode, 1);
            assert.includes(err("workerPreloadMissing"), "Preload file not found: " + path.join(projects.browser, "missing-setup.ts"));

            assert.equal(run("browserNoFiles").exitCode, 1);
            assert.includes(err("browserNoFiles"), "No files matched: nothing/**/*.test.ts");
        });

        it("re-runs the browser target through puppeteer as its files change, through compile failures", () => {
            const text = out("watchBrowser");

            assert.includes(text, "Matched 2 file(s)", "the preload and the test");
            assert.includes(text, "Launching browser target via Puppeteer (--watch)...");
            assert.equal(text.split("Compile failed: TypeScript compile failed with 1 error(s)").length - 1, 2, "before the fix and after breaking it again");
            assert.equal(text.split("Run summary: total=1 passed=1").length - 1, 1, "a run once it was fixed");
            assert.equal(text.split("Watching ").length - 1, 3);
        });

        it("rejects a watch without the server, or with patterns matching nothing", () => {
            assert.equal(run("watchBrowserNoServer").exitCode, 1);
            assert.includes(err("watchBrowserNoServer"), "--no-server is not supported for browser target when --browser-launch is 'puppeteer'.");

            assert.equal(run("watchBrowserNoFiles").exitCode, 1);
            assert.includes(err("watchBrowserNoFiles"), "No files matched: nothing/**/*.test.ts");
        });

        it("opens the system browser for an open launch, keeping the server it needs", () => {
            const invocation = run("browserOpen");

            assert.equal(invocation.exitCode, 0, err("browserOpen"));
            assert.includes(err("browserOpen"), "Ignoring --no-server because --browser-launch open requires the server to be running.");
            assert.includes(out("browserOpen"), "Launching worker target via browser UI (mode: open, style: classic)...");
            assert.includes(out("browserOpen"), "Opening browser via OS default handler...");
            assert.equal(invocation.spawned.length, 1);
            assert.includes(invocation.spawned[0].join(" "), "/__tripwire__/worker");
            assert.includes(out("browserOpen"), "Run summary: total=2 passed=2");
        });

        it("loads tripwire from the project's own sources when asked to prefer them", () => {
            assert.equal(run("preferSource").exitCode, 0, err("preferSource"));
            assert.includes(out("preferSource"), "Run summary: total=1 passed=1");
        });

        it("falls back to tripwire's sources when the project has none installed", () => {
            assert.equal(run("noTripwireInstalled").exitCode, 0, err("noTripwireInstalled"));
            assert.includes(out("noTripwireInstalled"), "Run summary: total=1 passed=1");
        });

        it("runs with progress output when stdout is a terminal", () => {
            assert.equal(run("browserTty").exitCode, 0, err("browserTty"));
            assert.includes(out("browserTty"), "Run summary: total=1 passed=1");
        });

        it("rejects a custom reporter module for the browser target", () => {
            assert.equal(run("browserReporter").exitCode, 1);
            assert.includes(err("browserReporter"), "Custom reporter module './my-reporter.js' is not supported for the browser target.");
        });
    });

    describe("coverage-report", () => {
        it("reprints the nyc report with the erased coverage mode applied", () => {
            assert.equal(run("coverageReport").exitCode, 0, err("coverageReport"));

            const summary = JSON.parse(fs.readFileSync(path.join(projects.coverage, "coverage", "coverage-summary.json"), "utf8"));
            assert.equal(summary.total.statements.pct, 50);
        });

        it("rejects an unknown erased coverage mode", () => {
            assert.equal(run("coverageReportBadMode").exitCode, 1);
            assert.includes(err("coverageReportBadMode"), "Invalid --erased-coverage-mode 'bogus'. Expected zero, full, or ignore.");
        });
    });
});
