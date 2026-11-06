/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "@nevware21/tripwire";
import { BROWSER_THEME_WORDS, BROWSER_ZOOM_MAX, BROWSER_ZOOM_MIN, mergeBrowserThemes, parseBrowserTheme } from "../../../src/shared/browserTheme";

/**
 * How the interactive page opens, as `--browser-theme` and the config file's `browserTheme` say it:
 * a list of words, each naming one of three parts -- the color scheme, the color vision setting and
 * the zoom.
 */
describe("browserTheme", () => {
    describe("parseBrowserTheme", () => {
        it("should name each part by the words that belong to it", () => {
            assert.deepEqual(parseBrowserTheme("system"), { theme: { scheme: "system" } });
            assert.deepEqual(parseBrowserTheme("dim,standard,125%"), { theme: { scheme: "dim", vision: "standard", zoom: 125 } });
            assert.deepEqual(parseBrowserTheme([ "80%", "colorblind" ]), { theme: { zoom: 80, vision: "colorblind" } });
        });

        it("should take any whole percentage from the smallest zoom to the largest, and nothing outside", () => {
            assert.deepEqual([ BROWSER_ZOOM_MIN, BROWSER_ZOOM_MAX ], [ 50, 300 ]);
            assert.deepEqual(parseBrowserTheme("50%,"), { theme: { zoom: 50 } });
            assert.deepEqual(parseBrowserTheme("300%"), { theme: { zoom: 300 } });
            assert.deepEqual(parseBrowserTheme("133%"), { theme: { zoom: 133 } }, "not only the panel's steps");

            assert.equal(parseBrowserTheme("49%").error, "zoom \"49%\" is outside 50% to 300%");
            assert.equal(parseBrowserTheme("dark,301%").error, "zoom \"301%\" is outside 50% to 300%");
            assert.includes(parseBrowserTheme("125").error, "unknown word \"125\"", "a zoom says it is a percentage");
            assert.includes(parseBrowserTheme("12.5%").error, "unknown word \"12.5%\"", "a whole one");
        });

        it("should ignore case, spaces and empty entries, and the same word twice", () => {
            assert.deepEqual(parseBrowserTheme(" Dark ,, 150% , dark, 150%"), { theme: { scheme: "dark", zoom: 150 } });
            assert.deepEqual(parseBrowserTheme(""), { theme: {} });
        });

        it("should report a word it does not know, listing the ones it does", () => {
            const parsed = parseBrowserTheme("dark,sepia");

            assert.isUndefined(parsed.theme);
            assert.includes(parsed.error, "unknown word \"sepia\"");
            assert.includes(parsed.error, BROWSER_THEME_WORDS.join(", ") + ", or a zoom from 50% to 300%");
            assert.includes(parseBrowserTheme("constructor").error, "unknown word \"constructor\"", "not an inherited property");
        });

        it("should report two words for the same part", () => {
            assert.equal(parseBrowserTheme("light,dim").error, "\"light\" and \"dim\" are both a color scheme");
            assert.equal(parseBrowserTheme("standard,colorblind").error, "\"standard\" and \"colorblind\" are both a color vision setting");
            assert.equal(parseBrowserTheme("125%,150%").error, "\"125%\" and \"150%\" are both a zoom");
        });
    });

    describe("mergeBrowserThemes", () => {
        it("should take the override's parts, and the base's for the rest", () => {
            assert.deepEqual(mergeBrowserThemes({ scheme: "dark", vision: "colorblind" }, { scheme: "light", zoom: 125 }), { scheme: "light", vision: "colorblind", zoom: 125 });
        });

        it("should cope with either missing", () => {
            assert.deepEqual(mergeBrowserThemes(undefined, { scheme: "dim" }), { scheme: "dim" });
            assert.deepEqual(mergeBrowserThemes({ zoom: 80 }, undefined), { zoom: 80 });
        });
    });
});
