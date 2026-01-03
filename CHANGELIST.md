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
