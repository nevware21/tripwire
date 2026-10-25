/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { gray, red, yellow } from "@nevware21/chromacon";
import { _isUserError, _userErrorHints } from "../internal/userError";
import { _mapStackTrace } from "./mapStack";

/**
 * Turns a thrown value into what the CLI actually prints for it.
 *
 * The rule: **the stack is never shown unless it was asked for.** The CLI ships as a single
 * minified bundle, so `error.stack` is a wall of `at yo (tripwire.js:2:143518)` that hides the
 * one line worth reading and reads, to anyone hitting it on their first run, as "this tool is
 * broken" rather than "install puppeteer". `--debug-stack` opts back in, and maps the frames
 * through the bundle's source map on the way out so the stack that appears is in terms of
 * `runner/src/**.ts` (see {@link _mapStackTrace}).
 *
 * Errors the CLI raised deliberately (see `internal/userError.ts`) print their message plus any
 * hints and stop there. Anything else is a genuine runner fault, so it still prints only the
 * message, but says so and points at `--debug-stack`.
 */

/**
 * Options controlling how a caught CLI error is rendered.
 */
export interface IErrorReportOptions {
    /**
     * Include the stack trace, mapped back to the runner's TypeScript sources. Set by
     * `--debug-stack` or `TRIPWIRE_DEBUG_STACK=1`.
     */
    debugStack?: boolean;

    /**
     * Directory that mapped source paths are shown relative to. Defaults to `process.cwd()`.
     */
    cwd?: string;
}

const _DEBUG_STACK_HINT = "Run again with --debug-stack for the runner stack trace.";
const _ISSUE_URL = "https://github.com/nevware21/tripwire/issues";

/**
 * Set once the arguments have been parsed, so a config file's `debugStack: true` is honoured
 * even though {@link _wantsDebugStack} reads raw `argv` (which by definition cannot see it).
 * The raw-argv scan stays the primary path -- it is the only one that works for a failure
 * raised while loading that very config file.
 */
let _debugStackOverride = false;

/**
 * Records a `debugStack` setting that only became known after parsing.
 * @param enabled - Whether stacks should be printed.
 * @internal
 */
export function _setDebugStack(enabled: boolean): void {
    _debugStackOverride = _debugStackOverride || !!enabled;
}

/**
 * Whether this invocation asked for stack traces, via the `--debug-stack` flag or the
 * `TRIPWIRE_DEBUG_STACK` environment variable.
 *
 * Deliberately reads raw `argv` rather than the parsed arguments: the errors most in need of a
 * stack are the ones thrown *before* (or *by*) argument parsing, when there is no parsed result
 * to consult.
 *
 * @param argv - Raw arguments, `process.argv.slice(2)` in the real CLI.
 * @param env - Environment to read, defaulting to `process.env`.
 * @internal
 */
export function _wantsDebugStack(argv: string[], env?: { [key: string]: string | undefined }): boolean {
    if (_debugStackOverride) {
        return true;
    }

    const environment = env || process.env;
    const flagged = environment && environment.TRIPWIRE_DEBUG_STACK;
    if (flagged && flagged !== "0" && flagged !== "false") {
        return true;
    }

    for (let lp = 0; lp < (argv || []).length; lp++) {
        if (argv[lp] === "--debug-stack") {
            return true;
        }

        // Everything after a bare `--` is a file pattern, not a flag.
        if (argv[lp] === "--") {
            break;
        }
    }

    return false;
}

/**
 * Renders a caught value as the lines the CLI should write to stderr.
 *
 * Returns lines (rather than printing) so tests can assert the exact shape -- specifically that
 * no bundle frame leaks into the default output -- without capturing the console.
 *
 * @param error - The caught value, which may be anything a `throw` produced.
 * @param options - See {@link IErrorReportOptions}.
 * @internal
 */
export function _formatCliError(error: any, options?: IErrorReportOptions): string[] {
    const opts = options || {};
    const message = (error && error.message) ? error.message : String(error);
    const lines: string[] = [red("Error: ") + message];

    const hints = _userErrorHints(error);
    if (hints.length) {
        lines.push("");
        for (let lp = 0; lp < hints.length; lp++) {
            lines.push(yellow("  " + hints[lp]));
        }
    }

    if (opts.debugStack) {
        const stack = error && error.stack;
        if (stack) {
            // `error.stack` repeats the message as its first line(s); the message is already the
            // first thing printed above, so keep only the frames.
            const frames = String(stack).split(/\r?\n/).filter((line) => /^\s+at\s+/.test(line));
            if (frames.length) {
                lines.push("");
                lines.push(gray(_mapStackTrace(frames.join("\n"), opts.cwd)));
            }
        }

        return lines;
    }

    lines.push("");
    if (_isUserError(error)) {
        lines.push(gray(_DEBUG_STACK_HINT));
    } else {
        // Not a failure the CLI describes on purpose -- say so, rather than leaving the user to
        // guess whether they mistyped something.
        lines.push(gray("This is an unexpected tripwire failure, not a problem with your command."));
        lines.push(gray(_DEBUG_STACK_HINT + " Please report it at " + _ISSUE_URL));
    }

    return lines;
}

/**
 * Prints a caught value to stderr in the shape {@link _formatCliError} defines.
 * @param error - The caught value.
 * @param options - See {@link IErrorReportOptions}.
 * @internal
 */
export function _reportCliError(error: any, options?: IErrorReportOptions): void {
    const lines = _formatCliError(error, options);
    for (let lp = 0; lp < lines.length; lp++) {
        console.error(lines[lp]);
    }
}
