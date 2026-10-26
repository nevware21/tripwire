/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

/**
 * Example: writing a test file the way you would when running it through the
 * `tripwire` CLI -- describe/it/assert are used as bare globals, with no explicit
 * import of them anywhere in this file.
 *
 * The bare names type-check because this project opts in to tripwire's ambient global
 * declarations, via `"types": ["@nevware21/tripwire/globals"]` in tsconfig.json. Importing
 * "@nevware21/tripwire" does *not* declare any globals -- that keeps it from colliding with
 * `@types/mocha`, `@types/jest` or `@types/jasmine`, which declare the same names with their
 * own types. The alternatives to the tsconfig entry are a `/// <reference types=
 * "@nevware21/tripwire/globals" />` in any one file of the program, a dependency on
 * `@nevware21/tripwire-globals`, or the side-effect import below.
 *
 * At runtime, these globals are installed by the `tripwire` CLI before it loads test files, so
 * no import is required at all when running that way. The side-effect import here also installs
 * them, which is what lets this file work outside the CLI; drop it if you only ever run through
 * the CLI.
 */
import "@nevware21/tripwire/globals";

describe("CLI example suite", () => {
    it("passes", () => {
        assert.equal(1 + 1, 2);
    });
});
