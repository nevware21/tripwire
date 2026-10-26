/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import * as fs from "fs";
import * as path from "path";
import { replaceAnsi } from "@nevware21/chromacon";
import { assert } from "@nevware21/tripwire";

// docs/scripts/genReporterImages.js renders the reporter samples in docs/reporters.md from real runs of
// the built CLI. It is plain node JavaScript outside any project, so it is reached with require().
// eslint-disable-next-line @typescript-eslint/no-var-requires
const gen = require("../../../../../docs/scripts/genReporterImages");

const ESC = "\x1b[";

/**
 * Covers the generator without ever writing to docs/images/reporters: the ANSI to SVG translation is
 * checked directly, one real capture per mode is rendered in memory, and the committed images are
 * checked against the generator's own list and the guide that shows them.
 */
describe("docs genReporterImages", () => {
    describe("xmlEscape", () => {
        it("escapes the characters that would break the SVG markup", () => {
            assert.equal(gen.xmlEscape("a < b && c > d"), "a &lt; b &amp;&amp; c &gt; d");
            assert.equal(gen.xmlEscape("plain"), "plain");
        });

        it("escapes both quote characters so a value cannot end an attribute early", () => {
            assert.equal(gen.xmlEscape("say \"hi\" it's"), "say &quot;hi&quot; it&#39;s");
        });

        it("escapes an existing entity rather than passing it through", () => {
            assert.equal(gen.xmlEscape("&quot;"), "&amp;quot;");
        });
    });

    describe("parseAnsiLine", () => {
        it("returns a line without escapes as one run in the default colour", () => {
            assert.deepEqual(gen.parseAnsiLine("all good"), [ { text: "all good", fill: "#c9d1d9", bold: false } ]);
        });

        it("switches colour on a foreground code and back on 39", () => {
            assert.deepEqual(gen.parseAnsiLine(ESC + "32m✓" + ESC + "39m adds"), [
                { text: "✓", fill: "#3fb950", bold: false },
                { text: " adds", fill: "#c9d1d9", bold: false }
            ]);
        });

        it("tracks bold separately from colour and resets both on 0 or an empty code", () => {
            assert.deepEqual(gen.parseAnsiLine(ESC + "1;31mFAIL" + ESC + "22m still red" + ESC + "0m plain" + ESC + "1mB" + ESC + "m end"), [
                { text: "FAIL", fill: "#f85149", bold: true },
                { text: " still red", fill: "#f85149", bold: false },
                { text: " plain", fill: "#c9d1d9", bold: false },
                { text: "B", fill: "#c9d1d9", bold: true },
                { text: " end", fill: "#c9d1d9", bold: false }
            ]);
        });

        it("ignores codes it has no colour for", () => {
            assert.deepEqual(gen.parseAnsiLine(ESC + "33mwarn" + ESC + "4m still"), [
                { text: "warn", fill: "#d29922", bold: false },
                { text: " still", fill: "#d29922", bold: false }
            ]);
        });

        it("produces no runs for an empty line", () => {
            assert.deepEqual(gen.parseAnsiLine(""), []);
            assert.deepEqual(gen.parseAnsiLine(ESC + "0m"), []);
        });
    });

    describe("toSvg", () => {
        it("sizes the image to the widest line and the line count", () => {
            const svg: string = gen.toSvg([ "abc", "abcdef" ], "sample");

            // 6 characters at 8.4 (50.4, rounded up to 51) plus 16 padding each side; 2 lines at 20 plus 14 padding each side
            assert.includes(svg, "width=\"83\" height=\"68\" viewBox=\"0 0 83 68\"");
            assert.includes(svg, "<title>sample</title>");
            assert.includes(svg, "aria-label=\"sample\"");
        });

        it("places each run after the previous one and marks bold runs", () => {
            const svg: string = gen.toSvg([ ESC + "1mab" + ESC + "22mcd" ], "runs");

            assert.includes(svg, "<tspan x=\"16.0\" y=\"28\" fill=\"#c9d1d9\" font-weight=\"bold\">ab</tspan>");
            assert.includes(svg, "<tspan x=\"32.8\" y=\"28\" fill=\"#c9d1d9\">cd</tspan>");
        });

        it("keeps a blank line's height with a placeholder", () => {
            const svg: string = gen.toSvg([ "first", "", "third" ], "gaps");

            assert.includes(svg, "<tspan x=\"16\" y=\"48\"> </tspan>");
        });

        it("escapes the text and the title", () => {
            const svg: string = gen.toSvg([ "<b>&" ], "a <title>");

            assert.includes(svg, "&lt;b&gt;&amp;");
            assert.includes(svg, "<title>a &lt;title&gt;</title>");
        });

        it("keeps a title with quotes inside its aria-label attribute", () => {
            const svg: string = gen.toSvg([ "x" ], "a \"quoted\" title\" onload=\"alert(1)");

            assert.includes(svg, "aria-label=\"a &quot;quoted&quot; title&quot; onload=&quot;alert(1)\"");
            assert.isFalse(svg.indexOf(" onload=\"") !== -1, "no attribute can be injected through the title");
        });
    });

    describe("cleanLines", () => {
        it("drops the CLI's own chrome and the blank lines around the output", () => {
            const lines = gen.cleanLines([
                "",
                "Matched 1 file(s)",
                "Type-checking TypeScript project: x",
                "  Running tests...",
                "",
                "  math",
                ESC + "32m    ✓ adds" + ESC + "39m",
                "",
                ESC + "90mRun summary: total=1" + ESC + "39m",
                "Total elapsed: 10ms",
                "",
                ""
            ].join("\r\n"));

            assert.deepEqual(lines, [ "  math", ESC + "32m    ✓ adds" + ESC + "39m" ]);
        });
    });

    describe("cargoBarFrames", () => {
        it("pulls each distinct progress frame out of the carriage-return separated stream", () => {
            const raw = "   Compiling\r" +
                ESC + "36mTesting [==>   ] 1/4" + ESC + "39m\r" +
                ESC + "36mTesting [==>   ] 1/4" + ESC + "39m\r" +
                "Testing [=====>] 4/4\nFinished in 1s\n";

            assert.deepEqual(gen.cargoBarFrames(raw), [
                ESC + "36mTesting [==>   ] 1/4" + ESC + "39m",
                "Testing [=====>] 4/4"
            ]);
        });

        it("finds nothing in output without a progress bar", () => {
            assert.deepEqual(gen.cargoBarFrames("plain output\n"), []);
        });
    });

    describe("committed images", () => {
        const expected = gen.TARGETS.map((t: any) => t.name).concat([ "cargo-clean", "cargo-progress" ]);

        it("lists every reporter the guide shows an image for, and only those", () => {
            const committed = fs.readdirSync(gen.OUT_DIR).filter((f) => /\.svg$/.test(f)).map((f) => f.replace(/\.svg$/, "")).sort();

            assert.deepEqual(committed, expected.slice().sort());
        });

        it("has a committed image for every target, titled as the generator titles it", () => {
            gen.TARGETS.forEach((target: any) => {
                const svg = fs.readFileSync(path.join(gen.OUT_DIR, target.name + ".svg"), "utf8");

                assert.isTrue(svg.indexOf("<svg ") === 0, target.name + " is an SVG");
                assert.includes(svg, "<title>" + gen.xmlEscape(target.title) + "</title>", target.name);
            });
        });

        it("is referenced from docs/reporters.md", () => {
            const guide = fs.readFileSync(path.join(gen.REPO, "docs", "reporters.md"), "utf8");

            expected.forEach((name: string) => {
                assert.includes(guide, "images/reporters/" + name + ".svg", name);
            });
        });
    });

    describe("against the built CLI", () => {
        let scratch: string;
        let specPath: string;

        before(() => {
            // Under core/, as the generator itself does: the fixture imports @nevware21/tripwire
            scratch = fs.mkdtempSync(path.join(gen.REPO, "core", ".reporter-shots-test-"));
            specPath = path.join(scratch, "demo.test.ts");
            fs.writeFileSync(specPath, gen.FIXTURE, "utf8");
        });

        after(() => {
            fs.rmSync(scratch, { recursive: true, force: true });
        });

        it("renders a real spec run of the fixture", function () {
            this.timeout(120000);
            assert.isTrue(fs.existsSync(gen.CLI), "the CLI bundle is built");

            const lines: string[] = gen.cleanLines(gen.runReporter(specPath, "spec", false));
            const plain = lines.map((l) => replaceAnsi(l, "")).join("\n");

            assert.includes(plain, "adds two numbers");
            assert.includes(plain, "handles negatives");
            assert.includes(plain, "division by zero");
            assert.isFalse(/Run summary:|Total elapsed:|Matched \d+ file/.test(plain), "the CLI chrome is removed");
            assert.isTrue(lines.some((l) => l.indexOf(ESC) !== -1), "the capture keeps its colours");

            const svg: string = gen.toSvg(lines, "tripwire --reporter spec");
            assert.includes(svg, "adds two numbers");
            assert.includes(svg, "fill=\"#3fb950\"", "the passing tests are drawn in green");
        });

        it("captures cargo's progress bar frames when it believes it writes to a terminal", function () {
            this.timeout(120000);

            const frames: string[] = gen.cargoBarFrames(gen.runReporter(specPath, "cargo", true));

            assert.isTrue(frames.length > 0, "the TTY shim makes cargo draw its bar");
            frames.forEach((frame) => {
                assert.includes(replaceAnsi(frame, ""), "Testing [");
            });
        });
    });
});
