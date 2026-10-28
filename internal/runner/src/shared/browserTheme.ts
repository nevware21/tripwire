/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IBrowserUiTheme } from "../ux/types/BrowserUiTheme";

/** The smallest and largest zoom the interactive page takes, as a whole percentage. */
export const BROWSER_ZOOM_MIN = 50;
export const BROWSER_ZOOM_MAX = 300;

/** Which part of the theme each word names. */
const _PARTS: { [word: string]: { part: keyof IBrowserUiTheme, value: string } } = {
    "system": { part: "scheme", value: "system" },
    "light": { part: "scheme", value: "light" },
    "dark": { part: "scheme", value: "dark" },
    "dim": { part: "scheme", value: "dim" },
    "standard": { part: "vision", value: "standard" },
    "colorblind": { part: "vision", value: "colorblind" }
};

const _PART_NAMES: { [part: string]: string } = {
    scheme: "color scheme",
    vision: "color vision setting",
    zoom: "zoom"
};

const _ZOOM = /^(\d+)%$/;

/** Every word a browser theme can be made of, besides a zoom, for an error message or the help text. */
export const BROWSER_THEME_WORDS = Object.keys(_PARTS);

/**
 * Reads a browser theme -- `--browser-theme`'s value, or `browserTheme` from the config file -- as a
 * comma separated list of words (or, from the config file, an array of them), each naming one part:
 * a color scheme (`system`, `light`, `dark`, `dim`), a color vision setting (`standard`,
 * `colorblind`) or a zoom, as a whole percentage from {@link BROWSER_ZOOM_MIN} to
 * {@link BROWSER_ZOOM_MAX} (`125%`). Case and spaces are ignored. Returns an error for a word it
 * does not know, a zoom out of range, or two words for the same part.
 */
export function parseBrowserTheme(value: string | string[]): { theme?: IBrowserUiTheme, error?: string } {
    var words = (Array.isArray(value) ? value : String(value).split(","))
        .map(function(word) {
            return String(word).trim().toLowerCase();
        })
        .filter(function(word) {
            return !!word;
        });

    var theme: any = {};
    for (var lp = 0; lp < words.length; lp++) {
        var found: { part: keyof IBrowserUiTheme, value: any } | null = _PARTS.hasOwnProperty(words[lp]) ? _PARTS[words[lp]] : null;
        var zoom = _ZOOM.exec(words[lp]);
        if (zoom) {
            var percent = parseInt(zoom[1], 10);
            if (percent < BROWSER_ZOOM_MIN || percent > BROWSER_ZOOM_MAX) {
                return { error: "zoom \"" + words[lp] + "\" is outside " + BROWSER_ZOOM_MIN + "% to " + BROWSER_ZOOM_MAX + "%" };
            }

            found = { part: "zoom", value: percent };
        }

        if (!found) {
            return {
                error: "unknown word \"" + words[lp] + "\" (expected any of " + BROWSER_THEME_WORDS.join(", ") +
                    ", or a zoom from " + BROWSER_ZOOM_MIN + "% to " + BROWSER_ZOOM_MAX + "%)"
            };
        }

        if (theme[found.part] !== undefined && theme[found.part] !== found.value) {
            return { error: "\"" + _word(found.part, theme[found.part]) + "\" and \"" + _word(found.part, found.value) + "\" are both a " + _PART_NAMES[found.part] };
        }

        theme[found.part] = found.value;
    }

    return { theme: theme };
}

/** A part's value as it was written: a zoom with its "%". */
function _word(part: keyof IBrowserUiTheme, value: any): string {
    return part === "zoom" ? value + "%" : String(value);
}

/** `override`'s parts in place of `base`'s, and `base`'s for the parts `override` leaves out. */
export function mergeBrowserThemes(base: IBrowserUiTheme | undefined, override: IBrowserUiTheme | undefined): IBrowserUiTheme {
    var merged: IBrowserUiTheme = {};
    [ base, override ].forEach(function(theme) {
        if (theme) {
            (Object.keys(theme) as Array<keyof IBrowserUiTheme>).forEach(function(part) {
                (merged as any)[part] = theme[part];
            });
        }
    });

    return merged;
}
