# Migrating from Node.js Native Assert to Tripwire

This guide helps you migrate from Node.js's built-in `assert` module to [Tripwire](https://github.com/nevware21/tripwire). It explains key differences, provides migration strategies, and is designed for both human readers and GitHub Copilot-assisted migrations.

---

## 1. Overview

Tripwire provides a comprehensive assertion library that works across Node.js, browser, and web worker environments. While it shares many similarities with Node.js's native `assert` module, there are important behavioral differences to be aware of when migrating.

### Why Migrate to Tripwire?

- **Cross-environment support**: Works seamlessly in Node.js, browsers, and web workers
- **Fluent API**: Provides both `assert` and `expect` styles for more expressive tests
- **Consistent behavior**: Same assertion semantics across all environments
- **Enhanced features**: Additional assertions not available in Node.js native assert

---

## 2. Quick Start

### Install Tripwire

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

### Update Imports

Replace Node.js assert imports:
```diff
- const assert = require('assert');
- const assert = require('node:assert');
- import assert from 'assert';
- import assert from 'node:assert';
+ import { assert } from '@nevware21/tripwire';
```

---

## 3. Key Behavioral Differences

### 3.1. `deepStrictEqual` - Instance vs. Structural Equality

**This is the most important difference to understand.**

#### Node.js Behavior
Node.js's `assert.deepStrictEqual` performs **structural equality** comparison. It checks if objects have the same structure and values, even if they are different instances:

```js
// Node.js native assert
const assert = require('assert');

const obj1 = { a: 1, b: 2 };
const obj2 = { a: 1, b: 2 };

assert.deepStrictEqual(obj1, obj2); // ✅ PASSES - structurally identical

const result = Object.assign({}, { a: 1 });
assert.deepStrictEqual(result, { a: 1 }); // ✅ PASSES
```

#### Tripwire Behavior
Tripwire's `assert.deepStrictEqual` requires **exact instance identity** for objects. It checks both structure and that nested objects are the same instances:

```js
// Tripwire
import { assert } from '@nevware21/tripwire';

const obj1 = { a: 1, b: 2 };
const obj2 = { a: 1, b: 2 };

assert.deepStrictEqual(obj1, obj2); // ❌ FAILS - different instances

const result = Object.assign({}, { a: 1 });
assert.deepStrictEqual(result, { a: 1 }); // ❌ FAILS - different instances

// Same reference works
assert.deepStrictEqual(obj1, obj1); // ✅ PASSES
```

#### Migration Strategy

When migrating code that compares different object instances, use `deepEqual` instead of `deepStrictEqual`:

```diff
// Before (Node.js)
const result = deepMerge({ a: 1 }, { b: 2 });
- assert.deepStrictEqual(result, { a: 1, b: 2 });

// After (Tripwire)
const result = deepMerge({ a: 1 }, { b: 2 });
+ assert.deepEqual(result, { a: 1, b: 2 });
```

Or use the fluent `expect` API:

```js
import { expect } from '@nevware21/tripwire';

const result = deepMerge({ a: 1 }, { b: 2 });
expect(result).to.deep.equal({ a: 1, b: 2 }); // ✅ PASSES
```

### 3.2. When to Use Each Assertion

| Assertion | Use Case | Node.js Behavior | Tripwire Behavior |
|-----------|----------|------------------|-------------------|
| `equal` | Loose equality (==) | Coerces types | Coerces types |
| `strictEqual` | Strict equality (===) | Same reference/value | Same reference/value |
| `deepEqual` | Deep structural equality with type coercion | Structural comparison | Structural comparison |
| `deepStrictEqual` | Deep strict equality | Structural + strict type check | **Requires same instances** |

**Recommendation:** For most test cases involving object comparison, use `deepEqual` instead of `deepStrictEqual` when migrating to Tripwire.

---

## 4. API Compatibility

Most Node.js assert methods are supported in Tripwire with the same or similar behavior:

### 4.1. Supported Assertions

