/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { KeysFn } from "../funcs/KeysFn";

/**
 * This interface provides methods for filtering keys within an assertion scope.
 * @template R - The type of the result of the operation.
 */
export interface IKeysOp<R> extends KeysFn<R> {

    /**
     * Provides access to filters that operate on the keys of the current
     * {@link IScopeContext} value within the assertion scope.
     * @param keys - The keys to filter.
     * @returns The result of the operation
     */
    keys: KeysFn<R>;
}