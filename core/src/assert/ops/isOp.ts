/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IIsOp } from "../interface/ops/IIsOp";
import {
    isArrayFunc, isBooleanFunc, isFalseFunc, isFunctionFunc, isNaNFunc, isFiniteFunc, isNullFunc, isNumberFunc,
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
import { typeOfFunc } from "../funcs/typeOf";
import { instanceOfFunc } from "../funcs/instanceOf";
import { closeToFunc } from "../funcs/closeTo";

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
        finite: { scopeFn: isFiniteFunc },
        
        /**
         * Asserts that the value is an instance of the specified constructor.
         * This is an alias for `instanceOf` to support the JavaScript `instanceof` keyword style.
         *
         * @since 0.1.5
         * @example
         * ```typescript
         * expect(new Date()).is.instanceof(Date);
         * expect([]).is.instanceof(Array);
         * expect(new Error()).is.instanceof(Error);
         * expect({}).is.instanceof(Object);
         * ```
         */
        instanceof: { scopeFn: instanceOfFunc },
        
        /**
         * Asserts that the value is an instance of the specified constructor.
         * Uses the JavaScript `instanceof` operator for type checking.
         *
         * @since 0.1.5
         * @example
         * ```typescript
         * expect(new Date()).is.instanceOf(Date);
         * expect([]).to.be.instanceOf(Array);
         * expect(new Error()).is.instanceOf(Error);
         * expect({}).to.be.an.instanceOf(Object);
         *
         * // With negation
         * expect("hello").is.not.instanceOf(Number);
         * expect(123).to.not.be.instanceOf(String);
         *
         * // Custom classes
         * class MyClass {}
         * expect(new MyClass()).is.instanceOf(MyClass);
         * ```
         */
        instanceOf: { scopeFn: instanceOfFunc },

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
        within: { scopeFn: withinFunc },

        // Approximate equality
        closeTo: { scopeFn: closeToFunc },
        approximately: { scopeFn: closeToFunc },

        // Type checking
        typeOf: { scopeFn: typeOfFunc }
    };
    
    return scope.createOperation(props);
}
