<h1 align="center">@nevware21/tripwire</h1>
<h2 align="center">JavaScript/TypeScript Test support utilities and assertion library</h2>

![GitHub Workflow Status (main)](https://img.shields.io/github/actions/workflow/status/nevware21/tripwire/ci.yml?branch=main)
[![codecov](https://codecov.io/gh/nevware21/tripwire/graph/badge.svg?token=I9mMGSvfkk)](https://codecov.io/gh/nevware21/tripwire)
[![npm version](https://badge.fury.io/js/%40nevware21%2Ftripwire.svg)](https://badge.fury.io/js/%40nevware21%2Ftripwire)
[![downloads](https://img.shields.io/npm/dt/%40nevware21/tripwire.svg)](https://www.npmjs.com/package/%40nevware21/tripwire)
[![downloads](https://img.shields.io/npm/dm/%40nevware21/tripwire.svg)](https://www.npmjs.com/package/%40nevware21/tripwire)

# Description

Tripwire is a TypeScript/JavaScript **assertion library and test runner** in one package. You write
`describe`/`it` suites once, and `npx tripwire` runs the same files on **node**, in a **real
headless browser**, and inside a **web worker** -- compiling TypeScript on the fly, with no Karma,
ts-node, webpack or plugins to assemble. Repeat runs skip compiling, type-checking is a flag, and
every assertion failure says exactly what was compared.

The assertion side offers both `assert.*` functions and a Chai-style `expect(x).to...` chain
(the `assert` functions are built on `expect`, so the two mix freely), targets ES5, and keeps its
dependencies to a minimum so that a dependency update elsewhere cannot break your test run -- which
is how the project started, when the frameworks we tested Worker code with stopped working.

**New here?** Read [Why tripwire](https://nevware21.github.io/tripwire/why-tripwire.html) for what is automatic, what is fast, how it
compares with Mocha, Karma, Jest and Vitest, and when it is not the right tool. Coming from one of
those? There is a [migration guide](#documentation) for each.

## Key Features

### Test Runner & CLI

Tripwire also ships a test runner (`tripwire`) that executes the same `describe`/`it` suites
against **node**, **browser** and **worker** targets, with Mocha-compatible test definitions,
14 built-in reporters, coverage, watch mode and `.tripwirerc` config files.

```bash
npx tripwire "test/**/*.test.ts"                 # node
npx tripwire --target browser "test/**/*.test.ts" # real (headless) browser
npx tripwire --target worker  "test/**/*.test.ts" # web worker
```

- **[Test Runner, CLI & Configuration Guide](https://nevware21.github.io/tripwire/test-runner.html)** - every CLI flag and config
  field, file discovery, coverage, and [hook failures](https://nevware21.github.io/tripwire/test-runner.html#hook-failures)
- **[Test Reporters](https://nevware21.github.io/tripwire/reporters.html)** - all 14 built-in reporters with sample output for each,
  how to select and combine them, and the per-reporter options
- **[Migrating from Mocha](https://nevware21.github.io/tripwire/migration/migrating-from-mocha.html)** - flag/config/API mapping,
  what is not supported, and a step-by-step checklist
- **[Migrating from Karma](https://nevware21.github.io/tripwire/migration/migrating-from-karma.html)** - `karma.conf.js` field
  mapping, browser and worker targets without plugins, coverage, and launch modes
- **[Migrating from Jest or Vitest](https://nevware21.github.io/tripwire/migration/migrating-from-jest.html)** - matcher and config
  mapping, what has no equivalent (mocking, snapshots), and a machine-readable summary
- **[Performance](https://nevware21.github.io/tripwire/performance.html)** - what the runner does to be fast, measured benchmark
  results against Mocha and Karma, and how to reproduce them
- **[Runner Troubleshooting](https://nevware21.github.io/tripwire/runner-troubleshooting.html)** - known issues, including
  [opting in to the global `describe`/`it` names](https://nevware21.github.io/tripwire/runner-troubleshooting.html#cannot-find-name-describe)
  and the [`@types/mocha` / `@types/jest` / `@types/jasmine` global type clash](https://nevware21.github.io/tripwire/runner-troubleshooting.html#typescript-duplicate-global-declarations)
- **[Test Suite API](core/src/suite/README.md)** - `describe`/`it`/hooks, `.only`/`.skip`,
  filters, deterministic test IDs
- **[Test Execution Flow](https://nevware21.github.io/tripwire/test-execution-flow.html)** - execution model, timeouts, hook
  failure handling, runner metrics

### Comprehensive Assertion Library
- **Type checking** - object, array, string, number, boolean, null, undefined, NaN, finite, typeof, instanceof
- **Equality assertions** - equal, strictEqual, deepEqual, deepStrictEqual and their `not` forms, closeTo (approximate equality)
- **Property checking** - property, ownProperty, deepProperty, nestedProperty with value validation
- **Collection operations** - include, keys, members with deep equality and ordered comparison support
- **Numeric comparisons** - above, below, within, atLeast, atMost with full range validation
- **Value changes** - track changes, increases, decreases over function execution with delta validation
- **Array operations** - member comparison with subsequence, endsWith, and oneOf matching
- **Error/exception testing** - comprehensive throw/catch with error type and message validation
- **Custom error messages** - all assertions support optional custom messages
- **Full negation support** - consistent `not` operator across all assertion types
- **Chaining** - continue after any assertion (`expect(5).is.number().and.is.above(1)`), and `or(...)` to accept whichever of several clauses passes

## Documentation

**Main Documentation Site**: [https://nevware21.github.io/tripwire](https://nevware21.github.io/tripwire)

The documentation site includes:
- [Why tripwire](https://nevware21.github.io/tripwire/why-tripwire.html) - what is automatic across
  node, browser and worker, what is fast, a comparison with Mocha, Karma, Jest and Vitest, and when
  not to use it
- [Performance](https://nevware21.github.io/tripwire/performance.html) - the runner's mechanisms and
  measured benchmark results
- Quick start guides and usage examples
- Feature highlights and comparison tables
- Migration guides:
  - [From Node.js Native Assert](https://nevware21.github.io/tripwire/migration/migrating-from-node-assert.html)
  - [From Chai.js](https://nevware21.github.io/tripwire/migration/migrating-from-chai.html)
  - [From Mocha (test runner)](https://nevware21.github.io/tripwire/migration/migrating-from-mocha.html)
  - [From Karma (browser/worker runner)](https://nevware21.github.io/tripwire/migration/migrating-from-karma.html)
  - [From Jest or Vitest](https://nevware21.github.io/tripwire/migration/migrating-from-jest.html)
- [AGENTS.md](AGENTS.md) and [llms.txt](https://nevware21.github.io/tripwire/llms.txt) - entry points
  written for AI agents
- [Runner Troubleshooting](https://nevware21.github.io/tripwire/runner-troubleshooting.html) - Known issues and fixes, including opting in to the global `describe`/`it` names and the `@types/mocha`, `@types/jest` and `@types/jasmine` global type clash
- Detailed guides for specific features (like change/increase/decrease assertions)
- [Expression Adapter Guide](https://nevware21.github.io/tripwire/expression-adapter.html) - Creating custom assertions using expressions
- [Test Runner, CLI & Configuration Guide](https://nevware21.github.io/tripwire/test-runner.html) - The `tripwire` CLI, `.tripwirerc` config files, running against node/browser/worker targets, file discovery, and [hook failures](https://nevware21.github.io/tripwire/test-runner.html#hook-failures) (`--fail-on-hook`)
- [Test Reporters](https://nevware21.github.io/tripwire/reporters.html) - The 14 built-in test-result reporters with sample output for each, selecting and combining them, and per-reporter options
- [Test Execution Flow](https://nevware21.github.io/tripwire/test-execution-flow.html) - How suites, tests and hooks execute, promise creation, timeouts, hook failure handling, and runner metrics
- [Test Suite API](core/src/suite/README.md) - The `describe`/`it`/hook definition API (Mocha, Jasmine and TDD styles, `.only`/`.skip`, filters, deterministic test IDs)
- Links to full TypeDoc API reference for each module

**API Reference (TypeDoc)**:
- [Core Module API](https://nevware21.github.io/tripwire/typedoc/core/index.html)
- [Chai Shim API](https://nevware21.github.io/tripwire/typedoc/shim/chai/index.html)

## Quick Start

Install the npm package: `npm install @nevware21/tripwire --save-dev`

> Recommended: Use the following definition in your `package.json` to stay compatible with future releases.
> We do not intend to make runtime / environment breaking changes until at least v2.x
> ```json
> "@nevware21/tripwire": ">= 0.1.8 < 2.x"
> ```

## Usage

To use the core functionalities, import the necessary modules and functions:

```ts
import { assert, expect } from '@nevware21/tripwire';

assert.isObject([]); // throws

expect(() => { dosomething(); }).to.not.throw();
expect(() => { throw new Error("failed")}).to.throw();
```

### The global `describe` / `it` names

The `tripwire` runner installs `describe`, `it`, the lifecycle hooks, `assert` and `expect` onto
`global` before it loads any test file, so test files can use the bare names with no imports.

For TypeScript those names are **opt-in**. Importing `@nevware21/tripwire` declares no ambient
globals, which is what allows it to be installed into a project that still has `@types/mocha`,
`@types/jest` or `@types/jasmine` without breaking the build -- all three declare the same names
with their own types, and TypeScript cannot have two disagreeing declarations of one global.

Opt in with either the entry published by the core package:

```jsonc
// tsconfig.json
{ "compilerOptions": { "types": ["node", "@nevware21/tripwire/globals"] } }
```

...or a dependency on `@nevware21/tripwire-globals`, which re-publishes the same declarations and
is versioned in lockstep:

```jsonc
{ "compilerOptions": { "types": ["node", "@nevware21/tripwire-globals"] } }
```

A `/// <reference types="@nevware21/tripwire/globals" />` in any one file, or a side-effect
`import "@nevware21/tripwire/globals"` (which also installs the names at runtime, for files not
run through the CLI), both work as well. Or skip the globals entirely and import what you use --
that never collides with another framework:

```ts
import { describe, it, assert } from "@nevware21/tripwire";
```

See [Cannot find name 'describe'](https://nevware21.github.io/tripwire/runner-troubleshooting.html#cannot-find-name-describe) for
the full set of options.

# Modules

## Core Module

Provides the core assertion utilities and located in the [`core`](https://github.com/nevware21/tripwire/tree/main/core) folder.

It is designed to work in and is tested with the following environments.

- `node`
- `browser`
- `worker` (browser)

It currently provides `assertion` functions to make testing simplier and easier by providing common assertion checks that you can run against your code.

It provides both `assert` and `expect` support, where the `assert` functions are a set of fixed operations, which the `expect` is a more descriptive language API.

The `assert` functions are built on-top of the underlying `expect` support, and if no assertions are thrown the result of the internal "chained" descriptive language API is returned. Which means you can mix the `expect` objects with the responses from the `assert` functions.

To avoid dependency issues, this project will use the mininal set of external dependencies so that it can ensure and maintain compatibility with current (and future) runtimes.

## Globals Module

Provides the opt-in ambient declarations for the bare `describe`/`it`/hook/`assert`/`expect`
global names, published as `@nevware21/tripwire-globals` and located in the
[`globals`](https://github.com/nevware21/tripwire/tree/main/globals) folder.

It depends on the exact matching version of `@nevware21/tripwire` and contains nothing but the
declarations and a runtime installer, so a project can express "I want the globals" as a
dependency rather than as tsconfig configuration. The identical entry ships inside the core
package as `@nevware21/tripwire/globals` for projects that would rather not add a second
dependency -- see [the global names](#the-global-describe--it-names) above.

## Chai Shim

Provides basic support for the Chai Js assertion library which uses the [tripwire](https://github.com/nevware21/tripwire) and located in the [`shim/chai`](https://github.com/nevware21/tripwire/tree/main/shim/chai) folder.

This Shim is not designed to be a complete 1:1 replacement for Chai, it's primary focus is to provide a quicker migration option using your existing chai based `assert.*` functions, so that once you have validated that `tripwire` works or resolves your issues you can (if required) switch over to the full `core` module.

As part of this the returned "error messages" do not and will not match the assertion text returned by `chai`, if your unit tests include validation of the returned error messages then they will need to be updated, it is recommended to use regular expressions to validate the returned error message when required.

As of the initial version not all functions are yet implemented

## Browser Support

General support is currently set to ES5 supported runtimes and higher.

This module uses [@nevware21/ts-utils](https://github.com/nevware21/ts-utils) to provide some of it core functionality which includes internal polyfills to provide support on older browsers.

While every effort will be made to maintain as much technical compatibility as possible, some assertions and functionality will require later browsers to function correctly.

## Contributing

Read our primary [contributing guide](https://github.com/nevware21/tripwire/blob/main/CONTRIBUTING.md) to learn about our development process, how to propose bugfixes and improvements, and how to build and test your changes.

## License

This project is licensed under the MIT License. See the LICENSE file for details.