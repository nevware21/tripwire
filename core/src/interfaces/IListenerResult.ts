/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { ListenerAction } from "../types/ListenerAction";

/**
 * Result returned by listener to control execution
 * @since 0.2.0
 */
export interface IListenerResult {
    /**
     * Action indicating how execution should proceed
     */
    action?: ListenerAction;

    /**
     * Optional reason for skip or abort
     */
    reason?: string;
}
