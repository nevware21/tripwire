/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

/**
 * Export reporters
 */
export { IConsoleReporter, IConsoleReporterOptions, createConsoleReporter, addConsoleReporter } from "./consoleReporter";
export { IReporterConsole, formatDuration, indent, formatStatusSymbol, formatSummary, formatFullTitle } from "./formatters";

/**
 * Returns true when the current environment supports color output.
 * Re-exported from `@nevware21/chromacon`, which handles Node.js TTY, browser DevTools and web
 * worker detection automatically.
 * @since 0.2.0
 */
export { isColorSupported } from "@nevware21/chromacon";
export { IDotReporterOptions, createDotReporter, addDotReporter } from "./dotReporter";
export { ITapReporterOptions, createTapReporter, addTapReporter } from "./tapReporter";
export { IJsonReporterOptions, createJsonReporter, addJsonReporter } from "./jsonReporter";
export { IJsonStreamReporterOptions, createJsonStreamReporter, addJsonStreamReporter } from "./jsonStreamReporter";
export { IMinReporterOptions, createMinReporter, addMinReporter } from "./minReporter";
export { IListReporterOptions, createListReporter, addListReporter } from "./listReporter";
export { IProgressReporterOptions, createProgressReporter, addProgressReporter } from "./progressReporter";
export { ILandingReporterOptions, createLandingReporter, addLandingReporter } from "./landingReporter";
export { INyanReporterOptions, createNyanReporter, addNyanReporter } from "./nyanReporter";
export { IDocReporterOptions, createDocReporter, addDocReporter } from "./docReporter";
export { IMarkdownReporterOptions, createMarkdownReporter, addMarkdownReporter } from "./markdownReporter";
export { IXunitReporterOptions, createXunitReporter, addXunitReporter } from "./xunitReporter";
export { ICargoReporterOptions, createCargoReporter, addCargoReporter } from "./cargoReporter";
export { ReporterName, REPORTER_NAMES, IReporterOptions, createReporter } from "./createReporter";
