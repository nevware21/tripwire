/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

/**
 * Represents an object that can be removed/unregistered.
 * This interface is used for various registration mechanisms where an object
 * can be added and later removed using the returned handle.
 *
 * @since 0.1.3
 * @group Core
 */
export interface IRemovable {
    /**
     * Removes/unregisters the associated object.
     * After calling this method, the object will no longer be active or used.
     *
     * @example
     * ```typescript
     * const handle = addValueFormatter(myFormatter);
     * // ... use the formatter
     * handle.rm(); // Remove the formatter
     * ```
     */
    rm(): void;
}
