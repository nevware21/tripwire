/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { DEEP } from "../internal/const";
import { IDeepOp } from "../interface/ops/IDeepOp";
import { includeOp } from "./includeOp";
import { ownDeepOp } from "./ownOp";
import { notOp } from "./notOp";
import { deepEqualsFunc } from "../funcs/equal";
import { deepStrictlyOp } from "./strictlyOp";
import { hasDeepPropertyFunc, hasPropertyDescriptorFunc } from "../funcs/hasProperty";
import { AssertScopeFuncDefs } from "../interface/IAssertInst";
import { IAssertScope } from "../interface/IAssertScope";
import { deepNestedOp } from "./nestedOp";

export function deepOp<R>(scope: IAssertScope): IDeepOp<R> {
    scope.context.set(DEEP, true);
    
    let props: AssertScopeFuncDefs<IDeepOp<R>> = {
        not: { propFn: notOp },
        strictly: { propFn: deepStrictlyOp },
        equal: { scopeFn: deepEqualsFunc },
        equals: { scopeFn: deepEqualsFunc },
        eq: { scopeFn: deepEqualsFunc },
        include: { propFn: includeOp },
        includes: { propFn: includeOp },
        contain: { propFn: includeOp },
        contains: { propFn: includeOp },
        property: { scopeFn: hasDeepPropertyFunc },
        propertyDescriptor: { scopeFn: hasPropertyDescriptorFunc },
        own: { propFn: ownDeepOp },
        nested: { propFn: deepNestedOp }
    };

    return scope.createOperation(props);
}
