# @nevware21/tripwire

![GitHub Workflow Status (main)](https://img.shields.io/github/actions/workflow/status/nevware21/tripwire/ci.yml?branch=main)
[![codecov](https://codecov.io/gh/nevware21/tripwire/graph/badge.svg?token=I9mMGSvfkk)](https://codecov.io/gh/nevware21/tripwire)
[![npm version](https://badge.fury.io/js/%40nevware21%2Ftripwire.svg)](https://badge.fury.io/js/%40nevware21%2Ftripwire)
[![downloads](https://img.shields.io/npm/dt/%40nevware21/tripwire.svg)](https://www.npmjs.com/package/%40nevware21/tripwire)
[![downloads](https://img.shields.io/npm/dm/%40nevware21/tripwire.svg)](https://www.npmjs.com/package/%40nevware21/tripwire)

Modern assertion library for testing JavaScript and TypeScript packages across Node.js, Browser, and Web Worker environments.

## Why Tripwire?

**Cross-Environment Testing**
- Works seamlessly in Node.js, browsers, and Web Workers
- Comprehensive support from ES5+ for broad compatibility
- Tested across all three environments

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
    "@nevware21/tripwire": ">= 0.1.7 < 2.x"
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
expect("hello").to.be.a.string;
expect({ a: 1 }).to.deep.equal({ a: 1 });
```

## Key Features

- **Type Checking** - `isObject`, `isArray`, `isString`, `isNumber`, `isBoolean`, `isFunction`, `isNull`, `isUndefined`, `isNaN`, `isFinite`, `typeOf`, `instanceOf`, `exists`
- **Equality** - `equal`, `strictEqual`, `deepEqual`, `closeTo` (approximate equality)
- **Comparisons** - `above`, `below`, `within`, `atLeast`, `atMost`, `operator` (generic comparison)
- **Properties** - `property`, `ownProperty`, `deepProperty`, `nestedProperty` with value validation
- **Collections** - `include`, `keys`, `members` with deep equality and ordered comparison
- **Deep Keys** - `hasAnyDeepKeys`, `hasAllDeepKeys` for Maps/Sets with object keys using deep equality
- **Size/Length** - `lengthOf`, `sizeOf` for arrays, strings, maps, sets
- **Array Operations** - `subsequence`, `endsWith`, `oneOf` matching
- **Change Tracking** - Monitor value `changes`, `increases`, `decreases` with delta validation
- **Error Testing** - `throw`, `throws`, `doesNotThrow`, `ifError` with type and message validation
- **Object State** - `isExtensible`, `isSealed`, `isFrozen`, `isEmpty`

## Documentation

**Quick Start & Examples**: [Documentation Guide](https://nevware21.github.io/tripwire)

**API Reference**: [TypeDoc Documentation](https://nevware21.github.io/tripwire/typedoc/core/index.html)

**Guides**:
- [Change/Increase/Decrease Assertions](https://nevware21.github.io/tripwire/change-assertions)
- [Expression Adapter Guide](https://nevware21.github.io/tripwire/expression-adapter)

**Migration Guides**:
- [Migrating from Node.js Native Assert](https://nevware21.github.io/tripwire/migration/migrating-from-node-assert)
- [Migrating from Chai](https://nevware21.github.io/tripwire/migration/migrating-from-chai)

**Repository**: [github.com/nevware21/tripwire](https://github.com/nevware21/tripwire)

## Browser Support

- Comprehensive support from ES5+ for broad browser compatibility, from IE9+
- Tested in Node.js, Chrome, Firefox, Safari, Edge
- Full Web Worker support

## Related Packages

**[@nevware21/tripwire-chai](https://www.npmjs.com/package/@nevware21/tripwire-chai)** - Chai.js compatibility shim

## Contributing

See [Contributing Guide](https://github.com/nevware21/tripwire/blob/main/CONTRIBUTING.md)

## License

This project is licensed under the MIT License. See the LICENSE file for details.