/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { fnApply } from "@nevware21/ts-utils";
import { EMPTY_STRING } from "./const";
import { IAssertScope } from "../interface/IAssertScope";
import { IAssertInst } from "../interface/IAssertInst";
import { _blockLength } from "./_blockLength";
import { _handleResult } from "./_handleResult";
import { IScopeFn, IScopePropFn } from "../interface/IScopeFuncs";
import { MsgSource } from "../interface/types";
import { _getAssertScope } from "./_instCreator";

/**
 * @internal
 * Internal function to create a function to use for the named operation / function or alias.
 * @param name - The name of the operation.
 * @param func - The function to use for the operation.
 * @param propFn - The inline operation function to use for the operation.
 * @param alias - The alias to use for the operation.
 * @param internalErrorStackStart - The function to use as the start of the error stack.
 * @returns - The function to use for the operation.
 */
export function _createAssertInstFunc(name: string, func: IScopeFn, propFn: IScopePropFn, evalMsg?: MsgSource): (this: IAssertInst) => any {
    let opName = name + (func && !propFn ? ("()") : EMPTY_STRING);

    let theFunc = function _getFn(this: IAssertInst) {
        let _this = this;
        let scope: IAssertScope = _getAssertScope(_this);

        // Track the operation path and set the stack start position
        scope.context.setOp(opName);
        if (propFn) {
            return _handleResult(fnApply(propFn, _this, [scope, evalMsg]), scope, name);
        }

        return _handleResult(func, scope);
    };

    return _blockLength(theFunc, name, []);
}
