/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { MsgSource } from "../type/MsgSource";
import { IAssertScope } from "../interface/IAssertScope";
import { isFunction } from "@nevware21/ts-utils";

/**
 * Checks if the current value is an instance of the specified constructor.
 * Uses the JavaScript `instanceof` operator for type comparison.
 *
 * @param this - The current {@link IAssertScope} object
 * @param constructor - The constructor function to check against (e.g., Array, Date, Error, custom class)
 * @param evalMsg - The message to display if the value is not an instance of the constructor
 * @returns The current {@link IAssertScope.that} (`this`) object
 * @throws An {@link AssertionFailure} if the constructor is not a function or if the value is not an instance
 * @since 0.1.5
 */
export function instanceOfFunc<R>(this: IAssertScope, constructor: Function, evalMsg?: MsgSource): R {
    let context = this.context;
    let value = context.value;
    
    // Validate that the constructor is a function
    if (!isFunction(constructor)) {
        context.fatal("The instanceOf check requires the constructor to be a function, got " + typeof constructor);
    }

    let constructorName = constructor.name || "Anonymous";
    
    context.set("expected", constructorName);
    context.set("constructorFn", constructor);

    context.eval(
        value instanceof constructor,
        evalMsg || "expected {value} to be an instance of {expected}"
    );

    return this.that;
}
