/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import * as path from "path";
import * as fs from "fs";

export function _getAssetFile(fileName: string, isMap: boolean): { contentType: string, content: Buffer } | undefined {
    const safeName = fileName.replace(/^\/+/, "");
    const relParts = isMap ? ["assets", "map", safeName] : ["assets", safeName];
    const candidates = [
        path.resolve(__dirname, ...relParts),
        path.resolve(__dirname, "../build/bin", ...relParts)
    ];

    for (let lp = 0; lp < candidates.length; lp++) {
        const filePath = candidates[lp];
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        if (fs.existsSync(filePath)) {
            return {
                contentType: isMap ? "application/json; charset=utf-8" : "application/javascript; charset=utf-8",
                // eslint-disable-next-line security/detect-non-literal-fs-filename
                content: fs.readFileSync(filePath)
            };
        }
    }
}

export function _getInlineMapAsset(mapFileName: string): { contentType: string, content: Buffer } | undefined {
    return _getAssetFile(mapFileName, true);
}

export function _getSourceAsset(sourceUrl: string): { contentType: string, content: Buffer } | undefined {
    const normalized = sourceUrl.replace(/\\/g, "/").replace(/^\/+/, "");
    if (!normalized || normalized.indexOf("..") !== -1 || normalized.indexOf(":") !== -1) {
        return undefined;
    }

    const candidates = [
        // Bundled dist (the common case): __dirname is the single flattened dist/bin/
        // tripwire.js's own directory, regardless of which original source module a given
        // piece of code came from.
        path.resolve(__dirname, "../../src/ux", normalized),
        // Running unbundled from source (ts-node / TRIPWIRE_PREFER_SOURCE dev mode): this
        // module's own __dirname is runner/src/execute/.
        path.resolve(__dirname, "../ux", normalized),
        path.resolve(process.cwd(), "runner/src/ux", normalized)
    ];

    for (let lp = 0; lp < candidates.length; lp++) {
        const filePath = candidates[lp];

        // eslint-disable-next-line security/detect-non-literal-fs-filename
        if (fs.existsSync(filePath)) {
            const ext = path.extname(filePath).toLowerCase();
            let contentType = "text/plain; charset=utf-8";
            if (ext === ".ts" || ext === ".tsx") {
                contentType = "application/typescript; charset=utf-8";
            } else if (ext === ".js") {
                contentType = "application/javascript; charset=utf-8";
            } else if (ext === ".json") {
                contentType = "application/json; charset=utf-8";
            } else if (ext === ".css") {
                contentType = "text/css; charset=utf-8";
            } else if (ext === ".html") {
                contentType = "text/html; charset=utf-8";
            }

            return {
                contentType: contentType,
                // eslint-disable-next-line security/detect-non-literal-fs-filename
                content: fs.readFileSync(filePath)
            };
        }
    }
}

const _vendorContentTypeMap: { [ext: string]: string } = {
    ".js": "application/javascript; charset=utf-8",
    ".mjs": "application/javascript; charset=utf-8",
    ".cjs": "application/javascript; charset=utf-8",
    ".map": "application/json; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".ts": "text/x-typescript; charset=utf-8",
    ".tsx": "text/x-typescript; charset=utf-8"
};

/**
 * Serves a raw, unwrapped sibling asset (e.g. a vendor dependency's external `.js.map`)
 * by its trusted, already-resolved absolute filesystem path -- never an executable module
 * (those are served pre-wrapped from the in-memory moduleAssets registry, see
 * moduleAssets.ts / browserRunner.ts). The path is not derived from unsanitized request
 * input -- it was captured while building the module graph -- so no fsRoot containment
 * check is required here (unlike the server's root-level filesystem fallback in fs.ts, which
 * is reachable directly from client-controlled request paths).
 */
export function _getVendorAsset(filePath: string): { contentType: string, content: Buffer } | undefined {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    if (!fs.existsSync(filePath)) {
        return undefined;
    }

    const ext = path.extname(filePath).toLowerCase();
    return {
        contentType: _vendorContentTypeMap[ext] || "application/octet-stream",
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        content: fs.readFileSync(filePath)
    };
}

export function _getRunnerBinAsset(fileName: string): { contentType: string, content: Buffer } | undefined {
    const normalizedFile = fileName.replace(/^\/+/, "");
    const candidates = [
        path.resolve(__dirname, normalizedFile),
        path.resolve(__dirname, "../build/bin", normalizedFile)
    ];

    for (let lp = 0; lp < candidates.length; lp++) {
        const filePath = candidates[lp];

        // eslint-disable-next-line security/detect-non-literal-fs-filename
        if (fs.existsSync(filePath)) {
            return {
                contentType: "application/json; charset=utf-8",
                // eslint-disable-next-line security/detect-non-literal-fs-filename
                content: Buffer.from(fs.readFileSync(filePath, "utf8"), "utf8")
            };
        }
    }
}

export function _normalizeAssetUrl(assetUrl: string): string {
    const normalized = (assetUrl || "").replace(/\\/g, "/");
    const qPos = normalized.indexOf("?");
    return qPos !== -1 ? normalized.substring(0, qPos) : normalized;
}
