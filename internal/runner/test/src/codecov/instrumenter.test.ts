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
import * as ts from "typescript";
import { assert } from "@nevware21/tripwire";
import { createInstrumenter, extractSourceMap, IstanbulCoverageInstrumenter } from "../../../src/codecov/instrumenter";
import { _isUserError, _userErrorHints } from "../../../src/internal/userError";

function captureWarnings(fn: () => void): string[] {
    const warnings: string[] = [];
    const orgWarn = console.warn;
    console.warn = (...args: any[]) => {
        warnings.push(args.join(" "));
    };

    try {
        fn();
    } finally {
        console.warn = orgWarn;
    }

    return warnings;
}

function inlineMap(map: any): string {
    return "//# sourceMappingURL=data:application/json;charset=utf-8;base64," + Buffer.from(JSON.stringify(map)).toString("base64");
}

/**
 * The coverage instrumenter rewrites the browser and worker payloads so they record coverage. It loads an
 * istanbul style module from the project, and accepts several shapes of module API.
 */
describe("codecov instrumenter", () => {
    let scratch: string;

    function writeModule(name: string, source: string): string {
        const file = path.join(scratch, name + ".js");
        fs.writeFileSync(file, source, "utf8");

        return file;
    }

    before(() => {
        scratch = fs.mkdtempSync(path.join(os.tmpdir(), "tripwire-instrumenter-"));
    });

    after(() => {
        fs.rmSync(scratch, { recursive: true, force: true });
    });

    describe("extractSourceMap", () => {
        const map = { version: 3, sources: [ "a.ts" ], names: [] as string[], mappings: "AAAA" };

        it("reads an inline base64 source map", () => {
            assert.deepEqual(extractSourceMap("var a = 1;\n" + inlineMap(map), "/proj/a.js"), map);
            assert.deepEqual(extractSourceMap("var a = 1;\n//# sourceMappingURL=data:application/json;base64," + Buffer.from(JSON.stringify(map)).toString("base64"), "/proj/a.js"), map,
                "the charset is optional");
        });

        it("returns null for an inline map that is not JSON", () => {
            assert.isNull(extractSourceMap("var a;\n//# sourceMappingURL=data:application/json;base64," + Buffer.from("not json").toString("base64"), "/proj/a.js"));
        });

        it("reads a map file next to the module, decoding its name", () => {
            const dir = path.join(scratch, "maps");
            fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(path.join(dir, "my file.js.map"), JSON.stringify(map), "utf8");

            assert.deepEqual(extractSourceMap("var a;\n//# sourceMappingURL=my%20file.js.map", path.join(dir, "module.js")), map);
        });

        it("returns null when there is no map, the map file is missing or unreadable, or the data url is not base64 JSON", () => {
            const dir = path.join(scratch, "maps");
            fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(path.join(dir, "broken.js.map"), "{", "utf8");

            assert.isNull(extractSourceMap("var a = 1;", "/proj/a.js"));
            assert.isNull(extractSourceMap("", "/proj/a.js"));
            assert.isNull(extractSourceMap(undefined, "/proj/a.js"));
            assert.isNull(extractSourceMap("var a;\n//# sourceMappingURL=missing.js.map", path.join(dir, "module.js")));
            assert.isNull(extractSourceMap("var a;\n//# sourceMappingURL=broken.js.map", path.join(dir, "module.js")));
            assert.isNull(extractSourceMap("var a;\n//# sourceMappingURL=data:text/plain,hello", path.join(dir, "module.js")));
        });
    });

    describe("with istanbul-lib-instrument", () => {
        it("instruments a module and reports the file's coverage map", () => {
            const instrumenter = createInstrumenter(scratch);
            assert.ok(instrumenter instanceof IstanbulCoverageInstrumenter);

            const moduleId = path.join(scratch, "src", "a.js");
            const output = instrumenter.instrument("var a = 1;\nfunction f() { return a; }\n", moduleId);

            assert.includes(output, "__coverage__");
            const coverage = instrumenter.getLastFileCoverage();
            assert.equal(coverage.path, moduleId);
            assert.isTrue(Object.keys(coverage.statementMap).length >= 2);
            assert.equal(Object.keys(coverage.fnMap).length, 1);
        });

        it("maps the coverage back through the input source map", () => {
            const compiled = ts.transpileModule("export const answer: number = 42;\nexport function ask(): number { return answer; }\n", {
                compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES5, inlineSourceMap: true, inlineSources: true },
                fileName: path.join(scratch, "src", "b.ts")
            }).outputText;
            const moduleId = path.join(scratch, "src", "b.js");
            const sourceMap = extractSourceMap(compiled, moduleId);
            const instrumenter = createInstrumenter(scratch);

            assert.isObject(sourceMap);
            instrumenter.instrument(compiled, moduleId, sourceMap);
            assert.isObject(instrumenter.getLastFileCoverage().inputSourceMap, "the input map travels with the coverage");
        });

        it("reports a missing instrumenter module as a user error with install hints", () => {
            const instrumenter = new IstanbulCoverageInstrumenter(scratch, "definitely-not-an-instrumenter");

            let failure: any = null;
            try {
                instrumenter.instrument("var a;", "/proj/a.js");
            } catch (e) {
                failure = e;
            }

            assert.isTrue(_isUserError(failure));
            assert.includes(failure.message, "unable to resolve 'definitely-not-an-instrumenter'");
            assert.includes(_userErrorHints(failure)[0], "npm install --save-dev definitely-not-an-instrumenter");
        });

        it("reports a module without an instrumenter API as a user error", () => {
            const instrumenter = new IstanbulCoverageInstrumenter(scratch, writeModule("noApi", "module.exports = { other: 1 };"));

            assert.throws(() => instrumenter.getLastFileCoverage(), "does not expose createInstrumenter or instrumentSync");
        });
    });

    describe("createInstrumenter", () => {
        it("passes the source through unchanged when instrumentation is turned off", () => {
            [ "none", "NONE", "" ].forEach((name) => {
                assert.equal(createInstrumenter(scratch, name).instrument("var a = 1;", "/proj/a.js"), "var a = 1;", JSON.stringify(name));
            });
        });

        it("warns and passes the source through when the module cannot be resolved", () => {
            let instrumenter: any;
            const warnings = captureWarnings(() => {
                instrumenter = createInstrumenter(scratch, "definitely-not-an-instrumenter");
            });

            assert.includes(warnings[0], "unable to resolve 'definitely-not-an-instrumenter'");
            assert.equal(instrumenter.instrument("src", "/proj/a.js"), "src");
        });

        it("uses a module exposing instrumentSync directly, and its last file coverage", () => {
            const file = writeModule("syncApi", [
                "let last = null;",
                "module.exports = {",
                "    instrumentSync: (src, id, map) => { last = { path: id, map: !!map }; return '/*sync*/' + src; },",
                "    lastFileCoverage: () => last",
                "};"
            ].join("\n"));
            const instrumenter = createInstrumenter(scratch, file);

            assert.equal(instrumenter.instrument("x", "/proj/a.js"), "/*sync*/x");
            assert.deepEqual(instrumenter.getLastFileCoverage(), { path: "/proj/a.js", map: false });
            instrumenter.instrument("x", "/proj/b.js", { mappings: "AAAA" });
            assert.deepEqual(instrumenter.getLastFileCoverage(), { path: "/proj/b.js", map: true });
        });

        it("unwraps a default export that creates the instrumenter, and copes without lastFileCoverage", () => {
            const file = writeModule("defaultApi", [
                "module.exports = { default: { createInstrumenter: (options) => ({",
                "    instrumentSync: (src) => '/*' + options.coverageVariable + '*/' + src",
                "}) } };"
            ].join("\n"));
            const instrumenter = createInstrumenter(scratch, file);

            assert.equal(instrumenter.instrument("x", "/proj/a.js"), "/*__coverage__*/x");
            assert.isNull(instrumenter.getLastFileCoverage());
        });

        it("accepts a factory that returns an instrumentSync object", () => {
            const file = writeModule("factoryObject", [
                "module.exports = (options, ctx) => ({",
                "    instrumentSync: (src, id, map) => '/*' + ctx.cwd.length + (map ? ':map' : '') + '*/' + src",
                "});"
            ].join("\n"));
            const instrumenter = createInstrumenter(scratch, file);

            assert.equal(instrumenter.instrument("x", "/proj/a.js"), "/*" + scratch.length + "*/x");
            assert.equal(instrumenter.instrument("x", "/proj/a.js", { mappings: "AAAA" }), "/*" + scratch.length + ":map*/x");
        });

        it("accepts a factory that returns an instrument function, keeping the source when it does not answer with a string", () => {
            const fnStyle = createInstrumenter(scratch, writeModule("factoryFn", "module.exports = () => (src, id) => '/*' + id + '*/' + src;"));
            const notString = createInstrumenter(scratch, writeModule("factoryFnNumber", "module.exports = () => () => 42;"));

            assert.equal(fnStyle.instrument("x", "a.js"), "/*a.js*/x");
            assert.equal(notString.instrument("x", "a.js"), "x");
        });

        it("warns and passes the source through for a module it cannot use", () => {
            let objectApi: any;
            let emptyFactory: any;
            const warnings = captureWarnings(() => {
                objectApi = createInstrumenter(scratch, writeModule("objectNoApi", "module.exports = { nothing: true };"));
                emptyFactory = createInstrumenter(scratch, writeModule("factoryNothing", "module.exports = () => undefined;"));
            });

            assert.equal(warnings.length, 2);
            warnings.forEach((w) => assert.includes(w, "does not expose a supported API"));
            assert.equal(objectApi.instrument("x", "a.js"), "x");
            assert.equal(emptyFactory.instrument("x", "a.js"), "x");
        });
    });
});
