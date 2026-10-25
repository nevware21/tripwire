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
import { _preloadModules } from "../../../src/execute/preloadModules";
import { _isUserError, _userErrorHints } from "../../../src/internal/userError";

/**
 * `--require` / `--file` values are loaded before any test file: as a module resolved from the working
 * directory first, then as a path relative to it.
 */
describe("execute preload modules", () => {
    let tempDir: string;

    before(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "tripwire-preload-"));
    });

    after(() => {
        try {
            fs.rmSync(tempDir, { recursive: true, force: true });
        } catch (e) {
            // best effort cleanup
        }
    });

    it("loads a module that resolves from the working directory", () => {
        // A built-in resolves from anywhere, which keeps this independent of what is installed
        _preloadModules(["path", "os"], tempDir);
    });

    it("falls back to a path relative to the working directory", () => {
        const marker = path.join(tempDir, "preload-marker.js");
        fs.writeFileSync(marker, "global.__tripwirePreloadMarker__ = (global.__tripwirePreloadMarker__ || 0) + 1;\n", "utf8");

        try {
            _preloadModules(["./preload-marker.js"], tempDir);
            assert.equal((global as any).__tripwirePreloadMarker__, 1, "the file was executed");

            _preloadModules(["preload-marker.js"], tempDir);
            assert.equal((global as any).__tripwirePreloadMarker__, 1, "a module is only ever loaded once");
        } finally {
            delete (global as any).__tripwirePreloadMarker__;
        }
    });

    it("does nothing for an empty list", () => {
        _preloadModules([], tempDir);
    });

    it("reports a module that can be resolved neither way as a user error with a hint", () => {
        let caught: any = null;
        try {
            _preloadModules(["./does-not-exist-anywhere.js"], tempDir);
        } catch (e) {
            caught = e;
        }

        assert.isNotNull(caught, "the failure is reported");
        assert.isTrue(_isUserError(caught), "it is a user error, not a runner fault");
        assert.includes(caught.message, "Failed to preload './does-not-exist-anywhere.js'");
        const hints = _userErrorHints(caught);
        assert.equal(hints.length, 1);
        assert.includes(hints[0], "resolved as a module first, then as a path relative to");
        assert.includes(hints[0], tempDir.replace(/\\/g, "/"));
    });
});
