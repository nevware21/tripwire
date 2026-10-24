/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { getLazy } from "@nevware21/ts-utils";
import { throwsFunc } from "../funcs/throws";
import { notOp } from "./notOp";
import { IToOp } from "../interface/ops/IToOp";
import { AssertScopeFuncDefs } from "../interface/IAssertScopeFuncDef";
import { hasOp } from "./hasOp";
import { IAssertScope } from "../interface/IAssertScope";
import { isOp } from "./isOp";
import { matchFunc } from "../funcs/match";
import { includeOp } from "./includeOp";
import { strictlyOp } from "./strictlyOp";
import { deepOp } from "./deepOp";
import { existsFunc } from "../funcs/exists";
import { ifErrorFunc } from "../funcs/ifError";
import { changesFunc, increasesFunc, decreasesFunc } from "../funcs/changes";
import { changesByFunc, increasesByFunc, decreasesByFunc, changesButNotByFunc, increasesButNotByFunc, decreasesButNotByFunc } from "../funcs/changesBy";
import { equalsFunc } from "../funcs/equal";

const _toOpProps = /* #__PURE__ */ getLazy<AssertScopeFuncDefs<IToOp<any>>>(() => ({
    equal: { scopeFn: equalsFunc },
    equals: { scopeFn: equalsFunc },
    eq: { scopeFn: equalsFunc },
    not: { propFn: notOp },
    have: { propFn: hasOp },
    be: { propFn: isOp },
    deep: { propFn: deepOp },
    include: { propFn: includeOp },
    includes: { propFn: includeOp },
    contain: { propFn: includeOp },
    contains: { propFn: includeOp },
    strictly: { propFn: strictlyOp },
    match: { scopeFn: matchFunc },
    throw: { scopeFn: throwsFunc },
    exist: { scopeFn: existsFunc },
    ifError: { scopeFn: ifErrorFunc },
    change: { scopeFn: changesFunc },
    changes: { scopeFn: changesFunc },
    changeBy: { scopeFn: changesByFunc },
    changesBy: { scopeFn: changesByFunc },
    changesButNotBy: { scopeFn: changesButNotByFunc },
    increase: { scopeFn: increasesFunc },
    increases: { scopeFn: increasesFunc },
    increaseBy: { scopeFn: increasesByFunc },
    increasesBy: { scopeFn: increasesByFunc },
    increasesButNotBy: { scopeFn: increasesButNotByFunc },
    decrease: { scopeFn: decreasesFunc },
    decreases: { scopeFn: decreasesFunc },
    decreaseBy: { scopeFn: decreasesByFunc },
    decreasesBy: { scopeFn: decreasesByFunc },
    decreasesButNotBy: { scopeFn: decreasesButNotByFunc }
}));

export function toOp<R>(scope: IAssertScope): IToOp<R> {

    return scope.createOperation(_toOpProps.v);
}
