/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "@nevware21/tripwire";
import { logDomQueue, logSendQueue } from "../../../src/ux/browser/ui/state";
import { MAX_LOG_LINES } from "../../../src/ux/browser/ui/shared";
import { safeToString } from "../../../src/ux/browser/ui/utils";
import { stubElement, stubTextNode, textOf, uxDom } from "../support/uxDom";

/**
 * The interactive page's log panel and its mirror to the node console: every entry is queued
 * twice, once for the page (flushed on the next animation frame, into `#logs`, oldest lines
 * trimmed past `MAX_LOG_LINES`) and once for the server (POSTed to /api/log in batches, with at
 * most one request in flight). Node has no `requestAnimationFrame`, `fetch` or `location`, so
 * each test installs a recording stand-in for the three and takes them away again; the DOM the
 * flush writes into is a plain object (see `uxDom` in ../support/uxDom.ts).
 */

const dom = uxDom();
// eslint-disable-next-line @typescript-eslint/no-var-requires
const logging: typeof import("../../../src/ux/browser/ui/logging") = require("../../../src/ux/browser/ui/logging");

const PAGE_URL = "http://localhost:4321/__tripwire__/browser";

interface IFetchCall {
    url: string;
    init: any;
    entries: any[];
}

let frames: Array<() => void> = [];
let fetchCalls: IFetchCall[] = [];
let inFlight = 0;
let maxInFlight = 0;
/** What the `fetch` stand-in answers with; tests swap it to hold a request open or fail it. */
let respond: () => Promise<any> = () => Promise.resolve({ ok: true });

const saved: { [name: string]: any } = {};

function _installGlobals(): void {
    const g = globalThis as any;
    const names = ["requestAnimationFrame", "fetch", "location"];
    for (let lp = 0; lp < names.length; lp++) {
        saved[names[lp]] = g[names[lp]];
    }

    g.requestAnimationFrame = (cb: () => void) => {
        frames.push(cb);
        return frames.length;
    };
    g.fetch = (url: string, init: any) => {
        fetchCalls.push({ url: url, init: init, entries: JSON.parse(init.body).entries });
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);

        return respond().then((result) => {
            inFlight--;
            return result;
        }, (err) => {
            inFlight--;
            throw err;
        });
    };
    g.location = { href: PAGE_URL };
}

function _restoreGlobals(): void {
    const g = globalThis as any;
    const names = Object.keys(saved);
    for (let lp = 0; lp < names.length; lp++) {
        if (saved[names[lp]] === undefined) {
            delete g[names[lp]];
        } else {
            g[names[lp]] = saved[names[lp]];
        }
    }
}

/** Runs the animation-frame callbacks queued so far, with just enough `document` for them to build lines. */
function _drainFrames(): void {
    const g = globalThis as any;
    const pending = frames;
    frames = [];

    g.document = {
        createElement: (tag: string) => stubElement("", tag),
        createTextNode: stubTextNode,
        createDocumentFragment: () => {
            const fragment: any = { fragment: true, kids: [] as any[] };
            fragment.appendChild = (child: any) => {
                fragment.kids.push(child);
            };

            return fragment;
        }
    };
    try {
        for (let lp = 0; lp < pending.length; lp++) {
            pending[lp]();
        }
    } finally {
        delete g.document;
    }
}

function _sleep(ms: number): Promise<void> {
    return new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
    });
}

function _lines(): string[] {
    return dom.logs.kids.map((line: any) => line.className + " | " + textOf(line));
}

