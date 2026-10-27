/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "@nevware21/tripwire";
import { clearAllState, suiteState, testState } from "../../../src/ux/browser/ui/state";
import { getSuiteKeyChain, makeSuiteKey, makeTestKey } from "../../../src/shared/suiteNames";
import { uxDom } from "../support/uxDom";

/**
 * The interactive page's "Failed only" view filter.
 *
 * Everything it does to the page goes through four element members -- `setAttribute`,
 * `removeAttribute`, `style.display` and `children.querySelector(...)` for exactly two selectors
 * -- so the tree under test is built from plain objects offering just those, with a counter on
 * `style.display` so a test can say not only *what* each node ended up as but *which* nodes were
 * touched to get there. That last part is the point of `updateFailedOnlyForTest`: the full sweep
 * used to run on every status change and, quadratic in the number of tests, blocked the main
 * thread long enough to fail the tests it was displaying (see CHANGELIST.md, "The live results
 * view no longer changes the result").
 */

const dom = uxDom();
// eslint-disable-next-line @typescript-eslint/no-var-requires
const filtering: typeof import("../../../src/ux/browser/ui/filtering") = require("../../../src/ux/browser/ui/filtering");

const HIDDEN_ATTR = "data-filter-hidden";

/**
 * A result-tree node: the `details` element of a suite or test, or a suite's `children`
 * container. `writes` counts assignments to `style.display`, which `_setNodeHidden` makes on
 * every node it touches, hidden or not.
 */
function _node(className: string): any {
    const attrs: { [name: string]: string } = {};
    let display = "";
    const node: any = {
        className: className,
        kids: [] as any[],
        writes: 0,
        style: {},
        setAttribute: (name: string, value: any) => {
            attrs[name] = String(value);
        },
        getAttribute: (name: string) => (name in attrs ? attrs[name] : null),
        removeAttribute: (name: string) => {
            delete attrs[name];
        },
        /** Only the two selectors the module uses: `.<class>:not([data-filter-hidden='1'])`. */
        querySelector: (selector: string) => {
            const cls = selector.substring(1, selector.indexOf(":"));
            assert.equal(selector, "." + cls + ":not([" + HIDDEN_ATTR + "='1'])", "a selector this stub understands");

            return _findDescendant(node, (candidate) => candidate.className === cls && candidate.getAttribute(HIDDEN_ATTR) !== "1");
        }
    };

    Object.defineProperty(node.style, "display", {
        get: () => display,
        set: (value: string) => {
            display = value;
            node.writes++;
        }
    });

    return node;
}

function _findDescendant(node: any, matches: (candidate: any) => boolean): any {
    for (let lp = 0; lp < node.kids.length; lp++) {
        const kid = node.kids[lp];
        if (matches(kid)) {
            return kid;
        }

        const nested = _findDescendant(kid, matches);
        if (nested) {
            return nested;
        }
    }

    return null;
}

const root = _node("results");

/** Registers the suite (and any missing ancestors) the way ui-rendering's `ensureSuiteNode` would. */
function addSuite(parts: string[]): any {
    const key = makeSuiteKey(parts);
    if (suiteState[key]) {
        return suiteState[key];
    }

    const parent = parts.length > 1 ? addSuite(parts.slice(0, -1)) : { children: root };
    const details = _node("suite-node");
    const children = _node("suite-children");
    details.kids.push(children);
    parent.children.kids.push(details);

    suiteState[key] = { key: key, parts: parts, details: details, children: children } as any;

    return suiteState[key];
}

function addTest(parts: string[], name: string, status: string): any {
    const suite = addSuite(parts);
    const details = _node("test-node");
    suite.children.kids.push(details);

    const key = makeTestKey(parts, name);
    testState[key] = { key: key, suiteKey: suite.key, suiteParts: parts, testName: name, status: status, details: details } as any;

    return testState[key];
}

function _isHidden(node: { details: any }): boolean {
    const byAttr = node.details.getAttribute(HIDDEN_ATTR) === "1";
    const byStyle = node.details.style.display === "none";
    assert.equal(byAttr, byStyle, "the attribute and the style always agree");

    return byAttr;
}

