/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { TripwireGlobals } from "./globals";

/**
 * Ambient declarations for the bare global names (`describe`/`it`/`before`/`after`/`assert`/
 * `expect` etc) that a tripwire runner installs onto `global` before running a suite.
 *
 * This module is intentionally **not** referenced by `index.ts` -- the package's main `types`
 * entry declares no globals at all, so importing `@nevware21/tripwire` can never collide with
 * `@types/mocha`, `@types/jest` or `@types/jasmine` (all of which declare the same names with
 * their own types). Consumers opt in to these declarations instead, via either:
 *
 * - `"types": ["@nevware21/tripwire/globals"]` in tsconfig.json (or a matching
 *   `/// <reference types="@nevware21/tripwire/globals" />`), or
 * - a dependency on `@nevware21/tripwire-globals`.
 *
 * `scripts/buildGlobalsDts.js` lifts the `declare global` block below out of the compiled
 * `build/types/ambientGlobals.d.ts` and emits it as `dist/types/globals.d.ts`, which the
 * published root `globals.d.ts` re-exports. Expressing every name via `TripwireGlobals` keeps
 * the signatures in one place rather than duplicating shapes across files.
 *
 * Within this repo the file is still part of the `src/**` compile, so tripwire's own test
 * sources continue to see the bare globals without any extra configuration.
 */
declare global {
    var describe: TripwireGlobals["describe"];
    var suite: TripwireGlobals["suite"];
    var xdescribe: TripwireGlobals["xdescribe"];
    var fdescribe: TripwireGlobals["fdescribe"];

    var it: TripwireGlobals["it"];
    var spec: TripwireGlobals["spec"];
    var test: TripwireGlobals["test"];
    var xit: TripwireGlobals["xit"];
    var fit: TripwireGlobals["fit"];

    var before: TripwireGlobals["before"];
    var beforeAll: TripwireGlobals["beforeAll"];
    var beforeEach: TripwireGlobals["beforeEach"];
    var after: TripwireGlobals["after"];
    var afterAll: TripwireGlobals["afterAll"];
    var afterEach: TripwireGlobals["afterEach"];

    var assert: TripwireGlobals["assert"];
    var expect: TripwireGlobals["expect"];
}

export { };
