/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IHasOp } from "../interface/ops/IHasOp";
import { ownOp } from "./ownOp";
import { hasOwnPropertyDescriptorFunc, hasOwnPropertyFunc, hasPropertyDescriptorFunc, hasPropertyFunc } from "../funcs/hasProperty";
import { allOp, allOwnOp, anyOp, anyOwnOp } from "./allOp";
import { AssertScopeFuncDefs } from "../interface/IAssertInst";
import { IAssertScope } from "../interface/IAssertScope";
import { hasOwnSymbolFunc, hasSymbolFunc } from "../funcs/hasSymbol";
import { nestedOp } from "./nestedOp";

export function hasOp<R>(scope: IAssertScope): IHasOp<R> {
    let props: AssertScopeFuncDefs<IHasOp<R>> = {
        all: { propFn: allOp },
        any: { propFn: anyOp },
        property: { scopeFn: hasPropertyFunc },
        propertyDescriptor: { scopeFn: hasPropertyDescriptorFunc},
        own: { propFn: ownOp },
        nested: { propFn: nestedOp },
        iterator: { scopeFn: hasSymbolFunc(Symbol.iterator) }
    };
    
    return scope.createOperation(props);
}

export function hasOwnOp<R>(scope: IAssertScope): IHasOp<R> {
    let props: AssertScopeFuncDefs<IHasOp<R>> = {
        all: { propFn: allOwnOp },
        any: { propFn: anyOwnOp },
        property: { scopeFn: hasOwnPropertyFunc },
        propertyDescriptor: { scopeFn: hasOwnPropertyDescriptorFunc},
        own: { propFn: ownOp },
        nested: { propFn: nestedOp },
        iterator: { scopeFn: hasOwnSymbolFunc(Symbol.iterator) }
    };
    
    return scope.createOperation(props);
}
