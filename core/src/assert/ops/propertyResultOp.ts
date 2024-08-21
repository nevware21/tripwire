/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IAssertInst, IAssertScopeFuncDef, AssertScopeFuncDefs } from "../interface/IAssertInst";
import { IAssertScope } from "../interface/IAssertScope";
import { IPropertyResultOp } from "../interface/ops/IPropertyResultOp";
import { _addAssertInstFuncs } from "../internal/_addAssertInstFuncs";
import { noopOp } from "./noopOp";

type OmitAssertFuncs = Omit<IPropertyResultOp, keyof IAssertInst>;

type PropertyResultOpProps = {
    readonly [key in keyof OmitAssertFuncs extends string | number | symbol ? keyof OmitAssertFuncs : never]: IAssertScopeFuncDef
};

export function propertyResultOp<V>(scope: IAssertScope, value: V): IPropertyResultOp {
    let newInst = scope.newInst();

    function valueOp(scope: IAssertScope): IAssertInst {
        scope.that = scope.newInst(value)

        return scope.that;
    }

    let props: AssertScopeFuncDefs<PropertyResultOpProps> = {
        and: { propFn: noopOp },
        value: { propFn: valueOp },
        that: { propFn: valueOp }
    };

    _addAssertInstFuncs(newInst, props);

    return newInst as IPropertyResultOp;
}
