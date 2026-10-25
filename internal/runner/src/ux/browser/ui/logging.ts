/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { logsEl } from "./dom";
import { MAX_LOG_LINES } from "./shared";
import { logDomQueue, logSendQueue } from "./state";
import { safeToString, resolveUrl, _wasAtBottom, _stickToBottom } from "./utils";

let logFlushScheduled = false;
let sendFlushScheduled = false;
let sendTimerId: ReturnType<typeof setTimeout> | null = null;
// Resolves once every currently-queued (and, transitively, every subsequently-queued-while-
// flushing) log entry has actually been POSTed -- or attempted -- to /api/log. AUTO_FINISH
// (puppeteer/headless) mode awaits this (see flushLogsNow) before reporting the run's result,
// since the server/browser get torn down within milliseconds of that result landing: the
// 50ms debounce below is fine for a live interactive session where the page stays open, but
// in headless mode it's a real race that silently drops every not-yet-flushed log line
// (the whole page, timers included, is destroyed before the debounce ever fires).
let flushChain: Promise<void> = Promise.resolve();

export function queueLog(level: any, message: any) {
    var normalizedLevel = level || "log";
    var normalizedMessage = String(message == null ? "" : message);
    logDomQueue.push({ level: normalizedLevel, message: normalizedMessage });
    logSendQueue.push({ level: normalizedLevel, message: normalizedMessage });

    if (!logFlushScheduled) {
        logFlushScheduled = true;
        requestAnimationFrame(flushLogDomQueue);
    }

    if (!sendFlushScheduled) {
        sendFlushScheduled = true;
        sendTimerId = setTimeout(function() {
            sendTimerId = null;
            flushChain = flushChain.then(_drainLogSendQueue);
        }, 50);
    }
}

function flushLogDomQueue() {
    logFlushScheduled = false;
    if (!logsEl || !logDomQueue.length) {
        return;
    }

    var shouldStick = _wasAtBottom(logsEl);
    var fragment = document.createDocumentFragment();

    while (logDomQueue.length) {
        var entry = logDomQueue.shift() as any;
        var line = document.createElement("div");
        line.className = "log-line log-" + entry.level;
        line.textContent = "[" + entry.level + "] " + entry.message;
        fragment.appendChild(line);
    }

    logsEl.appendChild(fragment);

    while (logsEl.childElementCount > MAX_LOG_LINES) {
        var firstChild = logsEl.firstElementChild;
        if (!firstChild) {
            break;
        }

        logsEl.removeChild(firstChild);
    }

    _stickToBottom(logsEl, shouldStick);
}

function _drainLogSendQueue(): Promise<void> {
    if (!logSendQueue.length) {
        sendFlushScheduled = false;
        return Promise.resolve();
    }

    var entries = logSendQueue.splice(0, logSendQueue.length);
    return fetch(resolveUrl("/api/log"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entries: entries })
    }).catch(function() {}).then(function() {
        // Only pick up entries queued *during* this request (and keep draining) once it
        // has actually settled, rather than resetting the "scheduled" flag up front --
        // otherwise a burst of logs arriving faster than the server can drain them spawns
        // more and more overlapping, unordered in-flight requests, and Node's console
        // output falls further and further behind the browser UI as a long run progresses.
        // This keeps at most one request in flight, naturally pacing sends to the server's
        // actual response time.
        if (logSendQueue.length) {
            return _drainLogSendQueue();
        }

        sendFlushScheduled = false;
    });
}

/**
 * Cancels the pending debounce timer (if any) and immediately drains every currently- and
 * subsequently-queued log entry, returning a promise that resolves once all of it has been
 * sent (or attempted). See `flushChain`'s doc comment above for why this exists: AUTO_FINISH
 * mode must await this before reporting the run's result, or the page can be torn down out
 * from under the normal 50ms-debounced flush before it ever fires.
 */
export function flushLogsNow(): Promise<void> {
    if (sendTimerId !== null) {
        clearTimeout(sendTimerId);
        sendTimerId = null;
    }

    flushChain = flushChain.then(_drainLogSendQueue);
    return flushChain;
}

export function clearLogs() {
    if (logsEl) {
        logsEl.textContent = "";
    }

    logDomQueue.length = 0;
    logSendQueue.length = 0;
}

export function installConsoleBridge(isInstalled: boolean, setSafeToString: (val: typeof safeToString) => void) {
    if (isInstalled) {
        return;
    }

    var original = { log: console.log, info: console.info, warn: console.warn, error: console.error };
    var levels: Array<"log" | "info" | "warn" | "error"> = ["log", "info", "warn", "error"];

    for (var i = 0; i < levels.length; i++) {
        (function(level) {
            console[level] = function() {
                var args = [];
                for (var a = 0; a < arguments.length; a++) {
                    args.push(arguments[a]);
                }

                var text = "";
                for (var p = 0; p < args.length; p++) {
                    if (p > 0) {
                        text += " ";
                    }
                    text += safeToString(args[p]);
                }

                queueLog(level, text);
                return original[level].apply(console, args);
            };
        })(levels[i]);
    }
}
