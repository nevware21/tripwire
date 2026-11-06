/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

/*
 * Regenerates the images used by docs/tour.md.
 *
 *     node docs/scripts/genTourImages.js
 *
 * Every image is a real run, nothing is mocked up:
 *
 *  - the terminal images run the built CLI over tripwire's own core test suite -- one test file on
 *    each target, the whole suite on each target as core's own npm scripts run it, and coverage on
 *    the browser and node targets -- with FORCE_COLOR=1, and render the captured ANSI to SVG with
 *    genReporterImages.js's renderer;
 *  - the browser images drive the interactive page with puppeteer, over the small project the
 *    runner's own interactive-page tests use (internal/runner/test/fixtures/interactive).
 *
 * Pass `terminal` or `browser` to make just that set: `node docs/scripts/genTourImages.js browser`.
 *
 * The terminal captures are cleaned before they are drawn: lines that only report how the run was
 * set up (server ports, absolute paths, module counts) are dropped or made relative, so the images
 * carry nothing of the machine they were made on. Timings are left as measured. The browser images
 * show the page as it is, loopback address and port included.
 *
 * Needs the runner built (core/bin/tripwire.js) and puppeteer's Chrome installed (see
 * internal/runner's install script); it overwrites core/coverage, which is generated output.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { spawn, spawnSync } = require("child_process");
const { createRequire } = require("module");
const { pathToFileURL } = require("url");
const { toSvg } = require("./genReporterImages");

const REPO = path.resolve(__dirname, "..", "..");
const CORE = path.join(REPO, "core");
const CLI = path.join(CORE, "bin", "tripwire.js");
const OUT_DIR = path.join(REPO, "docs", "images", "tour");
const FIXTURE = path.join(REPO, "internal", "runner", "test", "fixtures", "interactive");
const RUNNER = path.join(REPO, "internal", "runner");

// One of core's own test files: small enough to read, and run as-is on every target
const DEMO_FILE = "test/src/assert/assert.isString.test.ts";
const PROJECT = [ "-p", "test/tsconfig.test.json" ];

// The globs core's own test:node, test:browser and test:worker scripts run: everything but the two
// folders that hold the other targets' own tests
const SUITE_GLOBS = {
    node: "test/src/!(browser|worker)/**/*.test.ts",
    browser: "test/src/!(node|worker)/**/*.test.ts",
    worker: "test/src/!(node|browser)/**/*.test.ts"
};

const PROMPT = "\x1b[90m$\x1b[39m ";

// The window the wide browser images start from; each is then made as tall as the page (fitWindow)
const WIDE = { width: 1200, height: 720 };

// Lines that say nothing about the run itself: how it was set up on this machine
const DROP = [
    /^Matched \d+ file/,
    /^\s*Running tests\.\.\.\s*$/,
    /^Run summary:/,
    /^Server URL:/,
    /^\s*Module graph:/,
    /^Ready to run tests after/,
    /^Compile cache:/,
    /^Type-check(ing TypeScript project:| completed in)/,
    /^Coverage (written|report)/
];

/** `args` as they would be typed, quoting the ones a shell would expand. */
function displayCommand(command, args) {
    return [ command ].concat(args.map((arg) => (/[*!(|)]/.test(arg) ? "\"" + arg + "\"" : arg))).join(" ");
}

/**
 * The captured output, ready to draw: the set-up chatter in DROP gone, `cwd` (in either slash
 * direction) shown as ".", and blank lines trimmed at the ends and never more than one in a row.
 */
