
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

[Core Assertion Typedoc](https://nevware21.github.io/tripwire/typedoc/core/index.html)

### Feature Highlights

| Feature | Functions |
|---------|-----------|
| **Type Checking** | [`isObject`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#isobject), [`isArray`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#isarray), [`isString`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#isstring), [`isNumber`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#isnumber), [`isBoolean`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#isboolean), [`isFunction`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#isfunction), [`isNull`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#isnull), [`isUndefined`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#isundefined), [`isNaN`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#isnan), [`isFinite`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#isfinite), [`typeOf`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#typeof), [`isInstanceOf`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#isinstanceof), [`exists`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#exists) |
| **Equality & Comparison** | [`equal`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#equal), [`strictEqual`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#strictequal), [`deepEqual`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#deepequal), [`closeTo`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#closeto), [`isAbove`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#isabove), [`isBelow`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#isbelow), [`isWithin`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#iswithin), [`isAtLeast`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#isatleast), [`isAtMost`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#isatmost) |
| **Property Assertions** | [`hasProperty`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#hasproperty), [`hasOwnProperty`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#hasownproperty), [`hasDeepProperty`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#hasdeepproperty), [`nestedProperty`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#nestedproperty), [`deepNestedProperty`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#deepnestedproperty) |
| **Collection Operations** | [`includes`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#includes), [`sameMembers`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#samemembers), [`includeMembers`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#includemembers), [`lengthOf`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#lengthof), [`sizeOf`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#sizeof) |
| **Change Tracking** | [`changes`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#changes), [`increases`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#increases), [`decreases`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#decreases) - See [Change/Increase/Decrease Assertions Guide](change-assertions.md) |
| **Error Testing** | [`throws`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#throws), [`doesNotThrow`](https://nevware21.github.io/tripwire/typedoc/core/interfaces/IAssertClass.html#doesnotthrow) |
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
    "@nevware21/tripwire": ">= 0.1.4 < 2.x"
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
    "@nevware21/tripwire-chai": ">= 0.1.4 < 2.x"
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
- Errors: `throws`, `doesNotThrow`
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