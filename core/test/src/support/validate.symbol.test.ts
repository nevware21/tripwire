/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2025 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { getKnownSymbol } from "@nevware21/ts-utils";
import { WellKnownSymbols } from "@nevware21/ts-utils";
import { assert } from "../../../src/assert/assertClass";

// Define the test suite
describe("symbol check", () => {

    // Test case: null object
    it("Should fail for null object", () => {
        const knownIterator = getKnownSymbol(WellKnownSymbols.iterator);

        assert.strictEqual(knownIterator, Symbol.iterator);
    });
});