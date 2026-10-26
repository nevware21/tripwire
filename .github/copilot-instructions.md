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

- **`core/`** - Main tripwire assertion library and test suite/runner engine (`@nevware21/tripwire`)
- **`globals/`** - Opt-in ambient declarations + runtime installer for the bare `describe`/`it`/hook/`assert`/`expect` global names (`@nevware21/tripwire-globals`; re-publishes `@nevware21/tripwire/globals`, pinned to the exact matching core version). Hand-written `index.js`/`index.d.ts`; `build` is a `tsc --noEmit` check and `test` is that check plus a dependency-free runtime suite (`test/runtime/`) that exercises `index.js` in clean child processes
- **`shim/chai/`** - Chai.js compatibility shim (`@nevware21/tripwire-chai`)
- **`examples/`** - Example usage package (`@nevware21/tripwire-examples`)
- **`internal/runner/`** - The `tripwire` CLI test runner: arg parsing, targets, reporters, coverage (`@nevware21/tripwire-runner`, bundled into `core/bin/tripwire.js` at build time)
- **`internal/benchmark/`** - Internal, unpublished harness measuring the tripwire runner against mocha and karma over the `core` and `shim/chai` suites (`@nevware21/tripwire-benchmark`). The only place Karma and ts-mocha are configured; see `internal/benchmark/README.md`
- **`common/`** - Rush monorepo shared configuration
- **`docs/`** - Hand-written guides, published as the GitHub Pages site (TypeDoc API output is generated separately)

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
The project has comprehensive testing across three environments, all run by tripwire's own
CLI (`core/bin/tripwire.js`), not by Karma:
- **Node**: `npm run test:node` - Unit tests in Node.js environment
- **Browser**: `npm run test:browser` - Tests in headless Chrome via Puppeteer
- **Worker**: `npm run test:worker` - Tests in a browser Web Worker

Run all tests: `npm run test` or `rush test`

The legacy Karma/ts-mocha paths are **no longer in `core` or `shim/chai`**. The `*x` script
variants (`test:browserx`, `test:workerx`, `test:nodex`), the eight `karma.*.conf.js` files and
the six Karma/ts-mocha devDependencies were moved into the unpublished `internal/benchmark/`
package, which is the only place those runners are configured now. Do not reintroduce them into
a shipped package; add benchmark work to `internal/benchmark/` instead. See `internal/benchmark/README.md`.

Coverage is measured per package via `nyc` and uploaded to Codecov under three flags —
`core`, `chai_shim` and `runner`. Each package's `.nycrc` scopes to its own `src/**/*.ts`.

**Build ordering**: `core`'s tests execute `./bin/tripwire.js`, which is produced by
`runner`'s build. On a fresh clone, `cd core && npm test` fails until `runner` has been
built — run `rush build` (or `rush rebuild`) first.

### Debugging
- **Browser**: `npm run debug:browser` - Opens Chrome via the CLI for debugging
- **Worker**: `npm run debug:worker` - Opens Chrome via the CLI for worker debugging

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
- **No non-null assertions (`!` operator)** - enforced by ESLint's `@typescript-eslint/no-non-null-assertion`
  rule; using `!` anywhere (`foo!.bar`, `foo!`) fails lint even though it compiles, since `strict`/
  `strictNullChecks` are off in the build tsconfigs (so `tsc` itself usually won't flag a plain
  `possibly undefined` access there in the first place - only your editor's own, separately-configured
  TS server might, which is not the build's source of truth). In tests, this means it's almost always safe
  to just access a property directly after an `assert.isDefined(x)`/`assert.ok(x)` check, with no `!`
  needed - that's the existing pattern throughout `test/src/**`. If a real type guard is required (e.g. in
  `core/src`, or ambiguous test helper code), narrow explicitly instead:
  ```typescript
  const value = maybeGetValue();
  if (!value) {
      throw new Error("expected value");   // or `return;`/`continue;` as appropriate
  }
  value.someProp; // now narrowed, no `!` needed
  ```

### Mandatory Documentation Sync Rule (Copilot)

**A code change and its documentation are one change. A PR that changes behavior without
updating the documentation that describes that behavior is incomplete and must not be approved.**

