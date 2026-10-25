/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert, afterEach as selfAfterEach, beforeEach as selfBeforeEach } from "@nevware21/tripwire";
import { _installGlobalApi } from "../../../src/internal/applyGlobal";

/**
 * Every global name `_installGlobalApi` is responsible for. Kept as a literal list rather
 * than derived from the module so that dropping a name from the installer fails a test
 * instead of quietly shrinking the expectation.
 */
const GLOBAL_NAMES = [
    "describe", "suite", "xdescribe", "fdescribe",
    "it", "spec", "test", "xit", "fit",
    "before", "beforeAll", "beforeEach", "after", "afterAll", "afterEach",
    "assert", "expect"
];

const _gbl = global as any;
let _saved: { [key: string]: any } = {};
let _savedPresent: { [key: string]: boolean } = {};

/**
 * A stand-in tripwire module whose every member is a distinguishable sentinel, so an
 * installer that wired two names to the same function would be caught.
 */
function _fakeModule(assertConfig?: any): any {
    const module: any = { assertConfig: assertConfig };

    for (let lp = 0; lp < GLOBAL_NAMES.length; lp++) {
        const name = GLOBAL_NAMES[lp];

        module[name] = function () {
            return "sentinel:" + name;
        };
    }

    return module;
}

describe("internal applyGlobal", () => {
    // These tests overwrite the very globals the surrounding suite runs on (`describe`,
    // `it`, `assert`), so each one is snapshotted and put back before anything else runs.
    // The local `assert` import above is deliberate -- it does not go through the global.
    selfBeforeEach(() => {
        _saved = {};
        _savedPresent = {};

        for (let lp = 0; lp < GLOBAL_NAMES.length; lp++) {
            const name = GLOBAL_NAMES[lp];

            _savedPresent[name] = name in _gbl;
            _saved[name] = _gbl[name];
        }
    });

    selfAfterEach(() => {
        for (let lp = 0; lp < GLOBAL_NAMES.length; lp++) {
            const name = GLOBAL_NAMES[lp];

            if (_savedPresent[name]) {
                _gbl[name] = _saved[name];
            } else {
                delete _gbl[name];
            }
        }
    });

    it("should install every global name from the module", () => {
        const module = _fakeModule();

        _installGlobalApi(module, {});

        for (let lp = 0; lp < GLOBAL_NAMES.length; lp++) {
            const name = GLOBAL_NAMES[lp];

            assert.strictEqual(_gbl[name], module[name], name);
        }
    });

    it("should install all 17 names", () => {
        // Pinned as a count as well as a list: the published globals surface is a
        // documented migration path, so a silent addition or removal should be noticed.
        assert.equal(GLOBAL_NAMES.length, 17);

        const module = _fakeModule();

        _installGlobalApi(module, {});

        for (let lp = 0; lp < GLOBAL_NAMES.length; lp++) {
            assert.isFunction(_gbl[GLOBAL_NAMES[lp]], GLOBAL_NAMES[lp]);
        }
    });

    it("should return a restore function even when the module exposes no config", () => {
        const restore = _installGlobalApi(_fakeModule(undefined), { timeout: 1234 });

        assert.isFunction(restore);

        // Must be safe to call -- the no-config path returns a no-op, not undefined.
        restore();
    });

    describe("runner config overrides", () => {
        it("should apply timeout, slow and retries onto assertConfig", () => {
            const assertConfig: any = { timeout: 2000, slow: 75, retries: 0 };

            _installGlobalApi(_fakeModule(assertConfig), { timeout: 5000, slow: 250, retries: 3 });

            assert.equal(assertConfig.timeout, 5000);
            assert.equal(assertConfig.slow, 250);
            assert.equal(assertConfig.retries, 3);
        });

        it("should restore the previous values when the returned function is called", () => {
            const assertConfig: any = { timeout: 2000, slow: 75, retries: 0 };
            const restore = _installGlobalApi(_fakeModule(assertConfig), { timeout: 5000, slow: 250, retries: 3 });

            restore();

            assert.equal(assertConfig.timeout, 2000);
            assert.equal(assertConfig.slow, 75);
            assert.equal(assertConfig.retries, 0);
        });

        it("should leave a key alone when it was not supplied", () => {
            const assertConfig: any = { timeout: 2000, slow: 75, retries: 0 };

            _installGlobalApi(_fakeModule(assertConfig), { timeout: 5000 });

            assert.equal(assertConfig.timeout, 5000);
            assert.equal(assertConfig.slow, 75, "slow was not passed and must not change");
            assert.equal(assertConfig.retries, 0, "retries was not passed and must not change");
        });

        it("should only restore the keys it actually changed", () => {
            const assertConfig: any = { timeout: 2000, slow: 75, retries: 0 };
            const restore = _installGlobalApi(_fakeModule(assertConfig), { slow: 250 });

            // Something else moves an untouched key while the override is in effect.
            assertConfig.timeout = 9999;
            restore();

            assert.equal(assertConfig.slow, 75, "slow was changed, so it is restored");
            assert.equal(assertConfig.timeout, 9999, "timeout was never changed, so it is not clobbered");
        });

        it("should apply a zero value rather than treating it as absent", () => {
            const assertConfig: any = { timeout: 2000, slow: 75, retries: 5 };

            _installGlobalApi(_fakeModule(assertConfig), { timeout: 0, retries: 0 });

            assert.equal(assertConfig.timeout, 0);
            assert.equal(assertConfig.retries, 0);
        });

        it("should ignore keys outside timeout, slow and retries", () => {
            const assertConfig: any = { timeout: 2000 };

            _installGlobalApi(_fakeModule(assertConfig), { grep: "x", reporter: "tap", bail: true });

            assert.isUndefined(assertConfig.grep);
            assert.isUndefined(assertConfig.reporter);
            assert.isUndefined(assertConfig.bail);
            assert.equal(assertConfig.timeout, 2000);
        });

        it("should tolerate no parsed arguments at all", () => {
            const assertConfig: any = { timeout: 2000, slow: 75, retries: 0 };
            const restore = _installGlobalApi(_fakeModule(assertConfig), null);

            assert.equal(assertConfig.timeout, 2000);
            restore();
            assert.equal(assertConfig.timeout, 2000);
        });

        it("should restore idempotently when called twice", () => {
            const assertConfig: any = { timeout: 2000 };
            const restore = _installGlobalApi(_fakeModule(assertConfig), { timeout: 5000 });

            restore();
            restore();

            assert.equal(assertConfig.timeout, 2000);
        });
    });
});
