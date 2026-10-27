/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import * as tripwire from "@nevware21/tripwire";
import { assert } from "@nevware21/tripwire";
import { startWorkerRunner } from "../../../src/client/workerRunner";

/**
 * The script the worker target runs inside its web worker: it loads the bundled test modules, runs them
 * with tripwire, and posts its progress and results back to the page. Here it runs on node with the
 * worker's global, script loading and messages stood in for, and the real tripwire as the runtime.
 */
describe("client worker runner", function () {
    this.timeout(30000);

    const g = globalThis as any;
    let messages: any[];
    let scripts: { [url: string]: () => void };

    // The modules the page would serve: tripwire itself, and a test module using it
    function defineModules(scope: any): void {
        scripts = {
            "/tripwire.js": () => scope.__tripwireDefine__("/tripwire", (_require: any, module: any) => {
                module.exports = tripwire;
            }),
            "/test/a.js": () => scope.__tripwireDefine__("/test/a", (require: any) => {
                const tw = require("/tripwire");
                tw.describe("worker suite", () => {
                    tw.it("passes", () => {
                        tw.assert.equal(1, 1);
                    });
                    tw.it("fails", () => {
                        tw.assert.equal(1, 2);
                    });
                });
            }),
            "/test/failFirst.js": () => scope.__tripwireDefine__("/test/failFirst", (require: any) => {
                const tw = require("/tripwire");
                tw.describe("fails first", () => {
                    tw.it("fails", () => {
                        tw.assert.equal(1, 2);
                    });
                    tw.it("would pass", () => {
                        tw.assert.equal(1, 1);
                    });
                });
            }),
            "/src/extra.js": () => scope.__tripwireDefine__("/src/extra", (_require: any, module: any) => {
                module.exports = "only loaded for coverage";
            }),
            "/broken.js": () => {
                throw new Error("unexpected token");
            }
        };
    }

    function payload(extra?: any): any {
        return Object.assign({
            moduleUrls: { tripwire: "/tripwire.js", a: "/test/a.js", extra: "/src/extra.js" },
            tripwireModuleId: "/tripwire",
            entryIds: [ "/test/a" ],
            coverageOnlyIds: [ "/src/extra", "/not-in-the-bundle" ],
            settings: { reporter: [ "dot" ] }
        }, extra || {});
    }

    // Sends one message to a freshly started worker runner and collects what it posts back. The
    // runner bridges the console into its messages for good, so the console is put back afterwards.
    async function post(data: any): Promise<any[]> {
        const scope: any = {
            postMessage: (msg: any) => messages.push(msg)
        };
        const orgConsole = { log: console.log, info: console.info, warn: console.warn, error: console.error };

        g.self = scope;
        g.importScripts = (url: string) => {
            if (!scripts[url]) {
                throw new Error("404 " + url);
            }

            scripts[url]();
        };

        try {
            defineModules(scope);
            startWorkerRunner();
            await scope.onmessage({ data: data });
        } finally {
            console.log = orgConsole.log;
            console.info = orgConsole.info;
            console.warn = orgConsole.warn;
            console.error = orgConsole.error;
            delete g.self;
            delete g.importScripts;
        }

        return messages;
    }

    function ofKind(kind: string): any[] {
        return messages.filter((msg) => msg.kind === kind);
    }

    beforeEach(() => {
        messages = [];
    });

    it("runs the test modules and posts the summary", async () => {
        await post({ payload: payload(), autoFinish: true });

        const result = messages[messages.length - 1];
        assert.equal(result.summary.total, 2);
        assert.equal(result.summary.passed, 1);
        assert.equal(result.summary.failed, 1);
        assert.isNull(result.coverage);
        assert.equal(ofKind("testStart").length, 0, "no progress for a run that finishes on its own");
    });

    it("posts each suite, test and assertion as it runs for the interactive page", async () => {
        await post({ payload: payload() });

        assert.deepEqual(ofKind("suiteStart").map((msg) => msg.suiteParts), [ [ "worker suite" ] ]);
        assert.deepEqual(ofKind("testStart").map((msg) => msg.testName), [ "passes", "fails" ]);
        assert.deepEqual(ofKind("testDone").map((msg) => [ msg.testName, msg.endStatus ]), [ [ "passes", "passed" ], [ "fails", "failed" ] ]);
        assert.equal(ofKind("suiteDone").length, 1);

        const asserts = ofKind("assert");
        assert.isTrue(asserts.length >= 2);
        assert.isTrue(asserts[0].passed);
        assert.equal(asserts[0].testName, "passes");
        const failed = asserts.filter((msg) => !msg.passed)[0];
        assert.equal(failed.testName, "fails");
        assert.includes(failed.errorText, "expected 1 to equal 2");
    });

    it("sends the reporter's console output to the page", async () => {
        await post({ payload: payload({ settings: { reporter: [ "spec" ], slow: 10, trace: true } }), autoFinish: true });

        const logged = ofKind("log").map((msg) => msg.message).join("\n");
        assert.includes(logged, "worker suite");
        assert.includes(logged, "passes");
    });

    it("stops at the first failure with bail", async () => {
        const failFirst = { moduleUrls: { tripwire: "/tripwire.js", failFirst: "/test/failFirst.js" }, entryIds: [ "/test/failFirst" ] };

        await post({ payload: payload(Object.assign({ settings: { reporter: [ "dot" ] } }, failFirst)), autoFinish: true });
        assert.equal(messages[messages.length - 1].summary.passed, 1, "without bail the second test runs");

        messages = [];
        await post({ payload: payload(Object.assign({ settings: { bail: true, reporter: [ "dot" ] } }, failFirst)), autoFinish: true });
        const result = messages[messages.length - 1];
        assert.equal(result.summary.failed, 1);
        assert.equal(result.summary.passed, 0, "nothing runs after the failure");
    });

    it("only runs the test the page selected, with the run's timeout", async () => {
        await post({ payload: payload({ settings: { timeout: 1234, reporter: [ "dot" ] } }), selection: { testTitle: "worker suite > passes" }, autoFinish: true });

        const result = messages[messages.length - 1];
        assert.equal(result.summary.passed, 1);
        assert.equal(result.summary.failed, 0);
    });

    it("posts the error when the run cannot start", async () => {
        await post({ payload: payload({ tripwireModuleId: "/not-defined" }), autoFinish: true });

        assert.includes(messages[messages.length - 1].error, "Module not found in registry: /not-defined");
    });

    it("posts the module scripts that failed to load", async () => {
        await post({ payload: payload({ moduleUrls: { tripwire: "/tripwire.js", broken: "/broken.js", gone: "/gone.js" } }) });

        const error = messages[messages.length - 1].error;
        assert.includes(error, "Failed to load 2 worker module script(s): /broken.js (unexpected token), /gone.js (404 /gone.js)");
    });

    describe("discover", () => {
        it("posts the suites and tests the modules declare", async () => {
            await post({ kind: "discover", payload: payload() });

            const discovery = ofKind("discovery")[0];
            assert.isUndefined(discovery.error);
            assert.includes(JSON.stringify(discovery.discovery), "worker suite");
            assert.includes(JSON.stringify(discovery.discovery), "fails");
        });

        it("posts an empty discovery with the error when the modules cannot be loaded", async () => {
            await post({ kind: "discover", payload: payload({ entryIds: [ "/not-defined" ] }) });

            const discovery = ofKind("discovery")[0];
            assert.includes(discovery.error, "Module not found in registry: /not-defined");
            assert.isObject(discovery.discovery);
        });
    });
});
