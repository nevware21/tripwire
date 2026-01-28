# Expression Adapter Guide

The Expression Adapter is a powerful internal mechanism in Tripwire that allows you to compose assertion operations using a fluent, path-based expression syntax. It enables the creation of custom assertions by chaining operations together.

## Overview

The `createExprAdapter` function creates a scope function that evaluates expressions against assertion instances. It parses dot-notation strings or arrays into a sequence of operations, allowing you to build complex assertion chains programmatically.

```ts
import { createExprAdapter } from '@nevware21/tripwire';

// Create an adapter for a simple "not" expression
const notAdapter = createExprAdapter("not", myAssertionFunction);

// Create an adapter for a chained expression
const deepEqualAdapter = createExprAdapter("deep.equal");
```

## Expression Syntax

### Basic Expressions

Expressions are written as dot-separated paths that represent the chain of operations to perform on an assertion instance.

```ts
// Simple single-step expression
createExprAdapter("not")           // Access .not property

// Multi-step expression
createExprAdapter("to.be")         // Access .to, then .be

// Complex chain
createExprAdapter("to.be.not")     // Access .to, then .be, then .not
```

### Array Syntax

You can also pass expressions as an array of strings:

```ts
// Equivalent to "deep.equal"
createExprAdapter(["deep", "equal"])

// Equivalent to "not.deep.own.include"
createExprAdapter(["not", "deep", "own", "include"])
```

### Function Calls with Arguments

Expressions can include function calls with arguments using parentheses. Arguments can be:

1. **Named context arguments** - Reference values from the scope context
2. **Indexed arguments** - Reference arguments passed to the adapter
3. **Literal values** - Direct string values

```ts
// Call a function with arguments from the adapter call
createExprAdapter("include({0})")

// Call with multiple arguments
createExprAdapter("within({0},{1})")

// Call with named context values
createExprAdapter("equal({value})")
```

## Argument Reference Syntax

Arguments in function calls use specific syntax patterns:

### Indexed Arguments: `{0}`, `{1}`, `{2}`, ...

Reference arguments passed to the adapter by their zero-based index:

```ts
const adapter = createExprAdapter("is.above({0})");
// adapter.call(scope, 10) -> accesses is.above(10)
// The {0} is replaced with the first argument (10)
```

### Named Context Arguments: `{name}`

Reference values stored in the scope context:

```ts
const adapter = createExprAdapter("equal({expected})");
// Retrieves scope.context.get("expected") as the argument
```

### Literal String Values

Any argument that doesn't parse as an index becomes a literal string value:

```ts
const adapter = createExprAdapter("typeOf({string})");
// Passes the literal string "string" as the argument
```

## Creating Custom Assertions

There are two ways to add custom assertion functions, each with different capabilities:

| API | Added To | Can be called from expressions? |
|-----|----------|--------------------------------|
| `addAssertFunc` | `assert` object | No - only callable directly via `assert.myFunc()` |
| `addAssertInstFunc` | `IAssertInst` prototype | **Yes** - callable from expressions and via `expect().myFunc()` |

### Basic Custom Assertion (addAssertFunc)

Use `addAssertFunc` to add functions directly to the `assert` object:

```ts
import { createExprAdapter, addAssertFunc, assert, IAssertScope } from '@nevware21/tripwire';

// Create an assertion that checks if a value is a positive number
const isPositiveFunc = function(this: IAssertScope): any {
    const value = this.context.value;
    this.context.eval(
        typeof value === 'number' && value > 0,
        "expected {value} to be a positive number"
    );
    return this.that;
};

// Add it to the assert object
addAssertFunc(assert, 'isPositive', isPositiveFunc);
addAssertFunc(assert, 'isNotPositive', createExprAdapter("not", isPositiveFunc));

// Usage
assert.isPositive(5);      // Passes
assert.isNotPositive(-3);  // Passes
assert.isPositive(-1);     // Throws AssertionFailure
```

### Instance Custom Assertions (addAssertInstFunc) - Callable from Expressions

Use `addAssertInstFunc` or `addAssertInstFuncDefs` to add functions to the `IAssertInst` prototype.
These functions **can be called from expressions**:

