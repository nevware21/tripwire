/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import "../support/textImports";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { replaceAnsi } from "@nevware21/chromacon";
import { assert } from "@nevware21/tripwire";
import { _createBrowserWorkerModuleGraph } from "../../../src/execute/execute";
import { _isUserError } from "../../../src/internal/userError";

const TS_CONFIG = {
    compilerOptions: { target: "es2018", module: "commonjs", esModuleInterop: true, skipLibCheck: true, types: [] as string[], lib: [ "es2018" ] },
    include: [ "src/**/*.ts", "test/**/*.ts" ]
};

function id(file: string): string {
    return path.resolve(file).split(path.sep).join("/");
}

function decodeInlineMap(source: string): any {
    const parts = source.split("sourceMappingURL=data:application/json;base64,");

    return parts.length === 2 ? JSON.parse(Buffer.from(parts[1].trim(), "base64").toString("utf8")) : null;
}

/**
 * Building the module graph the browser and worker targets run: every module reachable from the test
 * entries, compiled, with each require pointed at the module's id, and the url each one is served at.
 *
 * The fixture project is named @nevware21/tripwire, the way core's own suite is, so its own small
 * src/index.ts stands in for the tripwire runtime the graph always includes.
 */
describe("execute module graph", function () {
    // Each graph compiles the fixture through a TypeScript program
    this.timeout(60000);

    let scratch: string;
    let project: string;
    let logs: string[];
    let orgLog: typeof console.log;

    function write(dir: string, name: string, text: string): string {
        const file = path.join(dir, name);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, text, "utf8");

        return file;
    }

    function graphFor(entries: string[], parsed?: any) {
        return _createBrowserWorkerModuleGraph(entries.map((name) => path.join(project, name)), project, parsed || {});
    }

    function failureFor(entries: string[]): any {
        try {
            graphFor(entries);
        } catch (e) {
            return e;
        }

        return null;
    }

    before(() => {
        scratch = fs.mkdtempSync(path.join(os.tmpdir(), "tripwire-module-graph-"));
        project = path.join(scratch, "project");

        write(project, "package.json", JSON.stringify({ name: "@nevware21/tripwire", version: "1.0.0" }));
        write(project, "tsconfig.json", JSON.stringify(TS_CONFIG));
        write(project, "src/index.ts", "import { EOL } from \"os\";\nexport const eol: string = EOL;\nexport function describe(name: string, fn: () => void): void {\n    fn();\n}\n");
        write(project, "src/helper.ts", "import { red } from \"@nevware21/chromacon\";\nexport function warn(text: string): string {\n    return red(text);\n}\n");
        write(project, "src/unused.ts", "export const unused = 1;\n");
        write(project, "src/data.json", "{ \"answer\": 42 }");
        write(project, "test/a.test.ts", [
            "import { describe } from \"@nevware21/tripwire\";",
            "import { warn } from \"../src/helper\";",
            "declare const require: any;",
            "const data = require(\"../src/data.json\");",
            "const vendor = require(\"vendor-pkg\");",
            "const thing = require(\"modpkg\");",
            "describe(\"a\", () => warn(String(data.answer) + vendor + thing.thing));",
            ""
        ].join("\n"));

        // A vendor package whose source map stays a separate file, served from disk
        write(project, "node_modules/vendor-pkg/package.json", JSON.stringify({ name: "vendor-pkg", version: "2.0.0", main: "index.js" }));
        write(project, "node_modules/vendor-pkg/index.js", "module.exports = require(\"./lib\");\n");
        write(project, "node_modules/vendor-pkg/lib.js", "module.exports = \"vendor\";\n//# sourceMappingURL=lib.js.map");
        write(project, "node_modules/vendor-pkg/lib.js.map", JSON.stringify({ version: 3, sources: [ "lib.ts" ], names: [], mappings: "AAAA" }));

        // A package shipping its build/es5/mod output, whose map is pointed back at its TypeScript sources
        write(project, "node_modules/modpkg/package.json", JSON.stringify({ name: "modpkg", version: "1.0.0", main: "build/es5/mod/thing.js" }));
        write(project, "node_modules/modpkg/build/es5/mod/thing.js", "exports.thing = 1;\n//# sourceMappingURL=thing.js.map");
        write(project, "node_modules/modpkg/build/es5/mod/thing.js.map", JSON.stringify({ version: 3, sources: [ "thing.js" ], names: [], mappings: "AAAA" }));
        write(project, "node_modules/modpkg/src/thing.ts", "export const thing = 1;\n");
    });

    after(() => {
        fs.rmSync(scratch, { recursive: true, force: true });
    });

    beforeEach(() => {
        logs = [];
        orgLog = console.log;
        console.log = (...args: any[]) => {
            logs.push(replaceAnsi(args.join(" "), ""));
        };
    });

    afterEach(() => {
        console.log = orgLog;
    });

    describe("a project's modules", () => {
        let graph: ReturnType<typeof graphFor>;

        before(() => {
            const orgWrite = console.log;
            console.log = () => {};
            try {
                graph = graphFor([ "test/a.test.ts" ]);
            } finally {
                console.log = orgWrite;
            }
        });

        it("starts from the test entries and the tripwire runtime", () => {
            assert.deepEqual(graph.entryIds, [ id(path.join(project, "test/a.test.ts")) ]);
            assert.equal(graph.tripwireModuleId, id(path.join(project, "src/index.ts")));
            assert.deepEqual(graph.coverageOnlyIds, []);
        });

        it("compiles each TypeScript module and points its requires at the module ids", () => {
            const entry = graph.modules[id(path.join(project, "test/a.test.ts"))];

            assert.includes(entry, "require(\"" + graph.tripwireModuleId + "\")");
            assert.includes(entry, "require(\"" + id(path.join(project, "src/helper.ts")) + "\")");
            assert.includes(entry, "require(\"" + id(path.join(project, "src/data.json")) + "\")");
            assert.includes(entry, "require(\"" + id(path.join(project, "node_modules/vendor-pkg/index.js")) + "\")");
            assert.isFalse(entry.indexOf("sourceMappingURL=data:") !== -1, "no source map unless asked for");
        });

        it("gives the os module a browser shim and chromacon its browser build", () => {
            const runtime = graph.modules[graph.tripwireModuleId];
            const helper = graph.modules[id(path.join(project, "src/helper.ts"))];
            const chromaconId = Object.keys(graph.modules).filter((moduleId) => /\/chromacon\.js$/.test(moduleId))[0];

            assert.includes(runtime, "require(\"/__tripwire__/browser/os-shim.js\")");
            assert.includes(graph.modules["/__tripwire__/browser/os-shim.js"], "EOL: '\\n'");
            assert.isString(chromaconId, "the browser build of chromacon is in the graph");
            assert.includes(helper, "require(\"" + chromaconId + "\")");
            assert.equal(graph.moduleUrls[chromaconId].indexOf("/node_modules/@nevware21/chromacon/"), 0);
        });

        it("wraps a JSON module as a CommonJS export", () => {
            assert.equal(graph.modules[id(path.join(project, "src/data.json"))], "module.exports = { \"answer\": 42 };");
        });

        it("serves each module at a url mirroring its path, as JavaScript", () => {
            assert.equal(graph.moduleUrls[id(path.join(project, "test/a.test.ts"))], "/test/a.test.js");
            assert.equal(graph.moduleUrls[graph.tripwireModuleId], "/src/index.js");
            assert.equal(graph.moduleUrls[id(path.join(project, "src/data.json"))], "/src/data.json");
            assert.equal(graph.moduleUrls[id(path.join(project, "node_modules/vendor-pkg/lib.js"))], "/node_modules/vendor-pkg/lib.js");
            assert.equal(graph.moduleUrls["/__tripwire__/browser/os-shim.js"], "/__tripwire__/browser/os-shim.js");
        });

        it("serves a vendor module's separate source map from disk", () => {
            assert.equal(graph.rawAssets["/node_modules/vendor-pkg/lib.js.map"], id(path.join(project, "node_modules/vendor-pkg/lib.js.map")));
            assert.includes(graph.modules[id(path.join(project, "node_modules/vendor-pkg/lib.js"))], "//# sourceMappingURL=lib.js.map");
        });

        it("points a build/es5/mod source map back at the package's TypeScript sources", () => {
            const thing = graph.modules[id(path.join(project, "node_modules/modpkg/build/es5/mod/thing.js"))];
            const map = decodeInlineMap(thing);

            assert.isObject(map, "the map is inlined");
            assert.deepEqual(map.sources, [ "/node_modules/modpkg/src/thing.ts" ]);
            assert.deepEqual(map.sourcesContent, [ "export const thing = 1;\n" ]);
            assert.equal(map.sourceRoot, "");
        });

        it("reports the size of the graph it built", () => {
            assert.isTrue(graph.elapsedMs >= 0);
        });
    });

    describe("options", () => {
        it("adds the project's other sources for coverage, with source maps", () => {
            const graph = graphFor([ "test/a.test.ts" ], { coverage: true, coverageSrc: [ "src/**/*.ts" ] });

            assert.isTrue(graph.coverageOnlyIds.indexOf(id(path.join(project, "src/unused.ts"))) !== -1, "a source nothing imports is included");
            assert.isObject(decodeInlineMap(graph.modules[id(path.join(project, "src/unused.ts"))]));
            assert.includes(logs.join("\n"), "Module graph: ");
        });

        it("adds source maps for an interactive launch, but not for puppeteer", () => {
            const entry = id(path.join(project, "test/a.test.ts"));

            assert.isObject(decodeInlineMap(graphFor([ "test/a.test.ts" ], { sourceMaps: true, browserLaunch: "open" }).modules[entry]));
            assert.isNull(decodeInlineMap(graphFor([ "test/a.test.ts" ], { sourceMaps: true, browserLaunch: "puppeteer" }).modules[entry]));
        });
    });

    describe("modules from outside the project", () => {
        it("serves a package outside the project under its name and version", () => {
            write(scratch, "outside/pkg/package.json", JSON.stringify({ name: "outside-pkg", version: "3.0.0" }));
            write(scratch, "outside/pkg/lib/util.js", "module.exports = 3;\n");
            write(project, "test/outside.test.ts", "declare const require: any;\nexport const value = require(\"../../outside/pkg/lib/util\");\n");

            const graph = graphFor([ "test/outside.test.ts" ]);

            assert.equal(graph.moduleUrls[id(path.join(scratch, "outside/pkg/lib/util.js"))], "/__tripwire__/vendor/outside-pkg@3.0.0/lib/util.js");
        });

        it("numbers a file that belongs to no package", function () {
            for (let dir = scratch; ; dir = path.dirname(dir)) {
                if (fs.existsSync(path.join(dir, "package.json"))) {
                    // A package above the temp folder would claim the file
                    this.skip();
                }

                if (path.dirname(dir) === dir) {
                    break;
                }
            }

            write(scratch, "loose/loose.js", "module.exports = 4;\n");
            write(project, "test/loose.test.ts", "declare const require: any;\nexport const value = require(\"../../loose/loose\");\n");

            const graph = graphFor([ "test/loose.test.ts" ]);

            assert.equal(graph.moduleUrls[id(path.join(scratch, "loose/loose.js"))], "/__tripwire__/vendor/_unpackaged/0/loose.js");
        });
    });

    describe("modules a browser cannot load", () => {
        it("rejects a node builtin as a user error naming the module that needs it", () => {
            write(project, "test/builtin.test.ts", "import * as fs from \"node:fs\";\nexport const exists = fs.existsSync;\n");

            const failure = failureFor([ "test/builtin.test.ts" ]);

            assert.isTrue(_isUserError(failure));
            assert.includes(failure.message, "Node builtin module 'node:fs' is not supported in browser/worker target (required by " + id(path.join(project, "test/builtin.test.ts")) + ")");
        });

        it("rejects a native addon as a user error", () => {
            write(project, "test/addon.node", "not really native");
            write(project, "test/native.test.ts", "declare const require: any;\nexport const addon = require(\"./addon.node\");\n");

            const failure = failureFor([ "test/native.test.ts" ]);

            assert.isTrue(_isUserError(failure));
            assert.includes(failure.message, "Native module is not supported in browser/worker target: " + id(path.join(project, "test/addon.node")));
        });

        it("passes on the error for an import that cannot be found", () => {
            write(project, "test/missing.test.ts", "declare const require: any;\nexport const gone = require(\"./not-here\");\n");

            assert.includes(failureFor([ "test/missing.test.ts" ]).message, "Cannot find module './not-here'");
        });
    });
});
