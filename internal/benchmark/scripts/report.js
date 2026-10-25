/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2025-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

"use strict";

// A run that exited non-zero measured how long the script took to *fail*, which is not a benchmark
// of anything -- a type error surfaces in seconds while the successful run does the whole suite.
// Averaging the two together, or comparing against one, produces a confident number that means
// nothing (a crashing ts-mocha once read as "ts-mocha faster by 198.1%"). Failed runs are therefore
// excluded from the statistics and block the comparison rather than feeding it.
const NOT_MEASURED = "--";

function formatMs(ms) {
    return (ms / 1000).toFixed(2) + "s";
}

function formatMsOrGap(ms) {
    return ms === null ? NOT_MEASURED : formatMs(ms);
}

function stats(durations) {
    if (!durations.length) {
        return { avgMs: null, minMs: null, maxMs: null, medianMs: null };
    }

    const sorted = durations.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    return {
        avgMs: durations.reduce((a, b) => a + b, 0) / durations.length,
        minMs: sorted[0],
        maxMs: sorted[sorted.length - 1],
        // With an even number of runs the mean of the two middle values, as usual; the median is
        // reported alongside the average because a single slow first run (cold FS cache, browser
        // download check) moves the average far more than it moves the middle of the set.
        medianMs: sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
    };
}

function padRight(str, len) {
    str = String(str);
    return str + " ".repeat(Math.max(0, len - str.length));
}

function printTable(headers, rows) {
    if (!rows.length) {
        return;
    }

    const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => String(r[i]).length)));
    const line = (cells) => cells.map((c, i) => padRight(c, widths[i])).join("  ").replace(/\s+$/, "");

    console.log(line(headers));
    console.log(widths.map((w) => "-".repeat(w)).join("  "));
    rows.forEach((r) => console.log(line(r)));
}

module.exports = { NOT_MEASURED, formatMs, formatMsOrGap, stats, printTable };
