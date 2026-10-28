/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { BROWSER_ZOOM_MAX, BROWSER_ZOOM_MIN } from "../../../shared/browserTheme";

/**
 * How the page looks, from the three settings in its Appearance panel (see appearance.ts):
 *
 *  - the theme, as the body's `data-theme`: "System" sets none, and follows the operating system's
 *    light or dark setting (the stylesheets' `prefers-color-scheme` rules), while every other entry
 *    of {@link THEMES} overrides it;
 *  - color vision: "Color-blind safe" shows passed and failed in blue and orange, as the body's
 *    `data-vision`;
 *  - the zoom, a percentage, as the body's `--ui-zoom` -- which only the page's own controls,
 *    results and log follow (`.app-shell` in base.css), so it never needs the browser's zoom and
 *    never scales a test's own frame or content.
 *
 * Each starts as the run's `--browser-theme` set it (the body's `data-default-*` attributes), unless
 * a choice made in the panel is kept in this browser's local storage -- which it is only while it
 * differs from the run's, so choosing what the run set goes back to following the run. runner.html
 * applies all three inline, before the page first paints, so a dark page never flashes light.
 */

/** A theme the page offers. */
export interface IThemeInfo {
    // The body's data-theme, and the word --browser-theme names it by
    id: string;
    // What the Appearance panel calls it
    name: string;
    // More words a search finds it by
    keywords?: string;
}

/** The themes, in the order the Appearance panel lists them. */
export const THEMES: IThemeInfo[] = [
    { id: "system", name: "System", keywords: "auto default operating" },
    { id: "light", name: "Light" },
    { id: "dark", name: "Dark" },
    { id: "dim", name: "Low light", keywords: "dim night warm" }
];

/** The page's settings, by name. */
export type PageSettingName = "theme" | "vision" | "zoom";

/** The local storage keys runner.html's inline script reads too -- keep the two in step. */
export const THEME_STORAGE_KEY = "tripwire.theme";
export const VISION_STORAGE_KEY = "tripwire.vision";
export const ZOOM_STORAGE_KEY = "tripwire.zoom";

/** The steps the zoom's - and + move between; the run's --browser-theme can set any whole percentage between the ends. */
export const ZOOM_LEVELS = [ 50, 67, 75, 80, 90, 100, 110, 125, 150, 175, 200, 250, 300 ];

/**
 * The window size, in the page's own zoomed pixels, at or below which the page takes its compact
 * layout (`layout-narrow` and `layout-short` in base.css) -- the media queries they stand in for
 * would measure the window alone, and a zoomed page needs its compact layout sooner.
 */
export const NARROW_WIDTH = 600;
export const SHORT_HEIGHT = 500;

const _ZOOM_PROPERTY = "--ui-zoom";

interface IPageSetting {
    // Where a choice made in the panel is kept
    key: string;
    // The body attribute carrying the run's --browser-theme for this setting
    defaultAttr: string;
    // The value that needs nothing set on the page: its own default
    none: string;
    isValue: (value: string) => boolean;
    apply: (body: any, value: string) => void;
}

function _setAttr(attr: string, none: string) {
    return function(body: any, value: string) {
        if (value === none) {
            body.removeAttribute(attr);
        } else {
            body.setAttribute(attr, value);
        }
    };
}

const _SETTINGS: { [name: string]: IPageSetting } = {
    theme: {
        key: THEME_STORAGE_KEY, defaultAttr: "data-default-theme", none: "system",
        isValue: function(value) {
            return !!findTheme(value);
        },
        apply: _setAttr("data-theme", "system")
    },
    vision: {
        key: VISION_STORAGE_KEY, defaultAttr: "data-default-vision", none: "standard",
        isValue: function(value) {
            return value === "standard" || value === "colorblind";
        },
        apply: _setAttr("data-vision", "standard")
    },
    zoom: {
        key: ZOOM_STORAGE_KEY, defaultAttr: "data-default-zoom", none: "100",
        isValue: function(value) {
            return /^\d+$/.test(value) && +value >= BROWSER_ZOOM_MIN && +value <= BROWSER_ZOOM_MAX;
        },
        apply: function(body, value) {
            if (body.style) {
                if (value === "100") {
                    body.style.removeProperty(_ZOOM_PROPERTY);
                } else {
                    body.style.setProperty(_ZOOM_PROPERTY, String(+value / 100));
                }
            }

            fitLayout();
        }
    }
};

function _storage(): any {
    try {
        return typeof localStorage !== "undefined" ? localStorage : null;
    } catch (e) {
        // Storage can be blocked outright (a sandboxed frame, privacy settings)
        return null;
    }
}

