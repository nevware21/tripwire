/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { AssertionFailure, IAssertScope } from "@nevware21/tripwire";
import { arrSlice } from "@nevware21/ts-utils";

export function chaiFailFunc(this: IAssertScope): void {
    let theArgs = arrSlice(arguments);
    let scope = this;
    let context = scope.context;
    let message = "assert.fail()";

    if (theArgs.length == 0) {
        message = context.value || message;
    } else {
        context.set("actual", context.value);
        context.set("expected", theArgs[0]);
        if (theArgs.length > 1) {
            message = theArgs[1] || message;
        }
        if (theArgs.length > 2) {
            context.set("operator", theArgs[2]);
        }
    }

    throw new AssertionFailure(context.getMessage(message), context.getDetails(), context._$stackFn);
}