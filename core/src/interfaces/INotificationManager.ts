/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { ICachedValue } from "@nevware21/ts-utils";
import { IListener } from "./IListener";
import { IListenerContext } from "./IListenerContext";
import { INotifyResult } from "./INotifyResult";
import { IRemovable } from "./IRemovable";
import { IAssertionContext } from "../assert/interface/IAssertionContext";
import { ListenerEvent } from "../types/ListenerEvent";

/**
 * Manages test and assertion event notifications to registered listeners.
 * The notification manager is responsible for:
 * - Registering and removing listeners
 * - Iterating over listeners when events occur
 * - Aggregating listener results into a unified action
 *
 * @since 0.2.0
 */
export interface INotificationManager {
    /**
     * Add a listener to receive notifications
     * @param listener - The listener to add
     * @returns A removable handle to unregister the listener
     */
    addListener(listener: IListener): IRemovable;

    /**
     * Remove a listener
     * @param listener - The listener to remove
     */
    removeListener(listener: IListener): void;

    /**
     * Notify all listeners that an event is starting
     * @param event - The type of event
     * @param context - Lazy context containing event-specific details (evaluated only if listeners exist)
     * @returns Aggregated notification action from all listeners, or `null` when no listener answered with one
     */
    notifyStart(event: ListenerEvent, context: ICachedValue<IListenerContext>): INotifyResult | null;

    /**
     * Notify all listeners that an event has completed
     * @param event - The type of event
     * @param context - Lazy context containing event-specific details and results (evaluated only if listeners exist)
     * @returns Aggregated notification action from all listeners, or `null` when no listener answered with one
     */
    notifyDone(event: ListenerEvent, context: ICachedValue<IListenerContext>): INotifyResult | null;

    /**
     * Notify all listeners that an assertion evaluation occurred
     * @param context - Lazy evaluation context with results (evaluated only if listeners exist)
     * @returns Aggregated notification action from all listeners, or `null` when no listener answered with one
     */
    notifyAssertion(context: ICachedValue<IAssertionContext>): INotifyResult | null;

    /**
     * Reset the notification manager, clearing all listeners
     */
    reset(): void;

    /**
     * Identifies whether this manager, or any parent manager it was created with, currently has at least
     * one registered listener. Callers use this to avoid building the (lazily evaluated) notification
     * context when nothing would ever read it.
     * @returns `true` when at least one listener is registered in this manager or its parent chain
     */
    hasListeners?(): boolean;
}
