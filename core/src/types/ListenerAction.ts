/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { createEnum } from "@nevware21/ts-utils";

/**
 * @internal
 * Internal const enum for efficient usage
 * @since 0.2.0
 */
export const enum eListenerAction {
    /**
     * Continue with normal execution
     */
    Continue = 0,

    /**
     * Skip the current test, suite, or hook
     */
    Skip = 1,

    /**
     * Abort the entire test run
     */
    Abort = 2
}

/**
 * Action values for listener results to control test execution
 * @since 0.2.0
 */
export const ListenerAction = createEnum<typeof eListenerAction>({
    Continue: eListenerAction.Continue,
    Skip: eListenerAction.Skip,
    Abort: eListenerAction.Abort
});

export type ListenerAction = number | eListenerAction;
