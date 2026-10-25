/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import path from "path/win32";
import { _loadUxProvider } from "../client/loadUxProvider";
import { IServerContext } from "../interfaces/IServerContext";
import { logApiHandler } from "../server/handlers/api/logMsg";
import { _reportResultApiHandler } from "../server/handlers/api/reportResult";
import { scriptApiHandler } from "../server/handlers/api/scriptPayload";
import { IBrowserWorkerModuleGraph, IGraphBuilders } from "./browser";
import { _instrumentPayloadForCoverage } from "./coverage";
import { _buildBundledModuleAsset, _buildModuleAssetRegistry } from "./moduleAssets";
import { _createRunPayload } from "./runPayload";
import { _loadRunnerWorkerScript } from "./worker";
import { IPromise } from "@nevware21/ts-async";
import { _getAssetFile, _getInlineMapAsset, _getRunnerBinAsset, _getSourceAsset, _getVendorAsset, _normalizeAssetUrl } from "./assets";
import { _startServer } from "../server/server";
import { IServer } from "../interfaces/IServer";
import { _assetHandler } from "../server/handlers/api/assets";
import { _createTargetSessionCache, InteractiveTarget } from "./targetSessionCache";
import { IApiHandler } from "../interfaces/IApiHandler";
import { IServerRequest } from "../interfaces/IServerRequest";

// Synthetic URLs the concatenated bundle (see `_buildBundledModuleAsset`/`--bundle`) is
// registered and served under -- one per target, since the browser and worker module graphs
// can differ (eg. --browser-launch manual's companion graph, or simply having been rebuilt at
// different times once each target is built lazily/independently -- see targetSessionCache.ts).
const _BUNDLE_BROWSER_URL = "/__tripwire__/bundle-browser.js";
const _BUNDLE_WORKER_URL = "/__tripwire__/bundle-worker.js";

function _defaultFrame(target: string, moduleScriptUrls: string[]) {
    const moduleScripts = (moduleScriptUrls || []).map((url) => "<script src=\"" + url + "\" defer><\/script>").join("");
    return "<!doctype html><html><head><meta charset=\"utf-8\"></head><body data-runner-mode=\"frame\" data-runner-target=\"" + target + "\">" + moduleScripts + "<script src=\"/__tripwire__/runner-client.js\" defer><\/script></body></html>";
}

/**
 * Runs coverage instrumentation (when enabled) against a module graph's raw source text,
 * returning the (possibly instrumented) `modules` map. Operates on the graph directly
 * rather than an `IRunPayload`, since the wire payload no longer carries module source.
 */
function _instrumentGraphModules(graph: IBrowserWorkerModuleGraph, cwd: string, parsed: any): Record<string, string> {
    if (!parsed.coverage) {
        return graph.modules;
    }

    return _instrumentPayloadForCoverage({
        modules: graph.modules,
        entryIds: graph.entryIds,
        tripwireModuleId: graph.tripwireModuleId,
        coverageOnlyIds: graph.coverageOnlyIds
    }, cwd, parsed).modules;
}

/**
 * Everything needed to serve one target ("browser" or "worker") once its module graph has been
 * built -- assembled fresh by `_assembleSession` below whenever `targetSessionCache` decides a
 * (re)build is needed, and otherwise served as-is from the cache.
 */
interface ITargetSession {
    html: string;
    frameHtml: string;
    payload: any;
    moduleAssets: Record<string, string>;
    rawAssets: Record<string, string>;
}

export interface IBrowserRunnerSession {
    server: IServer;

    /**
     * Arms a fresh completion promise and returns it -- resolves/rejects the *next* time the
     * browser UI reports a result (see the "result" API handler / onComplete below), independent
     * of any previous run this same session already completed. A one-shot interactive/puppeteer
     * run calls this exactly once; puppeteer's `--watch` loop (execute.ts) calls it again before
     * every re-visit of this same long-lived session.
     */
    nextCompletion(): IPromise<{ summary: any, coverage?: any }>;

    /**
     * The real on-disk files behind `target`'s currently cached build -- see
     * targetSessionCache.ts's `getWatchFiles` doc comment.
     */
    getWatchFiles(target: InteractiveTarget): string[];