```ts
import { 
    addAssertInstFunc, 
    addAssertInstFuncDefs,
    createExprAdapter, 
    expect,
    IAssertScope,
    IAssertInst,
    IExtendedAssertInst
} from '@nevware21/tripwire';

// Define a custom function
const isPositive = function(this: IAssertScope): any {
    const value = this.context.value;
    this.context.eval(
        typeof value === 'number' && value > 0,
        "expected {value} to be a positive number"
    );
    return this.that;
};

// Add to the assertion instance prototype
addAssertInstFunc("isPositive", isPositive);

// Define the type extension
interface IMyAssertions {
    isPositive(): IAssertInst;
}

// Now you can use it directly via expect()
(expect(5) as IExtendedAssertInst<IMyAssertions>).isPositive();  // Passes

// AND it can be called from expressions!
const notPositiveAdapter = createExprAdapter("not.isPositive");
// This adapter will: access .not, then call .isPositive()
```

### Expression-Based Assertion

```ts
import { createExprAdapter, addAssertFunc, assert } from '@nevware21/tripwire';

// Create assertions using expressions
addAssertFunc(assert, 'isNumericString', createExprAdapter("is.string"));
addAssertFunc(assert, 'isFiniteNumber', createExprAdapter("is.finite"));
addAssertFunc(assert, 'existsAndIsArray', createExprAdapter("to.exist.and.is.array"));
```

### Assertion with Scope Function

The second parameter to `createExprAdapter` is an optional scope function that runs after the expression is evaluated:

```ts
const checkRange = function(this: IAssertScope, min: number, max: number): any {
    const value = this.context.value;
    this.context.eval(
        value >= min && value <= max,
        `expected {value} to be between ${min} and ${max}`
    );
    return this.that;
};

// Expression runs first, then scope function
const notInRangeAdapter = createExprAdapter("not", checkRange);

// Usage: first applies "not", then runs checkRange
addAssertFunc(assert, 'isNotInRange', { scopeFn: notInRangeAdapter, nArgs: 3 });
```

## Expression Operations Reference

### Chainable Operations

These operations can be chained and don't require arguments:

| Expression | Description |
|------------|-------------|
| `not` | Negates the following assertion |
| `to` | Language chain (no-op) |
| `be` | Language chain (no-op) |
| `been` | Language chain (no-op) |
| `is` | Language chain (no-op) |
| `that` | Language chain (no-op) |
| `which` | Language chain (no-op) |
| `and` | Language chain (no-op) |
| `has` | Access property operations |
| `have` | Access property operations |
| `with` | Language chain (no-op) |
| `at` | Language chain (no-op) |
| `of` | Language chain (no-op) |
| `same` | Language chain (no-op) |
| `but` | Language chain (no-op) |
| `does` | Language chain (no-op) |
| `still` | Language chain (no-op) |
| `also` | Language chain (no-op) |
| `deep` | Enable deep equality comparison |
| `own` | Check only own properties |
| `nested` | Enable nested property access |
| `any` | Match any key/value |
| `all` | Match all keys/values |
| `strictly` | Enable strict equality |

### Type Checking Operations

| Expression | Description |
|------------|-------------|
| `is.string` | Check if value is a string |
| `is.array` | Check if value is an array |
| `is.number` | Check if value is a number |
| `is.boolean` | Check if value is a boolean |
| `is.function` | Check if value is a function |
| `is.object` | Check if value is an object |
| `is.null` | Check if value is null |
| `is.undefined` | Check if value is undefined |
| `is.nan` | Check if value is NaN |
| `is.finite` | Check if value is finite |

### Function Operations (Require Arguments)

| Expression | Arguments | Description |
|------------|-----------|-------------|
| `equal({0})` | expected value | Check equality |
| `include({0})` | expected value | Check inclusion |
| `above({0})` | number | Check if greater than |
| `below({0})` | number | Check if less than |
| `least({0})` | number | Check if at least |
| `most({0})` | number | Check if at most |
| `within({0},{1})` | min, max | Check if within range |
| `instanceof({0})` | constructor | Check instance type |
| `typeOf({0})` | type string | Check typeof |
| `keys({0})` | expected keys | Check object keys |

## Combining Expressions

### Negation Patterns

```ts
// Simple negation
createExprAdapter("not.is.string")      // isNotString
createExprAdapter("not.is.array")       // isNotArray
createExprAdapter("not.to.exist")       // notExists

// Deep negation
createExprAdapter("not.deep.equal")     // notDeepEqual
createExprAdapter("not.strictly.equal") // notStrictEqual
```

### Modifier Patterns

