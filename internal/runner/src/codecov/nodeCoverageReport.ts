/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { brightCyan, gray } from "@nevware21/chromacon";
import { CoverageData, CoverageEntry } from "./interfaces";
import { _isErasedEntry, _asFullyCovered } from "./provider";
import { _buildReporterArgs, _spawnNycReport } from "./nycReport";

export interface ICoverageReportOptions {
    erasedCoverageMode?: "zero" | "full" | "ignore";
    nycOutputDir?: string;
    coverageReporters?: string[];
}

function _loadIstanbulLibCoverage(cwd: string): any {
    const resolved = require.resolve("istanbul-lib-coverage", {
        paths: [cwd, process.cwd(), __dirname]
    });

    // eslint-disable-next-line security/detect-non-literal-require, @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    return require(resolved);
}

/**
 * `nyc <command>` (used by `test:node`) collects and auto-prints coverage in a
 * single step, entirely inside nyc's own process -- tripwire's own coverage pipeline (where
 * `erasedCoverageMode` normally applies, via `DefaultCoverageProvider`) is never involved for
 * the node target, so the CLI flag has nothing to act on there. This gives the node target an
 * equivalent, as a separate, explicit step run *after* nyc's own collection finishes: it reads
 * nyc's raw per-process coverage straight out of `.nyc_output`, applies the same
 * `erasedCoverageMode` transform used for browser/worker to files nyc's own `all: true` tag
 * marks as never actually reached, and reprints a corrected `nyc report` text summary.
 */
export function runCoverageReport(cwd: string, options: ICoverageReportOptions): number {
    const mode = options.erasedCoverageMode || "zero";
    const nycOutputDir = path.resolve(cwd, options.nycOutputDir || ".nyc_output");

    // eslint-disable-next-line security/detect-non-literal-fs-filename
    if (!fs.existsSync(nycOutputDir)) {
        console.warn(
            "No nyc coverage data found at " + nycOutputDir +
            " -- run the coverage-collecting command (eg. `nyc node ...`) first."
        );
        return 1;
    }

    const libCoverage = _loadIstanbulLibCoverage(cwd);
    const map = libCoverage.createCoverageMap({});

    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const files = fs.readdirSync(nycOutputDir).filter((f) => f.endsWith(".json"));
    for (let lp = 0; lp < files.length; lp++) {
        try {
            // eslint-disable-next-line security/detect-non-literal-fs-filename
            const raw = JSON.parse(fs.readFileSync(path.join(nycOutputDir, files[lp]), "utf8"));
            map.merge(raw);
        } catch (e) {
            // Not every *.json under .nyc_output is a coverage map (eg. processinfo/*.json
            // sidecar metadata) -- skip anything that doesn't parse/merge as one.
        }
    }

    // map.toJSON()/map.data hold live FileCoverage class instances (statementMap/s/f/b/etc.
    // are getters on the prototype, not own properties) -- shallow-copying one directly (as
    // `_asFullyCovered`'s `{ ...entry }` does) silently drops everything but `data` itself.
    // Each instance's own `.toJSON()` returns its underlying plain data object instead.
    const merged: CoverageData = {};
    const fileKeys = map.files();
    for (let lp = 0; lp < fileKeys.length; lp++) {
        merged[fileKeys[lp]] = map.fileCoverageFor(fileKeys[lp]).toJSON();
    }

    const transformed: CoverageData = {};
    const keys = Object.keys(merged);
    for (let lp = 0; lp < keys.length; lp++) {
        const key = keys[lp];
        const entry: CoverageEntry = merged[key];

        // Only files nyc's own `--all` mechanism zero-filled (never actually reached by a
        // test) *and* that are structurally erased (no functions/branches, at most the
        // unavoidable module-registration statement) are eligible -- a real, genuinely
        // untested application file always stays at its honest, computed value.
        if (mode === "ignore" && entry.all === true && _isErasedEntry(entry)) {
            continue;
        }

        transformed[key] = (mode === "full" && entry.all === true && _isErasedEntry(entry))
            ? _asFullyCovered(entry)
            : entry;
    }

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "tripwire-node-coverage-"));
    try {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        fs.writeFileSync(path.join(tempDir, "coverage-final.json"), JSON.stringify(transformed), "utf8");

        console.log(gray("Coverage (erased-coverage-mode: ") + brightCyan(mode) + gray("):"));
        return _spawnNycReport(cwd, [
            "--temp-dir", tempDir,
            ..._buildReporterArgs(options.coverageReporters)
        ], "node coverage");
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
}
