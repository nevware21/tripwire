/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { createPromise, doAwait } from "@nevware21/ts-async";
import { assert } from "../../../src/assert/assertClass";
import { getCurrentHost, useHost, withHost } from "../../../src/config/configHost";
import { IConfigHost } from "../../../src/interfaces/IConfigHost";

/**
 * `useHost`/`withHost` install a configuration host for the duration of a callback. The contract
 * that matters to a caller is that the callback is handed the host actually installed for it --
 * `withHost` exists precisely to hand over the current one, and used to pass on the `null` it
 * forwards internally instead.
 */
describe("configHost", () => {

    describe("withHost", () => {
        it("should pass the installed host to the callback", () => {
            const received = withHost((host: IConfigHost) => host);

            assert.isNotNull(received, "withHost must never hand its callback a null host");
            assert.isObject(received);
        });

        it("should pass the same host the callback would read from getCurrentHost", () => {
            const seen = withHost((host: IConfigHost) => ({ arg: host, current: getCurrentHost() }));

            assert.equal(seen.arg, seen.current, "the argument is the host installed for the callback");
        });

        it("should return the callback's own result", () => {
            assert.equal(withHost(() => 42), 42);
        });

        it("should restore the previous host afterwards", () => {
            const before = getCurrentHost();

            withHost((host: IConfigHost) => {
                assert.notEqual(host, before, "withHost installs a clone, not the host it replaced");
            });

            assert.equal(getCurrentHost(), before);
        });
    });

    describe("useHost", () => {
        it("should pass an explicitly supplied host straight through", () => {
            const explicit = getCurrentHost().clone();
            const received = useHost(explicit, (host: IConfigHost) => host);

            assert.equal(received, explicit);
        });

        it("should install the host it passes to the callback", () => {
            const explicit = getCurrentHost().clone();

            useHost(explicit, (host: IConfigHost) => {
                assert.equal(host, explicit);
                assert.equal(getCurrentHost(), explicit);
            });
        });

        it("should restore the previous host when the callback throws", () => {
            const before = getCurrentHost();

            assert.throws(() => {
                useHost(before.clone(), () => {
                    throw new Error("boom");
                });
            }, "boom");

            assert.equal(getCurrentHost(), before);
        });
    });

    /**
     * Asynchronous scopes can overlap: a second useHost() may begin while a first one is still pending.
     * Whichever order they settle in, a finished scope must never reinstall its own predecessor over a
     * scope that is still running, and once every scope has finished the original host must be back.
     */
    describe("overlapping async scopes", () => {
        function startScope(host: IConfigHost) {
            let resolve: () => void;
            const promise = useHost(host, () => createPromise<void>((res) => {
                resolve = res;
            }));

            return { promise, resolve: () => resolve() };
        }

        it("should keep the newer scope installed when the older one settles first", async () => {
            const before = getCurrentHost();
            const hostA = before.clone();
            const hostB = before.clone();

            const scopeA = startScope(hostA);
            assert.equal(getCurrentHost(), hostA);
            const scopeB = startScope(hostB);
            assert.equal(getCurrentHost(), hostB);

            scopeA.resolve();
            await scopeA.promise;
            assert.equal(getCurrentHost(), hostB, "A settling must not replace the still pending B");

            scopeB.resolve();
            await scopeB.promise;
            assert.equal(getCurrentHost(), before, "B settling unwinds both finished scopes");
        });

        it("should unwind one scope at a time when they settle in reverse order", async () => {
            const before = getCurrentHost();
            const hostA = before.clone();
            const hostB = before.clone();

            const scopeA = startScope(hostA);
            const scopeB = startScope(hostB);

            scopeB.resolve();
            await scopeB.promise;
            assert.equal(getCurrentHost(), hostA, "B settling restores the still pending A");

            scopeA.resolve();
            await scopeA.promise;
            assert.equal(getCurrentHost(), before);
        });

        it("should let a synchronous scope nest inside a pending asynchronous one", async () => {
            const before = getCurrentHost();
            const hostA = before.clone();
            const hostB = before.clone();

            const scopeA = startScope(hostA);
            useHost(hostB, () => {
                assert.equal(getCurrentHost(), hostB);
            });
            assert.equal(getCurrentHost(), hostA, "the synchronous scope restores the pending A, not the original");

            scopeA.resolve();
            await scopeA.promise;
            assert.equal(getCurrentHost(), before);
        });

        it("should restore the previous host when the asynchronous callback rejects", async () => {
            const before = getCurrentHost();
            let rejected: any = null;

            await doAwait(useHost(before.clone(), () => createPromise<void>((_res, rej) => {
                rej(new Error("async boom"));
            })), () => {
                assert.fail("the rejection must propagate");
            }, (reason) => {
                rejected = reason;
            });

            assert.equal(rejected && rejected.message, "async boom");
            assert.equal(getCurrentHost(), before);
        });
    });
});