function _body(): any {
    return typeof document !== "undefined" && document ? document.body : null;
}

function _isValue(setting: IPageSetting, value: any): value is string {
    return typeof value === "string" && setting.isValue(value);
}

/** The theme `id` names, or null for one the page does not have. */
export function findTheme(id: string): IThemeInfo | null {
    for (var lp = 0; lp < THEMES.length; lp++) {
        if (THEMES[lp].id === id) {
            return THEMES[lp];
        }
    }

    return null;
}

/**
 * The themes a search for `query` finds: those with every one of its words, in any order, somewhere
 * in their name, id or keywords -- ignoring case -- in the order {@link THEMES} lists them.
 */
export function searchThemes(query: string): IThemeInfo[] {
    var terms = String(query || "").toLowerCase().split(/\s+/).filter(function(term) {
        return !!term;
    });

    return THEMES.filter(function(theme) {
        var text = (theme.name + " " + theme.id + " " + (theme.keywords || "")).toLowerCase();
        return terms.every(function(term) {
            return text.indexOf(term) !== -1;
        });
    });
}

/** What the run set a setting to, or the page's own default when it set nothing. */
export function readRunSetting(name: PageSettingName): string {
    var setting = _SETTINGS[name];
    var body = _body();
    var value = body && body.getAttribute ? body.getAttribute(setting.defaultAttr) : null;

    return _isValue(setting, value) ? value : setting.none;
}

/** A setting's current value: the choice kept in this browser, else the run's, else the default. */
export function readPageSetting(name: PageSettingName): string {
    var setting = _SETTINGS[name];
    try {
        var storage = _storage();
        var saved = storage ? storage.getItem(setting.key) : null;
        if (_isValue(setting, saved)) {
            return saved;
        }
    } catch (e) {
        // Unreadable storage: the run's setting still applies
    }

    return readRunSetting(name);
}

/** The theme's current value, an id from {@link THEMES} (see {@link readPageSetting}). */
export function readThemeChoice(): string {
    return readPageSetting("theme");
}

/** The zoom's current value, as a percentage (see {@link readPageSetting}). */
export function readZoom(): number {
    return +readPageSetting("zoom");
}

/**
 * Applies `value` to the page and, when `save` is set, keeps it in this browser -- or forgets any
 * kept choice, when `value` is what the run set anyway. Returns false, and changes nothing, for a
 * value the setting does not take.
 */
export function applyPageSetting(name: PageSettingName, value: string, save: boolean): boolean {
    var setting = _SETTINGS[name];
    if (!_isValue(setting, value)) {
        return false;
    }

    var body = _body();
    if (body) {
        setting.apply(body, value);
    }

    if (save) {
        try {
            var storage = _storage();
            if (storage) {
                if (value === readRunSetting(name)) {
                    storage.removeItem(setting.key);
                } else {
                    storage.setItem(setting.key, value);
                }
            }
        } catch (e) {
            // Not remembered, but still applied for this page
        }
    }

    return true;
}

/**
 * The zoom one step in `direction` (1 in, -1 out) from `zoom` among {@link ZOOM_LEVELS} -- from a
 * zoom between two steps, the next one that way -- or `zoom` itself at either end.
 */
export function stepZoom(zoom: number, direction: number): number {
    if (direction > 0) {
        for (var lp = 0; lp < ZOOM_LEVELS.length; lp++) {
            if (ZOOM_LEVELS[lp] > zoom) {
                return ZOOM_LEVELS[lp];
            }
        }
    } else {
        for (var idx = ZOOM_LEVELS.length - 1; idx >= 0; idx--) {
            if (ZOOM_LEVELS[idx] < zoom) {
                return ZOOM_LEVELS[idx];
            }
        }
    }

    return zoom;
}

/**
 * Puts the page in its compact layout while the window is small for it at its zoom: the body's
 * `layout-narrow` at or below {@link NARROW_WIDTH}, and `layout-short` at or below
 * {@link SHORT_HEIGHT}, of the page's own pixels. runner.html does the same before the page first
 * paints; this keeps it right as the window or the zoom changes.
 */
export function fitLayout(): void {
    var body = _body();
    var win: any = typeof window !== "undefined" ? window : null;
    if (!body || !win || !body.classList) {
        return;
    }

    var scale = (body.style && body.style.getPropertyValue ? parseFloat(body.style.getPropertyValue(_ZOOM_PROPERTY)) : 0) || 1;
    body.classList.toggle("layout-narrow", win.innerWidth / scale <= NARROW_WIDTH);
    body.classList.toggle("layout-short", win.innerHeight / scale <= SHORT_HEIGHT);
}
