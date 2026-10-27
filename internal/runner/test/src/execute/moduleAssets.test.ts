/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import * as ts from "typescript";
import { TraceMap, originalPositionFor } from "@jridgewell/trace-mapping";
import { assert } from "@nevware21/tripwire";
import { _buildBundledModuleAsset, _buildModuleAssetRegistry } from "../../../src/execute/moduleAssets";

const DEFINE_ARGS = "function(require, module, exports, global, globalThis, window, self, process, __filename, __dirname) {\n";

function compile(fileName: string, source: string, withMap: boolean): string {
    return ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2018, inlineSourceMap: withMap, inlineSources: withMap },
        fileName: fileName
    }).outputText;
}

function inlineMap(map: any): string {
    return "\n//# sourceMappingURL=data:application/json;base64," + Buffer.from(JSON.stringify(map)).toString("base64");
}

function lineOf(text: string, value: string): number {
    const lines = text.split("\n");
    for (let lp = 0; lp < lines.length; lp++) {
        if (lines[lp].indexOf(value) !== -1) {
            return lp + 1;
        }
    }

    return -1;
}

/**
 * Wrapping the compiled test modules for the browser and worker runner: one served asset per module, or
 * one bundle holding them all, with each module's source map carried over so DevTools and stack traces
 * still point at the original TypeScript.
 */
describe("execute moduleAssets", () => {
    const urls: Record<string, string> = {
        "/proj/src/a.ts": "/src/a.js",
        "/proj/src/b.ts": "/src/b.js"
    };

    describe("_buildModuleAssetRegistry", () => {
        it("wraps each served module in a define call for its url", () => {
            const registry = _buildModuleAssetRegistry({ "/proj/src/a.ts": "exports.a = 1;" }, urls);

            assert.deepEqual(Object.keys(registry), [ "/src/a.js" ]);
            assert.equal(registry["/src/a.js"], "__tripwireDefine__(\"/src/a.js\", " + DEFINE_ARGS + "exports.a = 1;\n});\n");
        });

        it("skips modules that have no url", () => {
            assert.deepEqual(_buildModuleAssetRegistry({ "/proj/src/unserved.ts": "exports.x = 1;" }, urls), {});
        });

        it("points each require of a served module at its url, leaving the rest alone", () => {
            const registry = _buildModuleAssetRegistry({
                "/proj/src/a.ts": "const b = require(\"/proj/src/b.ts\");\nconst fs = require(\"fs\");\nconst odd = require(\"bad\\q\");\n"
            }, urls);

            const body = registry["/src/a.js"];
            assert.includes(body, "require(\"/src/b.js\")");
            assert.includes(body, "require(\"fs\")");
            assert.includes(body, "require(\"bad\\q\")", "an id that is not valid JSON is kept");
        });

        it("moves an inline source map to its own asset, shifted for the define line", () => {
            const compiled = compile("/proj/src/a.ts", "export const a: number = 1;\n", true);
            const registry = _buildModuleAssetRegistry({ "/proj/src/a.ts": compiled }, urls);

            const map = JSON.parse(registry["/src/a.js.map"]);
            const original = JSON.parse(Buffer.from(compiled.split("base64,")[1], "base64").toString("utf8"));
            assert.equal(map.mappings, ";" + original.mappings);
            assert.includes(registry["/src/a.js"], "\n//# sourceMappingURL=a.js.map\n});\n");
            assert.isFalse(registry["/src/a.js"].indexOf("base64,") !== -1, "the inline map is removed");
        });

        it("keeps a module whose inline map cannot be read as it is", () => {
            const source = "exports.a = 1;\n//# sourceMappingURL=data:application/json;base64," + Buffer.from("not json").toString("base64");
            const registry = _buildModuleAssetRegistry({ "/proj/src/a.ts": source }, urls);

            assert.isUndefined(registry["/src/a.js.map"]);
            assert.includes(registry["/src/a.js"], source);
        });
    });

    describe("_buildBundledModuleAsset", () => {
        it("defines every served module in one bundle, without a map when none had one", () => {
            const bundle = _buildBundledModuleAsset({
                "/proj/src/a.ts": "exports.a = require(\"/proj/src/b.ts\");\n//# sourceMappingURL=a.js.map",
                "/proj/src/b.ts": "exports.b = 2;\n",
                "/proj/src/unserved.ts": "exports.x = 1;"
            }, urls, "/__tripwire__/bundle.js");

            assert.isNull(bundle.map);
            assert.equal(bundle.code,
                "__tripwireDefine__(\"/src/a.js\", " + DEFINE_ARGS + "exports.a = require(\"/src/b.js\");\n});\n" +
                "__tripwireDefine__(\"/src/b.js\", " + DEFINE_ARGS + "exports.b = 2;\n});\n");
        });

        it("merges the modules' maps into one, mapping each module back to its own source", () => {
            const aSource = "export const a: number = 1;\nexport function first(): number {\n    return a;\n}\n";
            const bSource = "export const b: string = \"two\";\n\nexport function second(): string {\n    const label: string = \"second\";\n    return label;\n}\n";
            const bundle = _buildBundledModuleAsset({
                "/proj/src/a.ts": compile("/proj/src/a.ts", aSource, true),
                "/proj/src/b.ts": compile("/proj/src/b.ts", bSource, true)
            }, urls, "/__tripwire__/bundle.js");

            assert.isString(bundle.map);
            const mapComment = "//# sourceMappingURL=bundle.js.map\n";
            assert.equal(bundle.code.lastIndexOf(mapComment), bundle.code.length - mapComment.length, "the map is linked at the end");
            assert.isFalse(bundle.code.indexOf("base64,") !== -1, "the inline maps are removed");

            const map = JSON.parse(bundle.map);
            assert.equal(map.file, "bundle.js");
            assert.deepEqual(map.sources, [ "/src/a.ts", "/src/b.ts" ]);
            assert.deepEqual(map.sourcesContent, [ aSource, bSource ]);

            const trace = new TraceMap(bundle.map);
            const secondLine = lineOf(bundle.code, "return label;");
            const position = originalPositionFor(trace, { line: secondLine, column: bundle.code.split("\n")[secondLine - 1].indexOf("return") });
            assert.equal(position.source, "/src/b.ts");
            assert.equal(position.line, 5);
        });

        it("ignores mappings without a source and maps it cannot read", () => {
            const bundle = _buildBundledModuleAsset({
                "/proj/src/a.ts": "exports.a = 1;" + inlineMap({ version: 3, sources: [], names: [], mappings: "A" }),
                "/proj/src/b.ts": "exports.b = 2;" + inlineMap({ version: 3, sources: [ "b.ts" ], names: [], mappings: 42 })
            }, urls, "/bundle.js");

            assert.isNull(bundle.map);
            assert.includes(bundle.code, "exports.a = 1;\n});\n");
            assert.includes(bundle.code, "exports.b = 2;\n});\n");
        });

        it("copies no source content when a module's map has none", () => {
            const bundle = _buildBundledModuleAsset({
                "/proj/src/a.ts": compile("/proj/src/a.ts", "export const a = 1;\n", false) + inlineMap({ version: 3, sources: [ "a.ts" ], names: [], mappings: "AAAA" })
            }, urls, "/bundle.js");

            const map = JSON.parse(bundle.map);
            assert.deepEqual(map.sources, [ "/src/a.ts" ]);
            assert.isFalse(!!(map.sourcesContent && map.sourcesContent[0]), "no content");
        });
    });
});
