/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

const MAX_RESULTS = 50;

/**
 * The attribute {@link createAutocomplete} records the picked row's `kind` on the input under,
 * and clears as soon as the value is edited by hand. It exists because a row's display value is
 * not always unique on its own -- a suite and a test can share a title -- so the caller needs to
 * know *which* row produced the value it is now reading back.
 */
export const AUTOCOMPLETE_KIND_ATTR = "data-autocomplete-kind";

/** One suggestion row. `value` lands in the input; `kind` is the badge, if any. */
export interface IAutocompleteItem {
    value: string;
    label: string;
    kind?: string;
}

/**
 * Wires a plain text input up to a custom, in-page suggestion dropdown -- deliberately not
 * `<input list>` + `<datalist>`, whose suggestion popup is OS-native chrome with no CSS hook in
 * any browser, so it reads as a foreign bubble rather than part of this page. `listEl` is an
 * absolutely-positioned sibling (see `.autocomplete-list` in base.css) that this function owns
 * entirely -- callers just need to place it in the DOM next to `input`.
 *
 * `getCandidates(query)` is called fresh on every keystroke and every time the list opens, so it
 * always reflects live state without this module needing to know anything about where the rows
 * come from.
 *
 * Selecting a suggestion (click or Enter) sets `input.value`, records the row's kind (see
 * {@link AUTOCOMPLETE_KIND_ATTR}) and dispatches a real "change" event so existing "change"
 * listeners on `input` keep working unchanged -- deliberately not "input" too, since that would
 * immediately re-trigger this module's own input listener and reopen the list it just closed.
 */
export function createAutocomplete(input: HTMLInputElement, listEl: HTMLElement, getCandidates: (query: string) => IAutocompleteItem[]): void {
    let items: IAutocompleteItem[] = [];
    let activeIndex = -1;

    function render(candidates: IAutocompleteItem[]) {
        items = candidates.slice(0, MAX_RESULTS);
        activeIndex = -1;
        listEl.textContent = "";

        if (!candidates.length) {
            const empty = document.createElement("div");
            empty.className = "autocomplete-empty";
            empty.textContent = "No matches";
            listEl.appendChild(empty);
            return;
        }

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const row = document.createElement("div");
            row.className = "autocomplete-item";
            row.setAttribute("role", "option");

            const text = document.createElement("span");
            text.className = "autocomplete-text";
            text.textContent = item.label;
            row.appendChild(text);

            if (item.kind) {
                const badge = document.createElement("span");
                badge.className = "autocomplete-kind autocomplete-kind-" + item.kind;
                badge.textContent = item.kind;
                row.appendChild(badge);
            }

            // "mousedown" (not "click") fires before the input's own blur -- preventDefault
            // here stops that blur from happening at all, so focus (and this list) never
            // flickers closed-then-reopened before the selection below takes effect.
            row.addEventListener("mousedown", (evt) => {
                evt.preventDefault();
                select(item);
            });
            listEl.appendChild(row);
        }

        if (candidates.length > items.length) {
            const more = document.createElement("div");
            more.className = "autocomplete-more";
            more.textContent = (candidates.length - items.length) + " more -- keep typing to narrow";
            listEl.appendChild(more);
        }

        // Pre-highlight the row the input already holds, falling back to the top match -- so
        // Enter alone, without ever touching an arrow key, commits something sensible, matching
        // how every other search-style autocomplete behaves. Without this the list opens with
        // nothing highlighted and a bare Enter press does nothing (closes the list), which reads
        // as "there's no way to select this with the keyboard" even though arrow keys worked.
        // Preferring the current value matters once the list includes a "clear this" row at the
        // top: reopening the dropdown on a committed choice and pressing Enter must re-commit
        // that choice, not silently reset it to the first row.
        setActive(Math.max(_indexOfValue(input.value), 0));
    }

    function _indexOfValue(value: string): number {
        for (let i = 0; i < items.length; i++) {
            if (items[i].value === value) {
                return i;
            }
        }

        return -1;
    }

    function setActive(index: number) {
        const rows = listEl.querySelectorAll(".autocomplete-item");
        for (let i = 0; i < rows.length; i++) {
            rows[i].classList.toggle("active", i === index);
        }
        activeIndex = index;
        const activeRow = rows[index];
        if (activeRow) {
            (activeRow as HTMLElement).scrollIntoView({ block: "nearest" });
        }
    }

    // The input is a combobox, so assistive technology learns whether its listbox is showing
    // from aria-expanded; the class alone is only visible to the stylesheet.
    function _setOpen(isOpen: boolean) {
        listEl.classList.toggle("open", isOpen);
        input.setAttribute("aria-expanded", isOpen ? "true" : "false");
    }

    function open() {
        render(getCandidates(input.value));
        _setOpen(true);
    }

    function close() {
        _setOpen(false);
        activeIndex = -1;
    }

    function select(item: IAutocompleteItem) {
        input.value = item.value;
        if (item.kind) {
            input.setAttribute(AUTOCOMPLETE_KIND_ATTR, item.kind);
        } else {
            input.removeAttribute(AUTOCOMPLETE_KIND_ATTR);
        }
        close();
        input.dispatchEvent(new Event("change", { bubbles: true }));
        input.focus();
    }

    input.addEventListener("input", () => {
        // Typed text is no longer the row that was picked, so the recorded kind cannot describe
        // it any more.
        input.removeAttribute(AUTOCOMPLETE_KIND_ATTR);
        render(getCandidates(input.value));
        _setOpen(true);
    });

    input.addEventListener("focus", open);

    input.addEventListener("keydown", (evt) => {
        if (!listEl.classList.contains("open")) {
            return;
        }

        if (evt.key === "ArrowDown") {
            evt.preventDefault();
            setActive(Math.min(activeIndex + 1, items.length - 1));
        } else if (evt.key === "ArrowUp") {
            evt.preventDefault();
            setActive(Math.max(activeIndex - 1, 0));
        } else if (evt.key === "Enter") {
            if (activeIndex >= 0 && items[activeIndex] !== undefined) {
                evt.preventDefault();
                select(items[activeIndex]);
            } else {
                close();
            }
        } else if (evt.key === "Escape") {
            close();
        }
    });

    document.addEventListener("click", (evt) => {
        const target = evt.target as Node;
        if (target !== input && !listEl.contains(target)) {
            close();
        }
    });
}
