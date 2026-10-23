/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { createEnum } from "@nevware21/ts-utils";

/**
 * Internal const enum for efficient usage
 * @since 0.2.0
 */
export const enum eListenerEvent {
    /**
     * Test run event
     */
    Run = 0,

    /**
     * Test suite event
     */
    Suite = 1,

    /**
     * Test case event
     */
    Test = 2,

    /**
     * Hook event
     */
    Hook = 3,

    /**
     * Assertion evaluation event
     */
    Assertion = 4
}

/**
 * Event types for test listener notifications
 * @since 0.2.0
 */
export const ListenerEventEnum = createEnum<typeof eListenerEvent>({
    Run: eListenerEvent.Run,
    Suite: eListenerEvent.Suite,
    Test: eListenerEvent.Test,
    Hook: eListenerEvent.Hook,
    Assertion: eListenerEvent.Assertion
});

/**
 * Every value accepted where a listener event is expected: an `eListenerEvent` member, the `ListenerEventEnum` object or a raw numeric identifier.
 * @since 0.2.0
 */
export type ListenerEvent = typeof ListenerEventEnum | eListenerEvent | number;
