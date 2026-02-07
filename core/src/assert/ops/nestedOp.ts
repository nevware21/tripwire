/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { INestedOp } from "../interface/ops/INestedOp";
import { IAssertScope } from "../interface/IAssertScope";
import { AssertScopeFuncDefs } from "../interface/IAssertInst";
import { hasNestedPropertyFunc, nestedIncludeFunc, hasDeepNestedPropertyFunc, deepNestedIncludeFunc } from "../funcs/nested";

/**
 * Creates the nested assertion operation using the given scope.
 * This provides operations for nested property checking using dot notation.
 * @param scope - The current scope of the assert
 * @returns - The {@link INestedOp} operation instance.
 * @since 0.1.5
 */
export function nestedOp<R>(scope: IAssertScope): INestedOp<R> {
    let props: AssertScopeFuncDefs<INestedOp<R>> = {
        property: { scopeFn: hasNestedPropertyFunc },
        include: { scopeFn: nestedIncludeFunc },
        includes: { scopeFn: nestedIncludeFunc },
        contain: { scopeFn: nestedIncludeFunc },
        contains: { scopeFn: nestedIncludeFunc }
    };

    return scope.createOperation(props);
}

/**
 * Creates the deep nested assertion operation using the given scope.
 * This provides operations for nested property checking with deep equality.
 * @param scope - The current scope of the assert
 * @returns - The {@link INestedOp} operation instance.
 * @since 0.1.5
 */
export function deepNestedOp<R>(scope: IAssertScope): INestedOp<R> {
    let props: AssertScopeFuncDefs<INestedOp<R>> = {
        property: { scopeFn: hasDeepNestedPropertyFunc },
        include: { scopeFn: deepNestedIncludeFunc },
        includes: { scopeFn: deepNestedIncludeFunc },
        contain: { scopeFn: deepNestedIncludeFunc },
        contains: { scopeFn: deepNestedIncludeFunc }
    };

    return scope.createOperation(props);
}

