/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import * as fs from "fs";
import * as path from "path";
import { objHasOwnProperty } from "@nevware21/ts-utils";
import { TraceMap, originalPositionFor } from "@jridgewell/trace-mapping";

/**
 * Rewrites a stack trace's frames from the minified `bin` bundle back onto the runner's real
 * TypeScript sources, using the source map rollup already emits alongside it.
 *
 * The CLI ships as one uglified file, so an unmapped runner stack is a wall of
 * `at yo (tripwire.js:2:143518)` -- technically a stack, practically useless. Everything needed
 * to undo that is already on disk next to the bundle (`tripwire.js.map`), and
 * `@jridgewell/trace-mapping` is already bundled for the coverage pipeline, so mapping costs a
 * file read and no new dependency.
 *
 * Only reached behind `--debug-stack`; a normal run never pays for it.
 */

/**
 * The `    at ` a stack frame opens with. Everything after it is picked apart by
 * {@link _parseFrame} rather than by one big pattern: a frame's file part is a Windows path
 * with its own colons, so a regex that also has to find the trailing `:line:col` needs
 * ambiguous lazy groups to tell them apart -- exactly the shape that backtracks badly.
 */
const _FRAME_START_RE = /^\s*at\s+/;

/** The trailing `:line:col`, optionally inside the closing paren. Anchored, so unambiguous. */
const _FRAME_POSITION_RE = /:(\d+):(\d+)\)?$/;

const _SOURCE_MAP_URL_MARKER = "sourceMappingURL=";
const _INLINE_MAP_PREFIX = "data:application/json";
const _BASE64_MARKER = ";base64,";

/**
 * One frame, split into the parts that can be remapped independently.
 */
interface IStackFrame {
    /** Leading whitespace and the `at ` keyword, reproduced verbatim. */
    prefix: string;

    /** The (usually mangled) function name, or `""` for an anonymous frame. */
    name: string;

    /** The file the frame points at. */
    file: string;

    line: number;
    column: number;
}

/**
 * Splits `    at name (file:line:col)` (or the anonymous `    at file:line:col`) into its parts,
 * working from the right so a Windows drive letter or a path containing ` (` cannot be mistaken
 * for the position or the name separator.
 *
 * @returns The parsed frame, or `null` if the line is not a frame at all (the message line,
 * a `--- async ---` marker, blank text).
 */
function _parseFrame(line: string): IStackFrame | null {
    const trimmed = line.replace(/\s+$/, "");
    const start = _FRAME_START_RE.exec(trimmed);
    if (!start) {
        return null;
    }

    const position = _FRAME_POSITION_RE.exec(trimmed);
    if (!position) {
        return null;
    }

    const head = trimmed.slice(start[0].length, position.index);
    let name = "";
    let file = head;

    // `at yo (D:\...\tripwire.js` -- the last ` (` is the name/file boundary, since a function
    // name cannot contain one but a path can.
    const parenAt = head.lastIndexOf(" (");
    if (parenAt !== -1) {
        name = head.slice(0, parenAt);
        file = head.slice(parenAt + 2);
    }

    return {
        prefix: start[0],
        name,
        file,
        line: parseInt(position[1], 10),
        column: parseInt(position[2], 10)
    };
}

/**
 * Extracts the URL from a `//# sourceMappingURL=...` comment line, or `""` when the line is not
 * one. Written with `indexOf`/`slice` rather than a pattern for the same reason as
 * {@link _parseFrame}.
 */
function _sourceMapUrl(line: string): string {
    const marker = line.indexOf(_SOURCE_MAP_URL_MARKER);
    if (marker === -1 || line.lastIndexOf("//", marker) === -1) {
        return "";
    }

    return line.slice(marker + _SOURCE_MAP_URL_MARKER.length).replace(/\s+$/, "");
}

/**
 * The base64 payload of an inline `data:application/json;base64,` map URL, or `""` when the URL
 * points at a separate file instead.
 */
function _inlineMapPayload(url: string): string {
    if (url.indexOf(_INLINE_MAP_PREFIX) !== 0) {
        return "";
    }

    const base64At = url.indexOf(_BASE64_MARKER);

    return base64At === -1 ? "" : url.slice(base64At + _BASE64_MARKER.length);
}

/**
 * `null` records a file we already looked at and found no usable map for, so a stack with forty
 * frames in the same bundle does one lookup rather than forty.
 */
const _mapCache: { [file: string]: TraceMap | null } = {};

/**
 * Reads whatever source map belongs to `jsFile`: a sibling `.js.map` first (what rollup emits
 * for the `bin` bundles), then an inline `sourceMappingURL` data URI, then a relative one.
 */
