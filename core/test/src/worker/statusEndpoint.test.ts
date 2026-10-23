/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "../../../src/assert/assertClass";
import { ITestContext } from "../../../src/interfaces/suite/ITestContext";
import { assertStatusResponse, isServedByTripwire } from "../support/statusEndpoint";

describe("/api/status server endpoint", () => {
    it("returns running status from the worker server", async function (this: ITestContext) {
        if (!isServedByTripwire()) {
            // Another runner's worker, with nothing serving /api/status (see isServedByTripwire)
            this.skip();
        }

        const response = await fetch("/api/status");
        const body = await response.json();

        assert.equal(typeof response.status, "number", "Validate that fetch returned a numeric status code");
        assertStatusResponse(response.status, response.headers.get("content-type"), body);
    });
});