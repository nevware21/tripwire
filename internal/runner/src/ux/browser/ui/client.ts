/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import * as state from "./state";
import * as dom from "./dom";
import { queueLog, clearLogs, installConsoleBridge, flushLogsNow } from "./logging";
import { clearResults, beginRenderBatch, endRenderBatch } from "./ui-rendering";
import { setStatus, setButtonsState } from "./ui-control";
import { applyFailedOnlyFilter, updateFailedOnlyForTest } from "./filtering";
import { getSelectionFromUi, populateAndRestoreSelection, getScopeCandidates, setUiSelection } from "./selection";
import { createAutocomplete } from "./autocomplete";
import { createMenu } from "./menu";
import { buildTargetUrl } from "./target";
import { readSelectionIdsFromHash, resolveSelectionFromHashIds, writeSelectionToHash, HashSelectionIds } from "./urlState";
import { resolveUrl, safeToString } from "./utils";
import { _handleSuiteStart, _handleSuiteDone, _handleTestStart, _handleTestDone } from "./test-execution";
import { _handleAssertionEvent } from "./assertions";
import { frameInitialize } from "./frame-mode";

// -----------------------------------------------------------------
// Host-mode state — declared first so assignments in _hostInitialize
// are never overwritten by the initializers below.
// -----------------------------------------------------------------
var _testFrame: HTMLIFrameElement | null = null;
var _runResolve: ((result: any) => void) | null = null;
var _runReject: ((err: any) => void) | null = null;

// Auto-reload polling state -- purely a client-side implementation detail (not shared UI
// state, unlike state.ts's autoReloadEnabled preference), so kept local to this module.
var _knownGeneration = -1;
var _autoReloadPollTimer: ReturnType<typeof setInterval> | null = null;

// Selection to re-apply once the next fresh discovery arrives -- captured from the live UI
// right before a reload (manual "Reload Tests" click or an auto-reload triggered by watch
// mode) discards and rebuilds the Scope picker, so the user's choice survives the round
// trip instead of silently resetting to "All tests". Null on first page load,
// where there is nothing prior to restore -- _pendingHashIds (below) covers that case instead.
var _pendingSelection: any = null;

// Raw suite/test ids read from the URL hash at page-init time, before any discovery exists to
// resolve them against (see resolveSelectionFromHashIds's doc comment for why that resolution
// has to wait). Consumed -- and cleared -- the first time a discovery actually arrives, in
// _resolvePendingSelection below; a later reload always has a live _pendingSelection by then and
// never needs these.
var _pendingHashIds: HashSelectionIds | null = null;

function _resolvePendingSelection(discovery: any): any {
    if (!_pendingSelection && _pendingHashIds) {
        _pendingSelection = resolveSelectionFromHashIds(discovery, _pendingHashIds);
    }

    var resolved = _pendingSelection;
    _pendingSelection = null;
    _pendingHashIds = null;
    return resolved;
}

// Suite/test lifecycle (and assertion) message kinds a worker posts purely to drive the live
// results UI -- dropped entirely in AUTO_FINISH (headless/puppeteer) mode, same reasoning as
// frame-mode.ts's own copy of this list for the browser target: nobody is watching, and
// dispatching them still means real DOM node creation/forced reflow for a results tree that's
// never rendered.
var _uiOnlyMessageKinds: any = { suiteStart: 1, testStart: 1, suiteDone: 1, testDone: 1, assert: 1 };

// -----------------------------------------------------------------
// Iframe lifecycle
// -----------------------------------------------------------------
function _createTestFrame() {
    if (dom.testFrameContainer) {
        dom.testFrameContainer.innerHTML = "";
    }

    var frame = document.createElement("iframe") as HTMLIFrameElement;
    frame.id = "test-frame";
    frame.style.display = "none";
    frame.src = resolveUrl("/__tripwire__/test-frame?target=" + dom.TARGET + (dom.AUTO_FINISH ? "&autofinish=1" : ""));

    if (dom.testFrameContainer) {
        dom.testFrameContainer.appendChild(frame);
    } else {
        document.body.appendChild(frame);
    }

    _testFrame = frame;
    return frame;
}

function _postToFrame(msg: any) {
    if (_testFrame && _testFrame.contentWindow) {
        _testFrame.contentWindow.postMessage(msg, "*");
    }
}

