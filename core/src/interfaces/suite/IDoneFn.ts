/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2025 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

/**
 * Done callback for async tests
 * @since 0.2.0
 */
export interface IDoneFn {
    (error?: any): void;
    fail(error?: any): void;
}
