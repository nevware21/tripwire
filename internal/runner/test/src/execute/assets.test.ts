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
import { assert } from "@nevware21/tripwire";
import {
    _getAssetFile, _getInlineMapAsset, _getRunnerBinAsset, _getSourceAsset, _getVendorAsset, _normalizeAssetUrl
} from "../../../src/execute/assets";
import { _loadRunnerWorkerScript } from "../../../src/execute/worker";

// The asset helpers look their files up next to their own module, which is this folder when the
// tests run from source
const EXECUTE_DIR = path.resolve(__dirname, "../../../src/execute");

/**
 * The files the browser runner's server hands out besides the test modules: the runner's own bundles
 * and maps, the UX sources DevTools asks for, and vendor files from node_modules.
 */
describe("execute assets", () => {
    let scratch: string;

    function write(name: string, text: string): string {
        const file = path.join(scratch, name);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, text, "utf8");

        return file;
    }

    beforeEach(() => {
        scratch = fs.mkdtempSync(path.join(os.tmpdir(), "tripwire-assets-"));
    });

    afterEach(() => {
        fs.rmSync(scratch, { recursive: true, force: true });
    });

    describe("_normalizeAssetUrl", () => {
        it("uses forward slashes and drops the query string", () => {
            assert.equal(_normalizeAssetUrl("\\src\\a.ts?v=1&x=2"), "/src/a.ts");
            assert.equal(_normalizeAssetUrl("/runner-client.js"), "/runner-client.js");
        });

        it("treats a missing url as empty", () => {
            assert.equal(_normalizeAssetUrl(""), "");
            assert.equal(_normalizeAssetUrl(undefined as any), "");
        });
    });

    describe("_getAssetFile", () => {
        it("reads a runner bundle from the assets folder as JavaScript", () => {
            const file = write("runner-client.js", "var client = 1;");

            const asset = _getAssetFile("/" + path.relative(path.join(EXECUTE_DIR, "assets"), file), false);

            assert.equal(asset.contentType, "application/javascript; charset=utf-8");
            assert.equal(asset.content.toString("utf8"), "var client = 1;");
        });

        it("reads a map from the assets map folder as JSON", () => {
            const file = write("runner-client.js.map", "{\"version\":3}");

            const asset = _getInlineMapAsset(path.relative(path.join(EXECUTE_DIR, "assets", "map"), file));

            assert.equal(asset.contentType, "application/json; charset=utf-8");
            assert.equal(asset.content.toString("utf8"), "{\"version\":3}");
        });

        it("returns undefined when the runner was not built with its assets", () => {
            assert.isUndefined(_getAssetFile("no-such-runner-asset.js", false));
            assert.isUndefined(_getInlineMapAsset("no-such-runner-asset.js.map"));
        });
    });

    describe("_getRunnerBinAsset", () => {
        it("reads a file next to the runner bundle as JSON", () => {
            const file = write("tripwire.js.map", "{\"version\":3,\"sources\":[]}");

            const asset = _getRunnerBinAsset(path.relative(EXECUTE_DIR, file));

            assert.equal(asset.contentType, "application/json; charset=utf-8");
            assert.deepEqual(JSON.parse(asset.content.toString("utf8")), { version: 3, sources: [] });
        });

        it("returns undefined when there is no such file", () => {
            assert.isUndefined(_getRunnerBinAsset("/no-such-runner-asset.js.map"));
        });
    });

    describe("_getSourceAsset", () => {
        it("serves the runner's UX sources with a content type from their extension", () => {
            const types: { [name: string]: string } = {
                "browser/ui/client.ts": "application/typescript; charset=utf-8",
                "browser/resources/styles/base.css": "text/css; charset=utf-8",
                "browser/resources/templates/runner.html": "text/html; charset=utf-8"
            };

            Object.keys(types).forEach((name) => {
                const asset = _getSourceAsset(name);
                assert.equal(asset.contentType, types[name], name);
                assert.equal(asset.content.toString("utf8"), fs.readFileSync(path.resolve(EXECUTE_DIR, "../ux", name), "utf8"), name);
            });

            assert.equal(_getSourceAsset("\\browser\\ui\\client.ts").contentType, "application/typescript; charset=utf-8", "backslashes and a leading slash");
        });

        it("serves other files as plain text", () => {
            assert.equal(_getSourceAsset("images/favicon.ico").contentType, "text/plain; charset=utf-8");
        });

        it("falls back to a runner/src/ux folder under the working directory", () => {
            write("runner/src/ux/extra/fixture.js", "var a;");
            write("runner/src/ux/extra/fixture.json", "{}");
            write("runner/src/ux/extra/fixture.tsx", "export {};");

            const orgCwd = process.cwd();
            process.chdir(scratch);
            try {
                assert.equal(_getSourceAsset("extra/fixture.js").contentType, "application/javascript; charset=utf-8");
                assert.equal(_getSourceAsset("extra/fixture.json").contentType, "application/json; charset=utf-8");
                assert.equal(_getSourceAsset("extra/fixture.tsx").contentType, "application/typescript; charset=utf-8");
            } finally {
                process.chdir(orgCwd);
            }
        });

        it("refuses empty, parent and drive relative paths, and returns undefined for a missing file", () => {
            assert.isUndefined(_getSourceAsset(""));
            assert.isUndefined(_getSourceAsset("/"));
            assert.isUndefined(_getSourceAsset("../execute/assets.ts"));
            assert.isUndefined(_getSourceAsset("browser/../../execute/assets.ts"));
            assert.isUndefined(_getSourceAsset("C:/Windows/win.ini"));
            assert.isUndefined(_getSourceAsset("browser/ui/no-such-file.ts"));
        });
    });

    describe("_getVendorAsset", () => {
        it("picks the content type from the file's extension", () => {
            const types: { [ext: string]: string } = {
                ".js": "application/javascript; charset=utf-8",
                ".MJS": "application/javascript; charset=utf-8",
                ".cjs": "application/javascript; charset=utf-8",
                ".map": "application/json; charset=utf-8",
                ".json": "application/json; charset=utf-8",
                ".ts": "text/x-typescript; charset=utf-8",
                ".tsx": "text/x-typescript; charset=utf-8",
                ".wasm": "application/octet-stream"
            };

            Object.keys(types).forEach((ext) => {
                const asset = _getVendorAsset(write("vendor" + ext, "content" + ext));
                assert.equal(asset.contentType, types[ext], ext);
                assert.equal(asset.content.toString("utf8"), "content" + ext);
            });
        });

        it("returns undefined for a missing file", () => {
            assert.isUndefined(_getVendorAsset(path.join(scratch, "missing.js")));
        });
    });

    describe("_loadRunnerWorkerScript", () => {
        it("reports a runner built without its worker bundle", () => {
            assert.throws(() => _loadRunnerWorkerScript(scratch, false), "Missing runner worker asset: runner-worker.js");
        });
    });
});
