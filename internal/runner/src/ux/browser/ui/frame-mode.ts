/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { createTimeoutPromise } from "@nevware21/ts-async";
import { createReporter } from "../../../reporters";
import { installDefineRegistry, createRequire, getBrowserLoaderContext, buildSuite, setTripwireGlobals } from "../../../shared/moduleLoader";
import { createSettingsGrepFilter, createSelectionFilter, applyFilters } from "../../../shared/filters";
import { createBailListener } from "../../../shared/bailListener";
import { getSuitePartsFromNode, createAssertionLabel } from "../../../shared/suiteNames";
import { addAssertionValues } from "../../../shared/assertionValues";
import { collectSuiteAndTests, createEmptyDiscovery } from "../../../shared/discovery";
import { resolveUrl, safeToString } from "./utils";
import { AUTO_FINISH } from "./dom";

// Browser target only -- the worker target runs directly from the host page (see
// _runWorkerDirect/_initWorkerHost in client.ts) rather than through this frame. The frame's
// only role for worker used to be relaying postMessages between the real Worker and the host;
// it never ran any test code of its own here (discovery was always empty), so there was no
// frame-specific behaviour actually lost by that direct path replacing it.

let _frameStopRequested = false;

function _postToParent(msg: any) {
    window.parent.postMessage(msg, "*");
}

/**
 * Suite/test lifecycle events (suiteStart/suiteDone/testStart/testDone) fire once per suite
 * and per test -- thousands of times for a large suite. Each `postMessage` call across the
 * iframe boundary costs real, measurable time (structured-clone + cross-realm dispatch), and
 * at that volume it dominates the actual run: for this project's own ~2600-test suite,
 * posting one message per event was measured adding several *seconds* on top of the run's
 * actual execution time. Batching every event queued within the same microtask into a single
 * `lifecycleBatch` message (mirroring the existing log-queue batching pattern in logging.ts)
 * cuts the message count -- and that overhead -- by roughly the average batch size, with no
 * loss of live-progress granularity worth mentioning (a microtask is imperceptibly short).
 */
var _lifecycleQueue: any[] = [];
var _lifecycleFlushScheduled = false;

function _queueLifecycleEvent(evt: any) {
    _lifecycleQueue.push(evt);
    if (!_lifecycleFlushScheduled) {
        _lifecycleFlushScheduled = true;
        Promise.resolve().then(_flushLifecycleEvents);
    }
}

function _flushLifecycleEvents() {
    _lifecycleFlushScheduled = false;
    if (!_lifecycleQueue.length) {
        return;
    }

    var events = _lifecycleQueue;
    _lifecycleQueue = [];
    _postToParent({ kind: "lifecycleBatch", events: events });
}

/**
 * Builds a `require()` backed by the module registry that the frame HTML's embedded
 * `<script>` tags have (by now) populated via `__tripwireDefine__`. Throws an aggregate,
 * actionable error up front if any module script failed to load (see the capturing error
 * listener installed by the frame HTML bootstrap in frame.html) rather than letting `req()`
 * fail lazily and opaquely for whichever module happens to be missing.
 */
function _createFrameRequire(): (id: string) => any {
    var loadErrors: string[] = (window as any).__tripwireModuleLoadErrors__ || [];
    if (loadErrors.length) {
        throw new Error("Failed to load " + loadErrors.length + " module script(s): " + loadErrors.join(", "));
    }

    var registry = installDefineRegistry(window);
    return createRequire(registry, getBrowserLoaderContext());
}

function _installFrameConsoleBridge() {
    var levels: Array<"log" | "info" | "warn" | "error"> = ["log", "info", "warn", "error"];

    for (var i = 0; i < levels.length; i++) {
        (function(level) {
            (console as any)[level] = function() {
                var parts: string[] = [];
                for (var a = 0; a < arguments.length; a++) {
                    parts.push(safeToString(arguments[a]));
                }
                _postToParent({ kind: "log", level: level, message: parts.join(" ") });
            };
        })(levels[i]);
    }
}

