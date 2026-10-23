/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "@nevware21/tripwire";
import {
    ALL_SCOPE_LABEL, getScopeOptions, isCompleteScopeValue, matchesScopeQuery,
    resolveScopeSelection, scopeKindFromSelection, scopeValueFromSelection
} from "../../../src/shared/scopeOptions";

/**
 * The model behind the interactive page's single Scope picker -- the box that replaced the
 * separate Suite and Test pickers. Everything here is pure, which is the point of it living in
 * `src/shared/` rather than next to the input element it drives: the half that touches the DOM
 * (`ux/browser/ui/selection.ts`) is a handful of lines that cannot be loaded in node at all.
 */

/** `describe("outer", { it("alpha"), describe("inner", { it("gamma") }) }), describe("other", { it("delta") })` */
const DISCOVERY = {
    suites: ["other", "outer", "outer > inner"],
    tests: [
        { suiteTitle: "other", testName: "delta", fullTitle: "other > delta" },
        { suiteTitle: "outer", testName: "alpha", fullTitle: "outer > alpha" },
        { suiteTitle: "outer > inner", testName: "gamma", fullTitle: "outer > inner > gamma" }
    ]
};

/**
 * The case a single box has to handle that two boxes never could: `describe("A", () => { it("B");
 * describe("B", () => { it("c") }) })` gives the test and the nested suite the same "A > B"
 * title, so the displayed value alone cannot say which was picked.
 */
const AMBIGUOUS = {
    suites: ["A", "A > B"],
    tests: [
        { suiteTitle: "A", testName: "B", fullTitle: "A > B" },
        { suiteTitle: "A > B", testName: "c", fullTitle: "A > B > c" }
    ]
};

/** The options as "<kind>:<value>" strings, which read far better in a failure message. */
function optionKeys(discovery: any, query: string): string[] {
    return getScopeOptions(discovery, query).map((option) => option.kind + ":" + option.value);
}

