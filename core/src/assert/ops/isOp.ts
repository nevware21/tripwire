/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IIsOp } from "../interface/ops/IIsOp";
import {
    isArrayFunc, isBooleanFunc, isFalseFunc, isFunctionFunc, isNaNFunc, isNullFunc, isNumberFunc,
    isObjectFunc, isPlainObjectFunc, isStringFunc, isTrueFunc, isTruthyFunc, isUndefinedFunc
} from "../funcs/is";
import { isErrorFunc } from "../funcs/throws";
import { isFrozenFunc } from "../funcs/isFrozen";
import { isSealedFunc } from "../funcs/isSealed";
import { isEmptyFunc } from "../funcs/isEmpty";
import { strictlyOp } from "./strictlyOp";
import { notOp } from "./notOp";
import { equalsFunc } from "../funcs/equal";
import { AssertScopeFuncDefs } from "../interface/IAssertInst";
import { noopOp } from "./noopOp";
import { IAssertScope } from "../interface/IAssertScope";
import { isExtensibleFunc } from "../funcs/isExtensible";
import { hasSymbolFunc } from "../funcs/hasSymbol";
import { aboveFunc, belowFunc, leastFunc, mostFunc, withinFunc } from "./numericOp";

export function isOp<R>(scope: IAssertScope): IIsOp<R> {
    let props:  AssertScopeFuncDefs<IIsOp<R>> = {
        equal: { scopeFn: equalsFunc },
        equals: { scopeFn: equalsFunc },
        eq: { scopeFn: equalsFunc },

        a: { propFn: noopOp },
        an: { propFn: noopOp },

        strictly: { propFn: strictlyOp },
        not: { propFn: notOp },

        ok: { scopeFn: isTruthyFunc },
        array: { scopeFn: isArrayFunc },
        object: { scopeFn: isObjectFunc },
        plainObject: { scopeFn: isPlainObjectFunc },
        function: { scopeFn: isFunctionFunc },
        string: { scopeFn: isStringFunc },
        number: { scopeFn: isNumberFunc },
        boolean: { scopeFn: isBooleanFunc },
        undefined: { scopeFn: isUndefinedFunc },
        null: { scopeFn: isNullFunc },
        truthy: { scopeFn: isTruthyFunc },
        true: { scopeFn: isTrueFunc },
        false: { scopeFn: isFalseFunc },
        empty: { scopeFn: isEmptyFunc },
        sealed: { scopeFn: isSealedFunc },
        frozen: { scopeFn: isFrozenFunc },
        error: { scopeFn: isErrorFunc },
        extensible: { scopeFn: isExtensibleFunc },
        iterable: { scopeFn: hasSymbolFunc(Symbol.iterator) },
        nan: { scopeFn: isNaNFunc },

        // Numeric comparison operations
        above: { scopeFn: aboveFunc },
        gt: { scopeFn: aboveFunc },
        greaterThan: { scopeFn: aboveFunc },
        least: { scopeFn: leastFunc },
        gte: { scopeFn: leastFunc },
        greaterThanOrEqual: { scopeFn: leastFunc },
        below: { scopeFn: belowFunc },
        lt: { scopeFn: belowFunc },
        lessThan: { scopeFn: belowFunc },
        most: { scopeFn: mostFunc },
        lte: { scopeFn: mostFunc },
        lessThanOrEqual: { scopeFn: mostFunc },
        within: { scopeFn: withinFunc }
    };
    
    return scope.createOperation(props);
}
