/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IStrictlyOp } from "../interface/ops/IStrictlyOp";
import { STRICT } from "../internal/const";
import { deepStrictEqualsFunc, strictEqualsFunc } from "../funcs/equal";
import { notOp } from "./notOp";
import { isStrictFalseFunc, isStrictTrueFunc } from "../funcs/is";
import { AssertScopeFuncDefs } from "../interface/IAssertInst";
import { IAssertScope } from "../interface/IAssertScope";

export function strictlyOp<R>(scope: IAssertScope): IStrictlyOp<R> {
    scope.context.set(STRICT, true);

    const props: AssertScopeFuncDefs<IStrictlyOp<R>> = {
        not: { propFn: notOp },
        equal: { scopeFn: strictEqualsFunc },
        equals: { scopeFn: strictEqualsFunc },
        eq: { scopeFn: strictEqualsFunc },
        true: { scopeFn: isStrictTrueFunc },
        false: { scopeFn: isStrictFalseFunc }
    };

    return scope.createOperation(props);
}

export function deepStrictlyOp<R>(scope: IAssertScope): IStrictlyOp<R> {
    scope.context.set(STRICT, true);

    const props: AssertScopeFuncDefs<IStrictlyOp<R>> = {
        not: { propFn: notOp },
        equal: { scopeFn: deepStrictEqualsFunc },
        equals: { scopeFn: deepStrictEqualsFunc },
        eq: { scopeFn: deepStrictEqualsFunc },
        true: { scopeFn: isStrictTrueFunc },
        false: { scopeFn: isStrictFalseFunc }
    };

    return scope.createOperation(props);
}
