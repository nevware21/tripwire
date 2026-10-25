/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import * as tripwire from "@nevware21/tripwire";
import { assert } from "@nevware21/tripwire";
import { _createTestServerAdapter } from "../../../src/client/createTestServerAdapter";
import { _createRunnerHost } from "../../../src/execute/runnerHost";

/**
 * The runner host is the configuration host the CLI installs around a node run: a clone of the loaded
 * tripwire module's configuration, its own notification manager, and a server manager that hands out the
 * CLI's test server.
 */
describe("execute runner host", () => {
    const server = {
        url: "http://127.0.0.1:4321/",
        port: 4321,
        isRunning: true,
        stopped: 0,
        stop: function () {
            server.stopped++;
            return Promise.resolve();
        }
    };

    it("clones the module's configuration so the run cannot change the module's own settings", () => {
        const host = _createRunnerHost(tripwire as any, null);

        assert.isObject(host.opts.v);
        assert.notEqual(host.opts.v, tripwire.assertConfig, "the host carries a clone");
        assert.equal(host.opts.v.timeout, tripwire.assertConfig.timeout, "with the same values");
        assert.isObject(host.notifyMgr);
        assert.isFunction(host.notifyMgr.addListener);
    });

    it("uses the configuration as it is when it cannot be cloned", () => {
        const bare = { assertConfig: { timeout: 7 }, createNotifyMgr: undefined as any };
        const host = _createRunnerHost(bare as any, null);

        assert.equal(host.opts.v, bare.assertConfig);
        assert.isNull(host.notifyMgr, "no manager factory, no manager");
    });

    it("exposes no server when the CLI started none", () => {
        const host = _createRunnerHost(tripwire as any, null);

        assert.isNull(host.serverMgr.server);
        assert.isNull(host.serverMgr.start());
        host.serverMgr.setProvider({ canProvideServer: true, getServer: () => ({}) });
        assert.isNull(host.serverMgr.server, "providers are ignored, the CLI owns the server");
    });

    it("hands out the CLI's server through an adapter", () => {
        const host = _createRunnerHost(tripwire as any, server as any);
        const adapted = host.serverMgr.server;

        assert.isObject(adapted);
        assert.equal(adapted.url, server.url);
        assert.equal(adapted.port, server.port);
        assert.isTrue(adapted.isRunning);
        assert.equal(host.serverMgr.start(), adapted, "starting hands back the already running server");
    });

    it("clones into a fresh host over the same module and server", () => {
        const host = _createRunnerHost(tripwire as any, server as any);
        const clone = host.clone();

        assert.notEqual(clone, host);
        assert.notEqual(clone.notifyMgr, host.notifyMgr, "each host has its own listeners");
        assert.equal(clone.serverMgr.server.url, server.url);
    });

    describe("test server adapter", () => {
        it("is null without a server or a url", () => {
            assert.isNull(_createTestServerAdapter(null));
            assert.isNull(_createTestServerAdapter({ url: "", port: 0, isRunning: false }));
        });

        it("reflects the live server state and forwards stop", async () => {
            const live = { url: "http://localhost:1/", port: 1, isRunning: false, stops: 0, stop: () => {
                live.stops++;
                return Promise.resolve();
            } };
            const adapter = _createTestServerAdapter(live);

            assert.equal(adapter.url, "http://localhost:1/");
            assert.equal(adapter.port, 1);
            assert.isFalse(adapter.isRunning);
            live.isRunning = true;
            assert.isTrue(adapter.isRunning, "the getters read the server, they do not snapshot it");
            assert.equal(adapter.start(), adapter);

            await adapter.stop();
            assert.equal(live.stops, 1);
        });

        it("resolves stop even when the server has no stop of its own", async () => {
            const adapter = _createTestServerAdapter({ url: "http://localhost:2/", port: 2, isRunning: true });

            await adapter.stop();
        });
    });
});
