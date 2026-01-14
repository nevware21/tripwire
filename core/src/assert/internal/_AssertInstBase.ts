/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { arrSlice } from "@nevware21/ts-utils";
import { IAssertInstCore } from "../interface/IAssertInstCore";
import { MsgSource } from "../type/MsgSource";
import { _failFn, _fatalFn } from "./_failFn";
import { IAssertScope } from "../interface/IAssertScope";

/**
 * @internal
 * @ignore
 * This is the base instance class that all other instance classes inherit from, this tags
 * the class as an instance of the {@link IAssertInstCore} interface, so that any
 * instances can be definitively identified as an assertion instance instance.
 * It's used as a common base class for the primary assert class {@link _AssertInstCore}
 * which is where all of the core assertion functions are registered, and the {@link _EmptyAssertInst}
 * which is used to create an instance that does not contain any of the core assertion functions.
 * This class is not exported and cannot be directly instantiated by the user, it
 * is only used as the base class for the assertion instances.
 */
export class _AssertInstBase implements IAssertInstCore {

    /**
     * The constructor for the base instance class.
     */
    protected constructor() {
    }

    /**
     * Throws an {@link AssertionFailure} exception with the given message and optional
     * details which are obtained via the `getDetails` function.
     * @param msg - The message to display.
     * @param details - The details (props) to include in the error
     * @throws {@link AssertionFailure} always
     */
    fail(evalMsg: MsgSource, details?: any): never;

    /**
     * Generic failure that throws an {@link AssertionFailure} exception with the given
     * message and optional details which are obtained via the `getDetails` function.
     * @param actual - The actual value that was expected
     * @param expected - The expected value that was not found
     * @param failMsg - The message to display.
     * @param operator - The optional operator used in the comparison
     * @throws {@link AssertionFailure} always
     */
    fail(this: IAssertScope | IAssertInstCore, _actual: any, _expected: any, _failMsg?: MsgSource, _operator?: string): never {
        _failFn(this, arrSlice(arguments));
    }

    fatal(this: IAssertScope| IAssertInstCore, evalMsg: MsgSource, details?: any): never {
        _fatalFn(this, evalMsg, details);
    }
}
