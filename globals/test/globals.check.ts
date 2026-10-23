/*
 * @nevware21/tripwire-globals
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

// Compile-only check (`npm run check`) for the two things this package promises:
//   1. importing it makes the bare global names resolve and type-check, and
//   2. the same names are importable as locals.
// Nothing here is executed -- tsconfig.json sets "noEmit", and "types": [] keeps any @types
// package out of the program so the declarations are checked on their own.

import {
    describe as localDescribe, it as localIt, before as localBefore, beforeEach as localBeforeEach,
    after as localAfter, afterEach as localAfterEach, assert as localAssert, expect as localExpect
} from "../index";

// 1. Ambient globals -- no import required for these names.
describe("ambient globals", () => {
    before(() => {
        // noop
    });

    beforeEach(() => {
        // noop
    });

    it("resolves describe/it/hooks/assert/expect", () => {
        assert.equal(1, 1);
        expect(1).equal(1);
    });

    xit("resolves the skip/focus aliases", () => {
        // noop
    });

    afterEach(() => {
        // noop
    });

    after(() => {
        // noop
    });
});

suite("tdd aliases", () => {
    test("resolves suite/test/spec", () => {
        assert.isTrue(true);
    });
});

// 2. The same names as local imports.
localDescribe("local imports", () => {
    localBefore(() => {
        // noop
    });

    localBeforeEach(() => {
        // noop
    });

    localIt("resolves the imported names", () => {
        localAssert.equal(1, 1);
        localExpect(1).equal(1);
    });

    localAfterEach(() => {
        // noop
    });

    localAfter(() => {
        // noop
    });
});
