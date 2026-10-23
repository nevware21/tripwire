/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

// Runtime half of the opt-in "@nevware21/tripwire/globals" entry (globals.d.ts is the type half).
//
// Importing this module installs the bare test names onto the global object and re-exports them,
// so a file can rely on `describe`/`it`/`expect` even when it is not being run by the tripwire
// CLI (the CLI installs the same names itself at the start of every run). Importing
// @nevware21/tripwire directly never touches the global object.
//
// Assignment is unconditional and the previous values are not restored -- an explicit import of
// this module is a request for tripwire to own those names for the rest of the process. Do not
// use it inside another framework's harness; import the API instead:
//     const { describe, it } = require("@nevware21/tripwire");
//
// The exports are written out one per line rather than assigned in a loop so that both
// cjs-module-lexer (Node's ESM interop) and bundlers can statically see the named exports.
// Keep the list in sync with the TripwireGlobals interface (src/globals.ts) and the ambient
// declarations it drives (src/ambientGlobals.ts).

"use strict";

var tripwire = require("./dist/es5/main/tripwire.js");

exports.describe = tripwire.describe;
exports.suite = tripwire.suite;
exports.xdescribe = tripwire.xdescribe;
exports.fdescribe = tripwire.fdescribe;

exports.it = tripwire.it;
exports.spec = tripwire.spec;
exports.test = tripwire.test;
exports.xit = tripwire.xit;
exports.fit = tripwire.fit;

exports.before = tripwire.before;
exports.beforeAll = tripwire.beforeAll;
exports.beforeEach = tripwire.beforeEach;
exports.after = tripwire.after;
exports.afterAll = tripwire.afterAll;
exports.afterEach = tripwire.afterEach;

exports.assert = tripwire.assert;
exports.expect = tripwire.expect;

var gbl = typeof globalThis !== "undefined" ? globalThis :
    typeof self !== "undefined" ? self :
        typeof global !== "undefined" ? global : this;

for (var name in exports) {
    if (Object.prototype.hasOwnProperty.call(exports, name) && exports[name] !== undefined) {
        gbl[name] = exports[name];
    }
}
