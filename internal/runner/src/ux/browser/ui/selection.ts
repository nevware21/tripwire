/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { scopeSelect } from "./dom";
import { Selection } from "./shared";
import { AUTOCOMPLETE_KIND_ATTR, IAutocompleteItem } from "./autocomplete";
import {
    getScopeOptions, resolveScopeSelection, scopeKindFromSelection, scopeValueFromSelection
} from "../../../shared/scopeOptions";

// Everything about *what* can be picked -- searching, ranking and resolving a title back into a
// scope -- lives in ../../../shared/scopeOptions.ts, which has no DOM and is unit-tested in node.
// `collectSuiteAndTests`, which builds the discovery those options come from, lives in
// ../../../shared/discovery.ts for the same reason plus one more: the worker target builds one
// too and cannot import this file, since this one imports ./dom. What stays here is the half that
// reads and writes the live input element.

/**
 * The dropdown's rows for the single Scope picker: every suite and every test, searched together.
 */
export function getScopeCandidates(discovery: any, query: string): IAutocompleteItem[] {
    const options = getScopeOptions(discovery, query);
    const items: IAutocompleteItem[] = [];

    for (let lp = 0; lp < options.length; lp++) {
        const option = options[lp];
        items.push({
            value: option.value,
            label: option.label,
            // The "all" row is the absence of a scope rather than a kind of thing to run, so it
            // carries no badge -- and no recorded kind, which is exactly right: picking it must
            // leave nothing behind for the next resolve to latch onto.
            kind: option.kind === "all" ? "" : option.kind
        });
    }

    return items;
}

/**
 * What the picker currently says the run should be scoped to. Reads the recorded kind alongside
 * the value so a title that names both a suite and a test resolves to whichever was picked --
 * see `resolveScopeSelection`.
 */
export function getSelectionFromUi(discovery: any): Selection {
    if (!scopeSelect) {
        return { suiteTitle: "", testTitle: "" };
    }

    return resolveScopeSelection(discovery, scopeSelect.value, scopeSelect.getAttribute(AUTOCOMPLETE_KIND_ATTR) || "");
}

/**
 * Points the picker at `selection` -- used by a "run again" click and by a restored URL hash,
 * neither of which goes through the dropdown. Writes the kind too, so reading the value straight
 * back yields the same selection.
 */
export function setUiSelection(selection: Selection | null) {
    if (!scopeSelect) {
        return;
    }

    const kind = scopeKindFromSelection(selection);
    scopeSelect.value = scopeValueFromSelection(selection);

    if (kind) {
        scopeSelect.setAttribute(AUTOCOMPLETE_KIND_ATTR, kind);
    } else {
        scopeSelect.removeAttribute(AUTOCOMPLETE_KIND_ATTR);
    }
}

/**
 * Applies a prior selection (from a reload, or a URL hash resolved against this same discovery)
 * to the Scope picker. There is no separate "populate the options" step to do first: the
 * dropdown computes its own rows on demand (see `getScopeCandidates`) straight from
 * `discovery`. A suite or test that no longer exists in `discovery` -- renamed or removed by the
 * very edit that triggered a reload -- resolves to nothing and leaves the picker at its default
 * (blank, ie. everything) rather than restoring a scope that would now run no tests.
 */
export function populateAndRestoreSelection(discovery: any, priorSelection: Selection | null) {
    const resolved = resolveScopeSelection(discovery, scopeValueFromSelection(priorSelection), scopeKindFromSelection(priorSelection));

    if (resolved.suiteTitle || resolved.testTitle) {
        setUiSelection(resolved);
    }
}
