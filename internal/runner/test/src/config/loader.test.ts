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
import { assert, afterAll as selfAfterAll, beforeAll as selfBeforeAll } from "@nevware21/tripwire";
import { DefaultConfigLoader, loadConfig, mergeConfigs } from "../../../src/config/loader";
import { ILoadedConfig } from "../../../src/interfaces/ILoadedConfig";
import { ITripwireConfig } from "../../../src/interfaces/ITripwireConfig";

function loaded(config: any, filePath?: string): ILoadedConfig {
    return { filePath: filePath || "<test>", config: config as ITripwireConfig };
}

describe("config loader", () => {
    describe("mergeConfigs", () => {
        it("should return an empty object for no configs", () => {
            assert.deepEqual(mergeConfigs([]) as any, {});
        });

        it("should let a later config replace an earlier one's scalar values", () => {
            const merged: any = mergeConfigs([
                loaded({ timeout: 1000, target: "node" }),
                loaded({ timeout: 5000 })
            ]);

            assert.equal(merged.timeout, 5000, "the higher-priority value should win");
            assert.equal(merged.target, "node", "keys the later config does not set should survive");
        });

        it("should concatenate the array-valued keys rather than replacing them", () => {
            const merged: any = mergeConfigs([
                loaded({ grep: ["a"], ignore: ["x"], spec: ["one"], require: ["r1"] }),
                loaded({ grep: ["b"], ignore: ["y"], spec: ["two"], require: ["r2"] })
            ]);

            assert.deepEqual(merged.grep, ["a", "b"], "each level should be able to add to grep");
            assert.deepEqual(merged.ignore, ["x", "y"]);
            assert.deepEqual(merged.spec, ["one", "two"]);
            assert.deepEqual(merged.require, ["r1", "r2"]);
        });

        it("should replace, not concatenate, an array-valued key set to a non-array", () => {
            const merged: any = mergeConfigs([
                loaded({ grep: ["a"] }),
                loaded({ grep: "b" })
            ]);

            assert.equal(merged.grep, "b", "only real arrays are concatenated");
        });

        it("should not concatenate arrays under keys outside the array set", () => {
            const merged: any = mergeConfigs([
                loaded({ coverageReporters: ["text"] }),
                loaded({ coverageReporters: ["lcov"] })
            ]);

            assert.deepEqual(merged.coverageReporters, ["lcov"], "non-array-keys are replaced wholesale");
        });

        it("should preserve an explicit false rather than treating it as unset", () => {
            const merged: any = mergeConfigs([
                loaded({ bundle: true }),
                loaded({ bundle: false })
            ]);

            assert.isFalse(merged.bundle, "false must survive the merge");
        });

        it("should tolerate a loaded entry with no config object", () => {
            const merged: any = mergeConfigs([
                loaded(null),
                loaded({ timeout: 10 })
            ]);

            assert.equal(merged.timeout, 10);
        });
    });

    describe("loadConfig", () => {
        it("should merge whatever the injected loader returns, lowest priority first", () => {
            const merged: any = loadConfig("/anywhere", {
                load: () => [loaded({ timeout: 1, grep: ["low"] }), loaded({ timeout: 2, grep: ["high"] })]
            });

            assert.equal(merged.timeout, 2);
            assert.deepEqual(merged.grep, ["low", "high"]);
        });

        it("should pass the requested directory through to the loader", () => {
            let seen = "";

            loadConfig("/some/start/dir", {
                load: (startDir: string) => {
                    seen = startDir;
                    return [];
                }
            });

            assert.equal(seen, "/some/start/dir");
        });

        it("should return an empty config when the loader finds nothing", () => {
            assert.deepEqual(loadConfig("/anywhere", { load: () => [] }) as any, {});
        });
    });

    describe("DefaultConfigLoader", () => {
        // A real temp tree rather than a mocked fs: the ordering this asserts is a property of
        // the directory walk itself, which a mock would only restate.
        let root = "";

        selfBeforeAll(() => {
            root = fs.mkdtempSync(path.join(os.tmpdir(), "tripwire-cfg-"));
            fs.mkdirSync(path.join(root, "nested", "deeper"), { recursive: true });
            fs.writeFileSync(path.join(root, ".tripwirerc"), JSON.stringify({ timeout: 1000, target: "node" }), "utf8");
            fs.writeFileSync(path.join(root, "nested", ".tripwirerc"), JSON.stringify({ timeout: 2000 }), "utf8");
        });

        selfAfterAll(() => {
            if (root) {
                fs.rmSync(root, { recursive: true, force: true });
            }
        });

        it("should return the configs it finds ordered lowest priority first", () => {
            const found = new DefaultConfigLoader().load(path.join(root, "nested", "deeper"));
            const ours = found.filter((entry) => entry.filePath.indexOf(root) === 0);

            assert.equal(ours.length, 2, "both files in the temp tree should be found");
            assert.equal(path.dirname(ours[0].filePath), root, "the outer config comes first");
            assert.equal(path.dirname(ours[1].filePath), path.join(root, "nested"), "the closer config comes last");
        });

        it("should let the config closest to the start directory win once merged", () => {
            const merged: any = mergeConfigs(new DefaultConfigLoader().load(path.join(root, "nested", "deeper")));

            assert.equal(merged.timeout, 2000, "the nested config should override the outer one");
            assert.equal(merged.target, "node", "and inherit what it does not set");
        });

        it("should parse a config file containing comments", () => {
            const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tripwire-cfg-jsonc-"));
            try {
                fs.writeFileSync(path.join(dir, ".tripwirerc"), "{\n  // a line comment\n  \"timeout\": 42 /* and a block one */\n}\n", "utf8");

                const found = new DefaultConfigLoader().load(dir).filter((entry) => entry.filePath.indexOf(dir) === 0);
                assert.equal(found.length, 1);
                assert.equal((found[0].config as any).timeout, 42);
            } finally {
                fs.rmSync(dir, { recursive: true, force: true });
            }
        });

        it("should throw a message naming the file when a config cannot be parsed", () => {
            const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tripwire-cfg-bad-"));
            try {
                const filePath = path.join(dir, ".tripwirerc");
                fs.writeFileSync(filePath, "{ this is not json ", "utf8");

                assert.throws(() => {
                    new DefaultConfigLoader().load(dir);
                }, filePath);
            } finally {
                fs.rmSync(dir, { recursive: true, force: true });
            }
        });

        it("should prefer the higher-priority file name when several sit in one directory", () => {
            const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tripwire-cfg-names-"));
            try {
                fs.writeFileSync(path.join(dir, ".tripwirerc"), JSON.stringify({ timeout: 1 }), "utf8");
                fs.writeFileSync(path.join(dir, "tripwire.config.json"), JSON.stringify({ timeout: 2 }), "utf8");

                const found = new DefaultConfigLoader().load(dir).filter((entry) => entry.filePath.indexOf(dir) === 0);

                assert.equal(found.length, 1, "one directory contributes at most one config");
                assert.equal(path.basename(found[0].filePath), "tripwire.config.json", "the later name in the search order wins");
                assert.equal((found[0].config as any).timeout, 2);
            } finally {
                fs.rmSync(dir, { recursive: true, force: true });
            }
        });
    });
});
