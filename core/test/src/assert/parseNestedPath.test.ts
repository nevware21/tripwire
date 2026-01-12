/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { _parseNestedPath } from "../../../src/assert/funcs/nested";
import { assert } from "../../../src/assert/assertClass";

describe("_parseNestedPath", () => {
    describe("simple paths", () => {
        it("should parse a single property", () => {
            const result = _parseNestedPath("a");
            assert.deepEqual(result, ["a"]);
        });

        it("should parse dot-separated properties", () => {
            const result = _parseNestedPath("a.b.c");
            assert.deepEqual(result, ["a", "b", "c"]);
        });

        it("should parse deeply nested dot notation", () => {
            const result = _parseNestedPath("a.b.c.d.e.f");
            assert.deepEqual(result, ["a", "b", "c", "d", "e", "f"]);
        });
    });

    describe("bracket notation", () => {
        it("should parse array index notation", () => {
            const result = _parseNestedPath("a[0]");
            assert.deepEqual(result, ["a", "0"]);
        });

        it("should parse multiple bracket indices", () => {
            const result = _parseNestedPath("a[0][1]");
            assert.deepEqual(result, ["a", "0", "1"]);
        });

        it("should parse bracket notation with property name", () => {
            const result = _parseNestedPath("a[b]");
            assert.deepEqual(result, ["a", "b"]);
        });

        it("should parse mixed dot and bracket notation", () => {
            const result = _parseNestedPath("a.b[0].c");
            assert.deepEqual(result, ["a", "b", "0", "c"]);
        });

        it("should parse complex mixed notation", () => {
            const result = _parseNestedPath("a.b[0][1].c[2].d");
            assert.deepEqual(result, ["a", "b", "0", "1", "c", "2", "d"]);
        });

        it("should parse bracket with numeric index", () => {
            const result = _parseNestedPath("a.b[1]");
            assert.deepEqual(result, ["a", "b", "1"]);
        });
    });

    describe("escaped characters", () => {
        it("should handle escaped dot", () => {
            const result = _parseNestedPath("\\.a");
            assert.deepEqual(result, [".a"]);
        });

        it("should handle escaped bracket", () => {
            const result = _parseNestedPath("\\[b\\]");
            assert.deepEqual(result, ["[b]"]);
        });

        it("should handle escaped dot in middle of path", () => {
            const result = _parseNestedPath("a.\\.b.c");
            assert.deepEqual(result, ["a", ".b", "c"]);
        });

        it("should handle multiple escaped characters", () => {
            const result = _parseNestedPath("\\.a.\\[b\\]");
            assert.deepEqual(result, [".a", "[b]"]);
        });

        it("should handle complex escaped path matching Chai test", () => {
            const result = _parseNestedPath("\\.a.\\[b\\]");
            assert.deepEqual(result, [".a", "[b]"]);
        });

        it("should handle escaped backslash", () => {
            const result = _parseNestedPath("a.\\\\b.c");
            assert.deepEqual(result, ["a", "\\b", "c"]);
        });
    });

    describe("edge cases", () => {
        it("should handle empty string", () => {
            const result = _parseNestedPath("");
            assert.deepEqual(result, [""]);
        });

        it("should handle path with empty bracket", () => {
            const result = _parseNestedPath("a[]");
            assert.deepEqual(result, ["a", ""]);
        });

        it("should handle path ending with dot", () => {
            const result = _parseNestedPath("a.b.");
            assert.deepEqual(result, ["a", "b", ""]);
        });

        it("should handle consecutive dots", () => {
            const result = _parseNestedPath("a..b");
            assert.deepEqual(result, ["a", "", "b"]);
        });

        it("should handle path starting with dot", () => {
            const result = _parseNestedPath(".a.b");
            assert.deepEqual(result, ["", "a", "b"]);
        });
    });

    describe("real-world examples from Chai tests", () => {
        it("should parse a.b[1] (array access)", () => {
            const result = _parseNestedPath("a.b[1]");
            assert.deepEqual(result, ["a", "b", "1"]);
        });

        it("should parse a.b[0] (first array element)", () => {
            const result = _parseNestedPath("a.b[0]");
            assert.deepEqual(result, ["a", "b", "0"]);
        });

        it("should parse a.b.c (nested properties)", () => {
            const result = _parseNestedPath("a.b.c");
            assert.deepEqual(result, ["a", "b", "c"]);
        });

        it("should parse escaped property names", () => {
            const result = _parseNestedPath("\\.a.\\[b\\]");
            assert.deepEqual(result, [".a", "[b]"]);
        });
    });

    describe("unclosed brackets", () => {
        it("should handle unclosed bracket at end", () => {
            const result = _parseNestedPath("a[0");
            // When bracket is not closed, it should be treated as regular characters
            assert.deepEqual(result, ["a[0"]);
        });

        it("should handle unclosed bracket in middle", () => {
            const result = _parseNestedPath("a[0.b");
            // Unclosed bracket means it's treated as part of the path
            assert.deepEqual(result, ["a[0", "b"]);
        });
    });

    describe("closing bracket without opening bracket", () => {
        it("should handle closing bracket without opening bracket at start", () => {
            const result = _parseNestedPath("]a");
            assert.deepEqual(result, ["]a"]);
        });

        it("should handle closing bracket without opening bracket in middle", () => {
            const result = _parseNestedPath("a.b].c");
            assert.deepEqual(result, ["a", "b]", "c"]);
        });

        it("should handle multiple unmatched closing brackets", () => {
            const result = _parseNestedPath("a]b]c");
            assert.deepEqual(result, ["a]b]c"]);
        });
    });
});
