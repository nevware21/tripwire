/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

/**
 * The `--grep`/`--invert` and interactive suite/test-selection filters, shared by all three
 * targets. See `./suiteNames.ts` for why `src/shared/` is safe for the worker bundle to
 * import from.
 *
 * The node CLI holds real `RegExp` objects (it parsed them from argv itself); the browser and
 * worker receive them over the wire as `{ source, flags }` pairs on the run settings. Both
 * land on the same `createGrepFilter` so the matching rules -- including which parts of the
 * title are joined, and that the synthetic root suite name is not one of them -- cannot
 * differ by target.
 */

import { arrForEach } from "@nevware21/ts-utils";
import { getSuitePartsFromNode, makeGrepTitle } from "./suiteNames";

export interface IRunnerFilter {
    canRunTest(test: any, parent: any): boolean;
    /**
     * Whether the suite should run at all. Every filter here derives it from `canRunTest` via
     * {@link _pruneEmptySuites}: a suite none of whose descendants can run is skipped outright.
     */
    canRunSuite?(suite: any): boolean;
}

function _testDescription(test: any): string {
    return test && test.description ? test.description : "";
}

/**
 * Whether the `>`-joined `suiteTitle` is `selectedSuite` itself or lies anywhere beneath it --
 * ie. whether selecting `selectedSuite` runs that suite's tests.
 */
export function isSuiteOrDescendant(suiteTitle: string, selectedSuite: string): boolean {
    return suiteTitle === selectedSuite || suiteTitle.indexOf(selectedSuite + " > ") === 0;
}

function _hasRunnableTest(filter: IRunnerFilter, suite: any): boolean {
    const tests: any[] = (suite && suite.tests) || [];
    for (let lp = 0; lp < tests.length; lp++) {
        if (filter.canRunTest(tests[lp], suite)) {
            return true;
        }
    }

    const suites: any[] = (suite && suite.suites) || [];
    for (let lp = 0; lp < suites.length; lp++) {
        if (_hasRunnableTest(filter, suites[lp])) {
            return true;
        }
    }

    return false;
}

/**
 * Gives a test-level filter the matching suite-level rule: a suite whose subtree holds no test
 * the filter lets through is skipped entirely.
 *
 * The runner only consults `canRunTest` when it reaches each test. A filter that defines
 * nothing else therefore still *enters* every suite -- emitting its `Suite` start/end events
 * and running its `before`/`after` hooks -- and merely skips the `it` bodies inside. For an
 * interactive selection of one suite or one test that meant the whole tree still lit up in the
 * results panel and every unrelated `before` hook (often the expensive part) still ran, which
 * looked exactly like the selection being ignored. Pruning at the suite boundary is also what
 * Mocha does for `--grep`: a suite with no matching tests never runs its hooks.
 *
 * The root is never pruned: it carries the run itself, and a filter matching nothing must still
 * produce a run that reports zero tests rather than no run at all.
 */
function _pruneEmptySuites(filter: IRunnerFilter): IRunnerFilter {
    filter.canRunSuite = (suite: any): boolean => {
        if (!suite || !suite.parent) {
            return true;
        }

        return _hasRunnableTest(filter, suite);
    };

    return filter;
}

/**
 * Matches a test when any pattern matches its full space-joined title, inverted when
 * `invert` is set. Returns `null` when there is nothing to filter on, so callers can pass the
 * result straight to {@link applyFilters}.
 */
export function createGrepFilter(patterns: RegExp[], invert: boolean): IRunnerFilter | null {
    if (!patterns || !patterns.length) {
        return null;
    }

    return _pruneEmptySuites({
        canRunTest(test: any, parent: any): boolean {
            const fullTitle = makeGrepTitle(getSuitePartsFromNode(parent), _testDescription(test));
            let matched = false;

            arrForEach(patterns, (pattern) => {
                if (pattern.test(fullTitle)) {
                    matched = true;
                    return -1; // break
                }
            });

            return invert ? !matched : matched;
        }
    });
}

/**
 * The browser/worker form of {@link createGrepFilter}: rebuilds each `RegExp` from the
 * `{ source, flags }` pairs the run payload carries (a `RegExp` cannot survive
 * `postMessage`/JSON on its own).
 */
export function createSettingsGrepFilter(settings: any): IRunnerFilter | null {
    if (!settings || !settings.grep || !settings.grep.length) {
        return null;
    }

    const patterns = (settings.grep as any[]).map((value: any) => {
        // eslint-disable-next-line security/detect-non-literal-regexp
        return new RegExp(value.source, value.flags || "");
    });

    return createGrepFilter(patterns, !!settings.invert);
}

/**
 * Restricts a run to one suite or one test, as chosen in the interactive browser UI (or
 * replayed from the URL). Titles here are `>`-joined, matching what the UI displays and what
 * `urlState.ts` round-trips.
 *
 * A selected suite runs everything beneath it: its own tests and every nested suite's, exactly
 * as running that one `describe` on its own would. (It used to run only the suite's *direct*
 * tests, so picking a suite whose tests all sit in nested `describe` blocks -- the common shape
 * for a file-level suite -- ran nothing at all.) The selected suite's or test's ancestors still
 * run, since their `before`/`after` hooks are what the selection depends on. Everything else is
 * pruned at the suite boundary, see {@link _pruneEmptySuites}.
 */
export function createSelectionFilter(selection: any): IRunnerFilter | null {
    const selectedSuite = selection && selection.suiteTitle ? String(selection.suiteTitle) : "";
    const selectedTest = selection && selection.testTitle ? String(selection.testTitle) : "";

    if (!selectedSuite && !selectedTest) {
        return null;
    }

    return _pruneEmptySuites({
        canRunTest(test: any, parent: any): boolean {
            const parts = getSuitePartsFromNode(parent);
            const suiteTitle = parts.join(" > ");
            const testName = _testDescription(test);
            const fullTitle = suiteTitle ? (suiteTitle + " > " + testName) : testName;

            if (selectedTest) {
                return fullTitle === selectedTest;
            }

            if (selectedSuite) {
                return isSuiteOrDescendant(suiteTitle, selectedSuite);
            }

            return true;
        }
    });
}

/**
 * Adds every non-`null` filter to the runner, so callers can pass the results of the
 * `create*Filter` functions directly without null-checking each one.
 */
export function applyFilters(runner: any, filters: Array<IRunnerFilter | null>): void {
    arrForEach(filters, (filter) => {
        if (filter) {
            runner.addFilter(filter);
        }
    });
}
