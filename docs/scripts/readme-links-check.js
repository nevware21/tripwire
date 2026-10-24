/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

/**
 * Validates every link in every README in the repository.
 *
 * Ported from the `readme-links-check.js` in nevware21/ts-utils, and widened in two ways that this
 * repository needs:
 *
 * - **Every README, not just the root one.** There are eleven, spread across `core/`, `globals/`,
 *   `shim/chai/`, `docs/` and the two projects under `internal/`, and they link to each other.
 * - **Relative links as well as documentation-site links.** The ts-utils version checks only
 *   `https://nevware21.github.io/...` URLs. Relative links are the ones that actually broke here:
 *   moving `benchmark/` and `runner/` under `internal/` silently invalidated paths in several
 *   files, and nothing noticed.
 *
 * No network calls -- every check resolves against files in the working tree, so it is fast,
 * deterministic and works offline. Links to other hosts are counted and skipped.
 *
 * Run it with `npm run link-check`, or `npm run readme-link-check` to generate the typedoc output
 * first so the `/typedoc/` links can be verified too.
 */

"use strict";

const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const DOCS_DIR = path.join(REPO_ROOT, "docs");
const TYPEDOC_DIR = path.join(DOCS_DIR, "typedoc");

const DOC_SITE_ROOT = "https://nevware21.github.io/tripwire";
const DOC_BASE_URL = DOC_SITE_ROOT + "/";
const TYPEDOC_PREFIX = "typedoc/";

// Directories that never contain a README worth checking: dependency trees, build output,
// generated documentation and tool scratch space.
const SKIP_DIRS = new Set([
    "node_modules", ".git", ".vs", ".rush", "rush-logs", "common/temp",
    "build", "dist", "bundle", "coverage", ".nyc_output", ".benchmark", "typedoc"
]);

/**
 * Walks `dir` collecting every README.md, skipping the directories above.
 */
function _findReadmes(dir, found) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            if (!SKIP_DIRS.has(entry.name)) {
                _findReadmes(full, found);
            }
        } else if (entry.isFile() && entry.name.toLowerCase() === "readme.md") {
            found.push(full);
        }
    }

    return found;
}

/**
 * Fenced code blocks are stripped before any link is extracted -- a markdown link inside a
 * ```-fenced example is illustration, not a link this repository is making, and checking it
 * produces failures for files that were never meant to exist.
 */
function _stripCodeFences(text) {
    return text.replace(/^```[\s\S]*?^```/gm, "");
}

/**
 * The anchor ids a markdown file offers, derived from its headings the way GitHub derives them.
 *
 * Two slugs are recorded per heading rather than one. GitHub's exact rules around emphasis and
 * underscores are fiddly (`## _foo_` becomes `foo`, but `## foo_bar` stays `foo_bar`), and a
 * checker that guesses wrong fails a link that actually works. Accepting either spelling keeps the
 * useful half of the check -- a genuinely wrong anchor matches neither -- without the false
 * failures. Repeated headings get GitHub's `-1`, `-2` suffixes.
 */
function _headingAnchors(filePath) {
    const anchors = new Set();
    const seen = Object.create(null);
    let text;

    try {
        text = _stripCodeFences(fs.readFileSync(filePath, "utf8"));
    } catch (e) {
        return anchors;
    }

    const headingRegex = /^#{1,6}\s+(.*)$/gm;
    let match;

    while ((match = headingRegex.exec(text)) !== null) {
        const title = match[1].replace(/<[^>]+>/g, "").replace(/`/g, "").trim();

        // GitHub replaces each space with its own hyphen and does *not* collapse runs, so
        // "`describe` / `it` names" becomes "describe--it-names" -- the removed "/" leaves two
        // spaces behind, and therefore two hyphens. Both spellings are offered because other
        // renderers do collapse them.
        const slug = (t) => t.toLowerCase().replace(/[^\w\s-]/g, "").trim().replace(/\s/g, "-");
        const keepUnderscores = slug(title);
        const dropUnderscores = slug(title.replace(/_/g, ""));

        for (const base of [ keepUnderscores, dropUnderscores, keepUnderscores.replace(/-{2,}/g, "-"), dropUnderscores.replace(/-{2,}/g, "-") ]) {
            if (!base) {
                continue;
            }

            const count = seen[base] || 0;
            anchors.add(count === 0 ? base : base + "-" + count);
            // Also offer the suffixed forms, since which heading a duplicate refers to is not
            // knowable from the link alone.
            anchors.add(base);
            anchors.add(base + "-1");
            anchors.add(base + "-2");
        }

        seen[keepUnderscores] = (seen[keepUnderscores] || 0) + 1;
    }

    return anchors;
}

const _anchorCache = Object.create(null);

function _anchorsFor(filePath) {
    const key = path.resolve(filePath).toLowerCase();
    if (!_anchorCache[key]) {
        _anchorCache[key] = _headingAnchors(filePath);
    }

    return _anchorCache[key];
}

/**
 * Extracts every link target from a README: markdown `[text](target)` links, and bare
 * documentation-site URLs sitting in prose.
 */
function _extractTargets(text) {
    const body = _stripCodeFences(text);
    const targets = new Set();
    let match;

    const mdLink = /\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+["'][^"']*["'])?\s*\)/g;
    while ((match = mdLink.exec(body)) !== null) {
        targets.add(match[1]);
    }

    const bareDocUrl = new RegExp(DOC_SITE_ROOT.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[^\\s)\"'`<>\\]]*", "gi");
    while ((match = bareDocUrl.exec(body)) !== null) {
        targets.add(match[0]);
    }

    return Array.from(targets);
}

