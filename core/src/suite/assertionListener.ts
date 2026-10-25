/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IListener } from "../interfaces/IListener";

/**
 * Unified listener interface for test and assertion events.
 *
 * Listeners are registered via {@link addAssertionListener} (config/assertConfig.ts), which
 * resolves to whichever configuration host is currently active -- a runner's own isolated
 * host for the duration of its `run()` if one is in progress, the global default host
 * otherwise. The notification manager handles:
 * - Registering and removing listeners
 * - Iterating over listeners when events occur
 * - Aggregating listener results into a unified notification action
 *
 * All listener methods are optional - implement only the callbacks you need:
 * - `onStart` - Called when a test event starts (check `context.type`)
 * - `onDone` - Called when a test event completes (check `context.type`)
 * - `onAssert` - Called when assertion evaluations complete
 *
 * @example
 * ```typescript
 * import { addAssertionListener } from "@nevware21/tripwire";
 *
 * const listener = {
 *     onAssert(context) {
 *         console.log("Assertion:", context.v.passed ? "PASS" : "FAIL");
 *         return { skip: false };
 *     },
 *     onStart(event, context) {
 *         console.log("Starting event", event);
 *         return { abort: false };
 *     },
 *     onDone(event, context) {
 *         console.log("Finished event:", event);
 *     }
 * };
 *
 * const removable = addAssertionListener(listener);
 * // ... later
 * removable.rm();
 * ```
 *
 * @since 0.2.0
 */
export type IAssertionListener = IListener;