| Node.js Assert | Tripwire | Notes |
|----------------|----------|-------|
| `assert(value)` | `assert(value)` | Identical |
| `assert.ok(value)` | `assert.ok(value)` | Identical |
| `assert.equal(actual, expected)` | `assert.equal(actual, expected)` | Identical |
| `assert.notEqual(actual, expected)` | `assert.notEqual(actual, expected)` | Identical |
| `assert.strictEqual(actual, expected)` | `assert.strictEqual(actual, expected)` | Identical |
| `assert.notStrictEqual(actual, expected)` | `assert.notStrictEqual(actual, expected)` | Identical |
| `assert.deepEqual(actual, expected)` | `assert.deepEqual(actual, expected)` | Identical |
| `assert.notDeepEqual(actual, expected)` | `assert.notDeepEqual(actual, expected)` | Identical |
| `assert.deepStrictEqual(actual, expected)` | `assert.deepStrictEqual(actual, expected)` | ⚠️ **Different behavior** (see section 3.1) |
| `assert.notDeepStrictEqual(actual, expected)` | `assert.notDeepStrictEqual(actual, expected)` | ⚠️ **Different behavior** (see section 3.1) |
| `assert.throws(fn, error?)` | `assert.throws(fn, error?)` | Similar (error messages may differ) |
| `assert.doesNotThrow(fn)` | `assert.doesNotThrow(fn)` | Similar |
| `assert.fail(message)` | `assert.fail(message)` | Similar |
| `assert.ifError(value)` | `assert.ifError(value)` | Supported |

### 4.2. Type Checking Assertions

Tripwire provides additional type checking assertions not available in Node.js:

```js
import { assert } from '@nevware21/tripwire';

// Type checks
assert.isString("hello");
assert.isNumber(42);
assert.isBoolean(true);
assert.isObject({});
assert.isArray([]);
assert.isFunction(() => {});
assert.isNull(null);
assert.isUndefined(undefined);
assert.isNaN(NaN);
assert.isFinite(100);
```

### 4.3. Node.js Assertions Not (Yet) Available

The following Node.js assert methods are not currently available in Tripwire:

- `assert.match(string, regexp)` - Use `expect(string).to.match(regexp)` instead
- `assert.doesNotMatch(string, regexp)` - Use `expect(string).to.not.match(regexp)` instead
- `assert.rejects(asyncFn)` - Tripwire does not currently provide a direct equivalent for asserting Promise rejections; use `async`/`await` with `try`/`catch` and normal assertions on the caught error.
- `assert.doesNotReject(asyncFn)` - Tripwire does not currently provide a direct equivalent; `await` the Promise and let the test fail if it rejects, or use `try`/`catch` and call `assert.fail` on rejection.

---

## 5. Migration Examples

### 5.1. Basic Assertions

**Before (Node.js):**
```js
const assert = require('assert');

assert.ok(value);
assert.equal(actual, expected);
assert.strictEqual(actual, expected);
assert.notEqual(actual, unexpected);
```

**After (Tripwire):**
```js
import { assert } from '@nevware21/tripwire';

assert.ok(value);
assert.equal(actual, expected);
assert.strictEqual(actual, expected);
assert.notEqual(actual, unexpected);
```

### 5.2. Deep Equality (Most Common Migration)

**Before (Node.js):**
```js
const assert = require('assert');

const result = processData({ input: 'test' });
assert.deepStrictEqual(result, { output: 'processed' });
```

**After (Tripwire) - Option 1: Use deepEqual**
```js
import { assert } from '@nevware21/tripwire';

const result = processData({ input: 'test' });
assert.deepEqual(result, { output: 'processed' });
```

**After (Tripwire) - Option 2: Use expect**
```js
import { expect } from '@nevware21/tripwire';

const result = processData({ input: 'test' });
expect(result).to.deep.equal({ output: 'processed' });
```

### 5.3. Array Comparisons

**Before (Node.js):**
```js
const assert = require('assert');

const arr = [1, 2, 3];
assert.deepStrictEqual(arr, [1, 2, 3]);
```

**After (Tripwire):**
```js
import { assert } from '@nevware21/tripwire';

const arr = [1, 2, 3];
assert.deepEqual(arr, [1, 2, 3]); // Use deepEqual for new array instances
```

### 5.4. Object Merging/Transformation

**Before (Node.js):**
```js
const assert = require('assert');

function mergeOptions(defaults, overrides) {
    return Object.assign({}, defaults, overrides);
}

const result = mergeOptions({ a: 1 }, { b: 2 });
assert.deepStrictEqual(result, { a: 1, b: 2 });
```

**After (Tripwire):**
```js
import { assert } from '@nevware21/tripwire';

function mergeOptions(defaults, overrides) {
    return Object.assign({}, defaults, overrides);
}

const result = mergeOptions({ a: 1 }, { b: 2 });
assert.deepEqual(result, { a: 1, b: 2 }); // deepEqual for new instances
```

