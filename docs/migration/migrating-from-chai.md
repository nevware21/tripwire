# Migrating from Chai to Tripwire

This guide helps you upgrade your codebase from [Chai](https://www.chaijs.com/) to [Tripwire](https://github.com/nevware21/tripwire), using the Chai 5 assert shim or by fully adopting Tripwire's native assertion APIs. It is designed for both human readers and GitHub Copilot-assisted migrations.

---

## 1. Overview

Tripwire provides a robust assertion library for Node, browser, and worker environments, with a Chai 5 assert compatibility shim for easy migration.

### Migration Paths

| Chai API | Migration Option | Effort |
|----------|------------------|--------|
| `assert` | Use `@nevware21/tripwire-chai` shim | Minimal - import change only |
| `assert` | Use `@nevware21/tripwire` directly | Low - APIs are similar (some naming differences, see section 5) |
| `expect` | Use `@nevware21/tripwire` expect | Medium - syntax differences |
| `should` | Use `@nevware21/tripwire` expect | Medium - rewrite required |

> **Note**: There is no shim for Chai's `expect` or `should` APIs. If you use these, you must migrate to Tripwire's native `expect` API.

---

## 2. Using the Chai 5 Assert Shim

### Install Tripwire and the Shim

```bash
npm install @nevware21/tripwire @nevware21/tripwire-chai
```

### Update Imports

Replace Chai imports like:
```js
const assert = require('chai').assert;
// or
import { assert } from 'chai';
```
With:
```js
import { assert } from '@nevware21/tripwire-chai';
```

### Supported APIs
- The shim supports most Chai 5 `assert` methods (see [README](../../shim/chai/README.md)).
- Some advanced Chai plugins or custom assertions may require manual migration.

### Example
**Before:**
```js
import { assert } from 'chai';
assert.equal(foo, 42);
assert.isObject(bar);
```
**After:**
```js
import { assert } from '@nevware21/tripwire-chai';
assert.equal(foo, 42);
assert.isObject(bar);
```

---

## 3. Migrating Chai `expect` to Tripwire

If you use Chai's `expect` API, you must migrate to Tripwire's native `expect`. There is no shim for this API.

### Update Imports

```diff
- import { expect } from 'chai';
+ import { expect } from '@nevware21/tripwire';
```

### Chai expect → Tripwire expect Mappings

Most Chai `expect` chains translate directly to Tripwire:

> **Note**: Tripwire type checks are function calls (e.g. `expect(x).to.be.a.string()`), and `NaN`/`finite` are `nan()`/`finite()` functions.

| Chai expect | Tripwire expect |
|-------------|-----------------|
| `expect(x).to.equal(y)` | `expect(x).to.equal(y)` |
| `expect(x).to.deep.equal(y)` | `expect(x).to.deep.equal(y)` |
| `expect(x).to.be.true` | `expect(x).to.be.true()` |
| `expect(x).to.be.false` | `expect(x).to.be.false()` |
| `expect(x).to.be.null` | `expect(x).to.be.null()` |
| `expect(x).to.be.undefined` | `expect(x).to.be.undefined()` |
| `expect(x).to.be.a('string')` | `expect(x).to.be.a.string()` |
| `expect(x).to.be.an('array')` | `expect(x).to.be.an.array()` |
| `expect(x).to.be.instanceOf(Foo)` | `expect(x).to.be.instanceOf(Foo)` |
| `expect(x).to.have.property('y')` | `expect(x).to.have.property('y')` |
| `expect(x).to.have.lengthOf(3)` | `expect(x).to.have.lengthOf(3)` |
| `expect(x).to.include(y)` | `expect(x).to.include(y)` |
| `expect(x).to.contain(y)` | `expect(x).to.contain(y)` |
| `expect(fn).to.throw()` | `expect(fn).to.throw()` |
| `expect(fn).to.throw(Error)` | `expect(fn).to.throw(Error)` |
| `expect(fn).to.not.throw()` | `expect(fn).to.not.throw()` |
| `expect(x).to.be.above(5)` | `expect(x).to.be.above(5)` |
| `expect(x).to.be.below(10)` | `expect(x).to.be.below(10)` |
| `expect(x).to.be.at.least(5)` | `expect(x).to.be.at.least(5)` |
| `expect(x).to.be.at.most(10)` | `expect(x).to.be.at.most(10)` |
| `expect(x).to.be.within(5, 10)` | `expect(x).to.be.within(5, 10)` |
| `expect(x).to.match(/pattern/)` | `expect(x).to.match(/pattern/)` |
| `expect(x).to.have.members([1,2])` | `expect(x).to.include.sameMembers([1,2])` |
| `expect(x).to.have.keys('a', 'b')` | `expect(x).to.have.all.keys('a', 'b')` |
| `expect(x).to.be.empty` | `expect(x).to.be.empty()` |
| `expect(x).to.be.ok` | `expect(x).to.be.ok()` |
| `expect(x).to.exist` | `expect(x).to.exist()` |
| `expect(x).to.be.NaN` | `expect(x).to.be.nan()` |
| `expect(x).to.be.finite` | `expect(x).to.be.finite()` |

> **Strict equality note**: Chai’s `expect(x).to.equal(y)` already uses strict equality. In Tripwire, you can force strict equality in the chain with `expect(x).to.strictly.equal(y)`.

### Example Migration

**Before (Chai expect):**
```js
import { expect } from 'chai';

expect(result).to.be.an('object');
expect(result).to.have.property('name').that.equals('test');
expect(items).to.be.an('array').with.lengthOf(3);
expect(fn).to.throw(TypeError, /invalid/);
```

**After (Tripwire expect):**
```js
import { expect } from '@nevware21/tripwire';

expect(result).to.be.an.object();
expect(result).to.have.property('name').that.equals('test');
expect(items).to.be.an.array();
expect(items).to.have.lengthOf(3);
expect(fn).to.throw(TypeError, /invalid/);
```

---

## 4. Migrating Chai `should` to Tripwire

If you use Chai's `should` API, you must rewrite using Tripwire's `expect`. The `should` style is not supported.

### Example Migration

**Before (Chai should):**
```js
require('chai').should();

foo.should.be.a('string');
foo.should.equal('bar');
foo.should.have.lengthOf(3);
```

**After (Tripwire expect):**
```js
import { expect } from '@nevware21/tripwire';

expect(foo).to.be.a.string();
expect(foo).to.equal('bar');
expect(foo).to.have.lengthOf(3);
```

---

## 5. Full Migration from Chai `assert` to Tripwire

### Update Imports

Replace Chai imports with Tripwire:
```js
import { assert, expect } from '@nevware21/tripwire';
```

### Refactor Assertions

Tripwire supports both `assert` and `expect` styles. The `expect` API is more expressive and recommended for new code.

#### Common Mappings
| Chai (assert)          | Tripwire (assert)         | Tripwire (expect)                |
|------------------------|---------------------------|----------------------------------|
| assert.equal(a, b)     | assert.equal(a, b)        | expect(a).to.equal(b)            |
| assert.strictEqual(a, b) | assert.strictEqual(a, b) | expect(a).to.strictly.equal(b)   |
| assert.deepEqual(a, b) | assert.deepEqual(a, b)    | expect(a).to.deep.equal(b)       |
| assert.isTrue(val)     | assert.isTrue(val)        | expect(val).to.be.true()         |
| assert.isFalse(val)    | assert.isFalse(val)       | expect(val).to.be.false()        |
| assert.isNull(val)     | assert.isNull(val)        | expect(val).to.be.null()         |
| assert.isUndefined(val)| assert.isUndefined(val)   | expect(val).to.be.undefined()    |
| assert.isObject(obj)   | assert.isObject(obj)      | expect(obj).to.be.an.object()    |
| assert.isArray(arr)    | assert.isArray(arr)       | expect(arr).to.be.an.array()     |
| assert.isString(str)   | assert.isString(str)      | expect(str).to.be.a.string()     |
| assert.isNumber(num)   | assert.isNumber(num)      | expect(num).to.be.a.number()     |
| assert.isFunction(fn)  | assert.isFunction(fn)     | expect(fn).to.be.a.function()    |
| assert.throws(fn)      | assert.throws(fn)         | expect(fn).to.throw()            |
| assert.doesNotThrow(fn)| assert.doesNotThrow(fn)   | expect(fn).to.not.throw()        |
| assert.include(arr, v) | assert.includes(arr, v)   | expect(arr).to.include(v)        |
| assert.property(o, k)  | assert.hasProperty(o, k)  | expect(o).to.have.property(k)    |
| assert.lengthOf(a, n)  | assert.lengthOf(a, n)     | expect(a).to.have.lengthOf(n)    |

#### Example Migration
**Before (Chai):**
```js
import { assert } from 'chai';
assert.deepEqual(foo, { a: 1 });
assert.isFalse(bar);
```
**After (Tripwire):**
```js
import { expect } from '@nevware21/tripwire';
expect(foo).to.deep.equal({ a: 1 });
expect(bar).to.be.false();
```

### Remove Chai from Dependencies
- Remove `chai` and related plugins from your `package.json`.
- Ensure all tests pass in Node, browser, and worker environments.

---

## 6. Migration with Copilot

GitHub Copilot can help automate migration. Use these prompts based on your Chai API:

### For Chai `assert` → Tripwire shim (minimal changes)
```
Replace all 'chai' imports with '@nevware21/tripwire-chai' keeping assert usage unchanged.
```

### For Chai `assert` → Tripwire `expect` (full migration)
```
Convert all Chai assert.* calls to Tripwire expect style. For example:
- assert.equal(a, b) → expect(a).to.equal(b)
- assert.isTrue(x) → expect(x).to.be.true()
- assert.throws(fn) → expect(fn).to.throw()
```

### For Chai `expect` → Tripwire `expect`
```
Migrate Chai expect assertions to Tripwire. Update imports from 'chai' to '@nevware21/tripwire'.
Note: Most expect chains are identical, but check instanceof vs instanceOf.
```

### For Chai `should` → Tripwire `expect`
```
Convert Chai should-style assertions to Tripwire expect. For example:
- foo.should.equal('bar') → expect(foo).to.equal('bar')
- foo.should.be.a('string') → expect(foo).to.be.a.string()
Remove the should() initialization call.
```

### Tips for Copilot Migration
- Review suggestions for edge cases or custom assertions
- Test in all environments (Node, browser, worker) after migration
- For Chai plugins, rewrite using Tripwire's `expect` or custom helpers

---

## 7. Additional Notes
- Tripwire is ES5-compatible and works in all major JS environments.
- For unsupported Chai plugins, rewrite using Tripwire's `expect` or custom helpers.
- See [Tripwire API docs](https://nevware21.github.io/tripwire/index.html) for full details.

---

## 8. References
- [Tripwire GitHub](https://github.com/nevware21/tripwire)
- [Tripwire Chai Shim](../../shim/chai/README.md)
- [Tripwire API Docs](https://nevware21.github.io/tripwire/index.html)
- [Chai Migration Guide](https://www.chaijs.com/guide/styles/)

---

For questions or issues, open an [issue on GitHub](https://github.com/nevware21/tripwire/issues).
