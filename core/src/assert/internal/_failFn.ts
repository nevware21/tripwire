/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { isStrictUndefined } from "@nevware21/ts-utils";
import { AssertionFailure, AssertionFatal } from "../assertionError";
import { IAssertInstCore } from "../interface/IAssertInstCore";
import { IScopeContext } from "../interface/IScopeContext";
import { IAssertScope } from "../interface/IAssertScope";
import { MsgSource } from "../interface/types";
import { getScopeContext } from "../scopeContext";

function _setContext(context: IScopeContext, name: string, pos: number, theArgs: any[]): void {
    if (pos < theArgs.length && !isStrictUndefined(theArgs[pos])) {
        context.set(name, theArgs[pos]);
    }
}

/**
 * @internal
 * @ignore
 * Generic failure that throws an {@link AssertionFailure} exception with the given
 * message and optional details which are obtained via the `getDetails` function.
 * @param actual - The actual value that was expected
 * @param expected - The expected value that was not found
 * @param failMsg - The message to display.
 * @param operator - The optional operator used in the comparison
 * @throws {@link AssertionFailure} always
 */
//function _fail(failMsg: MsgSource, details?: any): never;
//function _fail(_actual: any, _expected: any, _failMsg?: MsgSource, _operator?: string): never;
export function _failFn(ctx: IAssertInstCore | IAssertScope, theArgs: any[]): never {
    let len = theArgs.length;
    let details: any;
    let failMsg: MsgSource;
    let context = getScopeContext(ctx);


    if (len > 2) {
        // fail(actual: any, expected: any, failMsg?: MsgSource, operator?: string): never;
        failMsg = theArgs[2];
        _setContext(context, "actual", 0, theArgs);
        _setContext(context, "expected", 1, theArgs);
        _setContext(context, "operator", 3, theArgs);
    } else {
        // fail(evalMsg: MsgSource, details?: any): never;
        failMsg = len > 0 ? theArgs[0] : null;
        details = len > 1 ? theArgs[1] : undefined;
    }

    context._$stackFn.push(_failFn);
    throw new AssertionFailure(context.getMessage(failMsg || context.opts.defAssertMsg || "assertion failure", true), details || context.getDetails(), context._$stackFn);
}

export function _fatalFn(ctx: IAssertScope | IAssertInstCore, evalMsg: MsgSource, details?: any):never {
    let context = getScopeContext(ctx);

    context._$stackFn.push(_fatalFn);
    throw new AssertionFatal(context.getMessage(evalMsg || context.opts.defFatalMsg || "fatal assertion failure", true), details || context.getDetails(), context._$stackFn);
}

