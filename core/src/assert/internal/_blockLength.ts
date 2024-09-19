/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { arrSlice, dumpObj, isFunction, objDefine, objGetOwnPropertyDescriptor } from "@nevware21/ts-utils";
import { AssertionError } from "../assertionError";
import { EMPTY_STRING } from "./const";

/**
 * @internal
 * Internal property to get the function "length" property descriptor.
 * Used to block the usage of the "length" property on a target proxy function.
 */
const _funcLengthProp = objGetOwnPropertyDescriptor(function () {}, "length");

/**
 * @internal
 * Internal function to block the "length" property on function calls.
 * @param target - The target object to decorate.
 * @param targetName - The name of the target object.
 * @param errorStackStart - The function to use as the start of the error stack.
 * @returns - The decorated target object.
 */
export function _blockLength<F>(target: F, targetName: string, parentStackStart?: Function[], errorStackStart?: Function) {
    if (_funcLengthProp && _funcLengthProp.configurable) {
        // Block the usage of the "length" property of a target proxy function to avoid confusion
        // with the actual function length vs any length operation on the target
        try {
            objDefine(target as any, "length", {
                v: function () {
                    let errorStack = parentStackStart ? arrSlice(parentStackStart) : [];
                    if (errorStackStart) {
                        errorStack.push(errorStackStart);
                    }

                    if (isFunction(target)) {
                        errorStack.push(target);
                    }

                    throw new AssertionError("Invalid property usage: \"length\" on " + (targetName || EMPTY_STRING) + " - " + dumpObj(target), null, errorStack);
                }
            });
        } catch (e) {
            // Ignore any errors
        }
    }

    return target;
}
