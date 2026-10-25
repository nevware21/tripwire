/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

/**
 * A menu button (the "..." actions button) built to the WAI-ARIA menu button pattern, because
 * the actions it hides -- reloading the tests, clearing the run, stopping the server -- have to
 * stay reachable without a mouse.
 *
 * What that means in practice, and what this module is responsible for:
 *
 *  - the button owns `aria-expanded` and points at the menu with `aria-controls`;
 *  - Enter, Space and ArrowDown open the menu on its first item, ArrowUp on its last;
 *  - inside the menu the arrow keys move between items and wrap, Home/End jump to the ends,
 *    Escape closes and puts focus back on the button (so the tab position is never lost), and
 *    Tab closes it and carries on out of the menu;
 *  - items are real `<button>`s with `role="menuitem"` and a roving tabindex, so the menu is a
 *    single tab stop rather than four;
 *  - an item marked `aria-disabled` still takes focus -- it must stay findable and announced,
 *    which a natively `disabled` button is not -- but activating it does nothing.
 */

/**
 * Where a key should move focus within a menu of `count` items, given the item that has it now.
 * Returns -1 for a key that does not move focus, so callers can leave the event alone.
 *
 * Wrapping is what the pattern calls for, and is worth stating separately from the DOM work
 * around it: from the last item ArrowDown goes back to the first, and from the first ArrowUp
 * goes to the last.
 */
export function nextMenuIndex(count: number, current: number, key: string): number {
    if (count < 1) {
        return -1;
    }

    if (key === "ArrowDown") {
        return current < 0 || current >= count - 1 ? 0 : current + 1;
    }

    if (key === "ArrowUp") {
        return current <= 0 ? count - 1 : current - 1;
    }

    if (key === "Home") {
        return 0;
    }

    if (key === "End") {
        return count - 1;
    }

    return -1;
}

function _isDisabled(item: HTMLElement): boolean {
    return item.getAttribute("aria-disabled") === "true";
}

/**
 * Wires `button` up as the menu button for `menu`, whose children carry `role="menuitem"`.
 * The menu is shown and hidden with the `hidden` attribute, so it is removed from the
 * accessibility tree while closed rather than merely painted out of sight.
 */
export function createMenu(button: HTMLElement, menu: HTMLElement): void {
    function items(): HTMLElement[] {
        const found = menu.querySelectorAll("[role='menuitem']");
        const result: HTMLElement[] = [];

        for (let lp = 0; lp < found.length; lp++) {
            result.push(found[lp] as HTMLElement);
        }

        return result;
    }

    function isOpen(): boolean {
        return !menu.hasAttribute("hidden");
    }

    function focusItem(index: number) {
        const all = items();

        for (let lp = 0; lp < all.length; lp++) {
            // Roving tabindex: exactly one item is tabbable at a time, so the whole menu is one
            // stop on the tab ring and the arrow keys own movement inside it.
            all[lp].setAttribute("tabindex", lp === index ? "0" : "-1");
        }

        if (all[index]) {
            all[index].focus();
        }
    }

    function open(index: number) {
        menu.removeAttribute("hidden");
        button.setAttribute("aria-expanded", "true");
        focusItem(index);
    }

    function close(refocus: boolean) {
        if (!isOpen()) {
            return;
        }

        menu.setAttribute("hidden", "");
        button.setAttribute("aria-expanded", "false");

        if (refocus) {
            button.focus();
        }
    }

    function currentIndex(): number {
        const all = items();

        for (let lp = 0; lp < all.length; lp++) {
            if (all[lp] === document.activeElement) {
                return lp;
            }
        }

        return -1;
    }

    button.addEventListener("click", (evt) => {
        evt.preventDefault();
        if (isOpen()) {
            close(false);
        } else {
            open(0);
        }
    });

    button.addEventListener("keydown", (evt: KeyboardEvent) => {
        if (evt.key === "ArrowDown" || evt.key === "Enter" || evt.key === " ") {
            evt.preventDefault();
            open(0);
        } else if (evt.key === "ArrowUp") {
            evt.preventDefault();
            open(Math.max(items().length - 1, 0));
        } else if (evt.key === "Escape") {
            close(false);
        }
    });

    menu.addEventListener("keydown", (evt: KeyboardEvent) => {
        if (evt.key === "Escape") {
            evt.preventDefault();
            close(true);
            return;
        }

        if (evt.key === "Tab") {
            // Let the browser move focus onward; the menu simply stops being open.
            close(false);
            return;
        }

        const moveTo = nextMenuIndex(items().length, currentIndex(), evt.key);
        if (moveTo >= 0) {
            evt.preventDefault();
            focusItem(moveTo);
        }
    });

    // Capture, so a disabled item's own click handler never runs: the listener the rest of the
    // page registered on that button sits in the bubble phase, on the button itself.
    menu.addEventListener("click", (evt) => {
        const target = evt.target as HTMLElement;
        const item = target && target.closest ? (target.closest("[role='menuitem']") as HTMLElement) : null;

        if (item && _isDisabled(item)) {
            evt.preventDefault();
            evt.stopPropagation();
        }
    }, true);

    // Bubble, so this runs *after* the item's own handler has done its work.
    menu.addEventListener("click", (evt) => {
        const target = evt.target as HTMLElement;
        if (target && target.closest && target.closest("[role='menuitem']")) {
            close(true);
        }
    });

    document.addEventListener("click", (evt) => {
        const target = evt.target as Node;
        if (target !== button && !button.contains(target) && !menu.contains(target)) {
            close(false);
        }
    });

    // Focus leaving the whole control by any route the handlers above do not cover (a click
    // straight into another field, say) closes it too, so a menu can never be left open and
    // detached from where the user actually is.
    menu.addEventListener("focusout", () => {
        setTimeout(() => {
            const active = document.activeElement as Node;
            if (isOpen() && !menu.contains(active) && active !== button) {
                close(false);
            }
        }, 0);
    });
}
