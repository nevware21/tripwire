/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { isNumber } from "@nevware21/ts-utils";
import { _addAssertInstFuncs } from "../internal/_addAssertInstFuncs";
import { IChangeResultOp } from "../interface/ops/IChangeResultOp";
import { IChangeResultValue } from "../interface/ops/IChangeResultValue";
import { IAssertInst } from "../interface/IAssertInst";
import { AssertScopeFuncDefs, IAssertScopeFuncDef } from "../interface/IAssertScopeFuncDef";
import { IAssertScope } from "../interface/IAssertScope";
import { MsgSource } from "../../types/MsgSource";
import { IScopeContext } from "../interface/IScopeContext";

type OmitAssertFuncs = Omit<IChangeResultOp, keyof IAssertInst>;

type ChangeResultOps = {
    readonly [key in keyof OmitAssertFuncs extends string | number | symbol ? keyof OmitAssertFuncs : never]: IAssertScopeFuncDef
};

function byOpFn<R>(this: IAssertScope, delta: number, evalMsg?: MsgSource): R {
    let context: IScopeContext = this.context;
    let actualDelta = context.value.delta;

    context.set("expectedDelta", delta);
    context.set("delta", actualDelta);

    if (!isNumber(delta)) {
        context.fatal("expected delta ({expectedDelta}) to be a number");
    }

    if (!isNumber(actualDelta)) {
        context.fatal("expected actual delta ({delta}) to be a number");
    }

    context.eval(
        actualDelta === delta,
        evalMsg || "expected {value} to change by {expectedDelta}, but it changed by {delta}"
    );

    return this.that;
}

export function changeResultOp<V>(scope: IAssertScope, value: IChangeResultValue<V>): IChangeResultOp {
    let newInst = scope.newInst(value);

    /**
     * Changes the scope target to the changed value.
     * @param scope - The assertion scope.
     * @returns The new assertion instance for the changed value.
     */
    function valueOp(scope: IAssertScope): IAssertInst {
        scope.that = scope.newInst(value.value);

        return scope.that;
    }

    let props: AssertScopeFuncDefs<ChangeResultOps> = {
        by: { scopeFn: byOpFn },
        value: { propFn: valueOp }
    };

    _addAssertInstFuncs(newInst, props);

    return newInst as IChangeResultOp;
}
