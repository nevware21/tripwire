/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "@nevware21/tripwire";
import { nextMenuIndex } from "../../../src/ux/browser/ui/menu";

/**
 * The arrow-key movement behind the interactive page's "..." actions menu.
 *
 * `createMenu` itself needs a live document and is exercised end to end against the real page;
 * this is the part of it that is pure, and the part that breaks silently -- an off-by-one in the
 * wrapping leaves a keyboard user stuck at one end of the menu with no visible sign anything is
 * wrong.
 */
describe("ux menu", () => {

    describe("nextMenuIndex", () => {
        it("should step down through the items", () => {
            assert.equal(nextMenuIndex(4, 0, "ArrowDown"), 1);
            assert.equal(nextMenuIndex(4, 2, "ArrowDown"), 3);
        });

        it("should step up through the items", () => {
            assert.equal(nextMenuIndex(4, 3, "ArrowUp"), 2);
            assert.equal(nextMenuIndex(4, 1, "ArrowUp"), 0);
        });

        it("should wrap around at both ends", () => {
            assert.equal(nextMenuIndex(4, 3, "ArrowDown"), 0, "past the last item comes the first");
            assert.equal(nextMenuIndex(4, 0, "ArrowUp"), 3, "before the first item comes the last");
        });

        it("should jump to either end", () => {
            assert.equal(nextMenuIndex(4, 2, "Home"), 0);
            assert.equal(nextMenuIndex(4, 2, "End"), 3);
        });

        it("should start at the first item when nothing is focused yet", () => {
            assert.equal(nextMenuIndex(4, -1, "ArrowDown"), 0);
            assert.equal(nextMenuIndex(4, -1, "ArrowUp"), 3);
        });

        it("should report no movement for keys it does not handle", () => {
            assert.equal(nextMenuIndex(4, 1, "Enter"), -1);
            assert.equal(nextMenuIndex(4, 1, "a"), -1);
            assert.equal(nextMenuIndex(4, 1, "Escape"), -1, "closing is not a move, and is handled separately");
        });

        it("should report no movement for an empty menu", () => {
            assert.equal(nextMenuIndex(0, -1, "ArrowDown"), -1);
            assert.equal(nextMenuIndex(0, -1, "Home"), -1);
        });

        it("should handle a single item", () => {
            assert.equal(nextMenuIndex(1, 0, "ArrowDown"), 0);
            assert.equal(nextMenuIndex(1, 0, "ArrowUp"), 0);
        });
    });
});
