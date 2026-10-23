/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import * as path from "path";
import { assert } from "@nevware21/tripwire";
import { _findUncheckedFiles, _formatTypeCheckScope } from "../../../src/internal/typeCheckScope";

const _root = path.resolve("/proj");

function _abs(...parts: string[]): string {
    return path.join(_root, ...parts);
}

describe("typeCheckScope", () => {
    describe("_findUncheckedFiles", () => {
        it("should report nothing when every matched file is in the project", () => {
            const scope = _findUncheckedFiles(
                [_abs("test", "a.test.ts"), _abs("test", "b.test.ts")],
                [_abs("test", "a.test.ts"), _abs("test", "b.test.ts"), _abs("src", "index.ts")]
            );

            assert.deepEqual(scope.unchecked, []);
            assert.equal(scope.checked, 2);
        });

        it("should report a matched file the project does not cover", () => {
            const outside = _abs("probe", "orphan.test.ts");
            const scope = _findUncheckedFiles(
                [_abs("test", "a.test.ts"), outside],
                [_abs("test", "a.test.ts")]
            );

            assert.deepEqual(scope.unchecked, [outside]);
            assert.equal(scope.checked, 1);
        });

        it("should ignore non-TypeScript files, which --type-check never claimed to cover", () => {
            const scope = _findUncheckedFiles(
                [_abs("test", "a.test.js"), _abs("test", "b.test.mjs")],
                []
            );

            assert.deepEqual(scope.unchecked, []);
            assert.equal(scope.checked, 0);
        });

        it("should count .tsx as TypeScript", () => {
            const outside = _abs("test", "widget.test.tsx");
            const scope = _findUncheckedFiles([outside], []);

            assert.deepEqual(scope.unchecked, [outside]);
        });

        it("should treat separators and relative segments as the same file", () => {
            const scope = _findUncheckedFiles(
                [_abs("test", "a.test.ts")],
                [_root + "\\test\\..\\test\\a.test.ts"]
            );

            assert.deepEqual(scope.unchecked, []);
            assert.equal(scope.checked, 1);
        });

        it("should ignore case by default, and honour it when asked", () => {
            const matched = [_abs("test", "A.test.ts")];
            const project = [_abs("test", "a.test.ts")];

            assert.deepEqual(_findUncheckedFiles(matched, project).unchecked, [], "case-insensitive");
            assert.deepEqual(_findUncheckedFiles(matched, project, true).unchecked, matched, "case-sensitive");
        });

        it("should treat an empty project as covering nothing", () => {
            const scope = _findUncheckedFiles([_abs("test", "a.test.ts")], null as any);

            assert.equal(scope.unchecked.length, 1);
        });
    });

    describe("_formatTypeCheckScope", () => {
        const project = _abs("test", "tsconfig.test.json");

        it("should produce nothing when the two sets agree", () => {
            assert.deepEqual(_formatTypeCheckScope({ checked: 3, unchecked: [] }, project, _root), []);
        });

        it("should count both sides and name the files", () => {
            const lines = _formatTypeCheckScope({
                checked: 4,
                unchecked: [_abs("probe", "a.test.ts"), _abs("probe", "b.test.ts")]
            }, project, _root);

            assert.equal(lines[0], "2 of 6 matched TypeScript file(s) are outside test/tsconfig.test.json and were not type-checked:");
            assert.equal(lines[1], "  probe/a.test.ts");
            assert.equal(lines[2], "  probe/b.test.ts");
            assert.isTrue(lines[3].indexOf("include") !== -1, "names the fix");
            assert.isTrue(lines[4].indexOf("--strict-type-check") !== -1, "offers the stricter flag");
        });

        it("should collapse the tail rather than listing a whole tree", () => {
            const unchecked = [];
            for (let lp = 0; lp < 9; lp++) {
                unchecked.push(_abs("probe", "f" + lp + ".test.ts"));
            }

            const lines = _formatTypeCheckScope({ checked: 0, unchecked }, project, _root);

            assert.equal(lines[1], "  probe/f0.test.ts");
            assert.equal(lines[3], "  probe/f2.test.ts");
            assert.equal(lines[4], "  ... 6 more");
        });

        it("should drop the flag suggestion when it is already the flag talking", () => {
            const lines = _formatTypeCheckScope({
                checked: 0,
                unchecked: [_abs("probe", "a.test.ts")]
            }, project, _root, true);

            for (let lp = 0; lp < lines.length; lp++) {
                assert.isTrue(lines[lp].indexOf("--strict-type-check") === -1, "line " + lp + ": " + lines[lp]);
            }
        });
    });
});
