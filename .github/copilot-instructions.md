# GitHub Copilot Instructions for tripwire

## Project Overview

tripwire is a JavaScript/TypeScript test support utilities and assertion library. It provides assertion functions for testing and validating code in `node`, `browser`, and `worker` (browser) environments.

### Key Features
- Provides both `assert` and `expect` assertion APIs
- `assert` functions are built on top of the underlying `expect` support
- Designed to work across multiple runtime environments (node, browser, worker)
- Minimal external dependencies for broad compatibility
- Includes a Chai.js compatibility shim for easier migration

## Repository Structure

This is a Rush monorepo with the following main components:

- **`core/`** - Main tripwire assertion library (`@nevware21/tripwire`)
- **`shim/chai/`** - Chai.js compatibility shim (`@nevware21/tripwire-chai`)
- **`common/`** - Rush monorepo shared configuration
- **`docs/`** - Generated API documentation

### Build System
- Uses Microsoft Rush for monorepo management
- Grunt for task automation and TypeScript compilation
- Rollup for module bundling
- TypeDoc for API documentation generation

## Development Workflow

### Setup
```bash
npm install                    # Installs dependencies and runs rush update
rush rebuild                   # Full rebuild of all projects
```

### Building
```bash
npm run build                  # Build all projects
rush build                     # Alternative using rush directly
grunt tripwire                 # Build core module via grunt
```

### Testing
The project has comprehensive testing across three environments:
- **Node**: `npm run test:node` - Unit tests in Node.js environment
- **Browser**: `npm run test:browser` - Tests in headless Chrome via Karma
- **Worker**: `npm run test:worker` - Tests in browser web worker via Karma

Run all tests: `npm run test` or `rush test`

### Debugging
- **Browser**: `npm run debug:browser` - Opens Karma in Chrome for debugging
- **Worker**: `npm run debug:worker` - Opens Karma in Chrome for worker debugging

### Linting
```bash
npm run lint                   # Run ESLint across the codebase
grunt lint lint-fix            # Lint with auto-fix
```

## Code Style and Conventions

### TypeScript Configuration
- Primary target: **ES5** for broad compatibility
- Also builds ES6 versions for modern environments
- Uses TypeScript ~5.2.2
- Strict type checking disabled for flexibility

### ESLint Rules (see `.eslintrc`)
- **Indentation**: 4 spaces (enforced)
- **Quotes**: Double quotes (enforced)
- **Curly braces**: Required for control statements
- **Brace style**: Standard JavaScript style
- **Security**: Uses `eslint-plugin-security` for vulnerability checks
- **Trailing spaces**: Warned (skip blank lines)
- **Comma dangle**: Never allowed
- **var usage**: Allowed (for ES5 compatibility)
- **const preference**: Not enforced

### Copyright Headers
- **New files**: Use current year only (e.g., `Copyright (c) 2026 NevWare21 Solutions LLC`)
- **Edited files**: Use original year through current year (e.g., `Copyright (c) 2024-2026 NevWare21 Solutions LLC`)
- All source files must include the standard copyright header:
```typescript
/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) YYYY[-YYYY] NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */
```

### Coding Patterns
- Support for both ES5 and ES6+ runtimes
- Avoid ES6+ features in core implementation when targeting ES5
- Use `@nevware21/ts-utils` for cross-platform utilities
- No non-null assertions (`!` operator) - use proper null checks

### Versioning for New Features
- **@since tags**: Check `core/package.json` version before adding new features
- Current version in package.json is the **last published** version
- Use the **next minor version** for @since tags on new features
- Example: If package.json shows `0.1.4`, use `@since 0.1.5` for new features
- This follows semver: new features increment the minor version

## Testing Patterns

### Test Structure
- Tests are in `test/src/` directories within each module
- Use TypeScript for tests
- Tests run in multiple environments (node, browser, worker)
- Coverage reporting via Istanbul/nyc

### Assertion Examples
```typescript
import { assert, expect } from '@nevware21/tripwire';

// Assert style
assert.isObject([]); // throws
assert.equal(1, 1);  // passes

// Expect style
expect(() => { throw new Error(); }).to.throw();
expect(() => { doSomething(); }).to.not.throw();
```

## Dependencies

### Runtime Dependencies
- `@nevware21/ts-utils` - Core utility functions (>= 0.12.6 < 2.x)
- `@nevware21/ts-async` - Async utilities (>= 0.5.4 < 2.x)
- `tslib` - TypeScript runtime helpers

