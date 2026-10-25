/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { isNumber } from "@nevware21/ts-utils";
import { createReporter } from "../reporters";
import { getSuitePartsFromNode, createAssertionLabel } from "../shared/suiteNames";
import { installDefineRegistry, createRequire, getWorkerLoaderContext, setTripwireGlobals, buildSuite } from "../shared/moduleLoader";
import { createSettingsGrepFilter, createSelectionFilter, applyFilters } from "../shared/filters";
import { createBailListener } from "../shared/bailListener";
import { collectSuiteAndTests, createEmptyDiscovery } from "../shared/discovery";
import { createRunnerHost, applyGlobalRunnerConfig } from "./runnerHost";

/**
 * Loads every module script needed for this run via `importScripts()`, one call per URL
 * (not one batched call) so a single failing script doesn't abort the whole batch and its
 * failure is individually attributable -- see the aggregate error thrown below.
 */
function _loadModuleScripts(moduleUrls: Record<string, string>): void {
    const urls = Object.keys(moduleUrls).map((id) => moduleUrls[id]);
    const failures: string[] = [];

    for (let i = 0; i < urls.length; i++) {
        try {
            importScripts(urls[i]);
        } catch (e: any) {
            failures.push(urls[i] + " (" + (e && e.message ? e.message : String(e)) + ")");
        }
    }

    if (failures.length) {
        throw new Error("Failed to load " + failures.length + " worker module script(s): " + failures.join(", "));
    }
}

function _installWorkerConsoleBridge() {
    const levels = ["log", "info", "warn", "error"] as const;
    for (let i = 0; i < levels.length; i++) {
        (function(level: string) {
            (console as any)[level] = function() {
                const parts: string[] = [];
                for (let a = 0; a < arguments.length; a++) {
                    parts.push(String(arguments[a]));
                }
                (self as any).postMessage({ kind: "log", level: level, message: parts.join(" ") });
            };
        })(levels[i]);
    }
}

/**
 * Loads this run's module scripts and returns the tripwire module they were built against,
 * with the bare test globals installed. Shared by the two things a worker is asked to do --
 * discover the suite tree, and run it -- which need an identical environment up to the point
 * `buildSuite` is called.
 */
function _prepare(payload: any): { tripwire: any, req: (id: string) => any } {
    const registry = installDefineRegistry(self);
    _loadModuleScripts(payload.moduleUrls || {});
    const req = createRequire(registry, getWorkerLoaderContext());
    const tripwire = req(payload.tripwireModuleId);

    setTripwireGlobals(tripwire, self);

    return { tripwire, req };
}

/**
 * Answers a "discover" message: builds the suite tree and posts back the flat suite/test lists
 * the host page's Scope picker is populated from, without running anything.
 *
 * This exists because the worker target has no test frame to build a discovery in -- the
 * browser target does that in `frame-mode.ts`'s `frameInitialize`, but for worker the host runs
 * the Worker directly (see `_runWorkerDirect`), and only code inside the Worker can load the
 * test modules. Without this the host had nothing to populate the picker from and it showed
 * "No matches" for the entire session.
 *
 * A failure is reported as a discovery with an `error` rather than as a thrown run error: the
 * picker is an optional convenience and the run that follows is what surfaces a genuinely
 * broken suite, with a far better message than a discovery pass could give. The host logs the
 * error so the empty picker still has a stated reason.
 */
async function _handleDiscover(payload: any, settings: any): Promise<void> {
    try {
        const { tripwire, req } = _prepare(payload);
        const restoreRunnerConfig = applyGlobalRunnerConfig(tripwire, settings);

        try {
            const suite = await buildSuite(tripwire, req, payload, settings);
            (self as any).postMessage({ kind: "discovery", discovery: collectSuiteAndTests(suite) });
        } finally {
            restoreRunnerConfig();
        }
    } catch (e: any) {
        (self as any).postMessage({
            kind: "discovery",
            discovery: createEmptyDiscovery(),
            error: e && e.stack ? e.stack : String(e)
        });
    }
}