// -----------------------------------------------------------------
// Message router: frame → host
// -----------------------------------------------------------------

/**
 * Dispatches a single suite/test lifecycle (or assertion) event. Shared by the direct,
 * unbatched message path and by `lifecycleBatch`'s per-event iteration (see
 * frame-mode.ts's `_queueLifecycleEvent` -- batching many of these into one `postMessage`
 * call is what actually matters for performance; how each individual event gets handled
 * once it arrives is unchanged).
 */
function _dispatchLifecycleEvent(data: any) {
    if (data.kind === "suiteStart") {
        _handleSuiteStart(data.suiteParts || []);
        return;
    }

    if (data.kind === "suiteDone") {
        _handleSuiteDone(data.suiteParts || [], data.durationMs || 0);
        return;
    }

    if (data.kind === "testStart") {
        _handleTestStart(data.suiteParts || [], data.testName || "(unnamed test)", updateFailedOnlyForTest);
        return;
    }

    if (data.kind === "testDone") {
        _handleTestDone(data.suiteParts || [], data.testName || "(unnamed test)", data.endStatus || "pending", data.durationMs || 0, data.endErrorText || "", updateFailedOnlyForTest);
        return;
    }

    if (data.kind === "assert") {
        _handleAssertionEvent(data);
        return;
    }
}

// -----------------------------------------------------------------
// Worker target: run directly from the host page, no test-frame
// -----------------------------------------------------------------

/**
 * Runs the worker target directly from this (host) page instead of through a `test-frame`
 * iframe. The worker target's test frame previously existed only to relay `postMessage`s
 * between the real `Worker` and this host -- it never ran any test code of its own (so it had
 * no suite tree to report either; see the removed worker branch this replaces in frame-mode.ts,
 * and `_discoverWorkerTests` for where the picker's discovery comes from instead)
 * and the browser target's actual reason for a frame (an isolated document to embed test
 * module `<script>` tags into) never applied here. Removing that hop cuts a full extra
 * page load/script parse, and halves the message-passing distance for every log line and
 * lifecycle event a run produces (worker -> frame -> host became worker -> host).
 */
async function _runWorkerDirect(payloadObj: any, selection: any): Promise<any> {
    return await new Promise<any>(function(resolve) {
        var worker = new Worker(resolveUrl("/api/worker-script"));
        state.setActiveWorker(worker as any);

        worker.onmessage = function(evt: MessageEvent) {
            var data = evt && evt.data ? evt.data : {};
            if (data && data.kind) {
                if (dom.AUTO_FINISH && _uiOnlyMessageKinds[data.kind]) {
                    return;
                }

                if (data.kind === "log") {
                    queueLog(data.level || "log", data.message || "");
                } else {
                    _dispatchLifecycleEvent(data);
                }
                return;
            }

            state.setActiveWorker(null);
            resolve(data || {});
        };

        worker.onerror = function(evt: ErrorEvent) {
            state.setActiveWorker(null);
            resolve({ error: evt && evt.message ? String(evt.message) : "Worker execution failed." });
        };

        worker.postMessage({ payload: payloadObj, selection: selection || {}, autoFinish: dom.AUTO_FINISH });
    });
}

/**
 * Runs a throwaway Worker whose only job is to build the suite tree and report it back, so the
 * Scope picker has something to offer for the worker target.
 *
 * The browser target gets its discovery for free from the test frame's "ready" handshake; the
 * worker target has no frame, and only code running *inside* a Worker can load the test modules,
 * so the host has to ask for one explicitly. A separate, immediately-terminated Worker is used
 * rather than reusing the run's own (`_runWorkerDirect` creates a fresh one per run anyway) so
 * discovery cannot leave any registered-suite or id-generator state behind in the realm that
 * then executes the tests.
 *
 * Never rejects. Discovery is a convenience -- if it fails, the reason is logged to the page and
 * an empty discovery is returned so the run still starts, exactly as it did before there was a
 * discovery here at all.
 */
