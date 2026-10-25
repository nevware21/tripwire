/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import * as path from "path";
import { arrForEach } from "@nevware21/ts-utils";

/**
 * Reconciles *what `--type-check` checked* with *what the run is about to execute*.
 *
 * `--type-check` checks the tsconfig **project**; the run executes whatever the file glob
 * matched. Nothing has ever required those two sets to agree, and when they drift apart the
 * check reports success having examined nothing that runs -- a test file with a genuine type
 * error executes, passes, and the run stays green, because the file was outside the project's
 * `include`.
 *
 * That drift is the normal end state of a living repo, not an exotic misconfiguration: a new
 * test directory, a moved package, a glob widened without the tsconfig following. The runner
 * already knows both sets by the time the compiler has run, so it can simply say so.
 */

/**
 * The outcome of comparing the matched files against the project's resolved files.
 */
export interface ITypeCheckScope {
    /**
     * Matched TypeScript files the project does cover -- ie. the ones actually type-checked.
     */
    checked: number;

    /**
     * Matched TypeScript files the project does not cover, in the order they were matched.
     * Empty when the two sets agree.
     */
    unchecked: string[];
}

/**
 * How many unchecked files to name before collapsing the rest into a `... N more` line. Enough
 * to recognise the pattern (usually one directory), short enough not to bury the advice under
 * it when a whole tree is outside the project.
 */
const _MAX_NAMED = 3;

function _key(filePath: string, caseSensitive: boolean): string {
    // Backslashes become slashes before resolving, as TypeScript treats both as separators, so a
    // Windows-style path still has its ".." segments collapsed on Linux and macOS.
    const normalized = path.resolve(filePath.replace(/\\/g, "/")).replace(/\\/g, "/");

    return caseSensitive ? normalized : normalized.toLowerCase();
}

/**
 * Splits `matchedFiles` into the ones `projectFileNames` covers and the ones it doesn't.
 *
 * Only TypeScript files are considered: a `.js` test is not something `--type-check` ever
 * claimed to check, so counting it as "unchecked" would be a false alarm on every JavaScript
 * suite.
 *
 * @param matchedFiles - The files the run resolved, absolute or relative to the process cwd.
 * @param projectFileNames - The files the tsconfig resolves to (see `getProjectFileNames`).
 * @param caseSensitive - Whether the filesystem distinguishes case. Defaults to `false`, which
 * is the safe direction: on a case-sensitive filesystem it can only ever under-report.
 * @internal
 */
export function _findUncheckedFiles(matchedFiles: string[], projectFileNames: string[], caseSensitive?: boolean): ITypeCheckScope {
    const sensitive = !!caseSensitive;
    const covered: { [key: string]: boolean } = {};

    arrForEach(projectFileNames || [], (filePath) => {
        covered[_key(filePath, sensitive)] = true;
    });

    const unchecked: string[] = [];
    let checked = 0;

    arrForEach(matchedFiles || [], (filePath) => {
        if (!/\.tsx?$/i.test(filePath)) {
            return;
        }

        if (covered[_key(filePath, sensitive)]) {
            checked++;
        } else {
            unchecked.push(filePath);
        }
    });

    return {
        checked,
        unchecked
    };
}

/**
 * Builds the plain-text report for a scope mismatch -- the same wording whether it is being
 * warned about or failed on, so `--strict-type-check` changes the severity and nothing else.
 *
 * @param scope - The result of {@link _findUncheckedFiles}.
 * @param projectPath - The resolved tsconfig path, for naming what the files are outside *of*.
 * @param cwd - Directory the named files are shown relative to.
 * @param strict - Whether this is being raised as an error rather than a warning; only changes
 * the closing advice line.
 * @returns The message lines, or an empty array when nothing is out of scope.
 * @internal
 */
export function _formatTypeCheckScope(scope: ITypeCheckScope, projectPath: string, cwd: string, strict?: boolean): string[] {
    const unchecked = (scope && scope.unchecked) || [];
    if (!unchecked.length) {
        return [];
    }

    const total = unchecked.length + (scope.checked || 0);
    const lines: string[] = [
        unchecked.length + " of " + total + " matched TypeScript file(s) are outside " +
        path.relative(cwd, projectPath).replace(/\\/g, "/") + " and were not type-checked:"
    ];

    const named = Math.min(_MAX_NAMED, unchecked.length);
    for (let lp = 0; lp < named; lp++) {
        lines.push("  " + path.relative(cwd, path.resolve(unchecked[lp])).replace(/\\/g, "/"));
    }

    if (unchecked.length > named) {
        lines.push("  ... " + (unchecked.length - named) + " more");
    }

    lines.push("Add them to the project's \"include\"/\"files\", or point --project at a tsconfig that covers them.");
    if (!strict) {
        lines.push("Use --strict-type-check to fail the run instead of warning.");
    }

    return lines;
}
