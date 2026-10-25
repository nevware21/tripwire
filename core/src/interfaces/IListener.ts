/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { ICachedValue } from "@nevware21/ts-utils";
import { IListenerContext } from "./IListenerContext";
import { INotifyResult } from "./INotifyResult";
import { IAssertionContext } from "../assert/interface/IAssertionContext";
import { ListenerEvent } from "../types/ListenerEvent";

/**
 * Unified listener interface for all test and assertion events.
 * All methods are optional - implement only the callbacks you need.
 *
 * Listeners are registered with the notification manager, which handles:
 * - Iterating over all registered listeners when events occur
 * - Aggregating listener results into a unified notification action
 *
 * @example
 * ```typescript
 * const listener: IListener = {
 *     onStart(event, context) {
 *         console.log("Event starting", event);
 *         return { abort: false };
 *     },
 *     onDone(event, context) {
 *         console.log("Event finished", event);
 *     },
 *     onAssert(context) {
 *         const ctx = context.v;
 *         console.log(`Assertion ${ctx.passed ? "passed" : "failed"}`);
 *         return { skip: ctx.passed };
 *     }
 * };
 * ```
 * @since 0.2.0
 */
export interface IListener {
    /**
     * Called when a test event starts
     * @param event - The event type
     * @param context - Lazy context containing event details (access via .v)
     * @returns Optional notification action to control event processing
     */
    onStart?(event: ListenerEvent, context: ICachedValue<IListenerContext>): INotifyResult | void;

    /**
     * Called when a test event completes
     * @param event - The event type
     * @param context - Lazy context containing event results (access via .v)
     * @returns Optional notification action to control event processing
     */
    onDone?(event: ListenerEvent, context: ICachedValue<IListenerContext>): INotifyResult | void;

    /**
     * Called when an assertion evaluation occurs
     * @param context - Lazy assertion context with results (access via .v)
     * @returns Optional notification action to control evaluation result
     */
    onAssert?(context: ICachedValue<IAssertionContext>): void | INotifyResult;
}
