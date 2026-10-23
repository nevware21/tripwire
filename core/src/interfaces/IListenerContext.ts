/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { ITestSuite } from "../suite/interfaces/ITestSuite";
import { IHookDefinition } from "../suite/interfaces/IHookDefinition";
import { IListenerStartContext } from "./IListenerStartContext";
import { IListenerEndContext } from "./IListenerEndContext";
import { ListenerEvent } from "../types/ListenerEvent";
import { ITestCase } from "./suite/ITestCase";

/**
 * Base context interface with common properties
 * @since 0.2.0
 */
export interface IListenerContext {
    /**
     * The event type for this notification
     */
    type: ListenerEvent;

    /**
     * The suite (Run events: root suite, Suite events: the suite starting)
     */
    suite?: ITestSuite | null;

    /**
     * The test that is starting (Test events)
     * Also set for Hook events when the hook is a beforeEach/afterEach hook
     */
    test?: ITestCase | null;

    /**
     * The hook being executed (Hook events only)
     */
    hook?: IHookDefinition | null;

    /**
     * Start phase context (when onStart is called)
     */
    start?: IListenerStartContext;

    /**
     * End/Done phase context (when onDone is called)
     */
    end?: IListenerEndContext;
}
