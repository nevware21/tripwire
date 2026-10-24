/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { getLazy } from "@nevware21/ts-utils";
import { IStrictlyOp } from "../interface/ops/IStrictlyOp";
import { deepStrictEqualsFunc, strictEqualsFunc } from "../funcs/equal";
import { notOp } from "./notOp";
import { isStrictFalseFunc, isStrictTrueFunc } from "../funcs/is";
import { AssertScopeFuncDefs } from "../interface/IAssertScopeFuncDef";
import { IAssertScope } from "../interface/IAssertScope";
import { STRICT } from "../../internal/const";

const _strictlyOpProps = /* #__PURE__ */ getLazy<AssertScopeFuncDefs<IStrictlyOp<any>>>(() => ({
    not: { propFn: notOp },
    equal: { scopeFn: strictEqualsFunc },
    equals: { scopeFn: strictEqualsFunc },
    eq: { scopeFn: strictEqualsFunc },
    true: { scopeFn: isStrictTrueFunc },
    false: { scopeFn: isStrictFalseFunc }
}));

const _deepStrictlyOpProps = /* #__PURE__ */ getLazy<AssertScopeFuncDefs<IStrictlyOp<any>>>(() => ({
    not: { propFn: notOp },
    equal: { scopeFn: deepStrictEqualsFunc },
    equals: { scopeFn: deepStrictEqualsFunc },
    eq: { scopeFn: deepStrictEqualsFunc },
    true: { scopeFn: isStrictTrueFunc },
    false: { scopeFn: isStrictFalseFunc }
}));

export function strictlyOp<R>(scope: IAssertScope): IStrictlyOp<R> {
    scope.context.set(STRICT, true);

    return scope.createOperation(_strictlyOpProps.v);
}

export function deepStrictlyOp<R>(scope: IAssertScope): IStrictlyOp<R> {
    scope.context.set(STRICT, true);

    return scope.createOperation(_deepStrictlyOpProps.v);
}
