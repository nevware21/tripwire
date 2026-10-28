/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "@nevware21/tripwire";
import { createMenu, nextMenuIndex } from "../../../src/ux/browser/ui/menu";
import { stubElement, stubEvent, useStubDocument } from "../support/uxDom";

/**
 * The interactive page's "..." actions menu: the arrow-key movement, which breaks silently -- an
 * off-by-one in the wrapping leaves a keyboard user stuck at one end of the menu with no visible
 * sign anything is wrong -- and the open, close and focus handling around it, run against the
 * stand-in elements and `document` of ../support/uxDom.ts. It is also exercised end to end against
 * the real page.
 */
describe("ux menu", () => {

    describe("createMenu", () => {
        let doc: any;
        let restoreDocument: () => void;
        let button: any;
        let menu: any;
        let items: any[];

        function key(target: any, name: string): any {
            const evt = stubEvent("keydown", { key: name });
            target.dispatchEvent(evt);

            return evt;
        }

        function isOpen(): boolean {
            return !menu.hasAttribute("hidden");
        }

        beforeEach(() => {
            const installed = useStubDocument();
            doc = installed.document;
            restoreDocument = installed.restore;

            button = stubElement("actionsBtn", "button");
            menu = stubElement("actionsMenu", "div");
            menu.setAttribute("hidden", "");
            items = [ "Run", "Finish", "Reload" ].map((label) => {
                const item = stubElement("", "button");
                item.setAttribute("role", "menuitem");
                item.textContent = label;
                menu.appendChild(item);

                return item;
            });
            items[1].setAttribute("aria-disabled", "true");
            createMenu(button, menu);
        });

        afterEach(() => {
            restoreDocument();
        });

        it("opens on a click, focusing the first item, and closes on the next", () => {
            const evt = stubEvent("click");
            button.dispatchEvent(evt);

            assert.isTrue(isOpen());
            assert.isTrue(evt.defaultPrevented);
            assert.equal(button.getAttribute("aria-expanded"), "true");
            assert.equal(doc.activeElement, items[0]);
            assert.deepEqual(items.map((item) => item.getAttribute("tabindex")), [ "0", "-1", "-1" ]);

            button.click();
            assert.isFalse(isOpen());
            assert.equal(button.getAttribute("aria-expanded"), "false");
        });

        it("opens from the button's keys at the first or the last item, and closes on Escape", () => {
            [ "ArrowDown", "Enter", " " ].forEach((name) => {
                menu.setAttribute("hidden", "");
                assert.isTrue(key(button, name).defaultPrevented, name);
                assert.isTrue(isOpen(), name);
                assert.equal(doc.activeElement, items[0], name);
            });

            menu.setAttribute("hidden", "");
            key(button, "ArrowUp");
            assert.equal(doc.activeElement, items[2]);

            key(button, "Escape");
            assert.isFalse(isOpen());

            key(button, "Tab");
            assert.isFalse(isOpen(), "other keys do nothing");
        });

        it("moves through the items with the arrow, Home and End keys", () => {
            button.click();

            key(menu, "ArrowDown");
            assert.equal(doc.activeElement, items[1]);
            key(menu, "End");
            assert.equal(doc.activeElement, items[2]);
            key(menu, "ArrowDown");
            assert.equal(doc.activeElement, items[0], "wraps round");
            key(menu, "ArrowUp");
            assert.equal(doc.activeElement, items[2]);
            key(menu, "Home");
            assert.equal(doc.activeElement, items[0]);

            assert.isFalse(key(menu, "a").defaultPrevented, "other keys are left alone");
            assert.isTrue(isOpen());
        });

        it("closes on Escape, giving focus back to the button, and on Tab without", () => {
            button.click();
            const evt = key(menu, "Escape");

            assert.isFalse(isOpen());
            assert.isTrue(evt.defaultPrevented);
            assert.equal(doc.activeElement, button);

            button.click();
            doc.activeElement = items[0];
            key(menu, "Tab");
            assert.isFalse(isOpen());
            assert.equal(doc.activeElement, items[0]);

            key(menu, "Escape");
            assert.isFalse(isOpen(), "closing a closed menu changes nothing");
        });

        it("closes when an item is chosen, but not for a disabled one", () => {
            button.click();
            const disabled = stubEvent("click");
            items[1].dispatchEvent(disabled);

            assert.isTrue(isOpen());
            assert.isTrue(disabled.defaultPrevented);
            assert.isTrue(disabled.propagationStopped);

            items[2].click();
            assert.isFalse(isOpen());
            assert.equal(doc.activeElement, button);
        });

        it("stays open for a click inside it that is not on an item", () => {
            const gap = stubElement("", "div");
            menu.appendChild(gap);
            button.click();

            gap.click();

            assert.isTrue(isOpen());
        });

        it("closes for a click anywhere else on the page", () => {
            button.click();

            stubElement("", "div").click();

            assert.isFalse(isOpen());
        });

        it("closes once focus has left both the menu and the button", async () => {
            button.click();
            doc.activeElement = items[0];
            menu.dispatchEvent(stubEvent("focusout"));
            await new Promise((resolve) => setTimeout(resolve, 5));
            assert.isTrue(isOpen(), "focus is still inside");

            doc.activeElement = stubElement("", "input");
            menu.dispatchEvent(stubEvent("focusout"));
            await new Promise((resolve) => setTimeout(resolve, 5));
            assert.isFalse(isOpen());
        });

        it("counts radio items in a group as items, moving through them and closing when one is chosen", () => {
            const group = stubElement("", "div");
            group.setAttribute("role", "group");
            const radio = stubElement("", "button");
            radio.setAttribute("role", "menuitemradio");
            group.appendChild(radio);
            menu.insertBefore(group, items[2]);

            button.click();
            key(menu, "End");
            key(menu, "ArrowUp");
            assert.equal(doc.activeElement, radio, "between Finish and Reload");
            assert.equal(radio.getAttribute("tabindex"), "0", "it holds the roving tabindex");

            radio.click();
            assert.isFalse(isOpen());
            assert.equal(doc.activeElement, button);
        });

        it("passes over hidden items, alone or in a hidden group, and counts checkbox items", () => {
            const group = stubElement("", "div");
            const inGroup = stubElement("", "button");
            inGroup.setAttribute("role", "menuitemcheckbox");
            group.appendChild(inGroup);
            const alone = stubElement("", "button");
            alone.setAttribute("role", "menuitemcheckbox");
            menu.insertBefore(group, items[0]);
            menu.insertBefore(alone, items[0]);

            group.setAttribute("hidden", "");
            alone.setAttribute("hidden", "");
            button.click();
            assert.equal(doc.activeElement, items[0], "opens on the first item showing");
            key(menu, "ArrowUp");
            assert.equal(doc.activeElement, items[2], "and wraps past the hidden ones");
            key(button, "Escape");

            group.removeAttribute("hidden");
            alone.removeAttribute("hidden");
            button.click();
            assert.equal(doc.activeElement, inGroup, "shown again, they lead the menu");
            key(menu, "ArrowDown");
            assert.equal(doc.activeElement, alone);
        });
    });

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
