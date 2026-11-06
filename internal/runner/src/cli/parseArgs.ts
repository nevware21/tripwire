/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

/**
 * The CLI's argument parser, extracted from `tripwire.ts` so it can be exercised directly by
 * `test/src/cli/parseArgs.test.ts` -- `tripwire.ts` itself reaches the `ux` barrel (via
 * `execute.ts`), whose inlined `.html`/`.css` imports only resolve through rollup, so it
 * cannot be `require()`d from a plain node test.
 */

import { loadConfig } from "../config/loader";
import { ITripwireConfig } from "../interfaces/ITripwireConfig";
import { IBrowserUiTheme } from "../ux/types/BrowserUiTheme";
import { mergeBrowserThemes, parseBrowserTheme } from "../shared/browserTheme";
import { REPORTER_NAMES } from "../reporters";
import { _REPORTER_MODULE_PREFIX, _isReporterModuleSpec } from "../internal/reporterSpec";

// Widened to a plain string[] since every use here (`.indexOf(userSuppliedString)`) compares
// against arbitrary CLI/config input, not the literal `ReporterName` union `REPORTER_NAMES` is
// typed as.
export const _REPORTER_NAMES: readonly string[] = REPORTER_NAMES;

/**
 * Validates one configured reporter value, from either selection path.
 *
 * A module specifier (`./my-reporter.js`, `@scope/pkg`, `module:my-reporter` -- see
 * `_isReporterModuleSpec`) is accepted as-is: whether it resolves, and whether what it exports is
 * really a listener, is the loader's question, asked at run time by `execute/reporter.ts` where
 * `require` exists. Anything else must be a built-in name, so a plain typo is still rejected here
 * with the list -- now also naming the custom-reporter route, since "expected one of: ..." on its
 * own used to read as "that is the entire set of possibilities".
 *
 * @returns The error message, or `""` when the value is acceptable.
 */
function _validateReporter(value: string, where: string): string {
    if (_isReporterModuleSpec(value) || _REPORTER_NAMES.indexOf(value) !== -1) {
        return "";
    }

    return "Invalid " + where + " '" + value + "'. Expected one of: " + _REPORTER_NAMES.join(", ") +
        " -- or a custom reporter module (a path such as ./my-reporter.js, a scoped package, or " +
        _REPORTER_MODULE_PREFIX + "<package>).";
}

export function _isHelpArg(value: string) {
    return value === "-h" || value === "--help" || value === "help";
}

/**
 * Turns `process.argv`-style arguments into the settings object {@link runCli} hands to
 * `_execute`, applying CLI flags on top of the discovered config file(s).
 *
 * @param args - The arguments, `process.argv.slice(2)` in the real CLI.
 * @param config - The already-merged file config to layer the flags over. Defaults to
 * discovering it from `process.cwd()`, which is what the CLI wants and what tests do not:
 * passing `{}` (or a fixture) makes parsing hermetic, rather than dependent on whatever
 * `.tripwirerc` happens to exist above the checkout or in the runner's home directory.
 * @internal
 */