### Development Dependencies
- Microsoft Rush for monorepo management
- Grunt and Grunt plugins for build automation
- Karma for browser/worker testing
- Rollup for bundling
- TypeDoc for documentation
- Puppeteer for headless browser testing
- ts-mocha for Node.js testing
- ESLint with TypeScript support

## Important Notes for Contributors

1. **Minimal Dependencies**: Avoid adding new external dependencies unless absolutely necessary
2. **Cross-Environment Support**: All core functionality must work in node, browser, and worker
3. **ES5 Compatibility**: Maintain ES5 compatibility in the compiled output
4. **Rush Updates**: Run `rush update --recheck --purge --full` after dependency changes
5. **Documentation**: Update TypeDoc comments for API changes
6. **Testing**: Add tests for all new features in all three environments
7. **Coverage**: Maintain or improve code coverage metrics

## Common Tasks

### Adding New Assertions
1. Add implementation in `core/src/assert/` or `core/src/internal/`
2. Add TypeScript definitions
3. Add tests in `core/test/src/`
4. Update documentation with examples
5. Run full test suite across all environments

### Updating Dependencies
1. Modify `package.json` in the relevant module
2. Run `rush update --recheck --purge --full`
3. Run `npm install` at root
4. Test all environments to ensure compatibility

## Creating a Release PR

### Prepare Release Branch

1. **Work on current branch** - Make all changes on your current branch
2. **Do NOT commit changes** - Leave changes uncommitted so you can review them before creating the PR

### Version Management

#### Determine Version Number
Follow semantic versioning (semver) default release type is a patch unless requested otherwise:
- **Patch** (0.1.x → 0.1.y)
- **Minor** (0.x.0 → 0.y.0)
- **Major** (x.0.0 → y.0.0)

#### Update Version Numbers
Update `version` field in all repo package.json files:
- `core/package.json` - Main tripwire package
- `shim/chai/package.json` - Chai shim package
- Root `package.json` - Monorepo version (should match core)

### Update Changelog

Edit `CHANGELIST.md` at the repository root:

1. **Add version header** with date:
   ```markdown
   # v0.1.7 Month Day, Year
   ```

2. **Organize significant changes by category** (only include meaningful changes):
   - `## Breaking Changes` - Breaking API changes (if any)
   - `## New Features` - New functionality added
   - `## Bug Fixes` - Bug fixes and corrections
   - `## Refactoring` - Code improvements without behavior changes
   - `## Documentation & Maintenance` - Docs, dependencies, CI/CD changes

3. **Link to PRs** for each significant change:
   ```markdown
   - [#123](https://github.com/nevware21/tripwire/pull/123) feat: Description
   ```

4. **Add comparison link** at the end (this provides full details of every PR):
   ```markdown
   For full details see [v0.1.6...v0.1.7](https://github.com/nevware21/tripwire/compare/v0.1.6...v0.1.7)
   ```

   **Note**: Only include significant, meaningful changes in the categories above. The comparison link provides complete details of all PRs, so minor changes can be omitted from the summary.

### Build and Test

1. **Update npm shrinkwrap**:
   ```bash
   rush update --recheck
   ```
   This updates the `common/config/rush/npm-shrinkwrap.json` file to reflect current dependencies

2. **Review all changes** - Verify version numbers, changelog, and shrinkwrap updates before committing

3. **Clean build**:
   ```bash
   npm run cleanBuild
   ```
   This runs: `git clean -xdf && npm install && grunt lint-fix && rush rebuild`

4. **Run all tests**:
   ```bash
   npm run test
   ```
   Runs tests in all three environments (node, browser, worker)

5. **Verify build artifacts**:
   - Check that referenced files, entry points and types in each of the package.json files are present (for published packages; the root package.json is not published, even though it defines entry points and types)

## CI/CD

The project uses GitHub Actions for CI:
- Runs on Node.js versions 16, 18, 20, 22 and 24
- Builds all modules
- Runs full test suite (node, browser, worker)
- Uploads coverage to Codecov
- Performs CodeQL security analysis

## Documentation

- API docs are generated with TypeDoc
- Located at `https://nevware21.github.io/tripwire/index.html`
- Generated via `npm run docs`
- Automatically updated on releases

## Support and Resources

- **Repository**: https://github.com/nevware21/tripwire
- **Issues**: https://github.com/nevware21/tripwire/issues
- **Contributing**: See CONTRIBUTING.md
- **Code of Conduct**: See CODE_OF_CONDUCT.md
- **License**: MIT
