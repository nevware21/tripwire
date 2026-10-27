/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { createDefaultCoverageProvider } from "../codecov/provider";
import { IBrowserWorkerModuleGraph, IGraphBuilders } from "./browser";
import { _startBrowserRunnerSession, IBrowserRunnerSession } from "./browserRunner";
import { _getRunnerUiUrl } from "./ui";
import { _userError } from "../internal/userError";
import { pathToFileURL } from "url";

function _writePuppeteerCoverage(cwd: string, target: string, coverage: any, parsed: any) {
    createDefaultCoverageProvider(cwd, parsed).writeCoverage(coverage, cwd, target);
}

/**
 * A real dynamic `import()`, built with `new Function` so that neither a CommonJS compile of this
 * file nor the bundler turns it back into the `require()` it exists to avoid.
 */
const _importModule: (url: string) => Promise<any> = new Function("url", "return import(url);") as any;

function _isEsmRequireError(e: any): boolean {
    return !!e && (e.code === "ERR_REQUIRE_ESM" || e.code === "ERR_REQUIRE_ASYNC_MODULE");
}

function _puppeteerLoadError(name: string, e: any) {
    return _userError("'" + name + "' is installed but could not be loaded on Node.js " + process.version + ": "
        + String((e && e.message) || e).split("\n")[0], [
        "Check that the installed " + name + " supports this Node.js version.",
        "Or launch a browser yourself with --browser-launch open (no puppeteer needed).",
        "Or run this suite against --target node."
    ]);
}

/**
 * Loads puppeteer (or puppeteer-core) from the target project. puppeteer 25 and later ship only
 * ES modules, which `require()` can load only on Node.js 20.19+ and 22.12+, so on older versions
 * the module is loaded with `import()` instead. A missing or unloadable package throws here,
 * synchronously; only the `import()` path settles later.
 */
function _loadPuppeteer(cwd: string): Promise<any> {
    const candidates = [
        "puppeteer",
        "puppeteer-core"
    ];
    let loadError: any = null;
    for (let lp = 0; lp < candidates.length; lp++) {
        let resolved: string;
        try {
            resolved = require.resolve(candidates[lp], {
                paths: [cwd, __dirname]
            });
        } catch (e) {
            // Not installed, try the next candidate.
            continue;
        }

        const name = candidates[lp];
        try {
            // eslint-disable-next-line security/detect-non-literal-require, @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
            return Promise.resolve(require(resolved));
        } catch (e) {
            if (_isEsmRequireError(e)) {
                return _importModule(pathToFileURL(resolved).href).then(
                    (mod) => (mod && mod.default) || mod,
                    (importError) => {
                        throw _puppeteerLoadError(name, importError);
                    });
            }

            loadError = loadError || _puppeteerLoadError(name, e);
        }
    }

    if (loadError) {
        throw loadError;
    }

    throw _userError("Browser/worker target requires 'puppeteer' (or 'puppeteer-core') to be installed in the target project.", [
        "npm install --save-dev puppeteer",
        "Or launch a browser yourself with --browser-launch open (no puppeteer needed).",
        "Or run this suite against --target node."
    ]);
}

// Chrome's launch (a separate OS process, mostly waiting on IPC/subprocess startup rather
// than blocking this thread) has no dependency on file discovery, the module graph
// build, or the session/server being ready -- callers should kick this off as early as
// possible (ideally before that other, often much larger, synchronous work even starts)
// so the two overlap instead of running back-to-back.
export function _launchPuppeteerBrowser(cwd: string): Promise<any> {
    return _loadPuppeteer(cwd).then((puppeteer) => puppeteer.launch({
        headless: true,
        args: [
            "--disable-web-security",
            "--disable-site-isolation-trials",
            "--no-sandbox",
            // Skips proxy auto-detection (WPAD) for every navigation -- this tool only ever
            // navigates to a localhost URL it just started serving itself, so there is never
            // a reason to consult a proxy for it.
            "--no-proxy-server",
            "--proxy-bypass-list=*"
        ]
    }));
}

/**
 * Where the warm-up navigation goes: a port nothing can be listening on, so the connection is
 * refused immediately and no server needs to exist yet.
 */
const _WARM_UP_URL = "http://127.0.0.1:1/";

/**
 * How long to wait for that refusal before giving up on warming. Generously above the ~6s the
 * initialisation itself takes, because abandoning it half way is the one outcome with no upside:
 * the cost is paid either way, and only a completed warm-up makes the real navigation cheap.
 */
const _WARM_UP_TIMEOUT = 20000;

/**
 * Gets Chrome's one-time network initialisation out of the way.
 *
 * Chrome does not initialise its network stack at launch, but on the first navigation that actually
 * reaches the network -- and that first navigation is expensive: measured on this project's Windows
 * hardware it costs ~6s, while every navigation after it costs ~20ms. `about:blank` does not trigger
 * it (measured: a real navigation afterwards still paid the full ~5s), so only a real HTTP URL will
 * do; the URL does not have to resolve to anything, which is why this aims at a dead port rather
 * than needing the run's own server to be listening first.
 *
 * The point is *when* this runs, not that it runs: started before the module graph build, the
 * initialisation proceeds inside Chrome's own process while this process is busy compiling, so the
 * two overlap instead of stacking. Started afterwards it would save nothing.
 *
 * @param browser - The launched browser to warm.
 * @returns A promise that settles once the initialisation is done (or was given up on). It never
 * rejects: failing to warm just means the real navigation pays for it, exactly as it used to.
 */