This rule is mandatory for both *writing* changes and *reviewing* them. It exists because
documented facts in this repo are duplicated outside the code (flag tables, config field
tables, reporter name lists, a machine-readable JSON summary consumed by automated
migrations), and those copies have silently fallen behind the code before — shipping a
documented reporter list that the CLI rejected.

Whenever you change any of the following, update the listed documentation **in the same
change**, and say in the PR description which docs you touched and why:

| If you change… | You must also update |
|---|---|
| A CLI flag (added, renamed, removed, or its behavior) | `docs/test-runner.md` **both** tables, the `--help` usage text in `internal/runner/src/tripwire.ts`, and `docs/migration/migrating-from-mocha.md` §10's machine-readable JSON block |
| An `ITripwireConfig` field | `docs/test-runner.md` config field table, and `internal/runner/src/interfaces/ITripwireConfig.ts` doc comment |
| The reporter set (`REPORTER_NAMES`) | `docs/reporters.md`, `docs/test-runner.md`, and §10's `reporterNames` array |
| Runtime/execution semantics (async, timeouts, hooks, metrics) | `docs/test-execution-flow.md` |
| An error message or exit code a user can hit | `docs/runner-troubleshooting.md` (verbatim text) |
| An assertion API | TypeDoc comments, `core/src/suite/README.md` if it is a definition-API change, and the relevant `docs/` guide |
| Anything user-visible | `CHANGELIST.md` under the current unreleased version heading |

Some of these are enforced automatically — `internal/runner/test/src/docs/docDrift.test.ts` asserts the
machine-readable block still agrees with `REPORTER_NAMES`, that every flag it calls
unsupported is really rejected, and that every flag it calls supported is really accepted.
**Treat those tests as a floor, not a ceiling:** they cannot detect a prose paragraph that has
become untrue, which is most of the documentation.

### Mandatory Import / Export Rules (Copilot)
These rules are mandatory for Copilot-generated changes.

1. **Entrypoint-only re-exports**
- Do not re-export from sub-files.
- Re-export only from package entrypoints (for example: `src/index.ts`, `src/assets/runner-client.ts`, `src/assets/runner-worker.ts`).

2. **No alias exports or alias assignment exports**
- Do not use `export { X as Y }`.
- Do not create alias constants only for export shape, such as `const Y = X` followed by export.
- Export the original symbol names directly.

3. **No `import type` / `export type` syntax**
- Do not use TypeScript type-only import/export syntax.
- Use regular `import` / `export` declarations and keep symbol names unchanged.

4. **No `index` barrel path imports unless it is the real package entrypoint**
- Do not import from relative `./index` or `../index` just to reach symbols.
- Import from specific concrete files instead.

5. **Prefer concrete file references for internal symbols**
- Internal imports must target the actual defining file.
- Keep entrypoints responsible for outward-facing re-export surface.

### Versioning for New Features
- **@since tags**: Always use the **next unreleased version** for new features being added
- Check `core/package.json` version - this is the version **currently being developed**, not yet released
- For features added during development of version X.Y.Z, use `@since X.Y.Z` if unreleased, or `@since X.Y.(Z+1)` if X.Y.Z is already released
- **Key rule**: If the version in package.json is already in a release PR or tagged, increment to the next patch/minor version
- Example scenarios:
  - package.json shows `0.1.7` and you're working on release branch `0.1.7` → use `@since 0.1.8` for new features
  - package.json shows `0.1.7` and there's no release PR yet → use `@since 0.1.7` for new features
  - package.json shows `0.1.7` and main branch already has commits after 0.1.7 release → use `@since 0.1.8`
- This follows semver: new features should use the version they'll be released in

## Code Review Requirements (Copilot Code Review)

When reviewing a pull request in this repository, check the following in addition to
correctness. Each is a **blocking** comment when it fails.

### 1. Documentation kept in sync

Apply the mapping table in *Mandatory Documentation Sync Rule* above. Concretely, for every
diff you review:

