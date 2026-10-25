/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

/**
 * Defines the structure of a serialized regular expression used for filtering tests by name.
 * @since 0.2.0
 */
export interface ISerializedRegExp {

    /**
     * The source string of the regular expression, which defines the pattern to be matched.
     */
    source: string;

    /**
     * The flags string of the regular expression, which defines the modifiers that affect how the pattern is matched (e.g., "g"
     * for global, "i" for case-insensitive).
     */
    flags: string;
}