    /**
     * Builds (or freshness-checks and rebuilds) `target`'s session now, rather than on the
     * page's first request. Throws whatever the build throws -- a syntax error in a test file, or
     * a type error under `--type-check` -- so a caller that owns the console can report it.
     * Served lazily, the same failure only ever surfaces as an HTTP 500 to the page, which the
     * puppeteer `--watch` loop has no way to see; it calls this before every re-visit.
     * @since 0.2.0
     */
    prepare(target: InteractiveTarget): void;

    /**
     * Closes any background pre-warm watchers the per-target session cache opened. Callers
     * must call this before the process is expected to exit on its own -- see
     * targetSessionCache.ts's own `dispose()` doc comment.
     */
    dispose(): void;
}

export async function _startBrowserRunnerSession(graphBuilders: IGraphBuilders, parsed: any): Promise<IBrowserRunnerSession> {
    const uxProvider = _loadUxProvider(parsed && parsed.uxProvider);
    const cwd = process.cwd();

    // By default (--bundle) every module is concatenated into one served resource per target;
    // with --no-bundle each module is instead served as its own real, individually-fetchable
    // network resource rather than being eval'd from an inlined JSON payload -- see
    // _buildBundledModuleAsset/_buildModuleAssetRegistry below for the two modes. Either way,
    // moduleAssets holds the final, wrapped (and, if --coverage, instrumented) executable text
    // keyed by its serving URL. In per-module (--no-bundle) mode that URL mirrors the module's
    // real project/node_modules-relative path, and per-module URLs are NOT namespaced by
    // target, so if both targets have been built in the same session with --coverage on (eg.
    // the user visited both tabs), a shared file's two independently-instrumented variants
    // contend for one URL -- whichever target was (re)built most recently wins. Accepted
    // tradeoff for predictable, real-path-mirroring URLs; narrow edge case in practice, and
    // pre-existing (this isn't new -- `--browser-launch manual` already built two distinct
    // graphs up front and merged them the same way).
    const useBundle = parsed.bundle !== false;

    let _buildTestFrameHtml = _defaultFrame;
    const createFrame = uxProvider.createTestFrameHtml;
    if (createFrame) {
        _buildTestFrameHtml = (target: any, moduleScriptUrls: string[]) => createFrame(target as any, parsed.browserStyle || "classic", moduleScriptUrls);
    }

    // Assigned once `_startServer` resolves, below. Safe to reference from `_assemble` (which
    // only ever runs in response to an incoming HTTP request, so never before the server it
    // needs to describe in `payload.settings.server` is already listening).
    let server: IServer;

    function _assemble(target: InteractiveTarget, graph: IBrowserWorkerModuleGraph): ITargetSession {
        const instrumentedModules = _instrumentGraphModules(graph, cwd, parsed);
        const bundleUrl = target === "worker" ? _BUNDLE_WORKER_URL : _BUNDLE_BROWSER_URL;

        const moduleAssets: Record<string, string> = useBundle
            ? (() => {
                const bundle = _buildBundledModuleAsset(instrumentedModules, graph.moduleUrls, bundleUrl);
                const assets: Record<string, string> = {};
                assets[bundleUrl] = bundle.code;
                if (bundle.map) {
                    assets[bundleUrl + ".map"] = bundle.map;
                }
                return assets;
            })()
            : _buildModuleAssetRegistry(instrumentedModules, graph.moduleUrls);

        const payload = _createRunPayload(graph, parsed);
        // The worker target has no host document to embed <script> tags into, so it needs an
        // explicit URL manifest to importScripts() -- the browser target doesn't (its module
        // scripts are embedded directly into the served frame HTML below). In bundle mode
        // there is exactly one resource to importScripts() -- a single-entry manifest here
        // means client/workerRunner.ts's existing per-URL loop (unchanged) just runs once
        // instead of once per module. The key itself is never looked up by id, only iterated
        // for its value, so its name is arbitrary.
        if (target === "worker") {
            payload.moduleUrls = useBundle ? { bundle: _BUNDLE_WORKER_URL } : graph.moduleUrls;
        }
        payload.settings.server = server ? { url: server.url, port: server.port, isRunning: !!server.isRunning } : undefined;

        const html = uxProvider.createBrowserRunnerHtml(target as any, parsed.browserStyle || "classic");

        // Only the "browser" target's frame executes test modules directly in its own document
        // -- the "worker" target's frame just hosts the postMessage bridge to a real Worker,
        // which loads modules itself via importScripts() using payload.moduleUrls above.
        const moduleScriptUrls = target === "browser"
            ? (useBundle ? [_BUNDLE_BROWSER_URL] : Object.keys(graph.moduleUrls).map((id) => graph.moduleUrls[id]))
            : [];
        const frameHtml = _buildTestFrameHtml(target, moduleScriptUrls);

        return { html, frameHtml, payload, moduleAssets, rawAssets: graph.rawAssets };
    }

    // The lazy, per-target build cache: the first request for a target builds and caches its
    // session; later requests reuse it as long as nothing in its fingerprint has changed
    // (checked on every top-level page request), rebuilding transparently when it has. Also
    // owns a best-effort background watcher that pre-warms a rebuild before the next request/
    // poll arrives -- see targetSessionCache.ts for the full design.
    const sessionCache = _createTargetSessionCache<ITargetSession>({
        resolveEntryFiles: (target) => graphBuilders.resolveEntryFiles(target),
        buildGraph: (target, entryFiles) => graphBuilders.buildGraph(target, entryFiles),
        assemble: _assemble
    }, { watch: graphBuilders.watch });

    // Flat, cross-target registry for asset serving -- see the accepted "last build wins for a
    // shared URL" tradeoff noted above. Uses `tryPeek()` (never triggers a build of its own, not
    // even a defensive one) rather than `peek()`: an individual asset fetch is always part of an
    // already-in-flight page load whose top-level `get()` call already built *that* target, but
    // the *other* target may never have been visited at all -- using `peek()` here would
    // silently build it anyway just to ask it for assets it doesn't have, defeating the whole
    // point of building each target lazily (and arming a second, needless background watcher
    // for a target nobody asked for).
    function _mergedAssets(pick: (session: ITargetSession) => Record<string, string>): Record<string, string> {
        const browserSession = sessionCache.tryPeek("browser");
        const workerSession = sessionCache.tryPeek("worker");
        return Object.assign(
            {},
            browserSession ? pick(browserSession) : {},
            workerSession ? pick(workerSession) : {}
        );
    }

    // Resettable rather than a single fixed promise: a one-shot interactive/puppeteer run only
    // ever calls `nextCompletion()` once, but puppeteer's `--watch` loop reuses this *same*
    // session across many runs (see execute.ts) and needs a fresh, independently awaitable
    // completion each time -- `onComplete` below always resolves/rejects whichever one is
    // currently armed, guarded by `completed` exactly as before (now reset per-arm instead of
    // fixed at session creation).
    let resolveCompletion: (value: { summary: any, coverage?: any }) => void = () => {
        // No-op until (re-)armed by nextCompletion() below.
    };
    let rejectCompletion: (reason?: any) => void = () => {
        // No-op until (re-)armed by nextCompletion() below.
    };
    let completed = true;

    function _armNextCompletion(): Promise<{ summary: any, coverage?: any }> {
        completed = false;
        return new Promise<{ summary: any, coverage?: any }>((resolve, reject) => {
            resolveCompletion = resolve;
            rejectCompletion = reject;
        });
    }

    function _dynamicJsonApiHandler(getPayload: () => any): IApiHandler {
        return function(request: IServerRequest) {
            const res = request.res;
            if (request.method.isGet) {
                res.statusCode = 200;
                res.setHeader("content-type", "application/json; charset=utf-8");
                res.end(JSON.stringify(getPayload()));
            } else {
                res.statusCode = 404;
                res.end("Not Found");
            }
        };
    }

    const apis: Record<string, any> = {
        "payload": _dynamicJsonApiHandler(() => sessionCache.peek("browser").payload),
        "payload-browser": _dynamicJsonApiHandler(() => sessionCache.peek("browser").payload),
        "payload-worker": _dynamicJsonApiHandler(() => sessionCache.peek("worker").payload),
        "worker-script": scriptApiHandler(() => {
            return _loadRunnerWorkerScript(process.cwd(), true);
        }),
        "log": logApiHandler,
        "result": _reportResultApiHandler
    };

    const context: IServerContext = {
        getHomePageHtml: () => sessionCache.get("browser").html,
        getRunnerPageHtml: (pageTarget) => {
            return sessionCache.get(pageTarget === "worker" ? "worker" : "browser").html;
        },
        getServerActions: () => {
            function _setIsolationHeaders(res: any) {
                res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
                // COEP require-corp is intentionally omitted: it would cascade to
                // subresources (iframe, worker script) and cause ERR_BLOCKED_BY_RESPONSE
                // unless every same-origin asset carries Cross-Origin-Resource-Policy headers.
                // We already add CORP:same-origin globally in server.ts, but Chrome still
                // blocks Workers created inside an iframe that inherited require-corp. The
                // runner does not need cross-origin isolation (no SharedArrayBuffer use),
                // so we skip COEP entirely.
            }

            return [
                {
                    name: "__tripwire__",
                    handler: (request) => {
                        if (!request.method.isGet) {
                            request.res.statusCode = 405;
                            request.res.end("Method Not Allowed");
                            return;
                        }
                        const subPath = request.actionUrl || "/";

                        if (subPath === "/browser") {
                            request.res.statusCode = 200;
                            request.res.setHeader("content-type", "text/html; charset=utf-8");
                            _setIsolationHeaders(request.res);
                            request.res.end(sessionCache.get("browser").html);
                            return;
                        }
                        if (subPath === "/worker") {
                            request.res.statusCode = 200;
                            request.res.setHeader("content-type", "text/html; charset=utf-8");
                            _setIsolationHeaders(request.res);
                            request.res.end(sessionCache.get("worker").html);
                            return;
                        }
                        if (subPath === "/test-frame") {
                            const frameTarget: InteractiveTarget = request.query && request.query["target"] === "worker" ? "worker" : "browser";
                            request.res.statusCode = 200;
                            request.res.setHeader("content-type", "text/html; charset=utf-8");
                            // Do NOT set COEP on the test-frame: COEP:require-corp causes Chrome to
                            // block same-origin worker scripts with ERR_BLOCKED_BY_RESPONSE.
                            request.res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
                            request.res.end(sessionCache.peek(frameTarget).frameHtml);
                            return;
                        }
                        if (subPath === "/check-fresh") {
                            const checkTarget: InteractiveTarget = request.query && request.query["target"] === "worker" ? "worker" : "browser";
                            request.res.statusCode = 200;
                            request.res.setHeader("content-type", "application/json; charset=utf-8");
                            request.res.end(JSON.stringify({ generation: sessionCache.getGeneration(checkTarget) }));
                            return;
                        }
                        if (subPath === "/") {
                            // Redirect index to root so the server root page is the entry point.
                            request.res.statusCode = 302;
                            request.res.setHeader("location", "/");
                            request.res.end();
                            return;
                        }
                        return _assetHandler(request);
                    },
                    description: "Tripwire runner pages and runtime assets",
                    href: "/__tripwire__/",
                    showInIndex: false
                }
            ];
        },
        logMsg: (msg) => {
            console.log(msg);
        },
        verbose: !!parsed.verbose,
        bindAddress: parsed.bindAddress,
        fsRoot: parsed.serverRoot ? path.resolve(parsed.serverRoot) : process.cwd(),
        browserStyle: parsed.browserStyle || "classic",
        getFsListingHtml: (style, relativePath, entries, extraHtml) => {
            return uxProvider.createFsDirListingHtml(style as any, relativePath, entries, extraHtml);
        },
        getApiHandler: (apiUrl) => {
            if (!apiUrl) {
                return undefined;
            }

            /*
             * Server routing passes API paths with a leading slash (e.g. "/payload").
             * Accept both forms so UI requests resolve in every launch mode.
             */
            return apis[apiUrl] || apis[apiUrl.charAt(0) === "/" ? apiUrl.substring(1) : apiUrl];
        },
        getAsset(assetUrl: string): IPromise<{ contentType: string, content: Buffer } | undefined | null> | { contentType: string, content: Buffer } | undefined | null {
            const normalizedAssetUrl = _normalizeAssetUrl(assetUrl);
            const moduleAssets = _mergedAssets((session) => session.moduleAssets);
            const rawAssets = _mergedAssets((session) => session.rawAssets);

            // moduleAssets/rawAssets URLs mostly mirror real project/node_modules paths now
            // (e.g. /test/src/assert/assert.closeTo.test.ts, /node_modules/@nevware21/...),
            // which server.ts's *root* fallback routes here with the prefix already bare --
            // but a few registry entries (the virtual os-shim module, the rare vendor
            // fallback with no real node_modules path) still live under /__tripwire__/...,
            // which server.ts's "__tripwire__" action routes here with that prefix already
            // stripped. Try both forms rather than assuming which route a given request came
            // through.
            const wrapped = moduleAssets[normalizedAssetUrl] !== undefined
                ? moduleAssets[normalizedAssetUrl]
                : moduleAssets["/__tripwire__" + normalizedAssetUrl];
            if (wrapped !== undefined) {
                // A module's external source map (see moduleAssets.ts's _extractAndShiftInlineSourceMap)
                // is registered under "<served-js-url>.map" in this same map -- distinguish it
                // here by URL suffix rather than giving it a separate registry.
                const isMap = /\.map$/i.test(normalizedAssetUrl);
                return {
                    contentType: isMap ? "application/json; charset=utf-8" : "application/javascript; charset=utf-8",
                    content: Buffer.from(wrapped, "utf8")
                };
            }

            // A module served as .js was originally a .ts/.tsx source, renamed for exactly
            // this reason (see _toModuleAssetUrl in execute.ts). The original, un-renamed .ts
            // path is *deliberately* left servable -- falling through to the raw on-disk file
            // below -- since the module's source map omits sourcesContent (see
            // moduleAssets.ts's _extractAndShiftInlineSourceMap) specifically so DevTools
            // fetches this real file over the network for its "Authored" view, rather than
            // trusting embedded content (which has a documented DevTools quirk misclassifying
            // the mapped original into the wrong Authored/Deployed bucket).

            const rawFsPath = rawAssets[normalizedAssetUrl] || rawAssets["/__tripwire__" + normalizedAssetUrl];
            if (rawFsPath) {
                return _getVendorAsset(rawFsPath);
            }

            if (normalizedAssetUrl.indexOf("/src/") === 0) {
                return _getSourceAsset(normalizedAssetUrl.substring(1));
            }

            if (normalizedAssetUrl === "/runner-client.js") {
                return _getAssetFile("runner-client.js", false);
            }

            if (normalizedAssetUrl === "/runner-worker.js") {
                return _getAssetFile("runner-worker.js", false);
            }

            if (normalizedAssetUrl === "/runner-client.js.map") {
                return _getInlineMapAsset("runner-client.js.map");
            }

            if (normalizedAssetUrl === "/runner-worker.js.map") {
                return _getInlineMapAsset("runner-worker.js.map");
            }

            if (/\/tripwire(?:\.js)?\.map$/i.test(normalizedAssetUrl)) {
                return _getRunnerBinAsset("tripwire.js.map");
            }

            if (normalizedAssetUrl === "/favicon.ico") {
                const faviconIco = uxProvider.faviconIco;
                if (!faviconIco) {
                    return undefined;
                }

                return {
                    contentType: "image/x-icon",
                    content: Buffer.from(faviconIco, "base64")
                };
            }
        },
        onComplete: (result) => {
            if (completed) {
                return;
            }

            completed = true;

            if (result && result.error) {
                rejectCompletion(new Error(String(result.error)));
                return;
            }

            if (!result || !result.summary) {
                rejectCompletion(new Error("No summary returned from browser runner UI."));
                return;
            }

            resolveCompletion(result);
        }
    };

    server = await _startServer(context);

    return {
        server,
        nextCompletion: () => _armNextCompletion(),
        getWatchFiles: (target: InteractiveTarget) => sessionCache.getWatchFiles(target),
        prepare: (target: InteractiveTarget) => {
            sessionCache.get(target);
        },
        dispose: () => sessionCache.dispose()
    };
}
