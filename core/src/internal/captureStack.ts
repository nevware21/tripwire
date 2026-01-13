/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2025 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { asString } from "@nevware21/ts-utils";
import { IParsedStack, parseStack } from "./parseStack";

let captureStackFn = Error.captureStackTrace;

export function captureStack(func: Function): IParsedStack {

    let orgStackLimit = Error.stackTraceLimit;
    if ("stackTraceLimit" in Error) {
        Error.stackTraceLimit = 50;
    }

    try {
        let theError = new Error();
        if (captureStackFn) {
            // Capture the stack trace
            captureStackFn(theError, func);
        }

        let parsedStack = parseStack(theError.stack);
        if (!captureStackFn) {
            let funcName = asString(func.name) || (func as any)["displayName"];
            if (funcName) {
                parsedStack.trimStack(funcName);
            }
        }

        return parsedStack;
    } finally {
        // Restore the stack trace limit
        if ("stackTraceLimit" in Error) {
            Error.stackTraceLimit = orgStackLimit;
        }
    }
}
