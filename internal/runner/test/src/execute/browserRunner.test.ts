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
import { createRequire } from "module";
import { replaceAnsi } from "@nevware21/chromacon";
import { assert } from "@nevware21/tripwire";
import { IBrowserWorkerModuleGraph, IGraphBuilders, _runInteractiveBrowserTarget } from "../../../src/execute/browser";
import { _startBrowserRunnerSession, IBrowserRunnerSession } from "../../../src/execute/browserRunner";
import { IServer } from "../../../src/interfaces/IServer";

interface IResponse {
    status: number;
    headers: http.IncomingHttpHeaders;
    raw: Buffer;
    body: string;
}

function send(server: IServer, method: string, reqPath: string, body?: string): Promise<IResponse> {
    const target = new URL(server.url);

    return new Promise((resolve, reject) => {
        const req = http.request({
            host: target.hostname,
            port: target.port,
            method: method,
            path: reqPath,
            agent: false,
            headers: body !== undefined ? { "content-type": "application/json", "content-length": Buffer.byteLength(body) } : undefined
        }, (res) => {
            const chunks: Buffer[] = [];
            res.on("data", (chunk: Buffer) => chunks.push(chunk));
            res.on("end", () => {
                const raw = Buffer.concat(chunks);
                resolve({ status: res.statusCode, headers: res.headers, raw: raw, body: raw.toString("utf8") });
            });
            res.on("error", reject);
        });

        req.on("error", reject);
        req.end(body);
    });
}

function inlineMap(map: any): string {
    return "\n//# sourceMappingURL=data:application/json;base64," + Buffer.from(JSON.stringify(map)).toString("base64");
}

/**
 * The interactive browser and worker runner: a real server on loopback, serving the runner pages, the
 * compiled module graph (bundled or one asset per module), the run payload, and the results the page
 * reports back.
 */
