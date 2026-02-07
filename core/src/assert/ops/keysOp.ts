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
 * Used in assertions like `expect(map).to.have.any.deep.keys([{ id: 1 }, { id: 2 }])`.
 *
 * @param scope - The assert scope.
 * @returns The deep key filter operation that supports deep key matching.
 * @template R - The type of the key filter operation result.
 *
 * @remarks
 * This operation creates a chainable `.keys()` method that accepts:
 * - Single keys
 * - Arrays of keys
 * - Sets, Maps, or other iterables containing keys
 *
 * Deep equality is performed using {@link anyDeepKeysFunc} which recursively compares
 * object properties and handles special types.
 *
 * @example
 * ```typescript
 * const map = new Map();
 * map.set({ id: 1 }, 'value');
 * expect(map).to.have.any.deep.keys([{ id: 1 }, { id: 2 }]);  // Passes
 * ```
 */
export function anyDeepKeyFilterOp<R>(scope: IAssertScope): IKeysOp<R> {

    const props: KeyFilterOpProps = {
        keys: { g: () => anyDeepKeysFunc(scope) }
    };

    return objDefineProps({} as IKeysOp<R>, props);
}

/**
 * Returns a deep keys operation that filters all keys using deep equality in the given assert scope.
 * Used in assertions like `expect(map).to.have.all.deep.keys([{ id: 1 }, { id: 2 }])`.
 *
 * @template R - The type of the keys operation result.
 * @param scope - The assert scope.
 * @returns The deep keys operation that supports deep key matching.
 *
 * @remarks
 * This operation creates a chainable `.keys()` method that accepts:
 * - Single keys
 * - Arrays of keys
 * - Sets, Maps, or other iterables containing keys
 *
 * Deep equality is performed using {@link allDeepKeysFunc} which recursively compares
 * object properties and handles special types. All provided keys must exist for assertion to pass.
 *
 * @example
 * ```typescript
 * const map = new Map();
 * map.set({ id: 1 }, 'value1');
 * map.set({ id: 2 }, 'value2');
 * expect(map).to.have.all.deep.keys([{ id: 1 }, { id: 2 }]);  // Passes - has both
 * expect(map).to.have.all.deep.keys([{ id: 1 }, { id: 3 }]);  // Fails - missing { id: 3 }
 * ```
 */
export function allDeepKeyFilterOp<R>(scope: IAssertScope): IKeysOp<R> {

    const props: KeyFilterOpProps = {
        keys: { g: () => allDeepKeysFunc(scope) }
    };

    return objDefineProps({} as IKeysOp<R>, props);
}

/**
 * Creates a keys operation that uses deep equality for key comparison.
 * This function automatically determines whether to use any or all based on the assertion context.
 * Used when accessing the `.deep.keys()` chain without explicit any/all specification.
 *
 * @param scope - The assert scope.
 * @returns A IKeysOp operation configured for either any or all matching based on context.
 *
 * @remarks
 * The operation checks the assertion context to determine behavior:
 * - If `ANY` context flag is set → uses {@link anyDeepKeyFilterOp} (at least one key must match)
 * - Otherwise → uses {@link allDeepKeyFilterOp} (all keys must match)
 *
 * This allows natural assertion syntax like:
 * - `expect(map).to.have.deep.keys([...])` → defaults to "all"
 * - `expect(map).to.have.any.deep.keys([...])` → uses "any"
 *
 * @example
 * ```typescript
 * // Without explicit any/all - defaults to "all"
 * const map = new Map([[{ id: 1 }, 'val1'], [{ id: 2 }, 'val2']]);
 * expect(map).to.have.deep.keys([{ id: 1 }, { id: 2 }]);  // Uses allDeepKeyFilterOp
 *
 * // With explicit any - uses anyDeepKeyFilterOp
 * expect(map).to.have.any.deep.keys([{ id: 1 }, { id: 99 }]);  // Passes
 * ```
 */
export function deepKeysOp<R>(scope: IAssertScope): IKeysOp<R> {
    let context = scope.context;

    // Check if we're in ANY context
    let isAny = context.get(ANY) === true;

    return isAny ? anyDeepKeyFilterOp(scope) : allDeepKeyFilterOp(scope);
}
