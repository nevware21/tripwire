/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

/**
 * The two targets the dev server serves interactively, and how to get from one to the other.
 *
 * Both are always available from a single session regardless of which one `--target` named:
 * the server registers `/__tripwire__/browser` and `/__tripwire__/worker` side by side and the
 * session cache builds whichever is asked for, on demand. Switching is therefore nothing more
 * than navigating to the sibling URL -- no CLI restart, and no second server.
 *
 * Nothing here touches the DOM, so it is unit-tested in node; `client.ts` owns the navigation
 * itself and `dom.ts` uses {@link targetFromPath} to work out which page it is running on.
 */

/** A target's path segment, which is also the value of the Target picker's options. */
export type RunnerTarget = "browser" | "worker";

/** The parts of a location a target switch has to preserve. */
export interface IUrlParts {
    pathname: string;
    search: string;
    hash: string;
}

const _TARGET_PATH = /\/(browser|worker)(\/?)$/i;

/**
 * The target `pathname` names, or "" when it names neither -- eg. the server index, or a page
 * being served from somewhere this pattern does not describe.
 */
export function targetFromPath(pathname: string): string {
    const match = _TARGET_PATH.exec(pathname || "");

    return match ? match[1].toLowerCase() : "";
}

/**
 * The URL of the same page on the other target.
 *
 * The query string and hash ride along untouched, which is the point: the hash is where the
 * current scope lives (see urlState.ts), so switching target keeps whatever suite or test is
 * selected rather than resetting to the whole suite. The ids it carries are resolved against
 * the new page's own discovery, and both targets run the same test files.
 *
 * A pathname that names no target is returned unchanged -- there is nothing to switch.
 */
export function buildTargetUrl(parts: IUrlParts, target: string): string {
    const pathname = (parts && parts.pathname) || "";

    if (!targetFromPath(pathname)) {
        return pathname + ((parts && parts.search) || "") + ((parts && parts.hash) || "");
    }

    return pathname.replace(_TARGET_PATH, "/" + target + "$2") + ((parts && parts.search) || "") + ((parts && parts.hash) || "");
}
