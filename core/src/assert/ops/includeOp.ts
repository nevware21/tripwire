/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import {
    arrIndexOf, isArray, isFunction, isString, objKeys, objHasOwnProperty, isObject, arrForEach, isMap, isSet, isPrimitive,
    iterForOf, isWeakSet, isWeakMap
} from "@nevware21/ts-utils";
import { MsgSource } from "../type/MsgSource";
import { allOp, anyOp } from "./allOp";
import { IAssertInst, AssertScopeFuncDefs as AssertScopeDefs } from "../interface/IAssertInst";
import { IIncludeOp } from "../interface/ops/IIncludeOp";
import { IAssertScope } from "../interface/IAssertScope";
import {
    includeDeepMembersFunc, includeDeepOrderedMembersFunc, includeMembersFunc, includeOrderedMembersFunc, sameDeepMembersFunc,
    sameDeepOrderedMembersFunc, sameMembersFunc, sameOrderedMembersFunc, startsWithMembersFunc, startsWithDeepMembersFunc,
    endsWithMembersFunc, endsWithDeepMembersFunc, subsequenceFunc, deepSubsequenceFunc
} from "../funcs/members";
import { _deepEqual } from "../funcs/equal";

/**
 * Helper function to compare values for Map include checks.
 * Uses === for regular values but special-cases NaN (NaN should equal NaN).
 * Does NOT special-case 0/-0 (they should be treated as equal per Chai behavior).
 */
function _mapValueEquals(a: any, b: any): boolean {
    // Special case for NaN
    if (a !== a && b !== b) {  // Both are NaN
        return true;
    }

    return a === b;
}

