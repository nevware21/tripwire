/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { createCachedValue, isFunction, isNumber } from "@nevware21/ts-utils";
import { ITripwireModule } from "../interfaces/ITripwireModule";

export function createContextServer(settings: any): any {
    const source = settings ? settings.server : null;
    if (!source || !source.url) {
        return null;
    }

    return {
        url: String(source.url),
        port: isNumber(source.port) ? source.port : 0,
        isRunning: source.isRunning !== false,
        start: function() {
            this.isRunning = true;
            return this;
        },
        stop: function() {
            this.isRunning = false;
            return Promise.resolve();
        }
    };
}

export function createRunnerHost(tripwire: ITripwireModule, settings: any): any {
    const configInst = tripwire && tripwire.assertConfig && tripwire.assertConfig.$ops && isFunction(tripwire.assertConfig.$ops.clone)
        ? tripwire.assertConfig.$ops.clone()
        : tripwire.assertConfig;
    const runnerServer = createContextServer(settings);

    return {
        opts: createCachedValue(configInst),
        notifyMgr: tripwire && isFunction(tripwire.createNotifyMgr) ? tripwire.createNotifyMgr() : null,
        serverMgr: {
            server: runnerServer,
            start: function() {
                return runnerServer && runnerServer.start ? runnerServer.start() : runnerServer;
            },
            setProvider: function(_provider: any) {
                // Fixed server instance — no provider swapping needed.
            }
        },
        clone: function() {
            return createRunnerHost(tripwire, settings);
        }
    };
}

export function applyGlobalRunnerConfig(tripwire: any, settings: any): () => void {
    const assertConfig = tripwire ? tripwire.assertConfig : null;
    if (!assertConfig) {
        return () => { /* noop */ };
    }

    const trackedKeys = ["timeout", "slow", "retries"];
    const previous: any = {};
    const changed: string[] = [];

    for (let i = 0; i < trackedKeys.length; i++) {
        const key = trackedKeys[i];
        const value = settings ? (settings as any)[key] : undefined;
        if (value !== undefined) {
            previous[key] = assertConfig[key];
            assertConfig[key] = value;
            changed.push(key);
        }
    }

    return () => {
        for (let i = 0; i < changed.length; i++) {
            assertConfig[changed[i]] = previous[changed[i]];
        }
    };
}

// Suite construction and the per-test slow/timeout/retries application that used to be
// duplicated here now live in ../shared/moduleLoader.ts, which both this (worker) target and
// the browser frame import directly.
