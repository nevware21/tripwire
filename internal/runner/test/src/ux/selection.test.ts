/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "@nevware21/tripwire";
import { AUTOCOMPLETE_KIND_ATTR } from "../../../src/ux/browser/ui/autocomplete";
import { ALL_SCOPE_LABEL } from "../../../src/shared/scopeOptions";

/**
 * The half of the Scope picker that reads and writes the live input element. The searching and
 * ranking it builds on is `src/shared/scopeOptions.ts`, tested on its own; what is pinned here is
 * the glue: that the "all" row carries no badge, that a picked kind is written next to the value
 * and read back with it (so a title naming both a suite and a test resolves to the one that was
 * picked), and that restoring a selection that no longer exists leaves the picker blank.
 */

/**
 * `./dom` looks every element it exports up from `document` once, as it loads, and node has no
 * `document`. This hands it the smallest stand-in that lets it load -- one plain object per id,
 * created on demand -- and takes `document` away again straight afterwards so nothing else in the
 * process can mistake this for a browser. The objects live in a registry on `globalThis` because
 * `./dom` loads once per process, for whichever test file gets there first: every file that needs
 * them has to read the same objects back, whoever created them.
 */
function _uxDom(): { [id: string]: any } {
    const g = globalThis as any;
    const registry = g.__tripwireUxDomStub || (g.__tripwireUxDomStub = {});
    const hadDocument = !!g.document;

    if (!hadDocument) {
        g.document = {
            body: null,
            getElementById: (id: string) => registry[id] || (registry[id] = _stubElement(id))
        };
    }

    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require("../../../src/ux/browser/ui/dom");
    } finally {
        if (!hadDocument) {
            delete g.document;
        }
    }

    return registry;
}

/** A plain object with the handful of element members the ui modules under test touch. */
function _stubElement(id: string): any {
    const attrs: { [name: string]: string } = {};
    const classes: string[] = [];
    let text = "";
    const el: any = {
        id: id,
        value: "",
        checked: false,
        disabled: false,
        style: {},
        attrs: attrs,
        kids: [] as any[],
        setAttribute: (name: string, value: any) => {
            attrs[name] = String(value);
        },
        getAttribute: (name: string) => (name in attrs ? attrs[name] : null),
        removeAttribute: (name: string) => {
            delete attrs[name];
        },
        classList: {
            add: (cls: string) => {
                if (classes.indexOf(cls) === -1) {
                    classes.push(cls);
                }
            },
            remove: (cls: string) => {
                const idx = classes.indexOf(cls);
                if (idx !== -1) {
                    classes.splice(idx, 1);
                }
            },
            contains: (cls: string) => classes.indexOf(cls) !== -1
        },
        appendChild: (child: any) => {
            el.kids.push.apply(el.kids, child && child.fragment ? child.kids : [child]);
        },
        removeChild: (child: any) => {
            el.kids.splice(el.kids.indexOf(child), 1);
        }
    };

    Object.defineProperty(el, "textContent", {
        get: () => text,
        set: (value: string) => {
            text = value;
            el.kids.length = 0;
        }
    });
    Object.defineProperty(el, "childElementCount", { get: () => el.kids.length });
    Object.defineProperty(el, "firstElementChild", { get: () => el.kids[0] || null });

    return el;
}

const dom = _uxDom();
// eslint-disable-next-line @typescript-eslint/no-var-requires
const selection: typeof import("../../../src/ux/browser/ui/selection") = require("../../../src/ux/browser/ui/selection");

/** `describe("outer", { it("alpha"), describe("inner", { it("gamma") }) }), describe("other", { it("delta") })` */
const DISCOVERY = {
    suites: ["other", "outer", "outer > inner"],
    tests: [
        { suiteTitle: "other", testName: "delta", fullTitle: "other > delta" },
        { suiteTitle: "outer", testName: "alpha", fullTitle: "outer > alpha" },
        { suiteTitle: "outer > inner", testName: "gamma", fullTitle: "outer > inner > gamma" }
    ]
};

/** `describe("A", () => { it("B"); describe("B", () => { it("c") }) })`: the test and the nested suite share the title "A > B". */
const AMBIGUOUS = {
    suites: ["A", "A > B"],
    tests: [
        { suiteTitle: "A", testName: "B", fullTitle: "A > B" },
        { suiteTitle: "A > B", testName: "c", fullTitle: "A > B > c" }
    ]
};

function _picker(): { value: string; kind: string | null } {
    return { value: dom.scopeSelect.value, kind: dom.scopeSelect.getAttribute(AUTOCOMPLETE_KIND_ATTR) };
}

