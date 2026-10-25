/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { equalsFunc } from "../funcs/equal";
import { hasOwnPropertyFunc, hasPropertyFunc } from "../funcs/hasProperty";
import { matchFunc } from "../funcs/match";
import { operatorFunc } from "../funcs/operator";
import { throwsFunc } from "../funcs/throws";
import { truthyFunc } from "../funcs/truthy";
import { changesFunc, increasesFunc, decreasesFunc } from "../funcs/changes";
import { changesByFunc, increasesByFunc, decreasesByFunc, changesButNotByFunc, increasesButNotByFunc, decreasesButNotByFunc } from "../funcs/changesBy";
import { IScopePropFn, IScopeFn } from "../interface/IScopeFuncs";
import { allOp, anyOp } from "../ops/allOp";
import { deepOp } from "../ops/deepOp";
import { hasOp } from "../ops/hasOp";
import { includeOp } from "../ops/includeOp";
import { isOp } from "../ops/isOp";
import { noopOp } from "../ops/noopOp";
import { notOp } from "../ops/notOp";
import { orFunc } from "../funcs/or";
import { ownOp } from "../ops/ownOp";
import { strictlyOp } from "../ops/strictlyOp";
import { toOp } from "../ops/toOp";
import { IAssertScopeFuncDef } from "../interface/IAssertScopeFuncDef";
import { MsgSource } from "../../types/MsgSource";

/**
 * @internal
 * @ignore
 * Returns a new definition that identifies that the operation should be run as a
 * property (inline chained) operation, this will cause the operation to be executed
 * immediately on accessing the property of the {@link IAssertInst} instance.
 * @param propFn - The function to run when the property is accessed.
 * @param evalMsg - The message to use for the evaluation.
 * @returns - The new scope function definition.
 */
function _asPropFn(propFn: IScopePropFn, evalMsg?: MsgSource): IAssertScopeFuncDef {
    return {
        propFn: propFn,
        evalMsg: evalMsg
    };
}

/**
 * @internal
 * @ignore
 * Returns a new definition that identifies that the operation should be run as a
 * normal function and executed only when the caller invokes the function. The `opFunc`
 * will be called with the current calling scope as the `this` context and simple
 * accessing the property of the {@link IAssertInst} instance will return the reference
 * to the `opFunc` function without executing it.
 * @param opFunc - The operation function to run.
 * @returns - The new scope function definition.
 */
function _asFunc(opFunc: IScopeFn): IAssertScopeFuncDef {
    return {
        scopeFn: opFunc
    };
}

/**
 * @internal
 * @ignore
 * Identifies the core system scope operation functions that are available to all
 * assertion scope instances. These functions are added to the {@link IAssertCore}
 * prototype and are available to all assertion instances.
 *
 * The type is written inline, from names the package entry point already exports: `coreFunctions`
 * is itself exported, so a type alias visible only inside this file would appear in the generated
 * declarations as something nothing could import.
 *
 * It also matches what the previous declaration *resolved to* rather than what it read as. That one
 * tied the keys to {@link IAssertInst}, so that forgetting an assertion here would be a compile
 * error -- but `keyof X extends string | number | symbol ? keyof X : never` parses as
 * `keyof (X extends ... ? ... : never)`, and an object type is not a primitive, so it resolved to
 * `keyof never`: an index signature accepting any key at all. Restoring the intended check is a
 * separate change, because the table has entries (`operator`) that {@link IAssertInst} does not
 * declare, and so does not compile under the strict form today.
 */
export const coreFunctions: Readonly<Record<string, IAssertScopeFuncDef>> = {
    not: _asPropFn(notOp),                        // Handles inverting the result `!result` for ALL evakluations
    deep: _asPropFn(deepOp),                      // Sets the `deep` property to true
    own: _asPropFn(ownOp),                        // Sets the `own` property to true
    all: _asPropFn(allOp),                        // Sets the `all` property to true and `any` to false
    any: _asPropFn(anyOp),                        // Sets the `any` property to true and `all` to false
    include: _asPropFn(includeOp),                // Sets the `include` property to true
    includes: _asPropFn(includeOp),                  // Sets the `includes` property to true
    contain: _asPropFn(includeOp),                   // Sets the `contain` property to true
    contains: _asPropFn(includeOp),                  // Sets the `contains` property to true
    strictly: _asPropFn(strictlyOp),              // Sets the `strict` property to true
    is: _asPropFn(isOp),
    to: _asPropFn(toOp),
    has: _asPropFn(hasOp),
    and: _asPropFn(noopOp),                       // Decorative: continues the chain after a called assertion
    or: _asFunc(orFunc),

    ok: _asFunc(truthyFunc),
    equal: _asFunc(equalsFunc),
    equals: _asFunc(equalsFunc),
    eq: _asFunc(equalsFunc),
    operator: _asFunc(operatorFunc),

    throws: _asFunc(throwsFunc),
    toThrow: _asFunc(throwsFunc),
    toThrowError: _asFunc(throwsFunc),
    match: _asFunc(matchFunc),
    hasProperty: _asFunc(hasPropertyFunc),
    hasOwnProperty: _asFunc(hasOwnPropertyFunc),

    change: _asFunc(changesFunc),
    changes: _asFunc(changesFunc),
    changeBy: _asFunc(changesByFunc),
    changesBy: _asFunc(changesByFunc),
    changesButNotBy: _asFunc(changesButNotByFunc),
    increase: _asFunc(increasesFunc),
    increases: _asFunc(increasesFunc),
    increaseBy: _asFunc(increasesByFunc),
    increasesBy: _asFunc(increasesByFunc),
    increasesButNotBy: _asFunc(increasesButNotByFunc),
    decrease: _asFunc(decreasesFunc),
    decreases: _asFunc(decreasesFunc),
    decreaseBy: _asFunc(decreasesByFunc),
    decreasesBy: _asFunc(decreasesByFunc),
    decreasesButNotBy: _asFunc(decreasesButNotByFunc)
};
