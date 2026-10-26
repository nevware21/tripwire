/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import * as fs from "fs";
import * as path from "path";
import { assert, expect } from "@nevware21/tripwire";
import * as tripwire from "@nevware21/tripwire";
import { _parseArgs } from "../../../src/cli/parseArgs";
import { REPORTER_NAMES } from "../../../src/reporters/createReporter";
import { ITripwireConfig } from "../../../src/interfaces/ITripwireConfig";

/*
 * DOC-FLAGDRIFT. `docs/migration/migrating-from-mocha.md` section 10 is a machine-readable
 * summary explicitly labelled "for automated migrations" -- it is the one piece of
 * documentation in this repo designed to be consumed without a human reading it. Its
 * `reporterNames` list silently fell a release behind the code (`cargo` shipped and was
 * added to REPORTER_NAMES, createReporter, docs/reporters.md and docs/test-runner.md, but
 * not there), so an agent following the block would have produced a config the CLI rejects.
 *
 * The correction was the easy half. This is the part that stops it recurring: rather than
 * comparing the doc against another list of names, each documented claim is checked against
 * what the code actually does.
 */

// This file is at internal/runner/test/src/docs/, so the repo root is five levels up.
const _repoRoot = path.resolve(__dirname, "..", "..", "..", "..", "..");
const _migrationGuide = path.join(_repoRoot, "docs", "migration", "migrating-from-mocha.md");
const _karmaGuide = path.join(_repoRoot, "docs", "migration", "migrating-from-karma.md");
const _jestGuide = path.join(_repoRoot, "docs", "migration", "migrating-from-jest.md");
const _testRunnerDoc = path.join(_repoRoot, "docs", "test-runner.md");
const _reportersDoc = path.join(_repoRoot, "docs", "reporters.md");

/**
 * Extracts the last fenced ```json block from the migration guide -- section 10's
 * machine-readable summary. The guide's other fenced blocks are ```jsonc (commented config
 * examples), which are deliberately not parsed as strict JSON.
 */
function _readMachineSummary(): any {
    const markdown = fs.readFileSync(_migrationGuide, "utf8");
    const re = /```json\r?\n([\s\S]*?)```/g;
    const blocks: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = re.exec(markdown)) !== null) {
        blocks.push(match[1]);
    }

    assert.isTrue(blocks.length > 0, "no fenced ```json block found in " + _migrationGuide);

    return JSON.parse(blocks[blocks.length - 1]);
}

function _parse(args: string[]): any {
    return _parseArgs(args, {} as ITripwireConfig);
}

/**
 * True when the parser rejected the flag as unknown, as opposed to accepting it or failing
 * for some unrelated reason (a missing value, no file glob).
 */
function _isUnsupported(flag: string): boolean {
    const result = _parse([ flag, "spec.ts" ]);

    return !!result.error && result.error.indexOf("Unsupported option") !== -1;
}

let _summary: any;