export function _warmUpPuppeteerBrowser(browser: any): Promise<void> {
    return (async () => {
        try {
            // The same page the run itself will reuse, so the initialisation lands where it is
            // needed and no second tab is opened.
            const pages = await browser.pages();
            const page = pages.length > 0 ? pages[0] : await browser.newPage();

            await page.goto(_WARM_UP_URL, {
                waitUntil: "domcontentloaded",
                timeout: _WARM_UP_TIMEOUT
            });
        } catch (e) {
            // Expected -- the connection is refused, which is all this needs. A timeout, or a
            // browser that went away, is equally harmless.
        }
    })();
}

/**
 * A single puppeteer-driven visit against an *already-started* session: launches (or reuses) a
 * browser, navigates it to `target`'s runner page, waits for that one run to report back, writes
 * coverage if requested, and closes *just the browser* it launched -- deliberately not the
 * session's server, which the caller owns the lifecycle of. A one-shot run (`_runPuppeteerTarget`
 * below) tears the server down right after this returns; the `--watch` loop in execute.ts instead
 * calls this repeatedly against the *same* long-lived session, which is exactly what keeps that
 * session's server responsive to a real browser opening it manually between watch iterations --
 * previously every iteration threw away and recreated the whole session (server included), so
 * nothing was listening at all in the gaps between runs.
 */
export async function _runPuppeteerOnce(session: IBrowserRunnerSession, target: string, parsed: any, browserPromise?: Promise<any>): Promise<{ summary: any, testMs: number, reportMs: number }> {
    const testsStart = Date.now();
    const targetUrl = _getRunnerUiUrl(session.server.url || "", target === "worker" ? "worker" : "browser", true);
    // Armed *before* navigating -- the page's own "ready" -> run -> report round trip can only
    // ever report back to whichever completion is currently live.
    const completion = session.nextCompletion();

    // Nothing awaits this until the browser is up and `page.goto` has returned. A page that fails
    // fast can report its error inside that window, and the rejection was then an
    // unhandledRejection, killing the process with a raw stack. Marking it handled changes nothing
    // about the error: the await below still sees the same rejection and reports it the normal way.
    completion.catch(() => {
        // Reported by the await below.
    });

    const browser = await (browserPromise || _launchPuppeteerBrowser(process.cwd()));

    try {
        // Chrome always starts with one blank tab already open -- reuse it instead of opening
        // a second one via newPage().
        const existingPages = await browser.pages();
        const page = existingPages.length > 0 ? existingPages[0] : await browser.newPage();
        page.on("console", (msg: any) => {
            const text = msg && msg.text ? msg.text() : String(msg);
            if (text) {
                console.log(text);
            }
        });

        await page.goto(targetUrl, {
            waitUntil: "domcontentloaded"
        });

        const result = await completion;

        // Measured at 6.4 to 10.6s, against ~1ms for killing the process instead -- Chrome's graceful
        // shutdown is the whole of that, not temp-directory cleanup (a persistent profile made no
        // difference). Closing properly is nonetheless deliberate: a clean shutdown is wanted, and a
        // kill would leave puppeteer's temporary profile directories behind, since removing them is
        // part of what close() does. Please don't "optimise" this into a kill.
        await browser.close();
        const testMs = Date.now() - testsStart;

        const reportStart = Date.now();
        if (parsed.coverage) {
            _writePuppeteerCoverage(process.cwd(), target, result.coverage || null, parsed);
        }
        const reportMs = Date.now() - reportStart;

        return { summary: result.summary, testMs, reportMs };
    } catch (e) {
        await browser.close().catch(() => {
            // Already closed/never fully launched -- nothing more to clean up.
        });
        throw e;
    }
}

export async function _runPuppeteerTarget(target: string, moduleGraphsByTarget: { browser: IBrowserWorkerModuleGraph, worker: IBrowserWorkerModuleGraph }, parsed: any, browserPromise?: Promise<any>) {
    // Puppeteer is a one-shot, single-process launch that only ever visits one target -- the
    // graph was already built eagerly by execute.ts before this function was called, so this
    // adapter just hands the already-built graph straight through the same lazy-cache
    // machinery the interactive (open/manual) launches use; "lazy" here still means "build on
    // first access", which happens immediately below regardless.
    const graphBuilders: IGraphBuilders = {
        resolveEntryFiles: () => [],
        buildGraph: (graphTarget) => graphTarget === "worker" ? moduleGraphsByTarget.worker : moduleGraphsByTarget.browser,
        // This cache is discarded right after the single run below regardless of --watch (see
        // execute.ts's own watch-and-rerun loop for that flag) -- pre-warming it here would
        // just leak an fs.watch() handle that keeps the process alive past teardown.
        watch: false
    };
    const session = await _startBrowserRunnerSession(graphBuilders, parsed);

    try {
        const result = await _runPuppeteerOnce(session, target, parsed, browserPromise);
        await Promise.resolve(session.server.stop());
        session.dispose();
        return result;
    } catch (e) {
        await Promise.resolve(session.server.stop()).catch(() => {
            // Best-effort: already failing, don't let a stop() error mask the real one.
        });
        session.dispose();
        throw e;
    }
}
