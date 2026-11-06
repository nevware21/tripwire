/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import * as http from "http";
import * as path from "path";
import { spawn, ChildProcess } from "child_process";
import { pathToFileURL } from "url";
import { assert, ITestContext } from "@nevware21/tripwire";
import { hashSelectionValue } from "../../../src/ux/browser/ui/urlState";

/*
 * End-to-end coverage of the interactive runner page -- the one `--browser-launch open|manual`
 * serves (template: src/ux/browser/resources/templates/runner.html, logic: src/ux/browser/ui/).
 * The unit tests beside this file (menu.test.ts, target.test.ts, ../shared/scopeOptions.test.ts)
 * cover the pure halves of that UI; this is the part that needs a real document, a real server
 * and a real Chrome.
 *
 * How it gets a page: the CLI itself is spawned in `--browser-launch manual` mode against the
 * tiny project in test/fixtures/interactive (9 passing tests, exactly 1 failing, nested
 * describes), the "Runner URL" it prints is driven with puppeteer, and the very last test clicks
 * "Finish & Stop Server" and checks the CLI exits with the failing run's exit code. Both targets
 * are exercised: the browser page first, then the worker page reached through the Target picker,
 * since nearly all of the UI is shared between them.
 *
 * Puppeteer is an optional peer dependency and Chrome may not be installed: when either is
 * missing the whole suite skips (via `this.skip()` in `before`) rather than failing.
 */

// ---------------------------------------------------------------------------------------------
// Fixture facts (test/fixtures/interactive/specs/*.spec.ts) -- keep in step with those files.
// ---------------------------------------------------------------------------------------------
const FIXTURE_SUITES = [
    "Arrays",
    "Async",
    "Math",
    "Math > addition",
    "Math > multiplication",
    "Strings",
    "Strings > casing"
];

const FIXTURE_TESTS = [
    "Arrays > finds an element",
    "Arrays > reports its length",
    "Async > resolves after a short delay",
    "Math > addition > adds a negative number",
    "Math > addition > adds two positive numbers",
    "Math > multiplication > multiplies by zero",
    "Math > multiplication > multiplies two numbers",
    "Strings > casing > lowercases a word",
    "Strings > casing > uppercases a word",
    "Strings > trims whitespace"
];

const FAILING_TEST = "Strings > casing > lowercases a word";
const SCOPED_SUITE = "Math > multiplication";
const SCOPED_SUITE_TESTS = [
    "Math > multiplication > multiplies by zero",
    "Math > multiplication > multiplies two numbers"
];
const RERUN_TEST = "Math > multiplication > multiplies by zero";
const PASSING_COUNT = FIXTURE_TESTS.length - 1;

const MENU_ITEMS = [ "Reload Tests", "Clear Logs", "Appearance…", "Finish & Stop Server" ];

// The window the page is driven in; WIDE_VIEWPORT holds every control on its row
const WIDE_VIEWPORT = { width: 1280, height: 900 };

// Every browser-driving step gets this rather than the 2000ms default.
const STEP_TIMEOUT_MS = 60000;
// How long any single page condition may take to come true.
const WAIT_MS = 20000;

// This file is at internal/runner/test/src/ux/, so the package root is three levels up.
const _runnerRoot = path.resolve(__dirname, "..", "..", "..");
const _repoRoot = path.resolve(_runnerRoot, "..", "..");
const _cliPath = path.join(_repoRoot, "core", "bin", "tripwire.js");
const _fixtureDir = path.join(_runnerRoot, "test", "fixtures", "interactive");

// ---------------------------------------------------------------------------------------------
// Shared session state -- one CLI process and one browser for the whole describe.
// ---------------------------------------------------------------------------------------------
let _browser: any = null;
let _page: any = null;
let _child: ChildProcess | null = null;
let _childExit: Promise<number | null> | null = null;
let _childStdout = "";
let _childStderr = "";
let _runnerUrl = "";
let _pageErrors: string[] = [];

