/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

/*
 * These imports are resolved at bundle time by the Rollup inlineText plugin,
 * which embeds the file contents as string constants. No runtime fs access required.
 * DO NOT replace with runtime fs.readFileSync — the bundled ux.js has no access
 * to the source/build resource paths at runtime.
 */
import htmlTemplate from "../resources/templates/runner.html";
import frameHtmlTemplate from "../resources/templates/frame.html";
import cssBase from "../resources/styles/base.css";
import cssClassic from "../resources/styles/classic.css";
import cssSlate from "../resources/styles/slate.css";
import { TestTarget } from "@nevware21/tripwire";
import { BrowserUiStyle } from "../../types/BrowserUiStyle";
import { IFsEntry } from "../../interfaces/IFsEntry";

const _cssMap: Record<string, string> = {
    "classic": cssClassic,
    "slate": cssSlate
};

function _escapeHtmlAttr(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

export function createTestFrameHtml(target: TestTarget, _style: BrowserUiStyle, moduleScriptUrls: string[]): string {
    const scriptUrl = "/__tripwire__/runner-client.js";
    const moduleScripts = (moduleScriptUrls || [])
        .map((url) => "  <script src=\"" + _escapeHtmlAttr(url) + "\" defer></script>")
        .join("\n");

    return frameHtmlTemplate
        .replace(/__FRAME_TARGET__/g, target)
        .replace(/__FRAME_MODULE_SCRIPTS__/g, moduleScripts)
        .replace(/__FRAME_SCRIPT_URL__/g, scriptUrl);
}

export function createBrowserRunnerHtml(target: TestTarget, style: BrowserUiStyle): string {
    const title = target === "worker" ? "Tripwire Worker Runner" : "Tripwire Browser Runner";
    const description = "This page runs tests using tripwire's native runner and reporter pipeline, with suite/test filtering and assertion timeline UI.";
    const scriptUrl = "/__tripwire__/runner-client.js";
    const styleClassName = "style-" + style;

    const cssStyle = _cssMap[style] || cssClassic;
    const css = cssBase + "\n\n" + cssStyle;

    return htmlTemplate
        .replace(/__RUNNER_TITLE__/g, title)
        .replace(/__RUNNER_DESCRIPTION__/g, description)
        .replace(/__RUNNER_STYLE_CLASS__/g, styleClassName)
        .replace(/__RUNNER_TARGET__/g, target)
        .replace(/__RUNNER_CSS__/g, css)
        .replace(/__RUNNER_SCRIPT_URL__/g, scriptUrl);
}

function _escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function _formatSize(bytes: number): string {
    if (bytes < 1024) {
        return bytes + " B";
    }
    if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(1) + " KB";
    }
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function _buildBreadcrumb(relativePath: string): string {
    const parts = relativePath.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
    let html = "<nav class=\"fs-breadcrumb\">";
    html += "<a href=\"/\">/</a>";
    let accumulated = "";
    for (let i = 0; i < parts.length; i++) {
        accumulated += "/" + parts[i];
        if (i < parts.length - 1) {
            html += " / <a href=\"" + _escapeHtml(accumulated) + "/\">" + _escapeHtml(parts[i]) + "</a>";
        } else {
            html += " / <span>" + _escapeHtml(parts[i]) + "</span>";
        }
    }
    html += "</nav>";
    return html;
}

/**
 * Generates a styled HTML page listing the contents of a directory, suitable for serving as
 * the response to a request the server's root-level filesystem fallback is handling (there is
 * no dedicated `/fs/...` route -- see `IServerContext.fsRoot`'s doc comment).
 *
 * The page reuses the same base CSS and theme variables (classic / slate) as the
 * browser runner UI for a consistent look.
 *
 * @param style       - The UI style to apply (`"classic"` or `"slate"`).
 * @param relativePath - The path relative to fsRoot being listed (e.g. `"src/utils"`).
 * @param entries      - The directory entries to display.
 * @param extraHtml    - Optional extra HTML rendered between the header and the entries
 * table (eg. the root ("/") listing's runner shortcut links).
 * @returns A complete HTML document string.
 */
export function createFsDirListingHtml(style: BrowserUiStyle, relativePath: string, entries: IFsEntry[], extraHtml?: string): string {
    const cssStyle = _cssMap[style] || cssClassic;
    const css = cssBase + "\n\n" + cssStyle + "\n\n" + [
        ".fs-breadcrumb { margin-bottom: 10px; font-size: 0.9rem; color: var(--muted); }",
        ".fs-breadcrumb a { color: var(--accent); text-decoration: none; }",
        ".fs-breadcrumb a:hover { text-decoration: underline; }",
        ".fs-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }",
        ".fs-table th { text-align: left; padding: 6px 10px; border-bottom: 2px solid var(--border); color: var(--muted); font-weight: 600; }",
        ".fs-table td { padding: 5px 10px; border-bottom: 1px solid var(--border-subtle); }",
        ".fs-table tr:last-child td { border-bottom: none; }",
        ".fs-table tr:hover td { background: var(--state-running-bg); }",
        ".fs-icon { margin-right: 6px; }",
        ".fs-name a { color: var(--accent); text-decoration: none; }",
        ".fs-name a:hover { text-decoration: underline; }",
        ".fs-size { color: var(--muted); text-align: right; white-space: nowrap; }",
        ".fs-modified { color: var(--muted); white-space: nowrap; font-size: 0.8rem; }",
        ".fs-shortcuts { list-style: none; margin: 0 0 16px; padding: 0; font-size: 0.9rem; }",
        ".fs-shortcuts li { margin: 4px 0; }",
        ".fs-shortcuts a { color: var(--accent); text-decoration: none; font-weight: 600; }",
        ".fs-shortcuts a:hover { text-decoration: underline; }",
        ".fs-shortcuts .fs-shortcut-desc { color: var(--muted); }"
    ].join("\n");

    const styleClass = "style-" + style;
    const normalizedPath = ("/" + relativePath).replace(/\/+/g, "/").replace(/\/$/, "") || "/";
    const displayPath = normalizedPath === "/" ? "/" : normalizedPath + "/";
    const breadcrumb = _buildBreadcrumb(relativePath);

    // Sort: directories first, then files, both alphabetically
    const sorted = entries.slice().sort((a, b) => {
        if (a.isDir !== b.isDir) {
            return a.isDir ? -1 : 1;
        }
        return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
    });

    let rows = "";

    // Parent directory link (shown when not at root)
    if (normalizedPath !== "/") {
        const parentPath = normalizedPath.substring(0, normalizedPath.lastIndexOf("/")) || "/";
        const parentHref = (parentPath === "/" ? "/" : parentPath + "/");
        rows += "<tr>";
        rows += "<td class=\"fs-name\"><span class=\"fs-icon\">&#128193;</span><a href=\"" + _escapeHtml(parentHref) + "\">..</a></td>";
        rows += "<td class=\"fs-size\">—</td>";
        rows += "<td class=\"fs-modified\"></td>";
        rows += "</tr>";
    }

    for (let i = 0; i < sorted.length; i++) {
        const entry = sorted[i];
        const entryRelPath = (normalizedPath === "/" ? "" : normalizedPath) + "/" + entry.name;
        const href = entryRelPath + (entry.isDir ? "/" : "");
        const icon = entry.isDir ? "&#128193;" : "&#128196;";
        const sizeCell = entry.isDir ? "—" : (entry.size !== undefined ? _formatSize(entry.size) : "—");
        const modCell = entry.modified ? entry.modified.toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC") : "";

        rows += "<tr>";
        rows += "<td class=\"fs-name\"><span class=\"fs-icon\">" + icon + "</span><a href=\"" + _escapeHtml(href) + "\">" + _escapeHtml(entry.name) + "</a></td>";
        rows += "<td class=\"fs-size\">" + sizeCell + "</td>";
        rows += "<td class=\"fs-modified\">" + _escapeHtml(modCell) + "</td>";
        rows += "</tr>";
    }

    return "<!doctype html>\n<html>\n<head>\n" +
        "  <meta charset=\"utf-8\" />\n" +
        "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />\n" +
        "  <title>Index of " + _escapeHtml(displayPath) + "</title>\n" +
        "  <style>\n" + css + "\n  </style>\n" +
        "</head>\n" +
        "<body class=\"" + _escapeHtml(styleClass) + "\">\n" +
        "  <div class=\"app-shell\">\n" +
        "    <header class=\"app-header\">\n" +
        "      <h1>Index of " + _escapeHtml(displayPath) + "</h1>\n" +
        "    </header>\n" +
        "    " + breadcrumb + "\n" +
        (extraHtml ? "    " + extraHtml + "\n" : "") +
        "    <div class=\"results-tree\">\n" +
        "      <table class=\"fs-table\">\n" +
        "        <thead><tr><th>Name</th><th>Size</th><th>Modified</th></tr></thead>\n" +
        "        <tbody>" + rows + "</tbody>\n" +
        "      </table>\n" +
        "    </div>\n" +
        "  </div>\n" +
        "</body>\n</html>";
}
