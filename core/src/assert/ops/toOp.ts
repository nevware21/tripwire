/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { throwsFunc } from "../funcs/throws";
import { notOp } from "./notOp";
import { IToOp } from "../interface/ops/IToOp";
import { AssertScopeFuncDefs } from "../interface/IAssertInst";
import { hasOp } from "./hasOp";
import { IAssertScope } from "../interface/IAssertScope";
import { isOp } from "./isOp";
import { matchFunc } from "../funcs/match";
import { includeOp } from "./includeOp";
import { strictlyOp } from "./strictlyOp";
import { deepOp } from "./deepOp";

export function toOp<R>(scope: IAssertScope): IToOp<R> {

    let props: AssertScopeFuncDefs<IToOp<R>> = {
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
        throw: { scopeFn: throwsFunc }
    };
    
    return scope.createOperation(props);
}
