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
export const autoReloadToggle = document.getElementById("autoReloadToggle") as HTMLInputElement | null;
export const resultsEl = document.getElementById("results") as HTMLElement | null;
export const assertCountEl = document.getElementById("assertCount") as HTMLElement | null;
export const testFrameContainer = document.getElementById("testFrameContainer") as HTMLElement | null;
