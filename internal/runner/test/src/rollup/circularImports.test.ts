/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { assert } from "@nevware21/tripwire";

// rollup is one of the runner's own dev dependencies, and loadConfigFile is how its CLI loads a config,
// so each project's real rollup.config.js is checked exactly as `rollup -c --bundleConfigAsCjs` sees it.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { loadConfigFile } = require("rollup/loadConfigFile");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { rollup } = require("rollup");

const REPO = path.resolve(__dirname, "..", "..", "..", "..", "..");

const PROJECTS = [
    { name: "core", config: path.join(REPO, "core", "rollup.config.js") },
    { name: "shim/chai", config: path.join(REPO, "shim", "chai", "rollup.config.js") },
    { name: "runner", config: path.join(REPO, "internal", "runner", "rollup.config.js") }
];

function circularWarning(ids: string[]): any {
    return {
        code: "CIRCULAR_DEPENDENCY",
        ids: ids,
        message: "Circular dependency: " + ids.join(" -> ")
    };
}

/**
 * Writes `a.js` and `b.js` importing each other under `dir`, with `a.js` as the entry.
 */
function writeCycle(dir: string): string {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "a.js"), "import { b } from \"./b.js\";\nexport const a = () => b();\n", "utf8");
    fs.writeFileSync(path.join(dir, "b.js"), "import { a } from \"./a.js\";\nexport const b = () => typeof a;\n", "utf8");

    return path.join(dir, "a.js");
}

/**
 * Every rollup config in the repository turns a circular import between this repository's own modules
 * into a build failure, while a cycle wholly inside a dependency under node_modules stays a warning.
 * The check goes through rollup itself: the configs are loaded the way the rollup CLI loads them, and
 * the warnings are delivered through the merged options rollup builds from them.
 */
describe("rollup circular import guard", function () {
    // Loading a config bundles it first, and the fixture builds run rollup for real
    this.timeout(120000);

    let scratch: string;

    before(() => {
        scratch = fs.mkdtempSync(path.join(os.tmpdir(), "tripwire-cycles-"));
    });

    after(() => {
        fs.rmSync(scratch, { recursive: true, force: true });
    });

    PROJECTS.forEach((project) => {
        describe(project.name, () => {
            let options: any[];

            before(async () => {
                const loaded = await loadConfigFile(project.config, { bundleConfigAsCjs: true });
                options = loaded.options;
            });

            it("fails every bundle the config defines on a cycle between the repository's own modules, naming every module in it", () => {
                const ids = [ path.join(REPO, "core", "src", "a.ts"), path.join(REPO, "core", "src", "b.ts"), path.join(REPO, "core", "src", "a.ts") ];

                assert.isTrue(options.length > 0, "the config defines at least one bundle");
                options.forEach((opts, idx) => {
                    assert.throws(() => opts.onLog("warn", circularWarning(ids)), "Circular import: " + ids.join(" -> "), "bundle " + idx);
                });
            });

            it("falls back to rollup's message when the warning carries no module ids", () => {
                assert.throws(() => options[0].onLog("warn", { code: "CIRCULAR_DEPENDENCY", message: "Circular dependency: x -> y -> x" }),
                    "Circular import: Circular dependency: x -> y -> x");
            });

            it("leaves a cycle inside a dependency, or any other warning, as a warning", () => {
                const inDependency = [ "/repo/node_modules/dep/a.js", "/repo/node_modules/dep/b.js", "/repo/node_modules/dep/a.js" ];
                const onWindows = [ "C:\\repo\\node_modules\\dep\\a.js", "C:\\repo\\node_modules\\dep\\b.js" ];

                options.forEach((opts) => {
                    opts.onLog("warn", circularWarning(inDependency));
                    opts.onLog("warn", circularWarning(onWindows));
                    opts.onLog("warn", { code: "THIS_IS_UNDEFINED", message: "this is undefined" });
                });
            });

            it("stops a real build that imports its way round in a circle", async () => {
                const entry = writeCycle(path.join(scratch, project.name.replace(/\W/g, "-"), "src"));
                const opts = Object.assign({}, options[0], { input: entry, plugins: [], external: [] });
                delete opts.output;

                let failure: any = null;
                try {
                    await rollup(opts);
                } catch (e) {
                    failure = e;
                }

                assert.isNotNull(failure, "the build fails");
                assert.includes(failure.message, "Circular import: ");
                assert.includes(failure.message, "a.js -> ");
                assert.includes(failure.message, "b.js");
            });

            it("still builds when the cycle is inside a package under node_modules", async () => {
                const entry = writeCycle(path.join(scratch, project.name.replace(/\W/g, "-"), "node_modules", "dep"));
                const opts = Object.assign({}, options[0], { input: entry, plugins: [], external: [] });
                delete opts.output;

                const bundle = await rollup(opts);
                try {
                    const output = await bundle.generate({ format: "es" });
                    assert.includes(output.output[0].code, "typeof a", "the bundle was produced");
                } finally {
                    await bundle.close();
                }
            });
        });
    });
});
