<h1 align="center">@nevware21/tripwire-globals</h1>

The opt-in global test names for [`@nevware21/tripwire`](https://github.com/nevware21/tripwire) --
`describe`, `it`, the lifecycle hooks, `assert` and `expect` -- as both ambient TypeScript
declarations and a runtime installer.

`@nevware21/tripwire` itself declares **no** ambient globals. That is deliberate: `@types/mocha`,
`@types/jest` and `@types/jasmine` declare the same names with their own types, TypeScript merges
every ambient declaration in a program, and two declarations of one global that disagree is a
compile error. Because tripwire's main entry stays clean, installing it can never break a project
that still has one of those packages present.

This package is how you ask for the globals when you do want them.

## Install

```bash
npm install --save-dev @nevware21/tripwire-globals
```

It depends on the exact matching version of `@nevware21/tripwire`, so the two are always in step.

## Use

A dependency on its own is not enough -- TypeScript only auto-includes packages under
`node_modules/@types`, so pick one of these:

**tsconfig `types`** -- no import in any file:

```jsonc
{
    "compilerOptions": {
        "types": ["@nevware21/tripwire-globals"]
    }
}
```

**A single import** -- also installs the names onto `globalThis` at runtime, which matters when
the file is not being run by the `tripwire` CLI (the CLI installs them itself at the start of
every run):

```ts
import "@nevware21/tripwire-globals";

describe("my suite", () => {
    it("works", () => {
        assert.equal(1, 1);
    });
});
```

**A `/// <reference>`** in any one file of the program:

```ts
/// <reference types="@nevware21/tripwire-globals" />
```

## Or skip the globals entirely

The same names are also exported as locals, so a file need not rely on the ambient names at all.
An explicit import always wins over whatever is on `global`:

```ts
import { describe, it, expect } from "@nevware21/tripwire";
```

Import them from **`@nevware21/tripwire`** for this. Importing them from this package works too,
but any import of this package also pulls in the ambient declarations -- that is its whole job --
so it is not a way to avoid them.

## Only one framework can own these names

Do not add this package to a project that still has `@types/mocha`, `@types/jest` or
`@types/jasmine` in its program -- the ambient declarations will collide (TS2403 / TS6200). Use
the local imports above instead, or scope the other package's types out of the project. The
[Runner Troubleshooting guide](https://nevware21.github.io/tripwire/runner-troubleshooting.html#typescript-duplicate-global-declarations)
covers the options.

`@nevware21/tripwire/globals` is the same entry point published directly from the core package,
if you would rather not add a second dependency:

```jsonc
{ "compilerOptions": { "types": ["@nevware21/tripwire/globals"] } }
```

## Documentation

The guides on the documentation site,
[https://nevware21.github.io/tripwire](https://nevware21.github.io/tripwire), cover the two
questions this package exists to answer:

- **[Runner Troubleshooting](https://nevware21.github.io/tripwire/runner-troubleshooting.html)** --
  the one to read first. It covers
  [`Cannot find name 'describe'`](https://nevware21.github.io/tripwire/runner-troubleshooting.html#cannot-find-name-describe)
  (the error that sends most people here, and the three ways to opt in) and the
  [duplicate global declarations](https://nevware21.github.io/tripwire/runner-troubleshooting.html#typescript-duplicate-global-declarations)
  TS2403/TS6200 errors you get if you opt in while another framework's types are still in the
  program, with the options for resolving each.

- **[Test Runner, CLI & Configuration Guide](https://nevware21.github.io/tripwire/test-runner.html)**
  -- the `tripwire` CLI installs these same names itself at the start of every run, so a file run
  through the CLI needs nothing from this package at runtime. This package is what makes the names
  resolve for **TypeScript**, and what installs them when a file is *not* run through the CLI.

- **[Migrating from Mocha](https://nevware21.github.io/tripwire/migration/migrating-from-mocha.html)**
  -- where this package fits when moving an existing suite across, and why replacing `@types/mocha`
  is a step in that migration rather than an optional extra.

- **[Test Suite API](https://nevware21.github.io/tripwire/typedoc/core/index.html)** -- what the
  names actually are. `describe`, `it`, the hooks, `assert` and `expect` are re-exports of the core
  API; their signatures and behaviour are documented there.

## License

MIT -- see [LICENSE](./LICENSE).
