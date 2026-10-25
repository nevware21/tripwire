/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "@nevware21/tripwire";
import { AUTOCOMPLETE_KIND_ATTR, createAutocomplete, IAutocompleteItem } from "../../../src/ux/browser/ui/autocomplete";

/**
 * The Scope picker's suggestion dropdown. Which rows match is decided by the caller's
 * `getCandidates` (see `src/shared/scopeOptions.ts` and its tests); what is pinned here is the
 * dropdown's own behaviour -- rendering, the row that is highlighted before any key is pressed,
 * the keyboard, and what committing a row leaves on the input.
 *
 * The module builds its rows through `document.createElement` and talks to the input and list
 * through a dozen element members, so the elements here are plain objects offering just those,
 * and `document` is a two-method stand-in installed for the duration of each test.
 */

const KIND = AUTOCOMPLETE_KIND_ATTR;

function _el(): any {
    const attrs: { [name: string]: string } = {};
    const classes: string[] = [];
    const listeners: { [type: string]: Array<(evt: any) => void> } = {};
    let text = "";
    const el: any = {
        className: "",
        value: "",
        kids: [] as any[],
        focused: 0,
        scrolledInto: 0,
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
            contains: (cls: string) => classes.indexOf(cls) !== -1,
            toggle: (cls: string, force: boolean) => {
                if (force) {
                    el.classList.add(cls);
                } else {
                    el.classList.remove(cls);
                }
            }
        },
        appendChild: (child: any) => {
            el.kids.push(child);
        },
        addEventListener: (type: string, fn: (evt: any) => void) => {
            (listeners[type] = listeners[type] || []).push(fn);
        },
        /** Delivers an event the way the browser would, to every listener for its type. */
        fire: (type: string, evt: any = { type: type }) => {
            const fns = listeners[type] || [];
            for (let lp = 0; lp < fns.length; lp++) {
                fns[lp](evt);
            }
        },
        dispatchEvent: (evt: any) => {
            el.fire(evt.type, evt);
            return true;
        },
        querySelectorAll: (selector: string) => el.kids.filter((kid: any) => (" " + kid.className + " ").indexOf(" " + selector.substring(1) + " ") !== -1),
        contains: (node: any) => node === el || el.kids.some((kid: any) => kid.contains(node)),
        scrollIntoView: () => {
            el.scrolledInto++;
        },
        focus: () => {
            el.focused++;
        }
    };

    Object.defineProperty(el, "textContent", {
        get: () => text,
        set: (value: string) => {
            text = value;
            el.kids.length = 0;
        }
    });

    return el;
}

const ITEMS: IAutocompleteItem[] = [
    { value: "", label: "All tests", kind: "" },
    { value: "outer", label: "outer", kind: "suite" },
    { value: "outer > alpha", label: "outer > alpha", kind: "test" },
    { value: "other", label: "other", kind: "suite" }
];

/** Rows whose label contains the query -- or every row once the query is exactly one of them, as the real picker does. */
function _matching(query: string): IAutocompleteItem[] {
    const complete = ITEMS.some((item) => !!item.value && item.value === query);

    return ITEMS.filter((item) => !query || complete || item.label.toLowerCase().indexOf(query.toLowerCase()) !== -1);
}

/** A wired-up input + list, with the gestures a user makes on them. */
function _setup(getCandidates: (query: string) => IAutocompleteItem[] = _matching) {
    const input = _el();
    const list = _el();
    const queries: string[] = [];
    const changes: any[] = [];
    input.addEventListener("change", (evt: any) => {
        changes.push(evt);
    });

    createAutocomplete(input, list, (query) => {
        queries.push(query);
        return getCandidates(query);
    });

    const rows = () => list.querySelectorAll(".autocomplete-item");
    const texts = (cls: string) => list.kids.filter((kid: any) => kid.className.split(" ").indexOf(cls) !== -1).map((kid: any) => kid.textContent);

    return {
        input: input,
        list: list,
        queries: queries,
        changes: changes,
        rows: rows,
        /** Each row as "label [kind]", with a "*" in front of the highlighted one. */
        view: () => rows().map((row: any) => (row.classList.contains("active") ? "*" : "") + row.kids.map((part: any) => part.textContent).join(" [") + (row.kids.length > 1 ? "]" : "")),
        notes: (cls: string) => texts(cls),
        isOpen: () => list.classList.contains("open"),
        focus: () => input.fire("focus"),
        type: (value: string) => {
            input.value = value;
            input.fire("input");
        },
        key: (key: string) => {
            const evt = { type: "keydown", key: key, defaultPrevented: false, preventDefault: (): void => undefined };
            evt.preventDefault = () => {
                evt.defaultPrevented = true;
            };
            input.fire("keydown", evt);
            return evt;
        }
    };
}

