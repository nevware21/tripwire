/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { isNullOrUndefined } from "@nevware21/ts-utils";
import { IAssertScope } from "../interface/IAssertScope";
import { MsgSource } from "../interface/types";

/**
 * Asserts that the target is not null and not undefined.
 * @since 0.1.5
 * @param this - The assert scope.
 * @param evalMsg - The message to display if the assertion fails.
 * @returns - The assert scope.
 * @example
 * ```typescript
 * import { assert } from "@nevware21/tripwire";
 *
 * assert(0).to.exist();          // Passes - 0 is not null or undefined
 * assert("").to.exist();         // Passes - empty string exists
 * assert(false).to.exist();      // Passes - false exists
 * assert(null).to.not.exist();   // Passes - null does not exist
 * assert(undefined).to.not.exist(); // Passes - undefined does not exist
 * ```
 */
export function existsFunc<R>(this: IAssertScope, evalMsg?: MsgSource): R {
    let context = this.context;
    let value = context.value;

    context.eval(
        !isNullOrUndefined(value),
        evalMsg || "expected {value} to exist (not null or undefined)"
    );

    return this.that;
}
