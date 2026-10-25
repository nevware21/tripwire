/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IListener } from "@nevware21/tripwire";
import { IConsoleReporterOptions, createConsoleReporter } from "./consoleReporter";
import { IDotReporterOptions, createDotReporter } from "./dotReporter";
import { ITapReporterOptions, createTapReporter } from "./tapReporter";
import { IJsonReporterOptions, createJsonReporter } from "./jsonReporter";
import { IJsonStreamReporterOptions, createJsonStreamReporter } from "./jsonStreamReporter";
import { IMinReporterOptions, createMinReporter } from "./minReporter";
import { IListReporterOptions, createListReporter } from "./listReporter";
import { IProgressReporterOptions, createProgressReporter } from "./progressReporter";
import { ILandingReporterOptions, createLandingReporter } from "./landingReporter";
import { INyanReporterOptions, createNyanReporter } from "./nyanReporter";
import { IDocReporterOptions, createDocReporter } from "./docReporter";
import { IMarkdownReporterOptions, createMarkdownReporter } from "./markdownReporter";
import { IXunitReporterOptions, createXunitReporter } from "./xunitReporter";
import { ICargoReporterOptions, createCargoReporter } from "./cargoReporter";

/**
 * Every built-in reporter name this package ships with, selectable by name via
 * {@link createReporter} (and the CLI's `--reporter <name>` flag).
 * @since 0.2.0
 */
export const REPORTER_NAMES = [
    "spec", "dot", "tap", "json", "json-stream", "min", "list", "progress", "landing", "nyan", "doc", "markdown", "xunit", "cargo"
] as const;

/**
 * The name of a built-in reporter -- see {@link REPORTER_NAMES}.
 * @since 0.2.0
 */
export type ReporterName = typeof REPORTER_NAMES[number];

/**
 * The union of every built-in reporter's options -- {@link createReporter} passes whichever
 * options object it's given straight through to the selected reporter's factory, so each
 * reporter simply reads the subset of keys it understands and ignores the rest. Every
 * reporter's `console` field shares the same {@link IReporterConsole}-shaped sink, so this
 * merge is never conflicting.
 * @since 0.2.0
 */
export interface IReporterOptions extends
    IConsoleReporterOptions, IDotReporterOptions, ITapReporterOptions, IJsonReporterOptions, IJsonStreamReporterOptions,
    IMinReporterOptions, IListReporterOptions, IProgressReporterOptions, ILandingReporterOptions, INyanReporterOptions,
    IDocReporterOptions, IMarkdownReporterOptions, IXunitReporterOptions, ICargoReporterOptions {
}

/**
 * Create one of this package's built-in reporters by name -- the single dispatch point both
 * the CLI (`--reporter <name>`, repeatable/comma-separated for multiple at once) and a browser/
 * worker run's client-side runtime use to turn a configured reporter name into a listener,
 * instead of every caller needing its own `name -> createXReporter` mapping.
 * @param name - One of {@link REPORTER_NAMES}. An unknown name falls back to `"spec"` and warns
 * on the reporter's own console, so a caller that mistyped one is told rather than quietly
 * handed different output than it asked for. Omitting the name selects `"spec"` silently, since
 * that is the documented default rather than a mistake.
 * @param options - Options forwarded to the selected reporter's factory (see {@link IReporterOptions}).
 * @returns A reporter object whose `.listener` property should be registered.
 * @since 0.2.0
 */
export function createReporter(name: ReporterName | string | undefined, options?: IReporterOptions): { listener: IListener } {
    // The CLI validates `--reporter` before ever reaching here (see cli/parseArgs.ts), and routes
    // a custom reporter *module* to `execute/reporter.ts` rather than to this function, so this
    // only fires for a programmatic caller -- which until now got spec's output with nothing said
    // about the name it actually passed.
    if (name !== undefined && name !== null && REPORTER_NAMES.indexOf(name as ReporterName) === -1) {
        var warnConsole = (options && options.console) || console;
        warnConsole.error("Unknown reporter '" + name + "', falling back to 'spec'. Expected one of: " + REPORTER_NAMES.join(", ") + ".");
    }

    switch (name) {
        case "dot":
            return createDotReporter(options);
        case "tap":
            return createTapReporter(options);
        case "json":
            return createJsonReporter(options);
        case "json-stream":
            return createJsonStreamReporter(options);
        case "min":
            return createMinReporter(options);
        case "list":
            return createListReporter(options);
        case "progress":
            return createProgressReporter(options);
        case "landing":
            return createLandingReporter(options);
        case "nyan":
            return createNyanReporter(options);
        case "doc":
            return createDocReporter(options);
        case "markdown":
            return createMarkdownReporter(options);
        case "xunit":
            return createXunitReporter(options);
        case "cargo":
            return createCargoReporter(options);
        default:
            return createConsoleReporter(options);
    }
}