### 5.5. Error Testing

**Before (Node.js):**
```js
const assert = require('assert');

assert.throws(() => {
    throw new TypeError('Invalid input');
}, TypeError);

assert.throws(() => {
    throw new Error('Something failed');
}, /failed/);
```

**After (Tripwire):**
```js
import { assert } from '@nevware21/tripwire';

assert.throws(() => {
    throw new TypeError('Invalid input');
}, TypeError);

assert.throws(() => {
    throw new Error('Something failed');
}, /failed/);
```

### 5.6. Using the Fluent Expect API

Tripwire also provides a fluent `expect` API that's more expressive:

```js
import { expect } from '@nevware21/tripwire';

// Type checking
expect(value).to.be.a.string();
expect(obj).to.be.an.object();
expect(arr).to.be.an.array();

// Equality
expect(actual).to.equal(expected);
expect(obj).to.deep.equal({ a: 1, b: 2 });
expect(value).to.strictly.equal(reference);

// Negation
expect(value).to.not.be.null();
expect(fn).to.not.throw();

// Error testing
expect(() => fn()).to.throw(TypeError);
expect(() => fn()).to.throw(/error message/);

// Properties
expect(obj).to.have.property('key');
expect(obj).to.have.property('key', value);

// Collections
expect(arr).to.include(item);
expect(arr).to.have.lengthOf(3);
```

---

## 6. Testing Strategy

### 6.1. Gradual Migration

1. **Install Tripwire** alongside Node.js assert
2. **Update imports** one test file at a time
3. **Run tests** and fix any failures (mostly `deepStrictEqual` → `deepEqual`)
4. **Review error messages** - they may differ from Node.js
5. **Remove Node.js assert** once migration is complete

### 6.2. Find and Replace Strategy

Use these patterns to help with migration:

**Find `deepStrictEqual` with new instances:**
```bash
# Search for patterns that likely create new instances
grep -r "deepStrictEqual.*{" test/
grep -r "deepStrictEqual.*\[" test/
grep -r "deepStrictEqual.*Object\." test/
grep -r "deepStrictEqual.*Array\." test/
```

**Replace pattern:**
```diff
- assert.deepStrictEqual(result, expectedObject);
+ assert.deepEqual(result, expectedObject);
```

### 6.3. Running Tests

After migration, test in all target environments:

```bash
# Node.js tests
npm run test:node

# Browser tests
npm run test:browser

# Worker tests
npm run test:worker

# All environments
npm run test
```

---

## 7. Migration with GitHub Copilot

GitHub Copilot can help automate the migration. Use these prompts:

### Basic Import Migration
```
Replace all Node.js 'assert' or 'node:assert' imports with '@nevware21/tripwire' imports.
Keep all assertion calls unchanged initially.
```

### Deep Equality Migration
```
Find all uses of assert.deepStrictEqual that compare objects or arrays that are 
different instances (created via Object.assign, spread operator, or factory functions).
Replace them with assert.deepEqual.
```

### Full Migration to Expect
```
Convert Node.js assert style to Tripwire expect style:
- assert.equal(a, b) → expect(a).to.equal(b)
- assert.deepEqual(a, b) → expect(a).to.deep.equal(b)
- assert.throws(fn, Error) → expect(fn).to.throw(Error)
Keep same test logic and behavior.
```

### Tips for Copilot
- Review suggestions for `deepStrictEqual` → `deepEqual` conversions
- Test in all environments after migration
- Check that error message assertions still work (they may need regex patterns)

---

## 8. Common Migration Patterns

### Pattern 1: Object Factory Functions

**Before:**
```js
function createUser(name, age) {
    return { name, age };
}

assert.deepStrictEqual(createUser('Alice', 30), { name: 'Alice', age: 30 });
```

**After:**
```js
function createUser(name, age) {
    return { name, age };
}

assert.deepEqual(createUser('Alice', 30), { name: 'Alice', age: 30 });
```

### Pattern 2: Array Transformations

**Before:**
```js
const doubled = [1, 2, 3].map(x => x * 2);
assert.deepStrictEqual(doubled, [2, 4, 6]);
```

**After:**
```js
const doubled = [1, 2, 3].map(x => x * 2);
assert.deepEqual(doubled, [2, 4, 6]);
```

### Pattern 3: Spread Operator

**Before:**
```js
const merged = { ...defaults, ...overrides };
assert.deepStrictEqual(merged, { a: 1, b: 2 });
```

