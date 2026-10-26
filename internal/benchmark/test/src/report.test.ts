/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

const report = require("../../scripts/report");

function captureLog(fn: () => void): string[] {
    const lines: string[] = [];
    const orgLog = console.log;
    console.log = (...args: any[]) => {
        lines.push(args.join(" "));
    };

    try {
        fn();
    } finally {
        console.log = orgLog;
    }

    return lines;
}

describe("benchmark report", () => {
    describe("formatMs", () => {
        it("formats milliseconds as seconds with two decimals", () => {
            assert.equal(report.formatMs(0), "0.00s");
            assert.equal(report.formatMs(1234), "1.23s");
            assert.equal(report.formatMs(6070.4), "6.07s");
        });

        it("shows a gap for a value that was never measured", () => {
            assert.equal(report.formatMsOrGap(null), report.NOT_MEASURED);
            assert.equal(report.formatMsOrGap(2500), "2.50s");
        });
    });

    describe("stats", () => {
        it("reports nothing for no durations", () => {
            assert.deepEqual(report.stats([]), { avgMs: null, minMs: null, maxMs: null, medianMs: null });
        });

        it("takes the middle value as the median of an odd count", () => {
            const durations = [ 30, 10, 20 ];
            const result = report.stats(durations);

            assert.equal(result.avgMs, 20);
            assert.equal(result.minMs, 10);
            assert.equal(result.maxMs, 30);
            assert.equal(result.medianMs, 20);
            assert.deepEqual(durations, [ 30, 10, 20 ], "the input is not sorted in place");
        });

        it("averages the two middle values as the median of an even count", () => {
            const result = report.stats([ 40, 10, 30, 20 ]);

            assert.equal(result.avgMs, 25);
            assert.equal(result.medianMs, 25);
        });

        it("handles a single measurement", () => {
            assert.deepEqual(report.stats([ 7 ]), { avgMs: 7, minMs: 7, maxMs: 7, medianMs: 7 });
        });
    });

    describe("printTable", () => {
        it("prints nothing when there are no rows", () => {
            assert.deepEqual(captureLog(() => report.printTable([ "A", "B" ], [])), []);
        });

        it("pads every column to its widest cell and trims the trailing space", () => {
            const lines = captureLog(() => report.printTable([ "Suite", "Avg" ], [
                [ "core", "6.07s" ],
                [ "shim/chai", "1.10s" ]
            ]));

            assert.deepEqual(lines, [
                "Suite      Avg",
                "---------  -----",
                "core       6.07s",
                "shim/chai  1.10s"
            ]);
        });
    });
});
