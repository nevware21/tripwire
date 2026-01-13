/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2025 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IScopeContext } from "./interface/IScopeContext";

/**
 * Global scope context that can be set to provide context information to errors
 */
let _globalScopeContext: IScopeContext | null = null;

/**
 * Executes a callback function with the specified scope context set as the global scope.
 * The previous global scope context is automatically restored after the callback completes.
 * @param scope - The scope context to set as global during callback execution
 * @param callback - The function to execute with the scope context set
 * @returns The return value of the callback function
 * @group Scope
 * @since 0.1.3
 */
export function useScope<T>(scope: IScopeContext, callback: () => T): T {
    let previousScope = _globalScopeContext;
    _globalScopeContext = scope;
    try {
        return callback();
    } finally {
        _globalScopeContext = previousScope;
    }
}

/**
 * Gets the current global scope context.
 * @returns The current global scope context, or null if not set
 * @internal
 */
export function _getGlobalScopeContext(): IScopeContext | null {
    return _globalScopeContext;
}