```ts
// Deep operations
createExprAdapter("deep.equal")         // deepEqual
createExprAdapter("deep.include")       // deepInclude
createExprAdapter("deep.own.include")   // deepOwnInclude

// Own property operations
createExprAdapter("own.include")        // ownInclude
createExprAdapter("own.property")       // ownProperty

// Combined modifiers
createExprAdapter("not.deep.own.include") // notDeepOwnInclude
createExprAdapter("has.any.keys")         // hasAnyKeys
createExprAdapter("has.all.keys")         // hasAllKeys
createExprAdapter("has.any.deep.keys")    // hasAnyDeepKeys
```

## Examples in Practice

### Built-in Assert Functions Using Expressions

The tripwire assert class uses expressions internally:

```ts
// Type checking
isString: createExprAdapter("is.string"),
isNotString: createExprAdapter("not.is.string"),
isArray: createExprAdapter("is.array"),
isNotArray: createExprAdapter("not.is.array"),

// Existence
exists: createExprAdapter("to.exist"),
notExists: createExprAdapter("not.to.exist"),

// NaN/Finite
isNaN: createExprAdapter("is.nan"),
isNotNaN: createExprAdapter("not.is.nan"),
isFinite: createExprAdapter("is.finite"),
isNotFinite: createExprAdapter("not.is.finite"),

// Include operations
ownInclude: createExprAdapter("own.include"),
notOwnInclude: createExprAdapter("not.own.include"),
deepOwnInclude: createExprAdapter("deep.own.include"),
notDeepOwnInclude: createExprAdapter("not.deep.own.include"),

// Keys operations
hasAnyKeys: createExprAdapter("has.any.keys"),
hasAllKeys: createExprAdapter("has.all.keys"),
doesNotHaveAnyKeys: createExprAdapter("not.has.any.keys"),
hasAnyDeepKeys: createExprAdapter("has.any.deep.keys"),
```

### Custom Assertion Examples

#### String Validation Assertion

```ts
import { createExprAdapter, addAssertFunc, assert, IAssertScope } from '@nevware21/tripwire';

// Custom scope function to check string length
const hasMinLengthFunc = function(this: IAssertScope, minLength: number): any {
    const value = this.context.value;
    this.context.eval(
        typeof value === 'string' && value.length >= minLength,
        `expected {value} to have at least ${minLength} characters`
    );
    return this.that;
};

// Register positive and negative versions
addAssertFunc(assert, 'hasMinLength', { scopeFn: hasMinLengthFunc, nArgs: 2 });
addAssertFunc(assert, 'notHasMinLength', { 
    scopeFn: createExprAdapter("not", hasMinLengthFunc), 
    nArgs: 2 
});

// Usage
assert.hasMinLength("hello", 3);     // Passes
assert.notHasMinLength("hi", 5);     // Passes
assert.hasMinLength("ab", 5);        // Throws - "ab" has only 2 chars
```

#### Date Validation Assertion

```ts
const isAfterDateFunc = function(this: IAssertScope, date: Date): any {
    const value = this.context.value;
    this.context.eval(
        value instanceof Date && value > date,
        `expected {value} to be after ${date.toISOString()}`
    );
    return this.that;
};

addAssertFunc(assert, 'isAfter', { scopeFn: isAfterDateFunc, nArgs: 2 });
addAssertFunc(assert, 'isNotAfter', { 
    scopeFn: createExprAdapter("not", isAfterDateFunc), 
    nArgs: 2 
});

// Usage
const now = new Date();
const yesterday = new Date(Date.now() - 86400000);
assert.isAfter(now, yesterday);      // Passes
assert.isNotAfter(yesterday, now);   // Passes
```

### Calling Custom Instance Functions from Expressions

When you add functions using `addAssertInstFunc` or `addAssertInstFuncDefs`, those functions become
available in the assertion instance prototype and **can be called from expressions**. This is a powerful
pattern for creating reusable assertion building blocks.

#### Complete Example: Custom Validation Library

