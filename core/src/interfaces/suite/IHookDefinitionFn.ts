/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2025 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { HookFn } from "../../types/HookFn";

/**
 * Hook definition function
 * @since 0.2.0
 */
export interface IHookDefinitionFn {
    (hookFunction: HookFn): void;
    (name: string, hookFunction: HookFn): void;
}

