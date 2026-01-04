# Core Module

![GitHub Workflow Status (main)](https://img.shields.io/github/actions/workflow/status/nevware21/tripwire/ci.yml?branch=main)
[![codecov](https://codecov.io/gh/nevware21/tripwire/graph/badge.svg?token=I9mMGSvfkk)](https://codecov.io/gh/nevware21/tripwire)
[![npm version](https://badge.fury.io/js/%40nevware21%2Ftripwire.svg)](https://badge.fury.io/js/%40nevware21%2Ftripwire)
[![downloads](https://img.shields.io/npm/dt/%40nevware21/tripwire.svg)](https://www.npmjs.com/package/%40nevware21/tripwire)
[![downloads](https://img.shields.io/npm/dm/%40nevware21/tripwire.svg)](https://www.npmjs.com/package/%40nevware21/tripwire)

This is the core module of the `tripwire` project which is designed to be used for testing your Javascript or TypeScript packages.

It is designed to work in and is tested with the following environments.

- `node`
- `browser`
- `worker` (browser)

It currently provides `assertion` functions to make testing simplier and easier by providing common assertion checks that you can run against your code.

It provides both `assert` and `expect` support, where the `assert` functions are a set of fixed operations, which the `expect` is a more descriptive language API.

The `assert` functions are built on-top of the underlying `expect` support, and if no assertions are thrown the result of the internal "chained" descriptive language API is returned. Which means you can mix the `expect` objects with the responses from the `assert` functions.

To avoid dependency issues, this project will use the mininal set of external dependencies so that it can ensure and maintain compatibility with current (and future) runtimes.

## API Documentation

The API documentation is generated from the source code via typedoc and is located [here](https://nevware21.github.io/tripwire/index.html)

## Quick Start

Install the npm packare: `npm install @nevware21/tripwire --save-dev`

> It is suggested / recommended that you use the following definition in your `package.json` so that you are compatible with any future releases as they become available
> we do not intend to make ANY known breaking changes moving forward until v2.x 
> ```json
> "@nevware21/tripwire": ">= 0.1.4 < 2.x"
> ```

## Usage

To use the core functionalities, import the necessary modules and functions:

```ts
import { assert, expect } from '@nevware21/tripwire';

assert.isObject([]); // throws

expect(() => { dosomething(); }).to.not.throw();
expect(() => { throw new Error("failed")}).to.throw();
```

## API Documentation

The API documentation is generated from the source code via typedoc and is located [here](https://nevware21.github.io/tripwire/index.html)

## Browser Support

General support is currently set to ES5 supported runtimes and higher.

This module uses [@nevware21/ts-utils](https://github.com/nevware21/ts-utils) to provide some of it core functionality which includes internal polyfills to provide support on older browsers.

While every effort will be made to maintain as much technical compatibility as possible, some assertions and functionality will require later browsers to function correctly.

## Contributing

Read our primary [contributing guide](https://github.com/nevware21/tripwire/blob/main/CONTRIBUTING.md) to learn about our development process, how to propose bugfixes and improvements, and how to build and test your changes.

## License

This project is licensed under the MIT License. See the LICENSE file for details.