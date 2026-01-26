/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { OWN } from "../internal/const";
import { IOwnOp } from "../interface/ops/IOwnOp";
import { ownIncludeOp, deepOwnIncludeOp } from "./includeOp";
import { hasDeepOwnPropertyFunc, hasOwnPropertyDescriptorFunc, hasOwnPropertyFunc } from "../funcs/hasProperty";
import { IAssertScope } from "../interface/IAssertScope";
import { AssertScopeFuncDefs } from "../interface/IAssertInst";
import { hasOwnSymbolFunc } from "../funcs/hasSymbol";

export function ownOp<R>(scope: IAssertScope): IOwnOp<R> {
    scope.context.set(OWN, true);

    let props: AssertScopeFuncDefs<IOwnOp<R>> = {
        contain: { propFn: ownIncludeOp },
        contains: { propFn: ownIncludeOp },
        include: { propFn: ownIncludeOp },
        includes: { propFn: ownIncludeOp },
        property: { scopeFn: hasOwnPropertyFunc },
        propertyDescriptor: { scopeFn: hasOwnPropertyDescriptorFunc },
        iterator: { scopeFn: hasOwnSymbolFunc(Symbol.iterator) }
    };
    
    return scope.createOperation(props);
}

export function ownDeepOp<R>(scope: IAssertScope): IOwnOp<R> {
    scope.context.set(OWN, true);

    let props: AssertScopeFuncDefs<IOwnOp<R>> = {
        contain: { propFn: deepOwnIncludeOp },
        contains: { propFn: deepOwnIncludeOp },
        include: { propFn: deepOwnIncludeOp },
        includes: { propFn: deepOwnIncludeOp },
        property: { scopeFn: hasDeepOwnPropertyFunc },
        propertyDescriptor: { scopeFn: hasOwnPropertyDescriptorFunc },
        iterator: { scopeFn: hasOwnSymbolFunc(Symbol.iterator) }
    };
    
    return scope.createOperation(props);
}
