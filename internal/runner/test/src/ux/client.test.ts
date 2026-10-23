/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import * as path from "path";
import { assert } from "@nevware21/tripwire";
import { hashSelectionValue } from "../../../src/ux/browser/ui/urlState";
import { stubDocument, stubEvent, textOf } from "../support/uxDom";

/**
 * The interactive runner page itself: it starts the test frame (browser target) or the worker (worker
 * target), runs the tests once they are found, draws what they report, and sends the results back to
 * the CLI. The page starts as it loads and reads its target from the URL once, so each test loads a
 * fresh copy of the page's modules, with its own elements, URL, `fetch`, timers and workers stood in
 * for. The copies this suite's other files loaded are put back afterwards.
 */

const UI_DIR = path.resolve(__dirname, "../../../src/ux/browser/ui");

const DISCOVERY = {
    suites: [ "frame suite" ],
    tests: [
        { suiteTitle: "frame suite", testName: "passes", fullTitle: "frame suite > passes" },
        { suiteTitle: "frame suite", testName: "fails", fullTitle: "frame suite > fails" }
    ]
};

const LIFECYCLE = [
    { kind: "suiteStart", suiteParts: [ "frame suite" ] },
    { kind: "testStart", suiteParts: [ "frame suite" ], testName: "passes" },
    { kind: "assert", suiteParts: [ "frame suite" ], testName: "passes", passed: true, label: "equal" },
    { kind: "testDone", suiteParts: [ "frame suite" ], testName: "passes", endStatus: "passed", durationMs: 1 },
    { kind: "testStart", suiteParts: [ "frame suite" ], testName: "fails" },
    { kind: "testDone", suiteParts: [ "frame suite" ], testName: "fails", endStatus: "failed", durationMs: 2, endErrorText: "boom" },
    { kind: "suiteDone", suiteParts: [ "frame suite" ], durationMs: 3 },
    null
];

interface IPage {
    registry: { [id: string]: any };
    document: any;
    state: any;
    logging: any;
    listeners: { [type: string]: (evt: any) => void };
    parentPosts: any[];
    framePosts: any[];
    fetches: Array<{ url: string, init: any }>;
    intervals: Array<() => void>;
    workers: any[];
    hashWrites: string[];
    location: any;
    generation: number | null | "fail" | "error";
    workerThrows: string;
    frame(): any;
    status(): string;
    message(data: any): void;
}

