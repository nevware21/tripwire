/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { MsgSource } from "../type/MsgSource";
import { IConfigInst } from "../../interface/IConfigInst";

/**
 * The scope context is used to track the evaluation of the assertion and
 * provide the necessary information to the assertion functions to enable
 * the evaluation of the assertion and the display of the results.
 * @since 0.1.0
 * @group Scope
 */
export interface IScopeContext {
    /**
     * Returns the initial value being evaluated
     */
    readonly value: any;

    /**
     * Returns the options (the current configuration) for the current context.
     */
    readonly opts: IConfigInst;

    /**
     * Returns the original arguments used during the initiation of the proxied request
     * this is used to enable re-evaluation of the original request if needed.
     * @returns The original arguments
     */
    readonly orgArgs: any[];

    /**
     * Tracks the internal stack of functions that have been called
     * during the evaluation of the context
     */
    readonly _$stackFn: Function[];

    /**
     * Returns the message to be displayed for the evaluation which includes
     * the scope `initMsg` prefixed with the evalMsg if provided and the value
     * @param evalMsg - Used when no-message is provided
     * @param skipOverrides - When true, the eval message is resolved directly
     * and does not include the other details obtained from the execution
     * chain like the negation.
     */
    getMessage(evalMsg?: MsgSource, skipOverrides?: boolean): string;

    /**
     * Resolves and returns only the eval message to be displayed for the evaluation,
     * this does not include the value or the scope `initMsg` or any other details.
     * @param evalMsg - Used when no-message is provided
     * @param skipOverrides - When true, the eval message is resolved directly
     * and does not include the other details obtained from the execution
     * chain like the negation.
     */
    getEvalMessage(evalMsg: MsgSource, skipOverrides?: boolean): string;

    /**
     * Returns the details of the evaluation
     */
    getDetails(): any;

    /**
     * This evaluates the result and if it fails, it throws an error
     * @param expr - The expression to evaluate
     * @param evalMsg - The default message to display
     */
    eval(expr: boolean, evalMsg?: MsgSource, causedBy?: Error): boolean;

    /**
     * Throws an {@link AssertionFailure} exception with the given message and optional
     * details which are obtained via the `getDetails` function.
     * @param msg - The message to display.
     * @param details - The details (props) to include in the error
     * @param stackStart - The optional stack start function
     * @throws {@link AssertionFailure} always
     */
    fail(msg: MsgSource, details?: any, stackStart?: Function | Function[]): never;

    /**
     * Throws an {@link AssertionFatal} exception with the given message and optional
     * details which are obtained via the `getDetails` function. This indicates a fatal
     * error that should stop further processing, it also bypasses any child scopes for
     * message processing.
     * @param msg - The message to display.
     * @param details - The details (props) to include in the error
     * @param stackStart - The optional stack start function
     * @throws {@link AssertionFatal} always
     */
    fatal(msg: MsgSource, details?: any, stackStart?: Function | Function[]): never;

    /**
     * Sets the current operation name and adds it to the context execution
     * order, which is used to display the order of operations in the error message
     * if an assertion fails.
     * @param opName - The current operation name
     * @returns The current context
     */
    setOp(opName: string): IScopeContext;

    /**
     * Returns a named value associated with the context, this is a recursive operation
     * and will return the first value found in the current context and all parent contexts
     * as defined by calling the `set` function.
     *
     * @param name - The name of the property
     */
    get(name: string | number | symbol): any;

    /**
     * Sets a named value associated for the context, this only affected the
     * current context and does not affect the parent context. If the value
     * already exists in the parent context, it will be overridden by the new value
     * for any calls to `get` that are made on the current context. All calls to `get`
     * for the parent context will return the original value.
     * @param name - The name of the property
     * @param value - The value to set
     */
    set(name: string | number | symbol, value: any): IScopeContext;

    /**
     * Returns all of the keys of the values from both the current and parent
     * context(s), this is a recursive operation and will return all keys from
     * the current context and all parent contexts as defined by calling the `set`
     * function.
     */
    keys(): string[];

    /**
     * Creates a new child {@link IScopeContext} object using the provided value
     * and optional overrides
     * @param value - The value to use for the new context
     * @param overrides - The optional overrides for the context
     */
    new: (value: any, overrides?: IScopeContextOverrides) => IScopeContext;
}

/**
 * Provides optional overrides for the default behavior of the context
 */
export interface IScopeContextOverrides {
    /**
     *
     * Returns the message to be displayed for the evaluation
     * @param parent - The parent context
     * @param evalMsg - Used when no-message is provided
     * @returns The message to be displayed for the evaluation
     */
    getMessage?: (parent: IScopeContext, evalMsg?: MsgSource) => string;


    /**
     * Resolves and returns only the eval message to be displayed for the evaluation,
     * this does not include the value or the scope `initMsg` or any other details.
     * @param parent - The parent context
     * @param evalMsg - the message to resolve
     */
    getEvalMessage?: (parent: IScopeContext, evalMsg: MsgSource) => string;

    /**
     * Returns the details of the evaluation
     * @param parent - The parent context
     * @returns The details of the evaluation
     */
    getDetails?: (parent: IScopeContext) => any;

    /**
     * This evaluates the result and if it fails, it throws an error
     * @param parent - The parent context
     * @param expr - The expression to evaluate
     * @param evalMsg - The default message to display
     * @returns The result of the evaluation
     */
    eval?: (parent: IScopeContext, expr: boolean, evalMsg?: MsgSource) => boolean;

    /**
     * Throws an `AssertionFailure` with the given message.
     * @param msg - The message to display.
     * @param details - The details (props) to include in the error
     * @throws An {@link AssertionError} always
     */
    fail?: (parent: IScopeContext, msg: string, details: any, causedBy: Error) => void | never;
}