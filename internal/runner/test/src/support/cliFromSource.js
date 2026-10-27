/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

/*
 * Runs the tripwire CLI from the runner's TypeScript sources, rather than from the bundle the runner's
 * own tests run under, so a coverage run that spawns it measures src/tripwire.ts and src/execute.
 *
 *   node cliFromSource.js <runner folder> <plan.json> <results.json>
 *
 * The plan is a list of { cwd, args, report? } invocations. They run one after another in this one
 * process, the way --watch re-runs, so the runner's sources are only compiled once. What each invocation
 * logged, and the exit code it left, are written to the results file.
 *
 * `report` plays the part of the person at the browser for an open or manual launch: once the CLI
 * prints its runner URL, the runner page is loaded, which builds its tests, and `report` is posted
 * to that server as the page's results.
 *
 * `env` sets environment variables for the step only.
 * `tty` makes stdout look like a terminal for the step, which turns on the progress output.
 * `stubSpawn` keeps an open launch from starting the system browser: its spawn calls are recorded
 * in the step's results as `spawned` instead.
 *
 * `watch` drives a --watch run, which never returns: { edits: [ { file, text } ] }. Each time the run
 * says it is watching, the next edit is written, relative to `cwd`, and the run goes round again. Once
 * it is watching after the last edit, the launcher moves on and leaves that run waiting, so a watch
 * step's exit code means nothing. The launcher exits once every step is done.
 */
"use strict";

const fs = require("fs");
const http = require("http");
const path = require("path");

const runnerDir = process.argv[2];
const plan = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const resultsFile = process.argv[4];
const extensions = require.extensions;

// The browser UX imports its templates and icon as modules, which the rollup build inlines as strings
function _textModule(ext, read) {
    extensions[ext] = function (module, filename) {
        module.exports = read(filename);
    };
}

_textModule(".html", (filename) => fs.readFileSync(filename, "utf8"));
_textModule(".css", (filename) => fs.readFileSync(filename, "utf8"));
_textModule(".ico", (filename) => fs.readFileSync(filename).toString("base64"));

// A throwaway transpile, just long enough to load the runner's own compile module, which then installs
// the real hook over the runner's test project -- a whole-program compile, as the runner's own tests
// get, so the const enums it imports from core are inlined.
//
// Under nyc, `.ts` already has nyc's instrumenting wrapper. The throwaway hook is set *past* that
// wrapper, so this bootstrap copy is never measured: compiled differently, it would not line up with
// the coverage of the same files compiled by the real hook. nyc's wrapper is then put back before the
// real hook is installed, and the bootstrap copy dropped from the cache, so every runner file that is
// measured is compiled one way.
const ts = require(require.resolve("typescript", { paths: [ runnerDir ] }));
const srcDir = path.join(runnerDir, "src");
const nycTsHook = Object.getOwnPropertyDescriptor(extensions, ".ts");

Object.defineProperty(extensions, ".ts", {
    configurable: true,
    enumerable: true,
    writable: true,
    value: function (module, filename) {
        const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
            compilerOptions: {
                module: ts.ModuleKind.CommonJS,
                target: ts.ScriptTarget.ES2018,
                esModuleInterop: true
            },
            fileName: filename
        });

        module._compile(output.outputText, filename);
    }
});

const bootCompile = require(path.join(srcDir, "compile/tsCompile.ts"));

if (nycTsHook) {
    Object.defineProperty(extensions, ".ts", nycTsHook);
} else {
    delete extensions[".ts"];
}

Object.keys(require.cache).forEach((key) => {
    if (key.indexOf(srcDir) === 0) {
        delete require.cache[key];
    }
});

bootCompile.registerTypeScriptHook(path.join(runnerDir, "test/tsconfig.test.json"), runnerDir);

const cliPath = path.join(runnerDir, "src/tripwire.ts");
const cli = require(cliPath);

function _format(args) {
    return Array.prototype.map.call(args, (arg) => (arg && arg.stack) ? arg.stack : String(arg)).join(" ");
}

