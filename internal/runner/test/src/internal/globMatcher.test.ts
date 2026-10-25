/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { assert, afterAll as selfAfterAll, beforeAll as selfBeforeAll, beforeEach as selfBeforeEach } from "@nevware21/tripwire";
import { clearWalkCache, findMatchingFiles } from "../../../src/internal/globMatcher";

let _root: string;

function _write(relPath: string, content?: string): string {
    const full = path.join(_root, relPath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content || "// test file\n", "utf8");

    return full;
}

/** Matched paths, relative to the temp root and slash-normalised, sorted for stable comparison. */
function _match(patterns: string[]): string[] {
    return findMatchingFiles(patterns, _root)
        .map((p) => path.relative(_root, p).replace(/\\/g, "/"))
        .sort();
}

describe("globMatcher", () => {
    selfBeforeAll(() => {
        _root = fs.mkdtempSync(path.join(os.tmpdir(), "tripwire-glob-"));
    });

    selfAfterAll(() => {
        if (_root) {
            fs.rmSync(_root, { recursive: true, force: true });
        }
    });

    selfBeforeEach(() => {
        // Each case builds its own tree; the cache is per-resolve-pass by design (see
        // clearWalkCache) so it must not leak one case's filesystem into the next.
        clearWalkCache();
    });

    describe("findMatchingFiles", () => {
        it("should match a simple glob and ignore non-matching files", () => {
            _write("simple/a.test.ts");
            _write("simple/b.test.ts");
            _write("simple/notes.md");

            assert.deepEqual(_match(["simple/*.test.ts"]), ["simple/a.test.ts", "simple/b.test.ts"]);
        });

        it("should resolve a literal (non-glob) path without walking", () => {
            _write("literal/one.test.ts");

            assert.deepEqual(_match(["literal/one.test.ts"]), ["literal/one.test.ts"]);
        });

        it("should return nothing for a literal path that does not exist", () => {
            assert.deepEqual(_match(["literal/missing.test.ts"]), []);
        });

        it("should deduplicate a file matched by more than one pattern", () => {
            _write("dupe/a.test.ts");

            assert.deepEqual(_match(["dupe/*.test.ts", "dupe/**/*.ts"]), ["dupe/a.test.ts"]);
        });

        it("should honour a negated extglob segment", () => {
            _write("ext/node/a.test.ts");
            _write("ext/browser/b.test.ts");
            _write("ext/worker/c.test.ts");

            assert.deepEqual(_match(["ext/!(browser|worker)/*.test.ts"]), ["ext/node/a.test.ts"]);
        });

        it("should never descend into node_modules or .git", () => {
            _write("pkg/a.test.ts");
            _write("pkg/node_modules/dep/b.test.ts");
            _write("pkg/.git/objects/c.test.ts");

            assert.deepEqual(_match(["pkg/**/*.test.ts"]), ["pkg/a.test.ts"]);
        });
    });

    /*
     * Build-output directories are skipped for the *incidental* sweep (a broad pattern that
     * happens to pass a `dist/`), but yield to a pattern that names the segment -- running a
     * suite that was compiled to JS first is a real workflow, and silently matching nothing was
     * the wrong answer to a caller who spelled the directory out.
     */
    describe("build-output directories", () => {
        it("should skip build output a pattern only swept past", () => {
            _write("sweep/src/keep.test.ts");
            _write("sweep/build/gen.test.ts");
            _write("sweep/dist/gen.test.ts");
            _write("sweep/coverage/gen.test.ts");

            assert.deepEqual(_match(["sweep/**/*.test.ts"]), ["sweep/src/keep.test.ts"]);
        });

        it("should descend into build output the pattern names", () => {
            _write("named/build/gen.test.ts");

            assert.deepEqual(_match(["named/build/**/*.test.ts"]), ["named/build/gen.test.ts"]);
        });

        it("should descend when the named segment appears mid-pattern", () => {
            _write("mid/pkg/dist/gen.test.ts");

            assert.deepEqual(_match(["mid/*/dist/*.test.ts"]), ["mid/pkg/dist/gen.test.ts"]);
        });

        it("should find a build-output file by literal path, as it always could", () => {
            _write("lit/build/gen.test.ts");

            assert.deepEqual(_match(["lit/build/gen.test.ts"]), ["lit/build/gen.test.ts"]);
        });

        it("should not let a directory whose name merely starts with a skipped name be skipped", () => {
            // "build-es5" is not "build" -- this repo's own chai shim relies on that.
            _write("prefix/build-es5/gen.test.ts");

            assert.deepEqual(_match(["prefix/**/*.test.ts"]), ["prefix/build-es5/gen.test.ts"]);
        });
    });

    /*
     * The walk is cached so several callers resolving the same root within one pass share it.
     * `--watch` and the interactive sessions re-resolve inside one long-lived process, so the
     * cache has to be droppable -- without that, a test file created after the first iteration
     * was never discovered and watch mode kept re-running the original, smaller file list.
     */
    describe("clearWalkCache", () => {
        it("should not see a file created after the walk was cached", () => {
            _write("cache/a.test.ts");
            assert.deepEqual(_match(["cache/*.test.ts"]), ["cache/a.test.ts"]);

            _write("cache/b.test.ts");
            assert.deepEqual(_match(["cache/*.test.ts"]), ["cache/a.test.ts"], "still the cached walk");
        });

        it("should see a newly created file once the cache is cleared", () => {
            _write("cleared/a.test.ts");
            assert.deepEqual(_match(["cleared/*.test.ts"]), ["cleared/a.test.ts"]);

            _write("cleared/b.test.ts");
            clearWalkCache();

            assert.deepEqual(_match(["cleared/*.test.ts"]), ["cleared/a.test.ts", "cleared/b.test.ts"]);
        });

        it("should drop a deleted file once the cache is cleared", () => {
            const a = _write("deleted/a.test.ts");
            _write("deleted/b.test.ts");
            assert.deepEqual(_match(["deleted/*.test.ts"]), ["deleted/a.test.ts", "deleted/b.test.ts"]);

            fs.rmSync(a);
            clearWalkCache();

            assert.deepEqual(_match(["deleted/*.test.ts"]), ["deleted/b.test.ts"]);
        });

        it("should keep the named/un-named build-output walks apart in the cache", () => {
            _write("keyed/src/keep.test.ts");
            _write("keyed/build/gen.test.ts");

            // Same walk root, different skip decision -- the second must not be served the
            // first's cached (build-less) file list.
            assert.deepEqual(_match(["keyed/**/*.test.ts"]), ["keyed/src/keep.test.ts"]);
            assert.deepEqual(_match(["keyed/build/**/*.test.ts"]), ["keyed/build/gen.test.ts"]);
        });
    });
});
