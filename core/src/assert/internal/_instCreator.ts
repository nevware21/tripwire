/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { dumpObj, getLazy, ILazyValue, newSymbol, objDefine } from "@nevware21/ts-utils";
import { IAssertScope } from "../interface/IAssertScope";
import { IAssertInstHandlers } from "../interface/IAssertInstHandlers";
import { AssertionError } from "../assertionError";
import { IAssertInstCore } from "../interface/IAssertInstCore";

/**
 * @internal
 * @ignore
 * The symbol used to tag assertion instances, using `newSymbol` to ensure uniqueness
 * across multiple instances of the library.
 */
const cAssertTag:symbol = newSymbol("@nevware21/tripwire#IAssertInst");

/**
 * @internal
 * @ignore
 * The symbol used to tag the scope instance for assertion instances, using `newSymbol`
 * to ensure uniqueness across multiple instances of the library.
 */
const cScopeTag:symbol = newSymbol("@nevware21/tripwire#IAssertScope");

/**
 * @internal
 * @ignore
 * Checks if the provided object is an instance of the {@link IAssertInst} interface.
 * @param obj - The object to check.
 * @returns - `true` if the object is an instance of the {@link IAssertInst} interface, otherwise `false`.
 */
export function _isAssertInst<T extends IAssertInstCore>(obj: any): obj is T {
    if (obj && obj[cAssertTag]) {
        return true;
    }

    return false;
}

/**
 * Returns the scope instance for the given instance.
 * @param inst - The instance to get the scope for.
 * @returns - The scope instance for the instance.
 */
export function _getAssertScope<T>(inst: T): IAssertScope {
    return (inst as any)[cScopeTag] as IAssertScope;
}

export function _setAssertScope<T>(inst: T, scope: IAssertScope, internalErrorStackStart?: Function): void {
    if (cScopeTag in (inst as any) && (inst as any)[cScopeTag] !== scope) {
        throw new AssertionError("Cannot reset the scope of an object that already has a scope", null, internalErrorStackStart);
    }

    objDefine(inst as any, cScopeTag, {
        v: scope,
        e: false
    });

    // Sanity check to ensure the scope was set, if the object was frozen this will likely fail
    if ((inst as any)[cScopeTag] !== scope) {
        throw new AssertionError("Unable to set the scope for an operation - " + dumpObj(inst), null, internalErrorStackStart);
    }
}

/**
 * @internal
 * @ignore
 * Internal function to create a lazy creator {@link IAssertInstHandlers} wrapper that will call
 * the provided creator functions and tag the new instances as assertion instances.
 * @param creator - The creator function to use to create the new instances.
 * @returns - A new lazy value that will create the new instances.
 */
export function _createLazyInstHandler(creator: () => IAssertInstHandlers): ILazyValue<IAssertInstHandlers> {
    return getLazy<IAssertInstHandlers>(() => {
        let theCreator = creator();

        function _creator(newFunc: keyof IAssertInstHandlers) {
            return (scope: IAssertScope) => {
                let newInst = theCreator[newFunc](scope);

                // Tags the instance as an assertion instance
                objDefine(newInst, cAssertTag, {
                    v: true,
                    e: false
                });

                objDefine(newInst, cScopeTag, {
                    v: scope,
                    e: false
                });

                return newInst;
            };
        }

        return {
            newAssertInst: _creator("newAssertInst"),
            newEmptyAssertInst: _creator("newEmptyAssertInst")
        };
    });
}
