/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IScopeFn } from "./IScopeFuncs";

export interface IAssertClassDef {
    /**
     * Identifies that this entry is really an `alias` for the specified name listed
     * in the `alias` property. This used to provide alternate names for the same
     * assertion class function, without having to duplicate the entire definition.
     * This `alias` property is evaluated during runtime evaluation of the assertion
     * operation (function or property), this enables redirection to any override
     * that might have been applied during evaluation without having to also update
     * the alias definition(s).
     *
     * Note: This `alias` property is used to identify an alternate name for the
     * current {@link IAssertInst} function or property.
     */
    alias?: string;

    /**
     * Identifies the expression or path that is to be evaluated to obtain the value
     * that is to be asserted against. This expression is evaluated against the
     * current scope value (`this.context.value`) when the assertion is evaluated.
     * This expression can either be a `string` using dot notation to identify
     * the path to be evaluated or an array of `string`s where each entry in the
     * array identifies a step in the path to be evaluated.
     * For example:
     * - `"myProperty.nestedProperty[0].value"` or
     * - `["myProperty", "nestedProperty", "{0}", "value"]`
     *
     * When using an array of `string`s each entry in the array is treated as a
     * step in the evaluation path, this enables more complex paths to be defined
     * where property names may contain characters that would otherwise be
     * interpreted as part of the path syntax, for example a property name
     * that contains a dot (`.`) character.
     * In addition, when using an array of `string`s, it enables the use
     * of "dynamic" property names or indexes to be used via the use of the
     * `{}` syntax. This syntax enables either a named value or an index
     * to be specified which will be resolved against the current scope
     * context's named values or the arguments that were passed to the
     * assertion function.
     * - Named values are resolved against the current scope context's
     *   named values collection (`this.context.namedValues`).
     * - Indexed values are resolved against the arguments that were
     *  passed to the assertion function, where `{0}` identifies the
     *  first argument, `{1}` the second argument and so on.
     */
    expr?: string | string[];

    /**
     * Indicates that the evaluation should be negated (i.e. NOT). This is equivalent to
     * wrapping the evaluation within a logical NOT operation.
     * For example if the evaluation would normally return `true` it would
     * instead return `false` and vice versa.
     */
    not?: boolean;

    /**
     * Identifies an {@link IScopeFn} function that will be called, this function
     * expects the current scope as the `this` value and any additional arguments
     * that are passed to the function. The function should return the current instance
     * or an object that will be used as the `this` for the nexted chained the next assertion.
     */
    scopeFn?: IScopeFn;

    /**
     * Identifies the expected number of "logical" arguments that the assert class function is
     * defined to receive (including any initial `actual` value). These arguments are collected
     * and will be passed to the provided `scopeFn` function when the assertion is evaluated.
     * This optional property is used to determine how many of the initial passed arguments
     * (to the assert class function) are expected so that the next argument (if present) can
     * be treated as the `initMsg` value which is assigned to the underlying `expect`
     * {@link IAssertScope} instance as this provides for a more descriptive error message on
     * assertion failure as the underlying evaluation function can provide its own "default"
     * message.  If the number of arguments is less then the `nArgs` value then all arguments
     * are passed to the {@link IScopeFn} `scopeFn`.
     *
     * Defaults to 1, indicating that at least the 1 argument (`actual` and `expected`) are
     * expected where the `actual` value is always the first argument passed and is assigned
     * to the underlying {@link IScopeContext} `value` property. (meaning that is not actually
     * passed directly to the function but is available via the {@link IAssertScope} (`this`)
     * context value ()`this.context.value`).
     * This first argument after the specified number of arguments is used as the `initMsg`
     * for the underlying {@link expect} implementation.
     *
     * Note: If a {@link createEvalAdapter} function is provided which is wrapping the "real"
     * assertion function then the `actual` value is passed as the `first` argument to the
     * {@link EvalFn} function as the {@link createEvalAdapter} implementation "unwraps" the
     * context value (`actual`) and passes it along with all of the other arguments, the
     * `initMsg` if it was present and identified during the initial call (based on the `nArgs`)
     * will have been removed from the arguments and therefore will NOT be passed along.
     * Possible values:
     * - 0: No additional arguments are expected to be passed to the function (like `fail`),
     * so the first argument should be treated as the `initMsg` value
     * - 1: Only the `actual` value is expected to be passed to the function (like `ok`),
     * - n: There are n expected arguments to be passed to the function, the `initMsg` value will
     * be assumed to be the n+1 argument.
     * This is required as often the passed `scopeFn` function will expect the `actual` value
     * to be within the {@link IScopeContext} `value` property or it is using an adapter function,
     * like {@link createEvalAdapter}, in both cases the Function contained within the `scopeFn`
     * will not have the "real" `length` (number of arguments) that the function is expecting.
     * @defaultValue 1
     */
    nArgs?: number;

    /**
     * Identifies the expected location of the `initMsg` value within the argument list
     * that is passed to the function. This defaults to -1, indicating that the message
     * is always the last argument in the list. If the `nArgs` value is greater then the
     * number of arguments passed to the function then the `initMsg` will be undefined.
     * Possible values:
     * - -1: The message is the last argument and should be removed (only if the number
     * of arguments is greater then the `nArgs` value)
     * - 0: The first argument is the message and should be removed from the arguments
     * passed to the {@link IScopeFn}
     * - n: The message is at the nth position in the argument list and should be removed
     * from the arguments passed to the {@link IScopeFn}, this may cause the order of the
     * arguments to be changed that are passed to the {@link IScopeFn}
     */
    mIdx?: number;
}
