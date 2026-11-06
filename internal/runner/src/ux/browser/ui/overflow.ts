/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

/**
 * Folds controls into the "..." actions menu when the window is too narrow for their row, rather than
 * letting the row wrap: the Target picker beside the title, and the Failed only setting on the
 * toolbar. Each row folds its controls in order -- the least needed first -- until it fits on one
 * line, and unfolds them again as the window widens.
 *
 * In the menu a folded control has a stand-in that drives the real one: Failed only is a checkbox
 * item that toggles its checkbox, and Target is a choice of the two targets that sets the picker. Either
 * fires the control's own "change", so everything listening to the control carries on as before.
 */

import {
    appHeaderEl, controlsRowEl, foldedControlsEl, targetControl, targetSelect, targetMenuGroup,
    failedOnlyControl, failedOnlyToggle, failedOnlyItem
} from "./dom";
import { fireEvent } from "./utils";

/** A control that folds into the menu, and what stands in for it there. */
export interface IFoldEntry {
    control: HTMLElement;
    standIn: HTMLElement;
    // Shows the control's current state on its stand-in
    sync(): void;
}

/** A row of controls, and the ones in it that fold -- in the order they fold, the least needed first. */
export interface IFoldRow {
    row: HTMLElement;
    entries: IFoldEntry[];
}

export interface IToolbarOverflow {
    // Unfolds every control, then folds as many as each row needs to fit on one line
    fit(): void;
}

function _setHidden(el: HTMLElement, hidden: boolean) {
    if (hidden) {
        el.setAttribute("hidden", "");
    } else {
        el.removeAttribute("hidden");
    }
}

function _isShown(el: HTMLElement) {
    return el.offsetWidth > 0 || el.offsetHeight > 0;
}

/**
 * Whether a row's controls have wrapped onto a second line. A wrapping row's last control is on its
 * last line, so it is enough to see whether that one sits below the first.
 */
export function _rowWraps(row: HTMLElement): boolean {
    var shown: HTMLElement[] = [];
    for (var lp = 0; lp < row.children.length; lp++) {
        var child = row.children[lp] as HTMLElement;
        if (_isShown(child)) {
            shown.push(child);
        }
    }

    if (shown.length < 2) {
        return false;
    }

    var first = shown[0];
    return shown[shown.length - 1].offsetTop > first.offsetTop + first.offsetHeight / 2;
}

/** A checkbox's stand-in: checked as the checkbox is, and toggling it when chosen. */
export function foldCheckbox(control: HTMLElement, input: HTMLInputElement, item: HTMLElement): IFoldEntry {
    function sync() {
        item.setAttribute("aria-checked", input.checked ? "true" : "false");
    }

    input.addEventListener("change", sync);
    item.addEventListener("click", function() {
        input.checked = !input.checked;
        fireEvent(input, "change");
    });

    return { control: control, standIn: item, sync: sync };
}

/**
 * A select's stand-in: the radio items in `group`, each carrying one of the select's values in its
 * `choiceAttr` attribute. The current value is checked, every item is disabled while the select is,
 * and choosing another value sets the select to it.
 */
export function foldSelect(control: HTMLElement, select: HTMLSelectElement, group: HTMLElement, choiceAttr: string): IFoldEntry {
    var found = group.querySelectorAll("[" + choiceAttr + "]");
    var items: HTMLElement[] = [];
    for (var lp = 0; lp < found.length; lp++) {
        items.push(found[lp] as HTMLElement);
    }

    function sync() {
        items.forEach(function(item) {
            item.setAttribute("aria-checked", item.getAttribute(choiceAttr) === select.value ? "true" : "false");
            item.setAttribute("aria-disabled", select.disabled ? "true" : "false");
        });
    }

    items.forEach(function(item) {
        item.addEventListener("click", function() {
            var choice = item.getAttribute(choiceAttr);
            if (!select.disabled && choice && choice !== select.value) {
                select.value = choice;
                fireEvent(select, "change");
            }
        });
    });

    return { control: control, standIn: group, sync: sync };
}

/**
 * Folds the entries of each of `rows` as the row needs, showing their stand-ins in the menu, and
 * `folded` -- the part of the menu that holds them -- only while any of them is folded.
 */
export function createToolbarOverflow(rows: IFoldRow[], folded: HTMLElement | null): IToolbarOverflow {
    function fold(entry: IFoldEntry, isFolded: boolean) {
        entry.control.classList.toggle("is-folded", isFolded);
        _setHidden(entry.standIn, !isFolded);
    }

    return {
        fit: function() {
            var anyFolded = false;
            rows.forEach(function(row) {
                row.entries.forEach(function(entry) {
                    fold(entry, false);
                });

                for (var lp = 0; lp < row.entries.length && _rowWraps(row.row); lp++) {
                    fold(row.entries[lp], true);
                    anyFolded = true;
                }

                row.entries.forEach(function(entry) {
                    entry.sync();
                });
            });

            if (folded) {
                _setHidden(folded, !anyFolded);
            }
        }
    };
}

var _overflow: IToolbarOverflow | null = null;

/** Sets the page's controls up to fold, and keeps them fitted to the window as it is resized. */
export function initToolbarOverflow() {
    var rows: IFoldRow[] = [];
    if (appHeaderEl && targetControl && targetSelect && targetMenuGroup) {
        rows.push({ row: appHeaderEl, entries: [ foldSelect(targetControl, targetSelect, targetMenuGroup, "data-target-choice") ] });
    }

    if (controlsRowEl && failedOnlyControl && failedOnlyToggle && failedOnlyItem) {
        rows.push({ row: controlsRowEl, entries: [ foldCheckbox(failedOnlyControl, failedOnlyToggle, failedOnlyItem) ] });
    }

    _overflow = createToolbarOverflow(rows, foldedControlsEl);
    _overflow.fit();

    var win: any = typeof window !== "undefined" ? window : null;
    var pending = false;
    if (win && win.addEventListener) {
        // Once per frame however many resize events arrive in it: each fit is a few layouts
        win.addEventListener("resize", function() {
            if (!pending) {
                pending = true;
                requestAnimationFrame(function() {
                    pending = false;
                    fitToolbar();
                });
            }
        });
    }
}

/** Fits the controls to the window again -- after a control's width has changed, say. */
export function fitToolbar() {
    if (_overflow) {
        _overflow.fit();
    }
}
