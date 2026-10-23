/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { spawnSync } from "child_process";

/**
 * Builds one `--reporter <name>` pair per configured reporter (nyc's own convention for
 * running several reporters -- eg. `text` and `html` -- in the same `nyc report` invocation).
 * Falls back to `["text"]` when nothing is configured.
 */
export function _buildReporterArgs(reporters?: string[]): string[] {
    const active = reporters && reporters.length ? reporters : ["text"];
    const args: string[] = [];
    for (let lp = 0; lp < active.length; lp++) {
        args.push("--reporter", active[lp]);
    }

    return args;
}

/**
 * Shared `nyc report` invocation used by both the browser/worker coverage writer
 * ({@link NycCoverageReporter}) and the node-target {@link runCoverageReport} command --
 * the only thing that differs between them is which extra args (`--temp-dir`, `--include`/
 * `--exclude`, etc.) get built up before calling this. Resolves `nyc` relative to `cwd` (falling
 * back to this package's own install), spawns `nyc report <args>` with output passed straight
 * through, and prints a warning (rather than throwing) on a non-zero exit or resolve failure so
 * a broken coverage report never fails the overall test run.
 *
 * @returns The child process's exit code, or `1` if `nyc` couldn't even be resolved/spawned.
 */
export function _spawnNycReport(cwd: string, reportArgs: string[], label: string): number {
    try {
        const nycPath = require.resolve("nyc/bin/nyc.js", {
            paths: [cwd, process.cwd(), __dirname]
        });

        const result = spawnSync(
            process.execPath,
            [nycPath, "report", ...reportArgs],
            { cwd, stdio: "inherit" }
        );

        if (result.status !== 0) {
            console.warn("nyc report failed for " + label + " with exit code " + result.status + ".");
        }

        return result.status || 0;
    } catch (e: any) {
        console.warn("Unable to run nyc report for " + label + ": " + (e && e.message ? e.message : String(e)));
        return 1;
    }
}
