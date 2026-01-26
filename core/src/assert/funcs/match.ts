/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { isRegExp } from "@nevware21/ts-utils";
import { MsgSource } from "../type/MsgSource";
import { IAssertScope } from "../interface/IAssertScope";

export function matchFunc<R>(this: IAssertScope, match: RegExp, evalMsg?: MsgSource): R {
    let context = this.context;

    context.set("match", match);
    if (isRegExp(match)) {
        context.eval(match.test(context.value), evalMsg || "expected {value} to match {match}");
    } else {
        context.fatal("expected {match} to be a Regexp");
    }

    return this.that;
}