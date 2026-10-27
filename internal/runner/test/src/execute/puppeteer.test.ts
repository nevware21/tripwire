/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import "../support/textImports";
import * as fs from "fs";
import * as http from "http";
import * as os from "os";
import * as path from "path";
import { replaceAnsi } from "@nevware21/chromacon";
import { assert } from "@nevware21/tripwire";
import { IBrowserWorkerModuleGraph } from "../../../src/execute/browser";
import { _launchPuppeteerBrowser, _runPuppeteerTarget, _warmUpPuppeteerBrowser } from "../../../src/execute/puppeteer";
import { _isUserError, _userErrorHints } from "../../../src/internal/userError";

function post(url: string, body: string): Promise<number> {
    const target = new URL(url);

    return new Promise((resolve, reject) => {
        const req = http.request({
            host: target.hostname,
            port: target.port,
            method: "POST",
            path: target.pathname,
            agent: false,
            headers: { "content-type": "application/json", "content-length": Buffer.byteLength(body) }
        }, (res) => {
            res.resume();
            res.on("end", () => resolve(res.statusCode));
        });

        req.on("error", reject);
        req.end(body);
    });
}

interface IFakeBrowser {
    visited: string[];
    closed: number;
    newPages: number;
    pages(): Promise<any[]>;
    newPage(): Promise<any>;
    close(): Promise<void>;
}

/**
 * A stand-in for a puppeteer browser. Its page sends the given console messages and then, like the
 * runner page would, reports `result` to the server it was pointed at.
 */
function fakeBrowser(options: { result?: any, gotoError?: Error, hasPage?: boolean, closeError?: Error, messages?: any[], loadedAfterMs?: number }): IFakeBrowser {
    const listeners: Array<(msg: any) => void> = [];
    const page = {
        on: (event: string, listener: (msg: any) => void) => {
            if (event === "console") {
                listeners.push(listener);
            }
        },
        goto: async (url: string) => {
            browser.visited.push(url);
            (options.messages || []).forEach((msg) => listeners.forEach((listener) => listener(msg)));
            if (options.gotoError) {
                throw options.gotoError;
            }

            await post(new URL(url).origin + "/api/result", JSON.stringify(options.result));
            if (options.loadedAfterMs) {
                // The page reported before puppeteer saw it finish loading
                await new Promise((resolve) => setTimeout(resolve, options.loadedAfterMs));
            }
        }
    };

    const browser: IFakeBrowser = {
        visited: [],
        closed: 0,
        newPages: 0,
        pages: async () => options.hasPage === false ? [] : [ page ],
        newPage: async () => {
            browser.newPages++;
            return page;
        },
        close: async () => {
            browser.closed++;
            if (options.closeError) {
                throw options.closeError;
            }
        }
    };

    return browser;
}

/**
 * Running the browser and worker targets headless: the runner's session is started for real on
 * loopback, and a stand-in browser plays the part of puppeteer's.
 */
