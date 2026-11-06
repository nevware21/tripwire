/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { TestTarget } from "@nevware21/tripwire";
import { BrowserUiStyle } from "../ux/types/BrowserUiStyle";
import { IBrowserUiTheme } from "../ux/types/BrowserUiTheme";
import { IFsEntry } from "../ux/interfaces/IFsEntry";

/**
 * Browser UX provider contract consumed by the runner package.
 */
export interface IRunnerUxProvider {
    // `theme` is how the page looks when it opens (`--browser-theme`); a provider may ignore it
    createBrowserRunnerHtml(target: TestTarget, style: BrowserUiStyle, theme?: IBrowserUiTheme): string;
    createFsDirListingHtml(style: BrowserUiStyle, relativePath: string, entries: IFsEntry[], extraHtml?: string): string;
    createTestFrameHtml?: (target: TestTarget, style: BrowserUiStyle, moduleScriptUrls: string[]) => string;
    faviconIco?: string;
}
