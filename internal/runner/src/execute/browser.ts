/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import * as path from "path";
import * as fs from "fs";
import { _getRunnerUiUrl } from "./ui";
import { spawn } from "child_process";
import { brightCyan, cyan } from "@nevware21/chromacon";
import { _startBrowserRunnerSession } from "./browserRunner";

export type IBrowserWorkerModuleGraph = { modules: Record<string, string>, entryIds: string[], tripwireModuleId: string, coverageOnlyIds: string[], moduleUrls: Record<string, string>, rawAssets: Record<string, string>, elapsedMs: number };

/**
 * The pieces `execute.ts` owns (file discovery + graph building) that the interactive server
 * needs in order to (re)build a target's module graph lazily/on demand -- see
 * `targetSessionCache.ts` for how these get wrapped with staleness detection and caching.
 */
export interface IGraphBuilders {
    resolveEntryFiles(target: "browser" | "worker"): string[];
    buildGraph(target: "browser" | "worker", entryFiles: string[]): IBrowserWorkerModuleGraph;

    /**
     * Whether the interactive server's per-target cache should watch each built target's files
     * in the background and pre-warm a rebuild before the next request/poll arrives. Only true
     * for long-lived interactive sessions (`--browser-launch open`/`manual`) -- a one-shot
     * Puppeteer run's cache is discarded right after its single run regardless, so watching it
     * would just leak open `fs.watch()` handles that keep the process alive after teardown.
     */
    watch: boolean;
}

function _openExternalBrowser(url: string) {
    const platform = process.platform;
    try {
        if (platform === "win32") {
            const child = spawn("cmd", ["/c", "start", "", url], {
                windowsHide: true,
                detached: true,
                stdio: "ignore"
            });
            child.unref();
            return;
        }
        if (platform === "darwin") {
            const child = spawn("open", [url], {
                detached: true,
                stdio: "ignore"
            });
            child.unref();
            return;
        }
        const child = spawn("xdg-open", [url], {
            detached: true,
            stdio: "ignore"
        });
        child.unref();
    } catch (e) {
        console.log(cyan("Unable to auto-open browser. Open this URL manually:"), brightCyan(url));
    }
}

export async function _runInteractiveBrowserTarget(target: string, graphBuilders: IGraphBuilders, parsed: any, launchMode: string) {
    const testsStart = Date.now();
    const session = await _startBrowserRunnerSession(graphBuilders, parsed);
    const targetUrl = _getRunnerUiUrl(session.server.url || "", target === "worker" ? "worker" : "browser");

    console.log("Runner URL: " + targetUrl);

    if (launchMode === "open") {
        console.log("Opening browser via OS default handler...");
        _openExternalBrowser(targetUrl);
        console.log("If the browser did not open, use this URL: " + targetUrl);
    } else {
        console.log("Open this URL in your browser to start the run: " + targetUrl);
    }

    try {
        // Includes however long the user takes to open the page and click "Run" -- interactive
        // launches have no separate reporting step (coverage reporting is puppeteer-only).
        const result = await session.nextCompletion();

        // Stop before measuring testMs so it isn't left uncounted the way a `finally` block
        // (which runs after the return value below is computed) would leave it.
        await Promise.resolve(session.server.stop());
        // Close any background pre-warm watchers -- an open fs.watch() handle keeps the
        // process alive indefinitely, so without this an otherwise-finished interactive
        // session (the user clicked Finish) would never let the CLI process exit on its own.
        session.dispose();
        return { summary: result.summary, testMs: Date.now() - testsStart, reportMs: 0 };
    } catch (e) {
        await Promise.resolve(session.server.stop());
        session.dispose();
        throw e;
    }
}

function _isFile(filePath: string): boolean {
    try {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        return fs.statSync(filePath).isFile();
    } catch (e) {
        return false;
    }
}

export function _resolveBrowserDependency(spec: string, moduleId: string, cwd: string): string {
    try {
        return require.resolve(spec, {
            paths: [path.dirname(moduleId), cwd]
        });
    } catch (e) {
        if (spec.indexOf(".") === 0 || spec.indexOf("/") === 0 || spec.indexOf("\\") === 0) {
            const basePath = path.resolve(path.dirname(moduleId), spec);
            const candidates = [
                basePath,
                basePath + ".js",
                basePath + ".jsx",
                basePath + ".ts",
                basePath + ".tsx",
                path.join(basePath, "index.js"),
                path.join(basePath, "index.jsx"),
                path.join(basePath, "index.ts"),
                path.join(basePath, "index.tsx")
            ];

            for (let lp = 0; lp < candidates.length; lp++) {
                // A file, not just a path that exists: the bare path of a folder import is the
                // folder itself, which has to fall through to its index file.
                if (_isFile(candidates[lp])) {
                    return candidates[lp];
                }
            }
        }

        throw e;
    }
}