describe("execute puppeteer", function () {
    this.timeout(60000);

    let logs: string[];
    let orgLog: typeof console.log;

    const graph: IBrowserWorkerModuleGraph = {
        modules: { "/proj/test/a.test.js": "exports.a = 1;\n" },
        entryIds: [ "/proj/test/a.test.js" ],
        tripwireModuleId: "/__tripwire__/tripwire.js",
        coverageOnlyIds: [],
        moduleUrls: { "/proj/test/a.test.js": "/test/a.test.js" },
        rawAssets: {},
        elapsedMs: 0
    };
    const graphs = { browser: graph, worker: graph };

    beforeEach(() => {
        logs = [];
        orgLog = console.log;
        console.log = (...args: any[]) => {
            logs.push(replaceAnsi(args.join(" "), ""));
        };
    });

    afterEach(() => {
        console.log = orgLog;
    });

    describe("_runPuppeteerTarget", () => {
        it("opens the target's page to finish on its own and resolves with the reported summary", async () => {
            const browser = fakeBrowser({ result: { summary: { passed: 3 } } });

            const result = await _runPuppeteerTarget("browser", graphs, { bindAddress: "127.0.0.1" }, Promise.resolve(browser));

            assert.deepEqual(result.summary, { passed: 3 });
            assert.isTrue(result.testMs >= 0);
            assert.isTrue(/^http:\/\/127\.0\.0\.1:\d+\/__tripwire__\/browser\?autofinish=1$/.test(browser.visited[0]), browser.visited[0]);
            assert.equal(browser.closed, 1);
        });

        it("opens a new page for the worker target when the browser has none", async () => {
            const browser = fakeBrowser({ result: { summary: { passed: 1 } }, hasPage: false });

            await _runPuppeteerTarget("worker", graphs, { bindAddress: "127.0.0.1" }, Promise.resolve(browser));

            assert.equal(browser.newPages, 1);
            assert.includes(browser.visited[0], "/__tripwire__/worker?autofinish=1");
        });

        it("prints the page's console messages", async () => {
            const browser = fakeBrowser({ result: { summary: {} }, messages: [ { text: () => "from the page" }, { text: () => "" }, "a bare message" ] });

            await _runPuppeteerTarget("browser", graphs, { bindAddress: "127.0.0.1" }, Promise.resolve(browser));

            assert.includes(logs.join("\n"), "from the page");
            assert.includes(logs.join("\n"), "a bare message");
        });

        it("writes the coverage the page reports for the target", async () => {
            const project = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "tripwire-puppeteer-coverage-")));
            const covered = path.join(project, "src", "a.js");
            const coverage: any = {};
            coverage[covered] = {
                path: covered,
                statementMap: { 0: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } } },
                fnMap: {},
                branchMap: {},
                s: { 0: 1 },
                f: {},
                b: {}
            };
            const browser = fakeBrowser({ result: { summary: { passed: 1 }, coverage: coverage } });
            const orgCwd = process.cwd();
            const orgWarn = console.warn;

            // The coverage is written under the working directory
            process.chdir(project);
            console.warn = () => {};
            try {
                await _runPuppeteerTarget("worker", graphs, { bindAddress: "127.0.0.1", coverage: true, coverageReporters: [ "json-summary" ] }, Promise.resolve(browser));
                const written = JSON.parse(fs.readFileSync(path.join(project, "coverage", "worker", "coverage-final.json"), "utf8"));

                assert.deepEqual(Object.keys(written), [ covered ]);
            } finally {
                process.chdir(orgCwd);
                console.warn = orgWarn;
                fs.rmSync(project, { recursive: true, force: true });
            }
        });

        it("writes no coverage when the page reports none", async () => {
            const browser = fakeBrowser({ result: { summary: { passed: 1 } } });

            const result = await _runPuppeteerTarget("browser", graphs, { bindAddress: "127.0.0.1", coverage: true }, Promise.resolve(browser));

            assert.deepEqual(result.summary, { passed: 1 });
            assert.isTrue(result.reportMs >= 0);
        });

        it("closes the browser and passes the failure on when the page cannot be loaded", async () => {
            const browser = fakeBrowser({ gotoError: new Error("navigation failed"), closeError: new Error("already closed") });

            let failure: any = null;
            try {
                await _runPuppeteerTarget("browser", graphs, { bindAddress: "127.0.0.1" }, Promise.resolve(browser));
            } catch (e) {
                failure = e;
            }

            assert.equal(failure && failure.message, "navigation failed");
            assert.equal(browser.closed, 1, "a failure to close is not reported over the real one");
        });

        it("passes on a failed run the page reports", async () => {
            const browser = fakeBrowser({ result: { error: "the page crashed" } });

            let failure: any = null;
            try {
                await _runPuppeteerTarget("browser", graphs, { bindAddress: "127.0.0.1" }, Promise.resolve(browser));
            } catch (e) {
                failure = e;
            }

            assert.equal(failure && failure.message, "the page crashed");
        });

        it("passes on a failure the page reports before it has finished loading", async () => {
            const browser = fakeBrowser({ result: { error: "failed while loading" }, loadedAfterMs: 100 });

            let failure: any = null;
            try {
                await _runPuppeteerTarget("browser", graphs, { bindAddress: "127.0.0.1" }, Promise.resolve(browser));
            } catch (e) {
                failure = e;
            }

            assert.equal(failure && failure.message, "failed while loading");
            assert.equal(browser.closed, 1);
        });
    });

    describe("_launchPuppeteerBrowser", () => {
        let project: string;

        // A stand-in puppeteer package in the project, which is looked in before the runner's own
        function fakePackage(name: string, source: string): void {
            const dir = path.join(project, "node_modules", name);
            fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: name, version: "0.0.0", main: "index.js" }), "utf8");
            fs.writeFileSync(path.join(dir, "index.js"), source, "utf8");
        }

        async function launchFailure(): Promise<any> {
            try {
                await _launchPuppeteerBrowser(project);
            } catch (e) {
                return e;
            }

            return null;
        }

        const LAUNCH = "exports.launch = (options) => Promise.resolve({ launchedWith: options });\n";

        beforeEach(() => {
            project = fs.mkdtempSync(path.join(os.tmpdir(), "tripwire-puppeteer-load-"));
        });

        afterEach(() => {
            fs.rmSync(project, { recursive: true, force: true });
        });

        it("launches headless Chrome through the project's puppeteer", async () => {
            fakePackage("puppeteer", LAUNCH);

            const browser = await _launchPuppeteerBrowser(project);

            assert.isTrue(browser.launchedWith.headless);
            assert.includes(browser.launchedWith.args.join(" "), "--no-sandbox");
            assert.includes(browser.launchedWith.args.join(" "), "--disable-web-security");
        });

        it("imports a puppeteer that cannot be required", async () => {
            // Refuses require() the first time it loads, as an ES module puppeteer does on an older Node
            const key = "__tripwireFakePuppeteer" + Math.random().toString(36).substring(2);
            fakePackage("puppeteer", [
                "if (!globalThis." + key + ") {",
                "    globalThis." + key + " = true;",
                "    const e = new Error(\"require() of ES Module not supported\");",
                "    e.code = \"ERR_REQUIRE_ESM\";",
                "    throw e;",
                "}",
                LAUNCH
            ].join("\n"));

            const browser = await _launchPuppeteerBrowser(project);

            assert.isTrue(browser.launchedWith.headless);
        });

        it("reports a puppeteer that can be neither required nor imported as a user error", async () => {
            fakePackage("puppeteer", "const e = new Error(\"require() of ES Module not supported\\nmore detail\");\ne.code = \"ERR_REQUIRE_ASYNC_MODULE\";\nthrow e;\n");

            const failure = await launchFailure();

            assert.isTrue(_isUserError(failure));
            assert.includes(failure.message, "'puppeteer' is installed but could not be loaded on Node.js " + process.version + ": require() of ES Module not supported");
            assert.isFalse(failure.message.indexOf("more detail") !== -1, "only the first line of the cause");
            assert.includes(_userErrorHints(failure)[0], "Check that the installed puppeteer supports this Node.js version.");
        });

        it("reports the first install that fails to load, after trying puppeteer-core", async () => {
            fakePackage("puppeteer", "throw new Error(\"puppeteer is broken\");\n");
            fakePackage("puppeteer-core", "throw new Error(\"puppeteer-core is broken too\");\n");

            const failure = await launchFailure();

            assert.isTrue(_isUserError(failure));
            assert.includes(failure.message, "'puppeteer' is installed but could not be loaded");
            assert.includes(failure.message, "puppeteer is broken");
        });

        it("falls back to puppeteer-core when puppeteer cannot be loaded", async () => {
            fakePackage("puppeteer", "throw new Error(\"puppeteer is broken\");\n");
            fakePackage("puppeteer-core", LAUNCH);

            const browser = await _launchPuppeteerBrowser(project);

            assert.isTrue(browser.launchedWith.headless);
        });
    });

    describe("_warmUpPuppeteerBrowser", () => {
        it("loads a page in the browser's first tab, or a new one", async () => {
            const visited: string[] = [];
            const page = { goto: async (url: string) => {
                visited.push(url);
            } };
            let created = 0;

            await _warmUpPuppeteerBrowser({ pages: async () => [ page ], newPage: async () => page });
            await _warmUpPuppeteerBrowser({ pages: async (): Promise<any[]> => [], newPage: async () => {
                created++;
                return page;
            } });

            assert.deepEqual(visited, [ "http://127.0.0.1:1/", "http://127.0.0.1:1/" ]);
            assert.equal(created, 1);
        });

        it("ignores a failure, which only means the warm-up did not help", async () => {
            await _warmUpPuppeteerBrowser({ pages: async () => [ { goto: async () => {
                throw new Error("connection refused");
            } } ] });
            await _warmUpPuppeteerBrowser({ pages: async () => {
                throw new Error("browser closed");
            } });
        });
    });
});
