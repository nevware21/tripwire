/*
 * @nevware21/tripwire-globals
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

// Re-publishes the opt-in ambient declarations from "@nevware21/tripwire/globals" (the bare
// `describe`/`it`/`before`/`after`/`assert`/`expect` names) plus the same names as local exports,
// so that depending on this package is all it takes to opt in:
//
//     // tsconfig.json -- no import needed anywhere
//     { "compilerOptions": { "types": ["@nevware21/tripwire-globals"] } }
//
//     // ...or a single import, which also installs the names onto globalThis at runtime
//     import "@nevware21/tripwire-globals";
//
//     // ...or as locals, with no reliance on the ambient names at all
//     import { describe, it, expect } from "@nevware21/tripwire-globals";
//
// A dependency alone is not enough for the ambient half: TypeScript only auto-includes packages
// under node_modules/@types, so one of the three forms above is still required. See
// docs/runner-troubleshooting.md for why the globals are opt-in rather than declared by
// @nevware21/tripwire itself.
export * from "@nevware21/tripwire/globals";