function _stripAnsi(text: string): string {
    // eslint-disable-next-line no-control-regex
    return text.replace(/\u001b\[[0-9;]*m/g, "");
}

function _tail(text: string, lines: number): string {
    const all = _stripAnsi(text).split(/\r?\n/);
    return all.slice(Math.max(0, all.length - lines)).join("\n");
}

function _diagnostics(): string {
    return "\n--- CLI stdout (tail) ---\n" + _tail(_childStdout, 40)
        + "\n--- CLI stderr ---\n" + _tail(_childStderr, 40)
        + (_pageErrors.length ? "\n--- page errors ---\n" + _pageErrors.join("\n") : "");
}

/**
 * Runs one step of the scenario. Any failure (including a timeout waiting on the page) carries
 * the CLI's stdout/stderr with it, and a step that otherwise passed still fails if the page
 * threw an uncaught error while it ran -- `pageerror` is the one signal a broken script gives.
 */
function step(title: string, body: () => Promise<void>) {
    it(title, function(this: ITestContext) {
        this.timeout(STEP_TIMEOUT_MS);

        return body().then(() => {
            if (_pageErrors.length) {
                const errors = _pageErrors.slice(0);
                _pageErrors = [];
                throw new Error("The page threw " + errors.length + " uncaught error(s): " + errors.join(" | "));
            }
        }, (e: any) => {
            const message = (e && e.message) ? e.message : String(e);
            const diagnostics = _diagnostics();
            _pageErrors = [];
            const err = new Error(message + diagnostics);
            if (e && e.stack) {
                err.stack = e.stack + diagnostics;
            }
            throw err;
        });
    });
}

// ---------------------------------------------------------------------------------------------
// Page helpers. Functions handed to puppeteer run inside Chrome, so they stay plain and
// synchronous -- no async/await (the compiled file's helpers do not exist in the page).
// ---------------------------------------------------------------------------------------------
async function _waitFor(fn: (...args: any[]) => any, label: string, ...args: any[]): Promise<void> {
    try {
        await _page.waitForFunction(fn, { timeout: WAIT_MS, polling: 50 }, ...args);
    } catch (e: any) {
        const status = await _statusText().catch(() => "(unavailable)");
        throw new Error("Timed out waiting for " + label + " (status: \"" + status + "\"): " + (e && e.message ? e.message : String(e)));
    }
}

function _statusText(): Promise<string> {
    return _page.$eval("#status", (el: Element) => el.textContent || "");
}

function _attr(selector: string, name: string): Promise<string | null> {
    return _page.$eval(selector, (el: Element, attrName: string) => el.getAttribute(attrName), name);
}

function _text(selector: string): Promise<string> {
    return _page.$eval(selector, (el: Element) => el.textContent || "");
}

function _isDisabled(selector: string): Promise<boolean> {
    return _page.$eval(selector, (el: Element) => !!(el as HTMLButtonElement).disabled);
}

function _isChecked(selector: string): Promise<boolean> {
    return _page.$eval(selector, (el: Element) => !!(el as HTMLInputElement).checked);
}

function _activeElementId(): Promise<string> {
    return _page.evaluate(() => (document.activeElement && document.activeElement.id) || "");
}

function _activeElementRole(): Promise<string> {
    return _page.evaluate(() => (document.activeElement && document.activeElement.getAttribute("role")) || "");
}

function _hash(): Promise<string> {
    return _page.evaluate(() => location.hash);
}

function _pathname(): Promise<string> {
    return _page.evaluate(() => location.pathname);
}

function _scopeValue(): Promise<string> {
    return _page.$eval("#scopeSelect", (el: Element) => (el as HTMLInputElement).value);
}

/** Waits until the page has finished a run and is idle again. */
async function _waitForRunComplete(): Promise<void> {
    await _waitFor(() => {
        const status = document.getElementById("status");
        const run = document.getElementById("runBtn") as HTMLButtonElement | null;
        const text = (status && status.textContent) || "";
        return text.indexOf("Run complete") === 0 && !!run && !run.disabled && run.textContent === "Run Again";
    }, "the run to complete");
}

/** Clicks Run (or Run Again) and waits for that run to finish. */
async function _clickRunAndWait(): Promise<void> {
    await _page.click("#runBtn");
    // The click handler sets the status synchronously, so by now "Run complete" can only mean the
    // new run finished.
    await _waitForRunComplete();
}

interface IResultRow {
    title: string;
    status: string;
    hidden: boolean;
    open: boolean;
    rerunLabel: string;
}

function _readResults(): Promise<IResultRow[]> {
    return _page.$$eval("#results .test-node", (nodes: Element[]) => nodes.map((node) => {
        const btn = node.querySelector(".test-summary .rerun-btn");
        const chip = node.querySelector(".test-summary .status-chip");
        return {
            title: btn ? (btn.getAttribute("data-rerun-test") || "") : "",
            status: chip ? (chip.textContent || "") : "",
            hidden: node.getAttribute("data-filter-hidden") === "1",
            open: (node as HTMLDetailsElement).open,
            rerunLabel: btn ? (btn.getAttribute("aria-label") || "") : ""
        };
    }));
}

interface ISuiteRow {
    name: string;
    status: string;
    meta: string;
    hidden: boolean;
}

function _readSuites(): Promise<ISuiteRow[]> {
    return _page.$$eval("#results .suite-node", (nodes: Element[]) => nodes.map((node) => {
        const name = node.querySelector(".suite-summary .suite-name");
        const chips = node.querySelectorAll(".suite-summary .suite-statuses .status-chip");
        return {
            name: name ? (name.textContent || "") : "",
            meta: chips.length ? (chips[0].textContent || "") : "",
            status: chips.length > 1 ? (chips[chips.length - 1].textContent || "") : "",
            hidden: node.getAttribute("data-filter-hidden") === "1"
        };
    }));
}

function _titles(rows: Array<{ title: string }>): string[] {
    return rows.map((row) => row.title).sort();
}

interface IScopeRow {
    label: string;
    kind: string;
    role: string | null;
    active: boolean;
}

function _readScopeRows(): Promise<IScopeRow[]> {
    return _page.$$eval("#scopeSelectList .autocomplete-item", (rows: Element[]) => rows.map((row) => {
        const text = row.querySelector(".autocomplete-text");
        const badge = row.querySelector(".autocomplete-kind");
        return {
            label: text ? (text.textContent || "") : "",
            kind: badge ? (badge.textContent || "") : "",
            role: row.getAttribute("role"),
            active: row.classList.contains("active")
        };
    }));
}

async function _waitForScopeListOpen(): Promise<void> {
    await _waitFor(() => {
        const list = document.getElementById("scopeSelectList");
        return !!list && list.classList.contains("open") && list.children.length > 0;
    }, "the Scope list to open");
}

/** Focuses the Scope box (which opens the full list) and returns its rows. */
async function _openScopeList(): Promise<IScopeRow[]> {
    await _page.click("#scopeSelect");
    await _waitForScopeListOpen();
    return _readScopeRows();
}

/** Clears the Scope box and types `query` into it, returning the rows the typing produced. */
async function _typeScope(query: string): Promise<IScopeRow[]> {
    await _page.click("#scopeSelect");
    // Select whatever is there and delete it as real input (so the input event fires), rather
    // than assigning `value` behind the autocomplete's back.
    await _page.$eval("#scopeSelect", (el: Element) => (el as HTMLInputElement).select());
    await _page.keyboard.press("Backspace");
    await _page.type("#scopeSelect", query);
    await _waitForScopeListOpen();
    return _readScopeRows();
}

/** Clicks the Scope row whose text is `label`. */
async function _pickScopeRow(label: string): Promise<void> {
    const rows = await _page.$$("#scopeSelectList .autocomplete-item");
    for (let lp = 0; lp < rows.length; lp++) {
        const text = await rows[lp].$eval(".autocomplete-text", (el: Element) => el.textContent || "");
        if (text === label) {
            await rows[lp].click();
            return;
        }
    }

    throw new Error("No Scope row labelled \"" + label + "\"");
}

async function _menuIsOpen(): Promise<boolean> {
    return _page.$eval("#actionsMenu", (el: Element) => !el.hasAttribute("hidden"));
}

async function _openMenu(): Promise<void> {
    if (!(await _menuIsOpen())) {
        await _page.click("#actionsBtn");
    }
    assert.isTrue(await _menuIsOpen(), "the actions menu should be open");
}

async function _clickMenuItem(id: string): Promise<void> {
    await _openMenu();
    await _page.click("#" + id);
}

async function _appearanceIsOpen(): Promise<boolean> {
    return _page.$eval("#appearancePanel", (el: Element) => !el.hasAttribute("hidden"));
}

/** Opens the Appearance panel from the actions menu, which closes behind it, with focus on the theme. */
async function _openAppearance(): Promise<void> {
    if (!(await _appearanceIsOpen())) {
        await _clickMenuItem("appearanceItem");
        await _waitFor(() => {
            const panel = document.getElementById("appearancePanel");
            return !!panel && !panel.hasAttribute("hidden") && !!document.activeElement && document.activeElement.id === "themeInput";
        }, "the Appearance panel to open on the theme");
    }
}

/** Searches the Appearance panel's theme box for `search`, and picks the top match with Enter. */
async function _pickTheme(search: string): Promise<void> {
    await _openAppearance();
    await _page.focus("#themeInput");
    await _page.$eval("#themeInput", (el: Element) => (el as HTMLInputElement).select());
    await _page.keyboard.type(search);
    await _waitFor(() => {
        const list = document.getElementById("themeList");
        return !!list && list.classList.contains("open") && list.querySelectorAll(".autocomplete-item").length > 0;
    }, "the theme list to show a match for \"" + search + "\"");
    await _page.keyboard.press("Enter");
}

/** The theme list's rows, with a "*" in front of the highlighted one. */
function _themeRows(): Promise<string[]> {
    return _page.$$eval("#themeList.open .autocomplete-item", (els: Element[]) => els.map((el) => (el.classList.contains("active") ? "*" : "") + (el.textContent || "")));
}

async function _clearScopeIfSet(): Promise<void> {
    if (!(await _isDisabled("#clearScopeBtn"))) {
        await _page.click("#clearScopeBtn");
    }
}

/*
 * The page starts its first run on its own the moment the test frame (or worker) reports ready,
 * and on a warm server that is a few tens of milliseconds after the document loads -- far too
 * close to poll from outside for the states that come before it ("Initializing...", "Ready",
 * "Running", with Finish still disabled). Request interception is not an option either: the
 * page is served with Cross-Origin-Opener-Policy, and puppeteer's interception does not survive
 * the browsing-context swap that triggers (navigation never completes while it is enabled).
 *
 * So instead of racing the page, every new document gets a passive observer installed before
 * any of its own scripts run: it records each distinct (status, Finish aria-disabled, Run
 * button) state from DOMContentLoaded on, and the test reads the recorded sequence back once the
 * run is over. The test frame gets the script too but has none of these controls, so it records
 * nothing there.
 */
const _TRACE_SCRIPT = "(function () {"
    + "var trace = []; window.__tripwirePageTrace = trace;"
    + "function snapshot() {"
    + "  var finish = document.getElementById('finishBtn'); var status = document.getElementById('status'); var run = document.getElementById('runBtn');"
    + "  if (!finish || !status || !run) { return; }"
    + "  var entry = { status: status.textContent || '', finish: finish.getAttribute('aria-disabled'), runDisabled: !!run.disabled, runText: run.textContent || '' };"
    + "  var last = trace[trace.length - 1];"
    + "  if (!last || last.status !== entry.status || last.finish !== entry.finish || last.runDisabled !== entry.runDisabled || last.runText !== entry.runText) { trace.push(entry); }"
    + "}"
    + "document.addEventListener('DOMContentLoaded', function () {"
    + "  if (!document.getElementById('finishBtn')) { return; }"
    + "  snapshot();"
    + "  new MutationObserver(snapshot).observe(document.body, { attributes: true, childList: true, characterData: true, subtree: true });"
    + "});"
    + "})();";

interface ITraceEntry {
    status: string;
    finish: string | null;
    runDisabled: boolean;
    runText: string;
}

function _readTrace(): Promise<ITraceEntry[]> {
    return _page.evaluate(() => (window as any).__tripwirePageTrace || []);
}

/**
 * Checks the recorded start-up of the document now loaded: initializing (for the worker, loading
 * its payload and discovering tests) -> running -> run complete, with Finish disabled and Run
 * unavailable until the tests are ready, Run reading "Stop" while they run, and Finish enabled
 * only once the first result lands.
 *
 * "Ready. Starting run..." is set and overwritten by "Running tests..." in the same synchronous
 * turn, so no observer -- human or otherwise -- can ever see it; what *is* observable is Run
 * becoming available at that point, which is what the Running entry checks.
 */
async function _assertFirstRunTrace(target: "browser" | "worker"): Promise<void> {
    const trace = await _readTrace();
    const describe = (entry: ITraceEntry) => JSON.stringify(entry);
    const dump = "\ntrace:\n" + trace.map(describe).join("\n");
    const initialStatuses = target === "worker"
        ? [ "Initializing...", "Loading worker payload...", "Discovering tests..." ]
        : [ "Initializing..." ];

    assert.isTrue(trace.length >= 3, "the page went through several states" + dump);
    assert.isTrue(initialStatuses.indexOf(trace[0].status) !== -1, "the page starts in an initializing state" + dump);

    const runningIdx = trace.map((entry) => entry.status === "Running tests in " + target + " mode...").indexOf(true);
    assert.isTrue(runningIdx > 0, "the run was reported as running in the " + target + dump);
    const completeIdx = trace.map((entry) => entry.status.indexOf("Run complete") === 0).indexOf(true);
    assert.isTrue(completeIdx > runningIdx, "the first run completed after it started" + dump);

    trace.slice(0, runningIdx).forEach((entry) => {
        assert.isTrue(initialStatuses.indexOf(entry.status) !== -1, "only initializing states precede the run: " + describe(entry) + dump);
        assert.isTrue(entry.runDisabled, "Run is disabled until the tests are ready: " + describe(entry) + dump);
        assert.equal(entry.runText, "Run", describe(entry) + dump);
    });

    const running = trace[runningIdx];
    assert.isFalse(running.runDisabled, "Run is available once the tests are ready" + dump);
    assert.equal(running.runText, "Stop", "Run turns into Stop while running" + dump);

    trace.slice(0, completeIdx).forEach((entry) => {
        assert.equal(entry.finish, "true", "Finish stays disabled until there is a result: " + describe(entry) + dump);
    });

    const complete = trace[completeIdx];
    assert.equal(complete.finish, "false", "Finish is enabled once a result exists" + dump);
    assert.equal(complete.runText, "Run Again", dump);
    assert.isFalse(complete.runDisabled, dump);
}

// ---------------------------------------------------------------------------------------------
// Scenarios shared by both targets. Registered twice: once against the browser page, once
// against the worker page the Target picker navigated to.
// ---------------------------------------------------------------------------------------------
function _sharedScenarios(target: "browser" | "worker") {
    step("should list every fixture suite and test in the Scope picker, badged suite or test", async () => {
        assert.equal(await _attr("body", "data-runner-target"), target, "the page knows its own target");
        assert.equal(await _page.$eval("#targetSelect", (el: Element) => (el as HTMLSelectElement).value), target, "the Target picker shows the current target");

        // Combobox wiring as the template declares it.
        assert.equal(await _attr("#scopeSelect", "role"), "combobox");
        assert.equal(await _attr("#scopeSelect", "aria-controls"), "scopeSelectList");
        assert.equal(await _attr("#scopeSelect", "aria-autocomplete"), "list");
        assert.equal(await _attr("#scopeSelectList", "role"), "listbox");

        await _clearScopeIfSet();
        const rows = await _openScopeList();

        // Blank box: the "All tests" row leads, then every suite, then every test.
        assert.equal(rows[0].label, "All tests", "the first row offers everything");
        assert.equal(rows[0].kind, "", "the All tests row carries no badge");
        assert.isTrue(rows[0].active, "the row matching the (blank) box is pre-highlighted");

        const suiteRows = rows.filter((row) => row.kind === "suite");
        const testRows = rows.filter((row) => row.kind === "test");
        assert.deepEqual(suiteRows.map((row) => row.label).sort(), FIXTURE_SUITES, "every suite is listed, badged suite");
        assert.deepEqual(testRows.map((row) => row.label).sort(), FIXTURE_TESTS, "every test is listed, badged test");
        assert.equal(rows.length, 1 + FIXTURE_SUITES.length + FIXTURE_TESTS.length, "nothing else is listed");

        const firstTestIdx = rows.map((row) => row.kind).indexOf("test");
        const lastSuiteIdx = rows.map((row) => row.kind).lastIndexOf("suite");
        assert.isTrue(lastSuiteIdx < firstTestIdx, "suites come before tests");

        for (let lp = 0; lp < rows.length; lp++) {
            assert.equal(rows[lp].role, "option", "row " + lp + " is an option of the listbox");
        }

        await _page.keyboard.press("Escape");
        assert.isFalse(await _page.$eval("#scopeSelectList", (el: Element) => el.classList.contains("open")), "Escape closes the list");
    });

    step("should run everything and render one failed test among the passing ones", async () => {
        await _clearScopeIfSet();
        await _clickRunAndWait();

        const results = await _readResults();
        assert.deepEqual(_titles(results), FIXTURE_TESTS, "every fixture test rendered a row");

        const failed = results.filter((row) => row.status === "failed");
        const passed = results.filter((row) => row.status === "passed");
        assert.equal(failed.length, 1, "exactly one test failed");
        assert.equal(failed[0].title, FAILING_TEST);
        assert.equal(passed.length, PASSING_COUNT, PASSING_COUNT + " tests passed");

        assert.isTrue(failed[0].open, "the failed test stays expanded so its assertions are visible");
        assert.equal(failed[0].rerunLabel, "Run only this test again");

        // The failed assertion itself renders on the next animation frame; wait for it.
        await _waitFor(() => document.querySelectorAll("#results .test-node.test-failed .assert-item.assert-fail").length > 0, "the failed assertion row to render");
        const failedAssertions: string[] = await _page.$$eval("#results .test-node.test-failed .assert-item.assert-fail", (items: Element[]) => items.map((item) => item.textContent || ""));
        // Exactly one: the real assertion. A synthetic "Test failed" row used to be added beneath it
        // because the assertion was still queued for the next frame when the test finished.
        assert.equal(failedAssertions.length, 1, "the failing test shows its failed assertion once: " + JSON.stringify(failedAssertions));
        assert.isTrue(failedAssertions.some((text) => text.indexOf("deliberate fixture failure") !== -1), "a failed assertion row carries the failure message: " + failedAssertions.join(" | "));
        assert.equal(await _page.$$eval("#results .test-node.test-passed .assert-item.assert-fail", (items: Element[]) => items.length), 0, "passing tests show no failed assertions");

        // Suite summaries: the top-level suites account for every test, and only Strings failed.
        const suites = await _readSuites();
        const byName: { [name: string]: ISuiteRow } = {};
        suites.forEach((suite) => {
            byName[suite.name] = suite;
        });
        assert.equal(byName["Math"].meta, "4 passed · 2 child suites");
        assert.equal(byName["Math"].status, "passed");
        assert.equal(byName["Strings"].meta, "2 passed · 1 failed · 1 child suite");
        assert.equal(byName["Strings"].status, "failed");
        assert.equal(byName["casing"].status, "failed");
        assert.equal(byName["Arrays"].meta, "2 passed");
        assert.equal(byName["Arrays"].status, "passed");
        assert.equal(byName["Async"].meta, "1 passed");
        assert.equal(byName["Async"].status, "passed");

        // Each suite's worded counts ("2 passed · 1 failed"), added up across the top-level suites
        const total = suites
            .filter((suite) => [ "Math", "Strings", "Arrays", "Async" ].indexOf(suite.name) !== -1)
            .reduce((sum, suite) => sum + suite.meta.split(" · ")
                .filter((part) => /^\d+ (passed|failed|skipped)$/.test(part))
                .reduce((count, part) => count + parseInt(part, 10), 0), 0);
        assert.equal(total, FIXTURE_TESTS.length, "the top-level suite counts add up to the fixture");

        // The failure shows the values it compared, beside its message
        const values: string[] = await _page.$$eval("#results .test-node.test-failed .assert-item.assert-fail .assert-values > *", (els: Element[]) => els.map((el) => el.textContent || ""));
        assert.deepEqual(values, [ "Expected", "\"Word\"", "Actual", "\"word\"" ]);

        // The run's totals sit beside the status
        await _waitFor(() => !!document.querySelector("#runSummary .summary-duration"), "the run summary to show the run's own totals");
        const chips: string[] = await _page.$$eval("#runSummary .summary-chip", (els: Element[]) => els.map((el) => el.textContent || ""));
        assert.deepEqual(chips.slice(0, 2), [ PASSING_COUNT + " passed", "1 failed" ]);
        assert.match(chips[2], /^\d+(ms|\.\d+s)$/, "and how long it took");

        // Assertions are flushed on an animation frame, so wait for the counter rather than read it.
        await _waitFor((expected: number) => {
            const el = document.getElementById("assertCount");
            const match = /^(\d+) assertions?$/.exec((el && el.textContent) || "");
            return !!match && parseInt(match[1], 10) >= expected;
        }, "the assertion counter to update", FIXTURE_TESTS.length);
        assert.notEqual(await _text("#assertCount"), "0 assertions");

        assert.equal(await _attr("#finishBtn", "aria-disabled"), "false", "Finish is enabled once a result exists");
        assert.isTrue(await _isDisabled("#clearScopeBtn"), "Clear scope is disabled when there is no scope to clear");
    });

    step("should scope to one suite from the Scope picker, carry it in the URL hash and restore it on reload", async () => {
        // Typing hides the "All tests" row and matches terms in any order.
        let rows = await _typeScope("multiplication");
        assert.deepEqual(rows.map((row) => row.label), [ SCOPED_SUITE ].concat(SCOPED_SUITE_TESTS), "the suite leads its own tests");
        assert.deepEqual(rows.map((row) => row.kind), [ "suite", "test", "test" ]);
        assert.isTrue(rows[0].active, "the top match is pre-highlighted while typing");

        rows = await _typeScope("zero multiplication");
        assert.deepEqual(rows.map((row) => row.label), [ RERUN_TEST ], "terms match in any order");

        // Text that names nothing is not a scope: committing it (blur) resolves to everything.
        await _typeScope("no such suite or test");
        assert.equal(await _page.$$eval("#scopeSelectList .autocomplete-empty", (els: Element[]) => els.length), 1, "the list says there are no matches");
        await _page.keyboard.press("Tab");
        assert.equal(await _scopeValue(), "", "unmatched text is cleared back to everything");
        assert.isTrue(await _isDisabled("#clearScopeBtn"), "so there is nothing to clear");
        assert.equal(await _hash(), "", "and nothing is recorded in the hash");

        rows = await _typeScope("multiplication");
        await _pickScopeRow(SCOPED_SUITE);

        assert.equal(await _scopeValue(), SCOPED_SUITE);
        assert.equal(await _attr("#scopeSelect", "data-autocomplete-kind"), "suite", "the picked row's kind is recorded");
        assert.equal(await _hash(), "#suite=" + hashSelectionValue(SCOPED_SUITE), "the scope is mirrored into the hash");
        assert.isFalse(await _isDisabled("#clearScopeBtn"), "Clear scope is enabled once a scope is set");

        await _clickRunAndWait();
        assert.deepEqual(_titles(await _readResults()), SCOPED_SUITE_TESTS, "only the scoped suite ran");
        const suiteNames = (await _readSuites()).map((suite) => suite.name).sort();
        assert.deepEqual(suiteNames, [ "Math", "multiplication" ], "only the scoped suite and its ancestor rendered");

        // Reload the page from that URL: the hash seeds the first run.
        await _page.reload({ waitUntil: "load" });
        await _waitForRunComplete();

        assert.equal(await _scopeValue(), SCOPED_SUITE, "the scope is restored from the hash");
        assert.equal(await _attr("#scopeSelect", "data-autocomplete-kind"), "suite");
        assert.equal(await _hash(), "#suite=" + hashSelectionValue(SCOPED_SUITE));
        assert.deepEqual(_titles(await _readResults()), SCOPED_SUITE_TESTS, "the restored scope drove the first run");

        await _clickRunAndWait();
        assert.deepEqual(_titles(await _readResults()), SCOPED_SUITE_TESTS, "re-running respects the restored scope");
    });

    step("should rerun one test from its row, then clear the scope with Clear scope without running", async () => {
        const selector = "#results .test-node .rerun-btn[data-rerun-test=\"" + RERUN_TEST + "\"]";
        await _page.waitForSelector(selector);
        await _page.click(selector);
        await _waitForRunComplete();

        const results = await _readResults();
        assert.deepEqual(_titles(results), [ RERUN_TEST ], "only the rerun test ran");
        assert.equal(results[0].status, "passed");
        assert.isTrue(results[0].open, "the test the run was scoped to stays expanded");
        assert.equal(await _scopeValue(), RERUN_TEST, "the picker now names the rerun test");
        assert.equal(await _attr("#scopeSelect", "data-autocomplete-kind"), "test");
        assert.equal(await _hash(), "#test=" + hashSelectionValue(RERUN_TEST), "a test scope is carried as test=, with no suite");

        const statusBefore = await _statusText();
        assert.isFalse(await _isDisabled("#clearScopeBtn"));
        await _page.click("#clearScopeBtn");

        assert.equal(await _scopeValue(), "", "Clear scope clears the box");
        assert.isNull(await _attr("#scopeSelect", "data-autocomplete-kind"));
        assert.equal(await _hash(), "", "and the hash");
        assert.isTrue(await _isDisabled("#clearScopeBtn"), "and disables itself once there is nothing to clear");
        assert.equal(await _activeElementId(), "runBtn", "focus moves to Run");
        assert.equal(await _statusText(), statusBefore, "clearing does not start a run");
        assert.deepEqual(_titles(await _readResults()), [ RERUN_TEST ], "the previous results are left alone");
    });

    step("should hide passing rows under Failed only and restore them when toggled back", async () => {
        await _clearScopeIfSet();
        await _clickRunAndWait();
        assert.equal((await _readResults()).length, FIXTURE_TESTS.length);

        assert.isFalse(await _isChecked("#failedOnlyToggle"), "Failed only is off by default");
        await _page.click("#failedOnlyToggle");
        assert.isTrue(await _isChecked("#failedOnlyToggle"));

        let results = await _readResults();
        results.forEach((row) => {
            assert.equal(row.hidden, row.status !== "failed", row.title + " hidden=" + row.hidden + " status=" + row.status);
        });
        assert.equal(results.filter((row) => !row.hidden).length, 1, "only the failing test is visible");
        assert.equal(await _text("#filterNote"), PASSING_COUNT + " passing tests hidden by Failed only", "the page says what it is hiding");

        let suites = await _readSuites();
        suites.forEach((suite) => {
            const keepsFailure = suite.name === "Strings" || suite.name === "casing";
            assert.equal(suite.hidden, !keepsFailure, "suite " + suite.name + " hidden=" + suite.hidden);
        });

        await _page.click("#failedOnlyToggle");
        assert.isFalse(await _isChecked("#failedOnlyToggle"));
        assert.isTrue(await _page.$eval("#filterNote", (el: Element) => (el as HTMLElement).hidden), "nothing hidden, nothing to say");

        results = await _readResults();
        assert.equal(results.filter((row) => row.hidden).length, 0, "every test row is visible again");
        suites = await _readSuites();
        assert.equal(suites.filter((suite) => suite.hidden).length, 0, "every suite is visible again");

        // The failed count beside the status is the same switch, and shows whether it is on
        await _page.click("#runSummary .summary-failed");
        assert.isTrue(await _isChecked("#failedOnlyToggle"), "the failed count turns Failed only on");
        assert.equal(await _attr("#runSummary .summary-failed", "aria-pressed"), "true");
        assert.equal((await _readResults()).filter((row) => !row.hidden).length, 1);

        await _page.click("#runSummary .summary-failed");
        assert.isFalse(await _isChecked("#failedOnlyToggle"), "and off again");
        assert.equal(await _attr("#runSummary .summary-failed", "aria-pressed"), "false");
    });

    step("should expose the actions menu as a keyboard-operable WAI-ARIA menu button", async () => {
        assert.equal(await _attr("#actionsBtn", "aria-haspopup"), "true");
        assert.equal(await _attr("#actionsBtn", "aria-controls"), "actionsMenu");
        assert.equal(await _attr("#actionsBtn", "aria-expanded"), "false");
        assert.equal(await _attr("#actionsMenu", "role"), "menu");
        assert.equal(await _attr("#actionsMenu", "aria-labelledby"), "actionsBtn");
        assert.isFalse(await _menuIsOpen(), "the menu starts closed");

        // A closed menu is not a tab stop at all: Tab from the button goes somewhere else.
        await _page.focus("#actionsBtn");
        await _page.keyboard.press("Tab");
        assert.notEqual(await _activeElementRole(), "menuitem", "Tab from the closed button never lands on an item");
        assert.isFalse(await _menuIsOpen());

        // Click opens it on the first item.
        await _page.click("#actionsBtn");
        assert.isTrue(await _menuIsOpen());
        assert.equal(await _attr("#actionsBtn", "aria-expanded"), "true");

        const items: Array<{ id: string; text: string; role: string | null; tabindex: string | null }> = await _page.$$eval("#actionsMenu [role='menuitem']", (els: Element[]) => els.map((el) => ({
            id: el.id,
            text: el.textContent || "",
            role: el.getAttribute("role"),
            tabindex: el.getAttribute("tabindex")
        })));
        assert.deepEqual(items.map((item) => item.text), MENU_ITEMS, "the items, in order");
        assert.deepEqual(items.map((item) => item.id), [ "reloadBtn", "clearLogsBtn", "appearanceItem", "finishBtn" ]);
        assert.deepEqual(items.map((item) => item.tabindex), [ "0", "-1", "-1", "-1" ], "roving tabindex: only the focused item is tabbable");
        assert.equal(await _activeElementId(), "reloadBtn", "opening focuses the first item");
        assert.equal(await _attr("#actionsMenu .menu-separator", "role"), "separator");

        // Arrow keys move and wrap; Home/End jump.
        await _page.keyboard.press("ArrowDown");
        assert.equal(await _activeElementId(), "autoReloadItem", "the Auto-reload setting is an item too");
        await _page.keyboard.press("ArrowDown");
        assert.equal(await _activeElementId(), "clearLogsBtn");
        await _page.keyboard.press("ArrowDown");
        assert.equal(await _activeElementId(), "appearanceItem", "then the entry that opens the Appearance panel");
        await _page.keyboard.press("ArrowDown");
        assert.equal(await _activeElementId(), "finishBtn");
        await _page.keyboard.press("ArrowDown");
        assert.equal(await _activeElementId(), "reloadBtn", "ArrowDown wraps from the last item to the first");
        await _page.keyboard.press("ArrowUp");
        assert.equal(await _activeElementId(), "finishBtn", "ArrowUp wraps from the first item to the last");
        await _page.keyboard.press("Home");
        assert.equal(await _activeElementId(), "reloadBtn");
        await _page.keyboard.press("End");
        assert.equal(await _activeElementId(), "finishBtn");
        assert.deepEqual(await _page.$$eval("#actionsMenu [role='menuitem']", (els: Element[]) => els.map((el) => el.getAttribute("tabindex"))), [ "-1", "-1", "-1", "0" ], "the roving tabindex follows focus");

        // Escape closes and returns focus to the button.
        await _page.keyboard.press("Escape");
        assert.isFalse(await _menuIsOpen());
        assert.equal(await _attr("#actionsBtn", "aria-expanded"), "false");
        assert.equal(await _activeElementId(), "actionsBtn", "Escape puts focus back on the button");

        // The whole menu is a single tab stop: Tab out of an open menu closes it and moves on.
        await _page.keyboard.press("ArrowDown");
        assert.isTrue(await _menuIsOpen(), "ArrowDown on the button opens the menu");
        assert.equal(await _activeElementId(), "reloadBtn");
        await _page.keyboard.press("Tab");
        assert.isFalse(await _menuIsOpen(), "Tab closes the menu");
        assert.notEqual(await _activeElementRole(), "menuitem", "and does not stop on another item");

        // ArrowUp on the button opens on the last item.
        await _page.focus("#actionsBtn");
        await _page.keyboard.press("ArrowUp");
        assert.equal(await _activeElementId(), "finishBtn");
        await _page.keyboard.press("Escape");
        assert.equal(await _activeElementId(), "actionsBtn");

        // Finish is a menu item, so it is aria-disabled (never natively disabled) and, with a
        // result in hand, enabled now.
        assert.equal(await _attr("#finishBtn", "aria-disabled"), "false");
        assert.isFalse(await _isDisabled("#finishBtn"), "a menu item is never natively disabled, so it stays focusable");
    });

    step("should pick the theme by searching for it in the Appearance panel, remembering the choice", async () => {
        const theme = () => _page.evaluate(() => ({
            attr: document.body.getAttribute("data-theme"),
            saved: localStorage.getItem("tripwire.theme"),
            background: getComputedStyle(document.body).backgroundImage,
            shown: (document.getElementById("themeInput") as HTMLInputElement).value
        }));

        await _page.emulateMediaFeatures([ { name: "prefers-color-scheme", value: "light" } ]);
        const system = await theme();
        assert.isNull(system.attr, "System sets no theme of its own");
        assert.isNull(system.saved);
        assert.equal(system.shown, "System");

        // A dialog of its own, as a menu may hold only menu items: the menu closes behind it, and
        // focus lands on the theme with its list still closed
        await _openAppearance();
        assert.isFalse(await _menuIsOpen(), "the menu closes behind it");
        assert.equal(await _attr("#appearancePanel", "role"), "dialog");
        assert.equal(await _attr("#appearanceItem", "aria-haspopup"), "dialog");
        assert.equal(await _attr("#appearanceItem", "aria-expanded"), "true");
        assert.notEqual(await _attr("#themeInput", "aria-expanded"), "true", "the list waits to be asked for");

        // Named for a screen reader: the dialog, the combobox and each setting
        const tree = await _page.accessibility.snapshot({ interestingOnly: false });
        const names: string[] = [];
        const walk = (node: any) => {
            if (node) {
                names.push(node.role + ":" + (node.name || ""));
                (node.children || []).forEach(walk);
            }
        };
        walk(tree);
        [ "dialog:Appearance", "combobox:Theme", "checkbox:Color-blind safe", "group:Zoom", "button:Zoom out", "button:Zoom in", "button:Reset" ].forEach((expected) => {
            assert.isTrue(names.indexOf(expected) !== -1, expected + " in the accessibility tree");
        });

        // ArrowDown lists every theme, the one in use highlighted
        await _page.keyboard.press("ArrowDown");
        assert.deepEqual(await _themeRows(), [ "*System", "Light", "Dark", "Low light" ]);
        assert.equal(await _attr("#themeInput", "aria-expanded"), "true");

        // Typing searches, and Enter picks the top match
        await _pickTheme("dar");
        const dark = await theme();
        assert.equal(dark.attr, "dark");
        assert.equal(dark.saved, "dark", "kept for the next page load");
        assert.equal(dark.shown, "Dark");
        assert.notEqual(dark.background, system.background, "the page is drawn dark");
        assert.deepEqual(await _themeRows(), [], "picking closes the list");
        assert.isTrue(await _appearanceIsOpen(), "but not the panel");

        // Escape closes the list first, then the panel, putting focus back on the menu button
        await _page.keyboard.press("ArrowDown");
        assert.deepEqual(await _themeRows(), [ "System", "Light", "*Dark", "Low light" ]);
        await _page.keyboard.press("Escape");
        assert.deepEqual(await _themeRows(), []);
        assert.isTrue(await _appearanceIsOpen(), "the first Escape closes only the list");
        await _page.keyboard.press("Escape");
        assert.isFalse(await _appearanceIsOpen());
        assert.equal(await _activeElementId(), "actionsBtn");
        assert.equal(await _attr("#appearanceItem", "aria-expanded"), "false");

        // System follows the operating system's setting again
        await _pickTheme("system");
        const followed = await theme();
        assert.isNull(followed.attr);
        assert.isNull(followed.saved, "nothing kept");
        assert.equal(followed.background, system.background);

        await _page.emulateMediaFeatures([ { name: "prefers-color-scheme", value: "dark" } ]);
        assert.equal((await theme()).background, dark.background, "a dark system setting draws it dark");

        await _pickTheme("light");
        const light = await theme();
        assert.equal(light.attr, "light", "the top match for \"light\", ahead of Low light");
        assert.equal(light.background, system.background, "Light overrides a dark system setting");

        await _pickTheme("system");
        await _page.emulateMediaFeatures([ { name: "prefers-color-scheme", value: "light" } ]);

        // A click outside closes the panel
        await _page.click("#results");
        assert.isFalse(await _appearanceIsOpen());
    });

    step("should switch to low light, color-blind safe colors and a zoom of the page alone from the Appearance panel", async () => {
        const look = () => _page.evaluate(() => {
            const passed = document.querySelector("#runSummary .summary-passed") as Element;
            return {
                theme: document.body.getAttribute("data-theme"),
                vision: document.body.getAttribute("data-vision"),
                zoom: document.body.style.getPropertyValue("--ui-zoom"),
                shellZoom: getComputedStyle(document.querySelector(".app-shell") as Element).getPropertyValue("zoom"),
                frameZoom: getComputedStyle(document.getElementById("testFrameContainer") as Element).getPropertyValue("zoom"),
                rootSize: getComputedStyle(document.documentElement).fontSize,
                shown: (document.getElementById("zoomValue") as Element).textContent,
                layout: [ "layout-narrow", "layout-short" ].filter((cls) => document.body.classList.contains(cls)),
                overflows: document.documentElement.scrollWidth > window.innerWidth,
                background: getComputedStyle(document.body).backgroundImage + " " + getComputedStyle(document.body).backgroundColor,
                passedColor: passed ? getComputedStyle(passed).color : "",
                saved: [ "tripwire.theme", "tripwire.vision", "tripwire.zoom" ].map((key) => localStorage.getItem(key))
            };
        });
        const before = await look();
        assert.deepEqual([ before.theme, before.vision, before.zoom ], [ null, null, "" ], "the defaults set nothing");
        assert.equal(before.shown, "100%");
        assert.equal(before.rootSize, "16px");
        assert.deepEqual(before.layout, [], "a wide window takes the full layout");

        await _pickTheme("low");
        const dim = await look();
        assert.equal(dim.theme, "dim");
        assert.notEqual(dim.background, before.background, "low light draws the page differently");

        await _page.click("#colorblindToggle");
        const colorblind = await look();
        assert.equal(colorblind.vision, "colorblind");
        assert.isTrue(await _isChecked("#colorblindToggle"));
        assert.equal(colorblind.passedColor, "rgb(86, 180, 233)", "passed is sky blue on a dark page, not green");

        // The zoom scales the page's own controls, results and log -- never the browser's zoom, the
        // tests' own frame, or the root size a test's content would share
        for (let lp = 0; lp < 3; lp++) {
            await _page.click("#zoomInBtn");
        }
        const zoomed = await look();
        assert.equal(zoomed.shown, "150%");
        assert.deepEqual([ zoomed.zoom, zoomed.shellZoom ], [ "1.5", "1.5" ]);
        assert.equal(zoomed.frameZoom, "1", "the tests' frame is not zoomed");
        assert.equal(zoomed.rootSize, "16px", "nor is the root");
        assert.deepEqual(zoomed.saved, [ "dim", "colorblind", "150" ], "each choice is kept for the next page load");

        // Zoomed far enough, a wide window holds only a narrow page, which takes its compact layout
        for (let lp = 0; lp < 3; lp++) {
            await _page.click("#zoomInBtn");
        }
        const far = await look();
        assert.equal(far.shown, "250%");
        assert.deepEqual(far.layout, [ "layout-narrow", "layout-short" ], "512 by 360 of the page's own pixels");
        assert.isFalse(far.overflows, "and still fits across the window");

        // A reload opens the page as it was left, before it first paints
        await _page.reload({ waitUntil: "load" });
        await _waitForRunComplete();
        const reloaded = await look();
        assert.deepEqual([ reloaded.theme, reloaded.vision, reloaded.zoom, reloaded.shown ], [ "dim", "colorblind", "2.5", "250%" ]);
        assert.deepEqual(reloaded.layout, [ "layout-narrow", "layout-short" ]);

        // Back to the defaults, which keeps nothing
        await _pickTheme("system");
        await _page.click("#colorblindToggle");
        await _page.click("#zoomResetBtn");
        const after = await look();
        assert.deepEqual([ after.theme, after.vision, after.zoom, after.shown ], [ null, null, "", "100%" ]);
        assert.deepEqual(after.saved, [ null, null, null ]);
        assert.deepEqual(after.layout, []);
        assert.equal(after.passedColor, before.passedColor);
        assert.equal(await _attr("#zoomResetBtn", "aria-disabled"), "true", "nothing left to reset");

        await _page.focus("#themeInput");
        await _page.keyboard.press("Escape");
        assert.isFalse(await _appearanceIsOpen());
    });

    step("should be usable from the keyboard alone, with every control named for a screen reader", async () => {
        // The first Tab stop on the page skips the header and the controls, and leaves the hash alone
        const firstStop = await _page.evaluate(() => {
            const stop = document.querySelector("a[href], button:not([disabled]), input, select, summary, [tabindex]:not([tabindex='-1'])");
            return stop ? stop.id : "";
        });
        assert.equal(firstStop, "skipLink");
        const hash = await _hash();
        await _page.focus("#skipLink");
        await _page.keyboard.press("Enter");
        assert.equal(await _activeElementId(), "results", "the skip link lands on the results");
        assert.equal(await _hash(), hash, "the hash still holds the scope");

        // Every control a keyboard can reach has a name a screen reader can say
        const unnamed: string[] = await _page.evaluate(() => {
            const found: string[] = [];
            document.querySelectorAll("a[href], button, input, select, summary, [tabindex]").forEach((el) => {
                const html = el as HTMLElement;
                if (html.offsetParent === null || html.getAttribute("tabindex") === "-1" && html.id !== "results") {
                    return;
                }

                const labelled = html.getAttribute("aria-label") || html.getAttribute("aria-labelledby") ||
                    (html.id && document.querySelector("label[for='" + html.id + "']")) || html.closest("label") ||
                    (html.textContent || "").trim();
                if (!labelled) {
                    found.push(html.outerHTML.substring(0, 80));
                }
            });

            return found;
        });
        assert.deepEqual(unnamed, [], "unnamed controls");

        // The accessibility tree Chrome gives a screen reader -- with the log panel open, as a closed
        // one is not in it: the regions and the icon buttons by name, and the failure as a failure
        await _page.click("#logPanel > summary");
        const tree = await _page.accessibility.snapshot({ interestingOnly: false });
        await _page.click("#logPanel > summary");
        const names: string[] = [];
        const inResults: string[] = [];
        const walk = (node: any, results: boolean) => {
            if (node) {
                const name = node.role + ":" + (node.name || "");
                names.push(name);
                if (results) {
                    inResults.push(name);
                }

                (node.children || []).forEach((kid: any) => walk(kid, results || name === "main:Test results"));
            }
        };
        walk(tree, false);
        [ "main:Test results", "button:More actions", "button:Clear results", "combobox:Scope", "log:Runner log" ].forEach((expected) => {
            assert.isTrue(names.indexOf(expected) !== -1, expected + " in the accessibility tree");
        });
        assert.isTrue(inResults.indexOf("StaticText:Failed:") !== -1, "a failed assertion is announced as failed");
        assert.isFalse(inResults.some((name) => name.indexOf("StaticText:✗") === 0), "and not as its glyph");
    });

    step("should fold Failed only, then Target into the actions menu as the window narrows", async () => {
        // Which controls are folded, whether the toolbar is on one line, and the menu's entries
        const layout = () => _page.evaluate(() => {
            const folded = (id: string) => getComputedStyle(document.getElementById(id) as Element).display === "none";
            const row = document.getElementById("controlsRow") as HTMLElement;
            const shown = Array.prototype.filter.call(row.children, (el: HTMLElement) => el.offsetWidth > 0) as HTMLElement[];
            const last = shown[shown.length - 1];
            const entries = Array.prototype.filter.call(document.querySelectorAll("#actionsMenu [role^='menuitem']"), (el: HTMLElement) => {
                for (let node: HTMLElement | null = el; node && node.id !== "actionsMenu"; node = node.parentElement) {
                    if (node.hasAttribute("hidden")) {
                        return false;
                    }
                }

                return true;
            }) as HTMLElement[];

            return {
                folded: [ "failedOnlyControl", "targetControl" ].filter(folded),
                oneLine: last.offsetTop <= shown[0].offsetTop + shown[0].offsetHeight / 2,
                menu: entries.map((el) => (el.textContent || "").trim() + (el.getAttribute("aria-checked") === "true" ? " ✓" : ""))
            };
        });
        const resize = async (width: number, folded: string[]) => {
            await _page.setViewport({ width: width, height: WIDE_VIEWPORT.height });
            // The compact layout follows the window from its resize event, and the folding from the
            // frame after that: wait for both, as neither has happened when setViewport returns
            await _waitFor((narrow: boolean) => document.body.classList.contains("layout-narrow") === narrow,
                "the compact layout to follow the window to " + width + "px", width <= 600);
            await _page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
            await _waitFor((expected: string) => [ "failedOnlyControl", "targetControl" ]
                .filter((id) => getComputedStyle(document.getElementById(id) as Element).display === "none").join() === expected,
            "the controls to fold to fit " + width + "px", folded.join());

            return layout();
        };
        const fixed = [ "Reload Tests", "Auto-reload ✓", "Clear Logs", "Appearance…", "Finish & Stop Server" ];
        const targets = target === "browser" ? [ "Browser ✓", "Worker" ] : [ "Browser", "Worker ✓" ];

        let now = await layout();
        assert.deepEqual(now.folded, [], "a wide window holds every control");
        assert.isTrue(now.oneLine);
        assert.deepEqual(now.menu, fixed, "and the menu holds only its own entries");

        now = await resize(520, []);
        assert.isTrue(now.oneLine, "520px still holds every control");
        assert.deepEqual(now.menu, fixed);

        now = await resize(390, [ "failedOnlyControl", "targetControl" ]);
        assert.isTrue(now.oneLine, "a phone folds Failed only to keep Scope and Run on one line");
        assert.deepEqual(now.menu, [ "Failed only" ].concat(targets, fixed), "and Target from the title row, each ticked as its control is");

        // A stand-in drives the real control
        await _clickMenuItem("failedOnlyItem");
        assert.isTrue(await _isChecked("#failedOnlyToggle"), "choosing Failed only in the menu turns the filter on");
        assert.equal((await _readResults()).filter((row) => !row.hidden).length, 1);
        assert.isTrue((await layout()).menu.indexOf("Failed only ✓") !== -1, "and ticks its stand-in");
        await _clickMenuItem("failedOnlyItem");
        assert.isFalse(await _isChecked("#failedOnlyToggle"));

        now = await resize(WIDE_VIEWPORT.width, []);
        assert.isTrue(now.oneLine, "and widening the window brings them all back");
        assert.deepEqual(now.menu, fixed);
    });

    step("should clear the results from the status line and the log panel from the actions menu", async () => {
        assert.isTrue((await _readResults()).length > 0, "there are results to clear");
        await _waitFor(() => {
            const logs = document.getElementById("logs");
            return !!logs && logs.children.length > 0;
        }, "the run's log lines to render");

        // The reporter's lines are in the colours the CLI's terminal shows them in, with no codes left over
        const logs: { coloured: number, codes: boolean } = await _page.$eval("#logs", (el: Element) => ({
            coloured: el.querySelectorAll("span[class*='ansi-fg-']").length,
            codes: (el.textContent || "").indexOf("\u001b") !== -1
        }));
        assert.isTrue(logs.coloured > 0, "the log draws the reporter's colours");
        assert.isFalse(logs.codes, "and shows none of the codes themselves");

        assert.equal(await _attr("#clearResultsBtn", "aria-label"), "Clear results", "an icon, named for a screen reader");
        await _page.click("#clearResultsBtn");
        assert.equal(await _page.$eval("#results", (el: Element) => el.children.length), 0, "Clear Results empties the results list");
        assert.equal(await _text("#assertCount"), "0 assertions", "and resets the assertion counter");
        assert.isTrue(await _page.$eval("#logs", (el: Element) => el.children.length > 0), "Clear Results leaves the logs alone");

        await _clickMenuItem("clearLogsBtn");
        assert.equal(await _page.$eval("#logs", (el: Element) => el.children.length), 0, "Clear Logs empties the log panel");
        assert.isFalse(await _menuIsOpen(), "choosing an item closes the menu");
        assert.equal(await _activeElementId(), "actionsBtn", "and returns focus to the button");
    });
}

// ---------------------------------------------------------------------------------------------
// Session setup/teardown
// ---------------------------------------------------------------------------------------------
async function _loadPuppeteer(): Promise<any> {
    let resolved: string;
    try {
        resolved = require.resolve("puppeteer", { paths: [ _runnerRoot, __dirname ] });
    } catch (e) {
        return null;
    }

    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires, security/detect-non-literal-require
        return require(resolved);
    } catch (e) {
        // puppeteer 25 and later ship only ES modules, which require() cannot load before Node.js
        // 20.19 and 22.12. The import() is built with new Function so this CommonJS compile keeps it.
        try {
            const mod = await (new Function("url", "return import(url);"))(pathToFileURL(resolved).href);
            return (mod && mod.default) || mod;
        } catch (importError) {
            return null;
        }
    }
}

