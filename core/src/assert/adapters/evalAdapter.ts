/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { arrSlice } from "@nevware21/ts-utils";
import { IAssertScope } from "../interface/IAssertScope";
import { MsgSource } from "../interface/types";
import { IScopeFn } from "../interface/IScopeFuncs";
import { _blockLength } from "../internal/_blockLength";

/**
 * Identifies the signature of a function that expects the actual value and any additional arguments
 * that are passed to the function. The function should return a boolean value indicating if the
 * assertion passed or failed.
 */
export type EvalFn = <T>(actual: T, ...args: any[]) => boolean;

/**
 * Creates an adapter function that can be used to evaluate the current value in the scope,
 * using the provided boolean evaluation function.
 * @param evalFn The function that will be used to evaluate the current value.
 * @param evalMsg The message that will be used if the evaluation fails.
 * @param funcName The name of the function that will be used to identify the operation.
 * @returns An {@link IScopeFn} function that will evaluate the current value in the scope.
 * @example
 * ```typescript
 * import { createEvalAdapter } from "@nevware21/tripwire";
 *
 * addAssertFunc("isTrue", createEvalAdapter((actual: any) => actual === true, "Expected value to be true"););
 * assert.isTrue(true);     // Passes
 * assert.isTrue(false);    // Fails
 * ```
 * @group Adapter
 * @since 0.1.0
 */
export function createEvalAdapter(evalFn: EvalFn, evalMsg?: MsgSource, funcName?: string): IScopeFn {
    function _evalFn(this: IAssertScope) {
        let scope = this;
        let context = scope.context;
        let theArgs = arrSlice(arguments);

        context._$stackFn.push(_evalFn);
    
        // Track the operation path and set the stack start position
        if (context.opts.isVerbose) {
            let theFuncName = funcName || evalFn.name || (evalFn as any)["displayName"] || "anonymous";
    
            context.setOp("[[" + theFuncName + "]]");
        }
    
        theArgs.unshift(context.value);
        context.eval(evalFn.apply(scope.that || scope, theArgs), evalMsg)
    
        return scope.that
    }

    return _blockLength(_evalFn, funcName, [], _evalFn);
}