export function startWorkerRunner(): void {
    _installWorkerConsoleBridge();

    (self as any).onmessage = async function(evt: MessageEvent): Promise<void> {
        const data = (evt && evt.data) || {};
        const payload = data.payload || data;
        const selection = data.selection || {};
        const settings = payload.settings || {};
        const autoFinish = !!data.autoFinish;

        // The run message carries no `kind` at all (it is `{ payload, selection, autoFinish }`),
        // so discovery is opted into by name and every existing message shape still runs.
        if (data.kind === "discover") {
            await _handleDiscover(payload, settings);
            return;
        }

        try {
            const { tripwire, req } = _prepare(payload);

            const restoreRunnerConfig = applyGlobalRunnerConfig(tripwire, settings);
            try {
                const suite = await buildSuite(tripwire, req, payload, settings);

                // --coverage: force-load every src/**/*.ts file the run wasn't otherwise
                // going to require(), purely so its module-load code contributes real
                // coverage (see coverageOnlyIds' doc comment on IRunPayload). Not test
                // suites -- a load failure here is swallowed per-module rather than failing
                // the run.
                const coverageOnlyIds: string[] = payload.coverageOnlyIds || [];
                for (let ci = 0; ci < coverageOnlyIds.length; ci++) {
                    try {
                        req(coverageOnlyIds[ci]);
                    } catch (e) {
                        // Best-effort: this file's coverage falls back to the server-side
                        // zero-fill pass.
                    }
                }

                const runner = tripwire.createTestRunner(suite, createRunnerHost(tripwire, settings));

                applyFilters(runner, [
                    createSettingsGrepFilter(settings),
                    createSelectionFilter(selection)
                ]);

                let currentTestRef: { suiteParts: string[]; testName: string } | null = null;

                // In autoFinish (puppeteer/headless) mode nobody ever sees the live results UI
                // these events drive, and none of it feeds the actual reported result (that
                // comes from runner.getResults() below, independent of this listener). Beyond
                // the wasted postMessage/DOM cost this mirrors on the frame-mode.ts side (see
                // _runBrowserInFrame's matching guard), an *active* listener also forces
                // `_notifyAssert`'s lazy assertion-context payload to be evaluated for every
                // assertion (a notification manager only builds it when it actually has
                // listeners) -- which reads the current opPath. Skipping registration entirely
                // in headless mode avoids that read.
                if (!autoFinish) {
                    runner.addListener({
                        onStart: function(event: any, context: any) {
                            const ctx = context && context.v;
                            if (event === 1) {
                                (self as any).postMessage({
                                    kind: "suiteStart",
                                    suiteParts: getSuitePartsFromNode(ctx ? ctx.suite : null)
                                });
                                return;
                            }

                            if (event === 2) {
                                const suiteParts = getSuitePartsFromNode(ctx ? ctx.suite : null);
                                const testName = ctx && ctx.test && ctx.test.description ? ctx.test.description : "(unnamed test)";
                                currentTestRef = { suiteParts, testName };
                                (self as any).postMessage({ kind: "testStart", suiteParts, testName });
                            }
                        },
                        onDone: function(event: any, context: any) {
                            const ctx = context && context.v;
                            if (event === 1) {
                                (self as any).postMessage({
                                    kind: "suiteDone",
                                    suiteParts: getSuitePartsFromNode(ctx ? ctx.suite : null),
                                    durationMs: ctx && ctx.end && isNumber(ctx.end.duration) ? ctx.end.duration : 0
                                });
                                return;
                            }

                            if (event === 2) {
                                (self as any).postMessage({
                                    kind: "testDone",
                                    suiteParts: getSuitePartsFromNode(ctx ? ctx.suite : null),
                                    testName: ctx && ctx.test && ctx.test.description ? ctx.test.description : "(unnamed test)",
                                    endStatus: ctx && ctx.end && ctx.end.status ? String(ctx.end.status) : "pending",
                                    durationMs: ctx && ctx.end && isNumber(ctx.end.duration) ? ctx.end.duration : 0
                                });
                                currentTestRef = null;
                            }
                        },
                        onAssert: function(context: any) {
                            const actx = context && context.v;
                            (self as any).postMessage({
                                kind: "assert",
                                suiteParts: currentTestRef ? currentTestRef.suiteParts : [],
                                testName: currentTestRef ? currentTestRef.testName : "",
                                passed: !!(actx && actx.passed),
                                label: createAssertionLabel(actx),
                                errorText: actx && actx.error ? String(actx.error.message || actx.error) : ""
                            });
                        }
                    });
                }

                // --bail, the one listener all three targets share (../shared/bailListener.ts).
                if (settings.bail) {
                    runner.addListener(createBailListener());
                }

                const reporterOptions: any = {};
                if (settings.slow !== undefined) {
                    reporterOptions.slowThreshold = settings.slow;
                }
                if (settings.trace) {
                    reporterOptions.showExecution = true;
                }

                // chromacon's own Chrome/Chromium detection (navigator.userAgent regex) never
                // matches Puppeteer's real UA string ("...HeadlessChrome/N.N.N...") since
                // "Chrome" there isn't preceded by a word boundary -- glued directly onto
                // "Headless" -- so auto-detection reports no color support and every reporter
                // falls back to plain, uncolored text. Force it on instead: this code only ever
                // runs inside a real Worker in a Chromium engine (Puppeteer's bundled Chrome,
                // or a real browser in --browser-launch open/manual), so basic color support is
                // always actually there regardless of what detection concluded. Calling
                // chromacon's own setColorLevel() directly doesn't survive bundling here --
                // rollup's tree-shaking drops the call as dead code since its void return goes
                // unused -- so this sets the plain env-style global chromacon's own detection
                // already falls back to checking instead; a property write can't be
                // tree-shaken away the same way.
                if (typeof (globalThis as any).process === "undefined") {
                    (globalThis as any).process = { env: { FORCE_COLOR: "1" } };
                }

                // Mirrors the node-target CLI (execute.ts) and the browser frame (frame-mode.ts):
                // normally a single reporter, but nothing stops registering more than one at once.
                const reporterNames: string[] = (settings.reporter && settings.reporter.length) ? settings.reporter : ["spec"];
                for (let ri = 0; ri < reporterNames.length; ri++) {
                    const reporter = createReporter(reporterNames[ri], reporterOptions);
                    runner.addListener(reporter.listener);
                }
                // Mirrors the node CLI (execute.ts): a `before`/`after` hook that throws rejects
                // the run instead of completing it. Caught (and logged through the console
                // bridge, which the CLI relays) rather than left to the outer handler below,
                // which would post an error *instead of* the summary -- and the summary is what
                // carries every hook failure back for the CLI to report on.
                try {
                    await runner.run();
                } catch (e: any) {
                    console.error("Run aborted: " + (e && e.stack ? e.stack : String(e)));
                }

                (self as any).postMessage({
                    summary: runner.getResults(),
                    coverage: (self as any).__coverage__ || null
                });
            } finally {
                restoreRunnerConfig();
            }
        } catch (e: any) {
            (self as any).postMessage({ error: e && e.stack ? e.stack : String(e) });
        }
    };
}
