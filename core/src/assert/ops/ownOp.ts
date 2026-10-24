/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { getLazy, getKnownSymbol, WellKnownSymbols } from "@nevware21/ts-utils";
import { IOwnOp } from "../interface/ops/IOwnOp";
import { ownIncludeOp, deepOwnIncludeOp } from "./includeOp";
import { hasDeepOwnPropertyFunc, hasOwnPropertyDescriptorFunc, hasOwnPropertyFunc } from "../funcs/hasProperty";
import { IAssertScope } from "../interface/IAssertScope";
import { AssertScopeFuncDefs } from "../interface/IAssertScopeFuncDef";
import { hasOwnSymbolFunc } from "../funcs/hasSymbol";
import { OWN } from "../../internal/const";

const _ownOpProps = /* #__PURE__ */ getLazy<AssertScopeFuncDefs<IOwnOp<any>>>(() => ({
    contain: { propFn: ownIncludeOp },
    contains: { propFn: ownIncludeOp },
    include: { propFn: ownIncludeOp },
    includes: { propFn: ownIncludeOp },
    property: { scopeFn: hasOwnPropertyFunc },
    propertyDescriptor: { scopeFn: hasOwnPropertyDescriptorFunc },
    iterator: { scopeFn: hasOwnSymbolFunc(getKnownSymbol(WellKnownSymbols.iterator)) }
}));

const _ownDeepOpProps = /* #__PURE__ */ getLazy<AssertScopeFuncDefs<IOwnOp<any>>>(() => ({
    contain: { propFn: deepOwnIncludeOp },
    contains: { propFn: deepOwnIncludeOp },
    include: { propFn: deepOwnIncludeOp },
    includes: { propFn: deepOwnIncludeOp },
    property: { scopeFn: hasDeepOwnPropertyFunc },
    propertyDescriptor: { scopeFn: hasOwnPropertyDescriptorFunc },
    iterator: { scopeFn: hasOwnSymbolFunc(getKnownSymbol(WellKnownSymbols.iterator)) }
}));

export function ownOp<R>(scope: IAssertScope): IOwnOp<R> {
    scope.context.set(OWN, true);

    return scope.createOperation(_ownOpProps.v);
}

export function ownDeepOp<R>(scope: IAssertScope): IOwnOp<R> {
    scope.context.set(OWN, true);

    return scope.createOperation(_ownDeepOpProps.v);
}