/** Every suite and test key, with "!" in front of the hidden ones. */
function _snapshot(): string[] {
    const result: string[] = [];
    const keys = Object.keys(suiteState).concat(Object.keys(testState)).sort();
    for (let lp = 0; lp < keys.length; lp++) {
        const node = suiteState[keys[lp]] || testState[keys[lp]];
        result.push((_isHidden(node) ? "!" : "") + keys[lp]);
    }

    return result;
}

/** The stub behind a state entry's `details`, which the shared types declare as a real element. */
function _details(node: { details: any }): any {
    return node.details;
}

function _resetWrites(): void {
    const keys = Object.keys(suiteState).concat(Object.keys(testState));
    for (let lp = 0; lp < keys.length; lp++) {
        _details(suiteState[keys[lp]] || testState[keys[lp]]).writes = 0;
    }
}

/** Which nodes have had `style.display` written since the last reset, by key. */
function _touched(): string[] {
    const result: string[] = [];
    const keys = Object.keys(suiteState).concat(Object.keys(testState)).sort();
    for (let lp = 0; lp < keys.length; lp++) {
        if (_details(suiteState[keys[lp]] || testState[keys[lp]]).writes > 0) {
            result.push(keys[lp]);
        }
    }

    return result;
}

function _setFilter(enabled: boolean): void {
    dom.failedOnlyToggle.checked = enabled;
}

/**
 * `describe("outer", { it("alpha"), describe("inner", { it("gamma") }) }), describe("other", { it("delta") })`
 * with every test passed unless said otherwise.
 */
function _buildTree(statuses: { [key: string]: string } = {}): void {
    const status = (key: string) => statuses[key] || "passed";
    addTest(["outer"], "alpha", status("alpha"));
    addTest(["outer", "inner"], "gamma", status("gamma"));
    addTest(["other"], "delta", status("delta"));
}

