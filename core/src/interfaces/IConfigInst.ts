/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IConfig } from "./IConfig";
import { IConfigApi } from "./IConfigApi";

/**
 * Instance of the configuration options
 * @since 0.1.5
 * @group Config
 * @remarks
 * The IConfigInst interface represents an instance of configuration options for the assertion library.
 * It provides access to the current configuration settings, including verbosity, stack trace options,
 * default messages, formatting options, circular reference handling, and diff display settings.
 */
export interface IConfigInst extends Omit<Required<IConfig>, "$ops"> {
    /**
     * Provides additional operations for the configuration instance that
     * are not part of the configuration properties.
     */
    $ops: IConfigApi<this>;
}
