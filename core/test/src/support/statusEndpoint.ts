/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "../../../src/assert/assertClass";

/**
 * Whether this page or worker was loaded by tripwire's own browser runner, whose server answers
 * `/api/status` on the same origin. The browser and worker suites also run under other runners -- the
 * benchmark's karma arms load these same folders -- where nothing answers that path, so the tests that
 * fetch it skip there rather than fail.
 *
 * The marker is the module registry tripwire's runner installs before any test module loads:
 * `__tripwireDefine__`, on the test frame's window (frame.html) or on the worker's global scope.
 */
export function isServedByTripwire(): boolean {
    return typeof (globalThis as any).__tripwireDefine__ === "function";
}

export function assertStatusResponse(statusCode: number, contentType: string | null, body: any): void {
    assert.equal(statusCode, 200, "Validate that /api/status returns HTTP 200");
    assert.equal(contentType, "application/json; charset=utf-8", "Validate that /api/status returns JSON content");
    assert.deepEqual(body, {
        status: "running"
    }, "Validate that /api/status returns the running status payload");
}