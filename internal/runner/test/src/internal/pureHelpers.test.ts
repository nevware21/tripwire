/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "@nevware21/tripwire";
import { _normalizePath } from "../../../src/internal/normalizePath";
import { _containsTypeScript } from "../../../src/internal/containsTypeScript";
import { DEFAULT_COVERAGE_SRC, _coverageSrcPatterns } from "../../../src/internal/coverageSrc";

// The three single-purpose helpers in internal/ that are small enough to share a file. Each
// is used at enough call sites that a silent behaviour change would be felt somewhere else
// entirely, which is the reason to pin them at all.
describe("internal pure helpers", () => {
    describe("_normalizePath", () => {
        it("should convert Windows separators to forward slashes", () => {
            assert.equal(_normalizePath("C:\\proj\\test\\a.test.ts"), "C:/proj/test/a.test.ts");
        });

        it("should leave a posix path unchanged", () => {
            assert.equal(_normalizePath("/proj/test/a.test.ts"), "/proj/test/a.test.ts");
        });

        it("should normalize a mixed-separator path", () => {
            assert.equal(_normalizePath("C:\\proj/test\\a.test.ts"), "C:/proj/test/a.test.ts");
        });

        it("should collapse a UNC prefix's separators without dropping them", () => {
            assert.equal(_normalizePath("\\\\server\\share\\file.ts"), "//server/share/file.ts");
        });

        it("should return an empty string unchanged", () => {
            assert.equal(_normalizePath(""), "");
        });
    });

    describe("_containsTypeScript", () => {
        it("should return false for an empty list", () => {
            assert.isFalse(_containsTypeScript([]));
        });

        it("should return false when every file is JavaScript", () => {
            assert.isFalse(_containsTypeScript([ "a.test.js", "b.test.mjs", "c.test.cjs" ]));
        });

        it("should detect a .ts file", () => {
            assert.isTrue(_containsTypeScript([ "a.test.js", "b.test.ts" ]));
        });

        it("should detect a .tsx file", () => {
            assert.isTrue(_containsTypeScript([ "widget.test.tsx" ]));
        });

        it("should match the extension case-insensitively", () => {
            assert.isTrue(_containsTypeScript([ "A.TEST.TS" ]));
            assert.isTrue(_containsTypeScript([ "Widget.Test.TSX" ]));
        });

        it("should only match at the end of the name, not mid-path", () => {
            // A directory called `.ts` (or a file `a.ts.js`) is not a TypeScript input.
            assert.isFalse(_containsTypeScript([ "some.ts.dir/a.test.js" ]));
            assert.isFalse(_containsTypeScript([ "a.ts.js" ]));
        });

        it("should stop at the first match rather than scanning the whole list", () => {
            // The helper breaks out of arrForEach with -1; a regression that dropped the
            // break would still return true, so assert the result over a long list where
            // the hit is first.
            const files = [ "first.ts" ];

            for (let lp = 0; lp < 500; lp++) {
                files.push("later" + lp + ".js");
            }

            assert.isTrue(_containsTypeScript(files));
        });
    });

    describe("_coverageSrcPatterns", () => {
        it("should default to src/**/*.ts when nothing is configured", () => {
            assert.deepEqual(_coverageSrcPatterns({}), [ "src/**/*.ts" ]);
            assert.deepEqual(_coverageSrcPatterns({}), DEFAULT_COVERAGE_SRC);
        });

        it("should default when nothing was parsed at all", () => {
            assert.deepEqual(_coverageSrcPatterns(null), DEFAULT_COVERAGE_SRC);
            assert.deepEqual(_coverageSrcPatterns(undefined), DEFAULT_COVERAGE_SRC);
        });

        it("should default when the configured list is empty", () => {
            // An empty array must not win -- matching nothing is the failure mode COV-SRC
            // existed to remove, since it silently raises the reported percentage.
            assert.deepEqual(_coverageSrcPatterns({ coverageSrc: [] }), DEFAULT_COVERAGE_SRC);
        });

        it("should use a configured single glob", () => {
            assert.deepEqual(_coverageSrcPatterns({ coverageSrc: [ "lib/**/*.ts" ] }), [ "lib/**/*.ts" ]);
        });

        it("should use every configured glob", () => {
            const patterns = [ "lib/**/*.ts", "tools/**/*.ts" ];

            assert.deepEqual(_coverageSrcPatterns({ coverageSrc: patterns }), patterns);
        });

        it("should expose the default as src/**/*.ts", () => {
            // Pinned because two coverage steps and the docs all quote this value.
            assert.deepEqual(DEFAULT_COVERAGE_SRC, [ "src/**/*.ts" ]);
        });
    });
});
