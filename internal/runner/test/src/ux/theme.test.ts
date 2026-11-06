/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "@nevware21/tripwire";
import { BROWSER_ZOOM_MAX, BROWSER_ZOOM_MIN } from "../../../src/shared/browserTheme";
import {
    applyPageSetting, findTheme, fitLayout, readPageSetting, readRunSetting, readThemeChoice, readZoom, searchThemes, stepZoom, THEME_STORAGE_KEY,
    THEMES, VISION_STORAGE_KEY, ZOOM_LEVELS, ZOOM_STORAGE_KEY
} from "../../../src/ux/browser/ui/theme";
import { useStubDocument } from "../support/uxDom";

/**
 * The page's settings -- its theme, color vision and zoom: what each sets on the page, the choice
 * kept in this browser's local storage, and the run's --browser-theme underneath. Storage is a plain
 * object here -- or one that throws, as a browser blocking it does -- and `window` only its size.
 */
describe("ux theme", () => {
    const g = globalThis as any;
    let restoreDocument: () => void;
    let doc: any;
    let orgStorage: PropertyDescriptor | undefined;
    let orgWindow: PropertyDescriptor | undefined;
    let saved: { [key: string]: string };

    function useStorage(storage: any): void {
        Object.defineProperty(g, "localStorage", { configurable: true, writable: true, value: storage });
    }

    function plainStorage(): any {
        return {
            getItem: (key: string) => (key in saved ? saved[key] : null),
            setItem: (key: string, value: string) => {
                saved[key] = String(value);
            },
            removeItem: (key: string) => {
                delete saved[key];
            }
        };
    }

    function blockedStorage(): any {
        const blocked = () => {
            throw new Error("The operation is insecure");
        };

        return { getItem: blocked, setItem: blocked, removeItem: blocked };
    }

    function useWindow(width: number, height: number): void {
        Object.defineProperty(g, "window", { configurable: true, writable: true, value: { innerWidth: width, innerHeight: height } });
    }

    function restore(name: string, descriptor: PropertyDescriptor | undefined): void {
        if (descriptor) {
            Object.defineProperty(g, name, descriptor);
        } else {
            delete g[name];
        }
    }

    function zoomProperty(): string {
        return doc.body.style.getPropertyValue("--ui-zoom");
    }

    beforeEach(() => {
        const installed = useStubDocument();
        doc = installed.document;
        restoreDocument = installed.restore;
        orgStorage = Object.getOwnPropertyDescriptor(g, "localStorage");
        orgWindow = Object.getOwnPropertyDescriptor(g, "window");
        saved = {};
        useStorage(plainStorage());
    });

    afterEach(() => {
        restoreDocument();
        restore("localStorage", orgStorage);
        restore("window", orgWindow);
    });

    it("shares its storage keys with the page's inline script", () => {
        assert.deepEqual([ THEME_STORAGE_KEY, VISION_STORAGE_KEY, ZOOM_STORAGE_KEY ], [ "tripwire.theme", "tripwire.vision", "tripwire.zoom" ]);
    });

    describe("the themes", () => {
        it("lists System first, then each theme by a unique id the --browser-theme words share", () => {
            assert.deepEqual(THEMES.map((theme) => theme.id), [ "system", "light", "dark", "dim" ]);
            assert.deepEqual(THEMES.map((theme) => theme.name), [ "System", "Light", "Dark", "Low light" ]);
            assert.equal(findTheme("dim"), THEMES[3]);
            assert.isNull(findTheme("sepia"));
            assert.isNull(findTheme("constructor"), "not an inherited property");
        });

        it("finds the ones with every searched word in their name, id or keywords, in any order and ignoring case", () => {
            const names = (query: string) => searchThemes(query).map((theme) => theme.name);

            assert.deepEqual(names(""), [ "System", "Light", "Dark", "Low light" ], "nothing searched finds them all");
            assert.deepEqual(names("LIGHT"), [ "Light", "Low light" ]);
            assert.deepEqual(names("light low"), [ "Low light" ]);
            assert.deepEqual(names("dim"), [ "Low light" ], "by its id");
            assert.deepEqual(names("warm"), [ "Low light" ], "by a keyword");
            assert.deepEqual(names("sepia"), []);
        });
    });

    describe("the theme", () => {
        it("reads the saved choice", () => {
            saved[THEME_STORAGE_KEY] = "dark";
            assert.equal(readThemeChoice(), "dark");
        });

        it("follows the system without a choice, with one it does not know, or when storage is blocked", () => {
            assert.equal(readThemeChoice(), "system");

            saved[THEME_STORAGE_KEY] = "sepia";
            assert.equal(readThemeChoice(), "system");

            useStorage(blockedStorage());
            assert.equal(readThemeChoice(), "system");

            delete g.localStorage;
            assert.equal(readThemeChoice(), "system", "no storage at all");
        });

        it("sets the body's theme and remembers it", () => {
            assert.isTrue(applyPageSetting("theme", "dark", true));

            assert.equal(doc.body.getAttribute("data-theme"), "dark");
            assert.equal(saved[THEME_STORAGE_KEY], "dark");
        });

        it("goes back to the system setting by taking the attribute and the saved choice away", () => {
            applyPageSetting("theme", "light", true);

            applyPageSetting("theme", "system", true);

            assert.isFalse(doc.body.hasAttribute("data-theme"));
            assert.isFalse(THEME_STORAGE_KEY in saved);
        });

        it("only remembers the choice when asked to", () => {
            applyPageSetting("theme", "dark", false);

            assert.equal(doc.body.getAttribute("data-theme"), "dark");
            assert.deepEqual(saved, {});
        });

        it("changes nothing for a theme it does not have", () => {
            applyPageSetting("theme", "dark", true);

            assert.isFalse(applyPageSetting("theme", "sepia", true));
            assert.equal(doc.body.getAttribute("data-theme"), "dark");
            assert.equal(saved[THEME_STORAGE_KEY], "dark");
        });

        it("still applies the choice when it cannot be remembered, or there is no page", () => {
            useStorage(blockedStorage());
            applyPageSetting("theme", "light", true);
            assert.equal(doc.body.getAttribute("data-theme"), "light");

            delete g.localStorage;
            applyPageSetting("theme", "dark", true);
            assert.equal(doc.body.getAttribute("data-theme"), "dark");

            restoreDocument();
            restoreDocument = () => undefined;
            assert.isTrue(applyPageSetting("theme", "dark", false));
        });
    });

    describe("color vision", () => {
        it("turns the color-blind palette on and off, on the body", () => {
            applyPageSetting("vision", "colorblind", true);
            assert.equal(doc.body.getAttribute("data-vision"), "colorblind");
            assert.equal(saved[VISION_STORAGE_KEY], "colorblind");

            applyPageSetting("vision", "standard", true);
            assert.isFalse(doc.body.hasAttribute("data-vision"));
            assert.isFalse(VISION_STORAGE_KEY in saved);
        });
    });

    describe("the zoom", () => {
        it("sets the body's --ui-zoom as a scale, which only the page's own controls follow", () => {
            applyPageSetting("zoom", "125", true);
            assert.equal(zoomProperty(), "1.25");
            assert.equal(saved[ZOOM_STORAGE_KEY], "125");
            assert.equal(readZoom(), 125);
            assert.isFalse(doc.documentElement.hasAttribute("data-font-size"), "never the root's size, which a test's content shares");

            applyPageSetting("zoom", "100", true);
            assert.equal(zoomProperty(), "", "100% needs nothing set");
            assert.isFalse(ZOOM_STORAGE_KEY in saved);
            assert.equal(readZoom(), 100);
        });

        it("takes a whole percentage from the smallest zoom to the largest, and nothing else", () => {
            assert.deepEqual([ ZOOM_LEVELS[0], ZOOM_LEVELS[ZOOM_LEVELS.length - 1] ], [ BROWSER_ZOOM_MIN, BROWSER_ZOOM_MAX ], "the same range as --browser-theme");

            [ "50", "133", "300" ].forEach((value) => {
                assert.isTrue(applyPageSetting("zoom", value, false), value);
            });
            [ "49", "301", "12.5", "125%", "", "abc" ].forEach((value) => {
                assert.isFalse(applyPageSetting("zoom", value, true), value);
            });
            assert.equal(zoomProperty(), "3");
            assert.deepEqual(saved, {});

            saved[ZOOM_STORAGE_KEY] = "999";
            assert.equal(readZoom(), 100, "a kept value out of range is no choice");
        });

        it("steps between the zoom levels, from a zoom between two of them to the next, and stops at either end", () => {
            assert.equal(stepZoom(100, 1), 110);
            assert.equal(stepZoom(100, -1), 90);
            assert.equal(stepZoom(133, 1), 150);
            assert.equal(stepZoom(133, -1), 125);
            assert.equal(stepZoom(300, 1), 300);
            assert.equal(stepZoom(50, -1), 50);
        });
    });

    describe("the run's --browser-theme", () => {
        it("starts each setting as the run set it, unless this browser kept a choice", () => {
            doc.body.setAttribute("data-default-theme", "dark");
            doc.body.setAttribute("data-default-vision", "colorblind");
            doc.body.setAttribute("data-default-zoom", "150");
            assert.deepEqual([ readPageSetting("theme"), readPageSetting("vision"), readPageSetting("zoom") ], [ "dark", "colorblind", "150" ]);
            assert.equal(readRunSetting("zoom"), "150");

            saved[THEME_STORAGE_KEY] = "light";
            saved[ZOOM_STORAGE_KEY] = "80";
            assert.deepEqual([ readPageSetting("theme"), readPageSetting("vision"), readPageSetting("zoom") ], [ "light", "colorblind", "80" ]);
            assert.equal(readRunSetting("zoom"), "150", "what the run set, whatever this browser kept");

            doc.body.setAttribute("data-default-theme", "sepia");
            delete saved[THEME_STORAGE_KEY];
            assert.equal(readThemeChoice(), "system", "a value it does not know is no default");
        });

        it("keeps a choice only while it differs from the run's, so choosing the run's goes back to following it", () => {
            doc.body.setAttribute("data-default-theme", "dark");
            doc.body.setAttribute("data-default-zoom", "150");

            applyPageSetting("theme", "system", true);
            assert.equal(saved[THEME_STORAGE_KEY], "system", "System over the run's Dark has to be kept");
            assert.isFalse(doc.body.hasAttribute("data-theme"));

            applyPageSetting("theme", "dark", true);
            assert.isFalse(THEME_STORAGE_KEY in saved);
            assert.equal(doc.body.getAttribute("data-theme"), "dark");

            applyPageSetting("zoom", "100", true);
            assert.equal(saved[ZOOM_STORAGE_KEY], "100", "100% over the run's 150% has to be kept");
            applyPageSetting("zoom", "150", true);
            assert.isFalse(ZOOM_STORAGE_KEY in saved);
        });
    });

    describe("fitLayout", () => {
        function layout(): string[] {
            return [ "layout-narrow", "layout-short" ].filter((cls) => doc.body.classList.contains(cls));
        }

        it("takes the compact layout while the window is small for the page at its zoom", () => {
            useWindow(1200, 720);
            fitLayout();
            assert.deepEqual(layout(), [], "a desktop window at 100%");

            applyPageSetting("zoom", "125", false);
            assert.deepEqual(layout(), [], "960 by 576 of the page's pixels");

            applyPageSetting("zoom", "200", false);
            assert.deepEqual(layout(), [ "layout-narrow", "layout-short" ], "600 by 360: a zoom fits the layout straight away");

            applyPageSetting("zoom", "100", false);
            useWindow(390, 760);
            fitLayout();
            assert.deepEqual(layout(), [ "layout-narrow" ], "a phone at 100%");

            useWindow(1200, 480);
            fitLayout();
            assert.deepEqual(layout(), [ "layout-short" ], "a short window");
        });

        it("does nothing without a window or a page", () => {
            delete g.window;
            fitLayout();
            assert.deepEqual(layout(), []);

            useWindow(300, 300);
            restoreDocument();
            restoreDocument = () => undefined;
            fitLayout();
        });
    });
});
