/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { ListenerAction } from "../types/ListenerAction";

/**
 * Represents the aggregated action result from notifying listeners.
 * The notification manager combines individual listener responses into a single action.
 *
 * @since 0.2.0
 */
export interface INotifyResult {
    /**
     * Action indicating how execution should proceed
     */
    action: ListenerAction;

    /**
     * Optional reason for skip or abort
     */
    reason?: string;
}
