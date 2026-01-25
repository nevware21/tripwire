# @nevware21/tripwire-chai

![GitHub Workflow Status (main)](https://img.shields.io/github/actions/workflow/status/nevware21/tripwire/ci.yml?branch=main)
[![codecov](https://codecov.io/gh/nevware21/tripwire/graph/badge.svg?token=I9mMGSvfkk)](https://codecov.io/gh/nevware21/tripwire)
[![npm version](https://badge.fury.io/js/%40nevware21%2Ftripwire-chai.svg)](https://badge.fury.io/js/%40nevware21%2Ftripwire-chai)
[![downloads](https://img.shields.io/npm/dt/%40nevware21/tripwire-chai.svg)](https://www.npmjs.com/package/%40nevware21/tripwire-chai)
[![downloads](https://img.shields.io/npm/dm/%40nevware21/tripwire-chai.svg)](https://www.npmjs.com/package/%40nevware21/tripwire-chai)

Chai.js compatibility shim powered by tripwire - Drop-in replacement for Chai's `assert` API.

> **Chai v5.x Compatible** - Designed to match the Chai v5.x assert API

## Purpose

Migrate from Chai.js without rewriting your tests. Perfect when:

- Chai dependencies are causing build issues
- You need Web Worker support (broken in some Chai versions)
- Your project is stuck due to Chai dependency conflicts
- You want to unblock your tests and migrate gradually

**Note**: This is NOT a complete Chai replacement. Only the `assert.*` API is implemented. The `expect` and `should` APIs are NOT available.

## Installation

```bash
npm install @nevware21/tripwire-chai --save-dev
```

**Recommended version range:**
```json
{
  "devDependencies": {
    "@nevware21/tripwire-chai": ">= 0.1.4 < 2.x"
  }
}
```

## Quick Migration

### Step 1: Update imports

```diff
- import { assert } from 'chai';
+ import { assert } from '@nevware21/tripwire-chai';
```

### Step 2: Run your tests

Most `assert.*` functions should work immediately.

### Step 3: Fix error message tests (if any)

Error messages differ from Chai. Use regex instead of exact strings:

```diff
- assert.throws(() => fn(), "exact chai message");
+ assert.throws(() => fn(), /error message/);
```

## What's Supported?

### Fully Implemented (assert API)

- **Basic**: `equal`, `notEqual`, `strictEqual`, `deepEqual`, `isOk`, `isTrue`, etc.
- **Types**: `isObject`, `isArray`, `isString`, `isNumber`, `isBoolean`, `isFunction`, `isNull`, `isUndefined`, `isNaN`, `isFinite`, etc.
- **Comparisons**: `isAbove`, `isAtLeast`, `isBelow`, `isAtMost`, `closeTo`, `approximately`, `operator`
- **Properties**: `property`, `deepProperty`, `nestedProperty`, `ownProperty` with value validation
- **Collections**: `include`, `deepInclude`, `members`, `sameMembers`, `keys`
- **Deep Keys**: `hasAnyDeepKeys`, `hasAllDeepKeys`, `containsAllDeepKeys`, `doesNotHaveAnyDeepKeys`, `doesNotHaveAllDeepKeys` for Maps/Sets with object keys
- **Size**: `lengthOf`, `sizeOf`
- **Changes**: `changes`, `increases`, `decreases` with delta tracking
- **Errors**: `throws`, `doesNotThrow`, `ifError`
- **State**: `isExtensible`, `isSealed`, `isFrozen`, `isEmpty`

### NOT Implemented

- **`expect` API** - Use core `@nevware21/tripwire` instead
- **`should` API** - No plans to implement
- **Plugins** - `use()` function not available

## Usage Example

```ts
import { assert } from '@nevware21/tripwire-chai';

// Your existing Chai tests should work
assert.equal(1 + 1, 2);
assert.isArray([1, 2, 3]);
assert.deepEqual({ a: 1 }, { a: 1 });
assert.throws(() => { throw new Error(); });
assert.property({ a: 1 }, 'a');
assert.include([1, 2, 3], 2);
```

## Documentation

**Migration Guide & Examples**: [Documentation Guide](https://nevware21.github.io/tripwire)

**API Reference**: [TypeDoc Documentation](https://nevware21.github.io/tripwire/typedoc/shim/chai/index.html)

**Core Package**: [@nevware21/tripwire](https://www.npmjs.com/package/@nevware21/tripwire) - Consider migrating for better features

**Repository**: [github.com/nevware21/tripwire](https://github.com/nevware21/tripwire)

## When to Use Core Tripwire

Consider switching to `@nevware21/tripwire` for:
- Better error messages
- Fluent `expect` syntax
- New features and improvements
- Long-term maintenance

## Browser Support

- Comprehensive support from ES5+ for broad compatibility
- Tested in Node.js, browsers, and Web Workers

## Contributing

See [Contributing Guide](https://github.com/nevware21/tripwire/blob/main/CONTRIBUTING.md)

## License

This project is licensed under the MIT License. See the LICENSE file for details.