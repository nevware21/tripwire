# Change/Increase/Decrease Assertions

Tripwire provides powerful assertions for testing value changes over function execution. These assertions allow you to verify that executing a function changes, increases, or decreases a monitored value.

## Overview

The change assertions come in three main families:

- **change/changes** - Verify that a value changes (any direction)
- **increase/increases** - Verify that a value increases (positive delta)
- **decrease/decreases** - Verify that a value decreases (negative delta)

Each family supports:
- Monitoring object properties
- Monitoring getter functions
- Chaining with `.by()` to verify the exact delta
- Direct delta assertions with `*By` variants

## Basic Usage

### Monitoring Object Properties

```ts
import { assert, expect } from '@nevware21/tripwire';

const obj = { count: 0 };
const increment = () => { obj.count++; };

// Using assert syntax
assert.changes(increment, obj, 'count');
assert.increases(increment, obj, 'count');
assert.changesBy(increment, obj, 'count', 1);

// Using expect syntax
expect(increment).to.change(obj, 'count');
expect(increment).to.increase(obj, 'count').by(1);
```

### Monitoring Getter Functions

```ts
import { expect } from '@nevware21/tripwire';

let value = 10;
const getValue = () => value;
const addFive = () => { value += 5; };

expect(addFive).to.change(getValue);
expect(addFive).to.increase(getValue).by(5);
```

## Assertion Variants

### change / changes

Verifies that a value changes (in any direction).

```ts
const obj = { val: 10 };
const modify = () => { obj.val = 20; };

// Basic change assertion
expect(modify).to.change(obj, 'val');

// Verify specific delta with chaining
expect(modify).to.change(obj, 'val').by(10);

// Direct delta assertion
expect(modify).to.changeBy(obj, 'val', 10);

// Negation
expect(modify).to.not.change(obj, 'otherProperty');
```

### increase / increases

Verifies that a value increases (positive change).

```ts
const obj = { count: 5 };
const addTen = () => { obj.count += 10; };

// Basic increase assertion
expect(addTen).to.increase(obj, 'count');

// Verify specific increase amount
expect(addTen).to.increase(obj, 'count').by(10);

// Direct increase delta assertion
expect(addTen).to.increaseBy(obj, 'count', 10);

// Negation
const noOp = () => {};
expect(noOp).to.not.increase(obj, 'count');
```

### decrease / decreases

Verifies that a value decreases (negative change).

```ts
const obj = { count: 10 };
const subtractThree = () => { obj.count -= 3; };

// Basic decrease assertion
expect(subtractThree).to.decrease(obj, 'count');

// Verify specific decrease amount (use positive magnitude)
expect(subtractThree).to.decrease(obj, 'count').by(3);

// Direct decrease delta assertion
expect(subtractThree).to.decreaseBy(obj, 'count', 3);

// Negation
const noOp = () => {};
expect(noOp).to.not.decrease(obj, 'count');
```

## Important Behavior Notes

### changeBy / changesBy - Sign-Agnostic Comparison

The `changeBy` and `changesBy` assertions compare **only the absolute value** of the delta. This means both positive and negative deltas with the same magnitude will match.

```ts
let value = 10;
const getValue = () => value;
const addFive = () => { value += 5; };
const subtractFive = () => { value -= 5; };

// All of these pass because absolute value is 5
expect(addFive).to.changeBy(getValue, 5);   // ✓ Passes - changed by +5
expect(addFive).to.changeBy(getValue, -5);  // ✓ Also passes - |5| = |-5|
expect(subtractFive).to.changeBy(getValue, 5);  // ✓ Passes - |-5| = |5|
expect(subtractFive).to.changeBy(getValue, -5); // ✓ Also passes - |-5| = |5|
```

**Why sign-agnostic?** This design allows you to verify the magnitude of change without caring about direction, which is useful when testing that a function modifies a value by a specific amount regardless of whether it increases or decreases.

### increaseBy / increasesBy - Requires Positive Change

The `increaseBy` and `increasesBy` assertions require that:
1. The value must actually increase (positive delta)
2. The delta parameter should be a positive number

```ts
const obj = { count: 5 };
const addTen = () => { obj.count += 10; };

expect(addTen).to.increaseBy(obj, 'count', 10);  // ✓ Passes
```

### decreaseBy / decreasesBy - Use Positive Magnitude

The `decreaseBy` and `decreasesBy` assertions require that:
1. The value must actually decrease (negative delta)
2. The delta parameter should be specified as a **positive** number representing the magnitude

```ts
const obj = { count: 10 };
const subtractThree = () => { obj.count -= 3; };

// Use positive 3 to represent a decrease of 3 (NOT -3)
expect(subtractThree).to.decreaseBy(obj, 'count', 3);  // ✓ Passes
```