- **Did any CLI flag change?** If `internal/runner/src/cli/parseArgs.ts` or
  `internal/runner/src/interfaces/IParsedArgs.ts` changed, `docs/test-runner.md`, the `--help` text in
  `internal/runner/src/tripwire.ts`, and §10 of `docs/migration/migrating-from-mocha.md` must change
  too. Flag it if they did not.
- **Did any config field change?** If `internal/runner/src/interfaces/ITripwireConfig.ts` changed,
  `docs/test-runner.md`'s config table must change too.
- **Did the reporter set change?** If `REPORTER_NAMES` in
  `internal/runner/src/reporters/createReporter.ts` changed, `docs/reporters.md`,
  `docs/test-runner.md` and §10's `reporterNames` must all change too.
- **Did user-visible behavior change?** `CHANGELIST.md` must have an entry under the current
  unreleased heading.
- **Did an error message change?** `docs/runner-troubleshooting.md` quotes error text
  verbatim; a changed message makes the entry wrong, not merely stale.

State explicitly in the review whether the documentation obligation was met. "No doc changes
needed" is an acceptable conclusion, but it must be a conclusion you reached deliberately and
said out loud — not silence.

### 2. Documentation accuracy, not just presence

A doc edit that is present but wrong is worse than one that is missing, because these guides
state exact error text, exit codes and flag names that readers copy. Verify claims against the
diff. Do not accept a documented behavior that the code does not implement.

### 3. Tests accompany behavior changes

New behavior needs tests in the owning package's `test/src/`. Note that:

- `core/` behavior must work in **node, browser and worker**.
- The "fact duplicated outside the code" guards — `internal/runner/test/src/docs/docDrift.test.ts`,
  `internal/runner/test/src/artifacts/binGuard.test.ts` and `docs/scripts/readme-links-check.js` —
  exist because each of those facts drifted once already. If a change makes one of them fail, the
  fix is almost always the source or the doc, not the guard.
- **Every README's links are checked**, by `npm run link-check` (or `npm run readme-link-check`,
  which generates the typedoc output first so `/typedoc/` links can be verified too). It runs in CI.
  It validates relative paths, `#anchors` against real headings, and
  `https://nevware21.github.io/tripwire/` URLs against the markdown they are published from — so
  moving a file or renaming a heading fails the build instead of leaving a dead link. If you move a
  project or a doc, run it.

### 4. Do not weaken a guard to make it pass

`binGuard.test.ts` asserts the shipped bundles require only node builtins and that their
source maps resolve to real `internal/runner/src/**.ts` files. `safeResolve.test.ts` asserts the
`--server-root` containment check. `readme-links-check.js` asserts every README link resolves.
Relaxing any of these to get a green build is a blocking change; each encodes a defect that
actually shipped.

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
- Rollup for bundling
- TypeDoc for documentation
- Puppeteer for headless browser/worker testing, driven by tripwire's own CLI
- nyc for coverage measurement (all three packages)
- ESLint with TypeScript support
- Karma and ts-mocha are **legacy**, declared only by the unpublished `internal/benchmark/` package, which
  exists to measure the tripwire runner against them. Its `build` runs `scripts/validate.js` (a fast
  path/config check, no suite); its `test` runs the **whole 12-arm benchmark**, so `rush test` — and
  therefore CI — does run it, and a failing arm fails the job

## Important Notes for Contributors

1. **Minimal Dependencies**: Avoid adding new external dependencies unless absolutely necessary
2. **Cross-Environment Support**: All core functionality must work in node, browser, and worker
3. **ES5 Compatibility**: Maintain ES5 compatibility in the compiled output
4. **Rush Updates**: Run `rush update --recheck --purge --full` after dependency changes
5. **Documentation**: Mandatory, and part of the same change — update TypeDoc comments for API
   changes **and** every hand-written guide the change affects. See *Mandatory Documentation
   Sync Rule* for the mapping and *Code Review Requirements* for what a reviewer must check.
6. **Testing**: Add tests for all new features in all three environments
7. **Coverage**: Maintain or improve code coverage metrics. All three packages are measured
   (`core`, `chai_shim`, `runner`); do not let a new file land with no test at all
8. **Never weaken a guard to get a green build**: the `docDrift` and `binGuard` suites encode
   defects that actually shipped. Fix the source or the doc instead

