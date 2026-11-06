/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { targetFromPath } from "./target";

// DOM element references
export const bodyEl: HTMLElement | null = document.body;
export const targetAttr = bodyEl ? bodyEl.getAttribute("data-runner-target") : "";
export const pathName = (globalThis.location && globalThis.location.pathname) || "";
export const pathTarget = targetFromPath(pathName);
export const TARGET = pathTarget || (targetAttr === "worker" ? "worker" : "browser");

export const IS_FRAME_MODE = !!(bodyEl && bodyEl.getAttribute("data-runner-mode") === "frame");

export const queryParams = new URLSearchParams((globalThis.location && globalThis.location.search) || "");
export const AUTO_FINISH = queryParams.get("autofinish") === "1";

export const statusEl = document.getElementById("status") as HTMLElement | null;
export const logsEl = document.getElementById("logs") as HTMLElement | null;
export const runBtn = document.getElementById("runBtn") as HTMLButtonElement | null;
export const finishBtn = document.getElementById("finishBtn") as HTMLButtonElement | null;
export const reloadBtn = document.getElementById("reloadBtn") as HTMLButtonElement | null;
export const clearLogsBtn = document.getElementById("clearLogsBtn") as HTMLButtonElement | null;
export const clearResultsBtn = document.getElementById("clearResultsBtn") as HTMLButtonElement | null;
export const actionsBtn = document.getElementById("actionsBtn") as HTMLButtonElement | null;
export const actionsMenu = document.getElementById("actionsMenu") as HTMLElement | null;
export const targetSelect = document.getElementById("targetSelect") as HTMLSelectElement | null;
export const scopeSelect = document.getElementById("scopeSelect") as HTMLInputElement | null;
export const scopeSelectList = document.getElementById("scopeSelectList") as HTMLElement | null;
export const clearScopeBtn = document.getElementById("clearScopeBtn") as HTMLButtonElement | null;
export const failedOnlyToggle = document.getElementById("failedOnlyToggle") as HTMLInputElement | null;
export const resultsEl = document.getElementById("results") as HTMLElement | null;
export const assertCountEl = document.getElementById("assertCount") as HTMLElement | null;
export const runSummaryEl = document.getElementById("runSummary") as HTMLElement | null;
export const filterNoteEl = document.getElementById("filterNote") as HTMLElement | null;
export const appMetaEl = document.getElementById("appMeta") as HTMLElement | null;
export const skipLink = document.getElementById("skipLink") as HTMLElement | null;
// The rows whose controls fold into the actions menu when the window is too narrow, those controls,
// and what stands in for them in the menu (see overflow.ts)
export const appHeaderEl = document.getElementById("appHeader") as HTMLElement | null;
export const controlsRowEl = document.getElementById("controlsRow") as HTMLElement | null;
export const targetControl = document.getElementById("targetControl") as HTMLElement | null;
export const failedOnlyControl = document.getElementById("failedOnlyControl") as HTMLElement | null;
export const foldedControlsEl = document.getElementById("foldedControls") as HTMLElement | null;
export const targetMenuGroup = document.getElementById("targetMenuGroup") as HTMLElement | null;
export const failedOnlyItem = document.getElementById("failedOnlyItem") as HTMLElement | null;
// Auto-reload has no control on the page: it is always this entry in the actions menu
export const autoReloadItem = document.getElementById("autoReloadItem") as HTMLElement | null;
// The Appearance panel, which the actions menu opens (see appearance.ts)
export const appearanceItem = document.getElementById("appearanceItem") as HTMLElement | null;
export const appearancePanel = document.getElementById("appearancePanel") as HTMLElement | null;
export const themeInput = document.getElementById("themeInput") as HTMLInputElement | null;
export const themeList = document.getElementById("themeList") as HTMLElement | null;
export const colorblindToggle = document.getElementById("colorblindToggle") as HTMLInputElement | null;
export const zoomOutBtn = document.getElementById("zoomOutBtn") as HTMLElement | null;
export const zoomInBtn = document.getElementById("zoomInBtn") as HTMLElement | null;
export const zoomResetBtn = document.getElementById("zoomResetBtn") as HTMLElement | null;
export const zoomValueEl = document.getElementById("zoomValue") as HTMLElement | null;
export const testFrameContainer = document.getElementById("testFrameContainer") as HTMLElement | null;