function _discoverWorkerTests(payloadObj: any): Promise<any> {
    return new Promise<any>(function(resolve) {
        var settled = false;
        var worker: Worker;

        function finish(discovery: any) {
            if (settled) {
                return;
            }

            settled = true;
            try {
                worker.terminate();
            } catch (e) {
                // Already gone (or never started) -- nothing left to clean up.
            }

            resolve(discovery || { suites: [], tests: [] });
        }

        try {
            worker = new Worker(resolveUrl("/api/worker-script"));
        } catch (e: any) {
            queueLog("warn", "Unable to discover tests: " + (e && e.message ? e.message : String(e)));
            resolve({ suites: [], tests: [] });
            return;
        }

        worker.onmessage = function(evt: MessageEvent) {
            var data = (evt && evt.data) || {};

            // A suite that logs while it is being *declared* (not run) reaches the page's log
            // panel rather than vanishing into a worker nobody is listening to.
            if (data.kind === "log") {
                queueLog(data.level || "log", data.message || "");
                return;
            }

            if (data.kind === "discovery") {
                if (data.error) {
                    queueLog("warn", "Test discovery failed, the Scope picker will be empty: " + data.error);
                }

                finish(data.discovery);
            }
        };

        worker.onerror = function(evt: ErrorEvent) {
            queueLog("warn", "Test discovery failed, the Scope picker will be empty: " +
                (evt && evt.message ? String(evt.message) : "Worker execution failed."));
            finish(null);
        };

        worker.postMessage({ kind: "discover", payload: payloadObj });
    });
}

/**
 * Fetches the worker payload, discovers the suite tree so the picker is populated, and starts
 * the run -- standing in for `_createTestFrame()` + the frame's own "ready" handshake.
 *
 * Discovery is skipped entirely under AUTO_FINISH (puppeteer/headless), mirroring the identical
 * guard in `frameInitialize`: nobody ever sees a picker there, the first run starts immediately
 * with the default selection regardless, and building the suite twice would double the most
 * expensive part of a headless worker run for no benefit.
 */
async function _initWorkerHost() {
    setStatus("Loading worker payload...");

    var response = await fetch(resolveUrl("/api/payload-worker"));
    var payload = await response.json();

    state.setPayload(payload);

    var discovery: any = { suites: [], tests: [] };
    if (!dom.AUTO_FINISH) {
        setStatus("Discovering tests...");
        discovery = await _discoverWorkerTests(payload);
    }

    state.setDiscovery(discovery);
    populateAndRestoreSelection(state.discovery, _resolvePendingSelection(state.discovery));
    setButtonsState();
    setStatus("Ready. Starting run...");

    _runSelection(getSelectionFromUi(state.discovery), false);
}

function _onFrameMessage(evt: MessageEvent) {
    var data = evt && evt.data ? evt.data : {};
    if (!data || !data.kind) {
        return;
    }

    if (data.kind === "ready") {
        state.setPayload({ ready: true });
        state.setDiscovery(data.discovery || { suites: [], tests: [] });
        populateAndRestoreSelection(state.discovery, _resolvePendingSelection(state.discovery));
        setButtonsState();
        setStatus("Ready. Starting run...");
        _runSelection(getSelectionFromUi(state.discovery), false);
        return;
    }

    if (data.kind === "lifecycleBatch") {
        var events = data.events || [];

        // One scroll read before the batch and one write after it, rather than a forced layout
        // of the whole results tree per node -- see beginRenderBatch.
        beginRenderBatch();
        try {
            for (var i = 0; i < events.length; i++) {
                _dispatchLifecycleEvent(events[i] || {});
            }
        } finally {
            endRenderBatch();
        }

        return;
    }

    if (data.kind === "suiteStart" || data.kind === "suiteDone" || data.kind === "testStart" || data.kind === "testDone" || data.kind === "assert") {
        _dispatchLifecycleEvent(data);
        return;
    }

    if (data.kind === "log") {
        queueLog(data.level || "log", data.message || "");
        return;
    }

    if (data.kind === "runDone") {
        if (_runResolve) {
            var resolve = _runResolve;
            _runResolve = null;
            _runReject = null;
            resolve({ summary: data.summary, coverage: data.coverage });
        }
        return;
    }

    if (data.kind === "runError") {
        if (_runReject) {
            var reject = _runReject;
            _runResolve = null;
            _runReject = null;
            reject(new Error(data.error || "Unknown frame error"));
        }
        return;
    }
}

