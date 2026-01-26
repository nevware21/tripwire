/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { arrForEach, arrSlice, dumpObj, fnApply, isArray, isFunction, isNumber, isString, objDefine, objKeys, strEndsWith, strIndexOf, strLeft, strStartsWith } from "@nevware21/ts-utils";
import { IAssertScope } from "../interface/IAssertScope";
import { IScopeContext } from "../interface/IScopeContext";
import { IScopeFn } from "../interface/IScopeFuncs";
import { AssertionError } from "../assertionError";
import { doAwait, IPromise } from "@nevware21/ts-async";
import { IAssertInstCore } from "../interface/IAssertInstCore";
import { _isAssertInst } from "../internal/_instCreator";
import { IAssertClass } from "../interface/IAssertClass";
import { _formatValue } from "../internal/_formatValue";

interface IStepArgs {
    named?: string;
    value?: any;
    idx?: number;
}

interface IStepDef {
    name: string;
    args: IStepArgs[];
}

function _throwInvalidExpr(isValid: boolean, expr: string | string[], internalErrorStackStart: Function) {
    if (!isValid) {
        if (isArray(expr)) {
            expr = expr.join(".");
        }
        
        throw new AssertionError("Invalid expression: " + expr, null, internalErrorStackStart);
    }
}

function _parseStepArg(arg: string, internalErrorSackStart: Function) {

    if (strStartsWith(arg, "{") && strEndsWith(arg, "}")) {
        let value = arg.substring(1, arg.length - 1);
        _throwInvalidExpr(strIndexOf(value, "{") == -1, arg, internalErrorSackStart);
        _throwInvalidExpr(strIndexOf(value, "}") == -1, arg, internalErrorSackStart);

        let idx =  parseInt(value);
        if (isNumber(idx)) {
            return {
                idx
            };
        } else {
            return {
                value
            };
        }
    }

    _throwInvalidExpr(strIndexOf(arg, " ") == -1, arg, internalErrorSackStart);
    return {
        named: arg
    };
}

function _parseStep(expr: string, fullExpr: string | string[], internalErrorStackStart: Function): IStepDef {
    let name = expr;
    let args: IStepArgs[];
    let parts = expr.split("(");
    
    _throwInvalidExpr(parts.length <= 2, fullExpr, internalErrorStackStart);
    if (parts.length == 2) {
        name = parts[0];
        let theArgs = parts[1];
        _throwInvalidExpr(strEndsWith(theArgs, ")"), fullExpr, internalErrorStackStart);

        theArgs = strLeft(theArgs, theArgs.length - 1);
        _throwInvalidExpr(strIndexOf(theArgs, ")") == -1, fullExpr, internalErrorStackStart);

        // Extract any arguments
        args = [];
        arrForEach(theArgs.split(","), (arg) => {
            args.push(_parseStepArg(arg, internalErrorStackStart));
        });
    }

    return {
        name,
        args
    };
}

