/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IPromise } from "@nevware21/ts-async";
import { IApiHandler } from "./IApiHandler";
import { IFsEntry } from "../ux/interfaces/IFsEntry";
import { IServerAction } from "./IServerAction";

/**
 * Context information for creating and running the server instance.
 */
export interface IServerContext {
    /**
     * Network interface to bind the server to, and the host every URL it reports is built
     * from. Defaults to `127.0.0.1` -- loopback only, so the server is not reachable from the
     * network. A wildcard (`0.0.0.0`/`::`) binds every interface; since a wildcard is not
     * something a client can connect *to*, the reported URL falls back to loopback and the
     * addresses that are reachable are logged alongside it.
     */
    bindAddress?: string;

    /**
     * Optional function to get the HTML for the home page.
     * @returns The HTML string for the home page.
     */
    getHomePageHtml?: () => string;

    /**
     * Optional callback returning target-specific runner UI HTML.
     */
    getRunnerPageHtml?: (target: "browser" | "worker") => string;

    /**
     * Optional callback to register additional server actions.
     */
    getServerActions?: () => IServerAction[];

    /**
     * Callback function for logging messages.
     * @param msg The message to log.
     */
    logMsg: (msg: any) => void;

    /**
     * Gets the API handler for the specified API URL.
     * @param apiUrl The URL of the API.
     * @returns The API handler for the specified URL, or undefined if not found.
     */
    getApiHandler: (apiUrl: string) => IApiHandler | undefined;

    /**
     * Gets the content for the specified asset URL.
     * @param assetUrl The URL of the asset.
     * @returns An object containing the content type and content buffer for the asset;
     * `undefined` if this context has no opinion (the caller should fall back to serving the
     * raw on-disk file at the same path, if any); or `null` if the URL is explicitly *not*
     * servable as a raw file even though nothing above claimed it (eg. the original `.ts`
     * path a wrapped module's served `.js` was renamed from -- serving that raw would give a
     * browser/DevTools two independently-fetchable resources for what's supposed to be one
     * generated-file/source-map pairing, which is exactly the "shows up twice" confusion this
     * exists to prevent). The caller should respond 404 rather than trying the filesystem.
     */
    getAsset: (assetUrl: string) => IPromise<{ contentType: string, content: Buffer } | undefined | null> | { contentType: string, content: Buffer } | undefined | null;

    /**
     * When true the server logs each request URL and response status code.
     */
    verbose?: boolean;

    /**
     * The root folder that the filesystem fallback handler (`_handleFileSystemRequest`) is
     * permitted to serve -- any request whose path doesn't match a registered action/asset is
     * served directly from this root (eg. `/README.md` -> `<fsRoot>/README.md`), not from a
     * dedicated `/fs/...` prefix (there is no such prefix; see server.ts's own routing).
     * Requests that resolve to a path outside this root are rejected with 403.
     * Defaults to `process.cwd()` when not specified.
     */
    fsRoot?: string;

    /**
     * The UI style used when generating HTML responses (e.g. directory listings).
     * Accepts `"classic"` or `"slate"`. Defaults to `"classic"`.
     */
    browserStyle?: string;

    /**
     * Optional callback to generate the HTML page for a directory listing served by the
     * filesystem fallback handler (see `fsRoot` above). When not provided the handler returns
     * a plain-text fallback.
     *
     * @param style        - The UI style (`"classic"` or `"slate"`).
     * @param relativePath - Path of the listed directory relative to `fsRoot`.
     * @param entries      - Directory entries to display.
     * @param extraHtml    - Optional extra HTML rendered near the top of the page, above the
     * entries table (eg. the root ("/") listing's runner shortcut links).
     * @returns A complete HTML document string.
     */
    getFsListingHtml?: (style: string, relativePath: string, entries: IFsEntry[], extraHtml?: string) => string;

    /**
     * Callback function called when the run is complete.
     * @param summary The summary of the run.
     */
    onComplete: (summary: any) => void;
}