async function _runBrowserInFrame(payloadObj: any, selection: any) {
    var req = _createFrameRequire();
    var tripwire = req(payloadObj.tripwireModuleId);
    setTripwireGlobals(tripwire, window);

    var settings = payloadObj.settings || {};
    var suite = await buildSuite(tripwire, req, payloadObj, settings);

    // --coverage: force-load every src/**/*.ts file the run wasn't otherwise going to
    // require(), purely so its module-load code contributes real coverage (see
    // coverageOnlyIds' doc comment on IRunPayload). Not test suites -- a load failure here
    // is swallowed per-module rather than failing the run.
    var coverageOnlyIds: string[] = payloadObj.coverageOnlyIds || [];
    for (var ci = 0; ci < coverageOnlyIds.length; ci++) {
        try {
            req(coverageOnlyIds[ci]);
        } catch (e) {
            // Best-effort: this file's coverage falls back to the server-side zero-fill pass.
        }
    }

    var reporterOptions: any = {};
    if (settings.slow !== undefined) {
        reporterOptions.slowThreshold = settings.slow;
    }
    if (settings.trace) {
        reporterOptions.showExecution = true;
    }

    var runner = tripwire.createTestRunner(suite);
    var listenerEvents = (tripwire && (tripwire.eListenerEvent || tripwire.ListenerEvent)) || {
        Run: 0, Suite: 1, Test: 2, Hook: 3, Assertion: 4
    };

    function getEventType(event: any, context: any) {
        var ctx = context && context.v;
        if (ctx && ctx.type !== undefined && ctx.type !== null) {
            return ctx.type;
        }
        return event;
    }

    applyFilters(runner, [
        createSettingsGrepFilter(settings),
        createSelectionFilter(selection)
    ]);

    // --bail, the one listener all three targets share (shared/bailListener.ts): abort the run
    // from the first test that fails. Registered outside the !AUTO_FINISH block below because
    // bail matters most in exactly the headless case -- without it here, `--bail` parsed fine,
    // rode along in the payload settings and was then silently ignored, running the whole
    // suite to completion.
    if (settings.bail) {
        runner.addListener(createBailListener());
    }

    // In AUTO_FINISH (puppeteer/headless) mode nobody ever sees the live results tree this
    // listener builds (ensureTestNode/ensureSuiteNode create real DOM nodes and force
    // synchronous layout via _wasAtBottom/_stickToBottom on every single suite/test, and
    // assertion display does the same) -- and none of it feeds the actual reported result:
    // `runner.getResults()` below is computed internally by the runner, independent of this
    // DOM tree. Measured cost for this project's own ~2600-test suite: several seconds of
    // DOM node creation and forced reflow for a UI that is never rendered. Skipping listener
    // registration entirely (not just batching its messages) removes that cost at the source.
    if (!AUTO_FINISH) {
        runner.addListener({
            onStart: function(event: any, context: any) {
                if (_frameStopRequested) {
                    return { action: 2, reason: "Run stopped by user" };
                }

                var eventType = getEventType(event, context);
                var ctx = context && context.v;

                if (eventType === listenerEvents.Suite) {
                    _queueLifecycleEvent({ kind: "suiteStart", suiteParts: getSuitePartsFromNode(ctx ? ctx.suite : null) });
                    return;
                }

                if (eventType !== listenerEvents.Test) {
                    return;
                }

                var suiteParts = getSuitePartsFromNode(ctx ? ctx.suite : null);
                var testName = ctx && ctx.test && ctx.test.description ? ctx.test.description : "(unnamed test)";
                _queueLifecycleEvent({ kind: "testStart", suiteParts: suiteParts, testName: testName });
            },
            onDone: function(event: any, context: any) {
                var eventType = getEventType(event, context);

                if (eventType === listenerEvents.Suite) {
                    var sctx = context && context.v;
                    var suiteDuration = sctx && sctx.end && typeof sctx.end.duration === "number" ? sctx.end.duration : 0;
                    _queueLifecycleEvent({ kind: "suiteDone", suiteParts: getSuitePartsFromNode(sctx ? sctx.suite : null), durationMs: suiteDuration });
                    return;
                }

                if (eventType !== listenerEvents.Test) {
                    return;
                }

                var ctx = context && context.v;
                var suiteParts = getSuitePartsFromNode(ctx ? ctx.suite : null);
                var testName = ctx && ctx.test && ctx.test.description ? ctx.test.description : "(unnamed test)";
                var endStatus = ctx && ctx.end && ctx.end.status ? String(ctx.end.status) : "pending";
                var durationMs = ctx && ctx.end && typeof ctx.end.duration === "number" ? ctx.end.duration : 0;
                var endErrorText = (ctx && ctx.end && ctx.end.error) ? safeToString(ctx.end.error && ctx.end.error.message ? ctx.end.error.message : ctx.end.error) : "";
                _queueLifecycleEvent({ kind: "testDone", suiteParts: suiteParts, testName: testName, endStatus: endStatus, durationMs: durationMs, endErrorText: endErrorText });
            },
            onAssert: function(context: any) {
                var actx = context && context.v ? context.v : context;
                var errorText = (actx && actx.error) ? safeToString(actx.error && actx.error.message ? actx.error.message : actx.error) : "";
                _queueLifecycleEvent(addAssertionValues({
                    kind: "assert",
                    passed: !!(actx && actx.passed),
                    label: createAssertionLabel(actx),
                    errorText: errorText
                }, actx && actx.error));
            }
        });
    }

    // chromacon's own Chrome/Chromium detection (navigator.userAgent regex) never matches
    // Puppeteer's real UA string ("...HeadlessChrome/N.N.N...") since "Chrome" there isn't
    // preceded by a word boundary -- glued directly onto "Headless" -- so auto-detection
    // reports no color support and every reporter falls back to plain, uncolored text. Force
    // it on instead: this code only ever runs inside a real Chromium engine (Puppeteer's
    // bundled Chrome, or a real browser in --browser-launch open/manual), so basic color
    // support is always actually there regardless of what detection concluded. Calling
    // chromacon's own setColorLevel() directly doesn't survive bundling here -- rollup's
    // tree-shaking drops the call as dead code since its void return goes unused -- so this
    // sets the plain env-style global chromacon's own detection already falls back to
    // checking instead; a property write can't be tree-shaken away the same way.
    if (typeof (globalThis as any).process === "undefined") {
        (globalThis as any).process = { env: { FORCE_COLOR: "1" } };
    }

    // Mirrors the node-target CLI (execute.ts): normally a single reporter, but nothing
    // stops registering more than one at once since every reporter is just an independent
    // listener and the notification manager already fans events out to as many as are
    // registered.
    var reporterNames: string[] = (settings.reporter && settings.reporter.length) ? settings.reporter : ["spec"];
    for (var ri = 0; ri < reporterNames.length; ri++) {
        var reporter = createReporter(reporterNames[ri], reporterOptions);
        runner.addListener(reporter.listener);
    }
    // Mirrors the node-target CLI (execute.ts) and the worker target: a `before`/`after` hook
    // that throws rejects the run rather than completing it -- swallowed here so the summary
    // (which carries every hook failure) still makes it back to the CLI to be reported on.
    try {
        await runner.run();
    } catch (e: any) {
        // Logged rather than rethrown/returned: the console bridge already relays this to the
        // CLI (and to the page's own log panel in interactive mode), and the hook failures it
        // was raised for are carried back to the CLI on the summary below regardless.
        console.error("Run aborted: " + (e && e.stack ? e.stack : String(e)));
    }

    // Force out any lifecycle events still sitting in the batch queue -- the microtask
    // flush scheduled for them is guaranteed to run before this line (an `await`, even of an
    // already-resolved value, always drains the microtask queue first), so this is a no-op
    // in practice, but calling it explicitly removes any doubt before moving on.
    _flushLifecycleEvents();

    // For synchronous test suites the runner completes in one JS task, leaving
    // the final postMessage batch queued as a macrotask. setTimeout(0) yields to let the
    // parent's event loop drain it and fire a requestAnimationFrame render cycle before we
    // send "runDone". That way the test results are painted before the status bar updates
    // to "Run complete".
    await createTimeoutPromise(0, true);

    // Istanbul-instrumented modules write their counters into this frame's own window
    // (the coverage variable name istanbul is configured with, see codecov/instrumenter.ts) --
    // read it out now, before the frame is torn down, same as the worker target already does.
    return { summary: runner.getResults(), coverage: (window as any).__coverage__ || null };
}

