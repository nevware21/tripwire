/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

/**
 * Regular expression to check for any internal stack frame functions, this
 * is used to identify whether any internal stack frames are present in the
 * stack trace.
 * This is exposed primarily for testing purposes, so that any Shims or
 * other internal functions can be identified in the stack trace across
 * releases (since the internal function names / order of execution may
 * change over time).
 */
export const CHECK_INTERNAL_STACK_FRAME_REGEX = /at [a-zA-Z]*\.?(_fn|_processFn|_assertFunc|_exec|_exprFn|_runOp|_runExpr)/;

