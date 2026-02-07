/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IScopeContext, IScopeContextOverrides } from "./IScopeContext";
import { IScopeFn } from "./IScopeFuncs";
import { AssertScopeFuncDefs } from "./IAssertInst";
import { MsgSource } from "../type/MsgSource";

/**
 * The {@link IAssertScope} interface provides the main entry point for the assertion chain
 * execution, it provides the main functions for creating new {@link IAssertInst} instances
 * and {@link IAssertScope} instances as well as the main functions for executing the
 * assertion chain and evaluating the final result.
 *
 * The {@link IAssertScope} is used to create new {@link IAssertInst} instances with the
 * given value and optional overrides, it also provides the main functions for executing
 * the assertion chain and evaluating the final result.
 * @since 0.1.0
 * @group Scope
 */
export interface IAssertScope {
    /**
     * Holds the current context of the assertion chain execution, this is passed to all
     * scope functions and is used to evaluate the final result of the assertion chain
     * as well as resolving the final message withe the values of the execution chain.
     */
    readonly context: IScopeContext;

    /**
     * Keeps track of the current `this` context for the assertions, this starts out as
     * the initial {@link IAssertInst} object but is changed during the evaluation of
     * the operations, which allows operations to be chained together even when the
     * subsequent operations return different `this` objects that do not inherit from
     * or extend the initial {@link IAssertInst} object.
     */
    that: any;

    /**
     * Creates a new Scope instance, it will also create child instances of the current
     * context so that any changes applied on this new scope will not alter
     * the current scope.
     * @param value - The new value of the context, this is the `actual` value of the assertion.
     * @returns The new scope instance.
     */
    newScope<V>(value?: V): IAssertScope;

    /**
     * Creates a new "standard" assert instance with the given value and optional override functions, if no
     * arguments are provided then the current scope context value is used, however, if undefined or null is
     * provided then the value is set to the provided value.
     * @param value - The new value of the context, this is the `actual` value of the assertion.
     * @param overrides - The optional overrides for the context
     */
    newInst<V>(value?: V, overrides?: IScopeContextOverrides): any;

    /**
     * Creates a new empty {@link IAssertInstCore} assert instance that can be extended or
     * decorated with instance functions for usage via operations. The default implementation
     * returns an object that does not inherit or have access to the {@link IAssertInst} functions.
     */
    newEmptyInst(): any;

    /**
     * Updates the current context with the given value and optional overrides, this is
     * used to update the current context with the new value and overrides.
     * It avoids the need to create a new {@link IAssertScope} or {@link IAssertInst}
     * instance for each operation and allows the scope to be updated in place, so all
     * existing scope functions of the current instance can be chained together.
     * @param value - The value to update the context with.
     * @param overrides - The optional overrides for the context
     * @returns The current {@link IAssertScope} instance.
     */
    updateCtx<T>(value: T, overrides?: IScopeContextOverrides): this;

    /**
     * Executes the given function within the scope `this` of the current {@link IAssertScope}
     * passing the provided arguments, the result of the function will be returned.
     * @param fn - The function to execute.
     * @param args - The arguments to pass to the function.
     * @param funcName - The optional name of the function to execute.
     * @returns The result of the function.
     */
    exec<F extends IScopeFn, R = ReturnType<F>>(fn: F, args: Parameters<F>, funcName?: string): R;

    /**
     * Throws an {@link AssertionFailure} exception with the given message and optional
     * details which are obtained via the `getDetails` function.
     * @param failMsg - The message to display.
     * @param details - The details (props) to include in the error
     * @throws {@link AssertionFailure} always
     */
    fail(failMsg: MsgSource, details?: any): never;

    /**
     * Generic failure that throws an {@link AssertionFailure} exception with the given
     * message and optional details which are obtained via the `getDetails` function.
     * @param actual - The actual value that was expected
     * @param expected - The expected value that was not found
     * @param failMsg - The message to display.
     * @param operator - The optional operator used in the comparison
     * @throws {@link AssertionFailure} always
     */
    fail(actual: any, expected: any, failMsg?: MsgSource, operator?: string): never;

    /**
     * Throws an {@link AssertionError} exception with the given message and optional
     * details which are obtained via the `getDetails` function.
     * @param msg - The message to display.
     * @param details - The details (props) to include in the error
     * @throws {@link AssertionFailure} always
     */
    fatal(msg: MsgSource, details?: any): never;

    /**
     * Creates a new operation by adding the functions / properties as defined by the
     * {@link IAssertScopeFuncDef} type to the `obj`, when no `obj` is passed a new
     * `empty` {@link IAssertInstCore} instance is created, decorated and returned.
     * The returned object is "generally" returned from the {@link IScopeFn}
     * functions and is used to chain the next operation.
     * @param funcs - The functions / properties to add to the object.
     * @param obj - The optional object to decorate with the defined operations,
     * if no `obj` is provided then an `empty` {@link IAssertInstCore} will be used.
     */
    createOperation<T>(funcs: AssertScopeFuncDefs<T>, obj?: any): T;
}