describe("ux logging", () => {

    beforeEach(() => {
        logging.clearLogs();
        frames = [];
        fetchCalls = [];
        inFlight = 0;
        maxInFlight = 0;
        respond = () => Promise.resolve({ ok: true });
        dom.logs.scrollTop = 0;
        dom.logs.clientHeight = 100;
        dom.logs.scrollHeight = 100;
        _installGlobals();
    });

    afterEach(async () => {
        try {
            // Leave nothing behind for a later test: no frame still owed, no debounce timer about
            // to fire into a process that no longer has a `fetch` stand-in.
            _drainFrames();
            await logging.flushLogsNow();
        } finally {
            _restoreGlobals();
        }
    });

    describe("queueLog", () => {
        it("should queue every entry once for the page and once for the server", () => {
            logging.queueLog("warn", "careful");

            assert.deepEqual(logDomQueue, [{ level: "warn", message: "careful" }]);
            assert.deepEqual(logSendQueue, [{ level: "warn", message: "careful" }]);
        });

        it("should default the level to log and the message to an empty string", () => {
            logging.queueLog(undefined, null);
            logging.queueLog("", undefined);
            logging.queueLog("info", 42);

            assert.deepEqual(logSendQueue, [
                { level: "log", message: "" },
                { level: "log", message: "" },
                { level: "info", message: "42" }
            ]);
        });

        it("should ask for a single animation frame for a whole burst of entries", () => {
            logging.queueLog("log", "one");
            logging.queueLog("log", "two");
            logging.queueLog("log", "three");
            assert.equal(frames.length, 1);

            _drainFrames();
            logging.queueLog("log", "four");
            assert.equal(frames.length, 1, "a new frame once the last one has run");
        });
    });

    describe("the page flush", () => {
        it("should render each entry as one line tagged with its level", () => {
            logging.queueLog("warn", "careful");
            logging.queueLog("error", "boom");
            _drainFrames();

            assert.deepEqual(_lines(), ["log-line log-warn | [warn] careful", "log-line log-error | [error] boom"]);
            assert.equal(logDomQueue.length, 0, "the page queue is drained");
            assert.equal(logSendQueue.length, 2, "the server queue is not: it has its own schedule");
        });

        it("should show a line in the colours the terminal shows it in, and a blank one as blank", () => {
            logging.queueLog("log", "\u001b[32m  ✓ passes\u001b[39m \u001b[90m(3ms)\u001b[0m");
            logging.queueLog("log", "\u001b[0m");
            logging.queueLog("log", "");
            _drainFrames();

            assert.deepEqual(_lines(), [ "log-line log-log | [log]   ✓ passes (3ms)", "log-line log-log | ", "log-line log-log | " ]);
            assert.deepEqual(dom.logs.kids[0].kids.map((part: any) => (part.className || "text") + "=" + textOf(part)), [
                "ansi-fg-32=  ✓ passes",
                "text= ",
                "ansi-fg-90=(3ms)"
            ]);
            assert.equal(dom.logs.kids[1].kids.length, 0, "a blank line carries no tag and no parts");
            assert.equal(logSendQueue[0].message, "\u001b[32m  ✓ passes\u001b[39m \u001b[90m(3ms)\u001b[0m", "the CLI gets the same colours");
        });

        it("should keep only the newest MAX_LOG_LINES lines", () => {
            for (let lp = 0; lp < MAX_LOG_LINES + 3; lp++) {
                logging.queueLog("log", "m" + lp);
            }
            _drainFrames();

            assert.equal(dom.logs.kids.length, MAX_LOG_LINES);
            assert.equal(textOf(dom.logs.kids[0]), "[log] m3", "the three oldest went");
            assert.equal(textOf(dom.logs.kids[MAX_LOG_LINES - 1]), "[log] m" + (MAX_LOG_LINES + 2));
        });

        it("should keep the panel pinned to the bottom only if it already was", () => {
            dom.logs.scrollTop = 0;
            dom.logs.clientHeight = 100;
            dom.logs.scrollHeight = 500;
            logging.queueLog("log", "scrolled up, reading something");
            _drainFrames();
            assert.equal(dom.logs.scrollTop, 0, "a reader who scrolled up is left where they are");

            dom.logs.scrollTop = 400;
            logging.queueLog("log", "at the bottom");
            _drainFrames();
            assert.equal(dom.logs.scrollTop, 500, "a reader at the bottom follows the new line");
        });

        it("should do nothing for a frame with nothing queued", () => {
            logging.queueLog("log", "x");
            logging.clearLogs();
            _drainFrames();

            assert.deepEqual(_lines(), []);
        });
    });

    describe("clearLogs", () => {
        it("should empty the panel and both queues", () => {
            logging.queueLog("log", "shown");
            _drainFrames();
            logging.queueLog("log", "queued");
            assert.equal(dom.logs.kids.length, 1);

            logging.clearLogs();

            assert.equal(dom.logs.kids.length, 0);
            assert.equal(dom.logs.textContent, "");
            assert.equal(logDomQueue.length, 0);
            assert.equal(logSendQueue.length, 0);
        });
    });

    describe("the server flush", () => {
        it("should POST everything queued as one JSON batch to /api/log at the server root", async () => {
            logging.queueLog("log", "one");
            logging.queueLog("warn", "two");

            await logging.flushLogsNow();

            assert.equal(fetchCalls.length, 1);
            assert.equal(fetchCalls[0].url, "http://localhost:4321/api/log", "root-relative, not relative to the page's directory");
            assert.equal(fetchCalls[0].init.method, "POST");
            assert.equal(fetchCalls[0].init.headers["content-type"], "application/json");
            assert.deepEqual(fetchCalls[0].entries, [{ level: "log", message: "one" }, { level: "warn", message: "two" }]);
            assert.equal(logSendQueue.length, 0);
        });

        it("should send nothing when nothing is queued", async () => {
            await logging.flushLogsNow();
            assert.equal(fetchCalls.length, 0);
        });

        it("should send on its own after the debounce when nobody forces it", async () => {
            logging.queueLog("log", "eventually");
            assert.equal(fetchCalls.length, 0, "not synchronously");

            await _sleep(120);

            assert.equal(fetchCalls.length, 1);
            assert.deepEqual(fetchCalls[0].entries, [{ level: "log", message: "eventually" }]);
        });

        it("should cancel the debounce once forced, so nothing is sent twice", async () => {
            logging.queueLog("log", "once");
            await logging.flushLogsNow();
            assert.equal(fetchCalls.length, 1);

            await _sleep(120);

            assert.equal(fetchCalls.length, 1, "the timer that would have sent it again was cleared");
        });

        it("should keep one request in flight and send what arrives meanwhile in the next, in order", async () => {
            let release: () => void = () => undefined;
            respond = () => new Promise((resolve) => {
                release = () => resolve({ ok: true });
            });

            logging.queueLog("log", "a");
            const flushed = logging.flushLogsNow();
            await _sleep(0);
            assert.equal(fetchCalls.length, 1, "the first request is out");

            logging.queueLog("log", "b");
            logging.queueLog("log", "c");
            await _sleep(60);
            assert.equal(fetchCalls.length, 1, "nothing else goes out while it is in flight, debounce or no debounce");

            respond = () => Promise.resolve({ ok: true });
            release();
            await flushed;

            assert.equal(fetchCalls.length, 2);
            assert.deepEqual(fetchCalls[1].entries, [{ level: "log", message: "b" }, { level: "log", message: "c" }]);
            assert.equal(maxInFlight, 1);
        });

        it("should swallow a failed send and stay usable for the next one", async () => {
            respond = () => Promise.reject(new Error("server went away"));
            logging.queueLog("log", "lost");
            await logging.flushLogsNow();
            assert.equal(fetchCalls.length, 1);

            respond = () => Promise.resolve({ ok: true });
            logging.queueLog("log", "found");
            await logging.flushLogsNow();

            assert.equal(fetchCalls.length, 2);
            assert.deepEqual(fetchCalls[1].entries, [{ level: "log", message: "found" }]);
        });
    });

    describe("installConsoleBridge", () => {
        const levels: Array<"log" | "info" | "warn" | "error"> = ["log", "info", "warn", "error"];
        const original: { [level: string]: any } = {};

        beforeEach(() => {
            for (let lp = 0; lp < levels.length; lp++) {
                original[levels[lp]] = console[levels[lp]];
            }
        });

        afterEach(() => {
            for (let lp = 0; lp < levels.length; lp++) {
                console[levels[lp]] = original[levels[lp]];
            }
        });

        it("should mirror each console level into the log, joining the arguments the way the console would show them", () => {
            const seen: { [level: string]: any[][] } = { log: [], info: [], warn: [], error: [] };
            for (let lp = 0; lp < levels.length; lp++) {
                const level = levels[lp];
                console[level] = (...args: any[]) => {
                    seen[level].push(args);
                };
            }

            logging.installConsoleBridge(false, () => undefined);
            console.warn("careful", { count: 2 }, 3, null);
            console.error("boom");
            console.log();

            assert.deepEqual(logSendQueue, [
                { level: "warn", message: "careful {\"count\":2} 3 " },
                { level: "error", message: "boom" },
                { level: "log", message: "" }
            ]);
            assert.deepEqual(seen.warn, [["careful", { count: 2 }, 3, null]], "the original still gets the untouched arguments");
            assert.deepEqual(seen.error, [["boom"]]);
            assert.equal(logSendQueue[0].message.indexOf(safeToString({ count: 2 })), 8, "objects are serialised, not [object Object]");
        });

        it("should leave the console alone when told it is already installed", () => {
            const before = console.log;
            logging.installConsoleBridge(true, () => undefined);
            assert.strictEqual(console.log, before);
        });
    });
});
