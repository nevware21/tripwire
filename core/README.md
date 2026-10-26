# @nevware21/tripwire

![GitHub Workflow Status (main)](https://img.shields.io/github/actions/workflow/status/nevware21/tripwire/ci.yml?branch=main)
[![codecov](https://codecov.io/gh/nevware21/tripwire/graph/badge.svg?token=I9mMGSvfkk)](https://codecov.io/gh/nevware21/tripwire)
[![npm version](https://badge.fury.io/js/%40nevware21%2Ftripwire.svg)](https://badge.fury.io/js/%40nevware21%2Ftripwire)
[![downloads](https://img.shields.io/npm/dt/%40nevware21/tripwire.svg)](https://www.npmjs.com/package/%40nevware21/tripwire)
[![downloads](https://img.shields.io/npm/dm/%40nevware21/tripwire.svg)](https://www.npmjs.com/package/%40nevware21/tripwire)

Assertion library **and** test runner for JavaScript and TypeScript: the same `describe`/`it`
files run on Node.js, in a real headless browser, and inside a Web Worker, from one command.

## Why Tripwire?

**One suite, three targets, nothing to assemble**
- `npx tripwire` compiles your TypeScript, builds and serves the browser module graph, runs the
  same files on `node`, `browser` and `worker`, and installs the `describe`/`it` globals --
  no Karma, ts-node, webpack, adapters or plugins
- Repeat runs skip compiling and type-checking; `--type-check` costs about nothing extra
- 14 reporters, coverage, watch mode, one `.tripwirerc` for every setting

**Cross-Environment Assertions**
- Works in Node.js, browsers, and Web Workers; ES5 output for broad compatibility
- Tested across all three environments on every commit

**Dual API Design**
- Use familiar `assert.*` functions for quick checks
- Use fluent `expect().to.be.*` syntax for readable tests
- Mix both styles in the same test suite

**Reliable & Lightweight**
- Minimal dependencies to prevent build breakages
- Built with TypeScript for full type safety
- No dependency on unstable or unmaintained packages

## Installation

```bash
npm install @nevware21/tripwire --save-dev
```

**Recommended version range:**
```json
{
  "devDependencies": {
    "@nevware21/tripwire": ">= 0.1.8 < 2.x"
  }
}
```

## Quick Start

```ts
import { assert, expect } from '@nevware21/tripwire';

// Assert style
assert.equal(1 + 1, 2);
assert.isString("hello");
assert.deepEqual({ a: 1 }, { a: 1 });

// Expect style
expect(1 + 1).to.equal(2);
expect("hello").to.be.a.string();
expect({ a: 1 }).to.deep.equal({ a: 1 });
```

## Running Tests

The package also ships the `tripwire` test runner. It compiles TypeScript itself and runs the same
test files in Node.js, a browser, or a Web Worker:

```bash
npx tripwire "test/**/*.test.ts"                     # node (default)
npx tripwire --target browser "test/**/*.test.ts"    # headless Chrome via puppeteer
npx tripwire --target worker "test/**/*.test.ts"     # inside a Web Worker
```

`describe`, `it`, the hooks, `assert` and `expect` are available as globals during a run. To have
TypeScript know about the bare names, add
[@nevware21/tripwire-globals](https://www.npmjs.com/package/@nevware21/tripwire-globals), or import
them from `@nevware21/tripwire` in each file.

Every flag and config field is documented in the
[Test Runner guide](https://nevware21.github.io/tripwire/test-runner); `npx tripwire --help` prints
the same list.

## Key Features

- **Type Checking** - `isObject`, `isArray`, `isString`, `isNumber`, `isBoolean`, `isFunction`, `isNull`, `isUndefined`, `isNaN`, `isFinite`, `typeOf`, `instanceOf`, `exists`
- **Equality** - `equal`, `strictEqual`, `deepEqual`, `deepStrictEqual` and their `not` forms, `closeTo` (approximate equality)
- **Comparisons** - `above`, `below`, `within`, `atLeast`, `atMost`, `operator` (generic comparison)
- **Properties** - `property`, `ownProperty`, `deepProperty`, `nestedProperty` with value validation
- **Collections** - `include`, `keys`, `members` with deep equality and ordered comparison
- **Deep Keys** - `hasAnyDeepKeys`, `hasAllDeepKeys` for Maps/Sets with object keys using deep equality
- **Size/Length** - `lengthOf`, `sizeOf` for arrays, strings, maps, sets
- **Array Operations** - `subsequence`, `endsWith`, `oneOf` matching
- **Change Tracking** - Monitor value `changes`, `increases`, `decreases` with delta validation
- **Error Testing** - `throw`, `throws`, `doesNotThrow`, `ifError` with type and message validation
- **Object State** - `isExtensible`, `isSealed`, `isFrozen`, `isEmpty`
- **Chaining** - every assertion returns the instance, so `expect(5).is.number().and.is.above(1)` reads as two checks on one value; `or(...)` passes when any of several clauses does

## Documentation

**Quick Start & Examples**: [Documentation Guide](https://nevware21.github.io/tripwire)

**API Reference**: [TypeDoc Documentation](https://nevware21.github.io/tripwire/typedoc/core/index.html)

**Guides**:
- [Why tripwire](https://nevware21.github.io/tripwire/why-tripwire) - what is automatic, what is fast, comparison with Mocha, Karma, Jest and Vitest, when not to use it
- [Test Runner, CLI & Configuration](https://nevware21.github.io/tripwire/test-runner) - every flag and config field
- [Performance](https://nevware21.github.io/tripwire/performance) - mechanisms and measured benchmark results
- [Change/Increase/Decrease Assertions](https://nevware21.github.io/tripwire/change-assertions)
- [Expression Adapter Guide](https://nevware21.github.io/tripwire/expression-adapter)

**Migration Guides**:
- [Migrating from Node.js Native Assert](https://nevware21.github.io/tripwire/migration/migrating-from-node-assert)
- [Migrating from Chai](https://nevware21.github.io/tripwire/migration/migrating-from-chai)
- [Migrating from Mocha](https://nevware21.github.io/tripwire/migration/migrating-from-mocha)
- [Migrating from Karma](https://nevware21.github.io/tripwire/migration/migrating-from-karma)
- [Migrating from Jest or Vitest](https://nevware21.github.io/tripwire/migration/migrating-from-jest)

**For AI agents**: [AGENTS.md](https://github.com/nevware21/tripwire/blob/main/AGENTS.md) and
[llms.txt](https://nevware21.github.io/tripwire/llms.txt)

**Repository**: [github.com/nevware21/tripwire](https://github.com/nevware21/tripwire)

## Browser Support

- Comprehensive support from ES5+ for broad browser compatibility, from IE9+
- Tested in Node.js and headless Chrome (browser and Web Worker)
- Full Web Worker support

## Related Packages

**[@nevware21/tripwire-chai](https://www.npmjs.com/package/@nevware21/tripwire-chai)** - Chai.js compatibility shim

## Contributing

See [Contributing Guide](https://github.com/nevware21/tripwire/blob/main/CONTRIBUTING.md)

## License

This project is licensed under the MIT License. See the LICENSE file for details.