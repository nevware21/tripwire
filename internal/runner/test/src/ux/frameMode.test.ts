/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import * as tripwire from "@nevware21/tripwire";
import { assert } from "@nevware21/tripwire";
import { installDefineRegistry } from "../../../src/shared/moduleLoader";
import { uxDom } from "../support/uxDom";

/**
 * The test frame: the page the interactive runner loads in an iframe to run the browser target's tests.
 * It fetches the run payload, reports the suites it finds to the page above it, runs them when asked,
 * and streams their progress back in batches. Here its window, `fetch` and parent are stood in for,
 * and the real tripwire runs the tests.
 */

uxDom();
// eslint-disable-next-line @typescript-eslint/no-var-requires
const frameMode: typeof import("../../../src/ux/browser/ui/frame-mode") = require("../../../src/ux/browser/ui/frame-mode");

describe("ux frame mode", function () {
    this.timeout(30000);

    const g = globalThis as any;
    const saved: { [name: string]: any } = {};
    let posted: any[];
    let listeners: { [type: string]: (evt: any) => void };
    let frameWindow: any;
    let orgConsole: { [level: string]: any };

    const PAYLOAD = {
        tripwireModuleId: "/tripwire",
        entryIds: [ "/test/a" ],
        coverageOnlyIds: [ "/src/extra", "/not-in-the-bundle" ],
        settings: { reporter: [ "dot" ] }
    };

    // The page's modules, as the frame's bundle would have defined them
    function defineModules(win: any): void {
        installDefineRegistry(win);
        win.__tripwireDefine__("/tripwire", (_require: any, module: any) => {
            module.exports = tripwire;
        });
        win.__tripwireDefine__("/test/a", (require: any) => {
            const tw = require("/tripwire");
            tw.describe("frame suite", () => {
                tw.it("passes", () => {
                    tw.assert.equal(1, 1);
                });
                tw.it("fails", () => {
                    tw.assert.equal(1, 2);
                });
            });
        });
        win.__tripwireDefine__("/test/failFirst", (require: any) => {
            const tw = require("/tripwire");
            tw.describe("fails first", () => {
                tw.it("fails", () => {
                    tw.assert.equal(1, 2);
                });
                tw.it("would pass", () => {
                    tw.assert.equal(1, 1);
                });
            });
        });
        win.__tripwireDefine__("/src/extra", (_require: any, module: any) => {
            module.exports = "loaded for coverage";
        });
    }

    async function waitFor(kind: string): Promise<any> {
        for (let lp = 0; lp < 500; lp++) {
            const found = posted.filter((msg) => msg.kind === kind)[0];
            if (found) {
                return found;
            }

            await new Promise((resolve) => setTimeout(resolve, 5));
        }

        throw new Error("the frame never posted " + kind + ": " + JSON.stringify(posted.map((msg) => msg.kind)));
    }

    function lifecycle(): any[] {
        const events: any[] = [];
        posted.filter((msg) => msg.kind === "lifecycleBatch").forEach((msg) => events.push(...msg.events));

        return events;
    }

    async function initialize(payload: any, fetchError?: Error): Promise<void> {
        g.fetch = (url: string) => {
            if (url !== "http://localhost:4321/api/payload-browser") {
                return Promise.reject(new Error("unexpected fetch " + url));
            }

            return fetchError ? Promise.reject(fetchError) : Promise.resolve({ json: () => Promise.resolve(payload) });
        };

        await frameMode.frameInitialize();
    }

    beforeEach(() => {
        posted = [];
        listeners = {};
        [ "window", "fetch", "location" ].forEach((name) => {
            saved[name] = g[name];
        });

        frameWindow = {
            parent: { postMessage: (msg: any, origin: string) => posted.push(Object.assign({ origin: origin }, msg)) },
            addEventListener: (type: string, fn: (evt: any) => void) => {
                listeners[type] = fn;
            }
        };
        defineModules(frameWindow);
        g.window = frameWindow;
        g.location = { href: "http://localhost:4321/__tripwire__/test-frame" };

        // The frame sends the console to the page for good
        orgConsole = { log: console.log, info: console.info, warn: console.warn, error: console.error };
    });

    afterEach(() => {
        Object.keys(orgConsole).forEach((level) => {
            (console as any)[level] = orgConsole[level];
        });
        Object.keys(saved).forEach((name) => {
            if (saved[name] === undefined) {
                delete g[name];
            } else {
                g[name] = saved[name];
            }
        });
    });

    it("tells the page it is ready, with the suites and tests it found", async () => {
        await initialize(PAYLOAD);

        const ready = posted[0];
        assert.equal(ready.kind, "ready");
        assert.equal(ready.origin, "*");
        assert.includes(JSON.stringify(ready.discovery), "frame suite");
        assert.includes(JSON.stringify(ready.discovery), "fails");
        assert.isFunction(listeners.message);
    });

    it("runs the tests when asked, streaming their progress and then the results", async () => {
        await initialize(PAYLOAD);
        frameWindow.__coverage__ = { "a.js": {} };

        listeners.message({ data: { kind: "run", selection: {} } });
        const done = await waitFor("runDone");

        assert.equal(done.summary.total, 2);
        assert.equal(done.summary.passed, 1);
        assert.equal(done.summary.failed, 1);
        assert.deepEqual(done.coverage, { "a.js": {} });

        const events = lifecycle();
        assert.deepEqual(events.filter((evt) => evt.kind === "testStart").map((evt) => evt.testName), [ "passes", "fails" ]);
        assert.deepEqual(events.filter((evt) => evt.kind === "testDone").map((evt) => [ evt.testName, evt.endStatus ]), [ [ "passes", "passed" ], [ "fails", "failed" ] ]);
        assert.includes(events.filter((evt) => evt.kind === "testDone")[1].endErrorText, "expected 1 to equal 2");
        assert.isTrue(events.filter((evt) => evt.kind === "suiteStart").length >= 1);
        assert.isTrue(events.filter((evt) => evt.kind === "suiteDone").length >= 1);

        const asserts = events.filter((evt) => evt.kind === "assert");
        assert.isTrue(asserts[0].passed);
        const failed = asserts.filter((evt) => !evt.passed)[0];
        assert.includes(failed.errorText, "expected 1 to equal 2");
        assert.equal(failed.expected, "2", "the values go with the failure, for the page to show");
        assert.equal(failed.actual, "1");
        assert.isFalse("expected" in asserts[0], "a pass has none");
    });

    it("sends the reporter's console output to the page", async () => {
        await initialize(Object.assign({}, PAYLOAD, { settings: { reporter: [ "spec" ], slow: 10, trace: true } }));

        listeners.message({ data: { kind: "run" } });
        await waitFor("runDone");

        const logged = posted.filter((msg) => msg.kind === "log").map((msg) => msg.message).join("\n");
        assert.includes(logged, "frame suite");
    });

    it("runs only the selected test", async () => {
        await initialize(PAYLOAD);

        listeners.message({ data: { kind: "run", selection: { testTitle: "frame suite > passes" } } });
        const done = await waitFor("runDone");

        assert.equal(done.summary.passed, 1);
        assert.equal(done.summary.failed, 0);
    });

    it("stops at the first failure with bail", async () => {
        await initialize(Object.assign({}, PAYLOAD, { entryIds: [ "/test/failFirst" ], settings: { reporter: [ "dot" ], bail: true } }));

        listeners.message({ data: { kind: "run" } });
        const done = await waitFor("runDone");

        assert.equal(done.summary.failed, 1);
        assert.equal(done.summary.passed, 0, "nothing runs after the failure");
    });

    it("stops a run the page asks it to stop", async () => {
        await initialize(PAYLOAD);

        listeners.message({ data: { kind: "run" } });
        listeners.message({ data: { kind: "stop" } });
        const done = await waitFor("runDone");

        assert.equal(done.summary.passed, 0, "nothing ran once stopped");
    });

    it("ignores a message that is not for it", async () => {
        await initialize(PAYLOAD);

        listeners.message({ data: null });
        listeners.message({ data: { other: true } });

        assert.deepEqual(posted.map((msg) => msg.kind), [ "ready" ]);
    });

    it("reports a payload it cannot fetch", async () => {
        await initialize(PAYLOAD, new Error("connection refused"));

        assert.equal(posted[0].kind, "runError");
        assert.includes(posted[0].error, "connection refused");
    });

    it("reports the module scripts that failed to load, before or during a run", async () => {
        frameWindow.__tripwireModuleLoadErrors__ = [ "/test/broken.js" ];
        await initialize(PAYLOAD);
        assert.includes(posted[0].error, "Failed to load 1 module script(s): /test/broken.js");

        posted = [];
        delete frameWindow.__tripwireModuleLoadErrors__;
        await initialize(PAYLOAD);
        frameWindow.__tripwireModuleLoadErrors__ = [ "/test/late.js" ];
        listeners.message({ data: { kind: "run" } });

        assert.includes((await waitFor("runError")).error, "Failed to load 1 module script(s): /test/late.js");
    });
});
