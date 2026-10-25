#!/usr/bin/env node
/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */
import http from "node:http";
import os from "node:os";
import type { Socket } from "node:net";
import { IPromise, createPromise, doAwait } from "@nevware21/ts-async";
import { strSplit, arrForEach, strLower, strIndexOf, strSlice, strStartsWith, isError, asString, isString, objDefineProps } from "@nevware21/ts-utils";
import { IServerContext } from "../interfaces/IServerContext";
import { IServer } from "../interfaces/IServer";
import { IServerHandler } from "../interfaces/IServerHandler";
import { IServerRequest } from "../interfaces/IServerRequest";
import { IServerAction } from "../interfaces/IServerAction";
import { _handleRootRequest } from "./handlers/root";
import { _handleApiRequest } from "./handlers/api";
import { _handleStatusRequest } from "./handlers/status";
import { _assetHandler } from "./handlers/api/assets";
import { _handleFileSystemRequest } from "./handlers/fs";
import { _handleWellKnownRequest } from "./handlers/wellKnown";
import { brightCyan, brightGreen, brightRed, brightYellow, cyan, gray } from "@nevware21/chromacon";

/**
 * Loopback only, so nothing outside this machine can reach the dev server (which serves the
 * compiled test files and the `fsRoot` filesystem fallback) unless `bindAddress` deliberately
 * says otherwise.
 */
export const DEFAULT_BIND_ADDRESS = "127.0.0.1";

/**
 * `0.0.0.0` and `::` mean "every interface" to `listen()`. They are not addresses anything can
 * *connect* to -- `http://0.0.0.0:port/` fails outright in a browser on Windows and macOS.
 */
export function _isWildcardAddress(address: string): boolean {
    return address === "0.0.0.0" || address === "::" || address === "[::]";
}

/**
 * The host a URL should be built from for a given bind address. Everything but a wildcard is
 * used as-is -- that is the whole point of naming one interface -- while a wildcard falls back
 * to loopback, which is reachable and is where a locally launched browser/puppeteer will look.
 * The other reachable addresses are logged separately at listen time for whatever remote
 * client the wildcard was asked for.
 */
export function _toConnectHost(bindAddress: string): string {
    return _toUrlHost(_isWildcardAddress(bindAddress) ? DEFAULT_BIND_ADDRESS : bindAddress);
}

/**
 * Wraps a bare IPv6 literal in the brackets a URL requires -- without them `::1` and the port
 * run together into `http://::1:8080/`, which is not a parseable URL. Hostnames and IPv4
 * literals pass through untouched, as does an address that is already bracketed.
 */
export function _toUrlHost(host: string): string {
    if (strIndexOf(host, ":") !== -1 && !strStartsWith(host, "[")) {
        return "[" + host + "]";
    }

    return host;
}

/**
 * The non-internal addresses of this machine, for telling the user where a wildcard-bound
 * server can actually be reached from. IPv4 first: it is what a remote device or container is
 * most likely to be able to use.
 */
export function _getReachableHosts(): string[] {
    const hosts: string[] = [];
    const interfaces = os.networkInterfaces();

    arrForEach(Object.keys(interfaces), (name) => {
        arrForEach(interfaces[name] || [], (entry: any) => {
            if (entry && !entry.internal && entry.address) {
                // `family` is the number 4/6 on newer node releases and the string "IPv4"/"IPv6"
                // on older ones -- accept both rather than pinning to either.
                if (entry.family === 4 || entry.family === "IPv4") {
                    hosts.unshift(entry.address);
                } else {
                    hosts.push(entry.address);
                }
            }
        });
    });

    return hosts;
}

