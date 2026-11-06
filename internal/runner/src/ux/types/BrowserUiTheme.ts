/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

/**
 * The interactive page's colour scheme: `"system"` follows the operating system's light or dark
 * setting, and `"dim"` is a low-light dark scheme with lower contrast and warmer colours.
 */
export type BrowserUiColorScheme = "system" | "light" | "dark" | "dim";

/**
 * The colours the interactive page shows passed and failed in: `"colorblind"` uses blue and orange,
 * which every kind of color blindness tells apart, in place of green and red.
 */
export type BrowserUiVision = "standard" | "colorblind";

/**
 * How the interactive browser page looks when it opens. Each part is optional; a part left out is the
 * page's default (`"system"`, `"standard"`, a zoom of 100). A choice made in the page's own
 * Appearance panel is remembered in that browser and takes precedence over this.
 */
export interface IBrowserUiTheme {
    scheme?: BrowserUiColorScheme;
    vision?: BrowserUiVision;

    /**
     * The page's zoom, as a whole percentage from 50 to 300. It scales the page's own controls,
     * results and log -- not the browser's zoom, and not a test's own frame or content.
     */
    zoom?: number;
}
