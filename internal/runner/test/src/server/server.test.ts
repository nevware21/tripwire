/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import * as fs from "fs";
import * as http from "http";
import * as os from "os";
import * as path from "path";
import { replaceAnsi } from "@nevware21/chromacon";
import { assert } from "@nevware21/tripwire";
import { _failRequest, _startServer } from "../../../src/server/server";
import { _readDirEntries } from "../../../src/server/handlers/fs";
import { IServer } from "../../../src/interfaces/IServer";

interface IResponse {
    status: number;
    headers: http.IncomingHttpHeaders;
    body: string;
}

/**
 * Sends one request to the server and collects the whole response. The path is sent exactly as given,
 * so encoded traversal attempts reach the server undecoded.
 */
function send(server: IServer, method: string, reqPath: string, agent?: http.Agent): Promise<IResponse> {
    const target = new URL(server.url);

    return new Promise((resolve, reject) => {
        const req = http.request({
            host: target.hostname,
            port: target.port,
            method: method,
            path: reqPath,
            agent: agent || false
        }, (res) => {
            const chunks: Buffer[] = [];
            res.on("data", (chunk: Buffer) => chunks.push(chunk));
            res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString("utf8") }));
            res.on("error", reject);
        });

        req.on("error", reject);
        req.end();
    });
}

function makeContext(overrides?: any): any {
    const logged: string[] = [];

    return Object.assign({
        logged: logged,
        logMsg: (msg: any) => {
            logged.push(replaceAnsi(String(msg), ""));
        },
        getApiHandler: (): any => undefined,
        getAsset: (): any => undefined,
        onComplete: () => {}
    }, overrides || {});
}

/**
 * The runner's HTTP server, started for real on loopback: request routing, every built-in handler, the
 * filesystem fallback with its containment check, failure handling and shutdown.
 */
