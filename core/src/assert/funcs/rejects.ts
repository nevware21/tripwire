/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { arrSlice, isFunction, isPromiseLike } from "@nevware21/ts-utils";
import { createPromise } from "@nevware21/ts-async";
import { MsgSource } from "../../types/MsgSource";
import { IAssertScope } from "../interface/IAssertScope";
import { throwsFunc } from "./throws";

/**
 * Asserts that the target promise (or the promise returned by calling the target function) is rejected,
 * optionally with an error matching the `errorLike` / `msgMatch` criteria (the same as `throws`).
 * When negated (`doesNotReject`) it asserts that the promise is not rejected (or, if criteria are
 * supplied, is not rejected with a matching error).
 * Returns a promise that must be awaited.
 *
 * @since 0.2.0
 * @param this - The assert scope.
 * @param errorLike - The error, error constructor, message string or RegExp the rejection must match.
 * @param msgMatch - The message string or RegExp the rejection must match.
 * @param evalMsg - The message to display if the assertion fails.
 * @returns A promise resolving to the assert instance.
 */
export function rejectsFunc<R>(this: IAssertScope, errorLike?: ErrorConstructor | Error | string | RegExp, msgMatch?: string | RegExp, evalMsg?: MsgSource): R {
    let scope = this;
    let context = scope.context;
    let value = context.value;
    let theArgs = arrSlice(arguments);

    if (!isFunction(value) && !isPromiseLike(value)) {
        scope.fatal("expected {value} to be a function or a Promise");
    }

    return createPromise<any>((resolve, reject) => {
        // A synchronous throw from the function rejects the returned promise with that error
        let thePromise: PromiseLike<any> = isFunction(value) ? value() : value;
        if (!isPromiseLike(thePromise)) {
            scope.fatal("expected {value} to return a Promise");
        }

        thePromise.then(function (result) {
            try {
                // Running through the context will throw unless negated (doesNotReject)
                context.eval(false, (theArgs.length > 2 ? evalMsg : null) || "expected {value} to reject");
                resolve(scope.newScope(result).that as any);
            } catch (e) {
                reject(e);
            }
        }, function (reason) {
            try {
                let thrower = function () {
                    throw reason;
                };

                resolve(throwsFunc.apply(scope.newScope(thrower), theArgs as any));
            } catch (e) {
                reject(e);
            }
        });
    }) as any;
}