describe("documentation drift guards", () => {
    describe("the machine-readable migration summary", () => {
        it("should still be present and parse as JSON", () => {
            _summary = _readMachineSummary();

            assert.isDefined(_summary);
            assert.isObject(_summary);
        });

        it("should list exactly the reporters the code ships", () => {
            // The assertion that would have caught the cargo omission on the first build.
            const summary = _summary || _readMachineSummary();

            assert.deepEqual(summary.reporterNames, REPORTER_NAMES.slice(),
                "docs/migration/migrating-from-mocha.md reporterNames has drifted from REPORTER_NAMES");
        });

        it("should list the reporters in the same order as the code", () => {
            // deepEqual above already pins order; this states it as its own expectation so
            // a future change to a set-comparison does not lose it silently.
            const summary = _summary || _readMachineSummary();

            for (let lp = 0; lp < REPORTER_NAMES.length; lp++) {
                assert.equal(summary.reporterNames[lp], REPORTER_NAMES[lp], "position " + lp);
            }
        });

        it("should have every reporter it names accepted by --reporter", () => {
            // Stronger than a list diff: each documented name is actually selectable.
            const summary = _summary || _readMachineSummary();
            const names: string[] = summary.reporterNames;

            for (let lp = 0; lp < names.length; lp++) {
                const result = _parse([ "--reporter", names[lp], "spec.ts" ]);

                assert.isUndefined(result.error, "--reporter " + names[lp] + " was rejected: " + result.error);
            }
        });

        it("should have every flag it calls unsupported actually rejected", () => {
            /*
             * `flagsUnsupported` is the list a migrating project checks its command line
             * against. If the runner later grew support for one of these, the doc would be
             * telling agents to strip a flag that now works.
             */
            const summary = _summary || _readMachineSummary();
            const flags: string[] = summary.flagsUnsupported;
            const wrong: string[] = [];

            assert.isArray(flags);

            for (let lp = 0; lp < flags.length; lp++) {
                if (!_isUnsupported(flags[lp])) {
                    wrong.push(flags[lp]);
                }
            }

            assert.deepEqual(wrong, [], "documented as unsupported but the parser accepts: " + wrong.join(", "));
        });

        it("should have every flag it calls unchanged actually accepted", () => {
            /*
             * The other direction, and the one that catches a removed flag. Value-taking
             * flags are given a value so the only failure left is "Unsupported option".
             */
            const summary = _summary || _readMachineSummary();
            const flags: string[] = summary.flagsUnchanged;
            const wrong: string[] = [];

            assert.isArray(flags);

            for (let lp = 0; lp < flags.length; lp++) {
                const flag = flags[lp];

                // Try the flag bare, then with a plausible value -- a value-taking flag
                // fails for "Missing value" rather than "Unsupported option", so it only
                // has to be recognised under one of the two shapes.
                if (_isUnsupported(flag)) {
                    const withValue = _parse([ flag, "1", "spec.ts" ]);

                    if (withValue.error && withValue.error.indexOf("Unsupported option") !== -1) {
                        wrong.push(flag);
                    }
                }
            }

            assert.deepEqual(wrong, [], "documented as supported but the parser rejects: " + wrong.join(", "));
        });

        it("should have the renamed flags' targets accepted and their old names rejected", () => {
            const summary = _summary || _readMachineSummary();
            const renamed = summary.flagsRenamed;
            const badTargets: string[] = [];

            assert.isObject(renamed);

            const from = Object.keys(renamed);

            for (let lp = 0; lp < from.length; lp++) {
                const target: string = renamed[from[lp]];

                // The rename target must be a real flag. (`--help` is a target too, and is
                // recognised, so this holds for every entry.)
                if (_isUnsupported(target)) {
                    badTargets.push(from[lp] + " -> " + target);
                }
            }

            assert.deepEqual(badTargets, [], "rename targets the parser does not accept: " + badTargets.join(", "));
        });

        it("should name type-check flags that the parser accepts", () => {
            const summary = _summary || _readMachineSummary();
            const ts = summary.typescript;

            assert.isObject(ts);
            assert.isFalse(_isUnsupported(ts.typeCheckFlag), ts.typeCheckFlag + " is documented but not accepted");
            assert.isFalse(_isUnsupported(ts.strictTypeCheckFlag), ts.strictTypeCheckFlag + " is documented but not accepted");
            assert.isFalse(_isUnsupported(ts.projectFlag), ts.projectFlag + " is documented but not accepted");
        });

        it("should name a transpile-only flag that the parser accepts", () => {
            const summary = _summary || _readMachineSummary();
            const ts = summary.typescript;

            assert.isString(ts.transpileOnlyFlag);
            assert.isFalse(_isUnsupported(ts.transpileOnlyFlag), ts.transpileOnlyFlag + " is documented but not accepted");
        });

        it("should document the type-check default the parser actually applies", () => {
            // The doc states typeCheckDefault; the parser is the authority. A change to either
            // without the other is the drift this guard exists for.
            const summary = _summary || _readMachineSummary();
            const ts = summary.typescript;

            assert.isBoolean(ts.typeCheckDefault);
            assert.equal(_parse([ "spec.ts" ]).compile, ts.typeCheckDefault,
                "documented typeCheckDefault does not match what the parser does with no flags");
        });

        it("should document a config field that really sets the default", () => {
            const summary = _summary || _readMachineSummary();
            const field: string = summary.typescript.typeCheckConfigField;

            assert.isString(field);

            const enabled: any = {};
            enabled[field] = true;

            assert.isTrue(_parseArgs([ "spec.ts" ], enabled as ITripwireConfig).compile,
                "config field " + field + " does not enable type-checking");
        });

        it("should have the documented flags be exact opposites", () => {
            // The precedence sentence in the block claims last-flag-wins; assert it rather
            // than trusting the prose.
            const summary = _summary || _readMachineSummary();
            const ts = summary.typescript;

            assert.isTrue(_parse([ ts.transpileOnlyFlag, ts.typeCheckFlag, "spec.ts" ]).compile);
            assert.isFalse(_parse([ ts.typeCheckFlag, ts.transpileOnlyFlag, "spec.ts" ]).compile);
        });

        it("should list the targets type-checking actually applies to", () => {
            const summary = _summary || _readMachineSummary();
            const targets: string[] = summary.typescript.typeCheckTargets;

            assert.isArray(targets);

            // Every documented target must be one the CLI accepts.
            for (let lp = 0; lp < targets.length; lp++) {
                const result = _parse([ "--target", targets[lp], "spec.ts" ]);

                assert.isUndefined(result.error, "--target " + targets[lp] + " rejected: " + result.error);
            }
        });
    });

    describe("the reporter set is documented everywhere it is claimed", () => {
        it("should mention every reporter name in docs/reporters.md", () => {
            // docs/reporters.md is the owning file for the reporter set; a new reporter that
            // never reaches it ships undocumented.
            const markdown = fs.readFileSync(_reportersDoc, "utf8");
            const missing: string[] = [];

            for (let lp = 0; lp < REPORTER_NAMES.length; lp++) {
                if (markdown.indexOf(REPORTER_NAMES[lp]) === -1) {
                    missing.push(REPORTER_NAMES[lp]);
                }
            }

            assert.deepEqual(missing, [], "reporters missing from docs/reporters.md: " + missing.join(", "));
        });

        it("should mention every reporter name in docs/test-runner.md", () => {
            const markdown = fs.readFileSync(_testRunnerDoc, "utf8");
            const missing: string[] = [];

            for (let lp = 0; lp < REPORTER_NAMES.length; lp++) {
                if (markdown.indexOf(REPORTER_NAMES[lp]) === -1) {
                    missing.push(REPORTER_NAMES[lp]);
                }
            }

            assert.deepEqual(missing, [], "reporters missing from docs/test-runner.md: " + missing.join(", "));
        });

        it("should not document a reporter name the code does not ship", () => {
            /*
             * The reverse drift: a reporter removed from the code but left in the docs. The
             * migration summary is the machine-readable copy, so it is the one checked.
             */
            const summary = _summary || _readMachineSummary();
            const names: string[] = summary.reporterNames;
            const unknown: string[] = [];

            for (let lp = 0; lp < names.length; lp++) {
                if (REPORTER_NAMES.indexOf(names[lp] as any) === -1) {
                    unknown.push(names[lp]);
                }
            }

            assert.deepEqual(unknown, [], "documented reporters the code does not ship: " + unknown.join(", "));
        });
    });

    describe("the custom reporter contract is documented as it behaves", () => {
        // REPORTER-EXT. The doc used to state the opposite ("there is currently no way to select
        // one"), which was true when written -- exactly the drift this suite exists to catch, so
        // each half of the replacement claim is pinned against the parser.
        it("should have every custom reporter specifier form it shows accepted by --reporter", () => {
            const forms = ["./reporters/mine.js", "@me/tripwire-reporter", "module:my-reporter"];

            for (let lp = 0; lp < forms.length; lp++) {
                const result = _parse([ "--reporter", forms[lp], "spec.ts" ]);

                assert.isUndefined(result.error, "--reporter " + forms[lp] + " was rejected: " + result.error);
                assert.deepEqual(result.reporter, [ forms[lp] ], forms[lp] + " should reach the runner unchanged");
            }
        });

        it("should still have a bare typo rejected, as the doc claims", () => {
            const result = _parse([ "--reporter", "spce", "spec.ts" ]);

            assert.isDefined(result.error, "a bare unknown name must stay a typo, not become a package lookup");
        });

        it("should document the module: prefix wherever it documents custom reporters", () => {
            const docs = [ _reportersDoc, _testRunnerDoc ];

            for (let lp = 0; lp < docs.length; lp++) {
                const markdown = fs.readFileSync(docs[lp], "utf8");

                assert.includes(markdown, "module:", docs[lp] + " should document the explicit module: prefix");
            }
        });

        it("should not still claim custom reporters cannot be selected", () => {
            const markdown = fs.readFileSync(_reportersDoc, "utf8");

            assert.equal(markdown.indexOf("no way to select one"), -1,
                "docs/reporters.md still carries the pre-REPORTER-EXT claim");
        });
    });

    /*
     * DOC-HELPDRIFT. `--help` and the CLI tables in docs/test-runner.md are meant to describe the same
     * flag set, but nothing tied them together: `--bind-address` and the short aliases `-p -g -f -s -t
     * -b` were documented and parsed yet missing from `--help`. `tripwire.ts` cannot be required from a
     * plain node test (see parseArgs.ts's header), so its source text is read instead.
     */
    describe("the --help text", () => {
        function _usageSource(): string {
            const source = fs.readFileSync(path.join(_repoRoot, "internal", "runner", "src", "tripwire.ts"), "utf8");
            const start = source.indexOf("function _printUsage");
            const end = source.indexOf("\n}", start);

            assert.isTrue(start !== -1 && end !== -1, "_printUsage not found in tripwire.ts");

            return source.substring(start, end);
        }

        function _documentedFlags(): string[] {
            const markdown = fs.readFileSync(_testRunnerDoc, "utf8");
            const start = markdown.indexOf("\n## CLI Reference");
            const end = markdown.indexOf("\n## Config Files");

            assert.isTrue(start !== -1 && end > start, "CLI Reference section not found in docs/test-runner.md");

            const found: { [flag: string]: boolean } = {};
            const lines = markdown.substring(start, end).split(/\r?\n/);
            for (let lp = 0; lp < lines.length; lp++) {
                // Only a table row's first cell names flags; descriptions mention flags in passing.
                const row = lines[lp].match(/^\|([^|]*)\|/);
                if (row) {
                    const flags = row[1].match(/`--?[a-zA-Z][a-zA-Z-]*/g);
                    if (flags) {
                        for (let fp = 0; fp < flags.length; fp++) {
                            found[flags[fp].substring(1)] = true;
                        }
                    }
                }
            }

            return Object.keys(found);
        }

        it("should list every flag the CLI tables document", () => {
            const usage = _usageSource();
            const flags = _documentedFlags();
            const missing: string[] = [];

            assert.isTrue(flags.length > 20, "expected the CLI tables to name many flags, found " + flags.length);

            for (let lp = 0; lp < flags.length; lp++) {
                // eslint-disable-next-line security/detect-non-literal-regexp
                if (!new RegExp("(^|[^\\w-])" + flags[lp] + "(?![\\w-])").test(usage)) {
                    missing.push(flags[lp]);
                }
            }

            assert.deepEqual(missing, [], "documented in docs/test-runner.md but missing from --help: " + missing.join(", "));
        });
    });

    /*
     * The Karma guide carries its own machine-readable block (§9), for the same reason the Mocha one
     * does: an automated migration reads it instead of the prose. It names tripwire flags as the
     * replacement for `karma.conf.js` fields, so the risk is the same -- a flag that is renamed or
     * removed leaves the guide telling agents to write a command the CLI rejects.
     */
    describe("the Karma migration guide", () => {
        function _readKarmaSummary(): any {
            const markdown = fs.readFileSync(_karmaGuide, "utf8");
            const re = /```json\r?\n([\s\S]*?)```/g;
            const blocks: string[] = [];
            let match: RegExpExecArray | null;

            while ((match = re.exec(markdown)) !== null) {
                blocks.push(match[1]);
            }

            assert.isTrue(blocks.length > 0, "no fenced ```json block found in " + _karmaGuide);

            return JSON.parse(blocks[blocks.length - 1]);
        }

        /**
         * Every distinct `--flag` named anywhere in the summary's values, whatever shape the entry
         * has: a bare flag, a flag with a trailing explanation, or `null` for "no equivalent".
         */
        function _flagsNamedIn(value: any, found: { [flag: string]: boolean }): void {
            if (typeof value === "string") {
                const matched = value.match(/--[a-z][a-z-]*/g);
                if (matched) {
                    for (let lp = 0; lp < matched.length; lp++) {
                        found[matched[lp]] = true;
                    }
                }
            } else if (value && typeof value === "object") {
                const keys = Object.keys(value);
                for (let lp = 0; lp < keys.length; lp++) {
                    _flagsNamedIn(value[keys[lp]], found);
                }
            }
        }

        it("should still be present and parse as JSON", () => {
            const summary = _readKarmaSummary();

            assert.isObject(summary);
            assert.equal(summary.cliCommand, "tripwire");
        });

        it("should have every flag it names accepted by the parser", () => {
            // The whole point of the block: what it tells an agent to write has to actually run.
            const found: { [flag: string]: boolean } = {};
            _flagsNamedIn(_readKarmaSummary(), found);

            const flags = Object.keys(found);
            assert.isTrue(flags.length > 5, "expected the summary to name several flags, found " + flags.length);

            const rejected: string[] = [];
            for (let lp = 0; lp < flags.length; lp++) {
                if (_isUnsupported(flags[lp])) {
                    rejected.push(flags[lp]);
                }
            }

            assert.deepEqual(rejected, [], "named in the Karma guide but rejected by the parser: " + rejected.join(", "));
        });

        it("should map every target it names to a real --target value", () => {
            const summary = _readKarmaSummary();
            const targets = summary.targets;

            assert.isObject(targets);
            const names = Object.keys(targets);
            for (let lp = 0; lp < names.length; lp++) {
                const result = _parse(["--target", names[lp], "spec.ts"]);

                assert.isUndefined(result.error, "--target " + names[lp] + " was rejected: " + result.error);
                assert.equal(result.target, names[lp]);
            }
        });

        it("should name browser launch modes the parser accepts", () => {
            const modes = Object.keys(_readKarmaSummary().browserLaunchModes);

            assert.isTrue(modes.length > 0);
            for (let lp = 0; lp < modes.length; lp++) {
                const result = _parse(["--browser-launch", modes[lp], "spec.ts"]);

                assert.isUndefined(result.error, "--browser-launch " + modes[lp] + " was rejected: " + result.error);
            }
        });

        it("should document the type-check default the parser actually applies", () => {
            const typeCheck = _readKarmaSummary().typeCheck;

            assert.isFalse(_isUnsupported(typeCheck.flag));
            assert.equal(_parse(["spec.ts"]).compile, typeCheck.default,
                "the guide states a --type-check default the parser does not apply");
        });

        it("should be reachable from the docs index", () => {
            // A guide nothing links to is a guide neither a user nor an agent will find.
            const index = fs.readFileSync(path.join(_repoRoot, "docs", "README.md"), "utf8");

            assert.includes(index, "migration/migrating-from-karma.md");
        });
    });

    /*
     * The Jest guide's block (§11) makes three kinds of claim an agent will act on without reading
     * the prose: that a tripwire flag exists, that an `expect` chain exists, and that a suite-API
     * name is exported. Each is pinned against the code here, as the Karma block's flags are. The
     * keys of its mapping objects are Jest's own names and are never checked against the parser --
     * except the ones mapped to `null`, which the guide says the CLI rejects, so they had better be.
     */
    describe("the Jest migration guide", () => {
        function _readJestSummary(): any {
            const markdown = fs.readFileSync(_jestGuide, "utf8");
            const re = /```json\r?\n([\s\S]*?)```/g;
            const blocks: string[] = [];
            let match: RegExpExecArray | null;

            while ((match = re.exec(markdown)) !== null) {
                blocks.push(match[1]);
            }

            assert.isTrue(blocks.length > 0, "no fenced ```json block found in " + _jestGuide);

            return JSON.parse(blocks[blocks.length - 1]);
        }

        /**
         * Every distinct `--flag` named anywhere in the summary's *values*. Object keys are the
         * Jest-side names (`--runInBand`, `--testNamePattern`) and are deliberately not walked.
         */
        function _flagsNamedIn(value: any, found: { [flag: string]: boolean }): void {
            if (typeof value === "string") {
                const matched = value.match(/--[a-z][a-z-]*/g);
                if (matched) {
                    for (let lp = 0; lp < matched.length; lp++) {
                        found[matched[lp]] = true;
                    }
                }
            } else if (value && typeof value === "object") {
                const keys = Object.keys(value);
                for (let lp = 0; lp < keys.length; lp++) {
                    _flagsNamedIn(value[keys[lp]], found);
                }
            }
        }

        /**
         * Resolves a dotted member path (`describe.only`, `to.deep.strictly.equal`) from a root
         * object, returning `undefined` as soon as a step is missing.
         */
        function _resolvePath(root: any, dotted: string): any {
            const parts = dotted.split(".");
            let current = root;

            for (let lp = 0; lp < parts.length; lp++) {
                if (current === null || current === undefined) {
                    return undefined;
                }
                current = current[parts[lp]];
            }

            return current;
        }

        it("should still be present and parse as JSON", () => {
            const summary = _readJestSummary();

            assert.isObject(summary);
            assert.equal(summary.cliCommand, "tripwire");
            assert.includes(summary.replacesCommands, "jest");
            assert.includes(summary.replacesCommands, "vitest");
        });

        it("should have every tripwire flag it names accepted by the parser", () => {
            // The whole point of the block: what it tells an agent to write has to actually run.
            const found: { [flag: string]: boolean } = {};
            _flagsNamedIn(_readJestSummary(), found);

            const flags = Object.keys(found);
            assert.isTrue(flags.length > 10, "expected the summary to name many flags, found " + flags.length);

            const rejected: string[] = [];
            for (let lp = 0; lp < flags.length; lp++) {
                if (_isUnsupported(flags[lp])) {
                    rejected.push(flags[lp]);
                }
            }

            assert.deepEqual(rejected, [], "named in the Jest guide but rejected by the parser: " + rejected.join(", "));
        });

        it("should have every Jest flag it maps to null actually rejected by the parser", () => {
            /*
             * The reverse direction. If the runner later grows one of these (`--config`, say), the
             * guide would be telling agents to strip a flag that now works.
             */
            const mapping = _readJestSummary().cliFlagMapping;
            const accepted: string[] = [];

            assert.isObject(mapping);

            const jestFlags = Object.keys(mapping);
            let nullMapped = 0;
            for (let lp = 0; lp < jestFlags.length; lp++) {
                if (mapping[jestFlags[lp]] === null && jestFlags[lp].charAt(0) === "-") {
                    nullMapped++;
                    if (!_isUnsupported(jestFlags[lp])) {
                        accepted.push(jestFlags[lp]);
                    }
                }
            }

            assert.isTrue(nullMapped > 10, "expected many null-mapped Jest flags, found " + nullMapped);
            assert.deepEqual(accepted, [], "documented as having no equivalent but the parser accepts: " + accepted.join(", "));
        });

        it("should map every target it names to a real --target value", () => {
            const targets = _readJestSummary().targets;

            assert.isObject(targets);
            const names = Object.keys(targets);
            assert.isTrue(names.length > 0);
            for (let lp = 0; lp < names.length; lp++) {
                const result = _parse(["--target", names[lp], "spec.ts"]);

                assert.isUndefined(result.error, "--target " + names[lp] + " was rejected: " + result.error);
                assert.equal(result.target, names[lp]);
            }
        });

        it("should map every testEnvironment to one of the named targets", () => {
            const summary = _readJestSummary();
            const envs = summary.testEnvironmentToTarget;

            assert.isObject(envs);
            const names = Object.keys(envs);
            for (let lp = 0; lp < names.length; lp++) {
                // hasProperty(obj, name, value) would read the message as the expected value.
                assert.isDefined(summary.targets[envs[names[lp]]],
                    "testEnvironment " + names[lp] + " maps to an unknown target " + envs[names[lp]]);
            }
        });

        it("should list the config file names the loader reads", () => {
            const to: string[] = _readJestSummary().configFile.to;

            assert.isArray(to);
            assert.lengthOf(to, 7, "the loader reads seven config file names");
            assert.includes(to, ".tripwirerc");
            assert.includes(to, "tripwire.config.cjs");
        });

        it("should document the type-check default the parser actually applies", () => {
            const defaults = _readJestSummary().defaults;

            assert.isBoolean(defaults.typeCheck);
            assert.equal(_parse(["spec.ts"]).compile, defaults.typeCheck,
                "the guide states a type-check default the parser does not apply");
        });

        it("should name a default reporter the parser accepts", () => {
            const reporter: string = _readJestSummary().defaults.reporter;
            const result = _parse(["--reporter", reporter, "spec.ts"]);

            assert.isUndefined(result.error, "--reporter " + reporter + " was rejected: " + result.error);
        });

        it("should have every expect chain it maps exist on a tripwire assertion instance", () => {
            /*
             * Each non-null matcherMapping value is `expect(x).<chain>(...)`. The chain words are
             * walked on a real instance without calling the terminator, so a renamed or removed
             * chain word (`strictly`, `nested`, `toThrow`) fails here rather than in a migrated suite.
             */
            const mapping = _readJestSummary().matcherMapping;
            const badForm: string[] = [];
            const missing: string[] = [];
            let checked = 0;

            assert.isObject(mapping);

            const jestNames = Object.keys(mapping);
            for (let lp = 0; lp < jestNames.length; lp++) {
                const form = mapping[jestNames[lp]];
                if (form === null) {
                    continue;
                }

                const chain = /^expect\([^)]*\)((?:\.[A-Za-z]+)+)\(/.exec(form);
                if (!chain) {
                    badForm.push(jestNames[lp] + " -> " + form);
                    continue;
                }

                const terminator = _resolvePath(expect(1), chain[1].substring(1));
                checked++;
                if (typeof terminator !== "function") {
                    missing.push(jestNames[lp] + " -> " + form);
                }
            }

            assert.deepEqual(badForm, [], "not an expect(x).<chain>(...) form, so it cannot be checked: " + badForm.join(", "));
            assert.isTrue(checked > 20, "expected many mapped matchers, found " + checked);
            assert.deepEqual(missing, [], "mapped to a chain tripwire's expect does not have: " + missing.join(", "));
        });

        it("should list as unsupported exactly the matchers it maps to null", () => {
            const summary = _readJestSummary();
            const mapping = summary.matcherMapping;
            const unsupported: string[] = summary.matchersUnsupported;
            const names = Object.keys(mapping);
            const disagreements: string[] = [];

            assert.isArray(unsupported);

            for (let lp = 0; lp < names.length; lp++) {
                const listed = unsupported.indexOf(names[lp]) !== -1;
                const isNull = mapping[names[lp]] === null;

                // expect.extend is null (no drop-in form) but is deliberately not "unsupported":
                // the guide points at addAssertInstFunc instead.
                if (names[lp] === "expect.extend") {
                    assert.isFalse(listed, "expect.extend has a replacement and must not be listed as unsupported");
                    continue;
                }

                if (listed !== isNull) {
                    disagreements.push(names[lp]);
                }
            }

            assert.deepEqual(disagreements, [], "matcherMapping and matchersUnsupported disagree on: " + disagreements.join(", "));
        });

        it("should have every suite API name it lists exported by @nevware21/tripwire", () => {
            const names: string[] = _readJestSummary().suiteApiExports;
            const missing: string[] = [];

            assert.isArray(names);
            assert.isTrue(names.length > 10);

            for (let lp = 0; lp < names.length; lp++) {
                if (typeof _resolvePath(tripwire, names[lp]) !== "function") {
                    missing.push(names[lp]);
                }
            }

            assert.deepEqual(missing, [], "listed as a tripwire suite API name but not exported: " + missing.join(", "));
        });

        it("should have every runtime global it lists exported by @nevware21/tripwire", () => {
            // The runner installs these from the package's own exports, so each must exist there.
            const names: string[] = _readJestSummary().globals.installedByRunnerAtRuntime;
            const missing: string[] = [];

            assert.isArray(names);

            for (let lp = 0; lp < names.length; lp++) {
                if (typeof (tripwire as any)[names[lp]] !== "function") {
                    missing.push(names[lp]);
                }
            }

            assert.deepEqual(missing, [], "listed as a runtime global but not exported: " + missing.join(", "));
        });

        it("should document that a bare -t is the timeout flag, as the guide warns", () => {
            // The one Jest habit most likely to bite: `jest -t name` becomes `tripwire -t name`.
            const result = _parse(["-t", "my test name", "spec.ts"]);

            assert.isDefined(result.error, "-t with a non-numeric value should be rejected as a bad timeout");
            assert.includes(result.error, "--timeout");
        });
    });
});
