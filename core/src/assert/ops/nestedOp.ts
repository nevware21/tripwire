/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { getLazy } from "@nevware21/ts-utils";
import { INestedOp } from "../interface/ops/INestedOp";
import { IAssertScope } from "../interface/IAssertScope";
import { AssertScopeFuncDefs } from "../interface/IAssertScopeFuncDef";
import { hasNestedPropertyFunc, nestedIncludeFunc, hasDeepNestedPropertyFunc, deepNestedIncludeFunc } from "../funcs/nested";

const _nestedOpProps = /* #__PURE__ */ getLazy<AssertScopeFuncDefs<INestedOp<any>>>(() => ({
    property: { scopeFn: hasNestedPropertyFunc },
    include: { scopeFn: nestedIncludeFunc },
    includes: { scopeFn: nestedIncludeFunc },
    contain: { scopeFn: nestedIncludeFunc },
    contains: { scopeFn: nestedIncludeFunc }
}));

const _deepNestedOpProps = /* #__PURE__ */ getLazy<AssertScopeFuncDefs<INestedOp<any>>>(() => ({
    property: { scopeFn: hasDeepNestedPropertyFunc },
    include: { scopeFn: deepNestedIncludeFunc },
    includes: { scopeFn: deepNestedIncludeFunc },
    contain: { scopeFn: deepNestedIncludeFunc },
    contains: { scopeFn: deepNestedIncludeFunc }
}));

/**
 * Creates the nested assertion operation using the given scope.
 * This provides operations for nested property checking using dot notation.
 * @param scope - The current scope of the assert
 * @returns - The {@link INestedOp} operation instance.
 * @since 0.1.5
 */
export function nestedOp<R>(scope: IAssertScope): INestedOp<R> {
    return scope.createOperation(_nestedOpProps.v);
}

/**
 * Creates the deep nested assertion operation using the given scope.
 * This provides operations for nested property checking with deep equality.
 * @param scope - The current scope of the assert
 * @returns - The {@link INestedOp} operation instance.
 * @since 0.1.5
 */
export function deepNestedOp<R>(scope: IAssertScope): INestedOp<R> {
    return scope.createOperation(_deepNestedOpProps.v);
}