// -----------------------------------------------------------------
// "Run again" (per suite/test result node, see ui-rendering.ts's createRerunButton): points the
// Scope picker at the clicked node, mirrors that into the URL hash exactly like a manual pick
// would, and immediately starts a fresh run with it -- unlike a plain dropdown change (which only
// stages a scope for the next "Run" click), clicking a rerun button is itself the run request.
//
// The clicked node already states which kind it is, so the scope is taken from the button rather
// than resolved back out of the picker: a rerun works even for a node the page's discovery never
// listed.
// -----------------------------------------------------------------
function _runOnlySelection(selection: any) {
    if (state.running) {
        return;
    }

    var resolvedSelection = {
        suiteTitle: (selection && selection.testTitle) ? "" : ((selection && selection.suiteTitle) || ""),
        testTitle: (selection && selection.testTitle) || ""
    };

    setUiSelection(resolvedSelection);
    writeSelectionToHash(resolvedSelection);
    _runSelection(resolvedSelection, false);
}

// -----------------------------------------------------------------
// Run orchestration
// -----------------------------------------------------------------
async function _runSelection(selection: any, preserveResults: any) {
    if (state.running) {
        return;
    }

    state.setRunning(true);
    state.setStopRequested(false);
    state.setCurrentExecutingTestKey("");
    state.setHighlightSelection(selection && selection.suiteTitle, selection && selection.testTitle);
    setButtonsState();

    if (!preserveResults) {
        clearResults(dom.assertCountEl);
    }

    try {
        setStatus("Running tests in " + dom.TARGET + " mode...");

        var result = dom.TARGET === "worker"
            ? await _runWorkerDirect(state.payload, selection)
            : await new Promise<any>(function(resolve, reject) {
                _runResolve = resolve;
                _runReject = reject;
                _postToFrame({ kind: "run", selection: selection || {} });
            });

        if (result && result.error) {
            throw new Error(result.error);
        }

        state.setLastResult(result || {});
        if (state.stopRequested) {
            setStatus("Run stopped. You can run again or finish.");
        } else {
            setStatus("Run complete. You can run again or click Finish to return to CLI.");
        }

        if (dom.AUTO_FINISH && !state.stopRequested) {
            await _finishRun();
        }
    } catch (e: any) {
        var message = e && e.stack ? e.stack : String(e);
        queueLog("error", message);

        if (dom.AUTO_FINISH) {
            // Flush every queued log line before reporting the result: the CLI tears down
            // the server/browser within milliseconds of receiving it (see flushLogsNow's
            // doc comment in logging.ts), which would otherwise race the normal 50ms-
            // debounced flush and silently drop this run's log output.
            await flushLogsNow();
            await fetch(resolveUrl("/api/result"), {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ error: message })
            }).catch(function() {});
            state.setCompleted(true);
        }

        setStatus("Run failed. See logs below.");
    } finally {
        state.setRunning(false);
        setButtonsState();
    }
}

async function _finishRun() {
    if (!state.lastResult || state.completed) {
        return;
    }

    state.setCompleted(true);
    setButtonsState();
    setStatus("Sending final result back to CLI...");

    try {
        // See the matching flushLogsNow() call in the error path above -- same teardown race.
        await flushLogsNow();
        await fetch(resolveUrl("/api/result"), {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(state.lastResult || {})
        });
        setStatus("Completed. You can close this tab.");
    } catch (e) {
        state.setCompleted(false);
        setStatus("Failed to send result to CLI. Check connection and retry.");
        setButtonsState();
    }
}

// -----------------------------------------------------------------
// Auto-reload polling: asks the server whether the currently-selected target's test modules
// have been rebuilt since this page loaded (see targetSessionCache.ts's per-target build
// "generation" counter and the /__tripwire__/check-fresh endpoint) and, if so, reloads and
// re-runs automatically via the same path the manual "Reload Tests" button uses. Gated behind
// the autoReloadToggle checkbox (state.autoReloadEnabled, default on) and skipped entirely for
// AUTO_FINISH (headless/puppeteer) runs, which have no user to reload for and exit shortly
// after their one run completes anyway.
// -----------------------------------------------------------------
async function _fetchBuildGeneration(): Promise<number | null> {
    try {
        var response = await fetch(resolveUrl("/__tripwire__/check-fresh?target=" + dom.TARGET));
        if (!response.ok) {
            return null;
        }
        var data = await response.json();
        return (data && typeof data.generation === "number") ? data.generation : null;
    } catch (e) {
        return null;
    }
}