describe("server", function () {
    this.timeout(30000);

    let fsRoot: string;

    before(() => {
        fsRoot = fs.mkdtempSync(path.join(os.tmpdir(), "tripwire-server-"));
        fs.writeFileSync(path.join(fsRoot, "hello.txt"), "hello world", "utf8");
        fs.writeFileSync(path.join(fsRoot, "README.md"), "# readme", "utf8");
        fs.writeFileSync(path.join(fsRoot, "data.bin"), "bin", "utf8");
        fs.mkdirSync(path.join(fsRoot, "sub"));
        fs.writeFileSync(path.join(fsRoot, "sub", "nested.json"), "{\"a\":1}", "utf8");
        fs.mkdirSync(path.join(fsRoot, "empty"));
    });

    after(() => {
        fs.rmSync(fsRoot, { recursive: true, force: true });
    });

    async function withServer(context: any, fn: (server: IServer) => Promise<void>): Promise<void> {
        const server = await _startServer(context);
        try {
            await fn(server);
        } finally {
            await server.stop();
        }
    }

    describe("lifecycle", () => {
        it("listens on loopback, reports its url and port, and stops", async () => {
            const context = makeContext({ fsRoot });
            const server = await _startServer(context);

            assert.isTrue(server.isRunning);
            assert.isTrue(server.port > 0);
            assert.equal(server.url, "http://127.0.0.1:" + server.port + "/");
            assert.includes(context.logged.join("\n"), "Server URL: " + server.url);

            await server.stop();
            assert.isFalse(server.isRunning);
            assert.isUndefined(server.stop(), "stopping again has nothing left to close");
        });

        it("does not wait for a client that keeps its connection open", async () => {
            const agent = new http.Agent({ keepAlive: true });
            const server = await _startServer(makeContext({ fsRoot }));

            try {
                const res = await send(server, "GET", "/api/status", agent);
                assert.equal(res.status, 200);

                const started = Date.now();
                await server.stop();
                assert.isTrue(Date.now() - started < 4000, "the kept-alive socket is destroyed rather than waited for");
            } finally {
                agent.destroy();
            }
        });

        it("rejects when it cannot listen on the requested address", async () => {
            const context = makeContext({ fsRoot, bindAddress: "999.999.999.999" });

            let failure: any = null;
            try {
                await _startServer(context);
            } catch (e) {
                failure = e;
            }

            assert.isNotNull(failure);
            assert.ok(failure instanceof Error);
            assert.includes(context.logged.join("\n"), "Error in browser runner server: ");
        });

        it("sends every response uncached and embeddable by the same origin", async () => {
            await withServer(makeContext({ fsRoot }), async (server) => {
                const res = await send(server, "GET", "/hello.txt");

                assert.equal(res.headers["cache-control"], "no-store");
                assert.equal(res.headers["cross-origin-resource-policy"], "same-origin");
            });
        });
    });

    describe("root", () => {
        it("lists the served folder with the built-in shortcuts", async () => {
            await withServer(makeContext({ fsRoot }), async (server) => {
                const res = await send(server, "GET", "/");

                assert.equal(res.status, 200);
                assert.equal(res.headers["content-type"], "text/html; charset=utf-8");
                assert.includes(res.body, "Index of /");
                assert.includes(res.body, "[FILE] hello.txt");
                assert.includes(res.body, "[DIR]  sub");
                assert.includes(res.body, "href=\"/__tripwire__/browser\"");
                assert.includes(res.body, "href=\"/__tripwire__/worker\"");
                assert.includes(res.body, "href=\"/status\">Status</a>");
                assert.isFalse(res.body.indexOf("well-known") !== -1, "hidden actions are not listed");
                assert.isFalse(res.body.indexOf("href=\"/api\"") !== -1, "the api is not a page to visit");
            });
        });

        it("ignores the query string and uses the context's own listing page when it has one", async () => {
            let call: any[] = null;
            const context = makeContext({
                fsRoot,
                browserStyle: "slate",
                getFsListingHtml: (...args: any[]) => {
                    call = args;
                    return "<custom listing>";
                }
            });

            await withServer(context, async (server) => {
                const res = await send(server, "GET", "/?view=1");

                assert.equal(res.body, "<custom listing>");
                assert.equal(call[0], "slate");
                assert.equal(call[1], "");
                assert.isTrue(call[2].some((e: any) => e.name === "hello.txt" && !e.isDir));
                assert.includes(call[3], "fs-shortcuts");
            });
        });

        it("answers anything but a GET of / with 404", async () => {
            await withServer(makeContext({ fsRoot }), async (server) => {
                assert.equal((await send(server, "POST", "/")).status, 404);
            });
        });

        it("reports a folder it cannot read", async () => {
            await withServer(makeContext({ fsRoot: path.join(fsRoot, "does-not-exist") }), async (server) => {
                const res = await send(server, "GET", "/");

                assert.equal(res.status, 500);
                assert.equal(res.body, "Internal Server Error");
            });
        });

        it("escapes action descriptions and links in the shortcut list", async () => {
            const context = makeContext({
                fsRoot,
                getServerActions: () => [ {
                    name: "tools",
                    handler: (request: any) => {
                        request.res.end("tools");
                    },
                    description: "<b>dangerous</b> & \"quoted\"",
                    href: "/tools?a=1&b=\"2\""
                } ]
            });

            await withServer(context, async (server) => {
                const res = await send(server, "GET", "/");

                assert.includes(res.body, "&lt;b&gt;dangerous&lt;/b&gt; &amp; &quot;quoted&quot;");
                assert.includes(res.body, "href=\"/tools?a=1&amp;b=&quot;2&quot;\">Tools</a>");
            });
        });
    });

    describe("status", () => {
        it("describes itself with examples when no code is given", async () => {
            await withServer(makeContext({ fsRoot }), async (server) => {
                const res = await send(server, "GET", "/status");

                assert.equal(res.status, 200);
                assert.includes(res.body, "<h1>Status Endpoint</h1>");
                assert.includes(res.body, "/status/404</a> — 404: Not Found");
                assert.includes(res.body, "/status/404,500</a> — 404: Not Found or 500: Internal Server Error");
            });
        });

        it("answers with the requested status and its reason phrase", async () => {
            await withServer(makeContext({ fsRoot }), async (server) => {
                const res = await send(server, "GET", "/status/418");

                assert.equal(res.status, 418);
                assert.equal(res.body, http.STATUS_CODES[418]);
                assert.equal(res.headers["content-type"], "text/plain; charset=utf-8");
            });
        });

        it("picks one of several comma separated codes", async () => {
            await withServer(makeContext({ fsRoot }), async (server) => {
                const seen = new Set<number>();
                for (let lp = 0; lp < 12; lp++) {
                    seen.add((await send(server, "GET", "/status/201,202")).status);
                }

                seen.forEach((code) => assert.isTrue(code === 201 || code === 202, "only a requested code is used"));
            });
        });

        it("rejects codes that are malformed, out of range or not standard", async () => {
            await withServer(makeContext({ fsRoot }), async (server) => {
                assert.equal((await send(server, "GET", "/status/abc")).body, "Invalid status code: abc");
                assert.equal((await send(server, "GET", "/status/99")).body, "Invalid status code: 99");
                assert.equal((await send(server, "GET", "/status/404.5")).body, "Invalid status code: 404.5");
                assert.equal((await send(server, "GET", "/status/404,")).body, "Invalid status code: ");

                const unsupported = await send(server, "GET", "/status/599");
                assert.equal(unsupported.status, 400);
                assert.equal(unsupported.body, "Unsupported status code: 599");
            });
        });

        it("only answers GET", async () => {
            await withServer(makeContext({ fsRoot }), async (server) => {
                assert.equal((await send(server, "POST", "/status/200")).status, 404);
            });
        });
    });

    describe("well-known", () => {
        it("answers Chrome's DevTools project probe with an empty project", async () => {
            await withServer(makeContext({ fsRoot }), async (server) => {
                const res = await send(server, "GET", "/.well-known/appspecific/com.chrome.devtools.json");

                assert.equal(res.status, 200);
                assert.equal(res.body, "{}");
                assert.equal(res.headers["content-type"], "application/json; charset=utf-8");
            });
        });

        it("answers anything else with 404", async () => {
            await withServer(makeContext({ fsRoot }), async (server) => {
                assert.equal((await send(server, "GET", "/.well-known/other.json")).status, 404);
                assert.equal((await send(server, "POST", "/.well-known/appspecific/com.chrome.devtools.json")).status, 404);
            });
        });
    });

    describe("api", () => {
        it("reports that it is running", async () => {
            await withServer(makeContext({ fsRoot }), async (server) => {
                const res = await send(server, "GET", "/api/status");

                assert.equal(res.status, 200);
                assert.deepEqual(JSON.parse(res.body), { status: "running" });
            });
        });

        it("hands any other api url to the context's handler for it, with the parsed query", async () => {
            let seen: any = null;
            const context = makeContext({
                fsRoot,
                getApiHandler: (apiUrl: string) => apiUrl === "/echo" ? (request: any) => {
                    seen = { url: apiUrl, query: request.query, method: request.method };
                    request.res.end("echoed");
                } : undefined
            });

            await withServer(context, async (server) => {
                const res = await send(server, "GET", "/api/echo?name=a%20b&flag&=ignored");

                assert.equal(res.body, "echoed");
                assert.deepEqual(seen.query, { name: "a b", flag: "" }, "a pair without a key is dropped");
                assert.deepEqual(seen.method, { name: "GET", isGet: true, isPost: false });
                assert.equal((await send(server, "GET", "/api/unknown")).status, 404);
            });
        });
    });

    describe("runtime assets", () => {
        const assets: { [url: string]: any } = {
            "/runner.js": { contentType: "application/javascript", content: Buffer.from("runner()") },
            "/favicon.ico": { contentType: "image/x-icon", content: Buffer.from("ico") },
            "/runner-client.js.map": { contentType: "application/json", content: Buffer.from("{\"map\":1}") },
            "/src/app.ts": { contentType: "text/x-typescript", content: Buffer.from("export {}") }
        };

        function assetContext(): any {
            return makeContext({ fsRoot, getAsset: (url: string) => assets[url] });
        }

        it("serves the runner's own assets under /__tripwire__/", async () => {
            await withServer(assetContext(), async (server) => {
                const res = await send(server, "GET", "/__tripwire__/runner.js");

                assert.equal(res.status, 200);
                assert.equal(res.headers["content-type"], "application/javascript");
                assert.equal(res.body, "runner()");
                assert.equal((await send(server, "GET", "/__tripwire__/missing.js")).status, 404);
                assert.equal((await send(server, "POST", "/__tripwire__/runner.js")).status, 404);
            });
        });

        it("routes the favicon, the client source maps and /src/ asked for at the top level to the runner's assets", async () => {
            await withServer(assetContext(), async (server) => {
                assert.equal((await send(server, "GET", "/favicon.ico")).body, "ico");
                assert.equal((await send(server, "GET", "/runner-client.js.map")).body, "{\"map\":1}");
                assert.equal((await send(server, "GET", "/__tripwire__/nested/runner-client.js.map")).body, "{\"map\":1}", "a nested path under /__tripwire__/ is reduced to the asset name");
                assert.equal((await send(server, "GET", "/src/app.ts")).body, "export {}");
            });
        });

        it("does not treat a source map name inside another folder as a runtime asset", async () => {
            await withServer(assetContext(), async (server) => {
                assert.equal((await send(server, "GET", "/some/page/runner-client.js.map")).status, 404, "served from the folder, where it does not exist");
            });
        });

        it("passes a status code list through undecoded, so an encoded space is rejected", async () => {
            await withServer(assetContext(), async (server) => {
                assert.equal((await send(server, "GET", "/status/201,%20202")).body, "Invalid status code: %20202");
            });
        });
    });

    describe("filesystem fallback", () => {
        it("serves a file from the served folder with its content type", async () => {
            await withServer(makeContext({ fsRoot }), async (server) => {
                const text = await send(server, "GET", "/hello.txt");
                const json = await send(server, "GET", "/sub/nested.json");
                const unknown = await send(server, "GET", "/data.bin");

                assert.equal(text.status, 200);
                assert.equal(text.body, "hello world");
                assert.equal(text.headers["content-type"], "text/plain; charset=utf-8");
                assert.equal(json.headers["content-type"], "application/json; charset=utf-8");
                assert.equal(unknown.headers["content-type"], "application/octet-stream");
            });
        });

        it("serves a top-level file whose name is not an action, rather than the root page", async () => {
            await withServer(makeContext({ fsRoot }), async (server) => {
                const res = await send(server, "GET", "/README.md");

                assert.equal(res.status, 200);
                assert.equal(res.body, "# readme");
            });
        });

        it("lists a folder, with file sizes", async () => {
            await withServer(makeContext({ fsRoot }), async (server) => {
                const res = await send(server, "GET", "/sub/");

                assert.equal(res.status, 200);
                assert.includes(res.body, "Index of /sub");
                assert.includes(res.body, "[FILE] nested.json (7 bytes)");
                assert.includes((await send(server, "GET", "/empty/")).body, "Index of /empty");
            });
        });

        it("reports a listing page that fails to render", async () => {
            const context = makeContext({
                fsRoot,
                getFsListingHtml: () => {
                    throw new Error("template broke");
                }
            });

            await withServer(context, async (server) => {
                assert.equal((await send(server, "GET", "/sub/")).status, 500);
            });
        });

        it("prefers the context's generated asset, and honours an explicit refusal to serve the raw file", async () => {
            const context = makeContext({
                fsRoot,
                getAsset: (url: string) => {
                    if (url === "/hello.txt") {
                        return { contentType: "text/x-generated", content: Buffer.from("generated") };
                    }

                    return url === "/sub/nested.json" ? null : undefined;
                }
            });

            await withServer(context, async (server) => {
                const generated = await send(server, "GET", "/hello.txt");
                assert.equal(generated.body, "generated");
                assert.equal(generated.headers["content-type"], "text/x-generated");

                assert.equal((await send(server, "GET", "/sub/nested.json")).status, 404, "null means the raw file is never served");
            });
        });

        it("answers a missing file with 404 and anything but GET with 405", async () => {
            await withServer(makeContext({ fsRoot }), async (server) => {
                assert.equal((await send(server, "GET", "/no-such-file.txt")).status, 404);

                const post = await send(server, "POST", "/hello.txt");
                assert.equal(post.status, 405);
                assert.equal(post.headers.allow, "GET");
            });
        });

        it("refuses paths that escape the served folder, however they are encoded", async () => {
            await withServer(makeContext({ fsRoot }), async (server) => {
                assert.equal((await send(server, "GET", "/..%2f..%2fsecret.txt")).status, 403);
                assert.equal((await send(server, "GET", "/sub/..%5c..%5csecret.txt")).status, 403);
                assert.equal((await send(server, "GET", "/hello%00.txt")).status, 403);
            });
        });

        it("rejects a malformed percent encoding", async () => {
            await withServer(makeContext({ fsRoot }), async (server) => {
                const res = await send(server, "GET", "/sub/%E0%A4%A");

                assert.equal(res.status, 400);
                assert.includes(res.body, "malformed URL encoding");
            });
        });
    });

    describe("custom actions", () => {
        it("adds new actions, replaces built-in ones and ignores incomplete ones", async () => {
            const context = makeContext({
                fsRoot,
                getServerActions: () => [
                    null,
                    { name: "", handler: null },
                    { name: "broken" },
                    { name: "status", handler: (request: any) => request.res.end("replaced status") },
                    { name: "hello", handler: (request: any) => request.res.end("hello " + request.actionUrl) }
                ]
            });

            await withServer(context, async (server) => {
                assert.equal((await send(server, "GET", "/status/500")).body, "replaced status");
                assert.equal((await send(server, "GET", "/hello")).body, "hello /", "a bare action segment gets the root url");
                assert.equal((await send(server, "GET", "/HELLO/world")).body, "hello /world", "actions match case-insensitively");
                assert.equal((await send(server, "GET", "/broken/x")).status, 404, "the incomplete action was never registered");
            });
        });

        it("answers 500 when an action throws or rejects, and logs the failure", async () => {
            const context = makeContext({
                fsRoot,
                getServerActions: () => [
                    {
                        name: "throws",
                        handler: () => {
                            throw new Error("sync failure");
                        }
                    },
                    { name: "rejects", handler: () => Promise.reject(new Error("async failure")) }
                ]
            });

            await withServer(context, async (server) => {
                const thrown = await send(server, "GET", "/throws/x");
                assert.equal(thrown.status, 500);
                assert.equal(thrown.body, "sync failure");

                const rejected = await send(server, "GET", "/rejects/x");
                assert.equal(rejected.status, 500);
                assert.equal(rejected.body, "Internal Server Error");
                assert.includes(context.logged.join("\n"), "Request failed: async failure");
            });
        });

        it("answers 500 when the context's asset lookup rejects", async () => {
            const context = makeContext({ fsRoot, getAsset: () => Promise.reject(new Error("registry failed")) });

            await withServer(context, async (server) => {
                assert.equal((await send(server, "GET", "/hello.txt")).status, 500);
                assert.includes(context.logged.join("\n"), "Request failed: registry failed");
            });
        });
    });

    describe("verbose logging", () => {
        it("logs each request with its status", async () => {
            const context = makeContext({ fsRoot, verbose: true });

            await withServer(context, async (server) => {
                await send(server, "GET", "/hello.txt");
                await send(server, "GET", "/no-such-file.txt");
                await send(server, "GET", "/status/503");
            });

            const log = context.logged.join("\n");
            assert.includes(log, "[http] GET /hello.txt 200");
            assert.includes(log, "[http] GET /no-such-file.txt 404");
            assert.includes(log, "[http] GET /status/503 503");
        });
    });

    describe("_failRequest", () => {
        function fakeRes(overrides?: any): any {
            return Object.assign({ statusCode: 200, headersSent: false, writableEnded: false, ended: null, end(body: any) {
                this.ended = body;
            } }, overrides || {});
        }

        it("answers 500 and logs the error", () => {
            const context = makeContext();
            const res = fakeRes();

            _failRequest(res, context, new Error("boom"));

            assert.equal(res.statusCode, 500);
            assert.equal(res.ended, "Internal Server Error");
            assert.includes(context.logged[0], "Request failed: boom");
        });

        it("leaves a response that has already started alone", () => {
            const context = makeContext();
            const started = fakeRes({ headersSent: true });
            const ended = fakeRes({ writableEnded: true });

            _failRequest(started, context, "late");
            _failRequest(ended, context, "late");

            assert.equal(started.statusCode, 200);
            assert.equal(ended.statusCode, 200);
            assert.deepEqual(context.logged, []);
        });

        it("never throws while failing, and copes without a logger", () => {
            const res = fakeRes({
                end: () => {
                    throw new Error("socket gone");
                }
            });

            _failRequest(res, null as any, "plain string error");
            _failRequest(fakeRes(), {} as any, "no logger");
        });
    });

    describe("_readDirEntries", () => {
        it("describes each entry, and resolves an empty folder to no entries", async () => {
            const entries = await _readDirEntries(fsRoot);
            const sub = entries.filter((e) => e.name === "sub")[0];
            const hello = entries.filter((e) => e.name === "hello.txt")[0];

            assert.isTrue(sub.isDir);
            assert.isUndefined(sub.size);
            assert.isFalse(hello.isDir);
            assert.equal(hello.size, 11);
            assert.ok(hello.modified instanceof Date);
            assert.deepEqual(await _readDirEntries(path.join(fsRoot, "empty")), []);
        });

        it("rejects for a folder that does not exist", async () => {
            let failure: any = null;
            try {
                await _readDirEntries(path.join(fsRoot, "missing"));
            } catch (e) {
                failure = e;
            }

            assert.equal(failure && failure.code, "ENOENT");
        });
    });
});