// Loads the runner page at `runnerUrl`, as a browser would, then posts `report` as its run's results
function _postReport(runnerUrl, report) {
    const target = new URL(runnerUrl);
    const body = JSON.stringify(report);

    function send(method, reqPath, data, done) {
        const req = http.request({
            host: target.hostname,
            port: target.port,
            method: method,
            path: reqPath,
            agent: false,
            headers: data ? { "content-type": "application/json", "content-length": Buffer.byteLength(data) } : {}
        }, (res) => {
            res.resume();
            res.on("end", done);
        });

        req.on("error", () => {
            // The run then never completes, and the test waiting on it times out with the output so far
        });
        req.end(data);
    }

    send("GET", target.pathname, null, () => send("POST", "/api/result", body, () => {}));
}

// Forget the modules an invocation loaded from its project, so the next run registers its tests again
function _forgetProject(cwd) {
    const prefix = path.resolve(cwd);
    Object.keys(require.cache).forEach((key) => {
        if (key.indexOf(prefix) === 0 && key.indexOf("node_modules") === -1) {
            delete require.cache[key];
        }
    });
}

(async function () {
    const results = [];
    const orgConsole = { log: console.log, warn: console.warn, error: console.error };

    for (let lp = 0; lp < plan.length; lp++) {
        const step = plan[lp];
        const out = [];
        const err = [];
        const edits = (step.watch && step.watch.edits) || [];
        let reported = false;
        let watching = 0;
        let watchDone = null;
        const watched = step.watch ? new Promise((resolve) => {
            watchDone = resolve;
        }) : null;

        console.log = function () {
            const text = _format(arguments);
            const at = text.indexOf("Runner URL: ");
            if (step.report && !reported && at !== -1) {
                reported = true;
                _postReport(text.substring(at + "Runner URL: ".length).trim(), step.report);
            }

            if (watched && text.indexOf("Watching ") !== -1) {
                watching++;
                if (watching > edits.length) {
                    watchDone();
                } else {
                    // The run starts its file watcher straight after saying so -- give it a moment
                    const edit = edits[watching - 1];
                    setTimeout(() => fs.writeFileSync(path.resolve(step.cwd, edit.file), edit.text, "utf8"), 500);
                }
            }

            out.push(text);
        };
        console.warn = function () {
            err.push(_format(arguments));
        };
        console.error = function () {
            err.push(_format(arguments));
        };

        process.chdir(step.cwd);
        process.argv = [ process.argv[0], cliPath ].concat(step.args);
        process.exitCode = undefined;

        const orgEnv = {};
        Object.keys(step.env || {}).forEach((name) => {
            orgEnv[name] = process.env[name];
            process.env[name] = step.env[name];
        });

        const orgIsTTY = process.stdout.isTTY;
        if (step.tty) {
            process.stdout.isTTY = true;
        }

        const childProcess = require("child_process");
        const orgSpawn = childProcess.spawn;
        const spawned = [];
        if (step.stubSpawn) {
            childProcess.spawn = function (command, args) {
                spawned.push([ command ].concat(args || []));

                return { unref: () => {} };
            };
        }

        try {
            const running = cli.main();
            await (watched ? Promise.race([ running, watched ]) : running);
        } catch (e) {
            err.push("launcher: " + _format([ e ]));
        }

        console.log = orgConsole.log;
        console.warn = orgConsole.warn;
        console.error = orgConsole.error;
        process.stdout.isTTY = orgIsTTY;
        childProcess.spawn = orgSpawn;
        Object.keys(orgEnv).forEach((name) => {
            if (orgEnv[name] === undefined) {
                delete process.env[name];
            } else {
                process.env[name] = orgEnv[name];
            }
        });

        results.push({ args: step.args, exitCode: process.exitCode === undefined ? 0 : process.exitCode, out: out, err: err, spawned: spawned });
        process.exitCode = undefined;
        _forgetProject(step.cwd);
    }

    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2), "utf8");

    // A watch step's run is still waiting on its files
    process.exit(0);
})();
