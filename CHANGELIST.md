# v0.1.8 February 21st, 2026

## Performance Optimizations

This release focuses heavily on performance improvements across critical code paths, with optimizations to array operations, circular reference detection, property access patterns, and test execution.

- [#281](https://github.com/nevware21/tripwire/pull/281) perf: Implement critical performance optimizations for hot paths
  - Remove objDefine getters from hot path properties (opts, value, orgArgs)
  - Change property accessors from getter functions to direct assignments for faster access
  - Extract and export `_extractArgs()` for cleaner argument handling
  - Reorder formatters by probability (String, Object, Array first) to minimize checks
  - Add configurable prototype chain depth limiting (maxProtoDepth: 4) to prevent excessive traversal
  - Centralize formatting logic in format manager with convenience method
- [#279](https://github.com/nevware21/tripwire/pull/279) perf: Optimize array operations, string formatting, and property access patterns
  - Replace O(n²) splice operations with O(n) boolean array tracking in member comparison functions
  - Eliminate shift() usage by using index-based array access and arrSlice for argument handling
  - Replace string concatenation with array.join() pattern for error message building
  - Add deduplication logic using hash map for O(1) lookups in object key retrieval
  - Cache array.length and string.length values to avoid repeated property access
  - Move maxFormatDepth from IConfig to IFormatterOptions for better organization
  - Add maxProps option to IFormatterOptions to control formatting output size (default: 8 items/properties)
- [#277](https://github.com/nevware21/tripwire/pull/277) perf: Add max depth limits and optimize circular reference detection
  - Add configurable depth limits to prevent stack overflow and O(n²) degradation:
    - maxFormatDepth (default: 50): Limits formatting recursion depth
    - maxCompareDepth (default: 100): Limits deep equality comparison depth
    - maxCompareCheckDepth (default: 50): Limits circular reference check iterations
  - Refactor _deepEqual to require context parameter ensuring configuration flows through properly
  - Optimize circular reference detection by searching backwards through visited list for better cache locality
  - Respect maxCompareCheckDepth to prevent O(n²) behavior in deeply nested structures
  - Update _formatValue to respect maxFormatDepth limit and treat excessive nesting as circular references
- [#287](https://github.com/nevware21/tripwire/pull/287) perf: Fix worker test execution excessive delay
  - Switch worker tests to mocha + karma-typescript with adapter/runner flow and suite-aware reporting
  - Normalize browser/worker test globs and coverage exclusions to reduce noise
  - Add environment sanity tests for browser/node/worker environments
  - Update test scripts to remove rollup preprocessor usage and align dev deps

## Test Coverage Improvements

- [#278](https://github.com/nevware21/tripwire/pull/278) test: Add edge case tests for deepEqual and include operations
  - Comprehensive test coverage for special values (NaN, symbols, BigInt, 0/-0)
  - Complex structures (Map, Set, WeakMap, WeakSet, typed arrays)
  - Circular references and depth limits
  - Own vs inherited property handling
- [#279](https://github.com/nevware21/tripwire/pull/279) test: Add comprehensive formatter and deepEqual test suites
  - Add defaultFormatters.test.ts (370+ lines) covering Symbol, Date, Set, Map, Error, Function, RegExp formatters
  - Add extensive deepEqual.test.ts (560+ lines) covering deep comparison edge cases
  - Coverage increased from ~10% to 90.85% for formatters, ~45% to 89.03% for equal.ts

For full details see [v0.1.7...v0.1.8](https://github.com/nevware21/tripwire/compare/v0.1.7...v0.1.8)

# v0.1.7 February 13th, 2026

## Bug Fixes

- [#273](https://github.com/nevware21/tripwire/pull/273) Fix deepStrictEqual to perform deep value comparison
  - Changed `deepStrictEqual` to use deep value comparison instead of strict instance comparison
  - Now properly compares nested object values, arrays, and complex structures
  - Aligns behavior with Node.js assert.deepStrictEqual semantics
  - Maintains strict type checking while performing recursive value comparison

For full details see [v0.1.6...v0.1.7](https://github.com/nevware21/tripwire/compare/v0.1.6...v0.1.7)

# v0.1.6 February 7th, 2026

## Changelog

- [#262](https://github.com/nevware21/tripwire/pull/262) feat: Add Mocha Assertion Compatibility for updating actual, expected values
  - Make assertion error properties mutable, preserving their original values in new `orgValues` property when changed
  - Support "silent" readonly of immutable properties to avoid unexpected exceptions
  - Enables better compatibility with Mocha and other test frameworks that modify assertion error properties
- [#260](https://github.com/nevware21/tripwire/pull/260) build(deps-dev): Bump @microsoft/rush from 5.166.0 to 5.167.0 in the dev group
- [#258](https://github.com/nevware21/tripwire/pull/258) Bump @nevware21/ts-utils to 0.12.6

## Refactoring

- Added lint-fix as part of the rebuild process for code quality

For full details see [v0.1.5...v0.1.6](https://github.com/nevware21/tripwire/compare/v0.1.5...v0.1.6)

# v0.1.5 January 30th, 2026

## Breaking Changes

- [#253](https://github.com/nevware21/tripwire/pull/253) refactor: Centralized format manager with parent-child hierarchy
  - **BREAKING**: Formatter API completely restructured
  - `assertConfig.format.formatters` replaced with `assertConfig.$ops.formatMgr`
  - `assertConfig.reset()` → `assertConfig.$ops.reset()`
  - `assertConfig.clone()` → `assertConfig.$ops.clone()`
  - Import path changed: `assert/config` → `config/assertConfig`
  - `IFormatter`, `IRemovable` moved from `assert/interface/` to `interface/`
  - New formatter API methods: `addFormatter()`, `removeFormatter()`, `getFormatters()`, `forEach()`, `reset()`

  **Migration:**
  ```typescript
  // Before
  assertConfig.format.formatters = [myFormatter];
  assertConfig.reset();

  // After
  assertConfig.$ops.addFormatter(myFormatter);
  assertConfig.$ops.reset();
  ```

## New Features

- [#251](https://github.com/nevware21/tripwire/pull/251) perf(core): Add lazy initialization for assert class functions
  - Improves startup performance by deferring creation of ~100 assertion functions until first use
  - Add `expr` and `not` properties to IAssertClassDef for cleaner definition parsing
- [#250](https://github.com/nevware21/tripwire/pull/250) feat(core): Add optimized `createNotAdapter` for negation operations
  - New function wraps scope functions with "not" operation more efficiently than `createExprAdapter("not", scopeFn)`
  - Avoids expression parsing overhead by directly applying negation context
- [#249](https://github.com/nevware21/tripwire/pull/249) feat(chai-shim): Enable ownInclude, deepOwnInclude, and Map/Set keys assertions
  - Implement `own.include` operation for checking own properties only
  - Add `deep.own.include` for deep equality comparison of own properties
  - Enable tests for include, deepInclude, keys operations with Map/Set collections
- [#248](https://github.com/nevware21/tripwire/pull/248) feat: Add `ifError` assertion for Node.js error handling
  - Add `assert.ifError()` and `expect().to.ifError()` for Node.js-style callback error checking
  - Passes for falsy values, throws Error instances, fails for truthy non-Error values
- [#247](https://github.com/nevware21/tripwire/pull/247) feat: Implement deep keys assertions with ArrayLikeOrSizedIterable support
  - Add `hasAnyDeepKeys`, `hasAllDeepKeys`, and their negations
  - Keys parameter accepts Arrays, Sets, Maps, or any iterable collection
- [#242](https://github.com/nevware21/tripwire/pull/242) feat: Add `isNumber` and `isBoolean` assertion methods
- [#241](https://github.com/nevware21/tripwire/pull/241) feat: Add change/increase/decrease assertions with generic type support
- [#240](https://github.com/nevware21/tripwire/pull/240) feat: Implement `oneOf` assertion with ArrayLikeOrSizedIterable support
- [#239](https://github.com/nevware21/tripwire/pull/239) feat: Add `endsWith` and subsequence member comparison functions
- [#238](https://github.com/nevware21/tripwire/pull/238) feat: Add array member comparison assertions and deep equality support
- [#232](https://github.com/nevware21/tripwire/pull/232) feat: Add operator comparison function with typeof support
- [#231](https://github.com/nevware21/tripwire/pull/231) feat: Implement approximate equality assertions (`closeTo`/`approximately`)
- [#228](https://github.com/nevware21/tripwire/pull/228) feat(assertions): Implement `lengthOf`/`sizeOf` assertions
- [#227](https://github.com/nevware21/tripwire/pull/227) feat: Add nested property operations with Chai compatibility
- [#226](https://github.com/nevware21/tripwire/pull/226) feat: Add property value checking assertions with negation support
- [#225](https://github.com/nevware21/tripwire/pull/225) feat: Implement `exists`/`notExists` assertions
- [#224](https://github.com/nevware21/tripwire/pull/224) feat: Implement `instanceOf` assertion for type checking
- [#223](https://github.com/nevware21/tripwire/pull/223) feat: Add `typeOf` assertion support and enhance error handling
- [#219](https://github.com/nevware21/tripwire/pull/219) feat: Add `isFinite` assertion for finite number validation
- [#218](https://github.com/nevware21/tripwire/pull/218) feat: Add `isNaN` assertion support
- [#217](https://github.com/nevware21/tripwire/pull/217) feat: Add numeric comparison operations (`above`/`below`/`within`)

## Refactoring

- [#233](https://github.com/nevware21/tripwire/pull/233) refactor(core): Reorganize MsgSource type to dedicated type folder

## Documentation & Maintenance

- [#255](https://github.com/nevware21/tripwire/pull/255) docs: Add migration guide for migrating from Chai to Tripwire
- [#254](https://github.com/nevware21/tripwire/pull/254) chore(codecov): Add explicit slug property to upload
- [#243](https://github.com/nevware21/tripwire/pull/243) chore: Update docs site
- [#230](https://github.com/nevware21/tripwire/pull/230) docs(copyright): Update copyright headers for 2025 changes
- [#220](https://github.com/nevware21/tripwire/pull/220) chore: Add Node.js 22 and 24 support, limit codecov to node 22
- [#235](https://github.com/nevware21/tripwire/pull/235) build(deps-dev): Bump @microsoft/rush from 5.165.0 to 5.166.0

For full details see [v0.1.4...v0.1.5](https://github.com/nevware21/tripwire/compare/v0.1.4...v0.1.5)

# v0.1.4 January 3rd, 2026

## Changelog

- Fix TypeScript compilation errors in test files for stricter type checking
  - Fixed possibly undefined `error.stack` and `error.props` references with non-null assertions
  - Fixed `null` arguments in AssertionError constructors - use `undefined` instead
  - Fixed missing property initialization in test class constructors
  - Fixed missing required arguments in hasPropertyDescriptor test cases
  - All tests now compile cleanly with TypeScript ~5.2.2

For full details see [v0.1.3...v0.1.4](https://github.com/nevware21/tripwire/compare/v0.1.3...v0.1.4)

# v0.1.3 January 2nd, 2026

## Changelog

- [#186](https://github.com/nevware21/tripwire/pull/186) feat: Add finalize option for post-processing formatted output
  - Add new `finalize` and `finalizeFn` options to `IFormatterOptions` interface to control post-processing of formatted assertion error messages
  - When `finalize: true` is set without a custom `finalizeFn`, automatically uses `escapeAnsi` from @nevware21/chromacon to escape ANSI codes for display as literal characters
  - Finalization is applied once to the complete formatted output string in `_formatValue()` for consistent processing
  - Enables powerful use cases:
    - Escape ANSI codes for proper terminal display without interpreting color codes
    - Colorize escaped ANSI sequences (e.g., display in gray) for better readability
    - Convert output to HTML-safe format for web-based test runners and reports
    - Wrap or decorate formatted messages with custom styling or metadata
    - Apply any custom transformation to final assertion error output
  - Updated `assertConfig` defaults to include the new finalization options
  - Reduced karma worker log level from DEBUG to INFO for faster test startup times
- [#105](https://github.com/nevware21/tripwire/pull/105) Add WeakSet and WeakMap checks
  - Add support for WeakMap and WeakSet in equality comparison operations using strict equality checks
  - Add `isEmpty` validation for WeakMap and WeakSet collections
  - Note: WeakMap and WeakSet do not expose a size property, so emptiness cannot be determined directly - the implementation handles these special cases appropriately
  - Enables proper testing of code using ES6 weak collections

For full details see [v0.1.2...v0.1.3](https://github.com/nevware21/tripwire/compare/v0.1.2...v0.1.3)

# v0.1.2 March 31st, 2025

## Changelog

- [#16](https://github.com/nevware21/tripwire/pull/16) Update to ts-utils 0.11.4 
- [#17](https://github.com/nevware21/tripwire/pull/17) typedoc: Update auto-deploy job 
- [#18](https://github.com/nevware21/tripwire/pull/18) Update and rename .github/workflows/dependabot.yml to .github/dependaboy.yml 
- [#28](https://github.com/nevware21/tripwire/pull/28) Bump @microsoft/rush from 5.130.2 to 5.140.1 
- [#30](https://github.com/nevware21/tripwire/pull/30) Update codeql actions 
- [#24](https://github.com/nevware21/tripwire/pull/24) build(deps-dev): bump @types/sinon from 10.0.20 to 17.0.3 
- [#22](https://github.com/nevware21/tripwire/pull/22) build(deps): bump actions/configure-pages from 4 to 5 
- [#31](https://github.com/nevware21/tripwire/pull/31) build(deps): bump codecov/codecov-action from 2 to 5 
- [#32](https://github.com/nevware21/tripwire/pull/32) Update to use ts-build-tools instead of local 
- [#39](https://github.com/nevware21/tripwire/pull/39) Create FUNDING.yml 
- [#40](https://github.com/nevware21/tripwire/pull/40) Update FUNDING.yml 
- [#25](https://github.com/nevware21/tripwire/pull/25) build(deps-dev): bump @types/eslint from 8.56.12 to 9.6.1 
- [#55](https://github.com/nevware21/tripwire/pull/55) bump @microsoft/rush from 5.140.1 to 5.147.1 
- [#77](https://github.com/nevware21/tripwire/pull/77) Add IncludesOp value checks and includeMembers for chai shim
  - Add includes `value` checks
  - Add `includeMembers` for chai shim
  - bump @microsoft/rush from 5.147.1 to 5.151.0

# v0.1.1 Sept 20th, 2024

## Changelog

- [#9](https://github.com/nevware21/tripwire/issues/9) [Bug] Chai Shim for equals / notEquals is not the same
- [#8](https://github.com/nevware21/tripwire/pull/8) Revert: Fix code scanning alert #1: Shell command built from environment values (#4)
- [#12](https://github.com/nevware21/tripwire/pull/12) chore: Auto generate docs on push
- [#13](https://github.com/nevware21/tripwire/pull/13) chore: Update Readme.md to include badges and link to typedoc
- [#14](https://github.com/nevware21/tripwire/pull/14) chore: Remove generated typedoc docs from repo

# v0.1.0 Sept 20th, 2024

## Changelog

- [#7](https://github.com/nevware21/tripwire/pull/7) Extend default timeout for addAssertFunc tests
- [#5](https://github.com/nevware21/tripwire/pull/5) Add code coverage settings
- [#4](https://github.com/nevware21/tripwire/pull/4) Fix code scanning alert #1: Shell command built from environment values
- [#3](https://github.com/nevware21/tripwire/pull/3) chore: Fixup docs readme links
- [#2](https://github.com/nevware21/tripwire/pull/2) chore: Fix typedoc source reference and theme
- [#1](https://github.com/nevware21/tripwire/pull/1) Initial Prototype