async function _pollForChanges() {
    if (!state.autoReloadEnabled || state.running) {
        return;
    }

    var generation = await _fetchBuildGeneration();
    if (generation === null) {
        return;
    }

    if (_knownGeneration === -1) {
        // First poll after page load just establishes the baseline -- not itself a change.
        _knownGeneration = generation;
        return;
    }

    if (generation !== _knownGeneration && state.autoReloadEnabled && !state.running) {
        _knownGeneration = generation;
        _reloadFrame();
    }
}

function _startAutoReloadPolling() {
    if (_autoReloadPollTimer || dom.AUTO_FINISH) {
        return;
    }

    _autoReloadPollTimer = setInterval(function() {
        _pollForChanges();
    }, 1500);
}

// -----------------------------------------------------------------
// Reload:
// - browser target: discard the current iframe and spin up a fresh one. The new iframe
//   re-fetches the payload, rebuilds the suite, and sends a new "ready" message which
//   auto-triggers a fresh run.
// - worker target: no iframe to discard -- re-run _initWorkerHost(), which re-fetches the
//   payload and starts a fresh run the same way page load did.
// -----------------------------------------------------------------
function _reloadFrame() {
    _pendingSelection = getSelectionFromUi(state.discovery);

    if (_runReject) {
        var pendingReject = _runReject;
        _runResolve = null;
        _runReject = null;
        pendingReject(new Error("Reloaded"));
    }

    // Re-establish the auto-reload baseline on *any* reload (manual click or auto-triggered) --
    // otherwise a manual reload would leave the old generation cached, and the next poll would
    // see today's (already-just-loaded) generation as "changed" and immediately auto-reload again.
    _knownGeneration = -1;

    state.clearAllState();
    clearResults(dom.assertCountEl);
    clearLogs();
    setStatus("Reloading tests...");
    setButtonsState();

    if (dom.TARGET === "worker") {
        _initWorkerHost();
    } else {
        _createTestFrame();
    }
}

