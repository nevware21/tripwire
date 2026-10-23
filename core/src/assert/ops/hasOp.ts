/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { getLazy, getKnownSymbol, WellKnownSymbols } from "@nevware21/ts-utils";
import { IHasOp } from "../interface/ops/IHasOp";
import { IHasOwnOp } from "../interface/ops/IHasOwnOp";
import { hasOwnPropertyDescriptorFunc, hasOwnPropertyFunc, hasPropertyDescriptorFunc, hasPropertyFunc } from "../funcs/hasProperty";
import { allOp, allOwnOp, anyOp, anyOwnOp } from "./allOp";
import { ownIncludeOp } from "./includeOp";
import { IAssertScope } from "../interface/IAssertScope";
import { hasOwnSymbolFunc, hasSymbolFunc } from "../funcs/hasSymbol";
import { nestedOp } from "./nestedOp";
import { lengthFunc } from "../funcs/length";
import { AssertScopeFuncDefs } from "../interface/IAssertScopeFuncDef";
import { OWN } from "../../internal/const";

const _hasOpProps = /* #__PURE__ */ getLazy<AssertScopeFuncDefs<IHasOp<any>>>(() => ({
    all: { propFn: allOp },
    any: { propFn: anyOp },
    property: { scopeFn: hasPropertyFunc },
    propertyDescriptor: { scopeFn: hasPropertyDescriptorFunc},
    own: { propFn: hasOwnOp },
    nested: { propFn: nestedOp },
    iterator: { scopeFn: hasSymbolFunc(getKnownSymbol(WellKnownSymbols.iterator)) },
    lengthOf: { scopeFn: lengthFunc },
    sizeOf: { scopeFn: lengthFunc }
}));

/**
 * The `has.own` table: every {@link IOwnOp} assertion (the same functions `ownOp` binds, so `.has.own.include`
 * and `.own.include` cannot drift apart) plus the own forms of the `has` assertions.
 */
const _hasOwnOpProps = /* #__PURE__ */ getLazy<AssertScopeFuncDefs<IHasOwnOp<any>>>(() => ({
    all: { propFn: allOwnOp },
    any: { propFn: anyOwnOp },
    contain: { propFn: ownIncludeOp },
    contains: { propFn: ownIncludeOp },
    include: { propFn: ownIncludeOp },
    includes: { propFn: ownIncludeOp },
    property: { scopeFn: hasOwnPropertyFunc },
    propertyDescriptor: { scopeFn: hasOwnPropertyDescriptorFunc},
    nested: { propFn: nestedOp },
    iterator: { scopeFn: hasOwnSymbolFunc(getKnownSymbol(WellKnownSymbols.iterator)) },
    lengthOf: { scopeFn: lengthFunc },
    sizeOf: { scopeFn: lengthFunc }
}));

export function hasOp<R>(scope: IAssertScope): IHasOp<R> {
    return scope.createOperation(_hasOpProps.v);
}

/**
 * `has.own` — the `has` assertions restricted to the object's own properties, never its prototype chain.
 * @param scope - The current scope of the assert
 * @returns - The {@link IHasOwnOp} operation instance.
 */
export function hasOwnOp<R>(scope: IAssertScope): IHasOwnOp<R> {
    scope.context.set(OWN, true);

    return scope.createOperation(_hasOwnOpProps.v);
}
