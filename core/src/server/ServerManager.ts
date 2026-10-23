/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { doAwait, doFinally, IPromise } from "@nevware21/ts-async";
import { IServerManager } from "../interfaces/IServerManager";
import { ITestServerProvider } from "../suite/interfaces/ITestServerProvider";
import { isFunction, isPromiseLike, objDefine } from "@nevware21/ts-utils";
import { ITestServer } from "./ITestServer";

type ServerResult = IPromise<ITestServer | null | undefined> | ITestServer | null | undefined;

/**
 * Creates a server manager, optionally chained to a parent manager whose provider it inherits.
 * @since 0.2.0
 */
export function createServerMgr(parent?: IServerManager | null): IServerManager {
    let provider: ITestServerProvider | null = null;
    let serverInstance: ITestServer | null | undefined = null;
    // The acquisition still in flight, so that reading `server` (or calling start()) again before an
    // asynchronous provider has resolved shares that one call instead of asking the provider for a
    // second server and keeping only whichever resolved last.
    let pending: IPromise<ITestServer | null | undefined> | null = null;
    // Likewise the start() still in flight: a server whose startup is asynchronous reports isRunning
    // false until it is ready, so a second start() arriving meanwhile must join the first rather than
    // ask the server to start again.
    let starting: IPromise<ITestServer | null | undefined> | null = null;
    // Bumped whenever the provider changes: an acquisition or startup begun under the previous provider
    // finds the generation has moved on when it settles and leaves the cache alone, so it can neither
    // hand the old provider's server to later readers nor clear a newer operation.
    let generation = 0;

    function _setProvider(newProvider: ITestServerProvider): void {
        if (newProvider !== provider) {
            provider = newProvider;
            serverInstance = null;
            pending = null;
            starting = null;
            generation++;
        }
    }

    function _getServer(): ServerResult {
        if (serverInstance) {
            return serverInstance;
        }

        if (pending) {
            return pending;
        }

        if (provider && provider.canProvideServer && isFunction(provider.getServer)) {
            const myGeneration = generation;
            let settled = false;
            const result = doAwait(provider.getServer(), (server) => {
                settled = true;
                if (myGeneration === generation) {
                    serverInstance = server;
                    pending = null;
                }

                return server;
            }, (reason) => {
                settled = true;
                if (myGeneration === generation) {
                    pending = null;
                }

                throw reason;
            });

            // A provider may answer synchronously (a plain instance or an already settled promise),
            // in which case the callbacks above have already run and there is nothing left in flight.
            if (!settled && isPromiseLike(result)) {
                pending = result as IPromise<ITestServer | null | undefined>;
            }

            return result;
        }

        if (parent) {
            return parent.server;
        }

        return null;
    }

    function _startServer(): ServerResult {
        if (starting) {
            return starting;
        }

        const myGeneration = generation;
        let settled = false;
        const result = doFinally(doAwait<ITestServer | null | undefined>(_getServer(), (server) => {
            if (server && !server.isRunning) {
                return server.start();
            }

            return server;
        }), () => {
            settled = true;
            if (myGeneration === generation) {
                starting = null;
            }
        }) as ServerResult;

        // Only an asynchronous startup (or acquisition) leaves anything in flight to share
        if (!settled && isPromiseLike(result)) {
            starting = result as IPromise<ITestServer | null | undefined>;
        }

        return result;
    }

    let manager: IServerManager = {
        server: null as any, // Will be defined as a getter below
        start: _startServer,
        setProvider: _setProvider
    };

    return objDefine(manager, "server", {
        g: _getServer
    });
}
