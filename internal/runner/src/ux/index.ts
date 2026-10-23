/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

export { createBrowserRunnerHtml, createFsDirListingHtml, createTestFrameHtml } from "./browser/ui/resources";
// The module-loading runtime this barrel used to re-export now lives in `src/shared/`, which
// the worker bundle imports directly -- re-exporting it from here would drag this barrel's
// inlined HTML/CSS/favicon graph along with it into that bundle.
export { IFsEntry } from "./interfaces/IFsEntry";
export { BrowserUiStyle } from "./types/BrowserUiStyle";
export { default as faviconIco } from "./images/favicon.ico";