// -----------------------------------------------------------------
// Host initialization: wire DOM, start the run (worker: directly; browser: via iframe)
// -----------------------------------------------------------------
function _hostInitialize() {
    installConsoleBridge(state.consoleBridgeInstalled, safeToString);
    window.addEventListener("message", _onFrameMessage);

    setStatus("Initializing...");
    setButtonsState();

    // Seed the very first run's selection from whatever scope is already recorded in the URL
    // (eg. a bookmarked or shared link, or simply reloading the page) -- every later reload
    // instead re-seeds from the live in-memory selection at the moment of reload (see
    // _reloadFrame), since at that point the URL and the UI already agree. The hash only ever
    // carries hashed ids (see urlState.ts), so these can't be resolved to real suite/test titles
    // until a discovery actually exists -- _resolvePendingSelection does that resolution lazily,
    // the first time one arrives.
    _pendingHashIds = readSelectionIdsFromHash();

    // The worker target's test-frame historically existed only to relay postMessages
    // between the real Worker and this host -- see _runWorkerDirect's doc comment for why
    // that hop is skipped entirely here instead.
    if (dom.TARGET === "worker") {
        _initWorkerHost();
    } else {
        _createTestFrame();
    }

    // One picker for both suites and tests: its rows are computed on demand from whatever
    // discovery is current, so nothing needs repopulating when the tests are reloaded.
    if (dom.scopeSelect && dom.scopeSelectList) {
        createAutocomplete(dom.scopeSelect, dom.scopeSelectList, function(query) {
            return getScopeCandidates(state.discovery, query);
        });

        // "change" fires once the value settles (blur, or a suggestion click) -- that's the
        // point it's worth committing to the URL, rather than on every keystroke. Writing the
        // *resolved* scope back into the box as well is what keeps the page honest: text that
        // names no suite or test resolves to "everything", and the box must say so rather than
        // leave a half-typed title sitting there looking like a scope.
        dom.scopeSelect.addEventListener("change", function() {
            var selection = getSelectionFromUi(state.discovery);
            setUiSelection(selection);
            writeSelectionToHash(selection);
            setButtonsState();
        });
    }

    // Getting back to "everything". The dropdown has always carried an "All tests" row, but a scope
    // arrived at by clicking a result's "run again" button left no visible sign of how to undo it --
    // the box just held a title, and clearing it meant knowing to select the text and delete it.
    //
    // Deliberately only clears rather than also running: every other way of changing the scope
    // stages it for the next Run, and a single small button that kicks off the entire suite is a
    // much worse thing to click by accident than one that does not. Focus moves to Run afterwards,
    // both because that is the next thing to do and because this button disables itself once there
    // is nothing left to clear -- focus must not be left on it.
    if (dom.clearScopeBtn) {
        dom.clearScopeBtn.addEventListener("click", function() {
            if (state.running) {
                return;
            }

            setUiSelection(null);
            writeSelectionToHash(null);
            setButtonsState();

            if (dom.runBtn) {
                dom.runBtn.focus();
            }
        });
    }

    // Delegated so it keeps working for every suite/test node the run produces, including ones
    // created after this listener was attached -- rerun buttons are plain data-attribute-carrying
    // elements (see createRerunButton in utils.ts) rather than individually bound handlers.
    if (dom.resultsEl) {
        dom.resultsEl.addEventListener("click", function(evt: MouseEvent) {
            var el = evt.target as HTMLElement | null;
            while (el && el !== dom.resultsEl) {
                if (el.classList && el.classList.contains("rerun-btn")) {
                    evt.preventDefault();
                    evt.stopPropagation();
                    _runOnlySelection({
                        suiteTitle: el.getAttribute("data-rerun-suite") || "",
                        testTitle: el.getAttribute("data-rerun-test") || ""
                    });
                    return;
                }
                el = el.parentElement;
            }
        });
    }

    if (dom.runBtn) {
        dom.runBtn.addEventListener("click", function() {
            if (state.running) {
                state.setStopRequested(true);
                if (dom.TARGET !== "worker") {
                    _postToFrame({ kind: "stop" });
                }
                setStatus("Stopping run...");
                setButtonsState();
                return;
            }

            _runSelection(getSelectionFromUi(state.discovery), false);
        });
    }

    if (dom.finishBtn) {
        dom.finishBtn.addEventListener("click", _finishRun);
    }

    if (dom.reloadBtn) {
        dom.reloadBtn.addEventListener("click", _reloadFrame);
    }

    if (dom.clearLogsBtn) {
        dom.clearLogsBtn.addEventListener("click", clearLogs);
    }

    if (dom.actionsBtn && dom.actionsMenu) {
        createMenu(dom.actionsBtn, dom.actionsMenu);
    }

    // Target switch. Both targets are served by this same session (see ui/target.ts), so moving
    // between them is a plain navigation -- the CLI keeps running and the scope in the hash comes
    // along, so "the same tests, in a Worker instead" is one click away and one click back.
    if (dom.targetSelect) {
        dom.targetSelect.value = dom.TARGET;

        dom.targetSelect.addEventListener("change", function() {
            var wanted = dom.targetSelect ? dom.targetSelect.value : "";
            var loc = globalThis.location;

            if (!loc || !wanted || wanted === dom.TARGET) {
                return;
            }

            setStatus("Switching to " + wanted + " target...");
            loc.href = buildTargetUrl({ pathname: loc.pathname, search: loc.search, hash: loc.hash }, wanted);
        });
    }

    if (dom.clearResultsBtn) {
        dom.clearResultsBtn.addEventListener("click", function() {
            clearResults(dom.assertCountEl);
        });
    }

    if (dom.failedOnlyToggle) {
        dom.failedOnlyToggle.addEventListener("change", applyFailedOnlyFilter);
    }

    if (dom.autoReloadToggle) {
        dom.autoReloadToggle.checked = state.autoReloadEnabled;
        dom.autoReloadToggle.addEventListener("change", function() {
            state.setAutoReloadEnabled(!!(dom.autoReloadToggle && dom.autoReloadToggle.checked));
        });
    }

    _startAutoReloadPolling();
}

// -----------------------------------------------------------------
// Entry point: frame mode vs. host mode
// -----------------------------------------------------------------
if (dom.IS_FRAME_MODE) {
    frameInitialize();
} else {
    _hostInitialize();
}