export async function frameInitialize() {
    _installFrameConsoleBridge();

    try {
        var response = await fetch(resolveUrl("/api/payload-browser"));
        var payload = await response.json();

        // In AUTO_FINISH (puppeteer/headless) mode nobody ever sees the Scope picker --
        // client.ts's "ready" handler immediately runs the default (all) selection regardless
        // of what discovery contains (see client.ts's _onFrameMessage). Building the suite
        // tree here just to list it and then discard it duplicates the *actual* run's own
        // buildSuite() call below at full cost (every describe/it registration for the whole
        // suite, tripwire's global suite/id-generator state included) for zero benefit.
        var discovery: any;
        if (!AUTO_FINISH) {
            var req = _createFrameRequire();
            var tripwire = req(payload.tripwireModuleId);
            setTripwireGlobals(tripwire, window);
            var suite = await buildSuite(tripwire, req, payload, payload.settings || {});
            discovery = collectSuiteAndTests(suite);
        } else {
            discovery = createEmptyDiscovery();
        }

        _postToParent({ kind: "ready", discovery: discovery });

        window.addEventListener("message", function(evt: MessageEvent) {
            if (!evt.data || !evt.data.kind) {
                return;
            }

            if (evt.data.kind === "run") {
                _frameStopRequested = false;
                var selection = evt.data.selection || {};

                _runBrowserInFrame(payload, selection).then(function(result: any) {
                    if (result && result.error) {
                        _postToParent({ kind: "runError", error: String(result.error) });
                        return;
                    }
                    var summary = (result && result.summary !== undefined) ? result.summary : result;
                    var coverage = (result && result.coverage !== undefined) ? result.coverage : null;
                    _postToParent({ kind: "runDone", summary: summary, coverage: coverage });
                }).catch(function(e: any) {
                    _postToParent({ kind: "runError", error: e && e.stack ? e.stack : String(e) });
                });
            }

            if (evt.data.kind === "stop") {
                _frameStopRequested = true;
            }
        });

    } catch (e: any) {
        _postToParent({ kind: "runError", error: e && e.stack ? e.stack : String(e) });
    }
}
