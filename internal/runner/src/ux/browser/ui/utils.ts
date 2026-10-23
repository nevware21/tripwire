/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

export function safeToString(value: any) {
    if (value == null) {
        return "";
    }

    if (typeof value === "string") {
        return value;
    }

    try {
        return JSON.stringify(value);
    } catch (e) {
        return String(value);
    }
}

export function resolveUrl(relativePath: any) {
    var pathStr = String(relativePath == null ? "" : relativePath);
    // Preserve leading "/" so root-relative paths ("/api/...") resolve against the
    // server origin rather than the current page directory. Without this, API calls
    // made from frames whose URL contains sub-directories (e.g. /__tripwire__/test-frame)
    // would resolve relative to that sub-directory instead of the server root.
    if (pathStr.charAt(0) !== "/") {
        pathStr = pathStr.replace(/^\/+/, "");
    }
    return new URL(pathStr, (globalThis.location && globalThis.location.href) || "/").toString();
}

export function formatCount(value: any, singular: any, plural: any) {
    return value + " " + (value === 1 ? singular : plural);
}

export function _wasAtBottom(element: any) {
    if (!element) {
        return false;
    }

    return (element.scrollTop + element.clientHeight + 12) >= element.scrollHeight;
}

export function _stickToBottom(element: any, wasAtBottom: any) {
    if (element && wasAtBottom) {
        element.scrollTop = element.scrollHeight;
    }
}

export function _setDurationText(element: any, duration: any) {
    if (!element) {
        return;
    }

    if (typeof duration === "number" && duration > 0) {
        element.textContent = duration + "ms";
        element.style.display = "inline-flex";
    } else {
        element.textContent = "";
        element.style.display = "none";
    }
}

export function _setStatusClass(element: any, baseName: any, status: any) {
    element.classList.remove(baseName + "-running", baseName + "-passed", baseName + "-failed", baseName + "-pending");
    element.classList.add(baseName + "-" + status);
}

export function _setNodeHidden(el: any, hidden: any) {
    if (!el) {
        return;
    }

    if (hidden) {
        el.setAttribute("data-filter-hidden", "1");
        el.style.display = "none";
    } else {
        el.removeAttribute("data-filter-hidden");
        el.style.display = "";
    }
}

export function getStatusMarker(status: any) {
    if (status === "passed") {
        return "\u2713";
    }

    if (status === "failed") {
        return "\u2717";
    }

    if (status === "running") {
        return "\u2026";
    }

    return "\u25cb";
}

/**
 * A small "run again" button rendered on every suite/test result node, carrying its scope as
 * `data-rerun-suite`/`data-rerun-test` attributes rather than a bound click handler -- the
 * actual click logic lives in one delegated listener on `resultsEl` (see client.ts) so this
 * stays a plain DOM-construction helper with no dependency on run orchestration.
 */
export function createRerunButton(suiteTitle: string, testTitle: string, tooltip: string) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "rerun-btn tiny-btn";
    button.title = tooltip;
    button.setAttribute("aria-label", tooltip);
    button.setAttribute("data-rerun-suite", suiteTitle || "");
    if (testTitle) {
        button.setAttribute("data-rerun-test", testTitle);
    }
    button.textContent = "↻";
    return button;
}