describe("ux client", function () {
    this.timeout(30000);

    const g = globalThis as any;
    const GLOBALS = [ "document", "window", "location", "history", "fetch", "requestAnimationFrame", "Worker" ];
    let saved: { [name: string]: any };
    let orgConsole: { [level: string]: any };
    let pages: IPage[];

    // Lets the page's promises, and the zero-delay timers they wait on, run
    async function settle(): Promise<void> {
        for (let round = 0; round < 2; round++) {
            for (let lp = 0; lp < 10; lp++) {
                await new Promise((resolve) => setImmediate(resolve));
            }

            await new Promise((resolve) => setTimeout(resolve, 0));
        }
    }

    interface ILoadOptions {
        // The URL hash the page loads with
        hash?: string;
        // Elements the page does not have
        omit?: string[];
        // Sending the result to the CLI fails
        resultFails?: boolean;
    }

    function loadPage(pathname: string, search?: string, bodyAttrs?: { [name: string]: string }, options?: ILoadOptions): IPage {
        const opts = options || {};
        const page: IPage = {
            registry: {},
            document: null,
            state: null,
            logging: null,
            listeners: {},
            parentPosts: [],
            framePosts: [],
            fetches: [],
            intervals: [],
            workers: [],
            hashWrites: [],
            location: null,
            generation: null,
            workerThrows: "",
            frame: () => page.registry.testFrameContainer.kids[page.registry.testFrameContainer.kids.length - 1],
            status: () => page.registry.status.textContent,
            message: (data: any) => page.listeners.message({ data: data })
        };

        page.location = { href: "http://localhost:4321" + pathname + (search || "") + (opts.hash || ""), pathname: pathname, search: search || "", hash: opts.hash || "" };
        page.document = stubDocument(page.registry, true);
        const getElementById = page.document.getElementById;
        page.document.getElementById = (id: string) => ((opts.omit || []).indexOf(id) !== -1 ? null : getElementById(id));
        Object.keys(bodyAttrs || {}).forEach((name) => page.document.body.setAttribute(name, bodyAttrs[name]));

        g.document = page.document;
        g.location = page.location;
        g.history = { replaceState: (_state: any, _title: string, url: string) => page.hashWrites.push(url) };
        g.window = {
            addEventListener: (type: string, fn: (evt: any) => void) => {
                page.listeners[type] = fn;
            },
            parent: { postMessage: (msg: any) => page.parentPosts.push(msg) }
        };
        g.requestAnimationFrame = (cb: () => void) => {
            Promise.resolve().then(cb);
            return 1;
        };
        g.fetch = (url: string, init?: any) => {
            page.fetches.push({ url: url, init: init });
            if (url.indexOf("/__tripwire__/check-fresh") !== -1) {
                if (page.generation === "error") {
                    return Promise.reject(new Error("offline"));
                }

                return Promise.resolve({ ok: page.generation !== "fail", json: () => Promise.resolve({ generation: page.generation }) });
            }

            if (opts.resultFails && url.indexOf("/api/result") !== -1) {
                return Promise.reject(new Error("the CLI went away"));
            }

            if (url.indexOf("/api/payload-") !== -1) {
                return Promise.resolve({ ok: true, json: () => Promise.resolve({ tripwireModuleId: "/tripwire", entryIds: [], settings: {} }) });
            }

            return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        };
        g.Worker = function (this: any, url: string) {
            if (page.workerThrows) {
                throw new Error(page.workerThrows);
            }

            const worker: any = this;
            worker.url = url;
            worker.posted = [];
            worker.terminated = false;
            worker.postMessage = (msg: any) => worker.posted.push(msg);
            worker.terminate = () => {
                worker.terminated = true;
            };
            page.workers.push(worker);
        };

        // A fresh copy of the page, against elements of its own; this suite's other files keep theirs
        const loaded: { [key: string]: any } = {};
        Object.keys(require.cache).forEach((key) => {
            if (key.indexOf(UI_DIR) === 0) {
                loaded[key] = require.cache[key];
                delete require.cache[key];
            }
        });
        const orgRegistry = g.__tripwireUxDomStub;
        const orgSetInterval = g.setInterval;
        g.__tripwireUxDomStub = page.registry;
        g.setInterval = (fn: () => void) => {
            page.intervals.push(fn);
            return page.intervals.length;
        };

        try {
            require(path.join(UI_DIR, "client.ts"));
            page.state = require(path.join(UI_DIR, "state.ts"));
            page.logging = require(path.join(UI_DIR, "logging.ts"));
            pages.push(page);
        } finally {
            g.setInterval = orgSetInterval;
            g.__tripwireUxDomStub = orgRegistry;
            Object.keys(require.cache).forEach((key) => {
                if (key.indexOf(UI_DIR) === 0) {
                    delete require.cache[key];
                }
            });
            Object.keys(loaded).forEach((key) => {
                require.cache[key] = loaded[key];
            });

            // The page copies the console into its log panel, for good
            Object.keys(orgConsole).forEach((level) => {
                (console as any)[level] = orgConsole[level];
            });
        }

        // The test frame answers through its window
        if (page.registry.testFrameContainer && page.registry.testFrameContainer.kids.length) {
            page.frame().contentWindow = { postMessage: (msg: any) => page.framePosts.push(msg) };
        }

        return page;
    }

    function posted(page: IPage, urlPart: string): any[] {
        return page.fetches.filter((call) => call.url.indexOf(urlPart) !== -1 && call.init && call.init.method === "POST")
            .map((call) => JSON.parse(call.init.body));
    }

    async function readyAndRun(page: IPage): Promise<void> {
        page.message({ kind: "ready", discovery: DISCOVERY });
        page.message({ kind: "lifecycleBatch", events: LIFECYCLE });
        page.message({ kind: "runDone", summary: { total: 2, passed: 1, failed: 1 }, coverage: null });
        await settle();
    }

    beforeEach(() => {
        saved = {};
        GLOBALS.forEach((name) => {
            saved[name] = g[name];
        });
        orgConsole = { log: console.log, info: console.info, warn: console.warn, error: console.error };
        pages = [];
    });

    afterEach(async () => {
        // Anything the page left scheduled runs while its stand-ins are still there
        await settle();

        // A page sends what it logged to the CLI 50ms later, from a timer of its own -- by then the
        // stand-ins below are gone, and with no location the log URL cannot be resolved (an unhandled
        // rejection that ends the run). So each page sends it now, while they are still here.
        for (let lp = 0; lp < pages.length; lp++) {
            await pages[lp].logging.flushLogsNow();
        }
        GLOBALS.forEach((name) => {
            if (saved[name] === undefined) {
                delete g[name];
            } else {
                g[name] = saved[name];
            }
        });
    });

    describe("browser target", () => {
        it("starts the test frame, hidden, and polls for changed files", () => {
            const page = loadPage("/__tripwire__/browser");
            const frame = page.frame();

            assert.equal(frame.tagName, "IFRAME");
            assert.equal(frame.id, "test-frame");
            assert.equal(frame.src, "http://localhost:4321/__tripwire__/test-frame?target=browser");
            assert.equal(frame.style.display, "none");
            assert.equal(page.status(), "Initializing...");
            assert.equal(page.intervals.length, 1);
            assert.equal(page.registry.targetSelect.value, "browser");
        });

        it("runs once the frame is ready, draws the results, and sends them to the CLI on Finish", async () => {
            const page = loadPage("/__tripwire__/browser");

            page.message({ kind: "ready", discovery: DISCOVERY });
            assert.deepEqual(page.framePosts, [ { kind: "run", selection: { suiteTitle: "", testTitle: "" } } ]);
            assert.isTrue(page.state.running);
            assert.equal(page.status(), "Running tests in browser mode...");

            page.message({ kind: "lifecycleBatch", events: LIFECYCLE });
            assert.includes(textOf(page.registry.results), "frame suite");
            assert.includes(textOf(page.registry.results), "Test failed -> boom");

            page.message({ kind: "runDone", summary: { total: 2 }, coverage: { a: 1 } });
            await settle();
            assert.equal(page.status(), "Run complete. You can run again or click Finish to return to CLI.");
            assert.deepEqual(page.state.lastResult, { summary: { total: 2 }, coverage: { a: 1 } });

            page.registry.finishBtn.click();
            await settle();
            assert.deepEqual(posted(page, "/api/result"), [ { summary: { total: 2 }, coverage: { a: 1 } } ]);
            assert.equal(page.status(), "Completed. You can close this tab.");

            page.registry.finishBtn.click();
            await settle();
            assert.equal(posted(page, "/api/result").length, 1, "the result is only sent once");
        });

        it("asks the frame to stop when Run is clicked mid-run, and runs again when idle", async () => {
            const page = loadPage("/__tripwire__/browser");
            page.message({ kind: "ready", discovery: DISCOVERY });

            page.registry.runBtn.click();
            assert.deepEqual(page.framePosts[1], { kind: "stop" });
            assert.equal(page.status(), "Stopping run...");

            page.message({ kind: "runDone", summary: {} });
            await settle();
            assert.equal(page.status(), "Run stopped. You can run again or finish.");

            page.registry.runBtn.click();
            assert.deepEqual(page.framePosts[2], { kind: "run", selection: { suiteTitle: "", testTitle: "" } });
        });

        it("logs a run the frame failed, and ignores results nobody is waiting for", async () => {
            const page = loadPage("/__tripwire__/browser");
            page.message({ kind: "runDone", summary: {} });
            page.message({ kind: "runError", error: "early" });
            page.message({ kind: "ready", discovery: DISCOVERY });

            page.message({ kind: "runError" });
            await settle();

            assert.equal(page.status(), "Run failed. See logs below.");
            assert.includes(textOf(page.registry.logs), "Unknown frame error");
        });

        it("draws progress sent one message at a time, logs what the frame logs, and ignores anything else", async () => {
            const page = loadPage("/__tripwire__/browser");
            page.message({ kind: "ready", discovery: DISCOVERY });

            LIFECYCLE.filter(Boolean).forEach((evt) => page.message(evt));
            page.message({ kind: "log", level: "warn", message: "from the frame" });
            page.message({ kind: "log" });
            page.message({ kind: "unknown" });
            page.listeners.message({});
            page.listeners.message(null);
            await settle();

            assert.includes(textOf(page.registry.results), "passes");
            assert.includes(textOf(page.registry.logs), "from the frame");
        });

        it("runs a single test again from its rerun button, keeping the choice in the URL", async () => {
            const page = loadPage("/__tripwire__/browser");
            await readyAndRun(page);
            const buttons = page.registry.results.querySelectorAll(".rerun-btn");
            const testButton = buttons.filter((btn: any) => btn.getAttribute("data-rerun-test") === "frame suite > passes")[0];

            const evt = stubEvent("click");
            testButton.dispatchEvent(evt);

            assert.isTrue(evt.defaultPrevented);
            assert.deepEqual(page.framePosts[page.framePosts.length - 1], { kind: "run", selection: { suiteTitle: "", testTitle: "frame suite > passes" } });
            assert.equal(page.registry.scopeSelect.value, "frame suite > passes");
            assert.equal(page.hashWrites.length, 1);

            const runs = page.framePosts.length;
            testButton.click();
            assert.equal(page.framePosts.length, runs, "not while a run is going");
            page.message({ kind: "runDone", summary: {} });
            await settle();

            buttons.filter((btn: any) => !btn.getAttribute("data-rerun-test"))[0].click();
            assert.deepEqual(page.framePosts[page.framePosts.length - 1].selection, { suiteTitle: "frame suite", testTitle: "" });

            page.message({ kind: "lifecycleBatch", events: LIFECYCLE });
            page.message({ kind: "runDone", summary: {} });
            await settle();
            page.registry.results.querySelector(".test-label").click();
            page.registry.results.click();
            assert.equal(page.framePosts.length, runs + 1, "a click that is not on a rerun button runs nothing");
        });

        it("restores the scope from the URL once the tests are found", () => {
            const page = loadPage("/__tripwire__/browser", "", {}, { hash: "#test=" + hashSelectionValue("frame suite > passes") });

            page.message({ kind: "ready", discovery: DISCOVERY });

            assert.deepEqual(page.framePosts[0].selection, { suiteTitle: "", testTitle: "frame suite > passes" });
        });

        it("puts the test frame in the body of a page without a frame container", () => {
            const page = loadPage("/__tripwire__/browser", "", {}, { omit: [ "testFrameContainer" ] });

            assert.equal(page.document.body.kids[0].id, "test-frame");
        });

        it("offers the suites and tests it found as scope suggestions", () => {
            const page = loadPage("/__tripwire__/browser");
            page.message({ kind: "ready", discovery: DISCOVERY });

            page.registry.scopeSelect.value = "pass";
            page.registry.scopeSelect.dispatchEvent(stubEvent("input"));

            assert.includes(textOf(page.registry.scopeSelectList), "frame suite > passes");
        });

        it("keeps Finish available when the result cannot be sent to the CLI", async () => {
            const page = loadPage("/__tripwire__/browser", "", {}, { resultFails: true });
            await readyAndRun(page);

            page.registry.finishBtn.click();
            await settle();

            assert.equal(page.status(), "Failed to send result to CLI. Check connection and retry.");
            assert.isFalse(page.state.completed);
        });

        it("reloads the frame when the build changes, unless auto reload is off or a run is going", async () => {
            const page = loadPage("/__tripwire__/browser");
            const poll = page.intervals[0];
            await readyAndRun(page);
            const firstFrame = page.frame();

            page.generation = 1;
            poll();
            await settle();
            assert.equal(page.frame(), firstFrame, "the first answer is only remembered");

            page.generation = "fail";
            poll();
            page.generation = "error";
            poll();
            await settle();
            assert.equal(page.frame(), firstFrame);

            page.registry.autoReloadToggle.checked = false;
            page.registry.autoReloadToggle.dispatchEvent(stubEvent("change"));
            page.generation = 2;
            poll();
            await settle();
            assert.isFalse(page.state.autoReloadEnabled);
            assert.equal(page.frame(), firstFrame, "auto reload is off");

            page.registry.autoReloadToggle.checked = true;
            page.registry.autoReloadToggle.dispatchEvent(stubEvent("change"));
            poll();
            await settle();
            assert.notEqual(page.frame(), firstFrame);
            assert.equal(page.registry.testFrameContainer.kids.length, 1, "the old frame is gone");
            assert.equal(page.status(), "Reloading tests...");
        });

        it("reloads on the Reload button, giving up the run in progress", async () => {
            const page = loadPage("/__tripwire__/browser");
            page.message({ kind: "ready", discovery: DISCOVERY });
            const firstFrame = page.frame();

            page.registry.reloadBtn.click();
            await settle();

            assert.isFalse(page.state.running);
            assert.notEqual(page.frame(), firstFrame, "a new frame");
        });

        it("clears the results and the logs, and filters to failed tests, from the toolbar", async () => {
            const page = loadPage("/__tripwire__/browser");
            await readyAndRun(page);

            page.registry.failedOnlyToggle.checked = true;
            page.registry.failedOnlyToggle.dispatchEvent(stubEvent("change"));
            page.registry.clearResultsBtn.click();
            page.registry.clearLogsBtn.click();

            assert.equal(page.registry.results.kids.length, 0);
            assert.equal(page.registry.assertCount.textContent, "0 assertions");
        });

        it("switches to the other target, keeping the rest of the URL", () => {
            const page = loadPage("/__tripwire__/browser", "?x=1");

            page.registry.targetSelect.dispatchEvent(stubEvent("change"));
            assert.equal(page.location.href, "http://localhost:4321/__tripwire__/browser?x=1", "the same target changes nothing");

            page.registry.targetSelect.value = "worker";
            page.registry.targetSelect.dispatchEvent(stubEvent("change"));
            assert.equal(page.location.href, "/__tripwire__/worker?x=1");
            assert.equal(page.status(), "Switching to worker target...");
        });

        it("keeps the scope picker's choice in the URL, and clears it", async () => {
            const page = loadPage("/__tripwire__/browser");
            await readyAndRun(page);

            page.registry.scopeSelect.value = "frame suite";
            page.registry.scopeSelect.dispatchEvent(stubEvent("change"));
            assert.equal(page.hashWrites.length, 1);

            page.registry.clearScopeBtn.click();
            assert.equal(page.registry.scopeSelect.value, "");
            assert.equal(page.hashWrites.length, 2);
            assert.equal(page.document.activeElement, page.registry.runBtn);

            page.registry.runBtn.click();
            page.registry.scopeSelect.value = "frame suite";
            page.registry.clearScopeBtn.click();
            assert.equal(page.registry.scopeSelect.value, "frame suite", "not while a run is going");
        });

        it("sends the result to the CLI by itself when it finishes on its own", async () => {
            const page = loadPage("/__tripwire__/browser", "?autofinish=1");

            assert.equal(page.frame().src, "http://localhost:4321/__tripwire__/test-frame?target=browser&autofinish=1");
            assert.equal(page.intervals.length, 0, "nothing to reload");

            await readyAndRun(page);
            assert.deepEqual(posted(page, "/api/result"), [ { summary: { total: 2, passed: 1, failed: 1 }, coverage: null } ]);
        });

        it("sends a failed run to the CLI by itself when it finishes on its own", async () => {
            const page = loadPage("/__tripwire__/browser", "?autofinish=1");

            page.message({ kind: "ready", discovery: DISCOVERY });
            page.message({ kind: "runError", error: "frame crashed" });
            await settle();

            assert.includes(posted(page, "/api/result")[0].error, "frame crashed");
            assert.isTrue(page.state.completed);
        });

        it("runs the frame's own code when it is the test frame", async () => {
            const page = loadPage("/__tripwire__/test-frame", "", { "data-runner-mode": "frame" });
            await settle();

            assert.equal(page.registry.testFrameContainer.kids.length, 0, "no frame inside the frame");
            assert.isTrue(page.parentPosts.length > 0, "it reports to the page above it");
        });

        it("reports ready without looking for tests when the test frame finishes on its own", async () => {
            const page = loadPage("/__tripwire__/test-frame", "?autofinish=1", { "data-runner-mode": "frame" });
            await settle();

            assert.deepEqual(page.parentPosts[0], { kind: "ready", discovery: { suites: [], tests: [] } });
        });
    });

    describe("worker target", () => {
        it("discovers the tests in a worker, then runs them in another", async () => {
            const page = loadPage("/__tripwire__/worker");
            await settle();

            const discover = page.workers[0];
            assert.equal(discover.url, "http://localhost:4321/api/worker-script");
            assert.equal(discover.posted[0].kind, "discover");
            discover.onmessage({ data: { kind: "log", level: "info", message: "discovering" } });
            discover.onmessage({ data: { kind: "other" } });
            discover.onmessage({ data: { kind: "discovery", discovery: DISCOVERY } });
            discover.onmessage({ data: { kind: "discovery", discovery: DISCOVERY } });
            await settle();
            assert.isTrue(discover.terminated);

            const run = page.workers[1];
            assert.deepEqual(run.posted[0].selection, { suiteTitle: "", testTitle: "" });
            assert.isFalse(run.posted[0].autoFinish);
            assert.equal(page.state.activeWorker, run);

            LIFECYCLE.filter(Boolean).forEach((evt) => run.onmessage({ data: evt }));
            run.onmessage({ data: { kind: "log", message: "from the worker" } });
            run.onmessage({ data: { summary: { total: 2 } } });
            await settle();

            assert.includes(textOf(page.registry.results), "frame suite");
            assert.includes(textOf(page.registry.logs), "from the worker");
            assert.includes(textOf(page.registry.logs), "discovering");
            assert.isNull(page.state.activeWorker);
            assert.equal(page.status(), "Run complete. You can run again or click Finish to return to CLI.");
        });

        it("warns when discovery fails, and reports a worker that crashes", async () => {
            const page = loadPage("/__tripwire__/worker");
            await settle();

            page.workers[0].onmessage({ data: { kind: "discovery", error: "no such module" } });
            await settle();
            page.workers[1].onerror({ message: "worker crashed" });
            await settle();

            assert.includes(textOf(page.registry.logs), "Test discovery failed, the Scope picker will be empty: no such module");
            assert.includes(textOf(page.registry.logs), "worker crashed");
            assert.equal(page.status(), "Run failed. See logs below.");
        });

        it("carries on without discovery when its worker errors", async () => {
            const page = loadPage("/__tripwire__/worker");
            await settle();

            page.workers[0].onerror({});
            await settle();
            page.workers[1].onerror(null);
            await settle();

            assert.includes(textOf(page.registry.logs), "Test discovery failed, the Scope picker will be empty: Worker execution failed.");
            assert.includes(textOf(page.registry.logs), "Worker execution failed.");
        });

        it("reports that a worker cannot be started", async () => {
            const page = loadPage("/__tripwire__/worker", "", {});
            page.workerThrows = "workers are blocked";
            page.registry.reloadBtn.click();
            await settle();

            assert.includes(textOf(page.registry.logs), "Unable to discover tests: workers are blocked");
            assert.equal(page.status(), "Run failed. See logs below.");
        });

        it("skips discovery and the progress messages when it finishes on its own", async () => {
            const page = loadPage("/__tripwire__/worker", "?autofinish=1");
            await settle();

            const run = page.workers[0];
            assert.isTrue(run.posted[0].autoFinish);
            LIFECYCLE.filter(Boolean).forEach((evt) => run.onmessage({ data: evt }));
            run.onmessage({ data: { summary: { total: 2 } } });
            await settle();

            assert.equal(page.registry.results.kids.length, 0, "nothing drawn");
            assert.deepEqual(posted(page, "/api/result"), [ { summary: { total: 2 } } ]);
        });
    });
});