function _splitAnchor(target) {
    const hash = target.indexOf("#");
    if (hash === -1) {
        return { pathPart: target, anchor: "" };
    }

    return { pathPart: target.slice(0, hash), anchor: target.slice(hash + 1) };
}

function _rel(p) {
    return path.relative(REPO_ROOT, p).replace(/\\/g, "/");
}

/**
 * Resolves a documentation-site URL back to the markdown source it is published from.
 * `test-runner.html` is `docs/test-runner.md`; the bare site root is `docs/README.md`.
 */
function _docSourceFor(sitePath) {
    if (!sitePath || sitePath === "/") {
        return path.join(DOCS_DIR, "README.md");
    }

    if (sitePath.endsWith("/")) {
        return path.join(DOCS_DIR, sitePath, "README.md");
    }

    if (/\.html$/i.test(sitePath)) {
        return path.join(DOCS_DIR, sitePath.replace(/\.html$/i, ".md"));
    }

    // A file served as-is from docs/ (llms.txt, an image): the published URL is the source path.
    // Checked before the extensionless rule below, which would otherwise look for "llms.txt.md".
    // Jekyll never publishes a path segment starting with "_" (its own directories and any file
    // excluded that way), so such a file existing on disk does not make the link work.
    const asIs = path.join(DOCS_DIR, sitePath);
    if (/\.[a-z0-9]+$/i.test(sitePath) && !/(^|[\\/])_/.test(sitePath) && fs.existsSync(asIs)) {
        return asIs;
    }

    // GitHub Pages serves an extensionless request from the generated .html, so
    // ".../change-assertions" is a working link to docs/change-assertions.md. Verified against
    // the live site rather than assumed.
    return path.join(DOCS_DIR, sitePath + ".md");
}

const results = {
    checked: 0,
    external: 0,
    typedocUnverified: 0,
    errors: [],
    notes: []
};

const typedocAvailable = fs.existsSync(TYPEDOC_DIR);
const linkedDocSources = new Set();

function _error(readme, target, reason) {
    results.errors.push({ readme: _rel(readme), target, reason });
}

function _checkAnchor(readme, target, mdFile, anchor) {
    if (!anchor) {
        return;
    }

    const anchors = _anchorsFor(mdFile);
    if (anchors.size && !anchors.has(anchor.toLowerCase())) {
        _error(readme, target, "no heading in " + _rel(mdFile) + " produces the anchor #" + anchor);
    }
}

function _checkDocSiteLink(readme, target) {
    let rest = target.slice(DOC_SITE_ROOT.length);
    if (rest.startsWith("/")) {
        rest = rest.slice(1);
    }

    const { pathPart, anchor } = _splitAnchor(rest);

    if (/\.md$/i.test(pathPart)) {
        _error(readme, target, "documentation-site links must be .html, not .md (the site publishes " +
            pathPart.replace(/\.md$/i, ".html") + ")");
        return;
    }

    if (pathPart.toLowerCase().startsWith(TYPEDOC_PREFIX)) {
        if (!typedocAvailable) {
            results.typedocUnverified++;
            return;
        }

        let local = path.join(DOCS_DIR, pathPart);
        if (pathPart.endsWith("/")) {
            local = path.join(local, "index.html");
        }

        if (!fs.existsSync(local)) {
            _error(readme, target, "no generated typedoc page at " + _rel(local));
        }

        return;
    }

    const source = _docSourceFor(pathPart);
    if (!fs.existsSync(source)) {
        _error(readme, target, "no documentation source at " + _rel(source));
        return;
    }

    linkedDocSources.add(path.resolve(source).toLowerCase());
    _checkAnchor(readme, target, source, anchor);
}

