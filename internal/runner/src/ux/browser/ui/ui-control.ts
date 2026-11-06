/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { statusEl, runBtn, finishBtn, scopeSelect, targetSelect, clearScopeBtn } from "./dom";
import { fitToolbar } from "./overflow";
import { payload as getPayload, running as getRunning, lastResult as getLastResult, completed as getCompleted } from "./state";

export function setStatus(value: any) {
    if (statusEl) {
        statusEl.textContent = value;
    }
}

export function setButtonsState() {
    const payload = getPayload;
    const running = getRunning;
    const lastResult = getLastResult;
    const completed = getCompleted;

    if (runBtn) {
        if (running) {
            runBtn.disabled = false;
            runBtn.textContent = "Stop";
            runBtn.classList.add("stop-mode");
        } else if (lastResult) {
            runBtn.disabled = !payload;
            runBtn.textContent = "Run Again";
            runBtn.classList.remove("stop-mode");
        } else {
            runBtn.disabled = !payload;
            runBtn.textContent = "Run";
            runBtn.classList.remove("stop-mode");
        }
    }

    if (finishBtn) {
        // A menu item, so `aria-disabled` rather than the native attribute: a natively disabled
        // button cannot be focused, which would drop it out of the menu's arrow-key order and
        // leave a keyboard user unable to find out it is there at all. `_finishRun` guards the
        // action itself, and the menu swallows clicks on a disabled item.
        finishBtn.setAttribute("aria-disabled", (running || !lastResult || completed) ? "true" : "false");
    }

    if (scopeSelect) {
        scopeSelect.disabled = running;
    }

    if (targetSelect) {
        // Switching target navigates away; doing that mid-run would abandon it silently.
        targetSelect.disabled = running;
    }

    if (clearScopeBtn) {
        // Disabled when there is nothing to clear, which is also what tells the reader at a glance
        // whether this run is scoped to something or covers everything.
        clearScopeBtn.disabled = running || !(scopeSelect && scopeSelect.value);
    }

    // Run's label just changed width, and Target's lock is shown on its stand-in in the menu
    fitToolbar();
}
