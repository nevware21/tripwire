/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import * as fs from "fs";
import * as path from "path";
import { assert } from "@nevware21/tripwire";

// docs/scripts/genTourImages.js makes the images in docs/tour.md from real runs. It is plain node
// JavaScript outside any project, so it is reached with require().
// eslint-disable-next-line @typescript-eslint/no-var-requires
const gen = require("../../../../../docs/scripts/genTourImages");

const ESC = "\x1b[";

/**
 * Covers the tour's image generator without running it: how a capture is cleaned of the machine it
 * ran on before it is drawn, how the commands are shown, and that the committed images are the ones
 * the page shows.
 */
describe("docs genTourImages", () => {
    describe("displayCommand", () => {
        it("quotes the arguments a shell would expand, and nothing else", () => {
            assert.equal(gen.displayCommand("npx tripwire", [ "--target", "browser", "test/src/!(node|worker)/**/*.test.ts" ]),
                "npx tripwire --target browser \"test/src/!(node|worker)/**/*.test.ts\"");
            assert.equal(gen.displayCommand("npx tripwire", [ "test/a.test.ts" ]), "npx tripwire test/a.test.ts");
        });
    });

    describe("cleanOutput", () => {
        const cwd = "C:\\work\\repo\\core";

        it("drops the lines that only say how the run was set up", () => {
            const raw = [
                "Matched 3 file(s)",
                "Launching browser target via Puppeteer...",
                "  Module graph: 113 modules processed, 113 unique in graph (3426ms)",
                "Ready to run tests after 6217ms (prep: 2791ms, compile: 3426ms)",
                "Server URL: http://127.0.0.1:55316/",
                "Compile cache: reused -- nothing changed",
                "Type-checking TypeScript project: " + cwd + "\\test\\tsconfig.test.json",
                "Type-check completed in 231ms",
                "",
                "  Running tests...",
                "",
                "  " + ESC + "32m17 passing" + ESC + "39m  (44ms)",
                "Run summary: total=17 passed=17",
                "Total elapsed: 8864ms"
            ].join("\n");

            assert.deepEqual(gen.cleanOutput(raw, cwd), [
                "Launching browser target via Puppeteer...",
                "",
                "  " + ESC + "32m17 passing" + ESC + "39m  (44ms)",
                "Total elapsed: 8864ms"
            ]);
        });

        it("shows the working directory as \".\", in either slash direction, with forward slashes", () => {
            assert.deepEqual(gen.cleanOutput("Wrote coverage: " + cwd + "\\coverage\\browser\\coverage-final.json", cwd),
                [ "Wrote coverage: ./coverage/browser/coverage-final.json" ]);
            assert.deepEqual(gen.cleanOutput("see C:/work/repo/core/coverage", cwd), [ "see ./coverage" ]);
        });

        it("keeps at most one blank line in a row, and none at either end", () => {
            assert.deepEqual(gen.cleanOutput("\n\na\n\n\n\nb\n\n", cwd), [ "a", "", "b" ]);
        });
    });

    describe("transcript", () => {
        it("puts each step's command after a prompt, its output after that, and a blank line between steps", () => {
            const lines = gen.transcript([
                { display: "npx tripwire a", output: "one\n", cwd: "/x" },
                { display: "npx tripwire b", output: "Matched 1 file(s)\ntwo", cwd: "/x" }
            ]);

            assert.deepEqual(lines, [ gen.PROMPT + "npx tripwire a", "one", "", gen.PROMPT + "npx tripwire b", "two" ]);
        });
    });

    describe("the committed images", () => {
        const repo = gen.REPO;
        const tour = fs.readFileSync(path.join(repo, "docs", "tour.md"), "utf8");
        const images = fs.readdirSync(gen.OUT_DIR);

        it("are each shown by docs/tour.md, and every image it shows exists", () => {
            images.forEach((name: string) => {
                assert.isTrue(tour.indexOf("images/tour/" + name) !== -1, name + " is shown");
            });

            const shown = (tour.match(/images\/tour\/[\w.-]+/g) || []).map((link: string) => link.substring("images/tour/".length));
            shown.forEach((name: string) => {
                assert.isTrue(images.indexOf(name) !== -1, name + " exists");
            });
        });

        it("carry nothing of the machine they were made on", () => {
            images.filter((name: string) => /\.svg$/.test(name)).forEach((name: string) => {
                const svg = fs.readFileSync(path.join(gen.OUT_DIR, name), "utf8");
                assert.equal(svg.indexOf(repo), -1, name + " has no absolute path");
                assert.equal(svg.indexOf(repo.replace(/\\/g, "/")), -1, name + " has no absolute path");
                assert.isFalse(/Server URL|127\.0\.0\.1/.test(svg), name + " has no server address");
            });
        });
    });
});
