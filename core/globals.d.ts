/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

// The opt-in ambient globals entry: "@nevware21/tripwire/globals".
//
// The package's main "types" entry declares no globals, so importing @nevware21/tripwire never
// collides with @types/mocha, @types/jest or @types/jasmine. Reference this entry to add the bare
// `describe`/`it`/`before`/`after`/`assert`/`expect` names to the global type scope:
//
//     // tsconfig.json
//     { "compilerOptions": { "types": ["@nevware21/tripwire/globals"] } }
//
//     // ...or, in any single .d.ts / .ts file in the program
//     /// <reference types="@nevware21/tripwire/globals" />
//
//     // ...or, as a runtime import that also installs the globals onto globalThis
//     import "@nevware21/tripwire/globals";
//
// Only do this if no other test framework's types are present -- two frameworks cannot own the
// same global type in one TypeScript program. See docs/runner-troubleshooting.md.
export * from "./dist/types/globals";

// The same names are also re-exported as locals, matching the runtime globals.js:
//     import { describe, it, expect } from "@nevware21/tripwire/globals";
// Note that referencing this entry at all adds the ambient declarations above to the program. To
// use the names as locals *without* declaring any globals, import them from "@nevware21/tripwire".
export {
    describe, suite, xdescribe, fdescribe,
    it, spec, test, xit, fit,
    before, beforeAll, beforeEach,
    after, afterAll, afterEach,
    assert, expect
} from "./dist/types/tripwire";