describe("ux autocomplete", () => {
    const g = globalThis as any;
    let documentClicks: Array<(evt: any) => void> = [];

    beforeEach(() => {
        documentClicks = [];
        g.document = {
            createElement: () => _el(),
            addEventListener: (type: string, fn: (evt: any) => void) => {
                assert.equal(type, "click");
                documentClicks.push(fn);
            }
        };
    });

    afterEach(() => {
        delete g.document;
    });

    it("should open on focus with a row per candidate, labelled and badged with its kind", () => {
        const ui = _setup();
        ui.focus();

        assert.isTrue(ui.isOpen());
        assert.deepEqual(ui.view(), ["*All tests", "outer [suite]", "outer > alpha [test]", "other [suite]"]);
        assert.deepEqual(ui.queries, [""], "asked for candidates for the current, empty, value");
        assert.equal(ui.rows()[0].getAttribute("role"), "option");
    });

    it("should say so when nothing matches", () => {
        const ui = _setup();
        ui.type("zzz");

        assert.isTrue(ui.isOpen());
        assert.deepEqual(ui.rows(), []);
        assert.deepEqual(ui.notes("autocomplete-empty"), ["No matches"]);
    });

    it("should cap the list at 50 rows and say how many more there are", () => {
        const many: IAutocompleteItem[] = [];
        for (let lp = 0; lp < 64; lp++) {
            many.push({ value: "t" + lp, label: "t" + lp, kind: "test" });
        }
        const ui = _setup(() => many);
        ui.focus();

        assert.equal(ui.rows().length, 50);
        assert.deepEqual(ui.notes("autocomplete-more"), ["14 more -- keep typing to narrow"]);
    });

    it("should highlight the top row before any key is pressed, so Enter alone commits something", () => {
        const ui = _setup();
        ui.type("out");

        assert.deepEqual(ui.view(), ["*outer [suite]", "outer > alpha [test]"]);
        assert.equal(ui.rows()[0].scrolledInto, 1, "and scrolls it into view");
    });

    it("should highlight the row holding the input's current value rather than the top one", () => {
        // Reopening the dropdown on a committed choice and pressing Enter must re-commit that
        // choice, not silently reset it to the "All tests" row at the top.
        const ui = _setup();
        ui.input.value = "outer > alpha";
        ui.focus();

        assert.deepEqual(ui.view(), ["All tests", "outer [suite]", "*outer > alpha [test]", "other [suite]"]);

        ui.key("Enter");
        assert.equal(ui.input.value, "outer > alpha");
        assert.equal(ui.input.getAttribute(KIND), "test");
    });

    it("should move the highlight with the arrow keys and stop at either end rather than wrap", () => {
        const ui = _setup();
        ui.focus();

        assert.isTrue(ui.key("ArrowDown").defaultPrevented, "the caret must not move");
        ui.key("ArrowDown");
        assert.deepEqual(ui.view(), ["All tests", "outer [suite]", "*outer > alpha [test]", "other [suite]"]);

        ui.key("ArrowDown");
        ui.key("ArrowDown");
        ui.key("ArrowDown");
        assert.deepEqual(ui.view(), ["All tests", "outer [suite]", "outer > alpha [test]", "*other [suite]"], "stays on the last row");

        for (let lp = 0; lp < 6; lp++) {
            ui.key("ArrowUp");
        }
        assert.deepEqual(ui.view(), ["*All tests", "outer [suite]", "outer > alpha [test]", "other [suite]"], "stays on the first row");
    });

    it("should commit the highlighted row on Enter: value, kind, a change event, closed, focus kept", () => {
        const ui = _setup();
        ui.type("out");
        ui.key("ArrowDown");

        const evt = ui.key("Enter");

        assert.isTrue(evt.defaultPrevented, "no form submission");
        assert.equal(ui.input.value, "outer > alpha");
        assert.equal(ui.input.getAttribute(KIND), "test");
        assert.equal(ui.changes.length, 1, "one change event, so existing change listeners keep working");
        assert.equal(ui.changes[0].type, "change");
        assert.isTrue(ui.changes[0].bubbles);
        assert.isFalse(ui.isOpen());
        assert.equal(ui.input.focused, 1);
        assert.deepEqual(ui.queries, ["out"], "committing does not re-query, which would reopen the list");
    });

    it("should leave no kind behind when the committed row has none", () => {
        const ui = _setup();
        ui.input.setAttribute(KIND, "suite");
        ui.focus();

        ui.key("Enter");

        assert.equal(ui.input.value, "", "the All tests row");
        assert.isNull(ui.input.getAttribute(KIND));
        assert.equal(ui.changes.length, 1);
    });

    it("should close on Enter when there is nothing to commit, leaving the value alone", () => {
        const ui = _setup();
        ui.type("zzz");

        const evt = ui.key("Enter");

        assert.isFalse(evt.defaultPrevented);
        assert.isFalse(ui.isOpen());
        assert.equal(ui.input.value, "zzz");
        assert.equal(ui.changes.length, 0);
    });

    it("should close on Escape without committing", () => {
        const ui = _setup();
        ui.type("out");
        ui.key("ArrowDown");

        ui.key("Escape");

        assert.isFalse(ui.isOpen());
        assert.equal(ui.input.value, "out");
        assert.equal(ui.changes.length, 0);
    });

    it("should forget the picked kind as soon as the value is typed over, and ask for fresh rows", () => {
        const ui = _setup();
        ui.type("out");
        ui.key("Enter");
        assert.equal(ui.input.getAttribute(KIND), "suite");

        ui.type("oute");

        assert.isNull(ui.input.getAttribute(KIND), "typed text is no longer the row that was picked");
        assert.isTrue(ui.isOpen());
        assert.deepEqual(ui.queries, ["out", "oute"]);
        assert.deepEqual(ui.view(), ["*outer [suite]", "outer > alpha [test]"]);
    });

    it("should commit a row on mousedown and keep the input from blurring", () => {
        const ui = _setup();
        ui.focus();
        const row = ui.rows()[3];
        let prevented = false;

        row.fire("mousedown", {
            type: "mousedown",
            preventDefault: () => {
                prevented = true;
            }
        });

        assert.isTrue(prevented, "the blur that would close the list before the click lands");
        assert.equal(ui.input.value, "other");
        assert.equal(ui.input.getAttribute(KIND), "suite");
        assert.isFalse(ui.isOpen());
        assert.equal(ui.changes.length, 1);
    });

    it("should close when the page is clicked anywhere but the input or the list", () => {
        const ui = _setup();
        ui.focus();
        assert.equal(documentClicks.length, 1);

        documentClicks[0]({ target: ui.input });
        assert.isTrue(ui.isOpen(), "clicking the input itself");

        documentClicks[0]({ target: ui.rows()[1] });
        assert.isTrue(ui.isOpen(), "clicking inside the list");

        documentClicks[0]({ target: _el() });
        assert.isFalse(ui.isOpen());
    });

    it("should ignore the keyboard while closed", () => {
        const ui = _setup();
        ui.input.value = "outer";

        assert.isFalse(ui.key("ArrowDown").defaultPrevented);
        assert.isFalse(ui.key("Enter").defaultPrevented);

        assert.equal(ui.input.value, "outer");
        assert.equal(ui.changes.length, 0);
        assert.deepEqual(ui.queries, [], "never even asked for candidates");
    });
});
