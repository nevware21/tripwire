/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "../../../src/assert/assertClass";

export function assertStatusResponse(statusCode: number, contentType: string | null, body: any): void {
    assert.equal(statusCode, 200, "Validate that /api/status returns HTTP 200");
    assert.equal(contentType, "application/json; charset=utf-8", "Validate that /api/status returns JSON content");
    assert.deepEqual(body, {
        status: "running"
    }, "Validate that /api/status returns the running status payload");
}