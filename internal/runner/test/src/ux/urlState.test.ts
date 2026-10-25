/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "@nevware21/tripwire";
import {
    hashSelectionValue, readSelectionIdsFromHash, resolveSelectionFromHashIds, writeSelectionToHash
} from "../../../src/ux/browser/ui/urlState";

/**
 * The interactive page's URL hash: `#suite=<id>&test=<id>`, where each id is a short hash of the
 * title rather than the title itself, so a scope can be bookmarked, shared and survives a reload.
 *
 * The module reads `globalThis.location`/`history` directly rather than taking them as
 * parameters, and node has neither, so the two halves that touch them get a plain object standing
 * in for the duration of a test -- there is no DOM involved, only a `hash`, a `pathname`, a
 * `search` and `replaceState`.
 */

/** `describe("outer", { it("alpha"), describe("inner", { it("gamma") }) }), describe("other", { it("delta") })` */
const DISCOVERY = {
    suites: ["other", "outer", "outer > inner"],
    tests: [
        { suiteTitle: "other", testName: "delta", fullTitle: "other > delta" },
        { suiteTitle: "outer", testName: "alpha", fullTitle: "outer > alpha" },
        { suiteTitle: "outer > inner", testName: "gamma", fullTitle: "outer > inner > gamma" }
    ]
};

function _withGlobals(globals: { location?: any; history?: any }, fn: () => void): void {
    const g = globalThis as any;
    const prevLocation = g.location;
    const prevHistory = g.history;

    g.location = globals.location;
    g.history = globals.history;
    try {
        fn();
    } finally {
        g.location = prevLocation;
        g.history = prevHistory;
    }
}

function _readHash(hash: string) {
    let ids: any = "unset";
    _withGlobals({ location: { hash: hash } }, () => {
        ids = readSelectionIdsFromHash();
    });

    return ids;
}

/** Runs `writeSelectionToHash` against a page at `pathname + search` and returns the URL it recorded. */
function _writtenUrl(selection: any, pathname: string = "/__tripwire__/browser", search: string = ""): string {
    const calls: any[] = [];
    _withGlobals({
        location: { pathname: pathname, search: search, hash: "#stale=1" },
        history: {
            replaceState: (state: any, title: string, url: string) => {
                calls.push([state, title, url]);
            }
        }
    }, () => {
        writeSelectionToHash(selection);
    });

    assert.equal(calls.length, 1, "exactly one replaceState call");
    assert.isNull(calls[0][0], "no history state object is attached");

    return calls[0][2];
}