**Why positive?** This design provides consistency and clarity - you always specify the magnitude as a positive number, and the assertion type (`increase` vs `decrease`) indicates the direction.

## Advanced Usage

### Chaining with .by()

The `change`, `increase`, and `decrease` assertions return a chainable result that supports `.by()`:

```ts
const obj = { val: 10 };
const addFive = () => { obj.val += 5; };

// Chain .by() to verify the exact delta
expect(addFive).to.change(obj, 'val').by(5);
expect(addFive).to.increase(obj, 'val').by(5);

// Negate the .by() check
expect(addFive).to.change(obj, 'val').not.by(10);
```

### Using changesButNotBy / increasesButNotBy / decreasesButNotBy

These assertions verify that a value changes in the expected direction but NOT by the specified amount:

```ts
let value = 0;
const getValue = () => value;
const addTwo = () => { value += 2; };
const noOp = () => {};

// Must change but not by the specified amount
expect(addTwo).to.changesButNotBy(getValue, 5);  // ✓ Passes - changed by 2, not 5
expect(addTwo).to.changesButNotBy(getValue, 2);  // ✗ Fails - changed by exactly 2
expect(noOp).to.changesButNotBy(getValue, 5);    // ✗ Fails - no change occurred
```

### Using assert Syntax

All change assertions are available in assert syntax as well:

```ts
import { assert } from '@nevware21/tripwire';

const obj = { count: 0 };
const increment = () => { obj.count++; };

assert.changes(increment, obj, 'count');
assert.increases(increment, obj, 'count');
assert.changesBy(increment, obj, 'count', 1);
assert.increasesBy(increment, obj, 'count', 1);

assert.doesNotChange(() => {}, obj, 'count');
assert.doesNotIncrease(() => {}, obj, 'count');
```

## Complete API Reference

### Assert Functions

- `assert.changes(fn, target, prop, msg?)` - Verify value changes
- `assert.increases(fn, target, prop, msg?)` - Verify value increases
- `assert.decreases(fn, target, prop, msg?)` - Verify value decreases
- `assert.changesBy(fn, target, prop, delta, msg?)` - Verify specific change
- `assert.increasesBy(fn, target, prop, delta, msg?)` - Verify specific increase
- `assert.decreasesBy(fn, target, prop, delta, msg?)` - Verify specific decrease
- `assert.doesNotChange(fn, target, prop, msg?)` - Verify no change
- `assert.doesNotIncrease(fn, target, prop, msg?)` - Verify no increase
- `assert.doesNotDecrease(fn, target, prop, msg?)` - Verify no decrease
- `assert.changesButNotBy(fn, target, prop, delta, msg?)` - Changes but not by delta
- `assert.increasesButNotBy(fn, target, prop, delta, msg?)` - Increases but not by delta
- `assert.decreasesButNotBy(fn, target, prop, delta, msg?)` - Decreases but not by delta

### Expect Chainable Methods

- `.change(target, prop)` / `.changes(target, prop)` - Verify value changes
- `.increase(target, prop)` / `.increases(target, prop)` - Verify value increases  
- `.decrease(target, prop)` / `.decreases(target, prop)` - Verify value decreases
- `.changeBy(target, prop, delta)` / `.changesBy(target, prop, delta)` - Verify specific change
- `.increaseBy(target, prop, delta)` / `.increasesBy(target, prop, delta)` - Verify specific increase
- `.decreaseBy(target, prop, delta)` / `.decreasesBy(target, prop, delta)` - Verify specific decrease
- `.changesButNotBy(target, prop, delta)` - Changes but not by delta
- `.increasesButNotBy(target, prop, delta)` - Increases but not by delta
- `.decreasesButNotBy(target, prop, delta)` - Decreases but not by delta

All methods also accept a getter function instead of `(target, prop)`.

### Chaining Methods

- `.by(delta)` - Verify the exact change amount (available after `change`, `increase`, or `decrease`)
- `.not` - Negate the assertion
- `.value` - Access the new value for further assertions

## TypeScript Support

All change assertions include full TypeScript generic type support for type-safe property monitoring:

```ts
interface MyObject {
    count: number;
    name: string;
}

const obj: MyObject = { count: 0, name: 'test' };
const increment = () => { obj.count++; };

// TypeScript ensures 'count' is a valid property of MyObject
expect(increment).to.increase(obj, 'count');

// TypeScript error: 'invalid' is not a property of MyObject
// expect(increment).to.increase(obj, 'invalid');
```

## See Also

- [API Documentation](https://nevware21.github.io/tripwire/index.html)
- [Core Module README](../core/README.md)