function _readSourceMap(jsFile: string): { map: any, mapDir: string } | null {
    const sibling = jsFile + ".map";

    // eslint-disable-next-line security/detect-non-literal-fs-filename
    if (fs.existsSync(sibling)) {
        try {
            return {
                // eslint-disable-next-line security/detect-non-literal-fs-filename
                map: JSON.parse(fs.readFileSync(sibling, "utf8")),
                mapDir: path.dirname(sibling)
            };
        } catch (e) {
            return null;
        }
    }

    let source: string;
    try {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        source = fs.readFileSync(jsFile, "utf8");
    } catch (e) {
        return null;
    }

    // The comment is the last non-empty line by convention; scanning from the end keeps this off
    // the hot path of a multi-megabyte bundle's worth of lines.
    const lines = source.split(/\r?\n/);
    for (let lp = lines.length - 1; lp >= 0 && lp > lines.length - 10; lp--) {
        const url = _sourceMapUrl(lines[lp]);
        if (!url) {
            continue;
        }

        const payload = _inlineMapPayload(url);
        try {
            if (payload) {
                return {
                    map: JSON.parse(Buffer.from(payload, "base64").toString("utf8")),
                    mapDir: path.dirname(jsFile)
                };
            }

            const mapPath = path.resolve(path.dirname(jsFile), url);
            // eslint-disable-next-line security/detect-non-literal-fs-filename
            if (fs.existsSync(mapPath)) {
                return {
                    // eslint-disable-next-line security/detect-non-literal-fs-filename
                    map: JSON.parse(fs.readFileSync(mapPath, "utf8")),
                    mapDir: path.dirname(mapPath)
                };
            }
        } catch (e) {
            return null;
        }

        return null;
    }

    return null;
}

function _getTraceMap(jsFile: string): TraceMap | null {
    if (objHasOwnProperty(_mapCache, jsFile)) {
        return _mapCache[jsFile];
    }

    let traceMap: TraceMap | null = null;
    const loaded = _readSourceMap(jsFile);
    if (loaded) {
        try {
            traceMap = new TraceMap(loaded.map, loaded.mapDir.replace(/\\/g, "/") + "/");
        } catch (e) {
            traceMap = null;
        }
    }

    _mapCache[jsFile] = traceMap;

    return traceMap;
}

/**
 * Renders a mapped source path relative to `cwd` when it lives under it, so a frame reads
 * `runner/src/execute/execute.ts:284` rather than an absolute path plus a `../../..` chain.
 */
function _displaySource(source: string, mapDir: string, cwd: string): string {
    let resolved = source;
    if (!path.isAbsolute(source) && !/^[a-z]+:\/\//i.test(source)) {
        resolved = path.resolve(mapDir, source);
    }

    const relative = path.relative(cwd, resolved);
    if (relative && !relative.startsWith("..") && !path.isAbsolute(relative)) {
        return relative.replace(/\\/g, "/");
    }

    return resolved.replace(/\\/g, "/");
}

/**
 * Maps every frame of `stack` that resolves through an available source map, leaving any frame
 * that doesn't (node internals, a bundle built without `sourcemap: true`) exactly as it was.
 *
 * @param stack - The raw `error.stack` string.
 * @param cwd - Directory mapped paths are shown relative to. Defaults to `process.cwd()`.
 * @returns The stack with mapped frames rewritten. Never throws -- a stack that can't be mapped
 * is still more useful printed as-is than replaced by a mapping failure.
 * @internal
 */
export function _mapStackTrace(stack: string, cwd?: string): string {
    if (!stack) {
        return stack;
    }

    const baseDir = cwd || process.cwd();

    return stack.split(/\r?\n/).map((line) => {
        const frame = _parseFrame(line);
        if (!frame) {
            return line;
        }

        const file = frame.file;
        if (!/\.[cm]?js$/i.test(file) || !path.isAbsolute(file)) {
            return line;
        }

        const traceMap = _getTraceMap(file);
        if (!traceMap) {
            return line;
        }

        let position: any;
        try {
            // Stack columns are 1-based; source maps are 0-based.
            position = originalPositionFor(traceMap, {
                line: frame.line,
                column: Math.max(0, frame.column - 1)
            });
        } catch (e) {
            return line;
        }

        if (!position || !position.source || position.line === null) {
            return line;
        }

        const shown = _displaySource(position.source, path.dirname(file), baseDir);
        const location = shown + ":" + position.line + ":" + ((position.column || 0) + 1);
        // Prefer the *mapped* name -- the identifier the map records at this position. Uglify
        // renamed everything in the bundle, so the frame's own name is a meaningless `yo`,
        // while the map still knows what was written there.
        const name = position.name || frame.name;

        return name ? frame.prefix + name + " (" + location + ")" : frame.prefix + location;
    }).join("\n");
}

/**
 * Drops every cached source map. Exposed for tests, which build maps against temp files that
 * must not leak into a later case.
 * @internal
 */
export function _clearStackMapCache(): void {
    Object.keys(_mapCache).forEach((key) => {
        delete _mapCache[key];
    });
}
