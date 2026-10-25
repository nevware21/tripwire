/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { ILoadedConfig } from "./ILoadedConfig";

/**
 * Strategy interface for locating and loading tripwire config files.
 * Swap the default implementation to support additional formats or lookup strategies.
 */
export interface IConfigLoader {
    /**
     * Search for and load config files, starting from `startDir` and walking
     * towards the filesystem root.  Returns configs in ascending priority order
     * (index 0 = lowest priority = furthest from `startDir`).
     *
     * The returned array should be merged with `Object.assign` from index 0
     * upward so that closer configs override further ones.
     *
     * The `filePath` property of each returned config should be the absolute path
     * to the config file that was loaded, for diagnostic purposes.
     *
     * The default implementation looks for files named `tripwire.config.js` or
     * `tripwire.config.json` in each directory, and loads them as JavaScript or
     * JSON modules respectively.
     *
     * @param startDir - The directory to start searching from.
     * @returns An array of loaded configs in ascending priority order.
     */
    load(startDir: string): ILoadedConfig[];
}
