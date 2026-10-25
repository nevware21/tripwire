/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import * as fs from "fs";
import * as path from "path";
import { arrForEach, makeGlobRegex, objKeys, strIndexOf, strSplit, strTrim } from "@nevware21/ts-utils";
import { IFileMatcher } from "./IFileMatcher";

/**
 * Normalizes a file path by replacing backslashes with forward slashes.
 * @param value - The file path to normalize.
 * @returns The normalized file path with forward slashes.
 */
function _normalizePath(value: string): string {
    return value.replace(/\\/g, "/");
}

/**
 * Strips the relative prefix (`./`) from a file path if it exists.
 * @param value - The file path to process.
 * @returns The file path without the relative prefix.
 */
function _stripRelativePrefix(value: string): string {
    return strIndexOf(value, "./") === 0 ? value.substring(2) : value;
}

/**
 * Checks if a given string contains glob pattern characters.
 * @param value - The string to check.
 * @returns `true` if the string contains glob pattern characters, `false` otherwise.
 */
function _isGlobPattern(value: string): boolean {
    return /[\*\?\[\]\{\}]/.test(value);
}

/**
 * Directory names never worth descending into, whatever the pattern says: third-party code
 * (`node_modules`) and VCS metadata (`.git`). Neither can contain a file the caller meant to
 * match, so there is no pattern for which descending is the right answer.
 */
const _ALWAYS_SKIPPED_DIR_NAMES: { [name: string]: boolean } = {
    "node_modules": true,
    ".git": true
};

/**
 * Build-output directory names, skipped by default because they can dwarf the real source tree
 * in file count while (usually) holding nothing anyone meant to glob for.
 *
 * Unlike the always-skipped list above, this one **yields to the pattern**: a pattern that names
 * one of these segments literally -- `"./test/build-es5/**\/*.test.js"`, `"dist/**\/*.test.js"` --
 * is descended into normally. Running a suite that was compiled to JS first is a real workflow
 * (this repo ships scripts for it), and a caller who spelled the directory out has said plainly
 * what they want; silently returning nothing was the wrong answer to that.
 *
 * What stays default-skipped is the *incidental* case -- a broad `"**\/*.test.ts"` that happens
 * to sweep past a `coverage/` or `dist/` tree it was never aimed at. Use `--ignore` to exclude
 * more, or name the directory to include it.
 */
const _BUILD_OUTPUT_DIR_NAMES: { [name: string]: boolean } = {
    "dist": true,
    "build": true,
    "bundle": true,
    ".nyc_output": true,
    "coverage": true
};

/**
 * The literal (non-glob) path segments used by the patterns driving the current resolve, so
 * `_walkFiles` can tell "this pattern is aimed at `build/`" from "this pattern merely swept past
 * a `build/`". Collected per `findMatchingFiles` call; see `_BUILD_OUTPUT_DIR_NAMES`.
 */
function _collectLiteralSegments(patterns: string[]): { [name: string]: boolean } {
    const named: { [name: string]: boolean } = {};

    arrForEach(patterns, (pattern) => {
        const parts = strSplit(_stripRelativePrefix(_normalizePath(pattern)), "/");
        arrForEach(parts, (part) => {
            if (part && _isStaticSegment(part)) {
                named[part] = true;
            }
        });
    });

    return named;
}

/**
 * Recursively walks through the file system starting from the given directory, collecting all file paths.
 * @param root - The root directory to start the walk from.
 * @param currentDir - The current directory being processed.
 * @param files - An array to collect the file paths.
 * @param namedDirs - Literal directory segments the driving patterns named (see `_collectLiteralSegments`).
 */
function _walkFiles(root: string, currentDir: string, files: string[], namedDirs: { [name: string]: boolean }): void {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    arrForEach(entries, (entry) => {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
            const relDir = _normalizePath(path.relative(root, fullPath));
            const isBuildOutput = _BUILD_OUTPUT_DIR_NAMES[entry.name] && !namedDirs[entry.name];

            if (_ALWAYS_SKIPPED_DIR_NAMES[entry.name] || isBuildOutput || relDir.indexOf("common/temp") === 0) {
                // Ignore node_modules/.git, un-named build output, and common/temp
            } else {
                _walkFiles(root, fullPath, files, namedDirs);
            }
        } else if (entry.isFile()) {
            files.push(path.join(currentDir, entry.name));
        }
    });
}

