/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { MsgSource } from "../assert/type/MsgSource";
import { IAssertInst } from "./interface/IAssertInst";
import { createAssertScope } from "./assertScope";
import { createContext } from "./scopeContext";
import { IAssertConfig } from "./interface/IAssertConfig";
import { _tripwireAssertHandlers } from "./internal/_tripwireInst";
import { arrSlice } from "@nevware21/ts-utils";

/**
 * Creates a new {@link IAssertScope} and linked {@link IAssertInst} object with the
 * given value and message initialized with the contained {@link IScopeContext} object.
 * @param value The value to assign as the conext value.
 * @param initMsg The message to assign to the context.
 * @param config The optional configuration to use for the assertion.
 * @returns The new {@link IAssertInst} object, created via the default {@link AssertInstHandlers}
 * @group Entrypoint
 * @group Expect
 * @since 0.1.0
 */
export function expect<T>(value: T, initMsg?: MsgSource, config?: IAssertConfig): IAssertInst {
    let orgArgs = arrSlice(arguments);
    let scope = createAssertScope(createContext(value, initMsg, null, orgArgs, config), _tripwireAssertHandlers);
    
    return scope.that;
}