```ts
import { 
    addAssertInstFunc, 
    addAssertInstFuncDefs,
    createExprAdapter,
    addAssertFunc,
    assert,
    expect,
    IAssertScope,
    IAssertInst,
    IExtendedAssertInst
} from '@nevware21/tripwire';

// Step 1: Define custom assertion functions
const isPositive = function(this: IAssertScope): any {
    const value = this.context.value;
    this.context.eval(
        typeof value === 'number' && value > 0,
        "expected {value} to be a positive number"
    );
    return this.that;
};

const isEven = function(this: IAssertScope): any {
    const value = this.context.value;
    this.context.eval(
        typeof value === 'number' && value % 2 === 0,
        "expected {value} to be an even number"
    );
    return this.that;
};

const isInRange = function(this: IAssertScope, min: number, max: number): any {
    const value = this.context.value;
    this.context.eval(
        typeof value === 'number' && value >= min && value <= max,
        `expected {value} to be between ${min} and ${max}`
    );
    return this.that;
};

// Step 2: Add functions to the assertion instance prototype
// These will be available for expressions to call!
addAssertInstFuncDefs({
    isPositive: { scopeFn: isPositive },
    isEven: { scopeFn: isEven },
    isInRange: { scopeFn: isInRange }
});

// Step 3: Define TypeScript interface for type safety
interface IMyCustomAssertions {
    isPositive(): IAssertInst;
    isEven(): IAssertInst;
    isInRange(min: number, max: number): IAssertInst;
}

// Step 4: Create expressions that use the custom functions!
// These expressions call our custom instance functions
const isNotPositive = createExprAdapter("not.isPositive");
const isNotEven = createExprAdapter("not.isEven");
const isNotInRange = createExprAdapter("not.isInRange");

// The expression "not.isPositive" will:
// 1. Access .not (applies negation)
// 2. Call .isPositive() (our custom function)

// Step 5: Add convenience functions to assert object
addAssertFunc(assert, 'isPositive', isPositive);
addAssertFunc(assert, 'isNotPositive', { scopeFn: isNotPositive, nArgs: 1 });
addAssertFunc(assert, 'isEven', isEven);
addAssertFunc(assert, 'isNotEven', { scopeFn: isNotEven, nArgs: 1 });
addAssertFunc(assert, 'isInRange', { scopeFn: isInRange, nArgs: 3 });
addAssertFunc(assert, 'isNotInRange', { scopeFn: isNotInRange, nArgs: 3 });

// Usage via assert
assert.isPositive(5);           // Passes
assert.isNotPositive(-3);       // Passes (negated - negative is not positive)
assert.isEven(4);               // Passes
assert.isNotEven(3);            // Passes (negated - 3 is not even)
assert.isInRange(5, 1, 10);     // Passes
assert.isNotInRange(15, 1, 10); // Passes (negated - 15 is not in 1-10)

// Usage via expect with chaining
type MyExpect = IExtendedAssertInst<IMyCustomAssertions>;
(expect(5) as MyExpect).isPositive().isEven();  // Fails - 5 is not even
(expect(4) as MyExpect).isPositive().isEven();  // Passes - 4 is positive AND even
(expect(4) as MyExpect).not.isEven();           // Fails - 4 IS even
(expect(3) as MyExpect).not.isEven().isPositive(); // Passes - 3 is NOT even AND is positive
```

#### Creating Composable Assertion Chains

Custom instance functions enable powerful composable assertions:

```ts
import { addAssertInstFunc, createExprAdapter, expect, IAssertScope } from '@nevware21/tripwire';

// Add a custom "isPrime" function to the instance prototype
addAssertInstFunc("isPrime", function(this: IAssertScope) {
    const value = this.context.value;
    let isPrime = typeof value === 'number' && value > 1;
    if (isPrime) {
        for (let i = 2; i <= Math.sqrt(value); i++) {
            if (value % i === 0) {
                isPrime = false;
                break;
            }
        }
    }
    this.context.eval(isPrime, "expected {value} to be a prime number");
    return this.that;
});

// Now "isPrime" can be used in expressions!
// Create complex assertion adapters
const notPrimeAdapter = createExprAdapter("not.isPrime");

// Usage
expect(7).isPrime();      // Passes - 7 is prime
expect(4).not.isPrime();  // Passes - 4 is not prime
```

#### Expressions with Arguments to Custom Functions

Custom functions that take arguments can also be called from expressions:

```ts
import { addAssertInstFunc, createExprAdapter, expect, IAssertScope } from '@nevware21/tripwire';

// Custom function that takes an argument
addAssertInstFunc("isDivisibleBy", function(this: IAssertScope, divisor: number) {
    const value = this.context.value;
    this.context.eval(
        typeof value === 'number' && value % divisor === 0,
        `expected {value} to be divisible by ${divisor}`
    );
    return this.that;
});

// Create an expression adapter that calls the custom function with an argument
// {0} refers to the first argument passed to the adapter
const notDivisibleByAdapter = createExprAdapter("not.isDivisibleBy({0})");

// Usage
expect(10).isDivisibleBy(5);  // Passes
expect(10).isDivisibleBy(3);  // Fails

// Using the adapter
// notDivisibleByAdapter.call(scope, 3) -> expect(value).not.isDivisibleBy(3)
```