## Common Tasks

### Adding New Assertions
1. Add implementation in `core/src/assert/` or `core/src/internal/`
2. Add TypeScript definitions
3. Add tests in `core/test/src/`
4. Update documentation with examples
5. Add a `CHANGELIST.md` entry under the current unreleased heading
6. Run full test suite across all environments

### Adding or Changing a CLI Flag

This is the change type that has drifted most often, so the full list is spelled out. All of
it belongs in **one** change:

1. Parse it in `internal/runner/src/cli/parseArgs.ts` and add the field to
   `internal/runner/src/interfaces/IParsedArgs.ts`
2. If it is also settable from a config file, add it to
   `internal/runner/src/interfaces/ITripwireConfig.ts` with a doc comment and an `@since` tag
3. Add it to the `--help` usage text in `internal/runner/src/tripwire.ts`
4. Add it to **both** tables in `docs/test-runner.md` (the CLI flag table and, if applicable,
   the config field table)
5. Add it to §10's machine-readable JSON block in `docs/migration/migrating-from-mocha.md` —
   `flagsUnchanged`, `flagsUnsupported` or the relevant `typescript.*Flag` key. `docDrift.test.ts`
   will fail if a flag listed as unsupported is now accepted, or vice versa
6. If it has a Mocha equivalent, add the mapping row to the migration guide's flag table
7. If misusing it produces a distinctive error, add a `docs/runner-troubleshooting.md` entry
   with the **verbatim** message
8. Add parse tests to `internal/runner/test/src/cli/parseArgs.test.ts`
9. Add a `CHANGELIST.md` entry
10. Verify with the built CLI: `node ./core/bin/tripwire.js --help`

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
Follow semantic versioning (semver). The default release type is a patch unless requested otherwise:
- **Patch** (0.1.x → 0.1.y)
- **Minor** (0.x.0 → 0.y.0)
- **Major** (x.0.0 → y.0.0)

#### Update Version Numbers
Update the `version` field in all seven repo package.json files:
- Root `package.json` - Monorepo version (should match core)
- `core/package.json` - Main tripwire package
- `globals/package.json` - Globals package
- `shim/chai/package.json` - Chai shim package
- `internal/runner/package.json` - Runner (unpublished)
- `internal/benchmark/package.json` - Benchmark harness (unpublished)
- `examples/package.json` - Examples (unpublished)

These pin `@nevware21/tripwire` to the exact version, so bump the pin with the version:
`globals`, `shim/chai`, `examples`, `internal/runner` and `internal/benchmark` (which also pins
`@nevware21/tripwire-runner`).

### Update README version ranges

Update the recommended version range to reflect the new version:

```markdown
> ```json
> "@nevware21/tripwire": ">= 0.1.7 < 2.x"
> ```
```

It appears in each of these files; update every one:
- `README.md`
- `core/README.md`
- `shim/chai/README.md`
- `docs/README.md`
- `docs/migration/migrating-from-node-assert.md`

### Update Changelog

Edit `CHANGELIST.md` at the repository root:

1. **Add version header** with date:
   ```markdown
   # v0.1.7 Month Day, Year
   ```

2. **Preserve any existing unreleased entries** - If the CHANGELIST.md contains entries that are listed under an "Unreleased" section or similar heading, include them **as-is** in the new version section. Do NOT remove, reduce, or consolidate them into a shortened summary.

3. **Organize significant changes by category** (only include meaningful changes):
   - `## Breaking Changes` - Breaking API changes (if any)
   - `## New Features` - New functionality added
   - `## Bug Fixes` - Bug fixes and corrections
   - `## Refactoring` - Code improvements without behavior changes
   - `## Documentation & Maintenance` - Docs, dependencies, CI/CD changes

4. **Link to PRs** for each significant change:
   ```markdown
   - [#123](https://github.com/nevware21/tripwire/pull/123) feat: Description
   ```

5. **Add comparison link** at the end (this provides full details of every PR):
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

2. **Review all changes** - Verify version numbers, changelog, README.md version ranges, and shrinkwrap updates before committing

3. **Commit with the required message format**:
   ```bash
   git commit -m "[Release] Increase version to 0.1.8"
   ```
   All release commits **must** use the subject format `[Release] Increase version to <version>`.

