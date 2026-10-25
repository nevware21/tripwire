/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { Selection } from "./shared";

const HASH_SUITE_KEY = "suite";
const HASH_TEST_KEY = "test";

export interface HashSelectionIds {
    suiteId: string;
    testId: string;
}

/**
 * Compact, deterministic id for a suite/test title (djb2, base36) -- not a security control, just
 * a short stand-in so the URL hash never has to carry a suite/test's full, possibly long and
 * punctuation-heavy title verbatim. Collisions across a single run's discovery are theoretically
 * possible but accepted: `resolveSelectionFromHashIds` below takes the first match, the same
 * "good enough for a convenience feature" tradeoff as everywhere else in this UI.
 */
export function hashSelectionValue(value: string): string {
    if (!value) {
        return "";
    }

    let hash = 5381;
    for (let i = 0; i < value.length; i++) {
        hash = ((hash * 33) ^ value.charCodeAt(i)) >>> 0;
    }

    return hash.toString(36);
}

/**
 * Reads the raw suite/test ids back out of the current page's URL hash (`#suite=<id>&test=<id>`),
 * the mirror of `writeSelectionToHash` below. Returns `null` when the hash has neither key, so
 * callers can tell "no selection was ever recorded in the URL" apart from "the recorded selection
 * is All suites/All tests" (which is a resolved `{ suiteTitle: "", testTitle: "" }`, still a
 * meaningful, explicit choice worth restoring over the URL's absence). These ids are opaque until
 * resolved against a live discovery via `resolveSelectionFromHashIds` -- a hash alone can't be
 * turned back into its original title.
 */
export function readSelectionIdsFromHash(): HashSelectionIds | null {
    const hash = (globalThis.location && globalThis.location.hash) || "";
    if (hash.length < 2) {
        return null;
    }

    const params = new URLSearchParams(hash.substring(1));
    if (!params.has(HASH_SUITE_KEY) && !params.has(HASH_TEST_KEY)) {
        return null;
    }

    return {
        suiteId: params.get(HASH_SUITE_KEY) || "",
        testId: params.get(HASH_TEST_KEY) || ""
    };
}

/**
 * Resolves ids read from the URL hash back into an actual `Selection` by hashing every suite/
 * test title in `discovery` and matching -- the reverse of `writeSelectionToHash`'s one-way hash.
 * Must run *after* discovery is available (populate time), unlike reading the hash itself, which
 * happens at page-init time before any discovery exists yet -- see client.ts's `_hostInitialize`/
 * `populateAndRestoreSelection` call sites for where each half runs.
 */
export function resolveSelectionFromHashIds(discovery: any, ids: HashSelectionIds | null): Selection | null {
    if (!ids || (!ids.suiteId && !ids.testId)) {
        return null;
    }

    let suiteTitle = "";
    let testTitle = "";

    const suites = (discovery && discovery.suites) || [];
    if (ids.suiteId) {
        for (let i = 0; i < suites.length; i++) {
            if (hashSelectionValue(suites[i]) === ids.suiteId) {
                suiteTitle = suites[i];
                break;
            }
        }
    }

    const tests = (discovery && discovery.tests) || [];
    if (ids.testId) {
        for (let i = 0; i < tests.length; i++) {
            if (hashSelectionValue(tests[i].fullTitle) === ids.testId) {
                testTitle = tests[i].fullTitle;
                break;
            }
        }
    }

    return { suiteTitle, testTitle };
}

/**
 * Mirrors `selection` into the URL hash (as hashed ids, not the raw titles -- see
 * `hashSelectionValue`) so the page's current suite/test scope can be bookmarked, shared, or
 * simply restored by reloading -- the reload/watch-triggered-reload path already re-seeds its
 * selection from whatever the hash resolves to on next load (see client.ts's `_hostInitialize`).
 * Uses `history.replaceState` rather than assigning `location.hash` directly: a plain assignment
 * creates a new traversable history entry and fires `hashchange`, so every dropdown change or
 * "Run again" click would otherwise pile up its own back-button stop -- this only ever needs the
 * *current* URL to reflect the *current* selection.
 */
export function writeSelectionToHash(selection: Selection | null): void {
    const loc = globalThis.location;
    const hist = globalThis.history;
    if (!loc || !hist) {
        return;
    }

    const suiteTitle = selection && selection.suiteTitle ? selection.suiteTitle : "";
    const testTitle = selection && selection.testTitle ? selection.testTitle : "";

    const params = new URLSearchParams();
    const suiteId = hashSelectionValue(suiteTitle);
    const testId = hashSelectionValue(testTitle);
    if (suiteId) {
        params.set(HASH_SUITE_KEY, suiteId);
    }
    if (testId) {
        params.set(HASH_TEST_KEY, testId);
    }

    const query = params.toString();
    const newUrl = loc.pathname + loc.search + (query ? "#" + query : "");
    hist.replaceState(null, "", newUrl);
}
