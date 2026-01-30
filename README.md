<h1 align="center">@nevware21/tripwire</h1>
<h2 align="center">JavaScript/TypeScript Test support utilities and assertion library</h2>

![GitHub Workflow Status (main)](https://img.shields.io/github/actions/workflow/status/nevware21/tripwire/ci.yml?branch=main)
[![codecov](https://codecov.io/gh/nevware21/tripwire/graph/badge.svg?token=I9mMGSvfkk)](https://codecov.io/gh/nevware21/tripwire)
[![npm version](https://badge.fury.io/js/%40nevware21%2Ftripwire.svg)](https://badge.fury.io/js/%40nevware21%2Ftripwire)
[![downloads](https://img.shields.io/npm/dt/%40nevware21/tripwire.svg)](https://www.npmjs.com/package/%40nevware21/tripwire)
[![downloads](https://img.shields.io/npm/dm/%40nevware21/tripwire.svg)](https://www.npmjs.com/package/%40nevware21/tripwire)

# Description

Tripwire is a set of Testing support utilities, it is designed to be used for testing and validating you JavaScript or TypeScript package, whether they are designed to work in `node`, `browser` or `worker` (browser) environments. This mono-repo itself it tested and validated in all 3 environments.

It currently provides `assertion` functions to make testing simplier and easier by providing common assertion checks that you can run against your code.

It provides both `assert` and `expect` support, where the `assert` functions are a set of fixed operations, which the `expect` is a more descriptive language API.

The `assert` functions are built on-top of the underlying `expect` support, and if no assertions are thrown the result of the internal "chained" descriptive language API is returned. Which means you can mix the `expect` objects with the responses from the `assert` functions.

To avoid dependency issues, this project will use the mininal set of external dependencies so that it can ensure and maintain compatibility with current (and future) runtimes.

As part of the Mono-Repo it also provides some shim implementations which are designed to be a drop in replacement for your basic usages of older frameworks which might no longer be working for you due to dependency or runtime issues. Which is exactly how and why this library cam into existence as with the moving environment of dependency updates causing some our the other projects to grind to a halt due to breakages caused by other frameworks that where not fixed, specifically for testing in a Worker environment.

## Key Features

### Comprehensive Assertion Library
- **Type checking** - object, array, string, number, boolean, null, undefined, NaN, finite, typeof, instanceof
- **Equality assertions** - equal, strictEqual, deepEqual, closeTo (approximate equality)
- **Property checking** - property, ownProperty, deepProperty, nestedProperty with value validation
- **Collection operations** - include, keys, members with deep equality and ordered comparison support
- **Numeric comparisons** - above, below, within, atLeast, atMost with full range validation
- **Value changes** - track changes, increases, decreases over function execution with delta validation
- **Array operations** - member comparison with subsequence, endsWith, and oneOf matching
- **Error/exception testing** - comprehensive throw/catch with error type and message validation
- **Custom error messages** - all assertions support optional custom messages
- **Full negation support** - consistent `not` operator across all assertion types

## Documentation

**Main Documentation Site**: [https://nevware21.github.io/tripwire](https://nevware21.github.io/tripwire)

The documentation site includes:
- Quick start guides and usage examples
- Feature highlights and comparison tables
- Migration guides (e.g., from Chai.js)
- Detailed guides for specific features (like change/increase/decrease assertions)
- [Expression Adapter Guide](https://nevware21.github.io/tripwire/expression-adapter.html) - Creating custom assertions using expressions
- Links to full TypeDoc API reference for each module

**API Reference (TypeDoc)**:
- [Core Module API](https://nevware21.github.io/tripwire/typedoc/core/index.html)
- [Chai Shim API](https://nevware21.github.io/tripwire/typedoc/shim/chai/index.html)

## Quick Start

Install the npm package: `npm install @nevware21/tripwire --save-dev`

> Recommended: Use the following definition in your `package.json` to stay compatible with future releases.
> We do not intend to make runtime / environment breaking changes until at least v2.x
> ```json
> "@nevware21/tripwire": ">= 0.1.5 < 2.x"
> ```

## Usage

To use the core functionalities, import the necessary modules and functions:

```ts
import { assert, expect } from '@nevware21/tripwire';

assert.isObject([]); // throws

expect(() => { dosomething(); }).to.not.throw();
expect(() => { throw new Error("failed")}).to.throw();
```

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