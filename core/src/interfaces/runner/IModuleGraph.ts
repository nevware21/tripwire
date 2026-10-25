/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

/**
 * Defines the structure of the module graph used by the test runner to manage test modules and their dependencies.
 * @since 0.2.0
 */
export interface IModuleGraph {

    /**
     * A mapping of module IDs to their corresponding source code as strings.
     */
    modules: { [id: string]: string };

    /**
     * An array of entry module IDs that serve as the starting points for the test execution.
     */
    entryIds: string[];

    /**
     * The module ID of the Tripwire module, which serves as the main entry point for the test runner.
     */
    tripwireModuleId: string;
}
