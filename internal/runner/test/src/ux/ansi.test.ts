/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "@nevware21/tripwire";
import { appendAnsiSegments, IAnsiSegment, toAnsiSegments } from "../../../src/ux/browser/ui/ansi";
import { stubElement, textOf, useStubDocument } from "../support/uxDom";

/**
 * The terminal colour codes the page's log panel draws: which codes become which classes or CSS
 * colours, which are dropped, and how the runs between them are put on the page.
 */
describe("ux ansi", () => {

    /** Each run as "classes=text", with any CSS colour after the classes. */
    function runs(segments: IAnsiSegment[]): string[] {
        return segments.map((segment) => segment.classes.concat(
            segment.color ? [ "color:" + segment.color ] : [],
            segment.background ? [ "background:" + segment.background ] : []
        ).join(" ") + "=" + segment.text);
    }

    describe("toAnsiSegments", () => {
        it("should leave text without codes as one plain run, and nothing as no runs", () => {
            assert.deepEqual(toAnsiSegments("plain [text]"), [ { text: "plain [text]", classes: [] } ]);
            assert.deepEqual(toAnsiSegments(""), []);
            assert.deepEqual(toAnsiSegments("\u001b[0m"), [], "a code with no text around it");
        });

        it("should colour the text after a foreground code until it is reset", () => {
            assert.deepEqual(runs(toAnsiSegments("\u001b[32m✓ passes\u001b[39m \u001b[90m(3ms)\u001b[0m done")), [
                "ansi-fg-32=✓ passes",
                "= ",
                "ansi-fg-90=(3ms)",
                "= done"
            ]);
        });

        it("should know the 8 standard and 8 bright colours, for the text and behind it", () => {
            assert.deepEqual(runs(toAnsiSegments("\u001b[30ma\u001b[37mb\u001b[97mc\u001b[41md\u001b[107me\u001b[49mf")), [
                "ansi-fg-30=a",
                "ansi-fg-37=b",
                "ansi-fg-97=c",
                "ansi-fg-97 ansi-bg-41=d",
                "ansi-fg-97 ansi-bg-107=e",
                "ansi-fg-97=f"
            ]);
        });

        it("should combine codes in one sequence, and turn each style off on its own", () => {
            assert.deepEqual(runs(toAnsiSegments("\u001b[1;3;4;31mall\u001b[22mlight\u001b[2mdim\u001b[23;24mplain\u001b[22mnormal")), [
                "ansi-fg-31 ansi-bold ansi-italic ansi-underline=all",
                "ansi-fg-31 ansi-italic ansi-underline=light",
                "ansi-fg-31 ansi-dim ansi-italic ansi-underline=dim",
                "ansi-fg-31 ansi-dim=plain",
                "ansi-fg-31=normal"
            ]);
        });

        it("should reset everything for a 0, an empty code, or a sequence with no codes", () => {
            assert.deepEqual(runs(toAnsiSegments("\u001b[1;31;42ma\u001b[0mb\u001b[1;31mc\u001b[;mD\u001b[33md\u001b[me")), [
                "ansi-fg-31 ansi-bg-42 ansi-bold=a",
                "=b",
                "ansi-fg-31 ansi-bold=c",
                "=D",
                "ansi-fg-33=d",
                "=e"
            ]);
        });

        it("should use the colour classes for the first 16 of the 256 colours, and CSS for the rest", () => {
            assert.deepEqual(runs(toAnsiSegments("\u001b[38;5;1ma\u001b[38;5;9mb\u001b[48;5;4mc\u001b[48;5;12md")), [
                "ansi-fg-31=a",
                "ansi-fg-91=b",
                "ansi-fg-91 ansi-bg-44=c",
                "ansi-fg-91 ansi-bg-104=d"
            ]);
            assert.deepEqual(runs(toAnsiSegments("\u001b[38;5;208mcube\u001b[48;5;244mgrey\u001b[39;49mplain")), [
                "color:rgb(255,135,0)=cube",
                "color:rgb(255,135,0) background:rgb(128,128,128)=grey",
                "=plain"
            ]);
        });

        it("should use 24-bit colours as they are, carrying on with the codes after one", () => {
            assert.deepEqual(runs(toAnsiSegments("\u001b[38;2;10;20;30;1ma\u001b[48;2;255;255;255mb")), [
                "ansi-bold color:rgb(10,20,30)=a",
                "ansi-bold color:rgb(10,20,30) background:rgb(255,255,255)=b"
            ]);
        });

        it("should ignore an extended colour it cannot read", () => {
            assert.deepEqual(runs(toAnsiSegments("\u001b[32m\u001b[38;5ma\u001b[38;2;300;0;0mb\u001b[38;9;1mc\u001b[38;5;256md")), [
                "ansi-fg-32=abcd"
            ], "each leaves the colour as it was, so the text is one run");
        });

        it("should drop a hyperlink's OSC wrapper, keeping its text in the colour around it", () => {
            const link = "\u001b]8;;https://example.com/docs\u0007the docs\u001b]8;;\u0007";

            assert.deepEqual(runs(toAnsiSegments("see " + link + " for more")), [ "=see the docs for more" ]);
            assert.deepEqual(runs(toAnsiSegments("\u001b[33m" + link + "\u001b[39m!")), [ "ansi-fg-33=the docs", "=!" ]);
        });

        it("should read the one-byte CSI as it does ESC [", () => {
            assert.deepEqual(runs(toAnsiSegments("\u009b31mred\u009b0m plain")), [ "ansi-fg-31=red", "= plain" ]);
        });

        it("should make one run of neighbours drawn the same way", () => {
            assert.deepEqual(runs(toAnsiSegments("\u001b[31mone \u001b[31mtwo\u001b[1m three")), [ "ansi-fg-31=one two", "ansi-fg-31 ansi-bold= three" ]);
            assert.deepEqual(runs(toAnsiSegments("\u001b[38;5;208ma\u001b[38;5;208mb\u001b[38;5;209mc")), [ "color:rgb(255,135,0)=ab", "color:rgb(255,135,95)=c" ]);
        });

        it("should drop cursor, erase and other sequences that are not about how text looks", () => {
            assert.deepEqual(runs(toAnsiSegments("\u001b[2K\u001b[1G\u001b[?25lline\u001b[?25h")), [ "=line" ]);
            assert.deepEqual(runs(toAnsiSegments("\u001b[31m\u001b[3Amoved\u001b[0m")), [ "ansi-fg-31=moved" ], "they leave the colour alone");
        });
    });

    describe("appendAnsiSegments", () => {
        let restoreDocument: () => void;

        beforeEach(() => {
            restoreDocument = useStubDocument().restore;
        });

        afterEach(() => {
            restoreDocument();
        });

        it("should append plain runs as text and styled ones as spans", () => {
            const line = stubElement("", "div");
            line.textContent = "[log] ";

            appendAnsiSegments(line, toAnsiSegments("\u001b[1;32mok\u001b[0m and \u001b[38;5;208;48;2;1;2;3morange"));

            assert.equal(textOf(line), "[log] ok and orange");
            assert.deepEqual(line.kids.map((part: any) => [ part.tagName || "#text", part.className || "", part.textContent ]), [
                [ "SPAN", "ansi-fg-32 ansi-bold", "ok" ],
                [ "#text", "", " and " ],
                [ "SPAN", "", "orange" ]
            ]);
            assert.deepEqual(line.kids[2].style, { color: "rgb(255,135,0)", backgroundColor: "rgb(1,2,3)" });
        });
    });
});
