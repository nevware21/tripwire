/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { doFinally } from "@nevware21/ts-async";
import { isPromiseLike } from "@nevware21/ts-utils";
import { _gblConfigHost, _gblSlot, IConfigHostFrame } from "../internal/_configHost";
import { ConfigHostFunc } from "../types/ConfigHostFunc";
import { IConfigHost } from "../interfaces/IConfigHost";

/**
 * Gets the current configuration host instance.
 * @returns The current configuration host instance.
 * @since 0.2.0
 */
export function getCurrentHost(): IConfigHost {
    return _gblSlot().current || _gblConfigHost();
}

/**
 * Uses the specified configuration host instance for the duration of the callback.
 * @param host - The configuration host instance to use.
 * @param cb - The callback function to execute with the specified host.
 * @returns The result of the callback function.
 * @since 0.2.0
 */
export function useHost<T>(host: IConfigHost, cb: ConfigHostFunc<T>): T {
    const slot = _gblSlot();
    let isAsync = false;

    // Resolve the host first, then force-evaluate its opts.v while the "current" slot still
    // holds the caller's host. A clone's options are deferred, and anything they consult while
    // materialising (eg. the active configuration through assertConfig) must see the caller's
    // host, not the half-installed one -- which would otherwise re-enter the same deferred.
    const theHost = host || getCurrentHost().clone();
    if (theHost && theHost.opts) {
        void theHost.opts.v;
    }

    // The host being replaced is recorded as a frame on the shared slot rather than restored from
    // a local when the callback finishes, because asynchronous callbacks can overlap: with scope A
    // still pending when scope B starts, A settling first must not reinstall A's predecessor over
    // B's host (and B settling later would then have reinstalled the already finished A). A frame
    // that settles while it is not the newest is only marked done; the hosts are actually restored
    // when the newest frame settles, which unwinds every finished frame beneath it as well.
    const frames = slot.frames || (slot.frames = []);
    const frame: IConfigHostFrame = { host: theHost, prev: slot.current, done: false };
    frames.push(frame);
    slot.current = theHost;

    function _restore() {
        frame.done = true;
        let top: IConfigHostFrame;
        while ((top = frames[frames.length - 1]) && top.done) {
            frames.pop();
            slot.current = top.prev;
        }
    }

    try {
        // `theHost`, not `host`: the callback is documented -- and typed `(host: IConfigHost) => T`
        // -- to receive the host that is actually installed for its duration. Passing the argument
        // straight back meant `withHost(cb)`, whose whole purpose is to hand over the *current*
        // host, called its callback with the `null` it passes in here.
        let result = cb(theHost);
        if (isPromiseLike(result)) {
            isAsync = true;
            // The doFinally chain is what gets returned, not `result` itself: returning the
            // original left the derived promise dangling, so a rejecting callback (eg. a
            // before/after hook that threw, which the runner propagates as a rejected run)
            // settled it with nobody attached -- an unhandled rejection that took the whole
            // process down before the caller's own catch could report anything.
            return doFinally(result, _restore) as T;
        }

        return result;
    } finally {
        if (!isAsync) {
            _restore();
        }
    }
}

/**
 * Uses the current configuration host instance for the duration of the callback.
 * @param cb - The callback function to execute with the current host.
 * @returns The result of the callback function.
 * @since 0.2.0
 */
export function withHost<T>(cb: ConfigHostFunc<T>): T {
    return useHost(null, cb);
}
