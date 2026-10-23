/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IBrowserWorkerModuleGraph } from "./browser";
import { _markUserError } from "../internal/userError";

/**
 * The worker's entire program: pull the arguments out of `workerData`, hand them to the entry this
 * bundle exports, and let that do the work. Kept to two lines because it is passed as source text
 * (`eval: true`) rather than shipped as a file -- there is no second build artifact to keep in step
 * with this one, and nothing to resolve on disk at run time.
 */
const _BOOTSTRAP = [
    "const { workerData } = require(\"worker_threads\");",
    "require(workerData.bin)._graphWorkerEntry();"
].join("\n");

/**
 * What the worker posts back: either the built graph, or enough of the error to rebuild it here.
 * A structured clone drops an `Error`'s own properties, so the user-error marking that decides
 * whether the CLI prints a stack has to travel as plain data and be re-applied on arrival.
 *
 * Exported for the entry that produces it, which lives in the CLI module rather than here: it needs
 * the graph builder, and that module already imports this one.
 */
export interface IGraphWorkerResult {
    ok: boolean;
    graph?: IBrowserWorkerModuleGraph;
    message?: string;
    stack?: string;
    user?: boolean;
    hints?: string[];
}

/**
 * Whether this process can run the graph build on a worker thread at all: `worker_threads` has to
 * be available, and `bin` has to be the bundle that exports `_graphWorkerEntry` (running from
 * un-bundled build output, it is not).
 */
function _loadWorkerThreads(): any {
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
        const workerThreads = require("worker_threads");

        return workerThreads && typeof workerThreads.Worker === "function" ? workerThreads : null;
    } catch (e) {
        // No worker_threads (an old or unusual runtime): the caller builds in-process instead.
        return null;
    }
}

/**
 * Starts the module graph build on its own thread, or returns `null` when it should not or cannot.
 *
 * **Off unless `--graph-thread` asks for it, because it measured no benefit.** The idea was
 * sound as far as it went: the build is synchronous and holds this thread's event loop for seconds,
 * and while it does `puppeteer.launch()` cannot even settle, since finishing it means reading the
 * DevTools endpoint Chrome prints and connecting to it. Moving the build off-thread does free the
 * loop, and the launch does then settle during the build -- but the build goes on competing for the
 * *CPU* Chrome needs to start, and the launch stretched from ~1.9s to ~3.5s in exchange. Chrome's
 * launch plus its first-navigation initialisation is the critical path either way, and the build
 * already hides inside it. Three interleaved A/B pairs on the worker target had the in-process build
 * ahead every time, by 0.3s, 1.6s and 5.0s; the browser target showed no difference.
 *
 * Kept because the measurement is machine-specific -- somewhere with more cores, or a slower
 * compile against a faster Chrome, could land the other way -- and because it is the only way to
 * test that claim.
 *
 * A rejection is a real failure to build (a type error, most often) and belongs to the caller. Only
 * a `null` return means "not available, build it yourself".
 *
 * @param entryFiles - The entry files to walk.
 * @param cwd - The directory the run was started from.
 * @param parsed - The parsed CLI arguments, which must survive a structured clone.
 * @param typeCheck - Whether the build should report type errors. Passed explicitly because the
 * flag it sets is module state, and the worker gets its own copy of every module.
 * @param bin - The path of this bundle, which the worker re-requires to reach the entry below.
 * @returns The pending graph, or `null` when the build has to happen in-process.
 */
export function _startGraphWorker(entryFiles: string[], cwd: string, parsed: any, typeCheck: boolean, bin: string): Promise<IBrowserWorkerModuleGraph> | null {
    if (!parsed || !parsed.graphThread) {
        return null;
    }

    const workerThreads = _loadWorkerThreads();
    if (!workerThreads || !bin) {
        return null;
    }

    let worker: any;
    try {
        worker = new workerThreads.Worker(_BOOTSTRAP, {
            eval: true,
            workerData: {
                bin: bin,
                entryFiles: entryFiles,
                cwd: cwd,
                parsed: parsed,
                typeCheck: typeCheck
            }
        });
    } catch (e) {
        // Could not be constructed (an unclonable argument, a runtime that forbids threads): the
        // caller falls back rather than failing the run.
        return null;
    }

    return new Promise<IBrowserWorkerModuleGraph>((resolve, reject) => {
        let settled = false;

        function _settle(fn: () => void): void {
            if (!settled) {
                settled = true;
                fn();
            }
        }

        worker.on("message", (result: IGraphWorkerResult) => {
            _settle(() => {
                if (result && result.ok && result.graph) {
                    resolve(result.graph);
                } else {
                    const error = new Error((result && result.message) || "the module graph build failed");
                    if (result && result.stack) {
                        error.stack = result.stack;
                    }

                    reject(result && result.user ? _markUserError(error, result.hints) : error);
                }
            });

            // Nothing more will come from it, and an un-terminated worker keeps the process alive.
            worker.terminate();
        });

        worker.on("error", (err: Error) => {
            _settle(() => reject(err));
        });

        worker.on("exit", (code: number) => {
            // Only reachable when the worker died without reporting -- a message always terminates
            // it above, by which point this is a no-op.
            _settle(() => reject(new Error("the module graph worker exited with code " + code)));
        });
    });
}
