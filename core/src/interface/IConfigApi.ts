/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IFormatter } from "./IFormatter";
import { IFormatManager } from "./IFormatManager";
import { IConfig } from "./IConfig";
import { IRemovable } from "./IRemovable";

/**
 * Provides the additional API functions for the configuration instance
 * @since 0.1.5
 * @group Config
 * @remarks
 * The IConfigApi interface provides additional API functions for the configuration instance.
 * It provides access to the current configuration settings, including verbosity, stack trace options,
 * default messages, formatting options, circular reference handling, and diff display settings.
 */
export interface IConfigApi<T> {
    /**
     * The format manager responsible for managing value formatters.
     * @remarks The format manager handles registration and retrieval of custom formatters used for formatting
     * values in assertion error messages. Formatters are checked in priority order: current context formatters
     * (highest priority), parent context formatters (medium priority), and default formatters (lowest priority).
     * When cloning a config, the format manager is also cloned to maintain isolation between contexts.
     * @since 0.1.5
     */
    formatMgr: IFormatManager;

    /**
     * Resets the current config options to their default values removing any customizations
     * @remarks This will restore all config options to their original default values as
     * defined in package defaults.
     */
    reset: () => void;
    
    /**
     * Returns the current config options in a new plain object
     * @param options - The options to override the current config options
     */
    clone: (options?: IConfig) => T;

    /**
     * Adds a new value formatter that will be used to for all new assertion contexts
     * @param formatter - The value formatter or array of value formatters to add
     * @remarks The returned IRemovable can be used to remove the formatter(s) when they are no longer needed.
     */
    addFormatter: (formatter: IFormatter | Array<IFormatter>) => IRemovable;
}
