/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { arrForEach, arrSlice, asString, isFunction, isStrictUndefined, objDefine, objKeys } from "@nevware21/ts-utils";
import { IAssertScope } from "../interface/IAssertScope";
import { _isBannedProperty } from "./_banned";
import { _blockLength } from "./_blockLength";
import { _isAssertInst, _setAssertScope } from "./_instCreator";

function _createResultAdapter(scope: IAssertScope, target: any, key: string | number | symbol, funcName?: string) {
    return function _fn() {
        // Track the operation path and set the stack start position
        scope.context._$stackFn.push(_fn);

        let theResult;
        if (key === null && isFunction(target)) {
            if (scope.context.opts.isVerbose) {
                scope.context.setOp("[[" + funcName + "]]");
            }
            scope.context._$stackFn.push(_fn);
            // Give the function a real instance to hand back. Until here `scope.that` is the
            // callable wrapper built for this very function (see _handleResult below), so a scope
            // function's `return this.that` -- which every built-in does -- returned its own
            // wrapper, and nothing could be chained after a call: `expect(5).is.number().is.above(1)`
            // threw on `.is`. The instance keeps the chain's context, so a `not` before the call
            // still applies to what follows it, as it does in Chai.
            scope.that = scope.newInst();
            theResult = scope.exec(target, arrSlice(arguments), funcName);
        } else {
            scope.context.setOp(asString(key));
            theResult = target[key];
        }

        // If the function returns nothing then create a new IAssertInst instance
        if (isStrictUndefined(theResult)) {
            theResult = scope.newInst();
        }

        return _handleResult(theResult, scope, funcName);
    };
}

export function _handleResult<T>(result: T, scope: IAssertScope, funcName?: string): T {

    // If the function returns nothing then create a new IAssertInst instance
    if (isStrictUndefined(result)) {
        scope.that = scope.newInst();
        return scope.that as any;
    }

    scope.that = result;

    if (_isAssertInst(result)) {
        return result;
    }

    let theResult: any;
    if (isFunction(result)) {
        let theFuncName = funcName || result.name || (result as any)["displayName"] || "anonymous";
        theResult = _createResultAdapter(scope, result, null, theFuncName);
        _blockLength(theResult, funcName, scope.context._$stackFn, _handleResult);
    } else {
        theResult = {};
    }

    arrForEach(objKeys(result), (key) => {
        if (!_isBannedProperty(key)) {
            objDefine(theResult, key, {
                g: _createResultAdapter(scope, result, key, key)
            });
        }
    });

    _setAssertScope(theResult, scope);
    scope.that = theResult;

    return theResult;
}
