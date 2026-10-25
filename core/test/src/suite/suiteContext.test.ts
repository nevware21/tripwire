/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { createPromise, IPromise } from "@nevware21/ts-async";
import { scheduleTimeout } from "@nevware21/ts-utils";
import { assert } from "../../../src/assert/assertClass";
import { assertConfig } from "../../../src/config/assertConfig";
import { useHost } from "../../../src/config/configHost";
import { _gblConfigHost } from "../../../src/internal/_configHost";
import { ISuiteContext } from "../../../src/interfaces/suite/ISuiteContext";
import { it as selfIt } from "../../../src/suite/it";
import { _getCurrentSuite, createSuite, describe as selfDescribe, getRootSuite, resetSuite, useSuite } from "../../../src/suite/suite";

/**
 * The context a suite definition runs with (`this` inside describe/useSuite): the timeout, slow and retries
 * settings it reads come from the suite itself, then its ancestors, then the active configuration.
 */
describe("suite definition context", () => {
    it("should fall back to the configuration defaults when nothing is set", () => {
        const root = createSuite();
        let seen: { timeout: number; slow: number; retries: number } = null;

        useSuite(root, function (this: ISuiteContext) {
            seen = { timeout: this.timeout(), slow: this.slow(), retries: this.retries() };
        });

        assert.equal(seen.timeout, assertConfig.timeout);
        assert.equal(seen.slow, assertConfig.slow);
        assert.equal(seen.retries, assertConfig.retries);
    });

    it("should read the values set on the suite and return the context when setting", () => {
        const root = createSuite();
        let chained: any[] = [];

        useSuite(root, function (this: ISuiteContext) {
            chained.push(this.timeout(500));
            chained.push(this.slow(20));
            chained.push(this.retries(3));

            assert.equal(this.timeout(), 500);
            assert.equal(this.slow(), 20);
            assert.equal(this.retries(), 3);
        });

        assert.equal(root.timeout, 500);
        assert.equal(root.slow, 20);
        assert.equal(root.retries, 3);
        chained.forEach((value) => {
            assert.isObject(value, "setting returns the context for chaining");
        });
    });

    it("should inherit the values of an ancestor suite", () => {
        const root = createSuite();
        let inner: { timeout: number; slow: number; retries: number } = null;
        let innerSuite: any = null;

        useSuite(root, function (this: ISuiteContext) {
            this.timeout(750);
            this.retries(2);

            selfDescribe("outer", function () {
                selfDescribe("inner", function (this: ISuiteContext) {
                    inner = { timeout: this.timeout(), slow: this.slow(), retries: this.retries() };
                    selfIt("test", () => {});
                });
            });
        });

        innerSuite = root.suites[0].suites[0];
        assert.equal(inner.timeout, 750, "the timeout comes from the root");
        assert.equal(inner.retries, 2, "the retries come from the root");
        assert.equal(inner.slow, assertConfig.slow, "nothing set the slow threshold, so the default applies");
        assert.equal(innerSuite.tests[0].timeout, 750, "tests inherit the suite's effective timeout");
    });

    it("should expose the server of the active host", () => {
        const root = createSuite();
        let server: any = "unset";

        // Under the tripwire runner the active host is the runner's own, which does provide a server, so the
        // global default host is installed explicitly: it has no provider and therefore no server.
        useHost(_gblConfigHost(), () => {
            useSuite(root, function (this: ISuiteContext) {
                server = this.server;
            });
        });

        assert.isNull(server, "no provider is configured, so there is no server");
    });

    it("should restore the previous context when the definition throws", () => {
        const first = createSuite();
        const second = createSuite();

        assert.throws(() => {
            useSuite(first, () => {
                selfDescribe("before the failure", () => {});
                throw new Error("definition failed");
            });
        }, "definition failed");

        assert.equal(first.suites.length, 1, "what was defined before the throw is kept");

        useSuite(second, () => {
            selfDescribe("after the failure", () => {
                selfIt("still registers against the right suite", () => {});
            });
        });

        assert.equal(second.suites.length, 1);
        assert.equal(second.suites[0].description, "after the failure");
        assert.equal(first.suites.length, 1, "the failed definition's suite is untouched");
    });

    it("should close only its own suite when asynchronous describes settle out of order", async () => {
        resetSuite();
        let resolveOuter: () => void;
        let resolveInner: () => void;
        let innerPromise: void | IPromise<void>;

        try {
            const outerPromise = selfDescribe("outer", () => {
                innerPromise = selfDescribe("inner", () => createPromise<void>((resolve) => {
                    resolveInner = resolve;
                }));

                return createPromise<void>((resolve) => {
                    resolveOuter = resolve;
                });
            });

            const outer = getRootSuite().suites[0];
            const inner = outer.suites[0];
            assert.equal(_getCurrentSuite(), inner, "both definitions are pending, the inner one is current");

            // The outer definition settles first, while the inner one is still pending
            resolveOuter();
            await outerPromise;
            assert.equal(_getCurrentSuite(), inner, "the outer suite is removed from beneath the inner one, which stays current");

            selfIt("still belongs to inner", () => {});
            assert.equal(inner.tests.length, 1);

            resolveInner();
            await innerPromise;
            assert.equal(_getCurrentSuite(), getRootSuite(), "once every definition has settled the root is current again");

            selfDescribe("sibling", () => {});
            assert.equal(getRootSuite().suites.length, 2, "a later definition is a sibling of the outer suite");
        } finally {
            resetSuite();
        }
    });

    it("should support an asynchronous describe and pop it once it settles", async () => {
        const root = createSuite();

        await useSuite(root, () => {
            return selfDescribe("async parent", () => {
                return createPromise<void>((resolve) => {
                    scheduleTimeout(() => {
                        selfIt("defined late", () => {});
                        resolve();
                    }, 1);
                });
            });
        });

        assert.equal(root.suites.length, 1);
        assert.equal(root.suites[0].description, "async parent");
        assert.equal(root.suites[0].tests.length, 1, "the test defined while the promise was pending belongs to the suite");

        useSuite(root, () => {
            selfDescribe("sibling", () => {});
        });

        assert.equal(root.suites.length, 2, "the asynchronous suite was popped, so the next describe is a sibling");
    });
});