export function _parseArgs(args: string[], config?: ITripwireConfig) {
    if (!args.length || _isHelpArg(args[0])) {
        return {
            help: true
        };
    }

    // Load file-based config from cwd → root → home.  CLI flags override all.
    const fileConfig = config || loadConfig(process.cwd());

    // `compile` is the single piece of state behind --type-check / --transpile-only: they are
    // two spellings of one boolean, so each simply assigns it and the last flag on the command
    // line wins. It starts from the config file's `typeCheck` (default false = transpile-only),
    // and `compileFromCli` records whether any flag touched it, so a CLI flag always beats the
    // config regardless of which way it points.
    let compile = fileConfig.typeCheck === undefined ? undefined : !!fileConfig.typeCheck;
    let compileFromCli = false;
    let strictTypeCheck = fileConfig.strictTypeCheck || false;
    let incremental = fileConfig.incremental === undefined ? false : !!fileConfig.incremental;
    let graphThread = fileConfig.graphThread === undefined ? false : !!fileConfig.graphThread;
    let isolatedTranspile = fileConfig.isolatedTranspile === undefined ? false : !!fileConfig.isolatedTranspile;
    let emitCache = fileConfig.emitCache === undefined ? true : !!fileConfig.emitCache;
    // Normalised and validated the same way the CLI flag is below: `"Run"` is accepted, and a typo
    // is an error rather than a silent fall-back to `"project"`.
    let typeCheckScope: "run" | "project" = "project";
    if (fileConfig.typeCheckScope !== undefined && fileConfig.typeCheckScope !== null) {
        const configScope = String(fileConfig.typeCheckScope).toLowerCase();
        if (configScope !== "run" && configScope !== "project") {
            return {
                error: "Invalid typeCheckScope value '" + fileConfig.typeCheckScope + "' in the config file, expected 'run' or 'project'."
            };
        }

        typeCheckScope = configScope;
    }
    let debugStack = fileConfig.debugStack || false;
    let slow = fileConfig.slow;
    let timeout = fileConfig.timeout;
    let retries = fileConfig.retries;
    let invert = fileConfig.invert || false;
    let bail = fileConfig.bail || false;
    let failOnHook = fileConfig.failOnHook || false;
    let trace = fileConfig.trace || false;
    let coverage = fileConfig.coverage || false;
    let coverageInstrumenter = fileConfig.coverageInstrumenter || "istanbul-lib-instrument";
    let erasedCoverageMode = fileConfig.erasedCoverageMode || "zero";
    const coverageReporters: string[] = (fileConfig.coverageReporters || []).slice();
    const coverageSrc: string[] = (fileConfig.coverageSrc || []).slice();
    let reporter: string[] = [];
    let reporterFromCli = false;
    // `reporters` (matching `coverageReporters`' plural convention) is the documented name;
    // `reporter` is accepted as an alias since it also matches the `--reporter` CLI flag's
    // name -- `reporters` wins if a config file somehow sets both.
    const fileReporters = fileConfig.reporters || fileConfig.reporter || [];
    for (let fr = 0; fr < fileReporters.length; fr++) {
        const fileReporterError = _validateReporter(fileReporters[fr], "config 'reporters' entry");
        if (fileReporterError) {
            return {
                error: fileReporterError
            };
        }
        reporter.push(fileReporters[fr]);
    }
    let sourceMaps = fileConfig.sourceMaps || false;
    let showFiles = fileConfig.showFiles || false;
    let verbose = fileConfig.verbose || false;
    let watch = fileConfig.watch || false;
    let project = fileConfig.project || "tsconfig.json";
    let projectFromCli = false;
    let target = fileConfig.target || "node";
    let browserLaunch = fileConfig.browserLaunch || "puppeteer";
    let browserStyle = fileConfig.browserStyle || "classic";
    // How the interactive page looks: the config file's, with --browser-theme's parts in place of
    // the ones it names. An unknown word is an error rather than silently ignored.
    let browserTheme: IBrowserUiTheme | undefined;
    if (fileConfig.browserTheme !== undefined && fileConfig.browserTheme !== null) {
        const configTheme = parseBrowserTheme(fileConfig.browserTheme);
        if (configTheme.error) {
            return {
                error: "Invalid browserTheme value in the config file: " + configTheme.error
            };
        }

        browserTheme = configTheme.theme;
    }

    let uxProvider = fileConfig.uxProvider;
    let serverRoot = fileConfig.serverRoot || "";
    let bindAddress = fileConfig.bindAddress || "";
    let noServer = !!fileConfig.noServer;
    // Defaults on for both browser and worker, any --browser-launch mode: see
    // browserRunner.ts's own doc comment on why bundling no longer trades away real DevTools
    // source (a composite source map now carries every module's own served URL/content).
    let bundle = fileConfig.bundle !== false;
    const patterns = (fileConfig.spec || []).slice();
    const preload = (fileConfig.require || []).slice();
    const grep = [];
    const ignore = (fileConfig.ignore || []).slice();

    // Seed any config-level grep patterns (as RegExp).
    const fileGrep = fileConfig.grep || [];
    for (let fg = 0; fg < fileGrep.length; fg++) {
        try {
            // eslint-disable-next-line security/detect-non-literal-regexp
            grep.push(new RegExp(fileGrep[fg], "i"));
        } catch (e) {
            // ignore invalid patterns from config file
        }
    }

    function _escapeRegex(value: string) {
        return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    function _consumeValue(name: string, current: string, index: number) {
        const eqPos = current.indexOf("=");
        if (eqPos !== -1) {
            const inline = current.substring(eqPos + 1);
            if (inline) {
                return {
                    value: inline,
                    nextIndex: index
                };
            }
        }
        const next = args[index + 1];
        if (!next || next.indexOf("-") === 0) {
            return {
                nextIndex: index,
                error: "Missing value for --" + name
            };
        }
        return {
            value: next,
            nextIndex: index + 1
        };
    }

    for (let lp = 0; lp < args.length; lp++) {
        const value = args[lp];
        if (_isHelpArg(value)) {
            return {
                help: true
            };
        }

        if (value === "--") {
            for (let rp = lp + 1; rp < args.length; rp++) {
                patterns.push(args[rp]);
            }
            break;
        }

        if (value === "--compile") {
            compile = true;
            compileFromCli = true;
            continue;
        }

        if (value === "--no-compile") {
            compile = false;
            compileFromCli = true;
            continue;
        }

        if (value === "--slow" || value.indexOf("--slow=") === 0) {
            const consumed = _consumeValue("slow", value, lp);
            if (consumed.error) {
                return {
                    error: consumed.error
                };
            }
            const parsedSlow = Number(consumed.value);
            if (isNaN(parsedSlow) || parsedSlow < 0) {
                return {
                    error: "Invalid value for --slow: " + consumed.value
                };
            }
            slow = parsedSlow;
            lp = consumed.nextIndex;
            continue;
        }

        if (value === "-s") {
            const consumed = _consumeValue("slow", value, lp);
            if (consumed.error) {
                return {
                    error: consumed.error
                };
            }
            const parsedSlow = Number(consumed.value);
            if (isNaN(parsedSlow) || parsedSlow < 0) {
                return {
                    error: "Invalid value for --slow: " + consumed.value
                };
            }
            slow = parsedSlow;
            lp = consumed.nextIndex;
            continue;
        }

        if (value === "--timeout" || value.indexOf("--timeout=") === 0 || value === "-t") {
            const consumed = _consumeValue("timeout", value, lp);
            if (consumed.error) {
                return {
                    error: consumed.error
                };
            }

            const parsedTimeout = Number(consumed.value);
            if (isNaN(parsedTimeout) || parsedTimeout < 0) {
                return {
                    error: "Invalid value for --timeout: " + consumed.value
                };
            }

            timeout = parsedTimeout;
            lp = consumed.nextIndex;
            continue;
        }

        if (value === "--retries" || value.indexOf("--retries=") === 0) {
            const consumed = _consumeValue("retries", value, lp);
            if (consumed.error) {
                return {
                    error: consumed.error
                };
            }

            const parsedRetries = Number(consumed.value);
            if (isNaN(parsedRetries) || parsedRetries < 0) {
                return {
                    error: "Invalid value for --retries: " + consumed.value
                };
            }

            retries = parsedRetries;
            lp = consumed.nextIndex;
            continue;
        }

        if (value === "--grep" || value.indexOf("--grep=") === 0 || value === "-g") {
            const consumed = _consumeValue("grep", value, lp);
            if (consumed.error) {
                return {
                    error: consumed.error
                };
            }

            try {
                // eslint-disable-next-line security/detect-non-literal-regexp
                grep.push(new RegExp(consumed.value || "", "i"));
            } catch (e) {
                return {
                    error: "Invalid value for --grep: " + consumed.value
                };
            }

            lp = consumed.nextIndex;
            continue;
        }

        if (value === "--fgrep" || value.indexOf("--fgrep=") === 0 || value === "-f") {
            const consumed = _consumeValue("fgrep", value, lp);
            if (consumed.error) {
                return {
                    error: consumed.error
                };
            }

            const text = consumed.value || "";
            // eslint-disable-next-line security/detect-non-literal-regexp
            grep.push(new RegExp(_escapeRegex(text), "i"));
            lp = consumed.nextIndex;
            continue;
        }

        if (value === "--invert") {
            invert = true;
            continue;
        }

        if (value === "--ignore" || value.indexOf("--ignore=") === 0) {
            const consumed = _consumeValue("ignore", value, lp);
            if (consumed.error) {
                return {
                    error: consumed.error
                };
            }
            if (consumed.value) {
                ignore.push(consumed.value);
            }
            lp = consumed.nextIndex;
            continue;
        }

        if (value === "--bail" || value === "-b") {
            bail = true;
            continue;
        }

        if (value === "--fail-on-hook") {
            failOnHook = true;
            continue;
        }

        if (value === "--no-fail-on-hook") {
            failOnHook = false;
            continue;
        }

        if (value === "--trace") {
            trace = true;
            continue;
        }

        if (value === "--coverage") {
            coverage = true;
            continue;
        }

        if (value === "--no-coverage") {
            coverage = false;
            continue;
        }

        if (value === "--source-maps") {
            sourceMaps = true;
            continue;
        }

        if (value === "--no-source-maps") {
            sourceMaps = false;
            continue;
        }

        if (value === "--coverage-instrumenter" || value.indexOf("--coverage-instrumenter=") === 0) {
            const consumed = _consumeValue("coverage-instrumenter", value, lp);
            if (consumed.error) {
                return {
                    error: consumed.error
                };
            }

            coverageInstrumenter = consumed.value || coverageInstrumenter;
            lp = consumed.nextIndex;
            continue;
        }

        if (value === "--erased-coverage-mode" || value.indexOf("--erased-coverage-mode=") === 0) {
            const consumed = _consumeValue("erased-coverage-mode", value, lp);
            if (consumed.error) {
                return {
                    error: consumed.error
                };
            }

            if (consumed.value !== "zero" && consumed.value !== "full" && consumed.value !== "ignore") {
                return {
                    error: "Invalid --erased-coverage-mode '" + consumed.value + "'. Expected zero, full, or ignore."
                };
            }

            erasedCoverageMode = consumed.value;
            lp = consumed.nextIndex;
            continue;
        }

        if (value === "--coverage-reporter" || value.indexOf("--coverage-reporter=") === 0) {
            const consumed = _consumeValue("coverage-reporter", value, lp);
            if (consumed.error) {
                return {
                    error: consumed.error
                };
            }

            const names = (consumed.value || "").split(",");
            for (let ni = 0; ni < names.length; ni++) {
                const trimmed = names[ni].trim();
                if (trimmed) {
                    coverageReporters.push(trimmed);
                }
            }
            lp = consumed.nextIndex;
            continue;
        }

        if (value === "--coverage-src" || value.indexOf("--coverage-src=") === 0) {
            const consumed = _consumeValue("coverage-src", value, lp);
            if (consumed.error) {
                return {
                    error: consumed.error
                };
            }

            const globs = (consumed.value || "").split(",");
            for (let ni = 0; ni < globs.length; ni++) {
                const trimmed = globs[ni].trim();
                if (trimmed) {
                    coverageSrc.push(trimmed);
                }
            }
            lp = consumed.nextIndex;
            continue;
        }

        if (value === "--reporter" || value.indexOf("--reporter=") === 0) {
            const consumed = _consumeValue("reporter", value, lp);
            if (consumed.error) {
                return {
                    error: consumed.error
                };
            }

            // The first --reporter seen on the CLI replaces whatever the config file set
            // (rather than appending to it) -- CLI flags override config file values
            // everywhere else in this parser (see the doc comment at the top of
            // ITripwireConfig), and appending here would make it impossible to select a
            // single reporter on the CLI when the config file already lists one or more.
            // A second/third --reporter (or a comma-separated list) still combines together
            // normally, same as --coverage-reporter.
            if (!reporterFromCli) {
                reporter = [];
                reporterFromCli = true;
            }

            const names = (consumed.value || "").split(",");
            for (let ni = 0; ni < names.length; ni++) {
                const trimmed = names[ni].trim();
                if (trimmed) {
                    const reporterError = _validateReporter(trimmed, "--reporter");
                    if (reporterError) {
                        return {
                            error: reporterError
                        };
                    }
                    reporter.push(trimmed);
                }
            }
            lp = consumed.nextIndex;
            continue;
        }

        if (value === "--show-files") {
            showFiles = true;
            continue;
        }

        if (value === "--verbose") {
            verbose = true;
            continue;
        }

        if (value === "--watch") {
            watch = true;
            continue;
        }

        if (value === "--server-root" || value.indexOf("--server-root=") === 0) {
            const consumed = _consumeValue("server-root", value, lp);
            if (consumed.error) {
                return {
                    error: consumed.error
                };
            }

            serverRoot = consumed.value || serverRoot;
            lp = consumed.nextIndex;
            continue;
        }

        if (value === "--bind-address" || value.indexOf("--bind-address=") === 0) {
            const consumed = _consumeValue("bind-address", value, lp);
            if (consumed.error) {
                return {
                    error: consumed.error
                };
            }

            bindAddress = consumed.value || bindAddress;
            lp = consumed.nextIndex;
            continue;
        }

        if (value === "--no-server") {
            noServer = true;
            continue;
        }

        if (value === "--server") {
            noServer = false;
            continue;
        }

        if (value === "--bundle") {
            bundle = true;
            continue;
        }

        if (value === "--no-bundle") {
            bundle = false;
            continue;
        }

        if (value === "--target" || value.indexOf("--target=") === 0 || value === "--env" || value.indexOf("--env=") === 0) {
            const name = value === "--env" || value.indexOf("--env=") === 0 ? "env" : "target";
            const consumed = _consumeValue(name, value, lp);
            if (consumed.error) {
                return {
                    error: consumed.error
                };
            }

            const valueTarget = (consumed.value || "").toLowerCase();
            if (valueTarget !== "node" && valueTarget !== "browser" && valueTarget !== "worker") {
                return {
                    error: "Invalid value for --" + name + ": " + consumed.value + " (expected node, browser, or worker)"
                };
            }

            target = valueTarget;
            lp = consumed.nextIndex;
            continue;
        }

        if (value === "--browser-launch" || value.indexOf("--browser-launch=") === 0) {
            const consumed = _consumeValue("browser-launch", value, lp);
            if (consumed.error) {
                return {
                    error: consumed.error
                };
            }

            const launchValue = (consumed.value || "").toLowerCase();
            const launchParts = launchValue.split(":");
            const mode = launchParts[0] || "";
            const style = launchParts.length > 1 ? launchParts[1] : "";
            if (mode !== "puppeteer" && mode !== "open" && mode !== "manual") {
                return {
                    error: "Invalid value for --browser-launch: " + consumed.value + " (expected puppeteer, open, or manual)"
                };
            }

            if (style) {
                if (style !== "classic" && style !== "slate") {
                    return {
                        error: "Invalid style in --browser-launch: " + style + " (expected classic or slate)"
                    };
                }

                browserStyle = style;
            }

            browserLaunch = mode;
            lp = consumed.nextIndex;
            continue;
        }

        if (value === "--browser-style" || value.indexOf("--browser-style=") === 0) {
            const consumed = _consumeValue("browser-style", value, lp);
            if (consumed.error) {
                return {
                    error: consumed.error
                };
            }

            const style = (consumed.value || "").toLowerCase();
            if (style !== "classic" && style !== "slate") {
                return {
                    error: "Invalid value for --browser-style: " + consumed.value + " (expected classic or slate)"
                };
            }

            browserStyle = style;
            lp = consumed.nextIndex;
            continue;
        }

        if (value === "--browser-theme" || value.indexOf("--browser-theme=") === 0) {
            const consumed = _consumeValue("browser-theme", value, lp);
            if (consumed.error) {
                return {
                    error: consumed.error
                };
            }

            const cliTheme = parseBrowserTheme(consumed.value || "");
            if (cliTheme.error) {
                return {
                    error: "Invalid value for --browser-theme: " + cliTheme.error
                };
            }

            browserTheme = mergeBrowserThemes(browserTheme, cliTheme.theme);
            lp = consumed.nextIndex;
            continue;
        }

        if (value === "--ux-provider" || value.indexOf("--ux-provider=") === 0) {
            const consumed = _consumeValue("ux-provider", value, lp);
            if (consumed.error) {
                return {
                    error: consumed.error
                };
            }

            uxProvider = consumed.value || uxProvider;
            lp = consumed.nextIndex;
            continue;
        }

        if (value === "--open-browser") {
            browserLaunch = "open";
            continue;
        }

        if (value === "--manual-browser") {
            browserLaunch = "manual";
            continue;
        }

        if (value === "--project") {
            const consumed = _consumeValue("project", value, lp);
            if (consumed.error) {
                return {
                    error: consumed.error
                };
            }
            project = consumed.value || project;
            projectFromCli = projectFromCli || !!consumed.value;
            lp = consumed.nextIndex;
            continue;
        }

        if (value === "-p" || value.indexOf("--project=") === 0 || value.indexOf("--tsProject=") === 0 || value.indexOf("--ts-project=") === 0 || value === "--tsProject" || value === "--ts-project") {
            const consumed = _consumeValue("project", value, lp);
            if (consumed.error) {
                return {
                    error: consumed.error
                };
            }
            project = consumed.value || project;
            projectFromCli = projectFromCli || !!consumed.value;
            lp = consumed.nextIndex;
            continue;
        }

        // --type-check and --transpile-only are exact opposites writing the same state, so
        // whichever appears last wins and neither needs to know about the other.
        if (value === "--type-check") {
            compile = true;
            compileFromCli = true;
            continue;
        }

        if (value === "--no-type-check") {
            compile = false;
            compileFromCli = true;
            continue;
        }

        if (value === "--strict-type-check") {
            strictTypeCheck = true;
            continue;
        }

        if (value === "--no-strict-type-check") {
            strictTypeCheck = false;
            continue;
        }

        if (value === "--incremental") {
            incremental = true;
            continue;
        }

        if (value === "--no-incremental") {
            incremental = false;
            continue;
        }

        if (value === "--graph-thread") {
            graphThread = true;
            continue;
        }

        if (value === "--no-graph-thread") {
            graphThread = false;
            continue;
        }

        if (value === "--isolated-transpile") {
            isolatedTranspile = true;
            continue;
        }

        if (value === "--no-isolated-transpile") {
            isolatedTranspile = false;
            continue;
        }

        if (value === "--emit-cache") {
            emitCache = true;
            continue;
        }

        if (value === "--no-emit-cache") {
            emitCache = false;
            continue;
        }

        if (value === "--type-check-scope" || value.indexOf("--type-check-scope=") === 0) {
            const consumed = _consumeValue("type-check-scope", value, lp);
            if (consumed.error) {
                return {
                    error: consumed.error
                };
            }

            const scope = (consumed.value || "").toLowerCase();
            if (scope !== "run" && scope !== "project") {
                return {
                    error: "Invalid --type-check-scope value '" + consumed.value + "', expected 'run' or 'project'."
                };
            }

            typeCheckScope = scope;
            lp = consumed.nextIndex;
            continue;
        }

        if (value === "--debug-stack") {
            debugStack = true;
            continue;
        }

        if (value === "--transpile-only") {
            compile = false;
            compileFromCli = true;
            continue;
        }

        if (value === "--no-transpile-only") {
            compile = true;
            compileFromCli = true;
            continue;
        }

        if (value === "--spec" || value.indexOf("--spec=") === 0) {
            const consumed = _consumeValue("spec", value, lp);
            if (consumed.error) {
                return {
                    error: consumed.error
                };
            }
            if (consumed.value) {
                patterns.push(consumed.value);
            }
            lp = consumed.nextIndex;
            continue;
        }

        if (value === "--file" || value.indexOf("--file=") === 0 || value === "--require" || value.indexOf("--require=") === 0 || value === "-r") {
            const name = value === "--file" || value.indexOf("--file=") === 0 ? "file" : "require";
            const consumed = _consumeValue(name, value, lp);
            if (consumed.error) {
                return {
                    error: consumed.error
                };
            }

            if (consumed.value) {
                preload.push(consumed.value);
            }

            lp = consumed.nextIndex;
            continue;
        }

        if (value.indexOf("-") === 0) {
            return {
                error: "Unsupported option: " + value
            };
        }

        patterns.push(value);
    }

    if (!patterns.length) {
        return {
            error: "No file glob supplied. Example: tripwire \"core/test/src/**/*.test.ts\""
        };
    }

    // `tsconfig` is config-file-only (an inline compiler-options object has no sane CLI
    // syntax), so it's resolved once here rather than in the arg-parsing loop above.
    let tsconfigOverrides: { [key: string]: any } | undefined;
    if (fileConfig.tsconfig !== undefined) {
        if (typeof fileConfig.tsconfig === "string") {
            // An explicit CLI `--project`/`-p`/`--tsProject` flag always wins over the config
            // file's `tsconfig` string -- CLI flags override config files everywhere else in
            // this parser (see the doc comment at the top of ITripwireConfig), and the string
            // form of `tsconfig` is just an alternate way to set the same `project` path, so
            // it follows that same precedence rather than being special-cased above it.
            if (!projectFromCli) {
                project = fileConfig.tsconfig;
            }
        } else {
            // Unlike the string form, an object here isn't an alternate way to set `project`
            // -- it's a layer of compiler-option overrides on top of whichever project ends up
            // resolved (CLI-specified or not), so it always applies regardless of CLI --project.
            tsconfigOverrides = fileConfig.tsconfig;
        }
    }

    // `--strict-type-check` is a promise about the type-check, so it turns the type-check on
    // rather than silently doing nothing without `--type-check` alongside it. An explicit
    // `--no-compile`/`--transpile-only` still wins -- that's the user saying "don't check at
    // all", which is a coherent (if contradictory) request, not something to override.
    if (strictTypeCheck && !compileFromCli) {
        compile = true;
    }

    return {
        patterns,
        project,
        tsconfigOverrides,
        target,
        browserLaunch,
        browserStyle,
        browserTheme,
        uxProvider,
        compile: compile !== undefined ? compile : false,
        strictTypeCheck,
        incremental,
        graphThread,
        isolatedTranspile,
        emitCache,
        typeCheckScope,
        debugStack,
        slow,
        timeout,
        retries,
        grep,
        invert,
        ignore,
        bail,
        failOnHook,
        trace,
        coverage,
        coverageInstrumenter,
        erasedCoverageMode,
        coverageReporters,
        coverageSrc,
        reporter: reporter.length ? reporter : ["spec"],
        sourceMaps,
        showFiles,
        verbose,
        watch,
        preload,
        serverRoot: serverRoot || undefined,
        bindAddress: bindAddress || undefined,
        noServer: !!noServer,
        bundle
    };
}
