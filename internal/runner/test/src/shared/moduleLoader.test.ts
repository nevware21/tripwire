/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import * as tripwire from "@nevware21/tripwire";
import { assert } from "@nevware21/tripwire";
import {
    applyTestSettings, buildSuite, createRequire, getBrowserLoaderContext, ILoaderContext, installDefineRegistry, setTripwireGlobals
} from "../../../src/shared/moduleLoader";

/**
 * The module loader is what the browser page and the worker use to run the bundled test modules: a
 * define registry the bundle fills, a require that instantiates factories on demand, and the helpers
 * that turn the loaded entries into a suite tree.
 */
describe("shared module loader", () => {
    const ctx: ILoaderContext = {
        global: { kind: "global" },
        globalThis: { kind: "globalThis" },
        window: { kind: "window" },
        self: { kind: "self" }
    };

    describe("installDefineRegistry", () => {
        it("installs the registry and the define function once", () => {
            const scope: any = {};

            const registry = installDefineRegistry(scope);
            assert.equal(registry, scope.__tripwireModules__);
            assert.isFunction(scope.__tripwireDefine__);

            const define = scope.__tripwireDefine__;
            assert.equal(installDefineRegistry(scope), registry, "a second install reuses the registry");
            assert.equal(scope.__tripwireDefine__, define, "and the define function");

            const factory = () => {};
            scope.__tripwireDefine__("a", factory);
            assert.equal(registry["a"], factory);
        });
    });

    describe("createRequire", () => {
        it("instantiates a factory once and hands it the loader context", () => {
            let calls = 0;
            let received: any[] = [];
            const factories: Record<string, Function> = {
                "lib/a.js": function (...args: any[]) {
                    calls++;
                    received = args;
                    args[1].exports = { answer: 42 };
                }
            };

            const req = createRequire(factories, ctx);
            const first = req("lib/a.js");
            const second = req("lib/a.js");

            assert.deepEqual(first, { answer: 42 });
            assert.equal(first, second, "the module is cached");
            assert.equal(calls, 1);

            // (require, module, exports, global, globalThis, window, self, process, id, dirname)
            assert.equal(received[0], req);
            assert.equal(received[1].id, "lib/a.js");
            assert.equal(received[3], ctx.global);
            assert.equal(received[4], ctx.globalThis);
            assert.equal(received[5], ctx.window);
            assert.equal(received[6], ctx.self);
            assert.equal(received[8], "lib/a.js");
            assert.equal(received[9], "lib", "the dirname is the id's folder");
        });

        it("resolves nested requires between factories and uses / for a root level id", () => {
            const factories: Record<string, Function> = {
                "b.js": function (require: any, module: any, exports: any, g: any, gt: any, w: any, s: any, process: any, id: string, dirname: string) {
                    exports.dirname = dirname;
                    exports.fromA = require("lib/a.js").value;
                },
                "lib/a.js": function (require: any, module: any) {
                    module.exports = { value: "A" };
                }
            };

            const result = createRequire(factories, ctx)("b.js");

            assert.equal(result.fromA, "A");
            assert.equal(result.dirname, "/");
        });

        it("throws for an id that was never defined", () => {
            const req = createRequire({}, ctx);

            assert.throws(() => req("missing.js"), "Module not found in registry: missing.js");
        });

        it("rejects inherited ids and non-function factories with a TripwireError", () => {
            let inheritedError: any;
            try {
                createRequire({}, ctx)("constructor");
            } catch (e) {
                inheritedError = e;
            }

            assert.isInstanceOf(inheritedError, tripwire.TripwireError);
            assert.equal(inheritedError.message, "Module not found in registry: constructor");

            let invalidFactoryError: any;
            try {
                createRequire({ "invalid.js": 42 } as any, ctx)("invalid.js");
            } catch (e) {
                invalidFactoryError = e;
            }

            assert.isInstanceOf(invalidFactoryError, tripwire.TripwireError);
            assert.equal(invalidFactoryError.message, "Invalid module factory in registry: invalid.js");
        });

        it("supplies a process shim that behaves like a colour capable terminal", async () => {
            let shim: any = null;
            const req = createRequire({
                "p.js": function (require: any, module: any, exports: any, g: any, gt: any, w: any, s: any, process: any) {
                    shim = process;
                }
            }, ctx);
            req("p.js");

            assert.equal(shim.env.FORCE_COLOR, "1");
            assert.equal(shim.platform, "linux");
            assert.equal(shim.cwd(), "/");
            assert.deepEqual(shim.argv, []);

            let ticked = false;
            shim.nextTick(() => {
                ticked = true;
            });
            assert.isFalse(ticked, "nextTick is asynchronous");
            await Promise.resolve();
            await Promise.resolve();
            assert.isTrue(ticked);
        });
    });

    describe("loader contexts", () => {
        it("describes the browser globals", () => {
            const browser = getBrowserLoaderContext();

            assert.equal(browser.global, globalThis);
            assert.equal(browser.globalThis, globalThis);
            assert.equal(browser.window, (globalThis as any).window);
            assert.equal(browser.self, (globalThis as any).self);
        });
    });

    describe("setTripwireGlobals", () => {
        it("copies every suite, test, hook and assertion name onto the target", () => {
            const target: any = {};

            setTripwireGlobals(tripwire, target);

            ["describe", "suite", "xdescribe", "fdescribe", "it", "spec", "test", "xit", "fit",
                "before", "beforeAll", "beforeEach", "after", "afterAll", "afterEach", "assert", "expect"].forEach((name) => {
                assert.equal(target[name], (tripwire as any)[name], name);
            });
        });
    });

    describe("applyTestSettings", () => {
        it("applies the given settings to every test in the tree and leaves the others alone", () => {
            const suite = tripwire.createSuite();
            tripwire.useSuite(suite, () => {
                tripwire.describe("outer", () => {
                    tripwire.it("a", () => {});
                    tripwire.describe("inner", () => {
                        tripwire.it("b", () => {});
                    });
                });
            });

            applyTestSettings(suite, { timeout: 123, retries: 2 });

            const a = suite.suites[0].tests[0];
            const b = suite.suites[0].suites[0].tests[0];
            assert.equal(a.timeout, 123);
            assert.equal(b.timeout, 123);
            assert.equal(a.retries, 2);
            assert.isUndefined(a.slow, "an unset setting is not applied");

            applyTestSettings(suite, { slow: 5 });
            assert.equal(b.slow, 5);
            assert.equal(b.timeout, 123, "earlier settings survive");
        });

        it("tolerates a missing suite and nodes without test or suite arrays", () => {
            applyTestSettings(null, { timeout: 1 });
            applyTestSettings({}, { timeout: 1 });
        });
    });

    describe("buildSuite", () => {
        it("loads the entry modules into a fresh suite and applies the settings", async () => {
            const factories: Record<string, Function> = {
                "test/one.test.js": function () {
                    tripwire.describe("one", () => {
                        tripwire.it("passes", () => {});
                    });
                },
                "test/two.test.js": function () {
                    tripwire.describe("two", () => {
                        tripwire.it("also passes", () => {});
                    });
                }
            };
            const req = createRequire(factories, ctx);

            const suite = await buildSuite(tripwire, req, { entryIds: ["test/one.test.js", "test/two.test.js"] }, { timeout: 250 });

            assert.equal(suite.suites.length, 2);
            assert.equal(suite.suites[0].description, "one");
            assert.equal(suite.suites[1].description, "two");
            assert.equal(suite.suites[1].tests[0].timeout, 250);
        });

        it("builds an empty suite for a payload without entries and skips the settings pass", async () => {
            const suite = await buildSuite(tripwire, createRequire({}, ctx), {}, {});

            assert.equal(suite.suites.length, 0);
            assert.equal(suite.tests.length, 0);
        });
    });
});
