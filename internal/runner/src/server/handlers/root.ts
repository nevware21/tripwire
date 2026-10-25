/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { doAwait, IPromise } from "@nevware21/ts-async";
import { IServerRequest } from "../../interfaces/IServerRequest";
import { _readDirEntries } from "./fs";

function _escapeHtml(value: string): string {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function _titleCase(name: string): string {
    return name ? name.charAt(0).toUpperCase() + name.slice(1) : name;
}

/**
 * Builds the runner shortcut links (Browser/Worker/any other visible registered action, eg.
 * Status) as a small `<ul>` -- link *text* is always a clean, human label (never the raw
 * href), so the internal `__tripwire__` routing prefix never shows up on the page itself,
 * only in the (non-visible) href attribute.
 */
function _buildShortcutsHtml(request: IServerRequest): string {
    const actions = request.actions || [];
    const hasRunnerActions = actions.some((a) => a && a.name === "__tripwire__");

    let items = "";
    if (hasRunnerActions) {
        items += "<li><a href=\"/__tripwire__/browser\">Browser</a> <span class=\"fs-shortcut-desc\">— Run tests in browser mode</span></li>\n";
        items += "<li><a href=\"/__tripwire__/worker\">Worker</a> <span class=\"fs-shortcut-desc\">— Run tests in browser worker mode</span></li>\n";
    }

    actions
        .filter((action) => action && action.name !== "" && action.name !== "__tripwire__" && action.name !== "api" && action.showInIndex !== false)
        .forEach((action) => {
            const href = action.href || ("/" + action.name);
            const label = _titleCase(action.name);
            const desc = action.description ? " <span class=\"fs-shortcut-desc\">— " + _escapeHtml(action.description) + "</span>" : "";
            items += "<li><a href=\"" + _escapeHtml(href) + "\">" + _escapeHtml(label) + "</a>" + desc + "</li>\n";
        });

    return items ? "<ul class=\"fs-shortcuts\">\n" + items + "</ul>" : "";
}

function _buildFallbackHtml(shortcutsHtml: string, entries: { name: string, isDir: boolean }[]): string {
    let text = "Index of /\n\n";
    for (let i = 0; i < entries.length; i++) {
        text += (entries[i].isDir ? "[DIR]  " : "[FILE] ") + entries[i].name + "\n";
    }
    return shortcutsHtml + "<pre>" + _escapeHtml(text) + "</pre>";
}

/**
 * Handle the root ("/") request -- shows the runner shortcut links (Browser/Worker/Status,
 * etc, with clean link text that never surfaces the internal `__tripwire__` routing prefix)
 * together with a directory listing of `fsRoot`, reusing the exact same styled listing
 * `_handleFileSystemRequest` renders for any other directory (see `context.getFsListingHtml`).
 */
export function _handleRootRequest(request: IServerRequest): IPromise<void> | void {
    const req = request.req;
    const res = request.res;
    const reqPath = (req.url || "").split("?")[0];

    if (!request.method.isGet || reqPath !== "/") {
        res.statusCode = 404;
        res.end("Not Found");
        return;
    }

    const fsRoot = request.context.fsRoot || process.cwd();
    const style = (request.context.browserStyle as any) || "classic";
    const shortcutsHtml = _buildShortcutsHtml(request);

    return doAwait(_readDirEntries(fsRoot), (entries) => {
        const html = request.context.getFsListingHtml
            ? request.context.getFsListingHtml(style, "", entries, shortcutsHtml)
            : _buildFallbackHtml(shortcutsHtml, entries);

        res.statusCode = 200;
        res.setHeader("content-type", "text/html; charset=utf-8");
        res.end(html);
    }, () => {
        res.statusCode = 500;
        res.end("Internal Server Error");
    });
}