describe("ux filtering", () => {

    beforeEach(() => {
        clearAllState();
        root.kids.length = 0;
        _setFilter(false);
    });

    afterEach(() => {
        _setFilter(false);
    });

    describe("_isFailedOnlyEnabled", () => {
        it("should follow the checkbox", () => {
            assert.isFalse(filtering._isFailedOnlyEnabled());
            _setFilter(true);
            assert.isTrue(filtering._isFailedOnlyEnabled());
        });
    });

    describe("_shouldShowTestNode", () => {
        it("should show everything while the filter is off", () => {
            assert.isTrue(filtering._shouldShowTestNode({ status: "passed" }));
            assert.isTrue(filtering._shouldShowTestNode({ status: "pending" }));
            assert.isTrue(filtering._shouldShowTestNode(null));
        });

        it("should show only failed and still-running tests while it is on", () => {
            _setFilter(true);
            assert.isTrue(filtering._shouldShowTestNode({ status: "failed" }));
            assert.isTrue(filtering._shouldShowTestNode({ status: "running" }), "a running test may yet fail, and the user wants to watch it");
            assert.isFalse(filtering._shouldShowTestNode({ status: "passed" }));
            assert.isFalse(filtering._shouldShowTestNode({ status: "pending" }));
            assert.isNotOk(filtering._shouldShowTestNode(null), "falsy -- callers only ever negate it");
        });
    });

    describe("applyFailedOnlyFilter", () => {
        it("should hide passed tests and show failed ones, with the suites above a failure kept visible", () => {
            _buildTree({ gamma: "failed" });
            _setFilter(true);

            filtering.applyFailedOnlyFilter();

            assert.deepEqual(_snapshot(), [
                "!other",
                "!other :: delta",
                "outer",
                "!outer :: alpha",
                "outer > inner",
                "outer > inner :: gamma"
            ]);
        });

        it("should hide a suite whose only contents are suites that are themselves hidden", () => {
            // The suites are visited innermost-first for exactly this case: `outer` has nothing
            // visible of its own and must see `inner` already hidden when its turn comes, or it
            // stays visible as an empty expander.
            _buildTree({ delta: "failed" });
            _setFilter(true);

            filtering.applyFailedOnlyFilter();

            assert.isTrue(_isHidden(suiteState["outer > inner"]));
            assert.isTrue(_isHidden(suiteState["outer"]));
            assert.isFalse(_isHidden(suiteState["other"]));
        });

        it("should hide every suite when nothing failed", () => {
            _buildTree();
            _setFilter(true);

            filtering.applyFailedOnlyFilter();

            assert.deepEqual(_snapshot(), ["!other", "!other :: delta", "!outer", "!outer :: alpha", "!outer > inner", "!outer > inner :: gamma"]);
        });

        it("should keep a suite with a mix of passed and failed children visible", () => {
            addTest(["mixed"], "good", "passed");
            addTest(["mixed"], "bad", "failed");
            _setFilter(true);

            filtering.applyFailedOnlyFilter();

            assert.deepEqual(_snapshot(), ["mixed", "mixed :: bad", "!mixed :: good"]);
        });

        it("should put everything back when the filter is turned off", () => {
            _buildTree({ gamma: "failed" });
            _setFilter(true);
            filtering.applyFailedOnlyFilter();
            _setFilter(false);

            filtering.applyFailedOnlyFilter();

            assert.deepEqual(_snapshot(), ["other", "other :: delta", "outer", "outer :: alpha", "outer > inner", "outer > inner :: gamma"]);
            assert.strictEqual(testState["outer :: alpha"].details.style.display, "", "the inline display is cleared, not set to a value");
            assert.isNull(testState["outer :: alpha"].details.getAttribute(HIDDEN_ATTR), "the marker attribute is removed");
        });

        it("should give the same answer however many times it is toggled", () => {
            _buildTree({ gamma: "failed" });
            _setFilter(true);
            filtering.applyFailedOnlyFilter();
            const once = _snapshot();

            _setFilter(false);
            filtering.applyFailedOnlyFilter();
            _setFilter(true);
            filtering.applyFailedOnlyFilter();
            filtering.applyFailedOnlyFilter();

            assert.deepEqual(_snapshot(), once);
        });

        it("should skip state entries that have no element yet", () => {
            _buildTree();
            testState["ghost :: t"] = { key: "ghost :: t", status: "failed" } as any;
            suiteState["ghost"] = { key: "ghost", parts: ["ghost"] } as any;
            _setFilter(true);

            filtering.applyFailedOnlyFilter();
        });
    });

    describe("updateFailedOnlyForTest", () => {
        it("should do nothing at all while the filter is off", () => {
            _buildTree();
            const node = testState["outer > inner :: gamma"];
            node.status = "failed";
            _resetWrites();

            filtering.updateFailedOnlyForTest(node);

            assert.deepEqual(_touched(), [], "nothing is hidden while the filter is off, so there is nothing to write");
        });

        it("should reveal a test that fails together with the suites above it, and touch nothing else", () => {
            _buildTree();
            _setFilter(true);
            filtering.applyFailedOnlyFilter();
            assert.deepEqual(_snapshot(), ["!other", "!other :: delta", "!outer", "!outer :: alpha", "!outer > inner", "!outer > inner :: gamma"]);

            const node = testState["outer > inner :: gamma"];
            node.status = "failed";
            _resetWrites();

            filtering.updateFailedOnlyForTest(node);

            assert.deepEqual(_snapshot(), ["!other", "!other :: delta", "outer", "!outer :: alpha", "outer > inner", "outer > inner :: gamma"]);
            assert.deepEqual(_touched(), ["outer", "outer > inner", "outer > inner :: gamma"], "the test and its ancestor chain, nothing beside them");
            assert.equal(_details(node).writes, 1, "and each of them exactly once");
        });

        it("should hide a test that passes and the suites it leaves empty, and touch nothing else", () => {
            _buildTree({ gamma: "failed", delta: "failed" });
            _setFilter(true);
            filtering.applyFailedOnlyFilter();

            const node = testState["outer > inner :: gamma"];
            node.status = "passed";
            _resetWrites();

            filtering.updateFailedOnlyForTest(node);

            assert.deepEqual(_snapshot(), ["other", "other :: delta", "!outer", "!outer :: alpha", "!outer > inner", "!outer > inner :: gamma"]);
            assert.deepEqual(_touched(), ["outer", "outer > inner", "outer > inner :: gamma"]);
        });

        it("should leave a suite visible while a sibling of the passing test is still failing", () => {
            addTest(["mixed"], "good", "running");
            addTest(["mixed"], "bad", "failed");
            _setFilter(true);
            filtering.applyFailedOnlyFilter();
            assert.deepEqual(_snapshot(), ["mixed", "mixed :: bad", "mixed :: good"]);

            const good = testState["mixed :: good"];
            good.status = "passed";
            filtering.updateFailedOnlyForTest(good);

            assert.deepEqual(_snapshot(), ["mixed", "mixed :: bad", "!mixed :: good"]);
        });

        it("should show a test while it runs and hide it again once it passes", () => {
            _buildTree();
            _setFilter(true);
            filtering.applyFailedOnlyFilter();

            const node = testState["outer :: alpha"];
            node.status = "running";
            filtering.updateFailedOnlyForTest(node);
            assert.isFalse(_isHidden(node));
            assert.isFalse(_isHidden(suiteState["outer"]));

            node.status = "passed";
            filtering.updateFailedOnlyForTest(node);
            assert.isTrue(_isHidden(node));
            assert.isTrue(_isHidden(suiteState["outer"]));
        });

        it("should walk the chain innermost-first so an emptied inner suite is seen by its parent", () => {
            // outer has a test of its own that is failing, so only the inner suite empties.
            _buildTree({ alpha: "failed", gamma: "failed" });
            _setFilter(true);
            filtering.applyFailedOnlyFilter();

            const node = testState["outer > inner :: gamma"];
            node.status = "passed";
            filtering.updateFailedOnlyForTest(node);

            assert.isTrue(_isHidden(suiteState["outer > inner"]));
            assert.isFalse(_isHidden(suiteState["outer"]), "still has its own failure");

            // And once that one passes too, the parent goes with it.
            const alpha = testState["outer :: alpha"];
            alpha.status = "passed";
            filtering.updateFailedOnlyForTest(alpha);
            assert.isTrue(_isHidden(suiteState["outer"]));
        });

        it("should file a test outside any describe under the default suite", () => {
            addTest([], "loose", "failed");
            _setFilter(true);
            filtering.applyFailedOnlyFilter();

            const node = testState[makeTestKey([], "loose")];
            assert.deepEqual(getSuiteKeyChain(node.suiteParts), ["(default suite)"]);
            assert.isFalse(_isHidden(suiteState["(default suite)"]));

            node.status = "passed";
            filtering.updateFailedOnlyForTest(node);

            assert.isTrue(_isHidden(node));
            assert.isTrue(_isHidden(suiteState["(default suite)"]));
        });

        it("should tolerate a node with no element, or none at all", () => {
            _setFilter(true);
            filtering.updateFailedOnlyForTest(null);
            filtering.updateFailedOnlyForTest({ status: "failed" });
            filtering.updateFailedOnlyForTest({ status: "failed", details: _node("test-node"), suiteParts: ["not", "registered"] });
        });

        it("should arrive at exactly what a full sweep would, one test at a time", () => {
            // The incremental path replaced the sweep; the two must never disagree, or the view
            // would depend on whether the filter was on while the run happened.
            const statuses: { [key: string]: string } = {};
            const names = ["a", "b", "c", "d"];
            const suites: string[][] = [["s1"], ["s1", "s1a"], ["s1", "s1b", "deep"], ["s2"], []];
            let seed = 7;
            for (let sp = 0; sp < suites.length; sp++) {
                for (let np = 0; np < names.length; np++) {
                    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
                    const pick = ["passed", "passed", "failed", "running", "pending"][seed % 5];
                    addTest(suites[sp], names[np], pick);
                    statuses[makeTestKey(suites[sp], names[np])] = pick;
                }
            }

            _setFilter(true);
            const testKeys = Object.keys(testState);
            for (let lp = 0; lp < testKeys.length; lp++) {
                filtering.updateFailedOnlyForTest(testState[testKeys[lp]]);
            }
            const incremental = _snapshot();

            filtering.applyFailedOnlyFilter();

            assert.deepEqual(incremental, _snapshot());
            assert.isTrue(incremental.some((entry) => entry.charAt(0) === "!"), "the sample hid something");
            assert.isTrue(incremental.some((entry) => entry.charAt(0) !== "!"), "and showed something");
        });
    });
});
