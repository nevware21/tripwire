/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

/**
 * @internal
 * The signature of the test function used by the IFileMatcher to determine if a file path matches the glob pattern.
 */
export type TestFn = (filePath: string) => boolean;

/**
 * Utility to find files matching glob patterns. Supports negated extglobs like `!(a|b).ts` to exclude specific
 * file names from a segment. Does not support negated directory patterns or more complex extglob patterns.
 */
export interface IFileMatcher {

    /**
     * Tests whether a given file path matches the pattern defined by this matcher.
     * @param filePath - The file path to test against the matcher's pattern.
     * @returns `true` if the file path matches the pattern, `false` otherwise.
     */
    test: TestFn;
}

