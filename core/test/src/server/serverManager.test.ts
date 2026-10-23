/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { createPromise, doAwait, IPromise } from "@nevware21/ts-async";
import { assert } from "../../../src/assert/assertClass";
import { createServerMgr } from "../../../src/server/ServerManager";
import { ITestServer } from "../../../src/server/ITestServer";
import { ITestServerProvider } from "../../../src/suite/interfaces/ITestServerProvider";

function fakeServer(name: string): ITestServer & { name: string; starts: number } {
    const server = {
        name,
        starts: 0,
        url: "",
        port: 0,
        isRunning: false,
        start: () => {
            server.starts++;
            server.isRunning = true;
            return server;
        },
        stop: () => createPromise<void>((resolve) => resolve())
    };

    return server;
}

/**
 * A provider whose getServer() answers with a promise the test settles by hand, counting how often
 * the manager asked it for a server.
 */
function asyncProvider(server: ITestServer) {
    let resolve: (server: ITestServer) => void;
    let reject: (reason: any) => void;
    const provider: ITestServerProvider & { calls: number } = {
        calls: 0,
        canProvideServer: true,
        getServer: () => {
            provider.calls++;
            return createPromise<ITestServer>((res, rej) => {
                resolve = res;
                reject = rej;
            });
        }
    };

    return {
        provider,
        resolve: () => resolve(server),
        reject: (reason: any) => reject(reason)
    };
}

/**
 * A server whose start() is asynchronous: it only reports isRunning once the test settles the startup.
 */
function slowStartServer(name: string) {
    let resolve: (server: ITestServer) => void;
    let reject: (reason: any) => void;
    const server: ITestServer & { name: string; starts: number; isRunning: boolean } = {
        name,
        starts: 0,
        url: "",
        port: 0,
        isRunning: false,
        start: () => {
            server.starts++;
            return createPromise<ITestServer>((res, rej) => {
                resolve = res;
                reject = rej;
            });
        },
        stop: () => createPromise<void>((res) => res())
    };

    return {
        server,
        ready: () => {
            server.isRunning = true;
            resolve(server);
        },
        fail: (reason: any) => reject(reason)
    };
}

function syncProvider(server: ITestServer) {
    const provider: ITestServerProvider & { calls: number } = {
        calls: 0,
        canProvideServer: true,
        getServer: () => {
            provider.calls++;
            return server;
        }
    };

    return provider;
}

