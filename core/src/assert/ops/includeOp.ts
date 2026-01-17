/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { arrIndexOf, isArray, isFunction, isString, objKeys } from "@nevware21/ts-utils";
import { MsgSource } from "../type/MsgSource";
import { allOp, anyOp } from "./allOp";
import { IAssertInst, AssertScopeFuncDefs } from "../interface/IAssertInst";
import { IIncludeOp } from "../interface/ops/IIncludeOp";
import { IAssertScope } from "../interface/IAssertScope";
import { includeDeepMembersFunc, includeDeepOrderedMembersFunc, includeMembersFunc, includeOrderedMembersFunc, sameDeepMembersFunc, sameDeepOrderedMembersFunc, sameMembersFunc, sameOrderedMembersFunc, startsWithMembersFunc, startsWithDeepMembersFunc, endsWithMembersFunc, endsWithDeepMembersFunc, subsequenceFunc, deepSubsequenceFunc } from "../funcs/members";
import { _deepEqual } from "../funcs/equal";

/**
 * Creates the include assertion operation using the given scope.
 * This includes the primary include function and any additional properties
 * as identified by the {@link IncludeOpProps} interface.
 * @param scope - The current scope of the assert
 * @returns - The {@link IIncludeOp} operation instance.
 */
export function includeOp<R>(scope: IAssertScope): IIncludeOp<R> {

    function _includes(this: IAssertScope, match: any, evalMsg?: MsgSource): IAssertInst {
        let scope = this;
        let context = scope.context;
        let value = context.value;

        context.set("match", match);
        if (isString(value)) {
            context.eval(value.indexOf(match) > -1, evalMsg || "expected {value} to include {match}");
        } else if (isArray(value)) {
            context.eval(arrIndexOf(value, match) > -1, evalMsg || "expected {value} to include {match}");
        } else if (value && isFunction(value.has)) {
            // Looks like a set or map
            context.eval(value.has(match), evalMsg || "expected {value} to include {match}");
        } else {
            let keys = value ? objKeys(value) : [];
            context.set("keys", keys);
            context.eval(arrIndexOf(keys, match) > -1, evalMsg || "expected {value} to have a {match} property");
        }

        return scope.newInst();
    }
    
    const props: AssertScopeFuncDefs<IIncludeOp<R>> = {
        any: { propFn: anyOp },
        all: { propFn: allOp },
        members: { scopeFn: includeMembersFunc },
        orderedMembers: { scopeFn: includeOrderedMembersFunc },
        sameMembers: { scopeFn: sameMembersFunc },
        sameOrderedMembers: { scopeFn: sameOrderedMembersFunc },
        startsWithMembers: { scopeFn: startsWithMembersFunc },
        endsWithMembers: { scopeFn: endsWithMembersFunc },
        subsequence: { scopeFn: subsequenceFunc }
    };

    return scope.createOperation(props, _includes);
}

/**
 * Function to deeply include an operation.
 *
 * @param {any} obj - The object to perform the operation on.
 * @param {string} key - The key to include in the operation.
 * @param {any} value - The value to include in the operation.
 * @returns {boolean} - Returns true if the operation was successful, otherwise false.
 */
export function deepIncludeOp<R>(scope: IAssertScope): IIncludeOp<R> {

    function _deepIncludes(this: IAssertScope, match: any, evalMsg?: MsgSource): R {
        let scope = this;
        let context = scope.context;

        let value = context.value;

        context.set("match", match);
        if (isString(context.value)) {
            context.eval(value.indexOf(match) > -1, evalMsg || "expected {value} to include {match}");
        } else if (isArray(context.value)) {
            // Check if any item in the array deeply equals match
            let found = false;
            for (let i = 0; i < value.length; i++) {
                if (_deepEqual(value[i], match)) {
                    found = true;
                    break;
                }
            }
            context.eval(found, evalMsg || "expected {value} to include {match}");
        } else if (value && isFunction(value.has)) {
            // Looks like a set or map
            context.eval(value.has(match), evalMsg || "expected {value} to include {match}");
        } else {
            let keys = value ? objKeys(value) : [];
            context.set("keys", keys);
            context.eval(arrIndexOf(keys, match) > -1, evalMsg || "expected {value} to have a {match} property");
        }

        return scope.that;
    }
    
    const props: AssertScopeFuncDefs<IIncludeOp<R>> = {
        any: { propFn: anyOp },
        all: { propFn: allOp },
        members: { scopeFn: includeDeepMembersFunc },
        orderedMembers: { scopeFn: includeDeepOrderedMembersFunc },
        sameMembers: { scopeFn: sameDeepMembersFunc },
        sameOrderedMembers: { scopeFn: sameDeepOrderedMembersFunc },
        startsWithMembers: { scopeFn: startsWithDeepMembersFunc },
        endsWithMembers: { scopeFn: endsWithDeepMembersFunc },
        subsequence: { scopeFn: deepSubsequenceFunc }
    };

    return scope.createOperation(props, _deepIncludes);
}