function _createServerActions(context: IServerContext): IServerAction[] {
    const builtInActions: IServerAction[] = [
        {
            name: "",
            handler: _handleRootRequest,
            description: "Tripwire action index",
            href: "/",
            showInIndex: false
        },
        {
            name: "__tripwire__",
            handler: _assetHandler,
            description: "Tripwire runtime assets",
            href: "/__tripwire__/",
            showInIndex: false
        },
        {
            name: "api",
            handler: _handleApiRequest,
            description: "Runner APIs",
            href: "/api"
        },
        {
            name: "status",
            handler: _handleStatusRequest,
            description: "Health-check endpoint -- returns the requested HTTP status code, or an example page if none is given",
            href: "/status"
        },
        {
            name: ".well-known",
            handler: _handleWellKnownRequest,
            description: "Well-known endpoints",
            href: "/.well-known/appspecific/com.chrome.devtools.json",
            showInIndex: false
        }
    ];

    const actions = builtInActions.slice(0);
    const extras = context.getServerActions ? context.getServerActions() : [];
    if (extras && extras.length) {
        arrForEach(extras, (action) => {
            if (!action || !action.name || !action.handler) {
                return;
            }

            const existingIdx = actions.findIndex((item) => item.name === action.name);
            if (existingIdx >= 0) {
                actions[existingIdx] = action;
            } else {
                actions.push(action);
            }
        });
    }

    return actions;
}

/**
 * Responds 500 to a request whose handler rejected, instead of letting the rejection escape.
 *
 * A handler that throws *synchronously* from inside a promise executor produces a rejected
 * promise, not an exception at the call site -- `_handleRequest`'s own try/catch has already
 * been left behind by then, and an unhandled rejection terminates the node process. That is a
 * whole dev server killed by one bad request, so every `doAwait` below passes this as its
 * reject handler.
 *
 * Silent when the response is already underway: the failure arrived too late to change what
 * the client is being told, and writing to a finished response throws in its own right.
 * @internal
 */
export function _failRequest(res: http.ServerResponse, context: IServerContext, err: any): void {
    if (res.headersSent || res.writableEnded) {
        return;
    }

    try {
        res.statusCode = 500;
        res.end("Internal Server Error");
    } catch (e) {
        // Nothing further can be done for this response -- never let cleanup be the thing
        // that takes the process down.
    }

    if (context && context.logMsg) {
        context.logMsg(brightRed("Request failed: ") + String(err && err.message ? err.message : err));
    }
}

function _splitQueryString(query: string): { [key: string]: string } {
    const result: { [key: string]: string } = {};
    if (query) {
        const pairs = strSplit(query, "&");

        arrForEach(pairs, (pair) => {
            const [key, value] = strSplit(pair, "=");
            if (key) {
                result[key] = decodeURIComponent(value || "");
            }
        });
    }

    return result;
}

