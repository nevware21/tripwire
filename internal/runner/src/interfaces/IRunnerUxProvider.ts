/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { TestTarget } from "@nevware21/tripwire";
import { BrowserUiStyle } from "../ux/types/BrowserUiStyle";
import { IFsEntry } from "../ux/interfaces/IFsEntry";

/**
 * Browser UX provider contract consumed by the runner package.
 */
export interface IRunnerUxProvider {
    createBrowserRunnerHtml(target: TestTarget, style: BrowserUiStyle): string;
    createFsDirListingHtml(style: BrowserUiStyle, relativePath: string, entries: IFsEntry[], extraHtml?: string): string;
    createTestFrameHtml?: (target: TestTarget, style: BrowserUiStyle, moduleScriptUrls: string[]) => string;
    faviconIco?: string;
}
