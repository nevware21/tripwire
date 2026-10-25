/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { arrForEach, fnCall, ICachedValue, isFunction } from "@nevware21/ts-utils";
import { INotificationManager } from "../interfaces/INotificationManager";
import { IListener } from "../interfaces/IListener";
import { IListenerContext } from "../interfaces/IListenerContext";
import { INotifyResult } from "../interfaces/INotifyResult";
import { eListenerAction } from "../types/ListenerAction";
import { _noOpFn } from "../internal/_noOp";
import { IRemovable } from "../interfaces/IRemovable";
import { IAssertionContext } from "../assert/interface/IAssertionContext";
import { eListenerEvent, ListenerEvent } from "../types/ListenerEvent";

const START_METHOD_NAME: keyof IListener = "onStart";
const DONE_METHOD_NAME: keyof IListener = "onDone";

function _createNotifyAction(existingResult: INotifyResult | null, action: eListenerAction, reason?: string): INotifyResult {
    let result: INotifyResult = existingResult;

    if (!result) {
        result = {
            action: action,
            reason: reason
        };
    } else if (result.action !== eListenerAction.Abort) {
        // So current is continue or skip
        if (action === eListenerAction.Abort) {
            // Aborting always take precedence
            result.action = eListenerAction.Abort;
            result.reason = reason;
        } else if (result.action === eListenerAction.Continue) {
            // Only update if current is continue
            result.action = action;
            result.reason = reason;
        }
    }

    return result;
}

/**
 * Creates a new notification manager instance that manages test and assertion listeners.
 * Provides centralized notification handling and result aggregation.
 * Supports parent-child hierarchy to allow child managers to inherit and delegate to parent listeners.
 *
 * @param parent - Optional parent manager for delegation and inheritance
 * @returns A new notification manager
 * @since 0.2.0
 */
export function createNotifyMgr(parent?: INotificationManager | null): INotificationManager {
    let _listeners: IListener[] = [];
    // The number of _notifyListeners walks currently in progress -- a depth rather than a flag because
    // a listener can itself trigger a notification on this same manager (eg. by asserting inside its
    // onAssert). While it is non-zero the array being walked must not change underneath the walk:
    // a listener removing itself would otherwise shift its successor into the index just visited and
    // that successor would be skipped, losing both its callback and any Skip/Abort it would have
    // answered. Rather than copying the array for every notification (the common path, and far more
    // frequent than registration changes) the mutators below swap in a copy only when a walk is active.
    let _iterating = 0;

    function _mutableListeners(): IListener[] {
        if (_iterating > 0) {
            // Leave the array the active walk(s) hold untouched and continue with a copy
            _listeners = _listeners.slice();
        }

        return _listeners;
    }

    function _addListener(listener: IListener): IRemovable {
        _mutableListeners().push(listener);

        let result: IRemovable = {
            rm: () => {
                _removeListener(listener);
                result.rm = _noOpFn;
            }
        };

        return result;
    }

    function _removeListener(listener: IListener): void {
        const idx = _listeners.indexOf(listener);
        if (idx >= 0) {
            _mutableListeners().splice(idx, 1);
        }
    }

    function _notifyStart(event: ListenerEvent, context: ICachedValue<IListenerContext>): INotifyResult | null {
        return _notifyListeners(
            START_METHOD_NAME,
            event,
            context,
            parent ? parent.notifyStart(event, context) : undefined
        );
    }

    function _notifyDone(event: ListenerEvent, context: ICachedValue<IListenerContext>): INotifyResult | null {
        return _notifyListeners(
            DONE_METHOD_NAME,
            event,
            context,
            parent ? parent.notifyDone(event, context) : undefined
        );
    }

    function _notifyAssertion(context: ICachedValue<IAssertionContext>): INotifyResult | null {
        return _notifyListeners(
            "onAssert",
            eListenerEvent.Assertion,
            context,
            parent ? parent.notifyAssertion(context) : undefined
        );
    }

    function _notifyListeners(
        methodName: keyof IListener,
        event: ListenerEvent,
        lazyContext: ICachedValue<IListenerContext | IAssertionContext>,
        parentResult?: INotifyResult
    ): INotifyResult | null {
        let theResult: INotifyResult | null = parentResult || null;

        // A parent answering Abort stops the start and assertion notifications here, but a completion
        // notification always goes through: a listener whose onStart ran is guaranteed its onDone, and
        // suppressing it would skip that listener's cleanup. The aggregated result keeps the Abort
        // either way, as _createNotifyAction never downgrades one.
        if (methodName === DONE_METHOD_NAME || !theResult || theResult.action !== eListenerAction.Abort) {
            // Only evaluate the context if we have listeners to notify
            if (_listeners.length > 0) {
                /*
                 * Notify own listeners - call ALL listeners even if one returns abort
                 * This ensures cleanup/after listeners are always called if their
                 * corresponding before listeners were called
                 */
                _iterating++;
                try {
                    arrForEach(_listeners, (listener) => {
                        const method = listener[methodName];
                        if (method && isFunction(method)) {
                            const result: INotifyResult | void = methodName === "onAssert"
                                ? fnCall(method, listener, lazyContext as ICachedValue<IAssertionContext>)
                                : fnCall(method, listener, event, lazyContext as ICachedValue<IListenerContext>);
                            if (result) {
                                theResult = _createNotifyAction(theResult, result.action, result.reason);
                            }
                        }
                    });
                } finally {
                    _iterating--;
                }
            }
        }

        return theResult;
    }

    function _hasListeners(): boolean {
        return _listeners.length > 0 || !!(parent && parent.hasListeners && parent.hasListeners());
    }

    function _reset(): void {
        if (_iterating > 0) {
            _listeners = [];
        } else {
            _listeners.length = 0;
        }
    }

    return {
        addListener: _addListener,
        removeListener: _removeListener,
        notifyStart: _notifyStart,
        notifyDone: _notifyDone,
        notifyAssertion: _notifyAssertion,
        reset: _reset,
        hasListeners: _hasListeners
    };
}