function cleanOutput(raw, cwd) {
    const roots = [ cwd, cwd.replace(/\\/g, "/") ];
    const lines = [];

    String(raw).split(/\r?\n/).forEach((line) => {
        const plain = line.replace(/\x1b\[[0-9;]*m/g, "");
        if (DROP.some((re) => re.test(plain))) {
            return;
        }

        let shown = line;
        roots.forEach((root) => {
            shown = shown.split(root).join(".");
        });

        // A path made relative reads the same on every platform
        shown = shown.replace(/\.\\[^\s]*/g, (found) => found.replace(/\\/g, "/"));

        if (!shown.trim() && (!lines.length || !lines[lines.length - 1].trim())) {
            return;
        }

        lines.push(shown.replace(/\s+$/, ""));
    });

    while (lines.length && !lines[lines.length - 1].trim()) {
        lines.pop();
    }

    return lines;
}

/** Each step's command after a prompt, then its cleaned output, with a blank line between steps. */
function transcript(steps) {
    const lines = [];
    steps.forEach((step, idx) => {
        if (idx) {
            lines.push("");
        }

        lines.push(PROMPT + step.display);
        Array.prototype.push.apply(lines, cleanOutput(step.output, step.cwd));
    });

    return lines;
}

/** Runs the built CLI from core/, or through nyc when `nyc` is set, and returns what it printed. */
function runCore(args, nyc) {
    const command = nyc
        ? [ require.resolve("nyc/bin/nyc.js", { paths: [ CORE ] }), "--reporter=text-summary", process.execPath, CLI ].concat(args)
        : [ CLI ].concat(args);
    const result = spawnSync(process.execPath, command, {
        cwd: CORE,
        encoding: "utf8",
        env: Object.assign({}, process.env, { FORCE_COLOR: "1" }),
        maxBuffer: 64 * 1024 * 1024
    });

    return (result.stdout || "") + (result.stderr || "");
}

function writeSvg(name, lines, title) {
    fs.writeFileSync(path.join(OUT_DIR, name), toSvg(lines, title), "utf8");
    console.log("  wrote " + name);
}

function terminalImages() {
    // One file, spec reporter, on node: what the tests are
    const nodeArgs = PROJECT.concat([ DEMO_FILE ]);
    writeSvg("one-file-node.svg", transcript([
        { display: displayCommand("npx tripwire", nodeArgs), output: runCore(nodeArgs), cwd: CORE }
    ]), "One of tripwire's own test files, run on node");

    // The same file on all three targets
    writeSvg("one-file-three-targets.svg", transcript([ "node", "browser", "worker" ].map((target) => {
        const args = (target === "node" ? [] : [ "--target", target ]).concat(PROJECT, [ "--reporter", "dot", DEMO_FILE ]);
        return { display: displayCommand("npx tripwire", args), output: runCore(args), cwd: CORE };
    })), "The same test file on node, in Chrome and in a web worker");

    // The whole suite, as core's own scripts run it
    writeSvg("whole-suite.svg", transcript([ "node", "browser", "worker" ].map((target) => {
        const args = (target === "node" ? [] : [ "--target", target ]).concat([ "--type-check" ], PROJECT, [ "--reporter", "min", SUITE_GLOBS[target] ]);
        return { display: displayCommand("npx tripwire", args), output: runCore(args), cwd: CORE };
    })), "tripwire's core suite on node, in Chrome and in a web worker");

    // Coverage: a flag on the browser target, the nyc wrapper on node
    const browserCoverage = [ "--target", "browser", "--coverage", "--coverage-reporter", "text-summary" ].concat(PROJECT, [ "--reporter", "min", SUITE_GLOBS.browser ]);
    const nodeCoverage = PROJECT.concat([ "--reporter", "min", SUITE_GLOBS.node ]);
    writeSvg("coverage.svg", transcript([
        { display: displayCommand("npx tripwire", browserCoverage), output: runCore(browserCoverage), cwd: CORE },
        { display: displayCommand("npx nyc --reporter=text-summary tripwire", nodeCoverage), output: runCore(nodeCoverage, true), cwd: CORE }
    ]), "Coverage of tripwire's core: --coverage in Chrome, nyc on node");
}

/** Starts the CLI in manual launch mode on the fixture, resolving with its runner URL and a stop(). */
function startRunner() {
    const child = spawn(process.execPath, [ CLI, "--target", "browser", "--browser-launch", "manual", "-p", "./tsconfig.json", "./specs/**/*.spec.ts" ], {
        cwd: FIXTURE,
        stdio: [ "ignore", "pipe", "pipe" ],
        windowsHide: true
    });
    let output = "";

    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            child.kill();
            reject(new Error("The runner printed no URL:\n" + output));
        }, 60000);

        child.stdout.on("data", (data) => {
            output += data;
            const match = /Runner URL:\s*(http:\/\/\S+\/__tripwire__\/browser)/.exec(output.replace(/\x1b\[[0-9;]*m/g, ""));
            if (match) {
                clearTimeout(timer);
                resolve({ url: match[1], stop: () => child.kill() });
            }
        });
    });
}

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Makes the window as tall as the page, scrolled to its top. The page follows a run down to its
 * last result and its background is fixed to the window, so a capture of more than the window (a
 * fullPage screenshot) shows a blank band wherever the window was not.
 */
