/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { getGlobal } from "@nevware21/ts-utils";
import { ITestSuite } from "./interfaces/ITestSuite";

/**
 * Simple hash function for generating deterministic IDs from strings
 * Based on DJB2 hash algorithm
 * @internal
 */
function _simpleHash(str: string): number {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) + str.charCodeAt(i); // hash * 33 + c
    }
    return hash >>> 0; // Convert to unsigned 32-bit integer
}

/**
 * Maps every ID handed out since the last {@link _resetIdGenerator} call back to the candidate
 * string that produced it, so a genuine hash collision between two *different* candidates -- 32-bit
 * DJB2 hash, so collisions are rare but not impossible -- can be detected and resolved.
 *
 * This is the only state the generator keeps, and it never changes the ID of a non-colliding
 * input: an ID is otherwise a pure function of (parent ID, description, occurrence). It lives on
 * the global object so that multiple copies of the library loaded into one process (eg. via
 * differing package resolution paths) share one collision table rather than each handing out
 * IDs the others have already used.
 * @internal
 */
interface IIdGeneratorSlot {
    seenIds: { [id: string]: string };
}

const _gblSlotKey = "__nevware21_tripwire_idGeneratorSlot__";

function _gblSlot(): IIdGeneratorSlot {
    const g: any = getGlobal() || {};
    let slot: IIdGeneratorSlot = g[_gblSlotKey];
    if (!slot || !slot.seenIds) {
        slot = { seenIds: {} };
        g[_gblSlotKey] = slot;
    }

    return slot;
}

/**
 * Clears the hash-collision bookkeeping. Called by `resetSuite()` so a rebuilt tree starts from a
 * clean table; it has no effect on the ID any non-colliding input produces.
 * @internal
 */
export function _resetIdGenerator(): void {
    _gblSlot().seenIds = {};
}

/**
 * Returns the occurrence index a new child named `description` takes under `parent`: the number
 * of the parent's existing direct children -- suites and tests, which share one ID namespace --
 * that already carry the same description. A root (no parent) is always occurrence 0.
 *
 * Counting the parent's actual children, rather than consulting a process-wide occurrence table,
 * is what makes an ID a pure function of the tree it belongs to. The same shape produces the same
 * IDs whether it is declared under the ambient root, under a `createSuite()` root, or across
 * several `useSuite()` calls against one root, and two same-named siblings can never share an ID.
 * A shared table keyed by the parent's ID *string* could not offer either guarantee: every root
 * has the same ID, so it could not tell two trees apart, and swapping the table out per isolated
 * tree (the previous approach) made two same-named suites declared under one root in separate
 * `useSuite()` calls both occurrence 0 -- and therefore the same ID.
 *
 * Call this *before* the new child is pushed into the parent, so it does not count itself.
 * @param parent - The suite the new child is being added to, or undefined for a root
 * @param description - The new child's description
 * @returns The zero-based index among same-named siblings
 * @internal
 */
export function _childOccurrence(parent: ITestSuite | undefined, description: string): number {
    let count = 0;

    if (parent) {
        const suites = parent.suites;
        const tests = parent.tests;

        for (let lp = 0; suites && lp < suites.length; lp++) {
            if (suites[lp].description === description) {
                count++;
            }
        }

        for (let lp = 0; tests && lp < tests.length; lp++) {
            if (tests[lp].description === description) {
                count++;
            }
        }
    }

    return count;
}

/**
 * Generate a deterministic ID for a suite or test.
 *
 * The ID is a hash of the full path -- the parent's ID and the description -- plus, when the
 * occurrence index is above zero, a `#<occurrence>` suffix. The first occurrence of a given full
 * path uses the un-suffixed path (so IDs for the overwhelmingly common non-duplicated case are
 * unaffected); the second same-named sibling under one parent -- eg. two different files each
 * declaring `describe("Utils")` under the same shared root -- gets `#1`, the third `#2`, and so on,
 * so each has its own distinct ID instead of colliding on a single shared one.
 *
 * Given the same three inputs the result is always the same; nothing about the order in which
 * other, unrelated suites or tests were created can change it (short of a genuine 32-bit hash
 * collision, which is resolved with a separate `#-N` retry namespace). Callers obtain the
 * occurrence index from {@link _childOccurrence}.
 * @param description - The description of the suite or test
 * @param parentId - The ID of the parent suite (if any)
 * @param occurrence - Zero-based index among same-named siblings under the same parent; defaults to 0
 * @returns A deterministic string ID
 * @internal
 */
export function _generateId(description: string, parentId?: string, occurrence?: number): string {
    const fullPath = parentId ? `${parentId}>${description}` : description;
    const slot = _gblSlot();

    let candidate = occurrence > 0 ? `${fullPath}#${occurrence}` : fullPath;
    let id = _simpleHash(candidate).toString(16);

    // Resolve the rare case where two different candidate strings hash to the same 32-bit value.
    // Retries use a "#-N" suffix -- occurrence indices above are always >= 1, so "#-1", "#-2", ...
    // can never equal a legitimate occurrence-disambiguated candidate ("#1", "#2", ...). Without
    // this separate namespace, a collision-driven retry candidate (eg. "path#1") could later be
    // independently re-derived -- and silently treated as "already seen, same candidate" instead
    // of a fresh occurrence -- by a genuine second occurrence of the same full path, handing the
    // same ID to two different suite/test nodes.
    let retrySalt = 0;
    while (slot.seenIds[id] !== undefined && slot.seenIds[id] !== candidate) {
        retrySalt++;
        candidate = `${fullPath}#-${retrySalt}`;
        id = _simpleHash(candidate).toString(16);
    }

    slot.seenIds[id] = candidate;

    return id;
}