export function _startServer(context: IServerContext): IPromise<IServer> {
    let theServer: IServer | null = null;
    let _server: http.Server | null = null;
    let _serverUrl = "";
    let _serverPort = 0;
    const serverActions = _createServerActions(context);
    const actionMap: { [action: string]: IServerHandler } = {};
    arrForEach(serverActions, (action) => {
        actionMap[action.name] = action.handler;
    });

    // Node's `http.Server.close()` only stops accepting *new* connections -- it does nothing
    // to end existing ones, and its callback doesn't fire until every open socket has closed
    // on its own. A browser/worker client can still be holding a keep-alive connection open
    // at the exact moment a run completes; normally that clears within Node's own
    // ~5s keepAliveTimeout, but it isn't guaranteed to, and a caller that's already told the
    // browser to close first (see puppeteer.ts's _teardown) shouldn't still be able to hang
    // here waiting on a connection nothing is ever going to use again. Tracking every open
    // socket and force-destroying whatever's left the moment `stop()` is called makes this
    // resolve promptly regardless of what the client side does or doesn't clean up.
    const _openSockets = new Set<Socket>();

    function _stopServer(): IPromise<void> | void {
        let result: IPromise<void> | void;

        if (_server) {
            const activeServer = _server;
            result = createPromise<void>((resolve) => {
                activeServer.close(() => {
                    resolve();
                });

                _openSockets.forEach((socket) => {
                    socket.destroy();
                });
                _openSockets.clear();
            });

            // Clear the server reference so that it can be GC'd and also to prevent multiple calls to close.
            _server = null;
        } else {
            result = undefined;
        }

        return result;
    }

    function _handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
        try {
            // Allow same-origin embedding of all served resources (required when the
            // test-frame page has Cross-Origin-Embedder-Policy: require-corp — without
            // this header the browser blocks same-origin worker scripts and assets).
            res.setHeader("Cross-Origin-Resource-Policy", "same-origin");

            // This server is ephemeral (a fresh instance, usually on a fresh port, per debug
            // session) serving dynamically (re-)generated content -- module scripts,
            // source maps, and now the raw .ts files DevTools fetches for them (see
            // moduleAssets.ts). A cached 404 (eg. from a source file that used to be
            // deliberately blocked before a later fix, or simply an earlier run's now-stale
            // response) surviving a reload would be actively misleading here, so caching is
            // switched off for every response this server sends rather than reasoning about
            // which specific routes are safe to cache.
            res.setHeader("Cache-Control", "no-store");
            const method = req.method || "GET";
            let actionUrl: string = (req.url || "/");
            let strQuery = "";
            let qsIdx = strIndexOf(actionUrl, "?");

            if (qsIdx !== -1) {
                strQuery = strSlice(actionUrl, qsIdx + 1);
                actionUrl = strSlice(actionUrl, 0, qsIdx);
            }

            // Remove leading slash if present for easier processing.
            let action = "";
            if (strStartsWith(actionUrl, "/")) {
                actionUrl = strSlice(actionUrl, 1);
            }

            // Extract the first part of the path as the action.
            let idx = strIndexOf(actionUrl, "/");
            if (idx !== -1) {
                action = strLower(strSlice(actionUrl, 0, idx));
                actionUrl = strSlice(actionUrl, idx);
            } else {
                const singleSegment = strLower(actionUrl);
                if (singleSegment in actionMap) {
                    action = singleSegment;
                    actionUrl = "/";
                }
            }

            const normalizedActionUrl = actionUrl.replace(/\\/g, "/");

            if (method === "GET" && normalizedActionUrl === "favicon.ico") {
                action = "__tripwire__";
                actionUrl = "/favicon.ico";
            }

            if (method === "GET" && (action === "" || action === "__tripwire__")) {
                const mapOrAssetMatch = normalizedActionUrl.match(/(?:^|\/)(runner-client\.js(?:\.map)?|runner-worker\.js\.map|tripwire(?:\.js)?\.map|favicon\.ico)$/i);
                if (mapOrAssetMatch && mapOrAssetMatch[1]) {
                    action = "__tripwire__";
                    actionUrl = "/" + mapOrAssetMatch[1];
                }
            }

            if (method === "GET" && action === "src") {
                action = "__tripwire__";
                actionUrl = "/src" + actionUrl;
            }

            let request: IServerRequest = {
                server: theServer as IServer,
                context,
                req,
                res,
                method: {
                    name: method,
                    isGet: method === "GET",
                    isPost: method === "POST"
                },
                action,
                actionUrl: actionUrl,
                query: _splitQueryString(strQuery),
                actions: serverActions
            };

            // Verbose request logging: wrap res.end to emit method + URL + status code.
            if (context.verbose) {
                const verboseUrl = req.url || "/";
                const origEnd = res.end.bind(res);
                (res as any).end = function(...args: any[]) {
                    const code = res.statusCode;
                    const codeStr = code >= 500 ? brightRed(String(code))
                        : code >= 400 ? brightYellow(String(code))
                            : brightGreen(String(code));
                    context.logMsg(gray("[http] " + method + " " + verboseUrl + " ") + codeStr);
                    return origEnd(...args);
                };
            }

            // A bare top-level path segment that isn't a registered action (eg. a root-level
            // file request like "/README.md") leaves `action` as "" -- the extraction above
            // only assigns a non-empty action when the segment matches a real one, or when
            // there's a further "/" to split on (an unmatched *multi*-segment request, eg.
            // "/lib/foo.js", always gets a non-empty `action` and falls through to the
            // filesystem fallback below correctly). That leftover "" is the same key the root
            // ("") action is registered under, so without this check a request like
            // "/README.md" would wrongly dispatch to the root handler (which 404s anything
            // that isn't literally "/") instead of falling through to serve it from fsRoot.
            // actionUrl is only ever explicitly set to "/" for the genuine root request, so
            // it reliably distinguishes the two "action is empty" cases.
            const isRootAction = action !== "" || actionUrl === "/";
            let handler = isRootAction ? actionMap[action] : undefined;
            if (handler) {
                // Call the handler and return the result if it's a promise.
                doAwait(handler(request), () => {
                    // No-op: response lifecycle is managed by the request handlers.
                }, (err) => {
                    _failRequest(res, context, err);
                });
            } else {
                // Fallback: serve project files from the root (no /fs/ prefix needed).
                // Reconstruct the full path so the filesystem handler can resolve it.
                request.actionUrl = "/" + (action ? action + actionUrl : actionUrl).replace(/^\/+/, "");

                // Give the context's asset registry (e.g. the browser/worker runner's
                // wrapped module scripts, now served at URLs that mirror the real project
                // layout rather than a dedicated /__tripwire__/... namespace) first refusal
                // before falling back to serving the raw on-disk file at the same path.
                doAwait(context.getAsset(request.actionUrl), (asset) => {
                    if (asset) {
                        res.statusCode = 200;
                        res.setHeader("content-type", asset.contentType);
                        res.end(asset.content);
                        return;
                    }

                    if (asset === null) {
                        // Explicitly not servable raw (eg. the original .ts path a wrapped
                        // module's .js was renamed from) -- respond 404 rather than falling
                        // through to the raw on-disk file, which would otherwise give a
                        // browser/DevTools two independently-fetchable resources for what's
                        // supposed to be a single generated-file/source-map pairing.
                        res.statusCode = 404;
                        res.end("Not Found");
                        return;
                    }

                    doAwait(_handleFileSystemRequest(request), () => {
                        // No-op: response lifecycle is managed by the request handler.
                    }, (err) => {
                        _failRequest(res, context, err);
                    });
                }, (err) => {
                    // getAsset is context-supplied (the browser/worker runner's module
                    // registry) -- a rejection there is just as fatal as one from the
                    // filesystem handler, and just as unguarded before this.
                    _failRequest(res, context, err);
                });
            }
        } catch (e) {
            res.statusCode = 500;
            res.end(String((e as any) && (e as any).message ? (e as any).message : e));
        }
    }

    theServer = {
        stop: _stopServer
    } as IServer;

    objDefineProps(theServer, {
        url: {
            g: () => {
                return _serverUrl;
            }
        },
        port: {
            g: () => {
                return _serverPort;
            }
        },
        isRunning: {
            g: () => {
                return _server ? _server.listening : false;
            }
        }
    });

    const bindAddress = context.bindAddress || DEFAULT_BIND_ADDRESS;
    const connectHost = _toConnectHost(bindAddress);
    return createPromise<IServer>((resolve, reject) => {
        let settled = false;

        function _resolve(theServer: IServer) {
            if (!settled) {
                settled = true;
                resolve(theServer);
            }
        }
        function _reject(err: Error | string) {
            if (!settled) {
                settled = true;
                reject(isError(err) ? err : new Error(asString(err)));
            }

            _stopServer();
        }

        try {
            _server = http.createServer(_handleRequest) as http.Server;
            if (_server) {
                _server.on("error", (err) => {
                    context.logMsg(brightRed("Error in browser runner server: ") + String(err));
                    _reject(err);
                });

                _server.on("connection", (socket) => {
                    _openSockets.add(socket);
                    socket.on("close", () => {
                        _openSockets.delete(socket);
                    });
                });

                _server.listen(0, bindAddress, () => {
                    const address = _server ? _server.address() : null;
                    if (address && !isString(address)) {
                        _serverPort = address.port;
                        _serverUrl = "http://" + connectHost + ":" + address.port + "/";
                        context.logMsg(cyan("Server URL: ") + brightCyan(_serverUrl));

                        // A wildcard bind is only ever asked for so something *else* can reach
                        // this server, and the URL above -- loopback, for the locally launched
                        // browser -- is no use to it. List the addresses that are.
                        if (_isWildcardAddress(bindAddress)) {
                            const reachable = _getReachableHosts();
                            context.logMsg(brightYellow("Bound to " + bindAddress + " -- reachable from the network")
                                + (reachable.length ? gray(" at " + reachable.map((host) => "http://" + _toUrlHost(host) + ":" + address.port + "/").join(", ")) : ""));
                        }

                        _resolve(theServer as IServer);
                    } else {
                        _reject("Unable to start browser runner server.");
                    }

                });
            } else {
                _reject("Failed to create server instance.");
            }
        } catch (e: any) {
            _reject(e as Error | string);
        }
    });
}

