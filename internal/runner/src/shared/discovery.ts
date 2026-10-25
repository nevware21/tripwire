/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

/**
 * Walks a built suite tree into the flat suite/test lists the interactive UI's Scope picker is
 * populated from.
 *
 * This lives in `src/shared/` rather than beside the picker itself because both targets
 * that can produce a discovery need it and neither can reach the other's copy: the browser
 * target builds it inside the test frame (`ux/browser/ui/frame-mode.ts`) and the worker target
 * builds it inside the Worker (`client/workerRunner.ts`), which has no DOM and cannot import
 * anything under `ux/`. It previously sat in `ux/browser/ui/selection.ts` next to the functions
 * that *consume* a discovery, which import `./dom` -- so the worker had no way to call it, and
 * simply reported an empty discovery instead. That is what left the worker target's picker
 * permanently showing "No matches".
 *
 * Same dependency rules as the rest of `src/shared/`: no node builtins, nothing from `../ux`,
 * and no barrel -- importers name this file directly.
 */

import { isRootSuiteName } from "./suiteNames";

/**
 * One entry per test in the built tree, pre-joined into the exact strings the Scope picker
 * lists and matches against, so neither the UI nor the URL-hash resolver has to re-derive them.
 */
export interface IDiscoveredTest {
    /** The owning suite's full " > "-joined title; empty for a test directly on the root. */
    suiteTitle: string;
    /** The test's own description, unqualified. */
    testName: string;
    /** `suiteTitle` and `testName` joined -- what the Scope picker displays and filters on. */
    fullTitle: string;
}

/**
 * The flat form of a built suite tree: every suite title, and every test in it.
 */
export interface IRunDiscovery {
    suites: string[];
    tests: IDiscoveredTest[];
}

/**
 * The "nothing discovered" value. Used wherever a discovery is structurally required but was
 * deliberately not built (headless runs, which have no picker to populate) or could not be
 * (a failure during discovery) -- callers index `.suites`/`.tests` unconditionally, so this
 * must never be null.
 */
export function createEmptyDiscovery(): IRunDiscovery {
    return { suites: [], tests: [] };
}

/**
 * Flattens `rootSuite` into sorted, de-duplicated suite titles and their tests. The synthetic
 * root suite contributes no title part (see `isRootSuiteName`), so a test declared outside any
 * `describe` gets an empty `suiteTitle` and its bare description as `fullTitle`.
 */
export function collectSuiteAndTests(rootSuite: any): IRunDiscovery {
    var suites: string[] = [];
    var tests: IDiscoveredTest[] = [];
    var suiteMap: { [key: string]: boolean } = {};

    function visit(suite: any, parentParts: any[]) {
        var parts = parentParts.slice(0);
        if (suite && suite.description && !isRootSuiteName(suite.description)) {
            parts.push(suite.description);
        }

        var suiteTitle = parts.join(" > ");
        if (suiteTitle && !suiteMap[suiteTitle]) {
            suiteMap[suiteTitle] = true;
            suites.push(suiteTitle);
        }

        var suiteTests = suite && suite.tests ? suite.tests : [];
        for (var i = 0; i < suiteTests.length; i++) {
            var test = suiteTests[i];
            var testName = test && test.description ? test.description : "(unnamed test)";
            var fullTitle = suiteTitle ? (suiteTitle + " > " + testName) : testName;
            tests.push({ suiteTitle: suiteTitle, testName: testName, fullTitle: fullTitle });
        }

        var children = suite && suite.suites ? suite.suites : [];
        for (var c = 0; c < children.length; c++) {
            visit(children[c], parts);
        }
    }

    visit(rootSuite, []);

    suites.sort();
    tests.sort(function(a, b) {
        return a.fullTitle < b.fullTitle ? -1 : (a.fullTitle > b.fullTitle ? 1 : 0);
    });

    return { suites: suites, tests: tests };
}
