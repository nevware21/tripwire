/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

/**
 * Context provided when any event starts
 * @since 0.2.0
 */
export interface IListenerStartContext {
    /**
     * Total number of tests to be executed (Run events only)
     */
    totalTests?: number;
}