**After:**
```js
const merged = { ...defaults, ...overrides };
assert.deepEqual(merged, { a: 1, b: 2 });
```

### Pattern 4: Object.assign

**Before:**
```js
const result = Object.assign({}, obj1, obj2);
assert.deepStrictEqual(result, expected);
```

**After:**
```js
const result = Object.assign({}, obj1, obj2);
assert.deepEqual(result, expected);
```

### Pattern 5: JSON Parse/Stringify

**Before:**
```js
const clone = JSON.parse(JSON.stringify(original));
assert.deepStrictEqual(clone, original);
```

**After:**
```js
const clone = JSON.parse(JSON.stringify(original));
assert.deepEqual(clone, original);
```

---

## 9. Error Messages

Error messages in Tripwire may differ from Node.js assert. When testing error messages:

**Recommended approach (works in both):**
```js
// Use regex for error message matching
assert.throws(() => fn(), /expected error text/);
expect(() => fn()).to.throw(/expected error text/);
```

**Avoid (brittle):**
```js
// Don't match exact error messages
assert.throws(() => fn(), new Error('exact message'));
```

---

## 10. Advanced Features

Tripwire provides additional features not available in Node.js assert:

### Property Checking
```js
assert.hasProperty(obj, 'key');
assert.hasOwnProperty(obj, 'key');
assert.nestedProperty(obj, 'a.b.c');
```

### Collection Operations
```js
assert.includes(array, item);
assert.sameMembers(arr1, arr2);
assert.lengthOf(array, 5);
```

### Numeric Comparisons
```js
assert.isAbove(value, 10);
assert.isBelow(value, 100);
assert.isWithin(value, 10, 100);
assert.closeTo(value, expected, delta);
```

### Change Tracking
```js
assert.changes(() => obj.count++, obj, 'count');
assert.increases(() => obj.count++, obj, 'count');
assert.decreases(() => obj.count--, obj, 'count');
```

See the [Tripwire documentation](https://nevware21.github.io/tripwire/index.html) for complete API reference.

---

## 11. Troubleshooting

### Problem: Tests fail with "different instances" errors

**Solution:** Replace `deepStrictEqual` with `deepEqual` for comparing objects/arrays that are different instances.

### Problem: Error message tests are failing

**Solution:** Use regex patterns instead of exact error message strings:
```js
assert.throws(() => fn(), /error pattern/);
```

### Problem: Some Node.js assert features are missing

**Solution:** Use Tripwire's `assert`/`expect` APIs or custom assertions:
```js
// Use assert.match() for regex matching
assert.match(string, /pattern/);

// For async failures, use assert.rejects() with async/await
await assert.rejects(async () => fn(), /error pattern/);
```

---

## 12. Best Practices

1. **Prefer `deepEqual` over `deepStrictEqual`** for object comparisons unless you specifically need instance identity
2. **Use the `expect` API** for more expressive tests:
   ```js
   expect(result).to.deep.equal(expected);
   expect(value).to.be.a.string();
   ```
3. **Use regex for error message matching** instead of exact strings
4. **Test in all target environments** (Node.js, browser, worker)
5. **Leverage Tripwire's additional assertions** for cleaner test code

---

## 13. Summary: Migration Checklist

- [ ] Install `@nevware21/tripwire` as a dev dependency
- [ ] Update imports from `assert`/`node:assert` to `@nevware21/tripwire`
- [ ] Replace `assert.deepStrictEqual` with `assert.deepEqual` for object/array comparisons
- [ ] Update error message assertions to use regex patterns
- [ ] Test in all target environments (node, browser, worker)
- [ ] Consider migrating to the `expect` API for new tests
- [ ] Review and update any custom assertion helpers
- [ ] Remove `assert`/`node:assert` dependency once complete

---

## 14. References

- [Tripwire GitHub Repository](https://github.com/nevware21/tripwire)
- [Tripwire API Documentation](https://nevware21.github.io/tripwire/index.html)
- [Tripwire Core API Reference](https://nevware21.github.io/tripwire/typedoc/core/index.html)
- [Node.js Assert Documentation](https://nodejs.org/api/assert.html)
- [Change/Increase/Decrease Assertions Guide](../change-assertions.md)
- [Expression Adapter Guide](../expression-adapter.md)
- [Migrating from Chai](migrating-from-chai.md)

---

For questions or issues, open an [issue on GitHub](https://github.com/nevware21/tripwire/issues).
