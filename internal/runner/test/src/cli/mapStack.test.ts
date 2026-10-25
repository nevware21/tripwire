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
import { GenMapping, addMapping, toEncodedMap } from "@jridgewell/gen-mapping";
import { assert, afterAll as selfAfterAll, beforeAll as selfBeforeAll, beforeEach as selfBeforeEach } from "@nevware21/tripwire";
import { _clearStackMapCache, _mapStackTrace } from "../../../src/cli/mapStack";

let _root: string;

/**
 * Writes a one-line "bundle" plus a source map that points its column 4 at
 * `src/thing.ts:10:2` -- the shape of the real `bin` bundle (everything on one line, names
 * mangled away), reduced to the single mapping the assertions need.
 */
function _writeBundle(name: string, inline: boolean): string {
    const jsPath = path.join(_root, "bin", name);
    fs.mkdirSync(path.dirname(jsPath), { recursive: true });

    const gen = new GenMapping({ file: name });
    addMapping(gen, {
        generated: { line: 1, column: 4 },
        source: "../src/thing.ts",
        original: { line: 10, column: 2 },
        name: "doThing"
    });

    const map = JSON.stringify(toEncodedMap(gen));
    let code = "var a=1;";

    if (inline) {
        code += "\n//# sourceMappingURL=data:application/json;base64," + Buffer.from(map, "utf8").toString("base64");
    } else {
        fs.writeFileSync(jsPath + ".map", map, "utf8");
    }

    fs.writeFileSync(jsPath, code, "utf8");

    return jsPath;
}

describe("cli mapStack", () => {
    selfBeforeAll(() => {
        _root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "tripwire-map-")));
    });

    selfAfterAll(() => {
        if (_root) {
            fs.rmSync(_root, { recursive: true, force: true });
        }
    });

    selfBeforeEach(() => {
        // Maps are cached per file for the life of the process; each case writes its own.
        _clearStackMapCache();
    });

    it("should rewrite a minified frame onto the real source, with the original name", () => {
        const jsPath = _writeBundle("sibling.js", false);
        const mapped = _mapStackTrace("    at yo (" + jsPath + ":1:5)", _root);

        assert.equal(mapped, "    at doThing (src/thing.ts:10:3)");
    });

    it("should read an inline sourceMappingURL as well as a sibling .map", () => {
        const jsPath = _writeBundle("inline.js", true);
        const mapped = _mapStackTrace("    at yo (" + jsPath + ":1:5)", _root);

        assert.equal(mapped, "    at doThing (src/thing.ts:10:3)");
    });

    it("should map an anonymous frame, which carries no function name", () => {
        const jsPath = _writeBundle("anon.js", false);
        const mapped = _mapStackTrace("    at " + jsPath + ":1:5", _root);

        assert.equal(mapped, "    at doThing (src/thing.ts:10:3)");
    });

    it("should keep the drive letter out of the line/column split", () => {
        const jsPath = _writeBundle("drive.js", false);

        assert.isTrue(_mapStackTrace("    at yo (" + jsPath + ":1:5)", _root).indexOf(":10:3") !== -1);
    });

    it("should leave a frame alone when the position has no mapping", () => {
        const jsPath = _writeBundle("unmapped.js", false);
        const frame = "    at yo (" + jsPath + ":9:9)";

        assert.equal(_mapStackTrace(frame, _root), frame);
    });

    it("should leave a frame alone when there is no map at all", () => {
        const bare = path.join(_root, "bin", "bare.js");
        fs.writeFileSync(bare, "var a=1;", "utf8");
        const frame = "    at yo (" + bare + ":1:5)";

        assert.equal(_mapStackTrace(frame, _root), frame);
    });

    it("should leave node internal frames untouched", () => {
        const frame = "    at Module._compile (node:internal/modules/cjs/loader:1521:14)";

        assert.equal(_mapStackTrace(frame, _root), frame);
    });

    it("should leave the message line and any non-frame text untouched", () => {
        const stack = "Error: boom\n    at Module.load (node:internal/modules/cjs/loader:1266:32)";

        assert.equal(_mapStackTrace(stack, _root), stack);
    });

    it("should show an absolute path when the source is outside the reporting directory", () => {
        const jsPath = _writeBundle("outside.js", false);
        const mapped = _mapStackTrace("    at yo (" + jsPath + ":1:5)", path.join(_root, "elsewhere", "deeper"));

        assert.isTrue(mapped.indexOf("/src/thing.ts:10:3") !== -1, mapped);
        assert.isTrue(mapped.indexOf("\\") === -1, "slash-normalised: " + mapped);
    });

    it("should return an empty stack unchanged", () => {
        assert.equal(_mapStackTrace("", _root), "");
    });
});
