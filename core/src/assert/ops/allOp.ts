/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { ALL, ANY } from "../internal/const";
import { IAnyOp } from "../interface/ops/IAnyOp";
import { IAllOp } from "../interface/ops/IAllOp";
import { allKeysFunc, anyKeysFunc } from "../funcs/keysFunc";
import { IAssertScope } from "../interface/IAssertScope";

export function anyOp<R>(scope: IAssertScope): IAnyOp<R> {
    scope.context.set(ANY, true);
    scope.context.set(ALL, false);

    return scope.createOperation<IAnyOp<R>>({
        keys: { propFn: anyKeysFunc }
    });
}

export function allOp<R>(scope: IAssertScope): IAllOp<R> {
    scope.context.set(ANY, false);
    scope.context.set(ALL, true);

    return scope.createOperation<IAllOp<R>>({
        keys: { propFn: allKeysFunc }
    });
}

export function anyOwnOp<R>(scope: IAssertScope): IAnyOp<R> {
    scope.context.set(ANY, true);
    scope.context.set(ALL, false);

    return scope.createOperation<IAnyOp<R>>({
        keys: { propFn: anyKeysFunc }
    });
}

export function allOwnOp<R>(scope: IAssertScope): IAllOp<R> {
    scope.context.set(ANY, true);
    scope.context.set(ALL, false);

    return scope.createOperation<IAnyOp<R>>({
        keys: { propFn: allKeysFunc }
    });
}
