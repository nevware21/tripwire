/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import * as nodePath from "path";
import * as nodeFs from "fs";
import { createPromise, doAwait, IPromise } from "@nevware21/ts-async";
import { IServerRequest } from "../../interfaces/IServerRequest";
import { IFsEntry } from "../../ux/interfaces/IFsEntry";

/**
 * Maps common file extensions to their MIME content-type strings.
 * Falls back to `application/octet-stream` for unknown extensions.
 */
const _contentTypeMap: { [ext: string]: string } = {
    ".html": "text/html; charset=utf-8",
    ".htm": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".mjs": "application/javascript; charset=utf-8",
    ".cjs": "application/javascript; charset=utf-8",
    ".ts": "text/x-typescript; charset=utf-8",
    ".tsx": "text/x-typescript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".jsonl": "application/jsonl; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
    ".log": "text/plain; charset=utf-8",
    ".md": "text/plain; charset=utf-8",
    ".xml": "text/xml; charset=utf-8",
    ".csv": "text/csv; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".ico": "image/x-icon",
    ".webp": "image/webp",
    ".pdf": "application/pdf",
    ".wasm": "application/wasm",
    ".map": "application/json; charset=utf-8",
    ".yaml": "text/plain; charset=utf-8",
    ".yml": "text/plain; charset=utf-8",
    ".sh": "text/plain; charset=utf-8",
    ".bat": "text/plain; charset=utf-8",
    ".ps1": "text/plain; charset=utf-8"
};

function _getContentType(filePath: string): string {
    const ext = nodePath.extname(filePath).toLowerCase();
    return _contentTypeMap[ext] || "application/octet-stream";
}

/**
 * Resolves a URL subpath against fsRoot and validates it does not escape the root.
 *
 * `path.resolve()` normalises ALL `..` segments before the containment check, so
 * patterns like `src/../../../etc/passwd` are caught correctly.
 *
 * Returns the resolved absolute path, or `null` if the request is outside fsRoot.
 *
 * Exported for testing: this is the only containment check standing between a request and
 * the filesystem outside `--server-root`, so each of its branches is pinned directly rather
 * than through a socket. See `runner/test/src/server/safeResolve.test.ts`.
 * @internal
 */
export function _safeResolve(fsRoot: string, subpath: string): string | null {
    const normalizedRoot = nodePath.resolve(fsRoot);

    /*
     * Reject a NUL byte before anything else touches the value. `%00` is *valid* percent
     * encoding, so `decodeURIComponent` in the caller decodes it happily rather than throwing,
     * and none of the checks below would notice it: path.resolve/relative carry it through
     * unchanged and the containment test sees an ordinary relative name. It only surfaces at
     * the `fs.stat` call, where node's own path validation throws ERR_INVALID_ARG_VALUE
     * *synchronously* -- from inside a promise executor, which took the whole process down.
     *
     * No legitimate path contains one, so this belongs here at the single chokepoint every
     * filesystem operation already funnels through, rather than as a try/catch at each call.
     */
    if (subpath && subpath.indexOf("\0") !== -1) {
        return null;
    }

    const normalizedSubpath = (subpath || "")
        .replace(/\\/g, "/")
        .replace(/^\/+/, "");

    // Block drive-qualified paths after stripping URL-style slashes.
    if (/^[a-zA-Z]:/.test(normalizedSubpath)) {
        return null;
    }

    const resolved = nodePath.resolve(normalizedRoot, normalizedSubpath || ".");
    const rel = nodePath.relative(normalizedRoot, resolved);

    /*
     * The resolved path is outside the root when the relative path begins with a ".."
     * *segment* -- either exactly ".." or ".." followed by a separator. Testing
     * `rel.startsWith("..")` instead would also reject contained files whose own name
     * merely begins with dots ("..hidden.ts", "...weird.ts", "..a/b"), which resolve
     * inside the root and are legitimate. Every real escape normalises to a leading ".."
     * segment, so this is exactly as strict for traversal while no longer over-blocking.
     *
     * path.isAbsolute guards against edge-cases on Windows where relative() can
     * return a drive-rooted path when the two paths are on different drives.
     */
    if (rel === ".." || rel.startsWith(".." + nodePath.sep) || rel.startsWith("../") || nodePath.isAbsolute(rel)) {
        return null;
    }

    return resolved;
}

/**
 * Delegates directory listing HTML generation to `context.getFsListingHtml` when available,
 * otherwise returns a minimal plain-text fallback so the handler always produces a response.
 */
function _buildListingHtml(request: IServerRequest, style: string, relativePath: string, entries: IFsEntry[], extraHtml?: string): string {
    if (request.context.getFsListingHtml) {
        return request.context.getFsListingHtml(style, relativePath, entries, extraHtml);
    }

    // Plain-text fallback (used when no HTML generator is wired into the context).
    const displayPath = "/" + relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
    let text = "Index of " + displayPath + "\n\n";
    for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        text += (e.isDir ? "[DIR]  " : "[FILE] ") + e.name;
        if (!e.isDir && e.size !== undefined) {
            text += " (" + e.size + " bytes)";
        }
        text += "\n";
    }
    return (extraHtml || "") + "<pre>" + text + "</pre>";
}

