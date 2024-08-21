# Chai Shim

This module is a Shim of the Chai Js assertion library which uses the [tripwire](https://github.com/nevware21/tripwire)

This Shim is not designed to be a complete 1:1 replacement for Chai, it's primary focus is to provide a quicker migration option using your existing chai based `assert.*` functions.

As such the returned "error messages" do not and will not match the assertion text returned by `chai`, if your unit tests include validation of the returned error messages then they will need to be updated, it is recommended to use regular expressions to validate the returned error message when required.

As of the initial version not all functions are yet implemented

### Incomplete Shim implementation

- Several `assert` functions
  - Numeric Range, Nested assertions, property value, operator, instance
  - The unsupported assertions will return a AssertionFatal exception with text indicating that it's not implemented.

### Missing functionality

- `expect`
- `use`
- `should` (No plans to implement this)
- plugin support

## Table of Contents

- Installation
- Usage
- Scripts
- Contributing
- License

## Quickstart

Install the npm packare: `npm install @nevware21/tripwire-chai --save-dev`

> It is suggested / recommended that you use the following definition in your `package.json` so that you are compatible with any future releases as they become available
> we do not intend to make ANY known breaking changes moving forward until v2.x 
> ```json
> "@nevware21/tripwire-chai": ">= 0.1.0 < 2.x"
> ```

### Importing into Browsers

TBD. 

```html
<script src="./node_modules/@nevware21/tripwire-chai/bundle/es5/umd/tripwire-chai.min.js"></script>
```


## Usage

As a Shim and for all supported function and functionality, you should just need to change you `import` to reference this package instead of `chai`.

```typescript
import { assert } from "@nevware21/tripwire-chai";

// Example usage
assert.isObject([]);
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