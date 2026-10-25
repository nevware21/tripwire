/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

/**
 * The one thing an interactive run is scoped to: a suite, a single test, or everything.
 *
 * The page used to carry two separate boxes -- a Suite picker and a Test picker -- which had to
 * be read together to know what would run, could disagree with each other (the filter resolved
 * that by preferring the test), and made "run this one test" a two-field operation. This module
 * is the whole model behind the single box that replaced them: one value, searched across every
 * suite *and* every test at once.
 *
 * It lives in `src/shared/` rather than beside the picker for the same reason
 * `discovery.ts` does -- everything here is pure and testable in node, while
 * `ux/browser/ui/selection.ts` keeps only the part that touches the live input element. Same
 * dependency rules as the rest of `src/shared/`: no node builtins, nothing from `../ux`, and no
 * barrel -- importers name this file directly.
 */

/** What a scope value names: the whole run, one suite (and its nested suites), or one test. */
export type ScopeKind = "all" | "suite" | "test";

/** One row of the scope picker's dropdown. */
export interface IScopeOption {
    /** The title to put in the input when this row is chosen; empty for the "all" row. */
    value: string;
    /** Which kind of thing `value` names -- rendered as the row's badge. */
    kind: ScopeKind;
    /** What the row displays. Same as `value` except for the "all" row, which has none. */
    label: string;
}

/**
 * A resolved scope, in the shape `createSelectionFilter` (shared/filters.ts) and the URL hash
 * already use. At most one of the two is ever set now that there is a single picker.
 */
export interface IScopeSelection {
    suiteTitle: string;
    testTitle: string;
}

/** The label for "no scope at all", ie. run everything. */
export const ALL_SCOPE_LABEL = "All tests";

function _terms(query: string): string[] {
    const parts = (query || "").toLowerCase().split(/\s+/);
    const result: string[] = [];

    for (let lp = 0; lp < parts.length; lp++) {
        // A bare ">" is the separator this UI joins titles with, not something worth matching --
        // it appears in every nested title, so requiring it would narrow nothing while making
        // the natural way to type a path ("outer > inner") behave differently from "outer inner".
        if (parts[lp] && parts[lp] !== ">") {
            result.push(parts[lp]);
        }
    }

    return result;
}

/**
 * Whether `value` matches `query`: every whitespace-separated term must appear in it,
 * case-insensitively and in any order. An empty query matches everything.
 *
 * Multi-term rather than one plain substring because the titles being searched are full
 * `outer > inner > name` paths: "inner name" should find one, and does, where a single
 * substring test would need the exact spacing and separators typed out.
 */
export function matchesScopeQuery(value: string, query: string): boolean {
    const terms = _terms(query);
    const haystack = (value || "").toLowerCase();

    for (let lp = 0; lp < terms.length; lp++) {
        if (haystack.indexOf(terms[lp]) === -1) {
            return false;
        }
    }

    return true;
}

function _hasSuite(discovery: any, title: string): boolean {
    const suites: string[] = (discovery && discovery.suites) || [];

    return suites.indexOf(title) !== -1;
}

function _hasTest(discovery: any, title: string): boolean {
    const tests: any[] = (discovery && discovery.tests) || [];

    for (let lp = 0; lp < tests.length; lp++) {
        if (tests[lp] && tests[lp].fullTitle === title) {
            return true;
        }
    }

    return false;
}

/**
 * Whether `value` is already a complete scope -- the exact title of a known suite or test --
 * rather than something part-typed.
 */
export function isCompleteScopeValue(discovery: any, value: string): boolean {
    const title = (value || "").trim();

    return !!title && (_hasSuite(discovery, title) || _hasTest(discovery, title));
}

/**
 * The dropdown's rows for `query`: every matching suite, then every matching test.
 *
 * Suites come first because a suite is the broader choice and its title is a prefix of every
 * test title beneath it, so the narrow options read as a list *under* the broad one.
 *
 * When `query` is empty -- or is a complete scope already, which is what the box holds whenever
 * the dropdown is reopened on the current selection -- the full list is returned with the "all"
 * row at the top, the way opening a plain `<select>` shows every option rather than only the
 * chosen one. While something is actually being typed the "all" row is left out, so the
 * pre-highlighted first row is always a real match.
 */
export function getScopeOptions(discovery: any, query: string): IScopeOption[] {
    const options: IScopeOption[] = [];
    const showAll = !_terms(query).length || isCompleteScopeValue(discovery, query);
    const effectiveQuery = showAll ? "" : query;

    if (showAll) {
        options.push({ value: "", kind: "all", label: ALL_SCOPE_LABEL });
    }

    const suites: string[] = (discovery && discovery.suites) || [];
    for (let lp = 0; lp < suites.length; lp++) {
        if (matchesScopeQuery(suites[lp], effectiveQuery)) {
            options.push({ value: suites[lp], kind: "suite", label: suites[lp] });
        }
    }

    const tests: any[] = (discovery && discovery.tests) || [];
    for (let lp = 0; lp < tests.length; lp++) {
        const fullTitle = tests[lp] && tests[lp].fullTitle;
        if (fullTitle && matchesScopeQuery(fullTitle, effectiveQuery)) {
            options.push({ value: fullTitle, kind: "test", label: fullTitle });
        }
    }

    return options;
}

/**
 * Turns the picker's value back into the scope the run is filtered by.
 *
 * A title can name both a suite and a test at once -- `describe("A", () => { it("B"); describe("B",
 * ...) })` gives the test and the nested suite the same `A > B` title -- so `kindHint` carries
 * which kind of row was actually picked from the dropdown (see `createAutocomplete`, which records
 * it on the input and drops it the moment the value is edited by hand). Without a usable hint a
 * title that is both resolves to the test, the narrower of the two.
 *
 * A value matching nothing at all resolves to no scope rather than to a filter that can never
 * match: half-typed text in the box must not silently turn into a run of zero tests.
 */
export function resolveScopeSelection(discovery: any, value: string, kindHint?: string): IScopeSelection {
    const title = (value || "").trim();
    if (!title) {
        return { suiteTitle: "", testTitle: "" };
    }

    const isSuite = _hasSuite(discovery, title);
    const isTest = _hasTest(discovery, title);

    if (kindHint === "suite" && isSuite) {
        return { suiteTitle: title, testTitle: "" };
    }

    if (kindHint === "test" && isTest) {
        return { suiteTitle: "", testTitle: title };
    }

    if (isTest) {
        return { suiteTitle: "", testTitle: title };
    }

    if (isSuite) {
        return { suiteTitle: title, testTitle: "" };
    }

    return { suiteTitle: "", testTitle: "" };
}

/**
 * The title the picker shows for `selection` -- the inverse of {@link resolveScopeSelection}.
 * A selection carrying both (an older URL hash, which could record a suite *and* a test) shows
 * the test, matching which of the two the filter honours.
 */
export function scopeValueFromSelection(selection: any): string {
    if (!selection) {
        return "";
    }

    return selection.testTitle || selection.suiteTitle || "";
}

/** The kind {@link scopeValueFromSelection} returned a title for; empty for no scope. */
export function scopeKindFromSelection(selection: any): string {
    if (selection && selection.testTitle) {
        return "test";
    }

    if (selection && selection.suiteTitle) {
        return "suite";
    }

    return "";
}
