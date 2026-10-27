/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "@nevware21/tripwire";
import { _parseArgs } from "../../../src/cli/parseArgs";
import { REPORTER_NAMES } from "../../../src/reporters/createReporter";
import { ITripwireConfig } from "../../../src/interfaces/ITripwireConfig";

/**
 * Parses with an explicitly empty file config so nothing depends on whichever `.tripwirerc`
 * happens to exist above this checkout or in the runner's home directory.
 */
function parse(args: string[], config?: ITripwireConfig): any {
    return _parseArgs(args, config || {} as ITripwireConfig);
}

describe("CLI argument parsing", () => {
    describe("help and errors", () => {
        it("should ask for help when given no arguments", () => {
            assert.isTrue(parse([]).help);
        });

        it("should ask for help for each of the help spellings, wherever they appear", () => {
            assert.isTrue(parse(["-h"]).help);
            assert.isTrue(parse(["--help"]).help);
            assert.isTrue(parse(["help"]).help);
            assert.isTrue(parse(["spec.ts", "--help"]).help, "help anywhere in the arguments wins");
        });

        it("should reject an unsupported option", () => {
            assert.includes(parse(["--no-such-flag", "spec.ts"]).error, "Unsupported option: --no-such-flag");
        });

        it("should require at least one file pattern", () => {
            assert.includes(parse(["--bail"]).error, "No file glob supplied");
        });

        it("should report a flag whose value is missing", () => {
            assert.includes(parse(["spec.ts", "--timeout"]).error, "Missing value for --timeout");
        });

        it("should treat a following flag as a missing value rather than consuming it", () => {
            assert.includes(parse(["spec.ts", "--timeout", "--bail"]).error, "Missing value for --timeout");
        });

        it("should report the missing value of every option that takes one, by its long name", () => {
            const options: { [flag: string]: string } = {
                "--slow": "slow", "-s": "slow", "--retries": "retries", "--grep": "grep", "-g": "grep", "--fgrep": "fgrep",
                "-f": "fgrep", "--ignore": "ignore", "--coverage-instrumenter": "coverage-instrumenter",
                "--erased-coverage-mode": "erased-coverage-mode", "--coverage-reporter": "coverage-reporter",
                "--coverage-src": "coverage-src", "--reporter": "reporter", "--server-root": "server-root", "--target": "target",
                "--env": "env", "--browser-launch": "browser-launch", "--browser-style": "browser-style", "--ux-provider": "ux-provider",
                "--project": "project", "-p": "project", "--tsProject": "project", "--ts-project": "project",
                "--type-check-scope": "type-check-scope", "--spec": "spec", "--file": "file", "--require": "require", "-r": "require"
            };

            Object.keys(options).forEach((flag) => {
                assert.includes(parse(["spec.ts", flag]).error, "Missing value for --" + options[flag], flag);
                if (flag.indexOf("--") === 0) {
                    assert.includes(parse(["spec.ts", flag + "="]).error, "Missing value for --" + options[flag], flag + "= with nothing after it");
                }
            });
        });
    });

    describe("file patterns", () => {
        it("should collect bare arguments as patterns", () => {
            assert.deepEqual(parse(["a.test.ts", "b.test.ts"]).patterns, ["a.test.ts", "b.test.ts"]);
        });

        it("should collect --spec values as patterns too", () => {
            assert.deepEqual(parse(["--spec", "a.test.ts", "--spec=b.test.ts"]).patterns, ["a.test.ts", "b.test.ts"]);
        });

        it("should treat everything after -- as patterns, flags included", () => {
            assert.deepEqual(parse(["a.test.ts", "--", "--not-a-flag", "b.test.ts"]).patterns,
                ["a.test.ts", "--not-a-flag", "b.test.ts"]);
        });

        it("should append CLI patterns after any the config file supplied", () => {
            const parsed = parse(["cli.test.ts"], { spec: ["config.test.ts"] } as ITripwireConfig);

            assert.deepEqual(parsed.patterns, ["config.test.ts", "cli.test.ts"]);
        });
    });

    describe("numeric flags", () => {
        it("should accept both the separated and inline forms", () => {
            assert.equal(parse(["spec.ts", "--timeout", "5000"]).timeout, 5000);
            assert.equal(parse(["spec.ts", "--timeout=5000"]).timeout, 5000);
            assert.equal(parse(["spec.ts", "-t", "5000"]).timeout, 5000);
        });

        it("should accept slow and retries in the same forms", () => {
            assert.equal(parse(["spec.ts", "--slow=75"]).slow, 75);
            assert.equal(parse(["spec.ts", "-s", "75"]).slow, 75);
            assert.equal(parse(["spec.ts", "--retries=2"]).retries, 2);
        });

        it("should reject a non-numeric or negative value", () => {
            assert.includes(parse(["spec.ts", "--timeout=abc"]).error, "Invalid value for --timeout");
            assert.includes(parse(["spec.ts", "--slow=-1"]).error, "Invalid value for --slow");
            assert.includes(parse(["spec.ts", "--retries=nope"]).error, "Invalid value for --retries");
        });

        it("should accept zero", () => {
            assert.equal(parse(["spec.ts", "--timeout=0"]).timeout, 0, "zero disables the timeout rather than being invalid");
        });

        it("should let a CLI value override the config file's", () => {
            assert.equal(parse(["spec.ts", "--timeout=1"], { timeout: 9999 } as ITripwireConfig).timeout, 1);
        });

        it("should fall back to the config file's value", () => {
            assert.equal(parse(["spec.ts"], { timeout: 9999 } as ITripwireConfig).timeout, 9999);
        });
    });

    describe("boolean flags", () => {
        it("should default the switches to off", () => {
            const parsed = parse(["spec.ts"]);

            assert.isFalse(parsed.bail);
            assert.isFalse(parsed.invert);
            assert.isFalse(parsed.trace);
            assert.isFalse(parsed.coverage);
            assert.isFalse(parsed.failOnHook);
            assert.isFalse(parsed.watch);
            assert.isFalse(parsed.verbose);
        });

        it("should turn each switch on", () => {
            const parsed = parse(["spec.ts", "--bail", "--invert", "--trace", "--coverage", "--fail-on-hook", "--watch", "--verbose", "--show-files", "--source-maps"]);

            assert.isTrue(parsed.bail);
            assert.isTrue(parsed.invert);
            assert.isTrue(parsed.trace);
            assert.isTrue(parsed.coverage);
            assert.isTrue(parsed.failOnHook);
            assert.isTrue(parsed.watch);
            assert.isTrue(parsed.verbose);
            assert.isTrue(parsed.showFiles);
            assert.isTrue(parsed.sourceMaps);
        });

        it("should accept -b as an alias for --bail", () => {
            assert.isTrue(parse(["spec.ts", "-b"]).bail);
        });

        it("should let a --no- form turn a config-file switch back off", () => {
            assert.isFalse(parse(["spec.ts", "--no-coverage"], { coverage: true } as ITripwireConfig).coverage);
            assert.isFalse(parse(["spec.ts", "--no-fail-on-hook"], { failOnHook: true } as ITripwireConfig).failOnHook);
        });

        it("should default bundling on and let --no-bundle turn it off", () => {
            assert.isTrue(parse(["spec.ts"]).bundle, "bundling is on by default");
            assert.isFalse(parse(["spec.ts", "--no-bundle"]).bundle);
            assert.isTrue(parse(["spec.ts", "--bundle"], { bundle: false } as ITripwireConfig).bundle);
        });

        it("should map --type-check and --transpile-only onto compile", () => {
            assert.isTrue(parse(["spec.ts", "--type-check"]).compile);
            assert.isFalse(parse(["spec.ts", "--transpile-only"]).compile);
            assert.isFalse(parse(["spec.ts"]).compile, "compilation is off unless asked for");
        });
    });

    describe("--type-check / --transpile-only", () => {
        it("should default to transpile-only", () => {
            assert.isFalse(parse(["spec.ts"]).compile, "type-checking is off unless asked for");
        });

        it("should turn checking on and off", () => {
            assert.isTrue(parse(["spec.ts", "--type-check"]).compile);
            assert.isFalse(parse(["spec.ts", "--transpile-only"]).compile);
        });

        it("should accept the negated spellings of each", () => {
            assert.isFalse(parse(["spec.ts", "--no-type-check"]).compile);
            assert.isTrue(parse(["spec.ts", "--no-transpile-only"]).compile);
        });

        it("should accept the --compile aliases", () => {
            assert.isTrue(parse(["spec.ts", "--compile"]).compile);
            assert.isFalse(parse(["spec.ts", "--no-compile"]).compile);
        });

        it("should let the last flag on the command line win", () => {
            // The two are opposites writing one setting, so they compose rather than conflict.
            assert.isFalse(parse(["spec.ts", "--type-check", "--transpile-only"]).compile);
            assert.isTrue(parse(["spec.ts", "--transpile-only", "--type-check"]).compile);
            assert.isTrue(parse(["spec.ts", "--type-check", "--transpile-only", "--type-check"]).compile);
        });

        it("should take the default from a config file's typeCheck", () => {
            assert.isTrue(parse(["spec.ts"], { typeCheck: true } as ITripwireConfig).compile);
            assert.isFalse(parse(["spec.ts"], { typeCheck: false } as ITripwireConfig).compile);
        });

        it("should let --transpile-only override a config file that enables checking", () => {
            // The point of the pair: a project can default to checking and still skip it for a
            // single run without editing the config.
            assert.isFalse(parse(["spec.ts", "--transpile-only"], { typeCheck: true } as ITripwireConfig).compile);
            assert.isFalse(parse(["spec.ts", "--no-compile"], { typeCheck: true } as ITripwireConfig).compile);
        });

        it("should let --type-check override a config file that disables checking", () => {
            assert.isTrue(parse(["spec.ts", "--type-check"], { typeCheck: false } as ITripwireConfig).compile);
        });

        it("should treat an absent config typeCheck as transpile-only", () => {
            assert.isFalse(parse(["spec.ts"], {} as ITripwireConfig).compile);
        });
    });

    describe("--strict-type-check", () => {
        it("should default to warning about files the type-check missed", () => {
            assert.isFalse(parse(["spec.ts"]).strictTypeCheck);
            assert.isFalse(parse(["spec.ts", "--type-check"]).strictTypeCheck);
        });

        it("should turn the type-check on, since it is a promise about that check", () => {
            const parsed = parse(["spec.ts", "--strict-type-check"]);

            assert.isTrue(parsed.strictTypeCheck);
            assert.isTrue(parsed.compile, "implies --type-check");
        });

        it("should still imply --type-check over a config file that disabled it", () => {
            // A config `typeCheck: false` is a default, not an explicit CLI refusal, so the
            // promise --strict-type-check makes about the check still turns it on.
            assert.isTrue(parse(["spec.ts", "--strict-type-check"], { typeCheck: false } as ITripwireConfig).compile);
        });

        it("should not override an explicit request not to compile at all", () => {
            assert.isFalse(parse(["spec.ts", "--transpile-only", "--strict-type-check"]).compile);
            assert.isFalse(parse(["spec.ts", "--strict-type-check", "--no-compile"]).compile);
        });

        it("should let --no-strict-type-check turn off a config file's setting", () => {
            assert.isTrue(parse(["spec.ts"], { strictTypeCheck: true } as ITripwireConfig).strictTypeCheck);
            assert.isFalse(parse(["spec.ts", "--no-strict-type-check"], { strictTypeCheck: true } as ITripwireConfig).strictTypeCheck);
        });
    });

    describe("--debug-stack", () => {
        it("should be off unless asked for", () => {
            assert.isFalse(parse(["spec.ts"]).debugStack);
        });

        it("should be settable from the CLI and from a config file", () => {
            assert.isTrue(parse(["spec.ts", "--debug-stack"]).debugStack);
            assert.isTrue(parse(["spec.ts"], { debugStack: true } as ITripwireConfig).debugStack);
        });

        it("should not be mistaken for a file pattern", () => {
            assert.deepEqual(parse(["spec.ts", "--debug-stack"]).patterns, ["spec.ts"]);
        });
    });

    describe("--grep and --fgrep", () => {
        it("should build a case-insensitive RegExp from --grep", () => {
            const parsed = parse(["spec.ts", "--grep", "My Test"]);

            assert.equal(parsed.grep.length, 1);
            assert.isTrue(parsed.grep[0].test("my test"), "the pattern should be case-insensitive");
        });

        it("should accumulate several patterns", () => {
            assert.equal(parse(["spec.ts", "--grep=a", "-g", "b"]).grep.length, 2);
        });

        it("should treat --fgrep as a literal string", () => {
            const parsed = parse(["spec.ts", "--fgrep", "a.b(c)"]);

            assert.equal(parsed.grep.length, 1);
            assert.isTrue(parsed.grep[0].test("a.b(c)"), "the literal text should match");
            assert.isFalse(parsed.grep[0].test("axbXcY"), "the regex metacharacters should have been escaped");
        });

        it("should seed patterns from the config file before the CLI's", () => {
            const parsed = parse(["spec.ts", "--grep", "fromCli"], { grep: ["fromConfig"] } as ITripwireConfig);

            assert.equal(parsed.grep.length, 2);
            assert.isTrue(parsed.grep[0].test("FROMCONFIG"));
            assert.isTrue(parsed.grep[1].test("FROMCLI"));
        });

        it("should silently drop an unparseable pattern from the config file", () => {
            assert.equal(parse(["spec.ts"], { grep: ["("] } as ITripwireConfig).grep.length, 0);
        });
    });

    describe("--reporter", () => {
        it("should default to spec", () => {
            assert.deepEqual(parse(["spec.ts"]).reporter, ["spec"]);
        });

        it("should accept every advertised reporter name", () => {
            for (let lp = 0; lp < REPORTER_NAMES.length; lp++) {
                const parsed = parse(["spec.ts", "--reporter", REPORTER_NAMES[lp]]);
                assert.deepEqual(parsed.reporter, [REPORTER_NAMES[lp]], REPORTER_NAMES[lp] + " should be accepted");
            }
        });

        it("should reject an unknown name at the CLI boundary", () => {
            const parsed = parse(["spec.ts", "--reporter", "no-such-reporter"]);

            assert.includes(parsed.error, "Invalid --reporter 'no-such-reporter'");
            assert.includes(parsed.error, "spec", "the message should list the valid names");
        });

        it("should accept a comma-separated list", () => {
            assert.deepEqual(parse(["spec.ts", "--reporter", "spec,tap"]).reporter, ["spec", "tap"]);
        });

        it("should combine repeated flags", () => {
            assert.deepEqual(parse(["spec.ts", "--reporter=tap", "--reporter=xunit"]).reporter, ["tap", "xunit"]);
        });

        // A CLI --reporter replaces the config file's list rather than appending to it,
        // otherwise selecting a single reporter on the CLI would be impossible once a config
        // file named one.
        it("should replace, not extend, the config file's reporters", () => {
            assert.deepEqual(parse(["spec.ts", "--reporter=tap"], { reporters: ["xunit"] } as ITripwireConfig).reporter, ["tap"]);
        });

        it("should use the config file's reporters when the CLI names none", () => {
            assert.deepEqual(parse(["spec.ts"], { reporters: ["tap", "xunit"] } as ITripwireConfig).reporter, ["tap", "xunit"]);
        });

        it("should accept `reporter` as an alias for `reporters` in a config file", () => {
            assert.deepEqual(parse(["spec.ts"], { reporter: ["tap"] } as any).reporter, ["tap"]);
        });

        it("should reject an unknown name coming from a config file", () => {
            assert.includes(parse(["spec.ts"], { reporters: ["nope"] } as any).error, "Invalid config 'reporters' entry 'nope'");
        });

        // REPORTER-EXT: a value that could not be a built-in name is a custom reporter module,
        // passed through untouched for `execute/reporter.ts` to require() at run time. Whether
        // it resolves is that loader's question -- the parser's job is only to stop treating
        // every non-built-in value as a typo.
        describe("custom reporter modules", () => {
            it("should accept a relative path", () => {
                assert.deepEqual(parse(["spec.ts", "--reporter", "./reporters/mine.js"]).reporter, ["./reporters/mine.js"]);
            });

            it("should accept a scoped package", () => {
                assert.deepEqual(parse(["spec.ts", "--reporter", "@me/tripwire-reporter"]).reporter, ["@me/tripwire-reporter"]);
            });

            it("should accept a bare package behind the module: prefix", () => {
                assert.deepEqual(parse(["spec.ts", "--reporter", "module:my-reporter"]).reporter, ["module:my-reporter"]);
            });

            it("should accept a module alongside built-in names", () => {
                assert.deepEqual(parse(["spec.ts", "--reporter", "spec,./mine.js"]).reporter, ["spec", "./mine.js"]);
            });

            it("should accept a module from a config file", () => {
                assert.deepEqual(parse(["spec.ts"], { reporters: ["./mine.js"] } as ITripwireConfig).reporter, ["./mine.js"]);
            });

            // The half that must not regress: a bare word is still a typo, not a package to go
            // looking for -- otherwise `--reporter spce` becomes a module-resolution failure.
            it("should still reject a bare unknown name", () => {
                assert.includes(parse(["spec.ts", "--reporter", "spce"]).error, "Invalid --reporter 'spce'");
            });

            it("should tell the user a custom module is an option when a name is rejected", () => {
                const parsed = parse(["spec.ts", "--reporter", "spce"]);

                assert.includes(parsed.error, "custom reporter module");
                assert.includes(parsed.error, "module:");
            });
        });
    });

    describe("--target", () => {
        it("should default to node", () => {
            assert.equal(parse(["spec.ts"]).target, "node");
        });

        it("should accept each supported target, case-insensitively", () => {
            assert.equal(parse(["spec.ts", "--target", "browser"]).target, "browser");
            assert.equal(parse(["spec.ts", "--target=worker"]).target, "worker");
            assert.equal(parse(["spec.ts", "--target", "BROWSER"]).target, "browser");
        });

        it("should accept --env as an alias", () => {
            assert.equal(parse(["spec.ts", "--env", "worker"]).target, "worker");
        });

        it("should reject an unknown target, naming the flag that was used", () => {
            assert.includes(parse(["spec.ts", "--target", "deno"]).error, "Invalid value for --target: deno");
            assert.includes(parse(["spec.ts", "--env", "deno"]).error, "Invalid value for --env: deno");
        });
    });

    describe("--browser-launch and --browser-style", () => {
        it("should default to puppeteer and the classic style", () => {
            const parsed = parse(["spec.ts"]);

            assert.equal(parsed.browserLaunch, "puppeteer");
            assert.equal(parsed.browserStyle, "classic");
        });

        it("should take the style from --browser-style, case-insensitively", () => {
            assert.equal(parse(["spec.ts", "--browser-style", "SLATE"]).browserStyle, "slate");
            assert.equal(parse(["spec.ts", "--browser-style=classic"]).browserStyle, "classic");
        });

        it("should accept each launch mode", () => {
            assert.equal(parse(["spec.ts", "--browser-launch", "open"]).browserLaunch, "open");
            assert.equal(parse(["spec.ts", "--browser-launch=manual"]).browserLaunch, "manual");
            assert.equal(parse(["spec.ts", "--open-browser"]).browserLaunch, "open");
            assert.equal(parse(["spec.ts", "--manual-browser"]).browserLaunch, "manual");
        });

        it("should accept a mode:style pair", () => {
            const parsed = parse(["spec.ts", "--browser-launch", "open:slate"]);

            assert.equal(parsed.browserLaunch, "open");
            assert.equal(parsed.browserStyle, "slate");
        });

        it("should reject an unknown mode or style", () => {
            assert.includes(parse(["spec.ts", "--browser-launch", "firefox"]).error, "Invalid value for --browser-launch");
            assert.includes(parse(["spec.ts", "--browser-launch", "open:neon"]).error, "Invalid style in --browser-launch: neon");
            assert.includes(parse(["spec.ts", "--browser-style", "neon"]).error, "Invalid value for --browser-style");
        });
    });

    describe("--project", () => {
        it("should default to tsconfig.json", () => {
            assert.equal(parse(["spec.ts"]).project, "tsconfig.json");
        });

        it("should accept each of its spellings", () => {
            assert.equal(parse(["spec.ts", "--project", "a.json"]).project, "a.json");
            assert.equal(parse(["spec.ts", "--project=b.json"]).project, "b.json");
            assert.equal(parse(["spec.ts", "-p", "c.json"]).project, "c.json");
            assert.equal(parse(["spec.ts", "--tsProject=d.json"]).project, "d.json");
            assert.equal(parse(["spec.ts", "--ts-project", "e.json"]).project, "e.json");
        });

        // `tsconfig` as a string is just another way to set `project`, so it follows the same
        // CLI-wins precedence; as an object it is a layer of compiler-option overrides, which
        // applies regardless.
        it("should let a CLI --project beat a config file's string tsconfig", () => {
            const parsed = parse(["spec.ts", "-p", "cli.json"], { tsconfig: "config.json" } as any);

            assert.equal(parsed.project, "cli.json");
        });

        it("should take a config file's string tsconfig when the CLI names no project", () => {
            assert.equal(parse(["spec.ts"], { tsconfig: "config.json" } as any).project, "config.json");
        });

        it("should keep an object tsconfig as overrides regardless of --project", () => {
            const parsed = parse(["spec.ts", "-p", "cli.json"], { tsconfig: { strict: true } } as any);

            assert.equal(parsed.project, "cli.json");
            assert.deepEqual(parsed.tsconfigOverrides, { strict: true });
        });
    });

    describe("other value flags", () => {
        it("should collect --ignore patterns", () => {
            assert.deepEqual(parse(["spec.ts", "--ignore", "**/skip/**", "--ignore=**/also/**"]).ignore,
                ["**/skip/**", "**/also/**"]);
        });

        it("should collect --require and --file into preload", () => {
            assert.deepEqual(parse(["spec.ts", "--require", "ts-node/register", "-r", "dotenv/config", "--file=setup.js"]).preload,
                ["ts-node/register", "dotenv/config", "setup.js"]);
        });

        it("should collect comma-separated --coverage-reporter names", () => {
            assert.deepEqual(parse(["spec.ts", "--coverage-reporter", "text,lcov", "--coverage-reporter=html"]).coverageReporters,
                ["text", "lcov", "html"]);
        });

        it("should collect comma-separated and repeated --coverage-src globs", () => {
            assert.deepEqual(parse(["spec.ts", "--coverage-src", "lib/**/*.ts,app/**/*.ts", "--coverage-src=extra/**/*.ts"]).coverageSrc,
                ["lib/**/*.ts", "app/**/*.ts", "extra/**/*.ts"]);
        });

        it("should leave --coverage-src empty when unset, so the src/** default applies", () => {
            // Deliberately empty rather than pre-seeded: _coverageSrcPatterns owns the default,
            // so a config file setting it is not silently concatenated onto "src/**/*.ts".
            assert.deepEqual(parse(["spec.ts"]).coverageSrc, []);
        });

        it("should append CLI --coverage-src after a config file's coverageSrc", () => {
            assert.deepEqual(parse(["spec.ts", "--coverage-src", "app/**/*.ts"], { coverageSrc: ["lib/**/*.ts"] }).coverageSrc,
                ["lib/**/*.ts", "app/**/*.ts"]);
        });

        it("should validate --erased-coverage-mode", () => {
            assert.equal(parse(["spec.ts", "--erased-coverage-mode", "full"]).erasedCoverageMode, "full");
            assert.equal(parse(["spec.ts"]).erasedCoverageMode, "zero", "zero is the default");
            assert.includes(parse(["spec.ts", "--erased-coverage-mode=partial"]).error, "Invalid --erased-coverage-mode 'partial'");
        });

        it("should carry --server-root through, and leave it undefined when unset", () => {
            assert.equal(parse(["spec.ts", "--server-root", "./public"]).serverRoot, "./public");
            assert.isUndefined(parse(["spec.ts"]).serverRoot);
        });

        it("should leave bindAddress undefined unless asked for, so the server keeps its loopback default", () => {
            assert.isUndefined(parse(["spec.ts"]).bindAddress);
            assert.equal(parse(["spec.ts", "--bind-address", "0.0.0.0"]).bindAddress, "0.0.0.0");
            assert.equal(parse(["spec.ts", "--bind-address=192.168.1.10"]).bindAddress, "192.168.1.10");
        });

        it("should take bindAddress from a config file and let the CLI override it", () => {
            assert.equal(parse(["spec.ts"], { bindAddress: "0.0.0.0" } as ITripwireConfig).bindAddress, "0.0.0.0");
            assert.equal(parse(["spec.ts", "--bind-address=127.0.0.1"], { bindAddress: "0.0.0.0" } as ITripwireConfig).bindAddress, "127.0.0.1");
        });

        it("should carry the coverage instrumenter, the UX provider and the source map choice through", () => {
            const parsed = parse(["spec.ts", "--coverage-instrumenter", "none", "--ux-provider=./ux.js", "--source-maps", "--no-source-maps"]);

            assert.equal(parsed.coverageInstrumenter, "none");
            assert.equal(parsed.uxProvider, "./ux.js");
            assert.isFalse(parsed.sourceMaps, "the last of --source-maps and --no-source-maps wins");
        });

        it("should reject a --grep pattern that is not a valid regular expression", () => {
            assert.includes(parse(["spec.ts", "--grep", "(unclosed"]).error, "Invalid value for --grep: (unclosed");
        });

        it("should report a missing --bind-address value", () => {
            assert.includes(parse(["spec.ts", "--bind-address"]).error, "Missing value for --bind-address");
        });

        it("should toggle the dev server off and back on", () => {
            assert.isFalse(parse(["spec.ts"]).noServer, "the server is on by default");
            assert.isTrue(parse(["spec.ts", "--no-server"]).noServer);
            assert.isFalse(parse(["spec.ts", "--server"], { noServer: true } as ITripwireConfig).noServer);
        });
    });

    describe("compile caching and type-check scope", () => {

        it("should keep the incremental type-check state off by default", () => {
            // It measured no benefit, and the emit cache supersedes it -- see ITripwireConfig.incremental.
            assert.isFalse(parse(["spec.ts"]).incremental);
        });

        it("should turn the incremental state on and back off", () => {
            assert.isTrue(parse(["spec.ts", "--incremental"]).incremental);
            assert.isFalse(parse(["spec.ts", "--incremental", "--no-incremental"]).incremental, "the last flag wins");
        });

        it("should take the incremental state from the config file", () => {
            assert.isTrue(parse(["spec.ts"], { incremental: true } as ITripwireConfig).incremental);
            assert.isFalse(parse(["spec.ts", "--no-incremental"], { incremental: true } as ITripwireConfig).incremental,
                "a CLI flag beats the config file");
        });

        it("should build the module graph on the main thread by default", () => {
            // Measured no benefit -- see ITripwireConfig.graphThread and _startGraphWorker.
            assert.isFalse(parse(["spec.ts"]).graphThread);
        });

        it("should turn the graph thread on and back off", () => {
            assert.isTrue(parse(["spec.ts", "--graph-thread"]).graphThread);
            assert.isFalse(parse(["spec.ts", "--graph-thread", "--no-graph-thread"]).graphThread, "the last flag wins");
        });

        it("should take the graph thread from the config file", () => {
            assert.isTrue(parse(["spec.ts"], { graphThread: true } as ITripwireConfig).graphThread);
            assert.isFalse(parse(["spec.ts", "--no-graph-thread"], { graphThread: true } as ITripwireConfig).graphThread,
                "a CLI flag beats the config file");
        });

        it("should keep isolated transpile off by default", () => {
            // It cannot resolve an ambient `declare const enum`, so it has to be asked for.
            assert.isFalse(parse(["spec.ts"]).isolatedTranspile);
        });

        it("should turn isolated transpile on and back off", () => {
            assert.isTrue(parse(["spec.ts", "--isolated-transpile"]).isolatedTranspile);
            assert.isFalse(parse(["spec.ts", "--isolated-transpile", "--no-isolated-transpile"]).isolatedTranspile);
        });

        it("should take isolated transpile from the config file", () => {
            assert.isTrue(parse(["spec.ts"], { isolatedTranspile: true } as ITripwireConfig).isolatedTranspile);
            assert.isFalse(parse(["spec.ts", "--no-isolated-transpile"], { isolatedTranspile: true } as ITripwireConfig).isolatedTranspile);
        });

        it("should keep the emit cache on by default", () => {
            assert.isTrue(parse(["spec.ts"]).emitCache);
        });

        it("should turn the emit cache off and back on", () => {
            assert.isFalse(parse(["spec.ts", "--no-emit-cache"]).emitCache);
            assert.isTrue(parse(["spec.ts", "--no-emit-cache", "--emit-cache"]).emitCache);
        });

        it("should take the emit cache from the config file", () => {
            assert.isFalse(parse(["spec.ts"], { emitCache: false } as ITripwireConfig).emitCache);
        });

        it("should check the whole project by default", () => {
            assert.equal(parse(["spec.ts"]).typeCheckScope, "project");
        });

        it("should accept a narrowed type-check scope", () => {
            assert.equal(parse(["spec.ts", "--type-check-scope", "run"]).typeCheckScope, "run");
            assert.equal(parse(["spec.ts", "--type-check-scope=run"]).typeCheckScope, "run");
            assert.equal(parse(["spec.ts", "--type-check-scope", "RUN"]).typeCheckScope, "run", "the value is not case sensitive");
        });

        it("should accept the project scope explicitly", () => {
            assert.equal(parse(["spec.ts", "--type-check-scope", "run", "--type-check-scope", "project"]).typeCheckScope, "project");
        });

        it("should take the type-check scope from the config file", () => {
            assert.equal(parse(["spec.ts"], { typeCheckScope: "run" } as ITripwireConfig).typeCheckScope, "run");
            assert.equal(parse(["spec.ts", "--type-check-scope", "project"], { typeCheckScope: "run" } as ITripwireConfig).typeCheckScope, "project");
        });

        it("should reject an unknown type-check scope", () => {
            const result = parse(["spec.ts", "--type-check-scope", "everything"]);

            assert.isString(result.error);
            assert.isTrue(result.error.indexOf("everything") !== -1, "the error should name the rejected value");
        });

        it("should normalise the config file's type-check scope the way the flag is", () => {
            assert.equal(parse(["spec.ts"], { typeCheckScope: "Run" } as any).typeCheckScope, "run");
            assert.equal(parse(["spec.ts"], { typeCheckScope: "PROJECT" } as any).typeCheckScope, "project");
        });

        it("should reject an unknown type-check scope in the config file rather than defaulting it", () => {
            // Any value other than exactly "run" used to fall back to "project" silently, so a typo
            // in .tripwirerc widened the check without saying so.
            const result = parse(["spec.ts"], { typeCheckScope: "everything" } as any);

            assert.isString(result.error);
            assert.isTrue(result.error.indexOf("everything") !== -1, "the error should name the rejected value");
            assert.isTrue(result.error.indexOf("config") !== -1, "the error should say where the value came from");
        });
    });
});
