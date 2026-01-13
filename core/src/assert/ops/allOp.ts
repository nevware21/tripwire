/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2025 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { ALL, ANY } from "../internal/const";
import { IAnyOp } from "../interface/ops/IAnyOp";
import { IAllOp } from "../interface/ops/IAllOp";
import { allKeysFunc, anyKeysFunc } from "../funcs/keysFunc";
import { IAssertScope } from "../interface/IAssertScope";
import { AssertScopeFuncDefs } from "../interface/IAssertInst";
import { allValuesFunc, anyValuesFunc } from "../funcs/valuesFunc";

export function anyOp<R>(scope: IAssertScope): IAnyOp<R> {
    scope.context.set(ANY, true);
    scope.context.set(ALL, false);

    const props: AssertScopeFuncDefs<IAnyOp<R>> = {
        keys: { propFn: anyKeysFunc }
    };

    return scope.createOperation(props, anyValuesFunc(scope));
}

export function allOp<R>(scope: IAssertScope): IAllOp<R> {
    scope.context.set(ANY, false);
    scope.context.set(ALL, true);

    const props: AssertScopeFuncDefs<IAllOp<R>> = {
        keys: { propFn: allKeysFunc }
    };

    return scope.createOperation(props, allValuesFunc(scope));
}

export const anyOwnOp: <R>(scope: IAssertScope) => IAnyOp<R> = anyOp;

export const allOwnOp: <R>(scope: IAssertScope) => IAllOp<R> = allOp;
