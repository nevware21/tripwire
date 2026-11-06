
<h1 align="center">@nevware21/tripwire</h1>
<h2 align="center">JavaScript/TypeScript Test support utilities and assertion library</h2>

![GitHub Workflow Status (main)](https://img.shields.io/github/actions/workflow/status/nevware21/tripwire/ci.yml?branch=main)
[![codecov](https://codecov.io/gh/nevware21/tripwire/graph/badge.svg?token=I9mMGSvfkk)](https://codecov.io/gh/nevware21/tripwire)

# Modules
## Tripwire Core

[![npm version](https://badge.fury.io/js/%40nevware21%2Ftripwire.svg)](https://badge.fury.io/js/%40nevware21%2Ftripwire)
[![downloads](https://img.shields.io/npm/dt/%40nevware21/tripwire.svg)](https://www.npmjs.com/package/%40nevware21/tripwire)
[![downloads](https://img.shields.io/npm/dm/%40nevware21/tripwire.svg)](https://www.npmjs.com/package/%40nevware21/tripwire)

### Documentation

- [Tripwire in action](tour.md) - tripwire's own suite run once on node, in Chrome and in a web
  worker, coverage from the command line, and the interactive browser page, with screenshots of
  each
- [Why tripwire](why-tripwire.md) - what is automatic across node, browser and worker, what is
  fast, how it compares with Mocha, Karma, Jest and Vitest, and when not to use it
- [Performance](performance.md) - the runner's mechanisms, measured benchmark results against
  Mocha and Karma, and how to reproduce them; [Performance History](performance/history.md) charts
  every recorded run over time
- [Core Assertion Typedoc](https://nevware21.github.io/tripwire/typedoc/core/index.html)
- For AI agents: [AGENTS.md](https://github.com/nevware21/tripwire/blob/main/AGENTS.md) and
  [llms.txt](llms.txt)

### Feature Highlights

| Feature | Functions |
|---------|-----------|
| **Type Checking** | [`isObject`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#isobject), [`isArray`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#isarray), [`isString`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#isstring), [`isNumber`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#isnumber), [`isBoolean`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#isboolean), [`isFunction`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#isfunction), [`isNull`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#isnull), [`isUndefined`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#isundefined), [`isNaN`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#isnan), [`isFinite`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#isfinite), [`typeOf`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#typeof), [`isInstanceOf`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#isinstanceof), [`exists`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#exists) |
| **Equality & Comparison** | [`equal`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#equal), [`strictEqual`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#strictequal), [`deepEqual`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#deepequal), [`deepStrictEqual`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#deepstrictequal), [`notDeepStrictEqual`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#notdeepstrictequal), [`closeTo`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#closeto), [`isAbove`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#isabove), [`isBelow`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#isbelow), [`isWithin`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#iswithin), [`isAtLeast`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#isatleast), [`isAtMost`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#isatmost) |
| **Property Assertions** | [`hasProperty`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#hasproperty), [`hasOwnProperty`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#hasownproperty), [`hasDeepProperty`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#hasdeepproperty), [`nestedProperty`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#nestedproperty), [`deepNestedProperty`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#deepnestedproperty) |
| **Collection Operations** | [`includes`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#includes), [`sameMembers`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#samemembers), [`includeMembers`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#includemembers), [`lengthOf`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#lengthof), [`sizeOf`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#sizeof) |
| **Change Tracking** | [`changes`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#changes), [`increases`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#increases), [`decreases`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#decreases) - See [Change/Increase/Decrease Assertions Guide](change-assertions.md) |
| **Error Testing** | [`throws`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#throws), [`doesNotThrow`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#doesnotthrow), [`rejects`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#rejects), [`doesNotReject`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#doesnotreject) |
| **Chaining** | [`and`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertInst.html#and) continues a chain after a called assertion (`expect(5).is.number().and.is.above(1)`); [`or`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertInst.html#or) passes when any of the given clause functions passes (`expect(5).or(e => e.is.string(), e => e.is.number())`) |
| **Extensibility** | [`createExprAdapter`](https://nevware21.github.io/tripwire/typedoc/core/functions/createExprAdapter.html), [`addAssertFunc`](https://nevware21.github.io/tripwire/typedoc/core/functions/addAssertFunc.html) - See [Expression Adapter Guide](expression-adapter.md) |

### Quick Start

Install the package:
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

### Basic Usage

```ts
import { assert, expect } from '@nevware21/tripwire';

// Assert style - quick and direct
assert.equal(1 + 1, 2);
assert.isString("hello");
assert.deepEqual({ a: 1 }, { a: 1 });

// Expect style - fluent and readable
expect(1 + 1).to.equal(2);
expect("hello").to.be.a.string;
expect({ a: 1 }).to.deep.equal({ a: 1 });
```

## Migration Guides

One guide per framework you are leaving. The Mocha, Karma and Jest guides end with a
machine-readable JSON block for automated migrations.

- [Migrating from Mocha / ts-mocha](migration/migrating-from-mocha.md) - the test runner: flags,
  `.mocharc` to `.tripwirerc`, globals, what has no equivalent
- [Migrating from Karma](migration/migrating-from-karma.md) - `karma.conf.js` field mapping,
  browser and worker targets, coverage, launch modes
- [Migrating from Jest or Vitest](migration/migrating-from-jest.md) - matcher and config mapping,
  what has no equivalent (mocking, snapshots, parallel workers)
- [Migrating from Chai](migration/migrating-from-chai.md) - assertion mapping, and the
  `@nevware21/tripwire-chai` shim as a staged option
- [Migrating from Node.js Native Assert](migration/migrating-from-node-assert.md) - assertion
  mapping, including the `deepStrictEqual` difference

### Migrating from Node.js Native Assert

[Migrating from Node.js Assert to Tripwire](migration/migrating-from-node-assert.md) - Complete guide for migrating from Node.js native assert module

**Key differences to be aware of:** `deepStrictEqual` and `notDeepStrictEqual` match Node's
structural, type-strict behaviour (since v0.1.7 and v0.2.0 respectively), so they carry over
unchanged. Two methods differ:
```diff
- assert.doesNotMatch(text, /pattern/);
+ assert.notMatch(text, /pattern/);

  await assert.rejects(fn, /error pattern/);  // unchanged
```

See the [full migration guide](migration/migrating-from-node-assert.md) for complete details and examples.

## Test Runner, CLI & Configuration

[Test Runner, CLI & Configuration Guide](test-runner.md) - Running the `tripwire` CLI against
`node`/`browser`/`worker` targets, every CLI flag and `.tripwirerc` config field, file discovery,
coverage, and [hook failures](test-runner.md#hook-failures) (`--fail-on-hook`).

```bash
npx tripwire --target browser --reporter spec,xunit "test/**/*.test.ts"
```

Related:

- [Test Reporters](reporters.md) - all 14 built-in reporters with sample output for each
  (`spec`, `list`, `min`, `dot`, `progress`, `landing`, `nyan`, `tap`, `xunit`, `json`,
  `json-stream`, `doc`, `markdown`, `cargo`), how to select and combine them, the per-reporter
  options, and writing a custom one
- [Migrating from Karma](migration/migrating-from-karma.md) - moving a Karma suite to the tripwire
  runner: `karma.conf.js` field mapping, browser and worker targets with no plugins to assemble,
  coverage, launch modes for other browsers and devices, and a machine-readable summary
- [Migrating from Mocha](migration/migrating-from-mocha.md) - moving a Mocha (or `ts-mocha`)
  suite to the tripwire runner: flag and config mapping, what has no equivalent, a step-by-step
  checklist, and a machine-readable summary for automated migrations
- [Runner Troubleshooting](runner-troubleshooting.md) - known issues and their fixes, including
  [opting in to the global `describe`/`it` names](runner-troubleshooting.md#cannot-find-name-describe)
  and the [duplicate-global TypeScript errors](runner-troubleshooting.md#typescript-duplicate-global-declarations)
  that opting in alongside `@types/mocha`, `@types/jest` or `@types/jasmine` produces
- [Test Suite API](https://github.com/nevware21/tripwire/blob/main/core/src/suite/README.md) -
  the `describe`/`it`/hook definition API the runner executes (Mocha, Jasmine and TDD styles,
  `.only`/`.skip`, filters, deterministic test IDs)
- [Test Execution Flow](test-execution-flow.md) - how suites, tests and hooks are executed,
  when promises are created, timeout and
  [hook failure handling](test-execution-flow.md#hook-failure-handling), and the
  [opt-in runner metrics](test-execution-flow.md#runner-monitoring-metrics)

## Shim Chai

[![npm version](https://badge.fury.io/js/%40nevware21%2Ftripwire-chai.svg)](https://badge.fury.io/js/%40nevware21%2Ftripwire-chai)
[![downloads](https://img.shields.io/npm/dt/%40nevware21/tripwire-chai.svg)](https://www.npmjs.com/package/%40nevware21/tripwire-chai)
[![downloads](https://img.shields.io/npm/dm/%40nevware21/tripwire-chai.svg)](https://www.npmjs.com/package/%40nevware21/tripwire-chai)

### Documentation

[Chai Shim Typedoc](https://nevware21.github.io/tripwire/typedoc/shim/chai/index.html)

### Quick Start

Install the package:
```bash
npm install @nevware21/tripwire-chai --save-dev
```

**Recommended version range:**
```json
{
  "devDependencies": {
    "@nevware21/tripwire-chai": ">= 0.1.8 < 2.x"
  }
}
```

### Migration from Chai

[Migrating from Chai to Tripwire](migration/migrating-from-chai.md) - Guide for upgrading from Chai.js

**Step 1: Update your imports**
```diff
- import { assert } from 'chai';
+ import { assert } from '@nevware21/tripwire-chai';
```

**Step 2: Run your tests**

Most `assert.*` functions should work immediately.

**Step 3: Update error message tests (if needed)**

Error messages differ from Chai - use regex for flexibility:
```diff
- assert.throws(() => fn(), "exact chai message");
+ assert.throws(() => fn(), /error message/);
```

### What's Supported

The shim implements the Chai v5.x `assert` API including:

- Basic assertions: `equal`, `strictEqual`, `deepEqual`, `isOk`, `isTrue`, etc.
- Type checking: `isObject`, `isArray`, `isString`, `isNumber`, `isBoolean`, `isFunction`, etc.
- Comparisons: `isAbove`, `isAtLeast`, `isBelow`, `isAtMost`, `closeTo`
- Properties: `property`, `deepProperty`, `nestedProperty`, `ownProperty` with value checks
- Collections: `include`, `deepInclude`, `members`, `sameMembers`, `keys`
- Changes: `changes`, `increases`, `decreases` with delta tracking
- Errors: `throws`, `doesNotThrow`, `rejects`, `doesNotReject`
- Object state: `isExtensible`, `isSealed`, `isFrozen`, `isEmpty`

### What's NOT Supported

- `expect` API - Use core tripwire instead
- `should` API - No plans to implement
- Plugins - `use()` function not available

### When to Use Core Tripwire

Consider migrating to `@nevware21/tripwire` for:
- Better error messages
- Fluent `expect` syntax
- New features and improvements
- Long-term maintenance