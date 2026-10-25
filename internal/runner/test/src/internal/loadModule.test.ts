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
import { _loadModule } from "../../../src/internal/loadModule";
import { _isUserError, _userErrorHints } from "../../../src/internal/userError";

let _root: string;
let _seq = 0;

/**
 * Writes a CommonJS fixture module and returns its absolute path. Each call gets a unique
 * name so the module-level cache inside `_loadModule` (and node's own require cache) cannot
 * leak between tests.
 */
function _writeModule(body: string): string {
    const name = "fixture" + (_seq++) + ".js";
    const full = path.join(_root, name);

    fs.writeFileSync(full, body, "utf8");

    return full;
}

describe("internal loadModule", () => {
    selfBeforeAll(() => {
        _root = fs.mkdtempSync(path.join(os.tmpdir(), "tripwire-loadmod-"));
    });

    selfAfterAll(() => {
        if (_root) {
            fs.rmSync(_root, { recursive: true, force: true });
        }
    });

    it("should load a module by absolute path", () => {
        const file = _writeModule("module.exports = { marker: \"plain\" };");
        const loaded = _loadModule<any>(file);

        assert.isDefined(loaded);
        assert.equal(loaded.marker, "plain");
    });

    it("should unwrap a default export", () => {
        // An ES-module-shaped provider transpiled to CJS lands its real export under
        // `.default`; the loader has to see through that.
        const file = _writeModule("module.exports = { default: { marker: \"defaulted\" } };");
        const loaded = _loadModule<any>(file);

        assert.equal(loaded.marker, "defaulted");
    });

    it("should load a node builtin by bare name", () => {
        const loaded = _loadModule<any>("path");

        assert.isDefined(loaded);
        assert.isFunction(loaded.resolve);
    });

    it("should return the cached instance on a second call", () => {
        const file = _writeModule("module.exports = { marker: \"cached\", stamp: Math.random() };");
        const first = _loadModule<any>(file);
        const second = _loadModule<any>(file);

        assert.strictEqual(first, second);
    });

    it("should re-resolve when the cache is bypassed", () => {
        const file = _writeModule("module.exports = { marker: \"nocache\" };");
        const first = _loadModule<any>(file, true);
        const second = _loadModule<any>(file, false);

        // node's own require cache still returns one object identity, so what is asserted
        // is that bypassing the loader's cache still produces a usable module rather than
        // undefined -- the failure mode if the second lookup skipped the store.
        assert.isDefined(second);
        assert.equal(second.marker, "nocache");
        assert.strictEqual(first, second);
    });

    it("should throw a user error naming the module when it cannot be resolved", () => {
        let caught: any = null;

        try {
            _loadModule<any>("@nevware21/definitely-not-a-real-module");
        } catch (e) {
            caught = e;
        }

        assert.isDefined(caught, "expected a throw");
        assert.includes(caught.message, "Unable to load UX provider module");
        assert.includes(caught.message, "@nevware21/definitely-not-a-real-module");
    });

    it("should mark the resolve failure as a user error, not a runner fault", () => {
        // ERR-STACKS: a mistyped --ux-provider is the user's typo, so it must print its
        // message and hint without a stack trace.
        let caught: any = null;

        try {
            _loadModule<any>("./no/such/provider.js");
        } catch (e) {
            caught = e;
        }

        assert.isDefined(caught, "expected a throw");
        assert.isTrue(_isUserError(caught));
    });

    it("should attach a hint naming the resolution root", () => {
        let caught: any = null;

        try {
            _loadModule<any>("another-missing-module");
        } catch (e) {
            caught = e;
        }

        assert.isDefined(caught, "expected a throw");

        const hints = _userErrorHints(caught);

        assert.isArray(hints);
        assert.isTrue(hints.length > 0);
        assert.includes(hints[0], "--ux-provider");
    });

    it("should throw rather than return when the module itself throws on load", () => {
        const file = _writeModule("throw new Error(\"fixture blew up\");");
        let caught: any = null;

        try {
            _loadModule<any>(file);
        } catch (e) {
            caught = e;
        }

        assert.isDefined(caught, "expected a throw");
        assert.includes(caught.message, "Unable to load UX provider module");
        assert.includes(caught.message, "fixture blew up");
    });

    it("should return undefined for an empty provider name without throwing", () => {
        // The guard is `if (providerName && ...)`, so a falsy name is a no-op lookup --
        // callers treat undefined as "no provider configured".
        assert.isUndefined(_loadModule<any>(""));
    });
});