describe("shared scopeOptions", () => {

    describe("matchesScopeQuery", () => {
        it("should match everything when the query is empty", () => {
            assert.isTrue(matchesScopeQuery("outer > alpha", ""));
            assert.isTrue(matchesScopeQuery("outer > alpha", "   "));
            assert.isTrue(matchesScopeQuery("", ""));
        });

        it("should match a substring regardless of case", () => {
            assert.isTrue(matchesScopeQuery("outer > Alpha", "alpha"));
            assert.isTrue(matchesScopeQuery("outer > alpha", "ALPHA"));
            assert.isFalse(matchesScopeQuery("outer > alpha", "beta"));
        });

        it("should require every term, in any order", () => {
            assert.isTrue(matchesScopeQuery("outer > inner > gamma", "inner gamma"));
            assert.isTrue(matchesScopeQuery("outer > inner > gamma", "gamma outer"));
            assert.isFalse(matchesScopeQuery("outer > inner > gamma", "inner delta"));
        });

        it("should ignore a bare > , so a pasted path searches like plain words", () => {
            // "outer > inner" is how the UI displays a nested suite, so it is exactly what gets
            // pasted or retyped -- it must not behave differently from "outer inner".
            assert.isTrue(matchesScopeQuery("outer > inner > gamma", "outer > inner"));
            assert.isTrue(matchesScopeQuery("alpha", ">"));
            assert.isFalse(matchesScopeQuery("alpha", "> beta"));
        });
    });

    describe("getScopeOptions", () => {
        it("should offer the all row, then every suite, then every test for an empty query", () => {
            assert.deepEqual(optionKeys(DISCOVERY, ""), [
                "all:",
                "suite:other", "suite:outer", "suite:outer > inner",
                "test:other > delta", "test:outer > alpha", "test:outer > inner > gamma"
            ]);
        });

        it("should label the all row", () => {
            const all = getScopeOptions(DISCOVERY, "")[0];

            assert.equal(all.kind, "all");
            assert.equal(all.value, "", "choosing it must clear the scope");
            assert.equal(all.label, ALL_SCOPE_LABEL);
        });

        it("should drop the all row while something is being typed", () => {
            // Otherwise the pre-highlighted first row -- what a bare Enter commits -- would be
            // "clear the scope" rather than a match for what was typed.
            assert.deepEqual(optionKeys(DISCOVERY, "gamma"), ["test:outer > inner > gamma"]);
        });

        it("should keep suites ahead of tests when searching", () => {
            assert.deepEqual(optionKeys(DISCOVERY, "inner"), [
                "suite:outer > inner",
                "test:outer > inner > gamma"
            ]);
        });

        it("should show the whole list again once the value is a complete scope", () => {
            // What the box holds whenever the dropdown is reopened on the current selection:
            // opening a picker has to show what else can be picked, not just the one already in
            // it -- the same as opening a plain <select>.
            assert.deepEqual(optionKeys(DISCOVERY, "outer"), optionKeys(DISCOVERY, ""));
            assert.deepEqual(optionKeys(DISCOVERY, "outer > alpha"), optionKeys(DISCOVERY, ""));
        });

        it("should offer nothing when the query matches nothing", () => {
            assert.deepEqual(optionKeys(DISCOVERY, "nothing matches this"), []);
        });

        it("should tolerate a missing or empty discovery", () => {
            assert.deepEqual(optionKeys(undefined, ""), ["all:"]);
            assert.deepEqual(optionKeys({}, ""), ["all:"]);
            assert.deepEqual(optionKeys({ suites: [], tests: [] }, "outer"), []);
        });
    });

    describe("resolveScopeSelection", () => {
        it("should resolve nothing to no scope", () => {
            assert.deepEqual(resolveScopeSelection(DISCOVERY, ""), { suiteTitle: "", testTitle: "" });
            assert.deepEqual(resolveScopeSelection(DISCOVERY, "   "), { suiteTitle: "", testTitle: "" });
        });

        it("should resolve a known suite title to a suite scope", () => {
            assert.deepEqual(resolveScopeSelection(DISCOVERY, "outer > inner"), { suiteTitle: "outer > inner", testTitle: "" });
        });

        it("should resolve a known test title to a test scope", () => {
            assert.deepEqual(resolveScopeSelection(DISCOVERY, "outer > alpha"), { suiteTitle: "", testTitle: "outer > alpha" });
        });

        it("should ignore surrounding whitespace", () => {
            assert.deepEqual(resolveScopeSelection(DISCOVERY, "  outer  "), { suiteTitle: "outer", testTitle: "" });
        });

        it("should resolve a title that names nothing to no scope, not to a scope that runs nothing", () => {
            // Half-typed text left in the box must mean "everything", the same as an empty box.
            // Resolving it to a filter no test can satisfy would turn a typo into a silent run of
            // zero tests.
            assert.deepEqual(resolveScopeSelection(DISCOVERY, "out"), { suiteTitle: "", testTitle: "" });
            assert.deepEqual(resolveScopeSelection(DISCOVERY, "outer > nope"), { suiteTitle: "", testTitle: "" });
        });

        it("should honour the picked kind when a title names both a suite and a test", () => {
            assert.deepEqual(resolveScopeSelection(AMBIGUOUS, "A > B", "suite"), { suiteTitle: "A > B", testTitle: "" });
            assert.deepEqual(resolveScopeSelection(AMBIGUOUS, "A > B", "test"), { suiteTitle: "", testTitle: "A > B" });
        });

        it("should prefer the test when an ambiguous title was typed rather than picked", () => {
            assert.deepEqual(resolveScopeSelection(AMBIGUOUS, "A > B"), { suiteTitle: "", testTitle: "A > B" });
        });

        it("should ignore a kind the title cannot be", () => {
            // A stale hint (the value was edited after a pick) must never win over what the
            // discovery actually says the title is.
            assert.deepEqual(resolveScopeSelection(DISCOVERY, "outer", "test"), { suiteTitle: "outer", testTitle: "" });
            assert.deepEqual(resolveScopeSelection(DISCOVERY, "outer > alpha", "suite"), { suiteTitle: "", testTitle: "outer > alpha" });
        });
    });

    describe("isCompleteScopeValue", () => {
        it("should be true only for an exact suite or test title", () => {
            assert.isTrue(isCompleteScopeValue(DISCOVERY, "outer"));
            assert.isTrue(isCompleteScopeValue(DISCOVERY, "outer > alpha"));
            assert.isFalse(isCompleteScopeValue(DISCOVERY, "out"));
            assert.isFalse(isCompleteScopeValue(DISCOVERY, ""));
            assert.isFalse(isCompleteScopeValue(undefined, "outer"));
        });
    });

    describe("scopeValueFromSelection / scopeKindFromSelection", () => {
        it("should describe no selection as an empty box", () => {
            assert.equal(scopeValueFromSelection(null), "");
            assert.equal(scopeKindFromSelection(null), "");
            assert.equal(scopeValueFromSelection({ suiteTitle: "", testTitle: "" }), "");
            assert.equal(scopeKindFromSelection({ suiteTitle: "", testTitle: "" }), "");
        });

        it("should show whichever half is set", () => {
            assert.equal(scopeValueFromSelection({ suiteTitle: "outer", testTitle: "" }), "outer");
            assert.equal(scopeKindFromSelection({ suiteTitle: "outer", testTitle: "" }), "suite");
            assert.equal(scopeValueFromSelection({ suiteTitle: "", testTitle: "outer > alpha" }), "outer > alpha");
            assert.equal(scopeKindFromSelection({ suiteTitle: "", testTitle: "outer > alpha" }), "test");
        });

        it("should show the test when an older URL hash carried both", () => {
            // Two boxes could record a suite *and* a test; the filter has always honoured the
            // test, so that is what the one box shows.
            const both = { suiteTitle: "other", testTitle: "outer > alpha" };

            assert.equal(scopeValueFromSelection(both), "outer > alpha");
            assert.equal(scopeKindFromSelection(both), "test");
        });

        it("should round-trip every selection back through resolveScopeSelection", () => {
            const selections = [
                { suiteTitle: "", testTitle: "" },
                { suiteTitle: "outer", testTitle: "" },
                { suiteTitle: "outer > inner", testTitle: "" },
                { suiteTitle: "", testTitle: "outer > inner > gamma" }
            ];

            for (let lp = 0; lp < selections.length; lp++) {
                const selection = selections[lp];
                const resolved = resolveScopeSelection(DISCOVERY, scopeValueFromSelection(selection), scopeKindFromSelection(selection));

                assert.deepEqual(resolved, selection, "selection " + lp + " did not survive the round trip");
            }
        });

        it("should round-trip an ambiguous title too, which is what the recorded kind is for", () => {
            const suiteScope = { suiteTitle: "A > B", testTitle: "" };
            const resolved = resolveScopeSelection(AMBIGUOUS, scopeValueFromSelection(suiteScope), scopeKindFromSelection(suiteScope));

            assert.deepEqual(resolved, suiteScope);
        });
    });
});
