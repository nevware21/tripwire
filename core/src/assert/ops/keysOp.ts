/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { ObjDefinePropDescriptor, objDefineProps } from "@nevware21/ts-utils";
import { allKeysFunc, anyKeysFunc } from "../funcs/keysFunc";
import { IKeysOp } from "../interface/ops/IKeysOp";
import { IAssertScope } from "../interface/IAssertScope";
import { IAssertInst } from "../interface/IAssertInst";

type KeyFilterOpProps = {
    readonly [key in keyof IKeysOp<IAssertInst> extends string | number | symbol ? keyof IKeysOp<IAssertInst> : never]: ObjDefinePropDescriptor
};

/**
 * Creates a key filter operation that matches any key in the given assert scope.
 *
 * @param scope - The assert scope.
 * @returns The key filter operation.
 * @template R - The type of the key filter operation result.
 */
export function anyKeyFilterOp<R>(scope: IAssertScope): IKeysOp<R> {
    
    const props: KeyFilterOpProps = {
        keys: { g: () => anyKeysFunc(scope) }
    };

    return objDefineProps({} as IKeysOp<R>, props);
}

/**
 * Returns a keys operation that filters all keys in the given assert scope.
 *
 * @template R - The type of the keys operation result.
 * @param scope - The assert scope.
 * @returns The keys operation.
 */
export function allKeyFilterOp<R>(scope: IAssertScope): IKeysOp<R> {
    
    const props: KeyFilterOpProps = {
        keys: { g: () => allKeysFunc(scope) }
    };

    return objDefineProps({} as IKeysOp<R>, props);
}
