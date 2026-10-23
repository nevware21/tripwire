/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { GenMapping, addMapping, setSourceContent, toEncodedMap } from "@jridgewell/gen-mapping";
import { TraceMap, eachMapping, sourceContentFor } from "@jridgewell/trace-mapping";

// eslint-disable-next-line security/detect-unsafe-regex
const _inlineSourceMapCommentRe = /\r?\n?\/\/[#@][ \t]*sourceMappingURL=data:application\/json(?:;charset=[^;]+)?;base64,([A-Za-z0-9+/=]+)\s*$/m;

// Matches *any* trailing sourceMappingURL comment, inline or external (eg. a pre-built
// vendor .js dependency's own "//# sourceMappingURL=foo.js.map" reference to a sibling
// file) -- used only by `_buildBundledModuleAsset`, which needs every chunk's own comment
// gone (each chunk's map is instead re-homed into one composite map for the whole bundle;
// see that function's doc comment), unlike `_extractAndShiftInlineSourceMap`'s inline-only
// match above.
const _anySourceMapCommentRe = /\r?\n?\/\/[#@][ \t]*sourceMappingURL=[^\r\n]*$/m;

/**
 * Extracts a module's inline base64 source map (if any), without the per-module-external-
 * file line-shift `_extractAndShiftInlineSourceMap` applies -- `_buildBundledModuleAsset`
 * computes its own, different offset (this module's actual position within the composite
 * bundle), so that unrelated +1 fudge doesn't apply here.
 */
function _extractInlineSourceMap(source: string): any | null {
    const match = source.match(_inlineSourceMapCommentRe);
    if (!match) {
        return null;
    }

    try {
        return JSON.parse(Buffer.from(match[1], "base64").toString("utf8"));
    } catch (e) {
        return null;
    }
}

/**
 * Counts newline characters in `text` -- used to track exactly which generated line each
 * module's wrapped block starts/ends on within the composite bundle, so `eachMapping`'s
 * per-module (pre-wrap) generated line numbers can be translated into the bundle's own.
 */
function _countNewlines(text: string): number {
    let count = 0;
    for (let i = 0; i < text.length; i++) {
        if (text.charCodeAt(i) === 10) {
            count++;
        }
    }
    return count;
}

/**
 * A module served at a URL ending `.ts` (mirroring its real project path, same as everything
 * else in this registry) with an *inline* source map is indistinguishable, to a browser or
 * DevTools, from the actual authored TypeScript it claims to map back to -- both the network
 * resource and the source map's own `sources` entry are "module.test.ts". DevTools picked the
 * former (the transpiled JS actually fetched over the network) rather than resolving through
 * to the mapped original. Splitting the map out to its own `<served-url>.map` resource --
 * exactly how a normal `tsc`/webpack build serves `foo.js` + `foo.js.map` -- gives the two
 * sides genuinely distinct URLs to resolve between (the caller is responsible for actually
 * renaming the served URL's extension to `.js`; see `_toAssetUrl` in execute.ts).
 *
 * Also shifts the extracted map's `mappings` down by one line to account for the
 * `__tripwireDefine__` wrapper prologue this module is about to be prefixed with (mappings
 * encode line position implicitly via `;`-separated groups, not explicit line numbers --
 * prepending a single bare `;` is an "empty line" that shifts everything after it down by
 * exactly one line, with no other changes needed).
 *
 * `sourcesContent` is kept embedded (tried removing it, on the theory that Chrome's
 * Authored/Deployed grouping was misclassifying the mapped original because of it -- forcing
 * a live fetch of `sources[0]` instead. Confirmed that wasn't actually what was driving the
 * grouping behavior, so reverted: keeping it embedded avoids the extra network round-trip
 * DevTools would otherwise need per file).
 *
 * @returns The module's JS text with the inline `sourceMappingURL` comment removed (the
 * caller appends its own external reference instead), and the shifted map object -- or
 * `map: null` when the source had no inline map to begin with (eg. a puppeteer/headless
 * launch without --coverage, which skips source map generation entirely -- see
 * `generateSourceMaps` in execute.ts).
 */
function _extractAndShiftInlineSourceMap(source: string): { jsWithoutInlineMap: string, map: any | null } {
    const match = source.match(_inlineSourceMapCommentRe);
    if (!match) {
        return { jsWithoutInlineMap: source, map: null };
    }

    try {
        const mapJson = JSON.parse(Buffer.from(match[1], "base64").toString("utf8"));
        mapJson.mappings = ";" + (mapJson.mappings || "");
        return { jsWithoutInlineMap: source.slice(0, match.index), map: mapJson };
    } catch (e) {
        return { jsWithoutInlineMap: source, map: null };
    }
}

/**
 * Server-side, every module is tracked by its resolved absolute filesystem path (`moduleId`)
 * -- coverage instrumentation's reachability walk, its external-map-file lookups, and nyc's
 * report generation all depend on that. But that absolute path (machine-specific, and on
 * Windows carrying an inconsistently-cased drive letter -- see execute.ts's `_toModuleAssetUrl`
 * docs) has no business appearing in anything actually sent to the browser: it would show up
 * verbatim as the literal first argument of every `__tripwireDefine__(...)` call and inside
 * every rewritten `require(...)` call in the served text. Rewrites each `require("<moduleId>")`
 * call to `require("<url>")` using the same `moduleId -> url` mapping the module itself is
 * registered under, so the served text -- and the require-graph's own keys, from the client's
 * point of view -- only ever contain clean, project/node_modules-relative URLs.
 */
function _rewriteRequireIds(source: string, moduleUrls: Record<string, string>): string {
    return source.replace(/require\(("(?:[^"\\]|\\.)*")\)/g, (all, jsonId) => {
        try {
            const id = JSON.parse(jsonId);
            const url = moduleUrls[id];
            return url ? "require(" + JSON.stringify(url) + ")" : all;
        } catch (e) {
            return all;
        }
    });
}

/**
 * Wraps every module's (possibly coverage-instrumented) source text in a self-registering
 * `__tripwireDefine__(id, factory)` call and stores the result keyed by the URL it will be
 * served at. Both the registration id and every `require(...)` call inside the wrapped text
 * use the module's clean, URL-mirroring id (see `_rewriteRequireIds`) -- the require-graph
 * the client actually sees never contains a raw absolute filesystem path.
 *
 * This is the single place the eval-free loading model's factory wrapper is introduced --
 * everything upstream (transpile, require-id rewriting, coverage instrumentation) stays
 * byte-compatible with the pre-refactor pipeline and is unaware that wrapping happens at
 * all. Must run strictly *after* coverage instrumentation, never before: istanbul's
 * reachability walk depends on the original absolute-path-keyed `require(...)` calls.
 */
export function _buildModuleAssetRegistry(
    instrumentedModules: Record<string, string>,
    moduleUrls: Record<string, string>
): Record<string, string> {
    const registry: Record<string, string> = {};

    const moduleIds = Object.keys(instrumentedModules);
    for (let lp = 0; lp < moduleIds.length; lp++) {
        const moduleId = moduleIds[lp];
        const url = moduleUrls[moduleId];
        if (!url) {
            continue;
        }

        const rewritten = _rewriteRequireIds(instrumentedModules[moduleId], moduleUrls);
        const { jsWithoutInlineMap, map } = _extractAndShiftInlineSourceMap(rewritten);

        let body = jsWithoutInlineMap;
        if (map) {
            // A relative (bare-filename) reference resolves against the served script's own
            // URL, same as any normal external source map -- no need to compute a full path.
            const mapUrl = url + ".map";
            const mapBaseName = mapUrl.slice(mapUrl.lastIndexOf("/") + 1);
            body += "\n//# sourceMappingURL=" + mapBaseName;

            // Tried explicitly setting sourceRoot to this module's own served directory (on
            // the theory it might help DevTools' Authored/Deployed classification) -- it
            // actively broke DevTools' file tree instead (the "group by folder" view stopped
            // showing the TS at all, and the "group by file" view showed sourceRoot appended
            // onto the real folder, eg. a garbled "adapters/test/src/assert/adapters" node).
            // Left unset: `sources` (a bare filename) already resolves correctly relative to
            // this map's own URL without it -- an empty/absent sourceRoot is also what tsc
            // itself emits by default.

            registry[mapUrl] = JSON.stringify(map);
        }

        registry[url] = "__tripwireDefine__(" + JSON.stringify(url) + ", function(require, module, exports, global, globalThis, window, self, process, __filename, __dirname) {\n"
            + body
            + "\n});\n";
    }

    return registry;
}

/**
 * Alternate to `_buildModuleAssetRegistry`: wraps and self-registers every module exactly
 * the same way (same `__tripwireDefine__(id, factory)` call, same rewritten require ids), but
 * concatenates them all into a single string instead of a per-module URL registry -- so the
 * whole graph can be served as one network resource (one `<script src>` / `importScripts()`
 * call) rather than one per module. Selected via `--bundle`/`ITripwireConfig.bundle`; see its
 * doc comment for the tradeoff this makes.
 *
 * Registration order doesn't matter (and isn't dependency-sorted here): every module's
 * factory is a self-registering closure that's only *invoked* later, lazily, when something
 * actually `require()`s it -- the same client-side loader (`installDefineRegistry`/
 * `createRequire` in `../shared/moduleLoader.ts`) used for the per-module registry works completely
 * unmodified against a bundle, since it only cares about the `id -> factory` registration,
 * never about which script tag or network request delivered it.
 *
 * Rather than dropping every module's own map (a naive concatenation can only honor the
 * *last* trailing `sourceMappingURL` comment in a file), this builds one composite map for
 * the whole bundle: each module's own mappings are copied in, with their generated line
 * numbers shifted by exactly where that module's wrapped block lands in the final bundle
 * text (tracked precisely via `_countNewlines` as each block is appended), and each
 * module's own served URL used as its `sources[]` entry so DevTools' file tree still shows
 * real, individually-breakpointable per-module source -- same fidelity as `--no-bundle`,
 * just delivered as one network resource/one `.map` instead of many. Skipped entirely (no
 * `.map` in the return value) when no module actually has an inline map to begin with (eg.
 * neither `--coverage` nor `--source-maps` was requested -- see `generateSourceMaps` in
 * execute.ts), so a plain speed-only bundle run pays nothing extra for this.
 */
export function _buildBundledModuleAsset(
    instrumentedModules: Record<string, string>,
    moduleUrls: Record<string, string>,
    bundleUrl: string
): { code: string, map: string | null } {
    const genMap = new GenMapping({ file: bundleUrl.slice(bundleUrl.lastIndexOf("/") + 1) });
    let bundleText = "";
    let nextGeneratedLine = 1;
    let sawMap = false;

    const moduleIds = Object.keys(instrumentedModules);
    for (let lp = 0; lp < moduleIds.length; lp++) {
        const moduleId = moduleIds[lp];
        const url = moduleUrls[moduleId];
        if (!url) {
            continue;
        }

        const rewritten = _rewriteRequireIds(instrumentedModules[moduleId], moduleUrls);
        const inlineMap = _extractInlineSourceMap(rewritten);
        const body = rewritten.replace(_anySourceMapCommentRe, "");

        const prologue = "__tripwireDefine__(" + JSON.stringify(url) + ", function(require, module, exports, global, globalThis, window, self, process, __filename, __dirname) {\n";
        bundleText += prologue;
        nextGeneratedLine += _countNewlines(prologue);
        const bodyStartLine = nextGeneratedLine;

        bundleText += body;
        nextGeneratedLine += _countNewlines(body);

        const epilogue = (body.length && body.charCodeAt(body.length - 1) === 10 ? "" : "\n") + "});\n";
        bundleText += epilogue;
        nextGeneratedLine += _countNewlines(epilogue);

        if (inlineMap) {
            try {
                const moduleTrace = new TraceMap(inlineMap);
                // A composite map needs one clean, unambiguous source name per module (many
                // modules can share the same bare filename, eg. several "index.ts" -- the
                // per-module external-map approach avoids this by giving each its own .map
                // file/directory instead). The module's own served URL, restored to a .ts
                // extension for the "Authored" tree, is already unique project-wide.
                const sourceName = url.replace(/\.js$/i, ".ts");
                let contentCopied = false;

                eachMapping(moduleTrace, (m) => {
                    if (m.source == null) {
                        return;
                    }

                    sawMap = true;
                    if (!contentCopied) {
                        const content = sourceContentFor(moduleTrace, m.source);
                        if (content != null) {
                            setSourceContent(genMap, sourceName, content);
                        }
                        contentCopied = true;
                    }

                    addMapping(genMap, {
                        generated: { line: bodyStartLine + (m.generatedLine - 1), column: m.generatedColumn },
                        source: sourceName,
                        original: { line: m.originalLine, column: m.originalColumn },
                        name: m.name || undefined
                    } as any);
                });
            } catch (e) {
                // Best-effort: this module's block still executes correctly (only its own
                // DevTools mapping is lost) -- never abort the whole bundle over a malformed
                // per-module map.
            }
        }
    }

    if (!sawMap) {
        return { code: bundleText, map: null };
    }

    const mapUrl = bundleUrl + ".map";
    const mapBaseName = mapUrl.slice(mapUrl.lastIndexOf("/") + 1);
    bundleText += "//# sourceMappingURL=" + mapBaseName + "\n";

    return { code: bundleText, map: JSON.stringify(toEncodedMap(genMap)) };
}
