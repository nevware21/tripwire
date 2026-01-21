/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

/**
 * Result type for change assertions that provides details about the change.
 * @since 0.1.5
 * @group Change
 */
export interface IChangeResultValue<V = any> {
    /**
     * The name of the property that was monitored (if applicable).
     */
    property?: string | symbol | number;

    /**
     * The value before the change.
     */
    initial: V;

    /**
     * The value after the change.
     */
    value: V;

    /**
     * The amount of change (value - initial) if applicable.
     */
    delta?: number;
}