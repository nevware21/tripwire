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
import { assert } from "@nevware21/tripwire";
import { getCompileProvider } from "../../../src/compile/provider";
import { getCompileCacheStatus, transpileTypeScriptSource } from "../../../src/compile/tsCompile";
import {
    _getCompileCacheStatus, _getCompileProvider, _getProjectFileNames, _invalidateTypeScriptTranspileCache, _registerTypeScriptHook,
    _setGraphTypeCheck
} from "../../../src/execute/compile";
import { _resolveBrowserDependency } from "../../../src/execute/browser";
import { _isUserError } from "../../../src/internal/userError";

/**
 * The execute layer's view of compiling: picking the compile provider, and the wrappers the run uses
 * around the TypeScript compiler. Also how a browser or worker module's imports are found on disk.
 */
describe("execute compile", function () {
    // Some cases build a small TypeScript program
    this.timeout(60000);

    let scratch: string;

    function write(name: string, text: string): string {
        const file = path.join(scratch, name);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, text, "utf8");

        return file;
    }

    beforeEach(() => {
        scratch = fs.mkdtempSync(path.join(os.tmpdir(), "tripwire-execute-compile-"));
    });

    afterEach(() => {
        _setGraphTypeCheck(false);
        _invalidateTypeScriptTranspileCache();
        fs.rmSync(scratch, { recursive: true, force: true });
    });

    describe("_getCompileProvider", () => {
        const PROVIDER = "{ compile: function () {}, registerHook: function () {}, transpile: function () { return 'custom'; } }";

        it("uses the built in TypeScript provider when none is named", () => {
            assert.equal(_getCompileProvider(), getCompileProvider());
            assert.equal(_getCompileProvider(""), getCompileProvider());
        });

        it("loads a named provider module, a provider factory, or a default export", () => {
            const direct = _getCompileProvider(write("direct.js", "module.exports = " + PROVIDER + ";"));
            const factory = _getCompileProvider(write("factory.js", "module.exports = { getCompileProvider: function () { return " + PROVIDER + "; } };"));
            const wrapped = _getCompileProvider(write("wrapped.js", "module.exports = { default: " + PROVIDER + " };"));

            [ direct, factory, wrapped ].forEach((loaded) => {
                assert.equal(loaded.transpile("a.ts", "", scratch), "custom");
            });
        });

        it("rejects a provider without compile or registerHook as a user error", () => {
            const noCompile = write("noCompile.js", "module.exports = { registerHook: function () {} };");
            const noHook = write("noHook.js", "module.exports = { compile: function () {} };");

            [ [ noCompile, "missing compile(options)" ], [ noHook, "missing registerHook(options)" ] ].forEach((entry) => {
                let failure: any = null;
                try {
                    _getCompileProvider(entry[0]);
                } catch (e) {
                    failure = e;
                }

                assert.isTrue(_isUserError(failure), entry[0]);
                assert.includes(failure.message, "Invalid compile provider '" + entry[0] + "': " + entry[1]);
            });
        });

        it("reports a provider that cannot be loaded as a user error", () => {
            let failure: any = null;
            try {
                _getCompileProvider(path.join(scratch, "missing.js"));
            } catch (e) {
                failure = e;
            }

            assert.isTrue(_isUserError(failure));
        });

        it("passes through a module that exports nothing", () => {
            assert.isUndefined(_getCompileProvider(write("empty.js", "module.exports = null;")));
        });
    });

    describe("compiler wrappers", () => {
        it("registers the hook through the provider", () => {
            const provider = getCompileProvider();
            const orgRegister = provider.registerHook;
            const calls: any[] = [];
            provider.registerHook = function () {
                calls.push(Array.prototype.slice.call(arguments));
            };

            try {
                _registerTypeScriptHook("tsconfig.json", scratch, true, { strict: true }, { incremental: true });
            } finally {
                provider.registerHook = orgRegister;
            }

            assert.deepEqual(calls, [ [ "tsconfig.json", scratch, true, { strict: true }, { incremental: true } ] ]);
        });

        it("reports the compile cache status", () => {
            assert.equal(_getCompileCacheStatus(), getCompileCacheStatus());
        });

        it("lists the project's files, or null when the project cannot be read", () => {
            write("tsconfig.json", JSON.stringify({ compilerOptions: { types: [] }, include: [ "*.ts" ] }));
            const main = write("main.ts", "export const a = 1;\n");

            assert.deepEqual((_getProjectFileNames("tsconfig.json", scratch) || []).map((f) => path.resolve(f)), [ main ]);
            assert.isNull(_getProjectFileNames("missing.json", scratch));
            assert.isNull(_getProjectFileNames(null as any, scratch), "a throw is not passed on");

            write("later.ts", "export const b = 2;\n");
            _invalidateTypeScriptTranspileCache();
            assert.equal((_getProjectFileNames("tsconfig.json", scratch) || []).length, 2, "invalidated with the program cache");
        });

        it("turns the graph type-check on and off", () => {
            write("tsconfig.json", JSON.stringify({ compilerOptions: { types: [], lib: [ "es2018" ] }, include: [ "*.ts" ] }));
            const main = write("main.ts", "export const a = 1;\n");
            write("bad.ts", "export const b: number = \"b\";\n");

            _setGraphTypeCheck(true);
            assert.throws(() => transpileTypeScriptSource(main, "", scratch), "TypeScript compile failed with 1 error(s)");

            _setGraphTypeCheck(false);
            _invalidateTypeScriptTranspileCache();
            assert.includes(transpileTypeScriptSource(main, "", scratch), "exports.a = 1");
        });
    });

    describe("_resolveBrowserDependency", () => {
        it("resolves packages from the module's folder or the working directory", () => {
            const runnerDir = path.resolve(__dirname, "../../..");

            assert.includes(_resolveBrowserDependency("typescript", path.join(scratch, "a.ts"), runnerDir).split(path.sep).join("/"), "/typescript/");
        });

        it("resolves relative imports node can find", () => {
            const helper = write("lib/helper.js", "module.exports = 1;");

            assert.equal(_resolveBrowserDependency("./lib/helper", path.join(scratch, "a.ts"), scratch), helper);
        });

        it("finds relative imports with extensions node does not load", () => {
            const component = write("view.jsx", "export default 1;");
            const indexed = write("widgets/index.jsx", "export default 2;");
            const moduleId = path.join(scratch, "a.ts");

            assert.equal(_resolveBrowserDependency("./view", moduleId, scratch), component);
            assert.equal(_resolveBrowserDependency("./widgets", moduleId, scratch), indexed, "a folder resolves to its index file, not itself");
            assert.equal(_resolveBrowserDependency(component, path.join(scratch, "deep", "b.ts"), scratch), component, "an absolute path");
        });

        it("passes on node's error for an import it cannot find", () => {
            const moduleId = path.join(scratch, "a.ts");
            fs.mkdirSync(path.join(scratch, "empty"));

            assert.throws(() => _resolveBrowserDependency("./missing", moduleId, scratch), "Cannot find module");
            assert.throws(() => _resolveBrowserDependency("./empty", moduleId, scratch), "Cannot find module");
            assert.throws(() => _resolveBrowserDependency("no-such-package-anywhere", moduleId, scratch), "Cannot find module");
        });
    });
});
