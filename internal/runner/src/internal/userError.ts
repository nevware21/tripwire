/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

/**
 * Marks an `Error` as one the CLI *deliberately* raised to tell the user something actionable
 * ("no files matched", "install typescript", "that flag combination isn't supported") rather
 * than as evidence of a runner fault.
 *
 * The distinction matters because the CLI ships as a single minified bundle: a stack trace off
 * one of these errors is ten frames of `at yo (tripwire.js:2:143518)`, which reads as "the tool
 * is broken" and buries the one line that actually says what to do. `main()` prints the message
 * (plus any hints) alone for a user error and keeps the stack behind `--debug-stack`.
 *
 * This mirrors the split core already draws between "a failure we fully described" and "a
 * genuine fault" (see `_isRecordedHookError`).
 */

/**
 * Property name stamped onto a deliberately-raised, user-facing error. A plain string property
 * rather than a `Symbol` so it survives the structured-clone/`postMessage` round trips an error
 * can make between the worker/browser client and the CLI.
 */
const _USER_ERROR_FLAG = "__tripwireUserError";

/**
 * Property name holding the optional follow-up lines printed under a user error's message --
 * the "and here is what to do about it" half (`npm install --save-dev typescript`, "check the
 * glob is quoted", ...).
 */
const _USER_ERROR_HINTS = "__tripwireUserErrorHints";

/**
 * An `Error` the CLI raised on purpose, carrying a message written to be read by the person who
 * ran the command.
 */
export interface IUserError extends Error {
    /**
     * Always `true` -- the marker {@link _isUserError} tests for.
     */
    __tripwireUserError?: boolean;

    /**
     * Optional follow-up lines printed beneath the message, one per line.
     */
    __tripwireUserErrorHints?: string[];
}

/**
 * Stamps the user-facing markers onto an existing error, so a message built elsewhere (a
 * formatted TypeScript diagnostic, a wrapped module-load failure) can be promoted without
 * being rebuilt.
 * @param error - The error to mark.
 * @param hints - Optional actionable follow-up lines.
 * @returns The same error instance, marked.
 * @internal
 */
export function _markUserError<T extends Error>(error: T, hints?: string[]): T {
    const target = error as T & IUserError;
    target[_USER_ERROR_FLAG] = true;
    if (hints && hints.length) {
        target[_USER_ERROR_HINTS] = hints;
    }

    return error;
}

/**
 * Creates an `Error` marked as user-facing.
 * @param message - What went wrong, in the user's terms.
 * @param hints - Optional actionable follow-up lines (an install command, a flag to try).
 * @returns The marked error, ready to throw.
 * @internal
 */
export function _userError(message: string, hints?: string[]): IUserError {
    return _markUserError(new Error(message), hints);
}

/**
 * Whether `error` was deliberately raised to be read by the user.
 * @param error - The caught value, which may be anything a `throw` produced.
 * @internal
 */
export function _isUserError(error: any): boolean {
    return !!(error && error[_USER_ERROR_FLAG]);
}

/**
 * The actionable follow-up lines attached to a user error, or an empty array.
 * @param error - The caught value, which may be anything a `throw` produced.
 * @internal
 */
export function _userErrorHints(error: any): string[] {
    const hints = error && error[_USER_ERROR_HINTS];

    return (hints && hints.length) ? hints : [];
}
