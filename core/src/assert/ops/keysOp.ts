/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { ObjDefinePropDescriptor, objDefineProps } from "@nevware21/ts-utils";
import { allDeepKeysFunc, allKeysFunc, anyDeepKeysFunc, anyKeysFunc } from "../funcs/keysFunc";
import { IKeysOp } from "../interface/ops/IKeysOp";
import { IAssertScope } from "../interface/IAssertScope";
import { IAssertInst } from "../interface/IAssertInst";
import { ANY } from "../internal/const";

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

/**
 * Creates a deep key filter operation that matches any key using deep equality in the given assert scope.
 *
 * @param scope - The assert scope.
 * @returns The deep key filter operation.
 * @template R - The type of the key filter operation result.
 */
export function anyDeepKeyFilterOp<R>(scope: IAssertScope): IKeysOp<R> {
    
    const props: KeyFilterOpProps = {
        keys: { g: () => anyDeepKeysFunc(scope) }
    };

    return objDefineProps({} as IKeysOp<R>, props);
}

/**
 * Returns a deep keys operation that filters all keys using deep equality in the given assert scope.
 *
 * @template R - The type of the keys operation result.
 * @param scope - The assert scope.
 * @returns The deep keys operation.
 */
export function allDeepKeyFilterOp<R>(scope: IAssertScope): IKeysOp<R> {
    
    const props: KeyFilterOpProps = {
        keys: { g: () => allDeepKeysFunc(scope) }
    };

    return objDefineProps({} as IKeysOp<R>, props);
}

/**
 * Creates a keys operation that uses deep equality for key comparison.
 * This function automatically determines whether to use any or all based on the context.
 *
 * @param scope - The assert scope.
 * @returns A IKeysOp operation.
 */
export function deepKeysOp<R>(scope: IAssertScope): IKeysOp<R> {
    let context = scope.context;
    
    // Check if we're in ANY context
    let isAny = context.get(ANY) === true;
    
    return isAny ? anyDeepKeyFilterOp(scope) : allDeepKeyFilterOp(scope);
}
