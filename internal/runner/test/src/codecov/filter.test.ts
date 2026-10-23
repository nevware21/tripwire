/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "@nevware21/tripwire";
import { DefaultCoverageFilter } from "../../../src/codecov/filter";

/**
 * The default coverage filter decides which files of an instrumented run end up in the report: the
 * project's own sources, never its tests, its entry points, or anything under node_modules.
 */
describe("codecov DefaultCoverageFilter", () => {
    const filter = new DefaultCoverageFilter();
    const cwd = "D:\\work\\project";

    describe("isTestPath", () => {
        it("recognises test and spec files by their suffix, whatever the extension", () => {
            assert.isTrue(filter.isTestPath("src/thing.test.ts"));
            assert.isTrue(filter.isTestPath("src/thing.test.mjs"));
            assert.isTrue(filter.isTestPath("src/thing.spec.tsx"));
            assert.isTrue(filter.isTestPath("src\\thing.SPEC.cjs"));
            assert.isFalse(filter.isTestPath("src/thing.ts"));
            assert.isFalse(filter.isTestPath("src/testing.ts"));
        });

        it("recognises the conventional test folders", () => {
            assert.isTrue(filter.isTestPath("/project/tests/helper.ts"));
            assert.isTrue(filter.isTestPath("D:\\project\\test\\src\\helper.ts"));
            assert.isTrue(filter.isTestPath("/project/test/build-es5/test/helper.js"));
            assert.isFalse(filter.isTestPath("/project/src/test-utils.ts"));
        });

        it("treats an empty name as not a test", () => {
            assert.isFalse(filter.isTestPath(""));
            assert.isFalse(filter.isTestPath(undefined as any));
        });
    });

    describe("isInScope", () => {
        it("keeps files under the working directory that are not in node_modules", () => {
            assert.isTrue(filter.isInScope("D:\\work\\project\\src\\a.ts", cwd));
            assert.isTrue(filter.isInScope("d:/work/project/src/a.ts", cwd), "case and separators do not matter");
            assert.isFalse(filter.isInScope("D:\\work\\other\\src\\a.ts", cwd));
            assert.isFalse(filter.isInScope("D:\\work\\project\\node_modules\\dep\\index.js", cwd));
        });

        it("accepts everything outside node_modules when no working directory is given", () => {
            assert.isTrue(filter.isInScope("/anywhere/src/a.ts", ""));
            assert.isFalse(filter.isInScope("/anywhere/node_modules/dep/index.js", ""));
        });
    });

    describe("filter", () => {
        it("keeps only the TypeScript sources when there are any", () => {
            const coverage: any = {
                "D:\\work\\project\\src\\a.ts": { a: 1 },
                "D:\\work\\project\\src\\b.js": { b: 1 },
                "D:\\work\\project\\src\\index.ts": { index: 1 },
                "D:\\work\\project\\src\\polyfills.ts": { polyfills: 1 },
                "D:\\work\\project\\test\\src\\a.test.ts": { test: 1 },
                "D:\\work\\project\\node_modules\\dep\\index.ts": { dep: 1 },
                "D:\\work\\other\\src\\c.ts": { other: 1 }
            };

            const result = filter.filter(coverage, cwd);

            assert.deepEqual(Object.keys(result), ["D:\\work\\project\\src\\a.ts"]);
            assert.equal(result["D:\\work\\project\\src\\a.ts"], coverage["D:\\work\\project\\src\\a.ts"], "entries are passed through untouched");
        });

        it("falls back to every in-scope file when no TypeScript source is present", () => {
            const coverage: any = {
                "D:\\work\\project\\lib\\a.js": { a: 1 },
                "D:\\work\\project\\lib\\b.js": { b: 1 },
                "D:\\work\\project\\lib\\a.test.js": { test: 1 },
                "D:\\work\\project\\node_modules\\dep\\index.js": { dep: 1 }
            };

            const result = filter.filter(coverage, cwd);

            assert.deepEqual(Object.keys(result).sort(), ["D:\\work\\project\\lib\\a.js", "D:\\work\\project\\lib\\b.js"]);
        });

        it("returns an empty map for missing or empty coverage", () => {
            assert.deepEqual(filter.filter(undefined as any, cwd), {});
            assert.deepEqual(filter.filter({}, cwd), {});
        });
    });
});