function _checkSupportedValueType(scope: IAssertScope, value: any): void {

    if (!isString(value) && isPrimitive(value)) {
        let context = scope.context;
        context.fatal("argument {value} ({typeof(value)}) is not a supported collection type for the operation.");
    }
}

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
        let found = false;

        _checkSupportedValueType(scope, value);

        context.set("match", match);
        if (isString(value)) {
            found = value.indexOf(match) > -1;
        } else if (isArray(value)) {
            found = arrIndexOf(value, match) > -1;
        } else if (isMap(value)) {
            // For Maps, check if any value in the map equals match
            iterForOf(value.keys(), (v: any) => {
                if (_mapValueEquals(value.get(v), match)) {
                    found = true;
                    return -1;
                }
            });
        } else if (isSet(value) || (value && isFunction(value.has))) {
            // For Sets and other collections with .has(), check membership
            found = value.has(match);
        } else if (match && isObject(match) && value && isObject(value)) {
            // For objects, check if all properties in match exist in value with same values
            let matchKeys = objKeys(match);
            found = true;

            arrForEach(matchKeys, (key) => {
                if (!objHasOwnProperty(value, key) && !(key in value)) {
                    found = false;
                    return -1; // break
                }
                if (value[key] !== match[key]) {
                    found = false;
                    return -1; // break
                }
            });
        } else {
            let keys = value ? objKeys(value) : [];
            context.set("keys", keys);
            found = arrIndexOf(keys, match) > -1;
            evalMsg = evalMsg || "expected {value} to have a {match} property";
        }

        context.eval(found, evalMsg || "expected {value} to include {match}");

        return scope.newInst();
    }
    
    const props: AssertScopeDefs<IIncludeOp<R>> = {
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
        let found = false;

        _checkSupportedValueType(scope, value);

        context.set("match", match);

        if (isString(context.value)) {
            found = value.indexOf(match) > -1;
        } else if (isArray(context.value)) {
            // Check if any item in the array deeply equals match
            arrForEach(value, (item) => {
                if (_deepEqual(item, match)) {
                    found = true;
                    return -1; // break
                }
            });
        } else if (isMap(value)) {
            // For Maps, check if any value in the map deeply equals match
            iterForOf(value.keys(), (v: any) => {
                if (_deepEqual(value.get(v), match)) {
                    found = true;
                    return -1;
                }
            });
        } else if (isSet(value)) {
            // For Sets, iterate and check deep equality for each item
            iterForOf(value, (v: any) => {
                if (_deepEqual(v, match)) {
                    found = true;
                    return -1;
                }
            });
        } else if (isWeakSet(value) || isWeakMap(value)) {
            // Cannot iterate WeakSet, so we cannot perform deep include
            context.fatal("argument {value} ({typeof(value)}) cannot be used for deep include operation.");
        } else if (value && isFunction(value.has)) {
            // For other collections with .has(), check membership
            found = value.has(match);
        } else if (match && isObject(match) && (!value || !isFunction(value.has))) {
            // For object matching, check if all properties in match exist in value with deep equality
            let matchKeys = objKeys(match);
            found = true;

            arrForEach(matchKeys, (key) => {
                if (!objHasOwnProperty(value, key) && !(key in value)) {
                    found = false;
                    return -1; // break
                }
                if (!_deepEqual(value[key], match[key])) {
                    found = false;
                    return -1; // break
                }
            });
        } else {
            let keys = value ? objKeys(value) : [];
            context.set("keys", keys);
            found = arrIndexOf(keys, match) > -1;
            evalMsg = evalMsg || "expected {value} to have a deep {match} property";
        }

        context.eval(found, evalMsg || "expected {value} to deep include {match}");

        return scope.that;
    }
    
    const props: AssertScopeDefs<IIncludeOp<R>> = {
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

/**
 * Creates the own property include assertion operation using the given scope.
 * This checks if an object contains the specified properties as own properties (not inherited).
 * For objects, checks that all keys in the match are own properties and values match using strict equality.
 * @since 0.1.5
 * @param scope - The current scope of the assert
 * @returns - The {@link IIncludeOp} operation instance.
 */
export function ownIncludeOp<R>(scope: IAssertScope): IIncludeOp<R> {

    function _ownIncludes(this: IAssertScope, match: any, evalMsg?: MsgSource): IAssertInst {
        let scope = this;
        let context = scope.context;
        let value = context.value;
        let found = false;

        _checkSupportedValueType(scope, value);

        context.set("match", match);
        if (isString(value)) {
            found = value.indexOf(match) > -1;
        } else if (isArray(value)) {
            found = arrIndexOf(value, match) > -1;
        } else if (isMap(value)) {
            // For Maps, check if any value in the map equals match
            iterForOf(value.keys(), (v: any) => {
                if (_mapValueEquals(value.get(v), match)) {
                    found = true;
                    return -1;
                }
            });
        } else if (isSet(value) || (value && isFunction(value.has))) {
            // For Sets and other collections with .has(), check membership
            found = value.has(match);
        } else if (match && isObject(match)) {
            // For object matching, check own properties only
            let matchKeys = objKeys(match);
            found = true;

            arrForEach(matchKeys, (key) => {
                if (!objHasOwnProperty(value, key) || value[key] !== match[key]) {
                    found = false;
                    return -1; // break
                }
            });

            evalMsg = evalMsg || "expected {value} to have own properties matching {match}";
        } else {
            let keys = value ? objKeys(value) : [];

            context.set("keys", keys);
            found = objHasOwnProperty(value, match);
            evalMsg = evalMsg || "expected {value} to have own {match} property";
        }

        context.eval(found, evalMsg || "expected {value} to include own {match}");

        return scope.newInst();
    }
    
    const props: AssertScopeDefs<IIncludeOp<R>> = {
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

    return scope.createOperation(props, _ownIncludes);
}

/**
 * Creates the deep own property include assertion operation using the given scope.
 * This checks if an object contains the specified properties as own properties (not inherited).
 * For objects, checks that all keys in the match are own properties and values match using deep equality.
 * @since 0.1.5
 * @param scope - The current scope of the assert
 * @returns - The {@link IIncludeOp} operation instance.
 */
export function deepOwnIncludeOp<R>(scope: IAssertScope): IIncludeOp<R> {

    function _deepOwnIncludes(this: IAssertScope, match: any, evalMsg?: MsgSource): R {
        let scope = this;
        let context = scope.context;
        let value = context.value;
        let found = false;

        _checkSupportedValueType(scope, value);

        context.set("match", match);
        if (isString(context.value)) {
            found = value.indexOf(match) > -1;
        } else if (isArray(context.value)) {
            // Check if any item in the array deeply equals match
            arrForEach(value, (item) => {
                if (_deepEqual(item, match)) {
                    found = true;
                    return -1; // break
                }
            });
        } else if (isMap(value)) {
            // For Maps, check if any value in the map deeply equals match
            iterForOf(value.keys(), (v: any) => {
                if (_deepEqual(value.get(v), match)) {
                    found = true;
                    return -1;
                }
            });
        } else if (isSet(value) || (value && isFunction(value.has))) {
            // For Sets, deeply compare each entry against match
            iterForOf(value, (entry: any) => {
                if (_deepEqual(entry, match)) {
                    found = true;
                    return -1; // break
                }
            });
        } else if (match && typeof match === "object") {
            // For object matching, check own properties only with deep equality
            let matchKeys = objKeys(match);
            found = true;

            arrForEach(matchKeys, (key) => {
                if (!objHasOwnProperty(value, key) || !_deepEqual(value[key], match[key])) {
                    found = false;
                    return -1; // break
                }
            });

            evalMsg = evalMsg || "expected {value} to have own properties deeply matching {match}";
        } else {
            let keys = value ? objKeys(value) : [];
            context.set("keys", keys);
            found = objHasOwnProperty(value, match);
            evalMsg = evalMsg || "expected {value} to have own deep {match} property";
        }

        context.eval(found, evalMsg || "expected {value} to deep include own {match}");

        return scope.that;
    }
    
    const props: AssertScopeDefs<IIncludeOp<R>> = {
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

    return scope.createOperation(props, _deepOwnIncludes);
}