describe("ux selection", () => {

    beforeEach(() => {
        dom.scopeSelect.value = "";
        dom.scopeSelect.removeAttribute(AUTOCOMPLETE_KIND_ATTR);
    });

    describe("getScopeCandidates", () => {
        it("should list the all row, then suites, then tests, each badged with its kind", () => {
            const items = selection.getScopeCandidates(DISCOVERY, "");

            assert.deepEqual(items.map((item) => item.kind + ":" + item.value), [
                ":", "suite:other", "suite:outer", "suite:outer > inner",
                "test:other > delta", "test:outer > alpha", "test:outer > inner > gamma"
            ]);
            assert.equal(items[0].label, ALL_SCOPE_LABEL);
        });

        it("should give the all row no badge, so picking it records no kind", () => {
            const all = selection.getScopeCandidates(DISCOVERY, "")[0];
            assert.strictEqual(all.value, "");
            assert.strictEqual(all.kind, "", "an empty kind, not undefined: createAutocomplete tests it for truthiness either way");
        });

        it("should narrow to the rows matching the query", () => {
            const items = selection.getScopeCandidates(DISCOVERY, "inner");
            assert.deepEqual(items.map((item) => item.kind + ":" + item.value), ["suite:outer > inner", "test:outer > inner > gamma"]);
        });

        it("should hand back an empty list for a query nothing matches", () => {
            assert.deepEqual(selection.getScopeCandidates(DISCOVERY, "nothing like this"), []);
        });
    });

    describe("setUiSelection", () => {
        it("should write the suite title and record that it is a suite", () => {
            selection.setUiSelection({ suiteTitle: "outer", testTitle: "" });
            assert.deepEqual(_picker(), { value: "outer", kind: "suite" });
        });

        it("should write the test title and record that it is a test", () => {
            selection.setUiSelection({ suiteTitle: "outer", testTitle: "outer > alpha" });
            assert.deepEqual(_picker(), { value: "outer > alpha", kind: "test" }, "a test wins over the suite it sits in");
        });

        it("should blank the picker and forget the kind for no selection", () => {
            selection.setUiSelection({ suiteTitle: "outer", testTitle: "" });
            selection.setUiSelection(null);
            assert.deepEqual(_picker(), { value: "", kind: null });

            selection.setUiSelection({ suiteTitle: "outer", testTitle: "" });
            selection.setUiSelection({ suiteTitle: "", testTitle: "" });
            assert.deepEqual(_picker(), { value: "", kind: null });
        });
    });

    describe("getSelectionFromUi", () => {
        it("should resolve the picker's value against the discovery", () => {
            dom.scopeSelect.value = "outer > inner";
            assert.deepEqual(selection.getSelectionFromUi(DISCOVERY), { suiteTitle: "outer > inner", testTitle: "" });

            dom.scopeSelect.value = "other > delta";
            assert.deepEqual(selection.getSelectionFromUi(DISCOVERY), { suiteTitle: "", testTitle: "other > delta" });
        });

        it("should mean everything for a blank or unknown value", () => {
            assert.deepEqual(selection.getSelectionFromUi(DISCOVERY), { suiteTitle: "", testTitle: "" });

            dom.scopeSelect.value = "typed but not a title";
            assert.deepEqual(selection.getSelectionFromUi(DISCOVERY), { suiteTitle: "", testTitle: "" });
        });

        it("should use the recorded kind to break a tie between a suite and a test with the same title", () => {
            dom.scopeSelect.value = "A > B";
            dom.scopeSelect.setAttribute(AUTOCOMPLETE_KIND_ATTR, "suite");
            assert.deepEqual(selection.getSelectionFromUi(AMBIGUOUS), { suiteTitle: "A > B", testTitle: "" });

            dom.scopeSelect.setAttribute(AUTOCOMPLETE_KIND_ATTR, "test");
            assert.deepEqual(selection.getSelectionFromUi(AMBIGUOUS), { suiteTitle: "", testTitle: "A > B" });

            dom.scopeSelect.removeAttribute(AUTOCOMPLETE_KIND_ATTR);
            assert.deepEqual(selection.getSelectionFromUi(AMBIGUOUS), { suiteTitle: "", testTitle: "A > B" }, "typed by hand, the narrower reading wins");
        });

        it("should read back exactly what setUiSelection wrote, ambiguous titles included", () => {
            const selections = [
                { suiteTitle: "outer", testTitle: "" },
                { suiteTitle: "", testTitle: "outer > inner > gamma" },
                { suiteTitle: "", testTitle: "" }
            ];
            for (let lp = 0; lp < selections.length; lp++) {
                selection.setUiSelection(selections[lp]);
                assert.deepEqual(selection.getSelectionFromUi(DISCOVERY), selections[lp], JSON.stringify(selections[lp]));
            }

            selection.setUiSelection({ suiteTitle: "A > B", testTitle: "" });
            assert.deepEqual(selection.getSelectionFromUi(AMBIGUOUS), { suiteTitle: "A > B", testTitle: "" });
        });
    });

    describe("populateAndRestoreSelection", () => {
        it("should restore a selection that still exists", () => {
            selection.populateAndRestoreSelection(DISCOVERY, { suiteTitle: "outer > inner", testTitle: "" });
            assert.deepEqual(_picker(), { value: "outer > inner", kind: "suite" });

            selection.populateAndRestoreSelection(DISCOVERY, { suiteTitle: "", testTitle: "other > delta" });
            assert.deepEqual(_picker(), { value: "other > delta", kind: "test" });
        });

        it("should leave the picker alone when the selection no longer exists", () => {
            // The edit that triggered the reload may have renamed or removed the very suite that
            // was scoped to; restoring it would run nothing.
            selection.populateAndRestoreSelection(DISCOVERY, { suiteTitle: "renamed since", testTitle: "" });
            assert.deepEqual(_picker(), { value: "", kind: null });
        });

        it("should leave the picker alone for no prior selection", () => {
            dom.scopeSelect.value = "typed so far";
            selection.populateAndRestoreSelection(DISCOVERY, null);
            assert.equal(dom.scopeSelect.value, "typed so far");
        });

        it("should keep the picked kind of an ambiguous title across the restore", () => {
            selection.populateAndRestoreSelection(AMBIGUOUS, { suiteTitle: "A > B", testTitle: "" });
            assert.deepEqual(_picker(), { value: "A > B", kind: "suite" });

            selection.populateAndRestoreSelection(AMBIGUOUS, { suiteTitle: "", testTitle: "A > B" });
            assert.deepEqual(_picker(), { value: "A > B", kind: "test" });
        });
    });
});