/**
 * Spawns `tripwire --target browser --browser-launch manual` against the fixture and resolves
 * with the "Runner URL" it prints. Rejects if the process exits (or goes quiet) first.
 */
function _spawnCli(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        const child = spawn(process.execPath, [
            _cliPath,
            "--target", "browser",
            "--browser-launch", "manual",
            "-p", "./tsconfig.json",
            "./specs/**/*.spec.ts"
        ], {
            cwd: _fixtureDir,
            stdio: [ "ignore", "pipe", "pipe" ],
            windowsHide: true
        });

        _child = child;
        _childExit = new Promise<number | null>((resolveExit) => {
            child.on("exit", (code) => resolveExit(code));
            child.on("error", () => resolveExit(null));
        });

        let settled = false;
        const timer = setTimeout(() => {
            if (!settled) {
                settled = true;
                reject(new Error("The CLI did not print its Runner URL within " + WAIT_MS + "ms"));
            }
        }, WAIT_MS);

        function _checkForUrl() {
            if (settled) {
                return;
            }

            const match = /Runner URL:\s*(http:\/\/\S+\/__tripwire__\/browser)/.exec(_stripAnsi(_childStdout));
            if (match) {
                settled = true;
                clearTimeout(timer);
                resolve(match[1]);
            }
        }

        if (child.stdout) {
            child.stdout.on("data", (chunk: Buffer) => {
                _childStdout += chunk.toString();
                _checkForUrl();
            });
        }

        if (child.stderr) {
            child.stderr.on("data", (chunk: Buffer) => {
                _childStderr += chunk.toString();
            });
        }

        child.on("error", (err) => {
            if (!settled) {
                settled = true;
                clearTimeout(timer);
                reject(err);
            }
        });

        child.on("exit", (code) => {
            if (!settled) {
                settled = true;
                clearTimeout(timer);
                reject(new Error("The CLI exited with code " + code + " before printing its Runner URL" + _diagnostics()));
            }
        });
    });
}

