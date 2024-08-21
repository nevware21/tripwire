/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IAssertInstHandlers } from "../interface/IAssertInstHandlers";
import { IAssertScope } from "../interface/IAssertScope";
import { _createEmptyAssertInst, _createAssertInst } from "./_AssertInstCore";

/**
 * @internal
 * @ignore
 * Create the internal tripwire assert handlers.
 * @returns - The internal tripwire assert handlers.
 */
export function _tripwireAssertHandlers(): IAssertInstHandlers {
    return {
        newAssertInst: (_scope: IAssertScope) => {
            return _createAssertInst();
        },
        newEmptyAssertInst: (_scope: IAssertScope) => {
            return _createEmptyAssertInst();
        }
    };
}