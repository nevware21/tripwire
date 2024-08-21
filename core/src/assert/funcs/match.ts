/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { isRegExp } from "@nevware21/ts-utils";
import { MsgSource } from "../interface/types";
import { IAssertScope } from "../interface/IAssertScope";

export function matchFunc<R>(this: IAssertScope, match: RegExp, evalMsg?: MsgSource): R {
    let context = this.context;

    context.set("match", match);
    if (isRegExp(match)) {
        context.eval(match.test(context.value), evalMsg || "expected {value} to match {match}");
    } else {
        context.fail("expected {match} to be a Regexp");
    }

    return this.that;
}