4. **Clean build**:
   ```bash
   npm run cleanBuild
   ```
   This runs: `git clean -xdf && npm install && grunt lint-fix && rush rebuild`, then
   `npm run readme-link-check` to regenerate the typedoc output and validate every README's links.

5. **Run all tests**:
   ```bash
   npm run test
   ```
   Runs tests in all three environments (node, browser, worker)

6. **Verify build artifacts**:
   - Check that referenced files, entry points and types in each of the package.json files are present (for published packages; the root package.json is not published, even though it defines entry points and types)

## CI/CD

The project uses GitHub Actions for CI:
- Runs on Node.js versions 18, 20, 22 and 24
- Builds all modules
- Runs full test suite (node, browser, worker)
- Uploads coverage to Codecov
- Performs CodeQL security analysis

## Documentation

- API docs are generated with TypeDoc
- Located at `https://nevware21.github.io/tripwire/index.html`
- Generated via `npm run docs`
- Automatically updated on releases

### Documentation map

Hand-written guides live in `docs/` and are served as the GitHub Pages site (so a `docs/x.md`
page is `https://nevware21.github.io/tripwire/x.html`). When answering a question, or when a
change affects behavior documented below, update the matching file:

| File | Owns |
|---|---|
| `docs/test-runner.md` | The `tripwire` CLI: every flag, `.tripwirerc` config fields, reporters, coverage, hook failures. **Any new CLI flag or config field must be added to both of its tables.** |
| `docs/test-execution-flow.md` | Runtime semantics: sync/async execution, promise creation, timeouts, hook failure handling, runner metrics |
| `docs/migration/migrating-from-mocha.md` | Mocha/`ts-mocha` → tripwire runner mapping. Sections 9 (checklist) and 10 (JSON summary) are written for automated migrations -- keep them in sync with the tables above them |
| `docs/runner-troubleshooting.md` | Known issues with verbatim error text and verified fixes (eg. opting in to the global names via `@nevware21/tripwire/globals`, and the `@types/mocha`/`@types/jest`/`@types/jasmine` duplicate-global TS2403/TS6200 clash that opting in alongside them produces) |
| `docs/reporters.md` | Every built-in reporter: what each one emits, sample output, and the custom-reporter story. **Owns the reporter set alongside `REPORTER_NAMES`** |
| `docs/migration/migrating-from-chai.md`, `docs/migration/migrating-from-node-assert.md` | Assertion-level migration |
| `core/src/suite/README.md` | The `describe`/`it`/hook definition API, filters, deterministic IDs |
| `docs/change-assertions.md`, `docs/expression-adapter.md` | Specific assertion features |

Rules for docs changes:

- **Documentation is part of the change, not a follow-up.** See *Mandatory Documentation Sync
  Rule* above for the change-to-doc mapping. Never land a behavior change and leave its
  documentation for later — there is no later, and the copies do not self-correct.
- Verify claims against the code (or by running the CLI) before documenting them -- these guides
  state exact error text and exit codes, so guessed behavior is worse than no entry.
- Documented behavior must match `--help`; the usage text in `internal/runner/src/tripwire.ts` and
  `docs/test-runner.md` are updated together.
- Cross-link rather than duplicate: each fact should have one owning file from the table above.
- **A fact that must be duplicated outside the code needs a guard.** `docs/migration/migrating-from-mocha.md`
  §10 is machine-readable and is pinned by `internal/runner/test/src/docs/docDrift.test.ts`; the shipped
  `bin` bundles are pinned by `internal/runner/test/src/artifacts/binGuard.test.ts`. If you add another
  duplicated fact list, add the assertion that keeps it honest at the same time.
- When you change a documented flag or field, grep the whole `docs/` tree for its name before
  finishing. The tables are not the only place a flag is mentioned.

## Support and Resources

- **Repository**: https://github.com/nevware21/tripwire
- **Issues**: https://github.com/nevware21/tripwire/issues
- **Contributing**: See CONTRIBUTING.md
- **Code of Conduct**: See CODE_OF_CONDUCT.md
- **License**: MIT