describe("execute browserRunner", function () {
    this.timeout(60000);

    let scratch: string;
    let logs: string[];
    let orgLog: typeof console.log;

    function write(name: string, text: string): string {
        const file = path.join(scratch, name);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, text, "utf8");

        return file;
    }

    // An entry test requiring a helper with a source map, and a vendor file served from disk. Module
    // ids use forward slashes, as the graph builder writes them.
    function makeGraph(): IBrowserWorkerModuleGraph {
        const entry = write("test/a.test.js", "").split(path.sep).join("/");
        const helper = write("src/helper.js", "module.exports = 1;\n").split(path.sep).join("/");
        const vendor = write("node_modules/vendor/index.js", "module.exports = \"vendor\";\n");
        const modules: Record<string, string> = {};
        const moduleUrls: Record<string, string> = {};

        modules[entry] = "const helper = require(" + JSON.stringify(helper) + ");\nexports.a = helper;\n";
        modules[helper] = "module.exports = 1;\n" + inlineMap({ version: 3, sources: [ "helper.ts" ], sourcesContent: [ "export = 1;" ], names: [], mappings: "AAAA" });
        moduleUrls[entry] = "/test/a.test.js";
        moduleUrls[helper] = "/src/helper.js";

        return {
            modules: modules,
            entryIds: [ entry ],
            tripwireModuleId: "/__tripwire__/tripwire.js",
            coverageOnlyIds: [],
            moduleUrls: moduleUrls,
            rawAssets: { "/node_modules/vendor/index.js": vendor },
            elapsedMs: 1
        };
    }

    function builders(graph: IBrowserWorkerModuleGraph, watch?: boolean): IGraphBuilders & { builds: string[] } {
        const builds: string[] = [];

        return {
            builds: builds,
            resolveEntryFiles: () => graph.entryIds.slice(0),
            buildGraph: (target) => {
                builds.push(target);
                return graph;
            },
            watch: !!watch
        };
    }

    // Runs one session with the console captured, always stopping its server
    async function withSession(parsed: any, graphBuilders: IGraphBuilders, fn: (session: IBrowserRunnerSession) => Promise<void>): Promise<void> {
        const session = await _startBrowserRunnerSession(graphBuilders, Object.assign({ bindAddress: "127.0.0.1" }, parsed));
        try {
            await fn(session);
        } finally {
            await Promise.resolve(session.server.stop());
            session.dispose();
        }
    }

    beforeEach(() => {
        scratch = fs.mkdtempSync(path.join(os.tmpdir(), "tripwire-browser-runner-"));
        logs = [];
        orgLog = console.log;
        console.log = (...args: any[]) => {
            logs.push(replaceAnsi(args.join(" "), ""));
        };
    });

    afterEach(() => {
        console.log = orgLog;
        fs.rmSync(scratch, { recursive: true, force: true });
    });

    describe("_startBrowserRunnerSession", () => {
        it("serves the runner page for each target, isolated from other origins", async () => {
            await withSession({ browserStyle: "slate" }, builders(makeGraph()), async (session) => {
                const home = await send(session.server, "GET", "/");
                const browser = await send(session.server, "GET", "/__tripwire__/browser");
                const worker = await send(session.server, "GET", "/__tripwire__/worker");

                assert.includes(home.body, "<a href=\"/__tripwire__/browser\">Browser</a>", "the home page links to each runner");
                assert.equal(browser.status, 200);
                assert.equal(browser.headers["content-type"], "text/html; charset=utf-8");
                assert.equal(browser.headers["cross-origin-opener-policy"], "same-origin");
                assert.includes(browser.body, "Tripwire Browser Runner");
                assert.includes(browser.body, "style-slate");
                assert.includes(worker.body, "Tripwire Worker Runner");
                assert.includes(logs.join("\n"), "Server URL: " + session.server.url);
            });
        });

        it("opens the runner page as --browser-theme says", async () => {
            await withSession({ browserTheme: { scheme: "dim", zoom: 150 } }, builders(makeGraph()), async (session) => {
                const browser = await send(session.server, "GET", "/__tripwire__/browser");

                assert.includes(browser.body, "data-default-theme=\"dim\" data-default-zoom=\"150\">");
            });
        });

        it("serves the test frame, loading the bundle only for the browser target", async () => {
            await withSession({}, builders(makeGraph()), async (session) => {
                const browser = await send(session.server, "GET", "/__tripwire__/test-frame");
                const worker = await send(session.server, "GET", "/__tripwire__/test-frame?target=worker");

                assert.equal(browser.headers["cross-origin-opener-policy"], "same-origin");
                assert.includes(browser.body, "<script src=\"/__tripwire__/bundle-browser.js\" defer></script>");
                assert.includes(browser.body, "/__tripwire__/runner-client.js");
                assert.isFalse(worker.body.indexOf("bundle-browser.js") !== -1);
            });
        });

        it("serves the modules as one bundle per target, with the merged map", async () => {
            await withSession({}, builders(makeGraph()), async (session) => {
                assert.equal((await send(session.server, "GET", "/__tripwire__/bundle-browser.js")).status, 404, "not built until the page is used");
                await send(session.server, "GET", "/__tripwire__/browser");
                const bundle = await send(session.server, "GET", "/__tripwire__/bundle-browser.js");
                const map = await send(session.server, "GET", "/__tripwire__/bundle-browser.js.map");

                assert.equal(bundle.headers["content-type"], "application/javascript; charset=utf-8");
                assert.includes(bundle.body, "__tripwireDefine__(\"/test/a.test.js\"");
                assert.includes(bundle.body, "require(\"/src/helper.js\")");
                assert.equal(map.headers["content-type"], "application/json; charset=utf-8");
                assert.deepEqual(JSON.parse(map.body).sources, [ "/src/helper.ts" ]);

                assert.equal((await send(session.server, "GET", "/__tripwire__/bundle-worker.js")).status, 404, "not built until the worker page is used");
                await send(session.server, "GET", "/__tripwire__/worker");
                assert.includes((await send(session.server, "GET", "/__tripwire__/bundle-worker.js")).body, "__tripwireDefine__");
            });
        });

        it("serves each module on its own when bundling is off", async () => {
            await withSession({ bundle: false }, builders(makeGraph()), async (session) => {
                const frame = await send(session.server, "GET", "/__tripwire__/test-frame");
                const entry = await send(session.server, "GET", "/test/a.test.js");
                const map = await send(session.server, "GET", "/src/helper.js.map");
                const payload = JSON.parse((await send(session.server, "GET", "/api/payload-worker")).body);

                assert.includes(frame.body, "<script src=\"/test/a.test.js\" defer></script>");
                assert.includes(frame.body, "<script src=\"/src/helper.js\" defer></script>");
                assert.includes(entry.body, "__tripwireDefine__(\"/test/a.test.js\"");
                assert.equal(map.headers["content-type"], "application/json; charset=utf-8");
                assert.deepEqual(payload.moduleUrls, makeGraph().moduleUrls);
            });
        });

        it("serves the run payload for each target", async () => {
            await withSession({ timeout: 1234, reporter: [ "dot" ] }, builders(makeGraph()), async (session) => {
                const payload = JSON.parse((await send(session.server, "GET", "/api/payload")).body);
                const browser = JSON.parse((await send(session.server, "GET", "/api/payload-browser")).body);
                const worker = JSON.parse((await send(session.server, "GET", "/api/payload-worker")).body);

                assert.deepEqual(payload.entryIds, [ "/test/a.test.js" ]);
                assert.equal(payload.settings.timeout, 1234);
                assert.deepEqual(payload.settings.reporter, [ "dot" ]);
                assert.deepEqual(payload.settings.server, { url: session.server.url, port: session.server.port, isRunning: true });
                assert.deepEqual(browser, payload);
                assert.deepEqual(worker.moduleUrls, { bundle: "/__tripwire__/bundle-worker.js" });
                assert.equal((await send(session.server, "POST", "/api/payload", "{}")).status, 404);
            });
        });

        it("reports each target's build generation for the page's freshness check", async () => {
            await withSession({}, builders(makeGraph()), async (session) => {
                assert.deepEqual(JSON.parse((await send(session.server, "GET", "/__tripwire__/check-fresh?target=worker")).body), { generation: 0 });

                await send(session.server, "GET", "/__tripwire__/browser");
                assert.deepEqual(JSON.parse((await send(session.server, "GET", "/__tripwire__/check-fresh")).body), { generation: 1 });
            });
        });

        it("redirects the bare runtime folder home and refuses anything but GET", async () => {
            await withSession({}, builders(makeGraph()), async (session) => {
                const redirect = await send(session.server, "GET", "/__tripwire__/");
                const post = await send(session.server, "POST", "/__tripwire__/browser", "{}");

                assert.equal(redirect.status, 302);
                assert.equal(redirect.headers.location, "/");
                assert.equal(post.status, 405);
            });
        });

        it("serves vendor files from disk and the runner's icon", async () => {
            await withSession({}, builders(makeGraph()), async (session) => {
                // The registry is only filled once a target is built
                await send(session.server, "GET", "/__tripwire__/browser");
                const vendor = await send(session.server, "GET", "/node_modules/vendor/index.js");
                const icon = await send(session.server, "GET", "/favicon.ico");

                assert.equal(vendor.headers["content-type"], "application/javascript; charset=utf-8");
                assert.equal(vendor.body, "module.exports = \"vendor\";\n");
                assert.equal(icon.headers["content-type"], "image/x-icon");
                assert.isTrue(icon.raw.equals(fs.readFileSync(path.resolve(__dirname, "../../../src/ux/images/favicon.ico"))));
            });
        });

        it("falls through to the server root for runner files this build does not have", async () => {
            write("served/hello.txt", "hello");

            await withSession({ serverRoot: scratch }, builders(makeGraph()), async (session) => {
                const runtime = await Promise.all([ "/runner-client.js", "/runner-worker.js", "/runner-client.js.map", "/runner-worker.js.map", "/tripwire.js.map", "/src/missing.ts" ]
                    .map((url) => send(session.server, "GET", url)));
                const listing = await send(session.server, "GET", "/served/");
                const file = await send(session.server, "GET", "/served/hello.txt");

                runtime.forEach((res) => assert.equal(res.status, 404));
                assert.includes(listing.body, "hello.txt");
                assert.equal(file.body, "hello");
            });
        });

        it("logs the messages the page sends", async () => {
            await withSession({}, builders(makeGraph()), async (session) => {
                assert.equal((await send(session.server, "POST", "/api/log", JSON.stringify({ entries: [ { level: "info", message: "first" }, { message: "second" } ] }))).status, 204);
                await send(session.server, "POST", "/api/log", "not json");

                const logged = logs.join("\n");
                assert.includes(logged, "first");
                assert.includes(logged, "second");
                assert.includes(logged, "not json");
            });
        });

        it("fails the worker script request when the runner was built without it", async () => {
            await withSession({}, builders(makeGraph()), async (session) => {
                assert.equal((await send(session.server, "GET", "/api/worker-script")).status, 500);
                assert.equal((await send(session.server, "POST", "/api/worker-script", "{}")).status, 404);
            });
        });

        it("resolves the next completion with the results the page reports", async () => {
            await withSession({}, builders(makeGraph()), async (session) => {
                const completion = session.nextCompletion();
                const res = await send(session.server, "POST", "/api/result", JSON.stringify({ summary: { passed: 2 }, coverage: { a: 1 } }));

                assert.equal(res.status, 202);
                assert.deepEqual(await completion, { summary: { passed: 2 }, coverage: { a: 1 } });
            });
        });

        it("rejects the completion for a failed run or a missing summary, and ignores results nobody waits for", async () => {
            await withSession({}, builders(makeGraph()), async (session) => {
                await send(session.server, "POST", "/api/result", JSON.stringify({ summary: { ignored: true } }));

                const failures: string[] = [];
                for (const body of [ JSON.stringify({ error: "the page crashed" }), "{}", "not json" ]) {
                    // Settled as soon as the result arrives, so handled before it is sent
                    const outcome = session.nextCompletion().then(() => "resolved", (e) => e.message);
                    await send(session.server, "POST", "/api/result", body);
                    failures.push(await outcome);
                }

                assert.deepEqual(failures, [ "the page crashed", "No summary returned from browser runner UI.", "not json" ]);
                assert.equal((await send(session.server, "GET", "/api/result")).status, 404);
            });
        });

        it("builds a target ahead of time, and lists the files it would watch", async () => {
            const graph = makeGraph();
            const graphBuilders = builders(graph, true);

            await withSession({}, graphBuilders, async (session) => {
                assert.deepEqual(session.getWatchFiles("worker"), []);
                session.prepare("worker");

                assert.deepEqual(graphBuilders.builds, [ "worker" ]);
                assert.sameMembers(session.getWatchFiles("worker"), Object.keys(graph.modules).filter((id) => id.indexOf("/__tripwire__/") !== 0));
            });
        });

        it("uses a custom UX provider, framing the tests itself when the provider does not", async () => {
            const provider = write("ux-provider.js", [
                "exports.createBrowserRunnerHtml = (target, style) => '<custom ' + target + ' ' + style + '>';",
                "exports.createFsDirListingHtml = () => '<listing>';"
            ].join("\n"));

            await withSession({ uxProvider: provider }, builders(makeGraph()), async (session) => {
                assert.equal((await send(session.server, "GET", "/__tripwire__/browser")).body, "<custom browser classic>");

                const frame = (await send(session.server, "GET", "/__tripwire__/test-frame")).body;
                assert.includes(frame, "data-runner-target=\"browser\"");
                assert.includes(frame, "<script src=\"/__tripwire__/bundle-browser.js\" defer></script><script src=\"/__tripwire__/runner-client.js\" defer></script>");
            });
        });

        it("instruments the modules for coverage when asked", async () => {
            const orgCwd = process.cwd();
            const graph = makeGraph();
            let session: IBrowserRunnerSession;

            // The session takes the project folder, and so the coverage scope, from where it starts
            process.chdir(scratch);
            try {
                session = await _startBrowserRunnerSession(builders(graph), { bindAddress: "127.0.0.1", coverage: true });
            } finally {
                process.chdir(orgCwd);
            }

            try {
                await send(session.server, "GET", "/__tripwire__/browser");
                const bundle = (await send(session.server, "GET", "/__tripwire__/bundle-browser.js")).body;
                assert.includes(bundle, "__coverage__");
            } finally {
                await Promise.resolve(session.server.stop());
                session.dispose();
            }
        });
    });

    describe("_runInteractiveBrowserTarget", () => {
        // Starts a run, then reports `body` the way the page would. The run settles as soon as the
        // report arrives, so its outcome is captured before the report is sent.
        async function runAndReport(target: string, body: string, launchMode: string = "print"): Promise<{ outcome: Promise<{ value: any, error: any }>, url: string }> {
            const firstLog = logs.length;
            const outcome = _runInteractiveBrowserTarget(target, builders(makeGraph()), { bindAddress: "127.0.0.1" }, launchMode)
                .then((value) => ({ value: value, error: null as any }), (error) => ({ value: null as any, error: error }));

            let url = "";
            for (let lp = 0; lp < 200 && !url; lp++) {
                await new Promise((resolve) => setTimeout(resolve, 10));
                const line = logs.slice(firstLog).filter((msg) => msg.indexOf("Runner URL: ") === 0)[0];
                url = line ? line.substring("Runner URL: ".length) : "";
            }

            assert.isTrue(!!url, "the runner url was printed");
            const origin = new URL(url);
            await send({ url: origin.origin + "/" } as any, "POST", "/api/result", body);

            return { outcome, url };
        }

        it("prints the runner url and resolves with the summary the page reports", async () => {
            const { outcome, url } = await runAndReport("worker", JSON.stringify({ summary: { passed: 1 } }));
            const settled = await outcome;
            const result = settled.value;

            assert.isNull(settled.error);
            assert.isTrue(/^http:\/\/127\.0\.0\.1:\d+\/__tripwire__\/worker$/.test(url), url);
            assert.deepEqual(result.summary, { passed: 1 });
            assert.equal(result.reportMs, 0);
            assert.includes(logs.join("\n"), "Open this URL in your browser to start the run: " + url);
        });

        describe("opening the system browser", () => {
            const childProcess = createRequire(__filename)("child_process");
            const orgSpawn = childProcess.spawn;
            const orgPlatform = Object.getOwnPropertyDescriptor(process, "platform");
            let spawned: any[];

            function onPlatform(platform: string): void {
                Object.defineProperty(process, "platform", { value: platform, configurable: true, enumerable: true, writable: false });
            }

            beforeEach(() => {
                spawned = [];
                childProcess.spawn = (command: string, args: string[], options: any) => {
                    const call = { command: command, args: args, options: options, unref: 0 };
                    spawned.push(call);

                    return { unref: () => call.unref++ };
                };
            });

            afterEach(() => {
                childProcess.spawn = orgSpawn;
                Object.defineProperty(process, "platform", orgPlatform);
            });

            async function openOn(platform: string): Promise<string> {
                onPlatform(platform);
                const { outcome, url } = await runAndReport("browser", JSON.stringify({ summary: { passed: 1 } }), "open");
                assert.isNull((await outcome).error);

                return url;
            }

            it("uses start on Windows, without a console window", async () => {
                const url = await openOn("win32");

                assert.equal(spawned.length, 1);
                assert.equal(spawned[0].command, "cmd");
                assert.deepEqual(spawned[0].args, [ "/c", "start", "", url ]);
                assert.isTrue(spawned[0].options.windowsHide);
                assert.isTrue(spawned[0].options.detached);
                assert.equal(spawned[0].unref, 1, "the CLI does not wait for the browser");
                assert.includes(logs.join("\n"), "Opening browser via OS default handler...");
                assert.includes(logs.join("\n"), "If the browser did not open, use this URL: " + url);
            });

            it("uses open on macOS and xdg-open elsewhere", async () => {
                const macUrl = await openOn("darwin");
                const linuxUrl = await openOn("linux");

                assert.deepEqual(spawned.map((call) => [ call.command, call.args ]), [ [ "open", [ macUrl ] ], [ "xdg-open", [ linuxUrl ] ] ]);
            });

            it("prints the url to open when the browser cannot be started", async () => {
                childProcess.spawn = () => {
                    throw new Error("spawn ENOENT");
                };

                const url = await openOn("linux");

                assert.includes(logs.join("\n"), "Unable to auto-open browser. Open this URL manually: " + url);
            });
        });

        it("stops the server and passes the failure on when the page reports one", async () => {
            const { outcome, url } = await runAndReport("browser", JSON.stringify({ error: "the page crashed" }));
            const failure = (await outcome).error;

            assert.equal(failure && failure.message, "the page crashed");
            assert.includes(url, "/__tripwire__/browser");
        });
    });
});