/** Requests `url` once and discards the response, so the server builds that target now. */
function _prefetch(url: string): Promise<void> {
    return new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, WAIT_MS);
        const request = http.get(url, (response) => {
            response.resume();
            response.on("end", () => {
                clearTimeout(timer);
                resolve();
            });
        });
        request.on("error", () => {
            clearTimeout(timer);
            resolve();
        });
    });
}

async function _teardown(): Promise<void> {
    if (_page) {
        await _page.close().catch(() => { /* already gone */ });
        _page = null;
    }

    if (_browser) {
        await _browser.close().catch(() => { /* already gone */ });
        _browser = null;
    }

    if (_child && _child.exitCode === null && !_child.killed) {
        _child.kill();
    }

    if (_childExit) {
        // Give a killed child a moment to actually go away, but never hang teardown on it.
        await Promise.race([
            _childExit,
            new Promise<void>((resolve) => setTimeout(resolve, 5000))
        ]);
    }

    _child = null;
}

describe("interactive runner page (puppeteer)", function() {
    this.timeout(STEP_TIMEOUT_MS);

    before(async function(this: ITestContext) {
        this.timeout(STEP_TIMEOUT_MS);

        const puppeteer = await _loadPuppeteer();
        if (!puppeteer) {
            console.log("interactivePage.test.ts: puppeteer is not installed -- skipping the interactive page suite");
            this.skip();
            return;
        }

        // Chrome's launch, the CLI's start-up and the server's first (lazy) build of the browser
        // bundle are independent and each take seconds, so they overlap: launch first, spawn the
        // CLI while Chrome comes up, and ask the server for the page once so it builds the bundle
        // before the browser's first navigation has to wait for it.
        const launching: Promise<any> = puppeteer.launch({ headless: true });
        launching.catch(() => { /* reported below */ });

        let warmed: Promise<void> | null = null;
        try {
            _runnerUrl = await _spawnCli();
            warmed = _prefetch(_runnerUrl);
        } catch (e) {
            await launching.then((browser) => browser.close(), () => { /* nothing to close */ });
            await _teardown();
            throw e;
        }

        try {
            _browser = await launching;
        } catch (e: any) {
            // No Chrome in puppeteer's cache (or it failed to start) -- a missing browser is a
            // reason to skip, never a failure of the page under test.
            console.log("interactivePage.test.ts: puppeteer could not launch Chrome -- skipping the interactive page suite: "
                + (e && e.message ? e.message.split("\n")[0] : String(e)));
            await _teardown();
            this.skip();
            return;
        }

        try {
            await warmed;
            _page = await _browser.newPage();
            // Wide enough for every control on its row: the narrow-window step folds them on purpose
            await _page.setViewport({ width: WIDE_VIEWPORT.width, height: WIDE_VIEWPORT.height });
            _page.on("pageerror", (err: any) => {
                _pageErrors.push(err && err.message ? err.message : String(err));
            });
            await _page.evaluateOnNewDocument(_TRACE_SCRIPT);
        } catch (e) {
            await _teardown();
            throw e;
        }
    });

    after(async function(this: ITestContext) {
        this.timeout(STEP_TIMEOUT_MS);
        await _teardown();
    });

    describe("browser target", () => {
        step("should load, report ready and run the fixture once, with Finish disabled until a result exists", async () => {
            assert.isTrue(/^http:\/\/127\.0\.0\.1:\d+\/__tripwire__\/browser$/.test(_runnerUrl), "the CLI printed a loopback Runner URL: " + _runnerUrl);

            await _page.goto(_runnerUrl, { waitUntil: "load" });
            await _waitForRunComplete();

            // The states the page went through on its way here -- see _TRACE_SCRIPT.
            await _assertFirstRunTrace("browser");

            assert.equal(await _statusText(), "Run complete. Run again, or choose Finish & Stop Server from the ⋮ menu to send the result to the CLI.");
            assert.equal(await _text("#runBtn"), "Run Again");
            assert.equal(await _pathname(), "/__tripwire__/browser");
            assert.equal(await _attr("#finishBtn", "aria-disabled"), "false", "Finish is enabled once a result exists");
            assert.equal(await _attr("#autoReloadItem", "aria-checked"), "true", "Auto-reload defaults to on");
            assert.equal((await _readResults()).length, FIXTURE_TESTS.length, "the first run rendered every fixture test");
        });

        _sharedScenarios("browser");
    });

    describe("target picker", () => {
        step("should switch to the worker page, keeping the scope in the hash, and run the same tests there", async () => {
            // Scope something first so there is a hash to preserve.
            await _typeScope("multiplication");
            await _pickScopeRow(SCOPED_SUITE);
            const expectedHash = "#suite=" + hashSelectionValue(SCOPED_SUITE);
            assert.equal(await _hash(), expectedHash);

            const navigation = _page.waitForNavigation({ waitUntil: "load", timeout: WAIT_MS });
            await _page.select("#targetSelect", "worker");
            await navigation;

            assert.equal(await _pathname(), "/__tripwire__/worker", "the path names the worker target");
            assert.equal(await _hash(), expectedHash, "the scope rode along in the hash");
            assert.equal(await _attr("body", "data-runner-target"), "worker");
            assert.equal(await _page.$eval("#targetSelect", (el: Element) => (el as HTMLSelectElement).value), "worker");

            await _waitForRunComplete();
            await _assertFirstRunTrace("worker");
            assert.equal(await _scopeValue(), SCOPED_SUITE, "the worker page restored the scope");
            assert.deepEqual(_titles(await _readResults()), SCOPED_SUITE_TESTS, "the first worker run honoured it");
            assert.equal(await _statusText(), "Run complete. Run again, or choose Finish & Stop Server from the ⋮ menu to send the result to the CLI.");

            await _page.click("#clearScopeBtn");
            await _clickRunAndWait();
            const results = await _readResults();
            assert.deepEqual(_titles(results), FIXTURE_TESTS, "the worker target runs the same test set");
            assert.deepEqual(results.filter((row) => row.status === "failed").map((row) => row.title), [ FAILING_TEST ]);
        });
    });

    describe("worker target", () => {
        _sharedScenarios("worker");
    });

    describe("auto-reload", () => {
        step("should default on, survive Reload Tests when toggled off, and reset on a full page load", async () => {
            // Preference lives in memory (state.ts's autoReloadEnabled): not the hash, not storage.
            await _clearScopeIfSet();
            assert.equal(await _attr("#autoReloadItem", "aria-checked"), "true", "Auto-reload defaults to on");

            await _clickMenuItem("autoReloadItem");
            assert.equal(await _attr("#autoReloadItem", "aria-checked"), "false");

            // Reload Tests tears down the run state but deliberately keeps this preference.
            await _clickMenuItem("reloadBtn");
            await _waitForRunComplete();
            assert.equal(await _attr("#autoReloadItem", "aria-checked"), "false", "an in-page reload keeps the setting off");
            assert.equal((await _readResults()).length, FIXTURE_TESTS.length, "Reload Tests re-ran the suite");

            // A full page load starts from the default again: nothing persists it.
            await _page.reload({ waitUntil: "load" });
            await _waitForRunComplete();
            assert.equal(await _attr("#autoReloadItem", "aria-checked"), "true", "a page reload is back to the default");
            assert.equal(await _hash(), "", "the preference is not carried in the hash");
            assert.equal(await _page.evaluate(() => {
                try {
                    return window.localStorage.length;
                } catch (e) {
                    return 0;
                }
            }), 0, "nor in localStorage");
        });
    });

    describe("finish", () => {
        step("should send the result to the CLI from Finish & Stop Server and let the CLI exit with the run's code", async () => {
            // Make sure the result being reported is the whole fixture.
            await _clearScopeIfSet();
            await _clickRunAndWait();
            assert.equal((await _readResults()).length, FIXTURE_TESTS.length);

            await _openMenu();
            assert.equal(await _attr("#finishBtn", "aria-disabled"), "false");
            await _page.click("#finishBtn");

            await _waitFor(() => {
                const status = document.getElementById("status");
                return ((status && status.textContent) || "").indexOf("Completed") === 0;
            }, "the page to confirm the result was sent");
            assert.equal(await _statusText(), "Completed. You can close this tab.");
            assert.equal(await _attr("#finishBtn", "aria-disabled"), "true", "Finish cannot be sent twice");

            const exitCode = await Promise.race([
                _childExit as Promise<number | null>,
                new Promise<string>((resolve) => setTimeout(() => resolve("timeout"), WAIT_MS))
            ]);
            assert.notEqual(exitCode, "timeout", "the CLI should exit once the result arrives");
            assert.equal(exitCode, 1, "one failing test means a non-zero exit code");

            const stdout = _stripAnsi(_childStdout);
            assert.isTrue(stdout.indexOf("Run summary: total=" + FIXTURE_TESTS.length + " passed=" + PASSING_COUNT + " failed=1 skipped=0 pending=0") !== -1,
                "the CLI reported the fixture's run summary:\n" + _tail(_childStdout, 20));
        });
    });
});
