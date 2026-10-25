/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

export function _resolveServerPolicy(parsed: any, target: string, browserLaunch?: string): { shouldStartServer: boolean, warning?: string } {
    if (!parsed || !parsed.noServer) {
        return {
            shouldStartServer: true
        };
    }

    if ((target === "browser" || target === "worker") && browserLaunch === "open") {
        return {
            shouldStartServer: true,
            warning: "Ignoring --no-server because --browser-launch open requires the server to be running."
        };
    }

    return {
        shouldStartServer: false
    };
}