/**
 * Reads a directory's immediate entries (name/isDir/size/modified) for rendering a listing --
 * shared by `_handleFileSystemRequest`'s own directory branch and the root ("/") handler,
 * which now shows the same styled listing (of `fsRoot` itself) rather than a bespoke page.
 * @internal
 */
export function _readDirEntries(dirPath: string): IPromise<IFsEntry[]> {
    return createPromise<IFsEntry[]>((resolve, reject) => {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        nodeFs.readdir(dirPath, (readdirErr, names) => {
            if (readdirErr) {
                reject(readdirErr);
                return;
            }

            let pending = names.length;
            const entries: IFsEntry[] = [];

            if (pending === 0) {
                resolve(entries);
                return;
            }

            names.forEach((name) => {
                // eslint-disable-next-line security/detect-non-literal-fs-filename
                nodeFs.stat(nodePath.join(dirPath, name), (entryStatErr, entryStat) => {
                    if (!entryStatErr && entryStat) {
                        entries.push({
                            name,
                            isDir: entryStat.isDirectory(),
                            size: entryStat.isDirectory() ? undefined : entryStat.size,
                            modified: entryStat.mtime
                        });
                    }

                    pending--;
                    if (pending === 0) {
                        resolve(entries);
                    }
                });
            });
        });
    });
}

/**
 * Root-level filesystem fallback handler -- serves `context.fsRoot` directly at the root of
 * the URL space (eg. `/README.md` -> `<fsRoot>/README.md`). server.ts only calls this for a
 * request whose path didn't match any registered action or `context.getAsset` entry; there is
 * no dedicated `/fs/...` prefix.
 *
 * - GET requests only (all other methods return 405).
 * - Paths that escape `context.fsRoot` are rejected with 403.
 * - Directories return a styled HTML listing.
 * - Files are served with the appropriate Content-Type.
 * - Missing paths return 404.
 */
export function _handleFileSystemRequest(request: IServerRequest): IPromise<void> | void {
    const res = request.res;

    if (!request.method.isGet) {
        res.statusCode = 405;
        res.setHeader("Allow", "GET");
        res.end("Method Not Allowed");
        return;
    }

    const fsRoot = request.context.fsRoot || process.cwd();
    const style = (request.context.browserStyle as any) || "classic";

    /*
     * actionUrl is the full request path relative to fsRoot (e.g. "/src/utils" or "/") --
     * server.ts reconstructs it from the original URL before calling this handler, since
     * there's no route prefix to strip.
     * Decode percent-encoded characters so that %2e%2e%2f-style traversal is caught
     * by path.resolve() rather than slipping through as raw dots/slashes.
     */
    let subpath: string;
    try {
        subpath = decodeURIComponent(request.actionUrl || "/");
    } catch (e) {
        res.statusCode = 400;
        res.end("Bad Request: malformed URL encoding");
        return;
    }

    const resolvedPath = _safeResolve(fsRoot, subpath);
    if (!resolvedPath) {
        res.statusCode = 403;
        res.end("Forbidden");
        return;
    }

    return createPromise<void>((resolve) => {
        let completed = false;

        function _finalize(statusCode: number, body: string | Buffer, contentType?: string): void {
            if (completed) {
                return;
            }

            completed = true;
            res.statusCode = statusCode;
            if (contentType) {
                res.setHeader("content-type", contentType);
            }
            res.end(body);
            resolve();
        }

        // eslint-disable-next-line security/detect-non-literal-fs-filename
        nodeFs.stat(resolvedPath, (statErr, stat) => {
            if (completed) {
                return;
            }

            if (statErr) {
                _finalize(404, "Not Found");
                return;
            }

            if (stat.isDirectory()) {
                const fsRoot2 = nodePath.resolve(fsRoot);
                const relativePath = nodePath.relative(fsRoot2, resolvedPath).replace(/\\/g, "/");

                doAwait(_readDirEntries(resolvedPath), (entries) => {
                    if (completed) {
                        return;
                    }

                    try {
                        const html = _buildListingHtml(request, style, relativePath, entries);
                        _finalize(200, html, "text/html; charset=utf-8");
                    } catch (e) {
                        _finalize(500, "Internal Server Error");
                    }
                }, () => {
                    _finalize(500, "Internal Server Error");
                });
            } else {
                const contentType = _getContentType(resolvedPath);
                // eslint-disable-next-line security/detect-non-literal-fs-filename
                nodeFs.readFile(resolvedPath, (readErr, data) => {
                    if (completed) {
                        return;
                    }

                    if (readErr) {
                        _finalize(500, "Internal Server Error");
                        return;
                    }

                    _finalize(200, data, contentType);
                });
            }
        });
    });
}
