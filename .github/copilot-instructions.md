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

### Coding Patterns
- Support for both ES5 and ES6+ runtimes
- Avoid ES6+ features in core implementation when targeting ES5
- Use `@nevware21/ts-utils` for cross-platform utilities
- No non-null assertions (`!` operator) - use proper null checks

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
- `@nevware21/ts-utils` - Core utility functions (>= 0.12.3 < 2.x)
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

### Release Process
1. Run `npm run cleanBuild` - Full clean rebuild
2. Run `npm run npm-pack` - Create npm packages
3. Verify packages work correctly
4. Use `npm run npm-publish` for publishing

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
