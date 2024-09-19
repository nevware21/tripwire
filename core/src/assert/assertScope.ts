/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { arrSlice, objDefineProps } from "@nevware21/ts-utils";
import { IScopeContext, IScopeContextOverrides } from "./interface/IScopeContext";
import { AssertScopeFuncDefs } from "./interface/IAssertInst";
import { MsgSource } from "./interface/types";
import { EXEC } from "./internal/const";
import { IAssertScope } from "./interface/IAssertScope";
import { _addAssertInstFuncs } from "./internal/_addAssertInstFuncs";
import { IScopeFn } from "./interface/IScopeFuncs";
import { AssertInstHandlers } from "./interface/IAssertInstHandlers";
import { _createLazyInstHandler, _setAssertScope } from "./internal/_instCreator";
import { _tripwireAssertHandlers } from "./internal/_tripwireInst";
import { _failFn, _fatalFn } from "./internal/_failFn";


/**
 * Creates a new AssertScope instance with the given context and optional handler creator, when
 * no handler creator is provided the default tripwire handler creator is used.
 * @param context - The context for the scope.
 * @param handlerCreator - The optional handler creator to use for creating the instance handlers.
 * @returns The new AssertScope instance.
 * @group Scope
 * @since 0.1.0
 */
export function createAssertScope(context: IScopeContext, handlerCreator?: AssertInstHandlers): IAssertScope {
    let _context: IScopeContext = context;
    let creators = _createLazyInstHandler(handlerCreator || _tripwireAssertHandlers);

    let theScope: IAssertScope = {
        context: _context,
        that: null,
        newScope: newScope,
        newInst: newInst,
        newEmptyInst: newEmptyInst,
        updateCtx: updateCtx,
        exec: _exec,
        fail: fail,
        fatal: fatal,
        createOperation: createOperation
    };

    let _that: any = null;        // Initialize with the `that` the same as the IAssertInst

    objDefineProps(theScope, {
        context: {
            g: () => _context
        },
        "that": {
            g: () => _that as any,
            s: (v: any) => _that = v
        }
    });

    function newScope<V>(value?: V): IAssertScope {
        if (arguments.length === 0) {
            // No value provided so use the current value
            value = _context.value;
        }

        return createAssertScope(_context.new(value), handlerCreator);
    }

    function newInst<V>(value?: V, overrides?: IScopeContextOverrides): any {
        if (arguments.length === 0) {
            // No value provided so use the current value
            value = _context.value;
        }

        updateCtx(value, overrides);
        return creators.v.newAssertInst(theScope);
    }

    /**
     * Creates a new empty instance that can be extended or decorated with instance functions for usage
     * via operations.
     */
    function newEmptyInst<V>(value?: V): any {
        if (arguments.length === 0) {
            // No value provided so use the current value
            value = _context.value;
        }

        updateCtx(value);
        return creators.v.newEmptyAssertInst(theScope);
    }
    
    /**
     * Updates the current context with the given value and optional overrides, this is
     * used to update the current context with the new value and overrides.
     * It avoids the need to create a new {@link IAssertScope} instance for each operation
     * and allows the scope to be updated in place, so all functions of the current instance
     * can be chained together.
     * @param value - The value to update the context with.
     * @param overrides - The optional overrides for the context
     * @returns The current scope
     */
    function updateCtx<T>(value: T, overrides?: IScopeContextOverrides): IAssertScope {
        if (value !== _context.value || overrides) {
            _context = _context.new(value, overrides)
        }
    
        return theScope;
    }

    /**
     * Executes the given function within the scope `this` of the current {@link IAssertScope}
     * passing the provided arguments, the result of the function will be returned.
     * @param fn - The function to execute.
     * @param args - The arguments to pass to the function.
     * @returns The result of the function.
     */
    function _exec<F extends IScopeFn, R = ReturnType<F>>(fn: F, args: Parameters<F>, funcName?: string): R {
        let theFuncName = funcName || fn.name || (fn as any)["displayName"] || "anonymous";
        if (_context.opts.isVerbose) {
            theScope.context.setOp("[[" + theFuncName + "]]");
        }

        _context.set(EXEC, theFuncName);
        _context._$stackFn.push(_exec);

        return fn.apply(theScope, args);
    }

    function fail(failMsg: MsgSource, details?: any): never;
    function fail(_actual: any, _expected: any, _failMsg?: MsgSource, _operator?: string): never {
        _failFn(theScope, arrSlice(arguments));
    }

    function fatal(evalMsg: MsgSource, details?: any):never {
        _fatalFn(theScope, evalMsg, details);
    }

    function createOperation<T>(funcs: AssertScopeFuncDefs<T>, obj?: any): T {
        if (!obj) {
            obj = newEmptyInst();
        } else {
            // Make sure that the obj is tagged with the current scope so that
            // the scope can be used for any chained operations.
            _setAssertScope(obj, theScope);
        }
        
        _addAssertInstFuncs(obj, funcs, true, createOperation);

        return obj;
    }

    theScope.that = creators.v.newAssertInst(theScope);

    return theScope;
}
