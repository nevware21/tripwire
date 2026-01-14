/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { MsgSource } from "../type/MsgSource";
import { IScopeContext } from "../interface/IScopeContext";
import { IAssertScope } from "../interface/IAssertScope";

export function notOp<R>(scope: IAssertScope): R {
    let context = scope.context;

    return scope.updateCtx(context.value, {
        getEvalMessage: (parent: IScopeContext, evalMsg?: MsgSource) => {
            return "not " + parent.getEvalMessage(evalMsg);
        },
        eval: (parent: IScopeContext, expr: boolean, evalMsg?: MsgSource) => parent.eval(!expr, evalMsg)
    }).that;
}
