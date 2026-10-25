/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

/*
 * Regenerates the terminal-output images used by docs/reporters.md.
 *
 *     node docs/scripts/genReporterImages.js
 *
 * Why images at all: a Markdown code block cannot carry colour, and inline HTML does not help
 * either -- GitHub and npm both strip `style` attributes when they sanitize rendered Markdown, so
 * `<span style="color:...">` survives as plain text everywhere except a self-hosted Jekyll site.
 * An SVG is the only form that shows real colour in every place these docs are read.
 *
 * Everything here is generated from an actual run: the fixture below is executed by the built CLI
 * once per reporter with FORCE_COLOR=1 (chromacon otherwise suppresses colour off a TTY), and the
 * captured ANSI is translated to SVG. Nothing is hand-drawn, so the images cannot drift from what
 * the reporters really print -- re-run this after changing any reporter.
 */

"use strict";

const fs = require("fs");
// (os no longer needed -- the fixture lives under the repo, see main())
const path = require("path");
const { spawnSync } = require("child_process");

const REPO = path.resolve(__dirname, "..", "..");
const CLI = path.join(REPO, "core", "bin", "tripwire.js");
const PROJECT = path.join(REPO, "core", "test", "tsconfig.test.json");
const OUT_DIR = path.join(REPO, "docs", "images", "reporters");

// One image per reporter, named after it; cargo also gets the all-passing and progress-bar samples
// written separately by main().
const TARGETS = [
    { name: "spec", title: "tripwire --reporter spec" },
    { name: "list", title: "tripwire --reporter list" },
    { name: "min", title: "tripwire --reporter min" },
    { name: "dot", title: "tripwire --reporter dot" },
    { name: "progress", title: "tripwire --reporter progress" },
    { name: "landing", title: "tripwire --reporter landing" },
    { name: "nyan", title: "tripwire --reporter nyan" },
    { name: "cargo", title: "tripwire --reporter cargo" }
];

/**
 * The same four tests behind every sample in the guide: two passing, one failing, one skipped,
 * across two suites with one nested. Small enough to read at a glance, varied enough that every
 * reporter has each status to render.
 */
const FIXTURE = [
    "import { describe, it, assert } from \"../src/index\";",
    "",
    "describe(\"math\", () => {",
    "    describe(\"addition\", () => {",
    "        it(\"adds two numbers\", () => { assert.equal(2 + 2, 4); });",
    "        it(\"handles negatives\", () => { assert.equal(-1 + -1, -3); });",
    "    });",
    "    it.skip(\"division by zero\", () => { assert.equal(1, 1); });",
    "});",
    "",
    "describe(\"strings\", () => {",
    "    it(\"concatenates\", () => { assert.equal(\"a\" + \"b\", \"ab\"); });",
    "});",
    ""
].join("\n");

/** All-passing variant, for the one sample that shows cargo's `Finished` verb (only printed
 * when nothing failed). */
const PASSING_FIXTURE = [
    "import { describe, it, assert } from \"../src/index\";",
    "",
    "describe(\"math\", () => {",
    "    describe(\"addition\", () => {",
    "        it(\"adds two numbers\", () => { assert.equal(2 + 2, 4); });",
    "        it(\"handles negatives\", () => { assert.equal(-1 + -1, -2); });",
    "    });",
    "});",
    ""
].join("\n");

/*
 * GitHub's dark-theme ANSI palette. Chosen over a "true" xterm palette because these are tuned to
 * stay legible on a dark card, which is what the images are, and they match what most readers see
 * in their own terminal on GitHub-ish themes.
 */
const FG = {
    30: "#484f58", 31: "#f85149", 32: "#3fb950", 33: "#d29922",
    34: "#58a6ff", 35: "#bc8cff", 36: "#39c5cf", 37: "#b1bac4",
    90: "#8b949e", 91: "#ff7b72", 92: "#56d364", 93: "#e3b341",
    94: "#79c0ff", 95: "#d2a8ff", 96: "#56d4dd", 97: "#f0f6fc"
};

const DEFAULT_FG = "#c9d1d9";
const BACKGROUND = "#0d1117";
const FONT_SIZE = 14;
const LINE_HEIGHT = 20;
const CHAR_WIDTH = 8.4;          // 0.6em, the advance width of the monospace stack below
const PAD_X = 16;
const PAD_Y = 14;

