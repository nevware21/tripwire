/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { isFunction, isPromiseLike } from "@nevware21/ts-utils";
import { MsgSource } from "../../types/MsgSource";
import { IAssertScope } from "../interface/IAssertScope";
import { IAssertInst } from "../interface/IAssertInst";
import { IScopeContext } from "../interface/IScopeContext";
import { AssertionFailure } from "../assertionFailure";
import { AssertionFatal } from "../assertionFatal";
import { cStackDetail } from "../../internal/_errorSupport";
import { IParsedStack } from "../../internal/parseStack";

/**
 * Whether `value` is an ordinary assertion failure -- the kind a later clause may recover from.
 *
 * `AssertionFatal` inherits from `AssertionFailure`, so the fatal check has to come first: a fatal
 * is a misuse of the API (a non-iterable handed to `oneOf`, say), not a verdict about the value,
 * and must propagate whatever the other clauses would have said. The `name` checks cover an
 * error raised by a second copy of the library, where `instanceof` cannot see the shared class.
 */
function _isRecoverableFailure(value: any): boolean {
    if (!value || value instanceof AssertionFatal || value.name === "AssertionFatal") {
        return false;
    }

    return value instanceof AssertionFailure || value.name === "AssertionFailure";
}

/**
 * Asserts that at least one of the given clauses passes against the current value.
 *
 * Every clause is a function given its own fresh {@link IAssertInst} for the same value, with none
 * of the outer chain's modifiers: a `not` before the `or` negates the `or` as a whole (it then passes
 * only when every clause fails), and never leaks into a clause. Clauses run in order and stop at the
 * first that passes; when all fail, the failure lists what each one reported. A clause's own
 * failures are never reported to assertion listeners and never deferred onto the running test --
 * only the combined verdict is -- so a satisfied `or` is one passing assertion, not one pass and
 * several failures.
 *
 * Clauses must be synchronous. A clause that returns a promise cannot be given a verdict here, so
 * it is an `AssertionFatal` rather than a pass that silently drops a later rejection. An
 * `AssertionFatal` (an argument the assertion could not use) or any non-assertion error thrown by a
 * clause is propagated unchanged.
 *
 * @param this - The assert scope.
 * @param clauses - One or more functions, each performing a synchronous assertion on the instance it is given.
 * @returns - The assert scope.
 * @since 0.2.0
 * @example
 * ```typescript
 * import { expect } from "@nevware21/tripwire";
 *
 * expect(5).or(e => e.is.string(), e => e.is.number());      // Passes: the second clause passes
 * expect(5).or(e => e.is.above(10), e => e.is.below(0));     // Fails: both clauses fail
 * expect(5).not.or(e => e.is.string(), e => e.is.above(10)); // Passes: neither clause passes
 * expect(5).or(e => e.is.number()).and.is.above(1);          // Chains on like any other assertion
 * ```
 */
export function orFunc<R>(this: IAssertScope, ...clauses: Array<(inst: IAssertInst) => any>): R {
    let scope = this;
    let context = scope.context;
    let value = context.value;

    if (!clauses.length) {
        context.fatal("or() requires at least one clause");
    }

    for (let lp = 0; lp < clauses.length; lp++) {
        if (!isFunction(clauses[lp])) {
            context.set("clause", clauses[lp]);
            context.fatal("or() clauses must be functions, found {clause}");
        }
    }

    let reasons: string[] = [];
    let passed = false;

    for (let lp = 0; lp < clauses.length && !passed; lp++) {
        // An isolated scope rather than a child: a child context proxies `eval` and the messages
        // back through its parent chain, which is exactly how `not` and the other modifiers take
        // effect -- so a child would evaluate each clause negated, and the `context.eval` below
        // would then negate the combined result a second time. The isolated scope keeps this
        // chain's configuration and instance handlers. It is asked of the scope rather than built
        // here: this module is loaded by the instance prototype, so importing the scope factory
        // from it would be a circular import.
        let clauseScope = scope.newScope(value, true);

        // A failure inside a clause must throw, and only throw. The context's own `eval` also
        // notifies assertion listeners and, when a listener answers Continue, defers the failure
        // onto the running test instead of throwing -- which would turn a satisfied `or` into a
        // failed test, and inflate every listener's failure count. Modifiers used inside the
        // clause (`e.is.not.string()`) still work: their child contexts proxy `eval` up to this.
        clauseScope.updateCtx(value, {
            eval: (parent: IScopeContext, expr: boolean, evalMsg?: MsgSource) => {
                if (!expr) {
                    parent.fail(evalMsg, parent.getDetails(), parent._$stackFn);
                }

                return true;
            }
        });

        try {
            let result = clauses[lp](clauseScope.that);
            if (isPromiseLike(result)) {
                // Absorb the promise first: a rejection it may settle with later is already
                // accounted for by the fatal thrown here, and must not surface as unhandled.
                result.then(null, () => { /* reported via the fatal below */ });
                context.set("clauseIndex", lp + 1);
                context.fatal("or() clauses must be synchronous: clause {clauseIndex} returned a promise");
            }

            passed = true;
        } catch (e) {
            if (!_isRecoverableFailure(e)) {
                throw e;
            }

            // The clause's own wording only: its full message also describes its props (`::: running ...`),
            // which would be repeated inside this list and then again by the combined failure's own props.
            const detail: IParsedStack = (e as any)[cStackDetail];
            reasons.push((detail && detail.message) || (e as Error).message);
        }
    }

    context.set("clauseCount", clauses.length);
    context.set("reasons", reasons);
    // Worded so that it is true in both polarities: under `not` the message reads
    // "not expected ... to pass at least one of N assertions (failures: [...])".
    context.eval(passed, "expected {value} to pass at least one of {clauseCount} assertions (failures: {reasons})");

    return scope.that;
}