describe("ux urlState", () => {

    describe("hashSelectionValue", () => {
        it("should be stable for the same title", () => {
            assert.equal(hashSelectionValue("outer > alpha"), hashSelectionValue("outer > alpha"));
        });

        it("should keep producing the ids already in people's bookmarks", () => {
            // Pinned values: changing the hash function silently breaks every URL written by an
            // earlier build, which would be a very confusing "my bookmark now runs everything".
            assert.equal(hashSelectionValue("outer"), "30gt0c");
            assert.equal(hashSelectionValue("outer > alpha"), "26aahi");
        });

        it("should tell different titles apart", () => {
            assert.notEqual(hashSelectionValue("outer > alpha"), hashSelectionValue("outer > beta"));
            assert.notEqual(hashSelectionValue("a"), hashSelectionValue("A"), "case is part of the title");
        });

        it("should map an empty title to an empty id", () => {
            assert.equal(hashSelectionValue(""), "");
        });

        it("should only ever use URL-safe characters, whatever the title holds", () => {
            const titles = ["with spaces", "a&b=c#d", "quotes \"and\" 'more'", "unicode é中😀", "> > >", "%20"];
            for (let lp = 0; lp < titles.length; lp++) {
                assert.match(hashSelectionValue(titles[lp]), /^[0-9a-z]+$/, titles[lp]);
            }
        });
    });

    describe("readSelectionIdsFromHash", () => {
        it("should report nothing when the URL has no hash", () => {
            assert.isNull(_readHash(""));
            assert.isNull(_readHash("#"));
        });

        it("should report nothing when there is no location at all", () => {
            _withGlobals({ location: undefined }, () => {
                assert.isNull(readSelectionIdsFromHash());
            });
        });

        it("should read a suite id, a test id, or both", () => {
            assert.deepEqual(_readHash("#suite=30gt0c"), { suiteId: "30gt0c", testId: "" });
            assert.deepEqual(_readHash("#test=26aahi"), { suiteId: "", testId: "26aahi" });
            assert.deepEqual(_readHash("#suite=30gt0c&test=26aahi"), { suiteId: "30gt0c", testId: "26aahi" });
        });

        it("should not care which key comes first", () => {
            assert.deepEqual(_readHash("#test=26aahi&suite=30gt0c"), { suiteId: "30gt0c", testId: "26aahi" });
        });

        it("should ignore keys it does not know", () => {
            assert.deepEqual(_readHash("#foo=1&suite=30gt0c&bar=baz"), { suiteId: "30gt0c", testId: "" });
        });

        it("should tell an unrelated hash apart from an empty selection", () => {
            // No recognised key at all: nothing was ever recorded, so the caller must not treat it
            // as an explicit "run everything".
            assert.isNull(_readHash("#foo=1"));
            assert.isNull(_readHash("#section-heading"));

            // A bare key is a recorded, empty, selection.
            assert.deepEqual(_readHash("#suite"), { suiteId: "", testId: "" });
            assert.deepEqual(_readHash("#suite=&test="), { suiteId: "", testId: "" });
        });

        it("should decode percent-encoded values", () => {
            assert.deepEqual(_readHash("#suite=a%20b&test=c%26d"), { suiteId: "a b", testId: "c&d" });
        });
    });

    describe("resolveSelectionFromHashIds", () => {
        it("should resolve nothing when nothing was recorded", () => {
            assert.isNull(resolveSelectionFromHashIds(DISCOVERY, null));
            assert.isNull(resolveSelectionFromHashIds(DISCOVERY, { suiteId: "", testId: "" }));
        });

        it("should turn ids back into the titles they were made from", () => {
            assert.deepEqual(
                resolveSelectionFromHashIds(DISCOVERY, { suiteId: hashSelectionValue("outer > inner"), testId: "" }),
                { suiteTitle: "outer > inner", testTitle: "" }
            );
            assert.deepEqual(
                resolveSelectionFromHashIds(DISCOVERY, { suiteId: "", testId: hashSelectionValue("outer > inner > gamma") }),
                { suiteTitle: "", testTitle: "outer > inner > gamma" }
            );
            assert.deepEqual(
                resolveSelectionFromHashIds(DISCOVERY, { suiteId: hashSelectionValue("outer"), testId: hashSelectionValue("outer > alpha") }),
                { suiteTitle: "outer", testTitle: "outer > alpha" }
            );
        });

        it("should match tests on their full title, not the bare test name", () => {
            assert.deepEqual(
                resolveSelectionFromHashIds(DISCOVERY, { suiteId: "", testId: hashSelectionValue("alpha") }),
                { suiteTitle: "", testTitle: "" }
            );
        });

        it("should fall back to everything for an id nothing in the discovery hashes to", () => {
            // A suite renamed or removed since the URL was written: the selection must resolve to
            // "all" rather than fail, so the reload still runs something.
            assert.deepEqual(
                resolveSelectionFromHashIds(DISCOVERY, { suiteId: "zzzzzz", testId: "yyyyyy" }),
                { suiteTitle: "", testTitle: "" }
            );
        });

        it("should cope with an empty or missing discovery", () => {
            assert.deepEqual(resolveSelectionFromHashIds(null, { suiteId: "30gt0c", testId: "" }), { suiteTitle: "", testTitle: "" });
            assert.deepEqual(resolveSelectionFromHashIds({}, { suiteId: "30gt0c", testId: "" }), { suiteTitle: "", testTitle: "" });
        });
    });

    describe("writeSelectionToHash", () => {
        it("should record a suite, a test, or both as hashed ids", () => {
            assert.equal(_writtenUrl({ suiteTitle: "outer", testTitle: "" }), "/__tripwire__/browser#suite=30gt0c");
            assert.equal(_writtenUrl({ suiteTitle: "", testTitle: "outer > alpha" }), "/__tripwire__/browser#test=26aahi");
            assert.equal(_writtenUrl({ suiteTitle: "outer", testTitle: "outer > alpha" }), "/__tripwire__/browser#suite=30gt0c&test=26aahi");
        });

        it("should drop the hash entirely for no selection", () => {
            assert.equal(_writtenUrl(null), "/__tripwire__/browser");
            assert.equal(_writtenUrl({ suiteTitle: "", testTitle: "" }), "/__tripwire__/browser");
        });

        it("should keep the path and query string and replace only the hash", () => {
            assert.equal(
                _writtenUrl({ suiteTitle: "outer", testTitle: "" }, "/__tripwire__/worker/", "?autofinish=1"),
                "/__tripwire__/worker/?autofinish=1#suite=30gt0c"
            );
        });

        it("should never put the title itself in the URL", () => {
            const url = _writtenUrl({ suiteTitle: "spaces & symbols", testTitle: "" });
            assert.equal(url.indexOf("spaces"), -1, url);
            assert.equal(url.indexOf("%"), -1, "nothing to percent-encode either: " + url);
        });

        it("should do nothing without a history to write to", () => {
            _withGlobals({ location: { pathname: "/", search: "" }, history: undefined }, () => {
                writeSelectionToHash({ suiteTitle: "outer", testTitle: "" });
            });
            const history = {
                replaceState: () => {
                    assert.fail("must not be called");
                }
            };
            _withGlobals({ location: undefined, history: history }, () => {
                writeSelectionToHash({ suiteTitle: "outer", testTitle: "" });
            });
        });

        it("should round-trip through read and resolve", () => {
            const selections = [
                { suiteTitle: "outer > inner", testTitle: "" },
                { suiteTitle: "", testTitle: "other > delta" },
                { suiteTitle: "outer", testTitle: "outer > inner > gamma" }
            ];

            for (let lp = 0; lp < selections.length; lp++) {
                const url = _writtenUrl(selections[lp]);
                const hash = url.substring(url.indexOf("#"));
                const resolved = resolveSelectionFromHashIds(DISCOVERY, _readHash(hash));

                assert.deepEqual(resolved, selections[lp], hash);
            }
        });
    });
});