/** Lines the CLI prints around a reporter's own output, which would only be noise in a sample. */
const CHROME = [
    /^Matched \d+ file\(s\)$/,
    /^Run summary:/,
    /^Total elapsed:/,
    /^Type-check/,
    /^\s*Running tests\.\.\.\s*$/
];

// Safe in both places the SVG uses it: element text and double-quoted attribute values, where an
// unescaped quote would end the attribute early. & is replaced first so the others are not re-escaped.
function xmlEscape(text) {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

/**
 * Splits one line of ANSI-coded text into `{ text, fill, bold }` runs, tracking SGR state across
 * the line. Only the codes chromacon actually emits are handled (reset, bold on/off, the 8 base
 * and 8 bright foregrounds, default foreground) -- anything else is skipped rather than guessed at.
 */
function parseAnsiLine(line) {
    const runs = [];
    let fill = DEFAULT_FG;
    let bold = false;
    let pos = 0;

    const re = /\x1b\[([0-9;]*)m/g;
    let match;

    function push(text) {
        if (text) {
            runs.push({ text: text, fill: fill, bold: bold });
        }
    }

    while ((match = re.exec(line)) !== null) {
        push(line.slice(pos, match.index));
        pos = match.index + match[0].length;

        const codes = match[1].split(";").filter((c) => c !== "");
        for (const raw of (codes.length ? codes : ["0"])) {
            const code = parseInt(raw, 10);
            if (code === 0) {
                fill = DEFAULT_FG;
                bold = false;
            } else if (code === 1) {
                bold = true;
            } else if (code === 22) {
                bold = false;
            } else if (code === 39) {
                fill = DEFAULT_FG;
            } else if (FG[code]) {
                fill = FG[code];
            }
        }
    }

    push(line.slice(pos));

    return runs;
}

function toSvg(lines, title) {
    const parsed = lines.map(parseAnsiLine);
    const widest = parsed.reduce((max, runs) => {
        const len = runs.reduce((n, r) => n + r.text.length, 0);
        return Math.max(max, len);
    }, 0);

    const width = Math.ceil(widest * CHAR_WIDTH) + PAD_X * 2;
    const height = parsed.length * LINE_HEIGHT + PAD_Y * 2;

    const body = parsed.map((runs, idx) => {
        const y = PAD_Y + FONT_SIZE + idx * LINE_HEIGHT;
        let x = PAD_X;
        const spans = runs.map((run) => {
            // Every run is positioned explicitly: a plain flow would collapse the runs of spaces
            // that all of the bar/tree layouts depend on.
            const span = "<tspan x=\"" + x.toFixed(1) + "\" y=\"" + y + "\" fill=\"" + run.fill + "\""
                + (run.bold ? " font-weight=\"bold\"" : "") + ">" + xmlEscape(run.text) + "</tspan>";
            x += run.text.length * CHAR_WIDTH;
            return span;
        }).join("");

        return "    " + (spans || "<tspan x=\"" + PAD_X + "\" y=\"" + y + "\"> </tspan>");
    }).join("\n");

    return [
        "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"" + width + "\" height=\"" + height + "\" "
            + "viewBox=\"0 0 " + width + " " + height + "\" role=\"img\" aria-label=\"" + xmlEscape(title) + "\">",
        "  <title>" + xmlEscape(title) + "</title>",
        "  <rect width=\"" + width + "\" height=\"" + height + "\" rx=\"8\" fill=\"" + BACKGROUND + "\"/>",
        "  <text font-family=\"ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace\" "
            + "font-size=\"" + FONT_SIZE + "\" xml:space=\"preserve\">",
        body,
        "  </text>",
        "</svg>",
        ""
    ].join("\n");
}

/**
 * Runs the built CLI against the fixture with the given reporter and returns its raw, still-ANSI
 * output. `fakeTty` loads the CLI through a shim that flips `process.stdout.isTTY`, which is what
 * makes the runner hand reporters the raw `write` sink their in-place redraws need -- there is no
 * real terminal here.
 */
function runReporter(specPath, reporter, fakeTty) {
    const cliArgs = [CLI, "-p", PROJECT, "--reporter", reporter, specPath];
    const args = fakeTty
        ? ["-r", path.join(__dirname, "_ttyShim.js")].concat(cliArgs)
        : cliArgs;

    const result = spawnSync(process.execPath, args, {
        cwd: REPO,
        encoding: "utf8",
        env: Object.assign({}, process.env, { FORCE_COLOR: "1" }),
        maxBuffer: 32 * 1024 * 1024
    });

    return (result.stdout || "") + (result.stderr || "");
}

function cleanLines(raw) {
    return raw
        .split(/\r?\n/)
        .filter((line) => {
            const plain = line.replace(/\x1b\[[0-9;]*m/g, "").trim();
            return !CHROME.some((re) => re.test(plain));
        })
        // Trim the blank lines the CLI pads around a run; interior blanks are kept.
        .join("\n")
        .replace(/^\s*\n+/, "")
        .replace(/\n+\s*$/, "")
        .split("\n");
}

/** The successive redraws of cargo's status line, recovered from the `\r`-separated write stream. */
function cargoBarFrames(raw) {
    const frames = [];
    const seen = {};

    for (const chunk of raw.split("\r")) {
        const plain = chunk.replace(/\x1b\[[0-9;]*m/g, "");
        if (plain.indexOf("Testing [") !== -1 && !seen[plain]) {
            seen[plain] = true;
            frames.push(chunk.replace(/\n[\s\S]*$/, ""));
        }
    }

    return frames;
}

function main() {
    if (!fs.existsSync(CLI)) {
        console.error("Built CLI not found at " + CLI + " -- run the runner build first.");
        process.exitCode = 1;
        return;
    }

    // The fixture has to sit directly under core/, not os.tmpdir(): it imports core's own source as
    // "../src/index", the way core's tests do -- "@nevware21/tripwire" is mapped to that source only
    // by the test project's `paths`, which node's require() does not apply, and no node_modules
    // above core/ provides it. The scratch directory is removed again however the run ends.
    const tmp = fs.mkdtempSync(path.join(REPO, "core", ".reporter-shots-"));

    try {
        const specPath = path.join(tmp, "demo.test.ts");
        fs.writeFileSync(specPath, FIXTURE, "utf8");
        fs.mkdirSync(OUT_DIR, { recursive: true });

        for (const target of TARGETS) {
            const raw = runReporter(specPath, target.name, false);
            const svg = toSvg(cleanLines(raw), target.title);
            fs.writeFileSync(path.join(OUT_DIR, target.name + ".svg"), svg, "utf8");
            console.log("  wrote " + target.name + ".svg");
        }

        // cargo only prints its `Finished` verb when nothing failed, so that sample needs its own
        // all-passing fixture.
        const passPath = path.join(tmp, "passing.test.ts");
        fs.writeFileSync(passPath, PASSING_FIXTURE, "utf8");
        fs.writeFileSync(path.join(OUT_DIR, "cargo-clean.svg"),
            toSvg(cleanLines(runReporter(passPath, "cargo", false)), "tripwire --reporter cargo (all passing)"), "utf8");
        console.log("  wrote cargo-clean.svg");

        // cargo's progress bar exists only when a raw `write` sink is supplied, so this one run needs
        // the TTY shim; the frames are then pulled back out of the \r-separated stream.
        const barRaw = runReporter(specPath, "cargo", true);
        const frames = cargoBarFrames(barRaw);
        if (frames.length) {
            fs.writeFileSync(path.join(OUT_DIR, "cargo-progress.svg"),
                toSvg(frames, "tripwire --reporter cargo (progress bar)"), "utf8");
            console.log("  wrote cargo-progress.svg (" + frames.length + " frames)");
        } else {
            console.error("  !! no cargo progress frames captured");
            process.exitCode = 1;
        }
    } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
    }

    console.log("Done -> " + path.relative(REPO, OUT_DIR));
}

// Only regenerate the images when executed as a script, so the tests can load the rendering
// helpers without overwriting the committed images.
if (require.main === module) {
    main();
}

module.exports = {
    REPO, CLI, PROJECT, OUT_DIR, TARGETS, FIXTURE, PASSING_FIXTURE,
    xmlEscape, parseAnsiLine, toSvg, runReporter, cleanLines, cargoBarFrames
};