/**
 * Cache of the raw (unfiltered) file list under a given directory, keyed by its resolved absolute
 * path *and* the set of build-output directories the driving patterns named (which changes what
 * the walk collects -- see `_BUILD_OUTPUT_DIR_NAMES`). Callers sharing an effective walk root (see
 * `_computeWalkRoot` -- eg. a target's own file set, a `--browser-launch manual` companion-target
 * set, and the coverage pipeline's zero-fill walk all resolve to the same `test/src`-style root in
 * this project) reuse one walk instead of each re-walking the same subtree.
 *
 * **Lifetime is one resolve pass, not one process.** `--watch` and the interactive `open`/`manual`
 * sessions re-resolve repeatedly inside a single long-lived process, so callers that can outlive a
 * filesystem change must call {@link clearWalkCache} before re-resolving. Caching for the life of
 * the process meant a test file created after the first iteration was never discovered -- watch
 * mode re-ran and kept reporting the original, smaller file list.
 */
let _walkCache: { [key: string]: string[] } = {};

/**
 * Drops the cached filesystem walks, so the next `findMatchingFiles` sees the tree as it is now.
 *
 * Call once per re-resolve in any flow that outlives a filesystem change -- the `--watch` loops and
 * the interactive session's rebuild -- and never mid-pass, since sharing one walk across the
 * callers of a *single* resolve is the whole point of the cache.
 */
export function clearWalkCache(): void {
    _walkCache = {};
}

function _getWalkedFiles(dir: string, namedDirs: { [name: string]: boolean }): string[] {
    const root = path.resolve(dir);

    // Only the named *build-output* directories change what the walk collects, so the key stays
    // stable across the (many, arbitrary) other literal segments a pattern might carry.
    const namedBuildDirs: string[] = [];
    arrForEach(objKeys(namedDirs), (name) => {
        if (_BUILD_OUTPUT_DIR_NAMES[name]) {
            namedBuildDirs.push(name);
        }
    });

    const key = root + "\0" + namedBuildDirs.sort().join(",");
    let cached = _walkCache[key];
    if (!cached) {
        cached = [];
        // A computed walk root (see _computeWalkRoot) is derived from a pattern's static
        // path segments and isn't guaranteed to exist (eg. a pattern targeting a directory
        // that hasn't been created yet) -- unlike the old always-walk-from-cwd behaviour,
        // where the starting directory was guaranteed to exist.
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        if (fs.existsSync(root) && fs.statSync(root).isDirectory()) {
            _walkFiles(root, root, cached, namedDirs);
        }
        _walkCache[key] = cached;
    }

    return cached;
}

/**
 * A path segment is "static" (safe to descend into by its literal name, without needing to
 * enumerate a directory's contents to know whether it applies) unless it's a glob segment
 * (`*`/`?`/`[]`/`{}`) or a negated extglob (`!(a|b)`, handled specially in
 * `_buildPatternMatcher` -- not caught by `_isGlobPattern`'s character class since it has no
 * `*`/`?`/`[]`/`{}` of its own).
 */
function _isStaticSegment(part: string): boolean {
    return !_isGlobPattern(part) && !/^!\([^)]+\)$/.test(part);
}

/**
 * Finds the deepest directory a glob pattern's *leading* static segments resolve to, so the
 * filesystem walk can start there instead of at `cwd` -- eg.
 * `"./test/src/!(browser|worker)/**\/*.test.ts"` only ever needs to walk `<cwd>/test/src`,
 * not the entire project (which, in a monorepo, includes sibling packages' own `test/`,
 * `dist/`, etc.). Falls back to `cwd` itself when a pattern's first segment is already
 * dynamic (eg. `"*.test.ts"`), which is exactly the old (correct, if broader) behaviour.
 */
function _computeWalkRoot(pattern: string, cwd: string): string {
    const normalizedPattern = _stripRelativePrefix(_normalizePath(pattern));
    const isAbs = path.isAbsolute(pattern);
    const parts = strSplit(normalizedPattern, "/").filter((part) => part !== "");

    const staticParts: string[] = [];
    for (let lp = 0; lp < parts.length; lp++) {
        if (!_isStaticSegment(parts[lp])) {
            break;
        }
        staticParts.push(parts[lp]);
    }

    const relRoot = staticParts.join("/");
    return path.resolve(isAbs ? "/" : cwd, relRoot);
}