### Important Limitations

When using custom instance functions in expressions, there are some important limitations to be aware of:

#### Modifiers Cannot Precede Custom Functions (except `not`)

Custom functions added via `addAssertInstFunc` can only be called directly or after the `not` modifier. Modifiers like `deep`, `own`, and `strictly` do not support custom functions:

```ts
// ✅ Works: Direct call
createExprAdapter("myCustomFunc");

// ✅ Works: not modifier followed by custom function
createExprAdapter("not.myCustomFunc");

// ❌ Throws: deep modifier cannot be followed by custom function
createExprAdapter("deep.myCustomFunc");  // Invalid step: myCustomFunc

// ❌ Throws: own modifier cannot be followed by custom function  
createExprAdapter("own.myCustomFunc");   // Invalid step: myCustomFunc

// ❌ Throws: Combined modifiers don't work with custom functions
createExprAdapter("not.deep.myCustomFunc"); // Invalid step: myCustomFunc
```

This is because modifiers like `deep` and `own` return specialized interfaces (`IDeepOp`, `IOwnOp`) that only expose specific built-in operations, not the full assertion instance.

#### Workaround: Handle Modifiers Inside Custom Functions

If you need modifier behavior in custom functions, handle it within the function:

```ts
addAssertInstFunc("myDeepEqual", function(this: IAssertScope, expected: any) {
    // Manually set the deep flag and perform deep comparison
    this.context.set("$deep", true);
    // ... perform deep comparison logic
    return this.that;
});

// Now use directly without deep modifier
createExprAdapter("myDeepEqual");
```

#### Accessing Context Value in Custom Functions

The recommended way to access values in custom functions is through `this.context.value`:

```ts
addAssertInstFunc("isPositive", function(this: IAssertScope) {
    // Access the value directly from context
    const value = this.context.value;
    this.context.eval(
        typeof value === 'number' && value > 0,
        "expected {value} to be a positive number"
    );
    return this.that;
});
```

## Performance Considerations

### Expression Parsing

Expressions are parsed once when `createExprAdapter` is called, not on every invocation. This means:

```ts
// Good: Parse once, reuse many times
const adapter = createExprAdapter("deep.equal");
for (let i = 0; i < 1000; i++) {
    adapter.call(scope, expectedValue);
}

// The expression "deep.equal" is only parsed once
```

### The notAdapter Optimization

For simple "not" operations with a scope function, tripwire provides an optimized `createNotAdapter`:

```ts
import { createNotAdapter, createExprAdapter } from '@nevware21/tripwire';

// Optimized - no expression parsing overhead
const optimized = createNotAdapter(myScopeFn);

// Standard - parses "not" expression
const standard = createExprAdapter("not", myScopeFn);

// Both produce equivalent behavior, but createNotAdapter is slightly faster
```

Use `createNotAdapter` when you only need negation with a scope function.

## Error Handling

### Invalid Expression Errors

Invalid expressions throw `AssertionError` at adapter creation time:

```ts
// Invalid: nested parentheses
createExprAdapter("func((arg))")  // Throws AssertionError

// Invalid: mismatched parentheses
createExprAdapter("func(arg")     // Throws AssertionError

// Invalid: multiple argument sections
createExprAdapter("func()()")     // Throws AssertionError
```

### Step Resolution Errors

If a step doesn't exist on the assertion instance, an error is thrown at runtime:

```ts
const adapter = createExprAdapter("nonexistent.step");
// Runtime error: "Invalid step: nonexistent for [nonexistent->step]"
```

## TypeScript Support

The expression adapter provides full TypeScript support:

```ts
import { createExprAdapter, IScopeFn, IAssertScope } from '@nevware21/tripwire';

// Type-safe scope function
const typedScopeFn: IScopeFn = function<R>(this: IAssertScope, arg1: string, arg2: number): R {
    // Full type information available
    const value = this.context.value;
    this.context.eval(true, "assertion message");
    return this.that;
};

// Returns IScopeFn
const adapter: IScopeFn = createExprAdapter("not", typedScopeFn);
```

## See Also

- [API Documentation](https://nevware21.github.io/tripwire/typedoc/core/functions/createExprAdapter.html)
- [Change Assertions Guide](change-assertions.md)
- [Core Module README](../core/README.md)
- [addAssertFunc API](https://nevware21.github.io/tripwire/typedoc/core/functions/addAssertFunc.html)
