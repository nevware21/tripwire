/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { ITripwireConfig } from "./ITripwireConfig";

/**
 * A loaded config file with its resolved path for diagnostic purposes.
 */
export interface ILoadedConfig {
    /**
     * Absolute path of the config file that was loaded.
     */
    filePath: string;

    /**
     * The parsed config object.
     */
    config: ITripwireConfig;
}
