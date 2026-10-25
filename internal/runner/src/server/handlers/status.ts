/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IServerRequest } from "../../interfaces/IServerRequest";
import { STATUS_CODES } from "node:http";

/**
 * Example codes shown as clickable links on the bare `/status` info page, grouped the same
 * way the HTTP spec groups status classes.
 */
const _EXAMPLE_GROUPS: Array<{ title: string, codes: string[] }> = [
    { title: "2xx Success", codes: ["200", "201", "202", "204"] },
    { title: "3xx Redirection", codes: ["301", "302", "304"] },
    { title: "4xx Client Error", codes: ["400", "401", "403", "404", "409", "429"] },
    { title: "5xx Server Error", codes: ["500", "502", "503", "504"] },
    { title: "Randomly pick one of a set", codes: ["404,500", "200,500"] }
];

function _escapeHtml(value: string): string {
    return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Reason phrase for a (possibly comma-separated) codes string, eg. "404,500" -> "404: Not
 * Found or 500: Internal Server Error".
 */
function _describeCodes(codes: string): string {
    return codes.split(",")
        .map((code) => code + ": " + (STATUS_CODES[Number(code)] || "Unknown"))
        .join(" or ");
}

/**
 * A small info page shown for a bare `/status` request (no code given) -- explains the
 * endpoint and links to a handful of example codes/code-sets so they're one click away
 * instead of needing to already know the URL shape to try it.
 */
function _buildStatusIndexHtml(): string {
    const sections = _EXAMPLE_GROUPS.map((group) => {
        const items = group.codes.map((code) => {
            const href = "/status/" + code;
            return "<li><a href=\"" + _escapeHtml(href) + "\">" + _escapeHtml(href) + "</a> — " + _escapeHtml(_describeCodes(code)) + "</li>";
        }).join("\n");
        return "<h2>" + _escapeHtml(group.title) + "</h2>\n<ul>\n" + items + "\n</ul>";
    }).join("\n");

    return "<!doctype html><html><head><meta charset=\"utf-8\"/><title>Status Endpoint</title></head>"
        + "<body>"
        + "<h1>Status Endpoint</h1>"
        + "<p><code>GET /status/&lt;code[,code...]&gt;</code> responds with that HTTP status code "
        + "(body: its standard reason phrase). Given multiple comma-separated codes, one is picked "
        + "at random on each request -- useful for testing retry/error-handling logic.</p>"
        + "<p>Examples:</p>"
        + sections
        + "</body></html>";
}

/**
 * Handle httpbin-style /status/<code[,code...]> requests.
 *
 * Examples:
 * - /status/200        -> always 200 with body "OK"
 * - /status/404,500    -> randomly 404 or 500 with matching description body
 *
 * A bare `/status` (no code) shows an info page with clickable example links; an invalid or
 * unsupported status code value returns 400.
 */
export function _handleStatusRequest(request: IServerRequest): void {
    const res = request.res;

    if (!request.method.isGet) {
        res.statusCode = 404;
        res.end();
        return;
    }

    // request.actionUrl is the path suffix after "/status" (for example "/200,404")
    const actionUrl = request.actionUrl || "";
    const rawCodes = actionUrl.replace(/^\/+/, "");
    if (!rawCodes) {
        res.statusCode = 200;
        res.setHeader("content-type", "text/html; charset=utf-8");
        res.end(_buildStatusIndexHtml());
        return;
    }

    const validCodes: number[] = [];
    const codeParts = rawCodes.split(",");
    for (let lp = 0; lp < codeParts.length; lp++) {
        const value = codeParts[lp] ? codeParts[lp].trim() : "";
        const parsed = Number(value);
        if (!value || isNaN(parsed) || parsed < 100 || parsed > 599 || Math.floor(parsed) !== parsed) {
            res.statusCode = 400;
            res.end("Invalid status code: " + value);
            return;
        }

        if (!STATUS_CODES[parsed]) {
            res.statusCode = 400;
            res.end("Unsupported status code: " + value);
            return;
        }

        validCodes.push(parsed);
    }

    const selectedCode = validCodes.length === 1
        ? validCodes[0]
        : validCodes[Math.floor(Math.random() * validCodes.length)];

    const description = STATUS_CODES[selectedCode] || "";

    res.statusCode = selectedCode;
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.end(description);
}
