/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "@nevware21/tripwire";
import { stubElement, uxDom } from "../support/uxDom";

// The module reads the page's elements from ./dom as it loads, which needs the stand-in document first
const dom = uxDom();
// eslint-disable-next-line @typescript-eslint/no-var-requires
const overflow: typeof import("../../../src/ux/browser/ui/overflow") = require("../../../src/ux/browser/ui/overflow");
const { _rowWraps, createToolbarOverflow, fitToolbar, foldCheckbox, foldSelect, initToolbarOverflow } = overflow;

/**
 * Folding the page's controls into the actions menu when the window is too narrow for their row.
 * The rows here are stand-in elements laid out the way a wrapping flex row is -- each control on the
 * line it fits on, a new line when it does not -- from widths the tests choose, so a row's width
 * decides what has to fold just as the window's does.
 */
describe("ux overflow", () => {
    const GAP = 8;
    const HEIGHT = 34;

    /** A row of controls `widths` wide, laid out across `width`, which the test can change. */
    function flexRow(width: number, widths: number[]) {
        const row = stubElement("row", "div");
        let rowWidth = width;
        const kids = widths.map((_w, idx) => {
            const kid = stubElement("control" + idx, "div");
            row.appendChild(kid);
            return kid;
        });

        const shown = (idx: number) => !kids[idx].classList.contains("is-folded");

        /** Each control's line, counting only the ones still on the row. */
        function lines(): number[] {
            const found: number[] = [];
            let x = 0;
            let line = 0;
            widths.forEach((w, idx) => {
                if (!shown(idx)) {
                    return;
                }

                if (x > 0 && x + w > rowWidth) {
                    line++;
                    x = 0;
                }

                found[idx] = line;
                x += w + GAP;
            });

            return found;
        }

        kids.forEach((kid, idx) => {
            Object.defineProperty(kid, "offsetWidth", { get: () => (shown(idx) ? widths[idx] : 0) });
            Object.defineProperty(kid, "offsetHeight", { get: () => (shown(idx) ? HEIGHT : 0) });
            Object.defineProperty(kid, "offsetTop", { get: () => (lines()[idx] || 0) * (HEIGHT + GAP) });
        });

        return {
            row: row,
            kids: kids,
            setWidth: (value: number) => {
                rowWidth = value;
            }
        };
    }

    function entry(control: any) {
        const standIn = stubElement("", "button");
        standIn.setAttribute("hidden", "");
        let synced = 0;

        return {
            control: control,
            standIn: standIn,
            sync: () => {
                synced++;
            },
            synced: () => synced
        };
    }

    function folded(...entries: any[]): boolean[] {
        return entries.map((item) => item.control.classList.contains("is-folded"));
    }

    function standInsShown(...entries: any[]): boolean[] {
        return entries.map((item) => !item.standIn.hasAttribute("hidden"));
    }

    describe("_rowWraps", () => {
        it("should tell a row on one line from one that has wrapped onto another", () => {
            const flex = flexRow(500, [ 200, 100, 100 ]);
            assert.isFalse(_rowWraps(flex.row));

            flex.setWidth(400);
            assert.isTrue(_rowWraps(flex.row));
        });

        it("should not count controls that are not showing, and never wrap with fewer than two", () => {
            const flex = flexRow(250, [ 200, 100 ]);
            assert.isTrue(_rowWraps(flex.row));

            flex.kids[1].classList.add("is-folded");
            assert.isFalse(_rowWraps(flex.row));
        });
    });

    describe("createToolbarOverflow", () => {
        // A scope box, Failed only, Auto-reload, Run and the menu button: 725 wide on one line
        const WIDTHS = [ 320, 118, 127, 94, 34 ];

        it("should fold the least needed first, only as many as the row needs, and unfold them as it widens", () => {
            const flex = flexRow(1000, WIDTHS);
            const wrapper = stubElement("folded", "div");
            const failedOnly = entry(flex.kids[1]);
            const autoReload = entry(flex.kids[2]);
            const overflow = createToolbarOverflow([ { row: flex.row, entries: [ autoReload, failedOnly ] } ], wrapper);

            overflow.fit();
            assert.deepEqual(folded(autoReload, failedOnly), [ false, false ], "room for everything");
            assert.deepEqual(standInsShown(autoReload, failedOnly), [ false, false ]);
            assert.isTrue(wrapper.hasAttribute("hidden"), "nothing folded, nothing to show in the menu");

            flex.setWidth(700);
            overflow.fit();
            assert.deepEqual(folded(autoReload, failedOnly), [ true, false ], "one is enough");
            assert.deepEqual(standInsShown(autoReload, failedOnly), [ true, false ]);
            assert.isFalse(wrapper.hasAttribute("hidden"));
            assert.isFalse(_rowWraps(flex.row));

            flex.setWidth(560);
            overflow.fit();
            assert.deepEqual(folded(autoReload, failedOnly), [ true, true ]);
            assert.deepEqual(standInsShown(autoReload, failedOnly), [ true, true ]);

            flex.setWidth(400);
            overflow.fit();
            assert.deepEqual(folded(autoReload, failedOnly), [ true, true ], "folding no more than there is, though the row still wraps");

            flex.setWidth(1000);
            overflow.fit();
            assert.deepEqual(folded(autoReload, failedOnly), [ false, false ], "all back as the window widens");
            assert.isTrue(wrapper.hasAttribute("hidden"));
            assert.equal(autoReload.synced(), 5, "each fit shows the controls' state on their stand-ins");
        });

        it("should fit each row on its own, showing the menu's part while any of them is folded", () => {
            const header = flexRow(400, [ 250, 140 ]);
            const toolbar = flexRow(1000, WIDTHS);
            const target = entry(header.kids[1]);
            const autoReload = entry(toolbar.kids[2]);
            const overflow = createToolbarOverflow([
                { row: header.row, entries: [ target ] },
                { row: toolbar.row, entries: [ autoReload ] }
            ], null);

            overflow.fit();
            assert.deepEqual(folded(target, autoReload), [ false, false ]);

            header.setWidth(380);
            overflow.fit();
            assert.deepEqual(folded(target, autoReload), [ true, false ], "only the row that is too narrow folds");
        });
    });

    describe("foldCheckbox", () => {
        it("should show the checkbox's state, and toggle it as a click would when chosen", () => {
            const control = stubElement("control", "label");
            const input = stubElement("toggle", "input");
            const item = stubElement("item", "button");
            const changes: boolean[] = [];
            input.addEventListener("change", () => changes.push(input.checked));

            const folding = foldCheckbox(control, input, item);
            assert.equal(folding.control, control);
            assert.equal(folding.standIn, item);

            folding.sync();
            assert.equal(item.getAttribute("aria-checked"), "false");

            item.click();
            assert.isTrue(input.checked);
            assert.deepEqual(changes, [ true ], "the checkbox's own change fires");
            assert.equal(item.getAttribute("aria-checked"), "true");

            input.checked = false;
            input.dispatchEvent({ type: "change" });
            assert.equal(item.getAttribute("aria-checked"), "false", "a change made on the checkbox shows too");
        });
    });

    describe("foldSelect", () => {
        function picker() {
            const control = stubElement("control", "div");
            const select = stubElement("select", "select");
            select.value = "browser";
            const group = stubElement("group", "div");
            const label = stubElement("label", "div");
            group.appendChild(label);
            const items = [ "browser", "worker" ].map((choice) => {
                const item = stubElement("", "button");
                item.setAttribute("data-target-choice", choice);
                group.appendChild(item);
                return item;
            });
            const changes: string[] = [];
            select.addEventListener("change", () => changes.push(select.value));

            return { control: control, select: select, group: group, items: items, changes: changes, folding: foldSelect(control, select, group, "data-target-choice") };
        }

        it("should check the select's value, and set it to another when that is chosen", () => {
            const ui = picker();
            assert.equal(ui.folding.standIn, ui.group);

            ui.folding.sync();
            assert.deepEqual(ui.items.map((item: any) => item.getAttribute("aria-checked")), [ "true", "false" ]);
            assert.deepEqual(ui.items.map((item: any) => item.getAttribute("aria-disabled")), [ "false", "false" ]);

            ui.items[0].click();
            assert.deepEqual(ui.changes, [], "the current value is no change");

            ui.items[1].click();
            assert.equal(ui.select.value, "worker");
            assert.deepEqual(ui.changes, [ "worker" ], "the select's own change fires");
        });

        it("should be disabled while the select is", () => {
            const ui = picker();
            ui.select.disabled = true;

            ui.folding.sync();
            ui.items[1].click();

            assert.deepEqual(ui.items.map((item: any) => item.getAttribute("aria-disabled")), [ "true", "true" ]);
            assert.equal(ui.select.value, "browser");
            assert.deepEqual(ui.changes, []);
        });
    });

    describe("initToolbarOverflow", () => {
        const g = globalThis as any;
        let saved: { [name: string]: any };

        beforeEach(() => {
            saved = { window: g.window, requestAnimationFrame: g.requestAnimationFrame };
        });

        afterEach(() => {
            Object.keys(saved).forEach((name) => {
                if (saved[name] === undefined) {
                    delete g[name];
                } else {
                    g[name] = saved[name];
                }
            });
        });

        it("should fit the page's rows now and again once per frame as the window is resized", () => {
            const listeners: { [type: string]: () => void } = {};
            const frames: Array<() => void> = [];
            g.window = {
                addEventListener: (type: string, fn: () => void) => {
                    listeners[type] = fn;
                }
            };
            g.requestAnimationFrame = (cb: () => void) => {
                frames.push(cb);
                return frames.length;
            };
            dom.failedOnlyToggle.checked = false;

            initToolbarOverflow();
            assert.equal(dom.failedOnlyItem.getAttribute("aria-checked"), "false", "the stand-in starts in step");
            assert.isTrue(dom.foldedControls.hasAttribute("hidden"), "the page's stand-in elements have no layout, so nothing folds");

            listeners.resize();
            listeners.resize();
            assert.equal(frames.length, 1, "one fit for a burst of resizes");

            dom.failedOnlyToggle.checked = true;
            frames[0]();
            assert.equal(dom.failedOnlyItem.getAttribute("aria-checked"), "true", "the fit shows the state again");

            listeners.resize();
            assert.equal(frames.length, 2, "and the next resize asks for another frame");
            fitToolbar();
        });
    });
});
