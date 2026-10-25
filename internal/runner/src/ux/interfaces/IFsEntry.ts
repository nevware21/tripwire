/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

/**
 * Represents a single file system entry (file or directory) used by the server's root-level
 * filesystem fallback handler (there is no dedicated `/fs` route).
 */
export interface IFsEntry {
    /**
     * The entry name (basename only, not a full path).
     */
    name: string;

    /**
     * True if this entry is a directory; false if it is a file.
     */
    isDir: boolean;

    /**
     * File size in bytes (undefined for directories).
     */
    size?: number;

    /**
     * Last-modified timestamp (undefined if unavailable).
     */
    modified?: Date;
}
