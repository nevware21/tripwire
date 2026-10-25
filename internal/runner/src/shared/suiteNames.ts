/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

/**
 * Suite/test naming helpers shared by every target (node CLI, browser frame, worker) and by
 * the interactive browser UI.
 *
 * Everything under `src/shared/` is deliberately dependency-light: no node builtins, no
 * imports from `../ux` (whose barrel pulls the inlined HTML/CSS resource graph), and no
 * barrel of its own -- importers name the file directly. That is what makes it safe for the
 * minimal `runner-worker.js` bundle to pull from, which is why these implementations no
 * longer need a per-target copy.
 */

import { asString, strLower } from "@nevware21/ts-utils";

/**
 * Identifies the synthetic root suite that `createSuite()`/`getRootSuite()` create, so its
 * name can be dropped from displayed and grep-matched titles. An empty/absent description is
 * treated as root as well -- there is nothing to contribute either way.
 */
export function isRootSuiteName(value: any): boolean {
    let result = true;

    if (value) {
        const text = strLower(asString(value));

        result = (text === "root" || text === "(root)");
    }

    return result;
}

/**
 * Walks a suite node up to (but not including) the root, returning its title parts
 * outermost-first.
 */
export function getSuitePartsFromNode(node: any): string[] {
    const parts: string[] = [];
    let current = node;

    while (current) {
        if (current.description && !isRootSuiteName(current.description)) {
            parts.unshift(current.description);
        }

        current = current.parent;
    }

    return parts;
}

export function makeSuiteKey(parts: any[]): string {
    return parts.length ? parts.join(" > ") : "(default suite)";
}

export function getSuiteDisplayName(parts: any[]): string {
    return parts.length ? parts[parts.length - 1] : "(default suite)";
}

export function getSuiteKeyChain(parts: any[]): string[] {
    const chain: string[] = [];

    if (!parts || !parts.length) {
        chain.push(makeSuiteKey([]));
    } else {
        for (let idx = 1; idx <= parts.length; idx++) {
            chain.push(makeSuiteKey(parts.slice(0, idx)));
        }
    }

    return chain;
}

export function makeTestKey(suiteParts: any[], testName: any): string {
    return makeSuiteKey(suiteParts) + " :: " + (testName || "(unnamed test)");
}

/**
 * The space-joined title a `--grep` pattern is matched against, and the `>`-joined title the
 * interactive UI's suite/test selection matches on, are built from the same parts but with
 * different separators -- kept together here so the two can never drift apart.
 */
export function makeGrepTitle(suiteParts: string[], testName: any): string {
    return (suiteParts.length ? suiteParts.join(" ") + " " : "") + (testName || "");
}

export function createAssertionLabel(ctx: any): string {
    let result = "(assertion)";

    if (ctx) {
        if (ctx.message) {
            result = asString(ctx.message);
        } else if (ctx.opPath && ctx.opPath.length) {
            result = ctx.opPath.join(".");
        }
    }

    return result;
}
