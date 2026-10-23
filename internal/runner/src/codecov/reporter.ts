/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import * as fs from "fs";
import * as path from "path";
import { brightCyan, gray } from "@nevware21/chromacon";
import { CoverageData, ICoverageReporter } from "./interfaces";
import { _buildReporterArgs, _spawnNycReport } from "./nycReport";

/**
 * nyc-backed {@link ICoverageReporter}.
 *
 * - Writes `coverage-final.json` to `<cwd>/coverage/<target>/`.
 * - Strips `inputSourceMap.sourcesContent` before writing to avoid the
 *   `merge-coverage` preprocessing regex corrupting embedded TS source.
 * - Runs `nyc report --reporter <name>` (one pair per configured reporter, default `text`)
 *   to produce a per-run summary.
 */
export class NycCoverageReporter implements ICoverageReporter {
    private readonly _reporters: string[];

    constructor(reporters?: string[]) {
        this._reporters = reporters && reporters.length ? reporters : ["text"];
    }

    write(coverage: CoverageData, cwd: string, target: string): void {
        const targetFolder = target === "worker" ? "worker" : "browser";
        const coverageDir = path.resolve(cwd, "coverage", targetFolder);
        const coverageFile = path.resolve(coverageDir, "coverage-final.json");

        const sanitized = _stripSourcesContent(coverage);

        try {
            // eslint-disable-next-line security/detect-non-literal-fs-filename
            fs.mkdirSync(coverageDir, { recursive: true });
            // eslint-disable-next-line security/detect-non-literal-fs-filename
            fs.writeFileSync(coverageFile, JSON.stringify(sanitized, null, 2), "utf8");
            console.log(gray("Wrote coverage:"), brightCyan(coverageFile));
            _runNycReport(cwd, coverageDir, targetFolder, this._reporters);
        } catch (e: any) {
            console.warn(
                "Failed to write " + targetFolder + " coverage file: " +
                (e && e.message ? e.message : String(e))
            );
        }
    }
}

/*
 * ---------------------------------------------------------------------------
 * Helpers
 * ---------------------------------------------------------------------------
 */

/**
 * Removes `sourcesContent` from each entry's `inputSourceMap`.
 *
 * `merge-coverage` applies a `/\/\/.* /gm` regex to strip JS comments from the
 * JSON before parsing it.  When `sourcesContent` embeds raw TypeScript that
 * contains `//` comments, the regex strips from the `//` to the physical
 * end-of-line, leaving an unclosed JSON string.  The subsequent JSON.parse then
 * hits a literal 0x0A newline byte — the "Bad control character" error.
 *
 * Removing only `sourcesContent` keeps the `mappings` / `sources` intact so
 * that source-map based line-number remapping still works.
 */
function _stripSourcesContent(coverage: CoverageData): CoverageData {
    const result: CoverageData = {};
    const keys = Object.keys(coverage || {});

    for (let lp = 0; lp < keys.length; lp++) {
        const key = keys[lp];
        const entry = coverage[key];

        if (entry && entry.inputSourceMap && entry.inputSourceMap.sourcesContent) {
            const sanitizedMap: any = {};
            const mapKeys = Object.keys(entry.inputSourceMap);
            for (let mp = 0; mp < mapKeys.length; mp++) {
                if (mapKeys[mp] !== "sourcesContent") {
                    sanitizedMap[mapKeys[mp]] = entry.inputSourceMap[mapKeys[mp]];
                }
            }

            const sanitizedEntry: any = {};
            const entryKeys = Object.keys(entry);
            for (let ep = 0; ep < entryKeys.length; ep++) {
                sanitizedEntry[entryKeys[ep]] =
                    entryKeys[ep] === "inputSourceMap" ? sanitizedMap : entry[entryKeys[ep]];
            }

            result[key] = sanitizedEntry;
        } else {
            result[key] = entry;
        }
    }

    return result;
}

function _runNycReport(cwd: string, coverageDir: string, targetFolder: string, reporters: string[]): void {
    const reportDir = path.resolve(coverageDir, "report");

    _spawnNycReport(cwd, [
        "--temp-dir", coverageDir,
        "--report-dir", reportDir,
        ..._buildReporterArgs(reporters),
        "--include", "**/*",
        "--exclude", "**/test/src/**",
        "--exclude", "**/tests/**",
        "--exclude", "**/test/build-es5/test/**",
        "--exclude", "**/*.test.*",
        "--exclude", "**/*.spec.*",
        "--exclude", "**/node_modules/**",
        "--all=false"
    ], targetFolder + " coverage");
}
