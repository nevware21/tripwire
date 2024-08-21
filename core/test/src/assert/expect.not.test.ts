/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { expect } from "../../../src/assert/expect";
import { checkError } from "../support/checkError";

describe("expect.not", () => {

    it ("examples", () => {
        checkError(() => {
            expect(true).not.ok(); // Fails
        }, "not expected true to be truthy");

        expect(false).not.ok(); // Passes
        expect(true).not.not.ok(); // Passes

        checkError(() => {
            expect(false).not.not.ok(); // Fails
        }, "not not expected false to be truthy");
    });
});