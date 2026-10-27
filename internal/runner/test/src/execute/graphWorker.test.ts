/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { assert } from "@nevware21/tripwire";
import { _startGraphWorker } from "../../../src/execute/graphWorker";
import { _isUserError, _userErrorHints } from "../../../src/internal/userError";

/**
 * Building the browser and worker module graph on a worker thread. The thread loads the runner's own
 * bundle and calls its graph entry point; here a stand-in bundle answers in each of the ways the real
 * one can.
 */
describe("execute graphWorker", function () {
    // Each case starts a worker thread
    this.timeout(30000);

    let scratch: string;

    // A stand-in for the runner bundle, whose graph entry runs the given body on the worker thread
    function bin(body: string): string {
        const file = path.join(scratch, "bin-" + Math.random().toString(36).substring(2) + ".js");
        fs.writeFileSync(file, [
            "const { parentPort, workerData } = require(\"worker_threads\");",
            "exports._graphWorkerEntry = function () {",
            body,
            "};"
        ].join("\n"), "utf8");

        return file;
    }

    async function rejection(promise: Promise<any>): Promise<any> {
        try {
            await promise;
        } catch (e) {
            return e;
        }

        throw new Error("expected the graph worker to fail");
    }

    beforeEach(() => {
        scratch = fs.mkdtempSync(path.join(os.tmpdir(), "tripwire-graph-worker-"));
    });

    afterEach(() => {
        fs.rmSync(scratch, { recursive: true, force: true });
    });

    it("stays on the main thread unless the graph thread is asked for and a bundle is given", () => {
        const entry = bin("parentPort.postMessage({ ok: true, graph: {} });");

        assert.isNull(_startGraphWorker([], scratch, null, false, entry));
        assert.isNull(_startGraphWorker([], scratch, {}, false, entry));
        assert.isNull(_startGraphWorker([], scratch, { graphThread: false }, false, entry));
        assert.isNull(_startGraphWorker([], scratch, { graphThread: true }, false, ""));
    });

    it("stays on the main thread when the run options cannot be sent to a thread", () => {
        const entry = bin("parentPort.postMessage({ ok: true, graph: {} });");

        assert.isNull(_startGraphWorker([], scratch, { graphThread: true, notCloneable: () => 1 }, false, entry));
    });

    it("resolves with the graph the thread builds from the files and options it was given", async () => {
        const entry = bin("parentPort.postMessage({ ok: true, graph: { modules: {}, entryIds: workerData.entryFiles, echo: [ workerData.cwd, workerData.typeCheck, workerData.parsed.target ] } });");

        const graph: any = await _startGraphWorker([ "a.test.ts", "b.test.ts" ], scratch, { graphThread: true, target: "worker" }, true, entry);

        assert.deepEqual(graph.entryIds, [ "a.test.ts", "b.test.ts" ]);
        assert.deepEqual(graph.echo, [ scratch, true, "worker" ]);
    });

    it("rejects with the thread's user error, keeping its stack and hints", async () => {
        const entry = bin("parentPort.postMessage({ ok: false, message: \"TypeScript compile failed\", stack: \"Error: TypeScript compile failed\\n    at thread\", user: true, hints: [ \"fix it\" ] });");

        const failure = await rejection(_startGraphWorker([], scratch, { graphThread: true }, false, entry));

        assert.equal(failure.message, "TypeScript compile failed");
        assert.equal(failure.stack, "Error: TypeScript compile failed\n    at thread");
        assert.isTrue(_isUserError(failure));
        assert.deepEqual(_userErrorHints(failure), [ "fix it" ]);
    });

    it("rejects with a plain error when the thread's failure has no details", async () => {
        const noMessage = await rejection(_startGraphWorker([], scratch, { graphThread: true }, false, bin("parentPort.postMessage({ ok: false });")));
        const noGraph = await rejection(_startGraphWorker([], scratch, { graphThread: true }, false, bin("parentPort.postMessage({ ok: true });")));
        const nothing = await rejection(_startGraphWorker([], scratch, { graphThread: true }, false, bin("parentPort.postMessage(null);")));

        [ noMessage, noGraph, nothing ].forEach((failure) => {
            assert.equal(failure.message, "the module graph build failed");
            assert.isFalse(_isUserError(failure));
        });
    });

    it("rejects with the error thrown on the thread", async () => {
        const failure = await rejection(_startGraphWorker([], scratch, { graphThread: true }, false, bin("throw new Error(\"graph exploded\");")));

        assert.equal(failure.message, "graph exploded");
    });

    it("rejects when the thread exits without answering", async () => {
        const failure = await rejection(_startGraphWorker([], scratch, { graphThread: true }, false, bin("process.exit(3);")));

        assert.equal(failure.message, "the module graph worker exited with code 3");
    });
});
