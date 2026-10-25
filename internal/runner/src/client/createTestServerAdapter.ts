/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

export function _createTestServerAdapter(server: { url: string, port: number, isRunning: boolean, stop?: () => any } | null): any {
    if (!server || !server.url) {
        return null;
    }

    return {
        get url() {
            return server.url;
        },
        get port() {
            return server.port;
        },
        get isRunning() {
            return !!server.isRunning;
        },
        start: function() {
            return this;
        },
        stop: function() {
            return server.stop ? server.stop() : Promise.resolve();
        }
    };
}
