/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "@nevware21/tripwire";
import { clearAllState, setCompleted, setLastResult, setPayload, setRunning } from "../../../src/ux/browser/ui/state";
import { uxDom } from "../support/uxDom";

/**
 * The interactive page's toolbar controls as a function of the run state: what the Run button
 * says and whether it is enabled, when Finish is available, and which pickers are locked while a
 * run is in flight. The elements are plain objects (see `uxDom` in ../support/uxDom.ts), since all
 * the module does to them is set `disabled`, `textContent`, a class and an attribute.
 */

const dom = uxDom();
// eslint-disable-next-line @typescript-eslint/no-var-requires
const uiControl: typeof import("../../../src/ux/browser/ui/ui-control") = require("../../../src/ux/browser/ui/ui-control");

/** The Finish menu item's availability, as the menu reads it. */
function _finishDisabled(): string | null {
    return dom.finishBtn.getAttribute("aria-disabled");
}

describe("ux ui-control", () => {

    beforeEach(() => {
        clearAllState();
        dom.scopeSelect.value = "";
        dom.runBtn.classList.remove("stop-mode");
    });

    describe("setStatus", () => {
        it("should write the status text", () => {
            uiControl.setStatus("Running 3 of 10");
            assert.equal(dom.status.textContent, "Running 3 of 10");
        });
    });

    describe("setButtonsState", () => {
        it("should offer Run only once there is a payload to run", () => {
            uiControl.setButtonsState();
            assert.equal(dom.runBtn.textContent, "Run");
            assert.isTrue(dom.runBtn.disabled, "nothing loaded yet");

            setPayload({ files: ["a.test.js"] });
            uiControl.setButtonsState();
            assert.equal(dom.runBtn.textContent, "Run");
            assert.isFalse(dom.runBtn.disabled);
            assert.isFalse(dom.runBtn.classList.contains("stop-mode"));
        });

        it("should turn the Run button into Stop while a run is in flight", () => {
            setPayload({});
            setRunning(true);
            uiControl.setButtonsState();

            assert.equal(dom.runBtn.textContent, "Stop");
            assert.isFalse(dom.runBtn.disabled, "stopping must always be possible");
            assert.isTrue(dom.runBtn.classList.contains("stop-mode"));
        });

        it("should offer Run Again once a run has produced a result", () => {
            setPayload({});
            setRunning(true);
            uiControl.setButtonsState();

            setRunning(false);
            setLastResult({ total: 2, failed: 0 });
            uiControl.setButtonsState();

            assert.equal(dom.runBtn.textContent, "Run Again");
            assert.isFalse(dom.runBtn.disabled);
            assert.isFalse(dom.runBtn.classList.contains("stop-mode"), "the stop styling is taken off again");
        });

        it("should make Finish available exactly when there is an unreported result and no run in flight", () => {
            setPayload({});
            uiControl.setButtonsState();
            assert.equal(_finishDisabled(), "true", "no result yet");

            setRunning(true);
            uiControl.setButtonsState();
            assert.equal(_finishDisabled(), "true", "mid-run");

            setRunning(false);
            setLastResult({ total: 1, failed: 1 });
            uiControl.setButtonsState();
            assert.equal(_finishDisabled(), "false", "a result is waiting to be reported");

            setCompleted(true);
            uiControl.setButtonsState();
            assert.equal(_finishDisabled(), "true", "already reported");
        });

        it("should disable Finish through aria-disabled, never the native attribute", () => {
            // A natively disabled button cannot take focus, which would drop it out of the
            // menu's arrow-key order; the menu reads aria-disabled instead.
            uiControl.setButtonsState();
            assert.equal(_finishDisabled(), "true");
            assert.isFalse(dom.finishBtn.disabled);

            setLastResult({ total: 1 });
            uiControl.setButtonsState();
            assert.equal(_finishDisabled(), "false");
            assert.isFalse(dom.finishBtn.disabled);
        });

        it("should lock the scope and target pickers only while running", () => {
            setPayload({});
            setRunning(true);
            uiControl.setButtonsState();
            assert.isTrue(dom.scopeSelect.disabled);
            assert.isTrue(dom.targetSelect.disabled, "switching target navigates away, which would abandon the run");

            setRunning(false);
            uiControl.setButtonsState();
            assert.isFalse(dom.scopeSelect.disabled);
            assert.isFalse(dom.targetSelect.disabled);
        });

        it("should enable the clear-scope button only when there is a scope to clear", () => {
            uiControl.setButtonsState();
            assert.isTrue(dom.clearScopeBtn.disabled, "no scope");

            dom.scopeSelect.value = "outer > alpha";
            uiControl.setButtonsState();
            assert.isFalse(dom.clearScopeBtn.disabled);

            setRunning(true);
            uiControl.setButtonsState();
            assert.isTrue(dom.clearScopeBtn.disabled, "not while running, even with a scope");
        });
    });
});
