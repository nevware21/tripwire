/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert, ITestSuite } from "@nevware21/tripwire";
import { replaceAnsi } from "@nevware21/chromacon";
import { formatDuration, formatFullTitle, formatStatusSymbol, formatSummary, indent } from "../../../src/reporters/formatters";

function plain(value: string): string {
    return replaceAnsi(value, "");
}

/**
 * Builds a `root > outer > inner` suite chain of the shape reporters walk via `parent`, rooted
 * at a suite named "root" exactly as `createSuite()`/`getRootSuite()` produce.
 */
function makeSuiteChain(descriptions: string[]): ITestSuite {
    let current: any = { description: "root" };

    for (let lp = 0; lp < descriptions.length; lp++) {
        current = { description: descriptions[lp], parent: current };
    }

    return current as ITestSuite;
}

describe("reporter formatters", () => {
    describe("formatDuration", () => {
        it("should report sub-second durations in milliseconds", () => {
            assert.equal(formatDuration(0), "0ms");
            assert.equal(formatDuration(999), "999ms");
        });

        it("should report one second and above in seconds to two decimal places", () => {
            assert.equal(formatDuration(1000), "1.00s");
            assert.equal(formatDuration(1500), "1.50s");
            assert.equal(formatDuration(65432), "65.43s");
        });
    });

    describe("indent", () => {
        it("should default to two spaces per level", () => {
            assert.equal(indent(0), "");
            assert.equal(indent(1), "  ");
            assert.equal(indent(3), "      ");
        });

        it("should honour an explicit width", () => {
            assert.equal(indent(2, 4), "        ");
            assert.equal(indent(2, 0), "");
        });
    });

    describe("formatStatusSymbol", () => {
        it("should use distinct symbols for passed, failed and skipped", () => {
            assert.equal(plain(formatStatusSymbol("passed")), "✓");
            assert.equal(plain(formatStatusSymbol("failed")), "✗");
            assert.equal(plain(formatStatusSymbol("skipped")), "-");
        });

        it("should show an aborted test with the same symbol as a failure", () => {
            assert.equal(plain(formatStatusSymbol("aborted")), plain(formatStatusSymbol("failed")));
        });

        it("should show a pending test with the same symbol as a skipped one", () => {
            assert.equal(plain(formatStatusSymbol("pending")), plain(formatStatusSymbol("skipped")));
        });
    });

    describe("formatFullTitle", () => {
        it("should join the suite chain outermost-first", () => {
            assert.equal(formatFullTitle(makeSuiteChain(["outer", "inner"])), "outer inner");
        });

        it("should append the test description when given one", () => {
            assert.equal(formatFullTitle(makeSuiteChain(["outer", "inner"]), "does a thing"), "outer inner does a thing");
        });

        it("should return just the test description when the suite has no titled ancestors", () => {
            assert.equal(formatFullTitle(makeSuiteChain([]), "top level test"), "top level test");
        });

        // The root is created as `_createSuite("root")`, so it has a description of its own and
        // the walk has to recognise it by name rather than by its absence -- otherwise every
        // title a reporter builds begins "root ".
        it("should not include the synthetic root suite's own name", () => {
            assert.equal(formatFullTitle(makeSuiteChain([]), "a test"), "a test");
            assert.equal(formatFullTitle(makeSuiteChain(["outer"]), "a test"), "outer a test");
            assert.equal(formatFullTitle(makeSuiteChain([])), "", "the root alone has no title");
        });

        it("should not mistake a suite merely starting with root for the root itself", () => {
            assert.equal(formatFullTitle(makeSuiteChain(["rooted things"]), "a test"), "rooted things a test");
        });

        it("should tolerate a missing suite", () => {
            assert.equal(formatFullTitle(null), "");
            assert.equal(formatFullTitle(undefined, "orphan"), "orphan");
        });
    });

    describe("formatSummary", () => {
        it("should always report the passing count", () => {
            assert.equal(plain(formatSummary(3, 0, 0, 0, 0)), "3 passing");
            assert.equal(plain(formatSummary(0, 0, 0, 0, 0)), "0 passing");
        });

        // Finding 2.4: skipped and pending used to be summed into a single "N pending", which
        // made this line disagree with the CLI's own "Run summary:" line printed directly
        // beneath it on every run that skipped anything.
        it("should report skipped and pending as separate counts", () => {
            const summary = plain(formatSummary(1, 0, 2, 3, 0));

            assert.includes(summary, "2 skipped", "skipped should be reported on its own");
            assert.includes(summary, "3 pending", "pending should be reported on its own");
            assert.isFalse(summary.indexOf("5 pending") !== -1, "the two counts must not be summed");
        });

        it("should report skipped without inventing a pending count", () => {
            const summary = plain(formatSummary(0, 0, 20, 0, 0));

            assert.includes(summary, "20 skipped");
            assert.isFalse(summary.indexOf("pending") !== -1, "no pending tests means no pending segment");
        });

        it("should order the counts the same way the CLI summary line does", () => {
            const summary = plain(formatSummary(1, 2, 3, 4, 5));

            assert.isTrue(summary.indexOf("1 passing") < summary.indexOf("2 failing"), "passing before failing");
            assert.isTrue(summary.indexOf("2 failing") < summary.indexOf("3 skipped"), "failing before skipped");
            assert.isTrue(summary.indexOf("3 skipped") < summary.indexOf("4 pending"), "skipped before pending");
        });

        it("should omit zero counts and a zero duration", () => {
            assert.equal(plain(formatSummary(1, 0, 0, 0, 0)), "1 passing");
        });

        it("should append a formatted duration when there is one", () => {
            assert.equal(plain(formatSummary(1, 0, 0, 0, 1500)), "1 passing  (1.50s)");
        });
    });
});
