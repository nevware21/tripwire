/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IAssertScope } from "../interface/IAssertScope";

/**
 * This is a no-op operation that does nothing, and is used to provide a more descriptive name
 * for the execution of the operations, it's used in both defining the operations and the
 * execution sequence
 * @param scope - The current scope of the assert
 * @returns - The current `that` of the assert scope
 */
export function noopOp<R>(scope: IAssertScope): R {
    return scope.that;
}