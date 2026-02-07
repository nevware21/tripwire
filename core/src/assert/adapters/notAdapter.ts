/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { arrSlice } from "@nevware21/ts-utils";
import { IAssertScope } from "../interface/IAssertScope";
import { IScopeFn } from "../interface/IScopeFuncs";
import { notOp } from "../ops/notOp";
import { _blockLength } from "../internal/_blockLength";

/**
 * Creates an adapter function that wraps the provided scope function with a "not" operation.
 * When the returned scope function is executed, it first performs a negation (updating the
 * context to negate evaluations) and then calls the provided scope function.
 *
 * This is an optimized alternative to using `createExprAdapter("not", scopeFn)` that avoids
 * expression parsing overhead by directly applying the negation context.
 *
 * @param scopeFn - The scope function to wrap with the "not" operation.
 * @returns An {@link IScopeFn} function that will negate and then execute the provided scope function.
 * @example
 * ```typescript
 * import { createNotAdapter, createEvalAdapter } from "@nevware21/tripwire";
 *
 * const isTrueFunc = createEvalAdapter((actual: any) => actual === true, "Expected value to be true");
 * const isNotTrueFunc = createNotAdapter(isTrueFunc);
 *
 * // Using with addAssertFunc
 * addAssertFunc("isNotTrue", isNotTrueFunc);
 * assert.isNotTrue(false);    // Passes - false is not true
 * assert.isNotTrue(true);     // Fails - true is true
 * ```
 * @group Adapter
 * @since 0.1.5
 */
export function createNotAdapter(scopeFn: IScopeFn): IScopeFn {

    function _notFn(this: IAssertScope): any {
        let scope = this;
        let context = scope.context;
        let theArgs = arrSlice(arguments);

        context._$stackFn.push(_notFn);

        // Track the operation path and set the stack start position
        if (context.opts.isVerbose) {
            context.setOp("[[not]]");
        }

        // Apply the "not" operation
        notOp(scope);

        // Execute the scope function within the negated context
        return scope.exec(scopeFn, theArgs);
    }


    return _blockLength(_notFn, scopeFn.name, [], _notFn);
}
