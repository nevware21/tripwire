/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */


import { _createConfig } from "../config/config";
import { getDeferred, getGlobal, ICachedValue, objDefine, objDefineProps } from "@nevware21/ts-utils";
import { INotificationManager } from "../interfaces/INotificationManager";
import { createNotifyMgr } from "../notify/NotificationManager";
import { DEFAULT_CONFIG } from "../config/defaultConfig";
import { IConfigHost } from "../interfaces/IConfigHost";
import { IServerManager } from "../interfaces/IServerManager";
import { createServerMgr } from "../server/ServerManager";
import { IConfigInst } from "../interfaces/IConfigInst";

/**
 * @internal
 * @ignore
 * The browser/worker runner serves some modules from a pre-built dist bundle (for the
 * describe/it/createTestRunner globals) and others individually transpiled straight from
 * source (anything a test file imports by relative path, eg. `../../../src/assert/expect`)
 * -- two separate copies of this module, each with its own closure-scoped module state.
 * A plain `let` here would give each copy its own independent "current host"/"global host",
 * so a test runner's `useHost()` call (through the dist-bundle copy) would be completely
 * invisible to assert()/expect() calls made through the individually-loaded copy -- which is
 * exactly why assertion-listener notifications never reached the browser/worker debug UI.
 * Storing the actual state on a single, shared slot keyed off the real JS global object
 * (the one thing every copy of this module, however it got loaded, genuinely shares) makes
 * every copy observe the same "current"/"global" host regardless of which one is asked.
 */
export interface IConfigHostSlot {
    gbl?: IConfigHost;
    current?: IConfigHost;
    frames?: IConfigHostFrame[];
}

/**
 * @internal
 * @ignore
 * One active `useHost()` scope: the host it installed, the host it replaced and whether its callback
 * has finished. Kept on the shared slot so overlapping asynchronous scopes unwind in order.
 */
export interface IConfigHostFrame {
    host: IConfigHost;
    prev?: IConfigHost;
    done: boolean;
}

const _gblSlotKey = "__nevware21_tripwire_configHostSlot__";

/**
 * @internal
 * @ignore
 * Gets the shared slot that holds the global and current configuration hosts.
 */
export function _gblSlot(): IConfigHostSlot {
    const g: any = getGlobal() || {};
    let slot: IConfigHostSlot = g[_gblSlotKey];
    if (!slot) {
        slot = {};
        g[_gblSlotKey] = slot;
    }

    return slot;
}

function _createHost(pOpts: ICachedValue<IConfigInst>, notifyMgr: ICachedValue<INotificationManager>, serverMgr: ICachedValue<IServerManager>): IConfigHost {
    let cfgHost: IConfigHost = {} as IConfigHost;

    objDefine(cfgHost, "notifyMgr", {
        l: notifyMgr
    });

    objDefine(cfgHost, "serverMgr", {
        l: serverMgr
    });

    return objDefineProps(cfgHost, {
        opts: {
            v: pOpts,
            w: false
        },
        clone: {
            v: function () {
                return _createHost(
                    getDeferred(() => cfgHost.opts.v.$ops.clone()),
                    getDeferred(() => createNotifyMgr(cfgHost.notifyMgr)),
                    getDeferred(() => createServerMgr(cfgHost.serverMgr))
                );
            }
        }
    });
}

/**
 * @internal
 * Gets the global default configuration host instance.
 * @returns The global default configuration host instance.
 */
export function _gblConfigHost(): IConfigHost {
    const slot = _gblSlot();
    if (!slot.gbl) {
        // The default host carries its own managers so listeners registered outside any useHost()
        // scope have somewhere to go, and so a cloned host chains to them and inherits them.
        slot.gbl = _createHost(
            getDeferred(() => {
                return _createConfig(() => DEFAULT_CONFIG);
            }),
            getDeferred(() => createNotifyMgr()),
            getDeferred(() => createServerMgr()));
    }

    return slot.gbl;
}

