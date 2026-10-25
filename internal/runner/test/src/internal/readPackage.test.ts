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
import { assert, afterAll as selfAfterAll, beforeAll as selfBeforeAll } from "@nevware21/tripwire";
import { _readPackageName } from "../../../src/internal/readPackage";

let _root: string;

function _writePackage(dir: string, content: string): string {
    const full = path.join(_root, dir);

    fs.mkdirSync(full, { recursive: true });
    fs.writeFileSync(path.join(full, "package.json"), content, "utf8");

    return full;
}

describe("internal readPackage", () => {
    selfBeforeAll(() => {
        _root = fs.mkdtempSync(path.join(os.tmpdir(), "tripwire-readpkg-"));
    });

    selfAfterAll(() => {
        if (_root) {
            fs.rmSync(_root, { recursive: true, force: true });
        }
    });

    it("should read the name from a package.json", () => {
        const dir = _writePackage("named", JSON.stringify({ name: "@scope/thing", version: "1.0.0" }));

        assert.equal(_readPackageName(dir), "@scope/thing");
    });

    it("should return an empty string when there is no package.json", () => {
        const dir = path.join(_root, "empty");

        fs.mkdirSync(dir, { recursive: true });

        assert.equal(_readPackageName(dir), "");
    });

    it("should return an empty string when the directory does not exist", () => {
        assert.equal(_readPackageName(path.join(_root, "does", "not", "exist")), "");
    });

    it("should return an empty string when the package.json has no name", () => {
        const dir = _writePackage("nameless", JSON.stringify({ version: "1.0.0" }));

        assert.equal(_readPackageName(dir), "");
    });

    it("should return an empty string rather than throwing on malformed JSON", () => {
        // The helper is used for display/labelling, so a broken manifest in the target
        // project must not take the run down with it.
        const dir = _writePackage("broken", "{ this is not json");

        assert.equal(_readPackageName(dir), "");
    });

    it("should return an empty string when the manifest is not an object", () => {
        const dir = _writePackage("scalar", "\"just a string\"");

        assert.equal(_readPackageName(dir), "");
    });

    it("should coerce a non-string name to a string", () => {
        const dir = _writePackage("numeric", "{ \"name\": 42 }");

        assert.equal(_readPackageName(dir), "42");
    });

    it("should resolve package.json relative to the given cwd", () => {
        const outer = _writePackage("outer", JSON.stringify({ name: "outer-pkg" }));
        const inner = _writePackage(path.join("outer", "inner"), JSON.stringify({ name: "inner-pkg" }));

        // No upward walk -- each directory reports only its own manifest.
        assert.equal(_readPackageName(outer), "outer-pkg");
        assert.equal(_readPackageName(inner), "inner-pkg");
    });

    it("should not walk up to a parent package.json", () => {
        _writePackage("walkup", JSON.stringify({ name: "parent-pkg" }));
        const child = path.join(_root, "walkup", "child");

        fs.mkdirSync(child, { recursive: true });

        assert.equal(_readPackageName(child), "");
    });
});