function _checkRelativeLink(readme, target) {
    const { pathPart, anchor } = _splitAnchor(target);
    const decoded = decodeURIComponent(pathPart);
    const resolved = path.resolve(path.dirname(readme), decoded);

    if (!fs.existsSync(resolved)) {
        _error(readme, target, "does not exist (" + _rel(resolved) + ")");
        return;
    }

    if (/\.md$/i.test(resolved) && fs.statSync(resolved).isFile()) {
        _checkAnchor(readme, target, resolved, anchor);

        // Informational only: a README outside docs/ linking a guide by relative path rather than
        // through the documentation site. Correct on GitHub, but it is not the published link.
        if (resolved.toLowerCase().startsWith(DOCS_DIR.toLowerCase()) &&
            !path.dirname(readme).toLowerCase().startsWith(DOCS_DIR.toLowerCase())) {
            const note = _rel(readme) + " links " + _rel(resolved) +
                " by relative path rather than its " + DOC_SITE_ROOT + "/ URL";
            if (results.notes.indexOf(note) === -1) {
                results.notes.push(note);
            }
        }

        linkedDocSources.add(path.resolve(resolved).toLowerCase());
    }
}

function _checkReadme(readme) {
    const text = fs.readFileSync(readme, "utf8");
    const targets = _extractTargets(text);
    const before = results.errors.length;
    let checked = 0;

    for (const target of targets) {
        if (/^(mailto:|tel:)/i.test(target)) {
            results.external++;
            continue;
        }

        if (target === DOC_SITE_ROOT || target.startsWith(DOC_BASE_URL)) {
            checked++;
            _checkDocSiteLink(readme, target);
            continue;
        }

        if (/^[a-z][a-z0-9+.-]*:\/\//i.test(target)) {
            results.external++;
            continue;
        }

        if (target.startsWith("#")) {
            checked++;
            _checkAnchor(readme, target, readme, target.slice(1));
            continue;
        }

        checked++;
        _checkRelativeLink(readme, target);
    }

    results.checked += checked;

    const failures = results.errors.length - before;
    const status = failures ? "❌" : "✅";
    console.log("  " + status + " " + _rel(readme) + " -- " + checked + " link(s) checked" +
        (failures ? ", " + failures + " broken" : ""));
}

function main() {
    console.log("\nChecking every README's links");
    console.log("=============================\n");

    const readmes = _findReadmes(REPO_ROOT, []).sort();
    console.log("Found " + readmes.length + " README file(s).\n");

    readmes.forEach(_checkReadme);

    if (results.errors.length) {
        console.log("\n❌ " + results.errors.length + " broken link(s):\n");
        results.errors.forEach((e) => {
            console.log("  " + e.readme);
            console.log("    " + e.target);
            console.log("    -> " + e.reason + "\n");
        });
    }

    // Documentation pages nothing links to. Informational -- a guide can legitimately be reachable
    // only from the docs index -- but a page no README mentions is usually one that was forgotten.
    const docSources = [];
    (function collect(dir) {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (!SKIP_DIRS.has(entry.name)) {
                    collect(full);
                }
            } else if (/\.md$/i.test(entry.name) && entry.name.toLowerCase() !== "readme.md") {
                docSources.push(full);
            }
        }
    })(DOCS_DIR);

    const unlinked = docSources.filter((f) => !linkedDocSources.has(path.resolve(f).toLowerCase()));
    if (unlinked.length) {
        console.log("\nℹ️  " + unlinked.length + " documentation page(s) not linked from any README:");
        console.log("   (informational -- they may be reachable from docs/README.md alone)");
        unlinked.forEach((f) => console.log("  - " + _rel(f)));
    }

    if (results.notes.length) {
        console.log("\nℹ️  " + results.notes.length + " relative link(s) to published guides:");
        console.log("   (informational -- correct on GitHub, but not the published URL)");
        results.notes.forEach((n) => console.log("  - " + n));
    }

    console.log("\n" + results.checked + " link(s) checked, " + results.external + " external link(s) skipped.");

    if (results.typedocUnverified) {
        console.log("\n⚠️  " + results.typedocUnverified + " /typedoc/ link(s) NOT verified -- " +
            _rel(TYPEDOC_DIR) + " has not been generated.");
        console.log("   Run \"npm run readme-link-check\" (which runs \"npm run docs\" first) to check them.");
    }

    if (results.errors.length) {
        console.log("\n❌ Test failed: " + results.errors.length + " broken link(s) across " +
            new Set(results.errors.map((e) => e.readme)).size + " file(s).");
        process.exit(1);
    }

    console.log("\n✅ Test passed: every README link resolves.");
}

main();
