/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { _gblConfigHost } from "../internal/_configHost";
import { getCurrentHost } from "./configHost";
import { objDefine, objForEachKey } from "@nevware21/ts-utils";
import { DEFAULT_CONFIG } from "./defaultConfig";
import { IConfigInst } from "../interfaces/IConfigInst";
import { IListener } from "../interfaces/IListener";
import { IRemovable } from "../interfaces/IRemovable";

/**
 * Mirrors `_notifyAssert`'s own host/notifyMgr resolution (`assert/scopeContext.ts`) so a
 * listener added via {@link addAssertionListener} observes exactly the same notifications
 * an assertion evaluated at this same moment would fire -- whichever host is "current"
 * (e.g. a runner's isolated host for the duration of its `run()`) if one is active, the
 * global default host's notifyMgr otherwise.
 */
function _getActiveNotifyMgr(): any {
    let host = getCurrentHost();
    return (host && host.notifyMgr) || _gblConfigHost().notifyMgr;
}

/**
 * Resolves the configuration that is in effect right now: the current host's own options while a
 * scope (see {@link getCurrentHost}) is installed, the global default host's options otherwise.
 */
function _getActiveConfig(): IConfigInst {
    let gbl = _gblConfigHost();
    let host = getCurrentHost();
    if (host && host !== gbl) {
        try {
            return host.opts.v;
        } catch (e) {
            // The host value can be deferred while constructing nested hosts.
        }
    }

    return gbl.opts.v;
}

function _getActiveOps(): any {
    let cfg: any = _getActiveConfig();

    return (cfg && cfg.$ops) || _gblConfigHost().opts.v.$ops;
}

/**
 * Registers a listener for test/suite/assertion notification events on whichever
 * configuration host is currently active (see {@link getCurrentHost}) at the moment this
 * is called -- the same host a `createTestRunner()` call without an explicit parent host
 * installs for the duration of its `run()`, so a listener added here while such a run is
 * in progress observes that run's events; added outside of any run, it observes the
 * global default host's events instead.
 * @param listener - The listener to add.
 * @returns A removable handle to unregister the listener.
 * @since 0.2.0
 */
export function addAssertionListener(listener: IListener): IRemovable {
    return _getActiveNotifyMgr().addListener(listener);
}

/**
 * Removes a previously added listener from whichever configuration host is currently
 * active (see {@link addAssertionListener}).
 * @param listener - The listener to remove.
 * @since 0.2.0
 */
export function removeAssertionListener(listener: IListener): void {
    _getActiveNotifyMgr().removeListener(listener);
}

/**
 * The shared configuration entry point. Every read and write of a configuration value, and every
 * `$ops` operation, is routed to the configuration of the host that is active at that moment, so the
 * same `assertConfig` reference reaches the global default configuration outside of any host scope
 * and a runner's isolated configuration while that runner is running.
 *
 * It is a stable facade rather than any host's own configuration object: a host's saved options are
 * only ever read or written through its own `opts`, so installing another host can never make, for
 * instance, a clone of the global host pick up the active host's values.
 */
export const assertConfig: IConfigInst = (/* #__PURE__*/function() {
    let facade: any = {};

    objForEachKey(DEFAULT_CONFIG, (key) => {
        objDefine(facade, key, {
            g: () => {
                return (_getActiveConfig() as any)[key];
            },
            s: (value: any) => {
                (_getActiveConfig() as any)[key] = value;
            }
        });
    });

    let opsProxy: any = {
        reset: () => {
            return _getActiveOps().reset();
        },
        clone: (options?: any) => {
            return _getActiveOps().clone(options);
        },
        addFormatter: (formatter: any) => {
            return _getActiveOps().addFormatter(formatter);
        }
    };

    objDefine(opsProxy, "formatMgr", {
        g: () => {
            return _getActiveOps().formatMgr;
        }
    });

    objDefine(facade, "$ops", {
        v: opsProxy
    });

    return facade;
})();
