/*
 * @nevware21/tripwire-globals
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

// Runtime half of this package -- requiring "@nevware21/tripwire/globals" installs the bare test
// names onto the global object, and they are re-exported here so they can also be imported as
// locals. See index.d.ts for the type half.
//
// The exports are written out one per line rather than assigned in a loop so that both
// cjs-module-lexer (Node's ESM interop) and bundlers can statically see the named exports.

"use strict";

var globals = require("@nevware21/tripwire/globals");

exports.describe = globals.describe;
exports.suite = globals.suite;
exports.xdescribe = globals.xdescribe;
exports.fdescribe = globals.fdescribe;

exports.it = globals.it;
exports.spec = globals.spec;
exports.test = globals.test;
exports.xit = globals.xit;
exports.fit = globals.fit;

exports.before = globals.before;
exports.beforeAll = globals.beforeAll;
exports.beforeEach = globals.beforeEach;
exports.after = globals.after;
exports.afterAll = globals.afterAll;
exports.afterEach = globals.afterEach;

exports.assert = globals.assert;
exports.expect = globals.expect;
