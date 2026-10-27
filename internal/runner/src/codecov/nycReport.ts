/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

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
 * The project folder `nyc report` should work in: the nearest folder at or above `cwd` holding a
 * package.json, or `cwd` itself when there is none -- the same folder nyc picks on its own.
 *
 * It is passed to nyc explicitly as `--cwd` because nyc otherwise starts that search from `NYC_CWD`
 * when it is set, and an nyc run *above* this process sets it for every child (re-adding it to each
 * spawn even if it is removed from the environment). The report would then resolve its paths and load
 * its `.nycrc` include and exclude patterns from that outer project, and report none of this one's files.
 */
export function _nycCwd(cwd: string): string {
    let dir = path.resolve(cwd);

    for (;;) {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        if (fs.existsSync(path.join(dir, "package.json"))) {
            return dir;
        }

        const parent = path.dirname(dir);
        if (parent === dir) {
            return path.resolve(cwd);
        }

        dir = parent;
    }
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
            [nycPath, "report", "--cwd", _nycCwd(cwd), ...reportArgs],
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