function _runExpr(theAssert: any, scope: IAssertScope, steps: IStepDef[], scopeFn: IScopeFn, theArgs: any[]): any | IPromise<any> {
    let _setLastContext: (lastScope: IAssertScope) => void;
    let lastSetContext: IScopeContext = null;

    if (_isAssertInst<IAssertClass>(theAssert)) {
        _setLastContext = (lastScope: IAssertScope) => {
            if (lastSetContext !== lastScope.context) {
                objDefine(theAssert, "_$lastContext", {
                    v: lastScope.context
                });
    
                lastSetContext = lastScope.context;
            }
        };
    } else {
        _setLastContext = (lastScope: IAssertScope) => {};
    }

    if (!steps || steps.length == 0) {
        _setLastContext(scope);
        return null;
    }

    function _runOp(scope: IAssertScope, idx: number): any | IPromise<any> {
        let context = scope.context;
        let step = steps[idx];
        let args: any[] = null;

        _setLastContext(scope);

        if (step.args) {
            // We are going to expect a execute a function
            args = [];
            arrForEach(step.args, (arg) => {
                if (arg.named) {
                    args.push(scope.context.get(arg.named));
                } else if (arg.idx) {
                    args.push(theArgs[arg.idx]);
                } else {
                    args.push(arg.value);
                }
            });
        }

        if (!(step.name in scope.that)) {
            throw new AssertionError(
                "" + idx + " Invalid step: " + step.name + " for [" + steps.map((s: any) => s.name).join("->") + "] available steps: [" + objKeys(scope.that).join(";") + "] - " + _formatValue(scope.context, scope.that),
                {
                    expected: step.name,
                    actual: objKeys(scope.that).join(";")
                },
                context._$stackFn);
        }

        // Fetch the property (which will also run the core function)
        return doAwait(scope.that[step.name as keyof IAssertInstCore], (stepResult: any) => {
            if (args !== null) {
                if (!isFunction(stepResult)) {
                    // We have been given arguments but the returned value is not a function
                    throw new AssertionError(
                        context.getMessage("expected a function for \"" + step.name + "\" but found a " + dumpObj(stepResult)),
                        context.getDetails(),
                        context._$stackFn);
                }
    
                // And only if it returns a function do we call it
                stepResult = fnApply(stepResult, scope.that, args);
            }

            scope.that = stepResult;
            _setLastContext(scope);
    
            if (idx < steps.length - 1) {
                // More steps to run
                return _runOp(scope, idx + 1);
            }
    
            return _processFn(scope, scopeFn, theArgs, stepResult, true);
        });
    }

    return _runOp(scope, 0);
}

function _processFn(scope: IAssertScope, scopeFn: IScopeFn, theArgs: any[], theResult: any, handleResultFunc: boolean): any {

    if (scopeFn) {
        // Track the operation path and set the stack start position
        if (scope.context.opts.isVerbose) {
            let theScopeName = scopeFn.name || (scopeFn as any)["displayName"] || "anonymous";
            scope.context.setOp("[[p:" + theScopeName + "]]");
        }

        theResult = scopeFn;
        handleResultFunc = true;
    }

    if (handleResultFunc && isFunction(theResult)) {
        // The last step is a function, so we call it
        theResult = scope.exec(theResult, theArgs);
        if (scope.context.opts.isVerbose) {
            scope.context.setOp("=>[[r:" + _formatValue(scope.context, theResult) + "]]");
        }
    }

    return theResult;
}

/**
 * Creates an expression adapter function that can be used to evaluate the current value in the scope,
 * using the provided expression. The expression can be a string or an array of strings, where each
 * string represents a property or function to call on the current value.
 * @param theExpr - The expression to evaluate.
 * @param scopeFn - The optional scope function to call after the expression has been evaluated.
 * @returns - An {@link IScopeFn} function that will evaluate the current value in the scope.
 * @group Adapter
 * @since 0.1.0
 */
export function createExprAdapter(theExpr: string | string[], scopeFn?: IScopeFn): IScopeFn {

    let steps: IStepDef[];

    if (theExpr) {
        steps = [];
        arrForEach(isString(theExpr) ? theExpr.split(".") : theExpr, (step: string) => {
            steps.push(_parseStep(step, theExpr, createExprAdapter));
        });
    }

    return function _exprFn(this: IAssertScope): void {
        let scope = this;
        let context = scope.context;
        let theArgs = arrSlice(arguments);

        context._$stackFn.push(_exprFn);
    
        // Track the operation path and set the stack start position
        if (context.opts.isVerbose) {
            let theFuncName = theExpr;
            if (isArray(theFuncName)) {
                // Convert to a string
                theFuncName = theFuncName.join(".");
            }

            context.setOp("[[\"" + theFuncName + "\"]]");
        }

        return _runExpr(scope.that, scope, steps, scopeFn, theArgs);
    };
}