/**
 * Builds a pattern matcher for the given glob pattern and current working directory.
 * @param pattern - The glob pattern to match against file paths.
 * @param cwd - The current working directory to resolve relative paths.
 * @returns An IFileMatcher object that can be used to test file paths against the pattern.
 */
function _buildPatternMatcher(pattern: string, cwd: string): IFileMatcher {
    const normalizedPattern = _stripRelativePrefix(_normalizePath(pattern));
    const isAbs = path.isAbsolute(pattern);

    if (!_isGlobPattern(normalizedPattern)) {
        const absolutePath = isAbs ? path.resolve(pattern) : path.resolve(cwd, pattern);

        return {
            test: (filePath: string) => path.resolve(filePath) === absolutePath
        };
    }

    const patternParts = strSplit(normalizedPattern, "/");
    const negatedSegmentMatchers: { [key: number]: string[] } = {};
    let hasNegatedExtGlob = false;

    arrForEach(patternParts, (part, idx) => {
        const extMatch = /^!\(([^)]+)\)$/.exec(part);

        if (extMatch) {
            const excludedParts = strSplit(extMatch[1], "|");
            const normalizedExclusions: string[] = [];

            arrForEach(excludedParts, (excluded) => {
                const trimmed = strTrim(excluded);

                if (trimmed) {
                    normalizedExclusions.push(trimmed);
                }
            });

            if (normalizedExclusions.length > 0) {
                hasNegatedExtGlob = true;
                negatedSegmentMatchers[idx] = normalizedExclusions;
                patternParts[idx] = "*";
            }
        }
    });

    const regex = makeGlobRegex(patternParts.join("/"), true, true);

    return {
        test: (filePath: string) => {
            const candidate = isAbs
                ? _normalizePath(path.resolve(filePath))
                : _stripRelativePrefix(_normalizePath(path.relative(cwd, filePath)));

            if (!regex.test(candidate)) {
                return false;
            }

            if (!hasNegatedExtGlob) {
                return true;
            }

            const candidateParts = candidate.split("/");
            for (const key of objKeys(negatedSegmentMatchers)) {
                const idx = parseInt(key, 10);
                const segment = candidateParts[idx];
                if (!segment) {
                    return false;
                }

                const excluded = negatedSegmentMatchers[idx];
                for (let ep = 0; ep < excluded.length; ep++) {
                    if (segment === excluded[ep]) {
                        return false;
                    }
                }
            }

            return true;
        }
    };
}

export function findMatchingFiles(patterns: string[], cwd: string): string[] {
    const found: string[] = [];
    const seen: { [key: string]: boolean } = {};
    const matchers: IFileMatcher[] = [];
    const roots: { [dir: string]: boolean } = {};

    arrForEach(patterns, (pattern) => {
        const normalizedPattern = _stripRelativePrefix(_normalizePath(pattern));

        if (!_isGlobPattern(normalizedPattern)) {
            // A literal (non-glob) pattern only ever names one exact file -- no tree walk
            // needed at all, just resolve it directly instead of finding it by matching
            // every walked path against an equality check.
            const absolutePath = path.isAbsolute(pattern) ? path.resolve(pattern) : path.resolve(cwd, pattern);
            // eslint-disable-next-line security/detect-non-literal-fs-filename
            if (!seen[absolutePath] && fs.existsSync(absolutePath) && fs.statSync(absolutePath).isFile()) {
                found.push(absolutePath);
                seen[absolutePath] = true;
            }
            return;
        }

        matchers.push(_buildPatternMatcher(pattern, cwd));
        roots[_computeWalkRoot(pattern, cwd)] = true;
    });

    if (matchers.length > 0) {
        const namedDirs = _collectLiteralSegments(patterns);
        const allFiles: string[] = [];
        arrForEach(objKeys(roots), (root) => {
            arrForEach(_getWalkedFiles(root, namedDirs), (filePath) => {
                allFiles.push(filePath);
            });
        });

        arrForEach(allFiles, (filePath) => {
            const key = path.resolve(filePath);
            if (seen[key]) {
                return;
            }

            arrForEach(matchers, (matcher) => {
                if (matcher.test(filePath)) {
                    found.push(key);
                    seen[key] = true;
                    return -1;
                }
            });
        });
    }

    found.sort();

    return found;
}