describe("ServerManager", () => {
    describe("without a provider", () => {
        it("should report no server and start nothing", () => {
            const mgr = createServerMgr();

            assert.isNull(mgr.server);
            assert.isNull(mgr.start());
        });

        it("should defer to the parent manager", () => {
            const server = fakeServer("parent");
            const parent = createServerMgr();
            parent.setProvider(syncProvider(server));
            const child = createServerMgr(parent);

            assert.equal(child.server, server);
        });

        it("should ignore a provider that cannot provide a server", () => {
            const mgr = createServerMgr();
            mgr.setProvider({ canProvideServer: false, getServer: () => fakeServer("never") });

            assert.isNull(mgr.server);
        });
    });

    describe("synchronous provider", () => {
        it("should ask the provider once and cache the instance", () => {
            const server = fakeServer("sync");
            const provider = syncProvider(server);
            const mgr = createServerMgr();
            mgr.setProvider(provider);

            assert.equal(mgr.server, server);
            assert.equal(mgr.server, server);
            assert.equal(provider.calls, 1);
        });

        it("should start a server that is not running and leave a running one alone", () => {
            const server = fakeServer("sync");
            const mgr = createServerMgr();
            mgr.setProvider(syncProvider(server));

            assert.equal(mgr.start(), server);
            assert.equal(server.starts, 1);
            assert.isTrue(server.isRunning);

            mgr.start();
            assert.equal(server.starts, 1, "an already running server is not started again");
        });

        it("should ask again when the provider answered with no server", () => {
            const provider: ITestServerProvider & { calls: number } = {
                calls: 0,
                canProvideServer: true,
                getServer: () => {
                    provider.calls++;
                    return null;
                }
            };
            const mgr = createServerMgr();
            mgr.setProvider(provider);

            assert.isNull(mgr.server);
            assert.isNull(mgr.server);
            assert.equal(provider.calls, 2, "a null answer is not cached as a server");
        });
    });

    describe("asynchronous provider", () => {
        it("should share one in-flight acquisition between concurrent reads", async () => {
            const server = fakeServer("async");
            const pending = asyncProvider(server);
            const mgr = createServerMgr();
            mgr.setProvider(pending.provider);

            const first = mgr.server as IPromise<ITestServer>;
            const second = mgr.server as IPromise<ITestServer>;
            const started = mgr.start() as IPromise<ITestServer>;
            assert.equal(pending.provider.calls, 1, "the provider is asked once while the lookup is in flight");
            assert.equal(first, second, "both reads observe the same pending promise");

            pending.resolve();
            assert.equal(await first, server);
            assert.equal(await second, server);
            assert.equal(await started, server);
            assert.equal(server.starts, 1);

            assert.equal(mgr.server, server, "once resolved the instance is cached and returned directly");
            assert.equal(pending.provider.calls, 1);
        });

        it("should drop a rejected acquisition and ask the provider again", async () => {
            const server = fakeServer("async");
            const pending = asyncProvider(server);
            const mgr = createServerMgr();
            mgr.setProvider(pending.provider);

            const first = mgr.server as IPromise<ITestServer>;
            pending.reject(new Error("no server"));

            let rejected: any = null;
            await doAwait(first, () => {
                assert.fail("the rejection must reach the caller");
            }, (reason) => {
                rejected = reason;
            });
            assert.equal(rejected && rejected.message, "no server");

            const second = mgr.server as IPromise<ITestServer>;
            assert.notEqual(second, first, "the failed lookup is not kept");
            assert.equal(pending.provider.calls, 2);

            pending.resolve();
            assert.equal(await second, server);
        });
    });

    describe("asynchronous startup", () => {
        it("should share one in-flight start() between concurrent callers", async () => {
            const slow = slowStartServer("slow");
            const mgr = createServerMgr();
            mgr.setProvider(syncProvider(slow.server));

            const first = mgr.start() as IPromise<ITestServer>;
            const second = mgr.start() as IPromise<ITestServer>;
            assert.equal(first, second, "the second caller joins the startup already in flight");
            assert.equal(slow.server.starts, 1, "the server is asked to start once");

            slow.ready();
            assert.equal(await first, slow.server);
            assert.equal(await second, slow.server);

            assert.equal(mgr.start(), slow.server, "once running, start() answers synchronously with the instance");
            assert.equal(slow.server.starts, 1);
        });

        it("should share the startup even when the acquisition itself is asynchronous", async () => {
            const slow = slowStartServer("slow");
            const pending = asyncProvider(slow.server);
            const mgr = createServerMgr();
            mgr.setProvider(pending.provider);

            const first = mgr.start() as IPromise<ITestServer>;
            const second = mgr.start() as IPromise<ITestServer>;
            assert.equal(first, second);

            pending.resolve();
            await (mgr.server as IPromise<ITestServer>);
            assert.equal(slow.server.starts, 1, "only one caller reaches server.start()");

            slow.ready();
            assert.equal(await first, slow.server);
            assert.equal(await second, slow.server);
        });

        it("should drop a failed startup so the next start() tries again", async () => {
            const slow = slowStartServer("slow");
            const mgr = createServerMgr();
            mgr.setProvider(syncProvider(slow.server));

            const first = mgr.start() as IPromise<ITestServer>;
            slow.fail(new Error("port in use"));

            let rejected: any = null;
            await doAwait(first, () => {
                assert.fail("the failure must reach the caller");
            }, (reason) => {
                rejected = reason;
            });
            assert.equal(rejected && rejected.message, "port in use");

            const second = mgr.start() as IPromise<ITestServer>;
            assert.notEqual(second, first, "the failed startup is not kept");
            assert.equal(slow.server.starts, 2);

            slow.ready();
            assert.equal(await second, slow.server);
        });

        it("should not let a startup begun under the old provider clear the new provider's startup", async () => {
            const slowA = slowStartServer("A");
            const slowB = slowStartServer("B");
            const mgr = createServerMgr();

            mgr.setProvider(syncProvider(slowA.server));
            const startA = mgr.start() as IPromise<ITestServer>;

            mgr.setProvider(syncProvider(slowB.server));
            const startB = mgr.start() as IPromise<ITestServer>;
            assert.notEqual(startB, startA, "the new provider's server is started");
            assert.equal(slowB.server.starts, 1);

            slowA.ready();
            assert.equal(await startA, slowA.server, "the old caller still gets its own server");
            assert.equal(mgr.start(), startB, "but B's startup is still the one in flight");
            assert.equal(slowB.server.starts, 1);

            slowB.ready();
            assert.equal(await startB, slowB.server);
            assert.equal(mgr.server, slowB.server);
        });
    });

    describe("setProvider", () => {
        it("should invalidate a cached instance so the new provider is consulted", () => {
            const serverA = fakeServer("A");
            const serverB = fakeServer("B");
            const mgr = createServerMgr();

            mgr.setProvider(syncProvider(serverA));
            assert.equal(mgr.server, serverA);

            mgr.setProvider(syncProvider(serverB));
            assert.equal(mgr.server, serverB);
            assert.equal(mgr.start(), serverB);
            assert.equal(serverA.starts, 0, "the replaced provider's server is never started");
        });

        it("should honour a replacement provider that disables server support", () => {
            const serverA = fakeServer("A");
            const mgr = createServerMgr();

            mgr.setProvider(syncProvider(serverA));
            assert.equal(mgr.server, serverA);

            mgr.setProvider({ canProvideServer: false });
            assert.isNull(mgr.server);
            assert.isNull(mgr.start());
        });

        it("should not let a pending acquisition from the old provider repopulate the cache", async () => {
            const serverA = fakeServer("A");
            const serverB = fakeServer("B");
            const pendingA = asyncProvider(serverA);
            const mgr = createServerMgr();

            mgr.setProvider(pendingA.provider);
            const first = mgr.server as IPromise<ITestServer>;

            mgr.setProvider(syncProvider(serverB));
            assert.equal(mgr.server, serverB, "the new provider answers immediately");

            pendingA.resolve();
            assert.equal(await first, serverA, "the caller that started the old lookup still receives its result");
            assert.equal(mgr.server, serverB, "but the manager keeps the new provider's server");
        });

        it("should keep the cache when the same provider is set again", () => {
            const server = fakeServer("same");
            const provider = syncProvider(server);
            const mgr = createServerMgr();

            mgr.setProvider(provider);
            assert.equal(mgr.server, server);
            mgr.setProvider(provider);
            assert.equal(mgr.server, server);
            assert.equal(provider.calls, 1);
        });
    });
});
