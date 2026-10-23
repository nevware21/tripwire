/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import * as path from "path";
import { arrForEach, makeGlobRegex } from "@nevware21/ts-utils";
import { _normalizePath } from "../internal/normalizePath";

export function _applyIgnoredFilePatterns(files: string[], cwd: string, ignorePatterns: string[]): string[] {
    let filtered = files;

    if (ignorePatterns.length) {
        const matchers = ignorePatterns.map((pattern) => {
            const normalized = pattern.replace(/\\/g, "/").replace(/^\.\//, "");
            return makeGlobRegex(normalized, true, true);
        });

        filtered = [];

        arrForEach(files, (file) => {
            const rel = _normalizePath(path.relative(cwd, file)).replace(/^\.\//, "");
            let ignored = false;

            arrForEach(matchers, (matcher) => {
                if (matcher.test(rel)) {
                    ignored = true;
                    return -1; // break
                }
            });

            if (!ignored) {
                filtered.push(file);
            }
        });
    }

    return filtered;
}
