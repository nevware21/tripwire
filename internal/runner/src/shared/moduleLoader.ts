/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

/**
 * Shared module-loading runtime for both the browser (main-thread, iframe) and worker
 * (Web Worker) test targets. Modules are served as real, individually-fetchable network
 * resources (real `<script>` tags / `importScripts()` URLs) rather than eval'd from an
 * inlined JSON payload -- each module's wrapped source (see `../execute/moduleAssets.ts`)
 * calls `__tripwireDefine__(id, factory)` to register itself into a registry when its script
 * loads; `createRequire()` implements the same synchronous, cache-on-first-require CommonJS
 * semantics tests depend on, pulling factories from that registry instead of compiling source
 * text via `new Function(...)`.
 *
 * This lives under `src/shared/` rather than `src/ux/` precisely so the minimal worker bundle
 * can import it -- see `./suiteNames.ts` for the full reasoning.
 */

import { isFunction, objHasOwnProperty } from "@nevware21/ts-utils";
import { TripwireError } from "@nevware21/tripwire";

export interface ILoaderContext {
    global: any;
    globalThis: any;
    window: any;
    self: any;
}

/**
 * Idempotently installs the `__tripwireDefine__` registry function onto `scope` (the
 * browser `window` or the worker `self`) and returns the underlying registry object.
 */
export function installDefineRegistry(scope: any): Record<string, Function> {
    scope.__tripwireModules__ = scope.__tripwireModules__ || {};
    scope.__tripwireDefine__ = scope.__tripwireDefine__ || function(id: string, factory: Function) {
        scope.__tripwireModules__[id] = factory;
    };

    return scope.__tripwireModules__;
}

/**
 * Creates a synchronous `require(id)` function backed by a registry of already-loaded
 * `__tripwireDefine__`-registered factories, rather than compiling source text.
 */
export function createRequire(factories: Record<string, Function>, ctx: ILoaderContext): (id: string) => any {
    const cache: { [id: string]: { id: string; exports: any } } = {};
    const processShim: any = {
        env: { FORCE_COLOR: "1", TERM: "xterm-256color" },
        argv: [],
        versions: {},
        platform: "linux",
        cwd: function() {
            return "/";
        },
        nextTick: function(cb: () => void) {
            Promise.resolve().then(() => cb());
        }
    };

    function req(id: string): any {
        if (objHasOwnProperty(cache, id)) {
            return cache[id].exports;
        }

        if (!objHasOwnProperty(factories, id)) {
            throw new TripwireError("Module not found in registry: " + id, { id: id });
        }

        const factory = factories[id];
        if (!isFunction(factory)) {
            throw new TripwireError("Invalid module factory in registry: " + id, { id: id });
        }

        const module = { id, exports: {} as any };
        cache[id] = module;

        const dirPos = id.lastIndexOf("/");
        const dirname = dirPos !== -1 ? id.substring(0, dirPos) : "/";

        factory(req, module, module.exports, ctx.global, ctx.globalThis, ctx.window, ctx.self, processShim, id, dirname);
        return module.exports;
    }

    return req;
}

export function getBrowserLoaderContext(): ILoaderContext {
    return {
        global: globalThis,
        globalThis: globalThis,
        window: (globalThis as any).window,
        self: (globalThis as any).self
    };
}

export function getWorkerLoaderContext(): ILoaderContext {
    return {
        global: self,
        globalThis: self,
        window: undefined,
        self: self
    };
}

export function setTripwireGlobals(tripwire: any, target: any): void {
    target.describe = tripwire.describe;
    target.suite = tripwire.suite;
    target.xdescribe = tripwire.xdescribe;
    target.fdescribe = tripwire.fdescribe;
    target.it = tripwire.it;
    target.spec = tripwire.spec;
    target.test = tripwire.test;
    target.xit = tripwire.xit;
    target.fit = tripwire.fit;
    target.before = tripwire.before;
    target.beforeAll = tripwire.beforeAll;
    target.beforeEach = tripwire.beforeEach;
    target.after = tripwire.after;
    target.afterAll = tripwire.afterAll;
    target.afterEach = tripwire.afterEach;
    target.assert = tripwire.assert;
    target.expect = tripwire.expect;
}

/**
 * Applies the `--slow`/`--timeout`/`--retries` run settings down the whole suite tree. Only
 * settings that were actually supplied are written, so a test's own `this.timeout(...)` is
 * left alone otherwise.
 */
export function applyTestSettings(suite: any, settings: any): void {
    if (!suite) {
        return;
    }

    const tests = suite.tests || [];
    for (let i = 0; i < tests.length; i++) {
        if (settings.slow !== undefined) {
            tests[i].slow = settings.slow;
        }
        if (settings.timeout !== undefined) {
            tests[i].timeout = settings.timeout;
        }
        if (settings.retries !== undefined) {
            tests[i].retries = settings.retries;
        }
    }

    const suites = suite.suites || [];
    for (let s = 0; s < suites.length; s++) {
        applyTestSettings(suites[s], settings);
    }
}

export async function buildSuite(tripwire: any, req: (id: string) => any, payloadObj: any, settings: any): Promise<any> {
    tripwire.resetSuite();
    const suite = tripwire.createSuite();

    await Promise.resolve(tripwire.useSuite(suite, function() {
        const entryIds: string[] = payloadObj.entryIds || [];
        for (let i = 0; i < entryIds.length; i++) {
            req(entryIds[i]);
        }
    }));

    if (settings.slow !== undefined || settings.timeout !== undefined || settings.retries !== undefined) {
        applyTestSettings(suite, settings);
    }

    return suite;
}
