/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "@nevware21/tripwire";
import { createAppearancePanel, IAppearancePanel, themeCandidates } from "../../../src/ux/browser/ui/appearance";
import { THEME_STORAGE_KEY, VISION_STORAGE_KEY, ZOOM_STORAGE_KEY } from "../../../src/ux/browser/ui/theme";
import { stubElement, stubEvent, useStubDocument } from "../support/uxDom";

/**
 * The Appearance panel the actions menu opens: a searchable theme combobox, the color-blind toggle and
 * the zoom, as stand-in elements arranged as runner.html arranges them. Storage is a plain object.
 */
describe("ux appearance", () => {
    const g = globalThis as any;
    let restoreDocument: () => void;
    let doc: any;
    let orgStorage: PropertyDescriptor | undefined;
    let saved: { [key: string]: string };

    interface IPage {
        item: any;
        button: any;
        panel: any;
        themeInput: any;
        themeList: any;
        colorblindToggle: any;
        zoomOut: any;
        zoomIn: any;
        zoomReset: any;
        zoomValue: any;
        outside: any;
        fits: number;
        appearance: IAppearancePanel;
    }

    function setup(): IPage {
        const page: any = {
            item: stubElement("appearanceItem", "button"),
            button: stubElement("actionsBtn", "button"),
            panel: stubElement("appearancePanel", "div"),
            themeInput: stubElement("themeInput", "input"),
            themeList: stubElement("themeList", "div"),
            colorblindToggle: stubElement("colorblindToggle", "input"),
            zoomOut: stubElement("zoomOutBtn", "button"),
            zoomIn: stubElement("zoomInBtn", "button"),
            zoomReset: stubElement("zoomResetBtn", "button"),
            zoomValue: stubElement("zoomValue", "output"),
            outside: stubElement("results", "div"),
            fits: 0
        };
        page.panel.setAttribute("hidden", "");
        [ "themeInput", "themeList", "colorblindToggle", "zoomOut", "zoomValue", "zoomIn", "zoomReset" ].forEach((name) => {
            page.panel.appendChild(page[name]);
        });

        page.appearance = createAppearancePanel({
            item: page.item,
            button: page.button,
            panel: page.panel,
            themeInput: page.themeInput,
            themeList: page.themeList,
            colorblindToggle: page.colorblindToggle,
            zoomOut: page.zoomOut,
            zoomIn: page.zoomIn,
            zoomReset: page.zoomReset,
            zoomValue: page.zoomValue,
            onZoom: () => {
                page.fits++;
            }
        });

        return page;
    }

    function tick(): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, 0));
    }

    function key(el: any, name: string): any {
        const evt = stubEvent("keydown", { key: name });
        el.dispatchEvent(evt);

        return evt;
    }

    function type(input: any, value: string): void {
        input.value = value;
        input.dispatchEvent(stubEvent("input"));
    }

    /** The theme list's rows, with a "*" in front of the highlighted one, or [] while it is closed. */
    function rows(page: IPage): string[] {
        if (!page.themeList.classList.contains("open")) {
            return [];
        }

        return page.themeList.querySelectorAll(".autocomplete-item").map((row: any) => {
            const text = (row.kids[0].textContent || "") + row.kids[0].kids.map((part: any) => part.textContent).join("");
            return (row.classList.contains("active") ? "*" : "") + text;
        });
    }

    beforeEach(() => {
        const installed = useStubDocument();
        doc = installed.document;
        restoreDocument = installed.restore;
        orgStorage = Object.getOwnPropertyDescriptor(g, "localStorage");
        saved = {};
        Object.defineProperty(g, "localStorage", {
            configurable: true,
            writable: true,
            value: {
                getItem: (name: string) => (name in saved ? saved[name] : null),
                setItem: (name: string, value: string) => {
                    saved[name] = String(value);
                },
                removeItem: (name: string) => {
                    delete saved[name];
                }
            }
        });
    });

    afterEach(() => {
        restoreDocument();
        if (orgStorage) {
            Object.defineProperty(g, "localStorage", orgStorage);
        } else {
            delete g.localStorage;
        }
    });

    it("shows each setting as the page has it, and applies it to the page", () => {
        saved[THEME_STORAGE_KEY] = "dark";
        saved[VISION_STORAGE_KEY] = "colorblind";
        saved[ZOOM_STORAGE_KEY] = "125";

        const page = setup();

        assert.equal(page.themeInput.value, "Dark");
        assert.isTrue(page.colorblindToggle.checked);
        assert.equal(page.zoomValue.textContent, "125%");
        assert.equal(doc.body.getAttribute("data-theme"), "dark");
        assert.equal(doc.body.getAttribute("data-vision"), "colorblind");
        assert.equal(doc.body.style.getPropertyValue("--ui-zoom"), "1.25");
        assert.equal(page.zoomReset.getAttribute("aria-disabled"), "false", "there is a zoom to go back from");
        assert.equal(page.zoomReset.getAttribute("title"), "Back to 100%");
    });

    it("opens from its menu entry once the menu has closed, with focus on the theme and its list still closed", async () => {
        const page = setup();

        page.item.click();
        assert.isTrue(page.panel.hasAttribute("hidden"), "not while the menu is still handling the click");

        await tick();
        assert.isTrue(page.appearance.isOpen());
        assert.equal(doc.activeElement, page.themeInput);
        assert.equal(page.item.getAttribute("aria-expanded"), "true");
        assert.notEqual(page.themeInput.getAttribute("aria-expanded"), "true", "the list waits to be asked for");
        assert.deepEqual(rows(page), []);
    });

    it("lists every theme on ArrowDown with the current one highlighted, and searches them as letters are typed", () => {
        const page = setup();
        page.appearance.open();

        key(page.themeInput, "ArrowDown");
        assert.deepEqual(rows(page), [ "*System", "Light", "Dark", "Low light" ]);
        assert.equal(page.themeInput.getAttribute("aria-expanded"), "true");

        type(page.themeInput, "light");
        assert.deepEqual(rows(page), [ "*Light", "Low light" ]);

        type(page.themeInput, "warm");
        assert.deepEqual(rows(page), [ "*Low light" ], "by a keyword too");
    });

    it("applies and keeps the theme picked from the list, and Escape closes the list before the panel", () => {
        const page = setup();
        page.appearance.open();

        type(page.themeInput, "lo");
        key(page.themeInput, "Enter");

        assert.equal(doc.body.getAttribute("data-theme"), "dim");
        assert.equal(saved[THEME_STORAGE_KEY], "dim");
        assert.equal(page.themeInput.value, "Low light");
        assert.deepEqual(rows(page), [], "the list closes");
        assert.isTrue(page.appearance.isOpen(), "the panel stays open");

        key(page.themeInput, "ArrowDown");
        assert.deepEqual(rows(page), [ "System", "Light", "Dark", "*Low light" ], "reopened on the whole choice, the current one highlighted");
        const escape = key(page.themeInput, "Escape");
        assert.deepEqual(rows(page), []);
        assert.isTrue(page.appearance.isOpen(), "the first Escape only closes the list");
        assert.isFalse(escape.defaultPrevented);

        key(page.themeInput, "Escape");
        assert.isFalse(page.appearance.isOpen(), "the second closes the panel");
        assert.equal(doc.activeElement, page.button, "and puts focus back on the menu button");
        assert.equal(page.item.getAttribute("aria-expanded"), "false");
    });

    it("lists every theme while the box holds the current one's name, and the search's otherwise", () => {
        setup();

        assert.deepEqual(themeCandidates("System").map((row) => row.label), [ "System", "Light", "Dark", "Low light" ]);
        assert.deepEqual(themeCandidates("").map((row) => row.value), [ "System", "Light", "Dark", "Low light" ]);
        assert.deepEqual(themeCandidates("dar").map((row) => row.value), [ "Dark" ]);
    });

    it("applies a theme typed out in full by name or id, and puts anything else back", () => {
        const page = setup();

        page.themeInput.value = "dark";
        page.themeInput.dispatchEvent(stubEvent("change"));
        assert.equal(doc.body.getAttribute("data-theme"), "dark");
        assert.equal(page.themeInput.value, "Dark");

        page.themeInput.value = "  low LIGHT ";
        page.themeInput.dispatchEvent(stubEvent("change"));
        assert.equal(doc.body.getAttribute("data-theme"), "dim");

        page.themeInput.value = "neon";
        page.themeInput.dispatchEvent(stubEvent("change"));
        assert.equal(doc.body.getAttribute("data-theme"), "dim", "unchanged");
        assert.equal(page.themeInput.value, "Low light", "and the box shows the theme in use again");
    });

    it("turns the color-blind palette on and off from its checkbox", () => {
        const page = setup();
        assert.isFalse(page.colorblindToggle.checked);

        page.colorblindToggle.checked = true;
        page.colorblindToggle.dispatchEvent(stubEvent("change"));
        assert.equal(doc.body.getAttribute("data-vision"), "colorblind");
        assert.equal(saved[VISION_STORAGE_KEY], "colorblind");

        page.colorblindToggle.checked = false;
        page.colorblindToggle.dispatchEvent(stubEvent("change"));
        assert.isFalse(doc.body.hasAttribute("data-vision"));
        assert.isFalse(VISION_STORAGE_KEY in saved);
    });

    it("zooms in and out a step at a time, keeps it, and refits the page each time", () => {
        const page = setup();
        assert.equal(page.zoomValue.textContent, "100%");
        assert.equal(page.zoomReset.getAttribute("aria-disabled"), "true", "nothing to reset");

        page.zoomIn.click();
        assert.equal(page.zoomValue.textContent, "110%");
        assert.equal(doc.body.style.getPropertyValue("--ui-zoom"), "1.1");
        assert.equal(saved[ZOOM_STORAGE_KEY], "110");
        assert.equal(page.fits, 1);
        assert.equal(page.zoomReset.getAttribute("aria-disabled"), "false");

        page.zoomOut.click();
        page.zoomOut.click();
        assert.equal(page.zoomValue.textContent, "90%");

        page.zoomReset.click();
        assert.equal(page.zoomValue.textContent, "100%");
        assert.isFalse(ZOOM_STORAGE_KEY in saved, "back at the run's zoom, nothing is kept");
        assert.equal(page.fits, 4);
    });

    it("stops at either end with the button still focusable, but doing nothing", () => {
        saved[ZOOM_STORAGE_KEY] = "50";
        const page = setup();
        assert.equal(page.zoomOut.getAttribute("aria-disabled"), "true");
        assert.isFalse(page.zoomOut.disabled, "never natively disabled, which would drop a keyboard's focus");

        page.zoomOut.click();
        assert.equal(page.zoomValue.textContent, "50%");
        assert.equal(page.fits, 0);

        page.zoomReset.click();
        saved[ZOOM_STORAGE_KEY] = "250";
        page.zoomIn.click();
        assert.equal(page.zoomValue.textContent, "300%");
        assert.equal(page.zoomIn.getAttribute("aria-disabled"), "true");
        page.zoomIn.click();
        assert.equal(page.zoomValue.textContent, "300%");
    });

    it("steps on from a zoom the run set between two steps, and resets to the run's", () => {
        doc.body.setAttribute("data-default-zoom", "133");
        const page = setup();
        assert.equal(page.zoomValue.textContent, "133%");
        assert.equal(page.zoomReset.getAttribute("aria-disabled"), "true");
        assert.equal(page.zoomReset.getAttribute("title"), "Back to 133%");

        page.zoomIn.click();
        assert.equal(page.zoomValue.textContent, "150%");

        page.zoomReset.click();
        assert.equal(page.zoomValue.textContent, "133%");
        assert.isFalse(ZOOM_STORAGE_KEY in saved);
    });

    it("closes on a click outside it, but not on one inside it", () => {
        const page = setup();
        page.appearance.open();

        page.zoomIn.click();
        assert.isTrue(page.appearance.isOpen());

        page.outside.click();
        assert.isFalse(page.appearance.isOpen());
        assert.equal(doc.activeElement, page.themeInput, "focus is left where the click put it, not moved back");
    });

    it("closes when focus leaves it, not while focus moves within it", async () => {
        const page = setup();
        page.appearance.open();

        page.zoomIn.focus();
        page.panel.dispatchEvent(stubEvent("focusout"));
        await tick();
        assert.isTrue(page.appearance.isOpen());

        page.outside.focus();
        page.panel.dispatchEvent(stubEvent("focusout"));
        await tick();
        assert.isFalse(page.appearance.isOpen());
    });

    it("closes its list and forgets an unfinished search when it closes", () => {
        saved[THEME_STORAGE_KEY] = "light";
        const page = setup();
        page.appearance.open();

        type(page.themeInput, "da");
        assert.deepEqual(rows(page), [ "*Dark" ]);

        page.appearance.close(false);
        assert.deepEqual(rows(page), []);
        assert.equal(page.themeInput.value, "Light");
        assert.equal(doc.body.getAttribute("data-theme"), "light");
    });

    it("copes with a page that has no panel", () => {
        const appearance = createAppearancePanel({
            item: null, button: null, panel: null, themeInput: null, themeList: null, colorblindToggle: null,
            zoomOut: null, zoomIn: null, zoomReset: null, zoomValue: null
        });

        appearance.open();
        appearance.close(true);
        assert.isFalse(appearance.isOpen());
    });
});
