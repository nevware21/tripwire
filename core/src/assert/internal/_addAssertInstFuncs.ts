/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { arrForEach, arrIndexOf, dumpObj, isFunction, newSymbol, objDefine, objForEachKey, objHasOwnProperty } from "@nevware21/ts-utils";
import { AssertionError } from "../assertionError";
import { IScopePropFn, IScopeFn } from "../interface/IScopeFuncs";
import { IAssertScopeFuncDef, AssertScopeFuncDefs } from "../interface/IAssertInst";
import { _isBannedProperty, _isBannedPrototype } from "./_banned";
import { _createAssertInstFunc } from "./_createAssertInstFunc";

/**
 * @internal
 * Internal symbol to enable tracking and clearing of user functions, using `newSymbol`
 * to ensure uniqueness across multiple instances of the library.
 */
const _userFuncsSymbol = newSymbol("@nevware21/tripwire/userFuncs");

/**
 * @internal
 * Internal function to add functions to the target object, may be the internal prototypes or
 * an instance of the base instance object.
 * @param target - The target object to add the functions to.
 * @param funcs - The functions to add to the target object.
 * @param tag - Flag to indicate if the functions are user functions.
 * @param internalErrorStackStart - The function to use as the start of the error stack.
 * @returns - The target object with the functions added.
 */
export function _addAssertInstFuncs<T>(target: any, funcs: AssertScopeFuncDefs<T>, tag?: boolean, internalErrorStackStart?: Function): boolean {
    let addedFuncs = false;

    if (_isBannedPrototype(target)) {
        throw new AssertionError("Cannot add functions to " + target, null, internalErrorStackStart);
    }

    let userTags: string[] = null;
    if (tag) {
        if (!objHasOwnProperty(target, _userFuncsSymbol)) {
            objDefine(target, _userFuncsSymbol, {
                v: [],
                e: false
            });
        }

        userTags = target[_userFuncsSymbol];
    }

    objForEachKey(funcs, (name, funcDef: IAssertScopeFuncDef) => {
        let _func: IScopeFn = null;
        let _propFn: IScopePropFn = null;

        if ("scopeFn" in funcDef && funcDef.scopeFn) {          // Do we have a IAssertScopeFuncDef (with a function)
            _func = funcDef.scopeFn;
            if (funcDef.propFn) {
                throw new AssertionError("Invalid function definition for \"" + name + "\" : " + dumpObj(funcDef), null, internalErrorStackStart);
            }
        } else if ("propFn" in funcDef && funcDef.propFn) {     // Do we have a IAssertScopeFuncDef (with a function)
            if (isFunction(funcDef.propFn)) {
                _propFn = funcDef.propFn;
            } else {
                throw new AssertionError("Invalid operation definition for \"" + name + "\" : " + dumpObj(funcDef), null, internalErrorStackStart);
            }
        }

        if (!_func && !_propFn) {
            throw new AssertionError("Invalid definition for \"" + name + "\" : " + dumpObj(funcDef), null, internalErrorStackStart);
        }

        // Do not allow the function to be overwritten
        if (_isBannedProperty(name)) {
            throw new AssertionError("Invalid operation name: " + name, null, internalErrorStackStart);
        }

        objDefine(target, name, {
            g: _createAssertInstFunc(name, _func, _propFn, funcDef.evalMsg),
            c: !!tag                    // Do not allow the function to be overwritten unless it is a user function
        });

        if (tag) {
            if (arrIndexOf(userTags, name) === -1) {
                userTags.push(name);
            }
        }

        addedFuncs = true;
    });

    return addedFuncs;
}

/**
 * @internal
 * Internal function to clear the user instance functions from the target object.
 * @param target - The target object to clear the user instance functions from.
 */
export function _clearUserInstFuncs(target: any) {
    let userTags = target[_userFuncsSymbol];
    if (userTags) {
        arrForEach(userTags, (name) => {
            if (objHasOwnProperty(target, name)) {
                delete target[name];
            }
        });

        // Clear the user tags
        userTags.length = 0;
    }
}