async function fitWindow(page) {
    const height = await page.evaluate(() => {
        window.scrollTo(0, 0);
        return document.documentElement.scrollHeight;
    });
    await page.setViewport({ width: WIDE.width, height: height });
    await wait(300);
}

async function browserImages() {
    const runnerRequire = createRequire(path.join(RUNNER, "package.json"));
    const module = await import(pathToFileURL(runnerRequire.resolve("puppeteer")).href);
    const puppeteer = module.default || module;
    const runner = await startRunner();
    const browser = await puppeteer.launch({ headless: true });

    const shot = (name) => path.join(OUT_DIR, name);
    const loaded = async (page) => {
        await page.waitForFunction(() => /Run complete/.test((document.getElementById("status") || {}).textContent || ""), { timeout: 60000 });
        await wait(400);
    };

    try {
        const page = await browser.newPage();
        await page.emulateMediaFeatures([ { name: "prefers-color-scheme", value: "light" } ]);
        await page.setViewport(WIDE);
        await page.goto(runner.url, { waitUntil: "domcontentloaded" });
        await loaded(page);
        await fitWindow(page);

        await page.screenshot({ path: shot("browser-runner.png") });
        console.log("  wrote browser-runner.png");

        const failed = await page.$("#results .test-node.test-failed");
        await failed.screenshot({ path: shot("browser-failure.png") });
        console.log("  wrote browser-failure.png");

        await page.click("#scopeSelect");
        await page.type("#scopeSelect", "add");
        await wait(300);
        await page.screenshot({ path: shot("browser-scope.png"), clip: { x: 0, y: 0, width: WIDE.width, height: 250 } });
        console.log("  wrote browser-scope.png");
        await page.keyboard.press("Escape");
        await page.evaluate(() => {
            const input = document.getElementById("scopeSelect");
            input.value = "";
            input.blur();
        });

        // Dark, then a phone in low light with the color-blind palette, listing the themes in the
        // Appearance panel
        await page.evaluate(() => localStorage.setItem("tripwire.theme", "dark"));
        await page.setViewport(WIDE);
        await page.reload({ waitUntil: "domcontentloaded" });
        await loaded(page);
        await fitWindow(page);
        await page.screenshot({ path: shot("browser-dark.png") });
        console.log("  wrote browser-dark.png");

        await page.evaluate(() => {
            localStorage.setItem("tripwire.theme", "dim");
            localStorage.setItem("tripwire.vision", "colorblind");
        });
        await page.setViewport({ width: 390, height: 760 });
        await page.reload({ waitUntil: "domcontentloaded" });
        await loaded(page);
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.click("#actionsBtn");
        await page.click("#appearanceItem");
        await page.waitForFunction(() => document.activeElement && document.activeElement.id === "themeInput");
        await page.keyboard.press("ArrowDown");
        await wait(300);
        await page.screenshot({ path: shot("browser-phone.png") });
        console.log("  wrote browser-phone.png");
    } finally {
        await browser.close();
        runner.stop();
    }
}

async function main() {
    if (!fs.existsSync(CLI)) {
        console.error("Built CLI not found at " + CLI + " -- run the runner build first.");
        process.exitCode = 1;
        return;
    }

    const only = process.argv[2];
    fs.mkdirSync(OUT_DIR, { recursive: true });
    if (only !== "browser") {
        terminalImages();
    }

    if (only !== "terminal") {
        await browserImages();
    }
    console.log("Done -> " + path.relative(REPO, OUT_DIR));
}

// Only regenerate the images when executed as a script, so the tests can load the helpers without
// overwriting the committed images.
if (require.main === module) {
    main().catch((e) => {
        console.error(e);
        process.exitCode = 1;
    });
}

module.exports = {
    REPO, CORE, CLI, OUT_DIR, DEMO_FILE, SUITE_GLOBS, PROMPT, DROP,
    displayCommand, cleanOutput, transcript
};
