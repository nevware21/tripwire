/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { getGlobal } from "@nevware21/ts-utils";
import { assert } from "../../../src/assert/assertClass";
import { _generateId, _resetIdGenerator } from "../../../src/suite/idGenerator";

// The generator keeps the ids it has handed out on a slot shared through the global object, keyed by the
// candidate string each id was derived from. Seeding that slot is the only way to stage a hash collision.
const SLOT_KEY = "__nevware21_tripwire_idGeneratorSlot__";

function seenIds(): { [id: string]: string } {
    return (getGlobal() as any)[SLOT_KEY].seenIds;
}

describe("idGenerator hash collisions", () => {
    beforeEach(() => {
        _resetIdGenerator();
    });

    afterEach(() => {
        _resetIdGenerator();
    });

    it("should hand out the same id for the same candidate", () => {
        const first = _generateId("collide", "parent");
        const second = _generateId("collide", "parent");

        assert.equal(first, second);
        assert.equal(seenIds()[first], "parent>collide");
    });

    it("should move to the retry namespace when another candidate already owns the hash", () => {
        const natural = _generateId("collide", "parent");
        _resetIdGenerator();

        // Pretend a different candidate string produced exactly this hash earlier in the run
        seenIds()[natural] = "some other path";

        const salted = _generateId("collide", "parent");
        assert.notEqual(salted, natural, "the colliding id is not reused");
        assert.equal(seenIds()[salted], "parent>collide#-1", "the first retry candidate is used");
        assert.equal(seenIds()[natural], "some other path", "the earlier owner keeps its id");

        assert.equal(_generateId("collide", "parent"), salted, "asking again yields the same salted id");
    });

    it("should keep retrying while the salted candidates collide too", () => {
        const natural = _generateId("collide");
        _resetIdGenerator();
        const firstRetry = _generateId("collide#-1");
        _resetIdGenerator();

        seenIds()[natural] = "other";
        seenIds()[firstRetry] = "yet another";

        const salted = _generateId("collide");
        assert.notEqual(salted, natural);
        assert.notEqual(salted, firstRetry);
        assert.equal(seenIds()[salted], "collide#-2");
    });

    it("should never let a retry candidate masquerade as a genuine second occurrence", () => {
        const base = _generateId("dup", "p");
        const second = _generateId("dup", "p", 1);

        assert.notEqual(base, second);
        assert.equal(seenIds()[second], "p>dup#1");
    });
});
