# Runner Troubleshooting & Known Issues

Problems you are most likely to hit when adopting the Tripwire test runner, each with the exact
symptom, the cause, and the fix. Written for both human readers and AI-assisted fixes -- every
entry states the error text verbatim so it can be matched against build output.

- [Cannot find name 'describe'](#cannot-find-name-describe) (opting in to the global names)
- [TypeScript: duplicate global declarations](#typescript-duplicate-global-declarations)
  (`@types/mocha`, `@types/jest`, `@types/jasmine`)
  - [After the fix, jest matchers stop type-checking](#after-the-fix-jest-matchers-stop-type-checking)
- [ReferenceError: describe is not defined](#referenceerror-describe-is-not-defined)
- [`Unsupported option: --x`](#unsupported-option---x)
- [`No tests were executed`](#no-tests-were-executed)
- [A failing `before`/`after` hook did not fail the build](#a-failing-beforeafter-hook-did-not-fail-the-build)
- [`--type-check` passes, but a test with a type error still ran](#--type-check-passes-but-a-test-with-a-type-error-still-ran)
- [Type errors are being reported when I did not ask for them](#type-errors-are-being-reported-when-i-did-not-ask-for-them)
- [An error printed a wall of `at yo (tripwire.js:2:143518)`](#an-error-printed-a-wall-of-at-yo-tripwirejs2143518)
- [Another framework's globals win at runtime](#another-frameworks-globals-win-at-runtime)
- [A custom reporter was rejected or ignored](#a-custom-reporter-was-rejected-or-ignored)
- [Related guides](#related-guides)

---

## Cannot find name 'describe'

**Symptom** -- the test files use the bare `describe`/`it`/`assert`/`expect` names and the runner
executes them happily, but TypeScript does not know the names exist:

```
src/some.test.ts(1,1): error TS2593: Cannot find name 'describe'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha` and then add 'jest' or 'mocha' to the types field in your tsconfig.
src/some.test.ts(2,5): error TS2304: Cannot find name 'assert'.
```

**Cause** -- by design. Importing `@nevware21/tripwire` declares **no** ambient globals, because
`@types/mocha`, `@types/jest` and `@types/jasmine` declare the same names with their own types and
TypeScript merges every ambient declaration in a program. Keeping the main entry clean is what
lets tripwire be installed into a project that still uses one of those without breaking its build.
The global *names* are opt-in; ignore the compiler's suggestion to install `@types/mocha`.

**Fix** -- opt in, in whichever of these forms suits the project:

1. **tsconfig `types`** -- covers the whole program, no import in any file:

   ```jsonc
   // tsconfig.json (or test/tsconfig.test.json)
   {
       "compilerOptions": {
           "types": ["node", "@nevware21/tripwire/globals"]
       }
   }
   ```

   Remember that `types` is an allow-list: once present, only the listed packages load, so keep
   `"node"` (and anything else the project relies on) in the list.

2. **A `/// <reference>`** in any single file of the program -- useful when the tsconfig is
   generated or shared and you would rather not edit it:

   ```ts
   /// <reference types="@nevware21/tripwire/globals" />
   ```

   > **Under `ts-node`/`ts-mocha`, put it in a file your tests actually import.** Those tools
   > type-check the module graph reachable from the entry files rather than the tsconfig's
   > `include`, so a reference sitting in a file nothing imports is never loaded and the names
   > stay undeclared -- while `tsc` on the same project passes, because it checks the whole
   > `include`. `TS_NODE_FILES=true` makes ts-node honour `include` and is the other way out.
   > Option 1 and option 4 are unaffected: `types` is a compiler option, not a file, so it
   > applies either way.

3. **A side-effect import**, which also installs the names onto `globalThis` at runtime -- the
   form to use when the file is run by something other than the `tripwire` CLI:

   ```ts
   import "@nevware21/tripwire/globals";
   ```

4. **The `@nevware21/tripwire-globals` package**, if you would rather express the opt-in as a
   dependency. It re-publishes the same entry and is versioned in lockstep with tripwire:

   ```bash
   npm install --save-dev @nevware21/tripwire-globals
   ```

   ```jsonc
   { "compilerOptions": { "types": ["@nevware21/tripwire-globals"] } }
   ```

   A dependency alone is not enough -- TypeScript only auto-includes packages under
   `node_modules/@types` -- so it still needs one of the three forms above, just with the shorter
   name.

**Or do not opt in at all.** Every global name is exported by the package, and an explicit import
both type-checks anywhere and takes precedence over whatever is on `global` at runtime:

```ts
import { describe, it, assert, expect } from "@nevware21/tripwire";
```

This is the only form that is guaranteed never to collide with another framework's types, so it
is the right choice for a project that still has mocha, jest or jasmine in play, and for any file
that has to work under both runners.

Under the `tripwire` CLI the globals are always present at runtime -- the runner installs them
before loading any test file -- so for CLI-only projects the opt-in is purely about type-checking.

---

## TypeScript: duplicate global declarations

Applies to **`@types/mocha`, `@types/jest` and `@types/jasmine`** alike -- each declares the same
global test names tripwire's opt-in globals entry does. The error text differs by package; all
three are the same problem with the same fixes.

This only happens if the project opts in to
[tripwire's global names](#cannot-find-name-describe) while one of those packages is still in the
program. Importing `@nevware21/tripwire` on its own never declares a global and never produces
these errors.

**Symptom (`@types/mocha`, `@types/jest`)** -- the project stops compiling, with errors pointing
*inside* tripwire's globals declaration file:

```
node_modules/@nevware21/tripwire/dist/types/globals.d.ts(17,9): error TS2403: Subsequent variable declarations must have the same type.  Variable 'describe' must be of type 'SuiteFunction', but here has type 'ISuiteDefinitionFn'.
node_modules/@nevware21/tripwire/dist/types/globals.d.ts(21,9): error TS2403: Subsequent variable declarations must have the same type.  Variable 'it' must be of type 'TestFunction', but here has type 'ITestDefinitionFn'.
node_modules/@nevware21/tripwire/dist/types/globals.d.ts(26,9): error TS2403: Subsequent variable declarations must have the same type.  Variable 'before' must be of type 'HookFunction', but here has type 'IHookDefinitionFn'.
```

**Symptom (`@types/jasmine`)** -- a different code, reported once against each file, because
jasmine declares its globals as `function`s rather than `var`s:

```
node_modules/@types/jasmine/index.d.ts(1,1): error TS6200: Definitions of the following identifiers conflict with those in another file: describe, xdescribe, fdescribe, it, xit, fit, beforeAll, beforeEach, afterAll, afterEach
node_modules/@nevware21/tripwire/dist/types/globals.d.ts(14,1): error TS6200: Definitions of the following identifiers conflict with those in another file: describe, xdescribe, fdescribe, it, xit, fit, beforeAll, beforeEach, afterAll, afterEach
```

**Cause** -- the runner installs `describe`, `it`, the hooks, `assert` and `expect` as real
globals, and the opt-in entry declares them ambiently so test files can type-check against them.
`@types/mocha`, `@types/jest` and `@types/jasmine` declare *the same* global names with *their*
types. TypeScript merges every ambient declaration in the program, and two declarations of the
same global that disagree is an error.

How much overlaps depends on the package:

| Package | Globals that clash with tripwire |
|---|---|
| `@types/mocha` | `describe`, `it`, `before`, `beforeEach`, `after`, `afterEach` (6) |
| `@types/jasmine` | `describe`, `fdescribe`, `xdescribe`, `it`, `fit`, `xit`, `beforeAll`, `beforeEach`, `afterAll`, `afterEach` (10) |
| `@types/jest` | the jasmine set plus `test` and **`expect`** (12) |

`@types/jest` is the worst case because of `expect`: jest's `expect(x).toBe(y)` and tripwire's
`expect(value, msg?, config?)` are entirely different APIs, so resolving the ambient clash also
changes what `expect` means in every already-typed test file -- see
[After the fix, jest matchers stop type-checking](#after-the-fix-jest-matchers-stop-type-checking).

Note that `@types/*` packages are picked up **automatically** from `node_modules/@types`, so the
conflict appears even if nothing in your code imports mocha/jest/jasmine.

**Fix, in order of preference:**

1. **Do not opt in -- import the names instead.** This is the option that exists precisely so two
   frameworks can share a project, and it needs no build configuration:

   ```ts
   import { describe, it, assert, expect } from "@nevware21/tripwire";
   ```

   Drop `"@nevware21/tripwire/globals"` from `types` (or the `/// <reference>`, or the
   `@nevware21/tripwire-globals` dependency), and add the import to each tripwire test file. The
   runner still installs the globals at runtime; the import simply shadows them with the same
   functions.

2. **Remove the other framework's types** once the migration is complete -- the cleanest outcome
   if the project is leaving mocha/jest/jasmine behind entirely:

   ```bash
   npm uninstall @types/mocha     # or @types/jest, @types/jasmine
   ```

3. **Scope the auto-included types** for the project (or just its test project) so the other
   package is not pulled in. `types` is an allow-list: when present, *only* the listed packages
   load.

   ```jsonc
   // tsconfig.json (or test/tsconfig.test.json)
   {
       "compilerOptions": {
           "types": ["node", "@nevware21/tripwire/globals"]
       }
   }
   ```

   Use this while both runners are still in play -- for example a `tsconfig.jest.json` that keeps
   `"types": ["jest"]` for the not-yet-migrated suites, and the tripwire tsconfig listing
   `"@nevware21/tripwire/globals"`.

4. **`skipLibCheck: true`** suppresses it, because both errors are reported inside `.d.ts` files:

   ```jsonc
   {
       "compilerOptions": {
           "skipLibCheck": true
       }
   }
   ```

   This is the least targeted option -- it silences declaration-file errors project-wide -- and it
   leaves the program with two disagreeing declarations of each name, so whichever one TypeScript
   picks may not be the framework you meant. It does **not** fix errors in your own test files, so
   jest suites still need
   [the `expect` migration below](#after-the-fix-jest-matchers-stop-type-checking).

All four were verified against `typescript@5.2` with `@types/mocha`- and `@types/jasmine`-shaped
global declarations present: each produces a clean compile (option 4 clears TS2403 and TS6200
alike), as does importing `@nevware21/tripwire` with either `@types` package installed and no
opt-in.

### After the fix, jest matchers stop type-checking

Specific to `@types/jest`, and only once jest's types are gone (options 2 and 3 above) so that the
global `expect` is tripwire's. Jest's matcher chain no longer exists:

```
src/some.test.ts(5,19): error TS2339: Property 'toBe' does not exist on type 'IAssertInst'.
```

This is the ambient clash surfacing as real work: the two `expect` APIs are unrelated, so the
assertions themselves have to be migrated (`expect(x).toBe(y)` → `expect(x).equals(y)`, and so
on). See the [Chai migration guide](migration/migrating-from-chai.md) for tripwire's `expect`
vocabulary, or use `assert.equal(x, y)` if you prefer the assert style.

Three ways to stage it:

- **Do not opt in to tripwire's globals** (option 1 above) while the migration is in progress.
  `expect` keeps meaning jest's in every un-migrated file, and migrated files import tripwire's
  explicitly -- the two can coexist indefinitely, file by file.
- **Keep jest's types for the un-migrated suites** using option 3 above (a separate tsconfig per
  suite set), and migrate a suite at a time.
- **Import explicitly** in migrated files -- `import { expect } from "@nevware21/tripwire";` --
  which shadows the global regardless of which `@types` package is loaded.

`@jest/globals`-style suites (`import { describe, it, expect } from "@jest/globals"`) do not
declare ambient globals at all, so they never hit the clash in section 1 -- but their `expect`
still has to be migrated the same way.

---

## ReferenceError: describe is not defined

Covers `describe`, `it`, the hooks, `assert`/`expect`, and the Mocha-only `context`/`specify`
names.

**Symptom:**

```
Error: Failed to load '<path>/some.test.js'
ReferenceError: describe is not defined
```

**Causes and fixes:**

| Situation | Fix |
|---|---|
| The file was run directly (`node some.test.js`, or by another runner) | The runner installs the globals, so they only exist inside a `tripwire` run. Either run it with the CLI, or `import { describe, it } from "@nevware21/tripwire"` in the file. A side-effect `import "@nevware21/tripwire/globals"` installs the bare names instead, if the file must keep using them |
| The name is `context`, `specify`, `xcontext` or `xspecify` | These Mocha aliases do not exist in tripwire. Rename to `describe`, `it`, `xdescribe`, `xit` |
| The call is in a `--file`/`--require` preload | Preloads run **before** the globals are installed and before the root suite exists -- they cannot define suites or hooks. Move the code into a test file matched by the run's glob (a top-level hook there applies to the whole run) |

---

## `Unsupported option: --x`

**Symptom** -- the run stops immediately and prints the usage:

```
Unsupported option: --parallel
tripwire [options] <glob...>
```

**Cause** -- tripwire rejects any unrecognized `-`/`--` argument rather than ignoring it, so a
flag left over from another runner can never silently do nothing.

**Fix** -- map or drop the flag. See the
[Mocha flag mapping](migration/migrating-from-mocha.md#4-cli-flag-mapping) and the
[full CLI reference](test-runner.md#cli-reference). Note that a bare `--` is not a passthrough
separator: everything after it is treated as an additional file pattern.

---

## `No tests were executed`

**Symptom** -- files were matched and loaded, but:

```
Run summary: total=0 passed=0 failed=0 skipped=0 pending=0 duration=0ms
No tests were executed. Verify imports resolve to the same tripwire runtime and that your files register tests.
```

The run exits non-zero.

**Causes:**

1. **The glob matched non-test files** (or matched nothing that calls `describe`/`it`). Re-run
   with `--show-files` to print exactly what was matched.
2. **Two copies of the tripwire runtime.** If a test file resolves `@nevware21/tripwire` to a
   different copy than the runner loaded (a duplicated `node_modules` entry, a symlinked/`file:`
   dependency, a monorepo package that bundles its own), the suites register on that copy's suite
   state and the runner sees an empty root suite. Deduplicate the dependency so both resolve to
   one installation.
3. **All tests were filtered out** by `--grep`/`--fgrep`/`--ignore`, or by a `.only` elsewhere in
   the suite.

---

## A failing `before`/`after` hook did not fail the build

**Symptom** -- the run reports every test passing and exits `0`, ending with:

```
1 hook failed during this run -- run with --fail-on-hook to fail the run on them.
```

**Cause** -- by design. A lifecycle hook failure belongs to no test, so it is recorded and
reported but does not change the exit code on its own.

**Fix** -- add [`--fail-on-hook`](test-runner.md#hook-failures) (or `"failOnHook": true` in
`.tripwirerc`), which reports each failing hook in full and exits non-zero. Recommended for CI.

Related: a failing `before`/`after` also stops the suite it belongs to, so its tests are reported
as **skipped** rather than failed. It does *not* stop the rest of the run -- the sibling suites
have their own fixtures and run normally. See
[hook failure handling](test-execution-flow.md#hook-failure-handling) for exactly what each hook
group does to a run.

---

## `--type-check` passes, but a test with a type error still ran

**Symptom** -- the run prints `Type-check completed`, and a test file containing a real error
(`const s: string = 5`) executes and passes. Or, since this was added, the run prints:

```
Warning: 1 of 1 matched TypeScript file(s) are outside test/tsconfig.test.json and were not type-checked:
  probe/typeerr.probe.test.ts
```

**Cause** -- `--type-check` checks the **tsconfig project**; the run executes whatever the **file
glob** matched. Nothing forces those two sets to agree, and they drift apart in ordinary ways: a
new test directory, a moved package, a glob widened without the tsconfig following. Files outside
the project's `include`/`files` still run -- they just run unchecked.

The same thing happens when the project resolves to *no* files at all: a mistyped `--project`
path, or `include` patterns matching nothing.

**Fix** -- do one of:

1. Add the files to the project's `"include"`/`"files"`.
2. Point `--project`/`-p` at a tsconfig that already covers them.
3. Accept it, if the mismatch is deliberate (a shared helper another project compiles).

Then add [`--strict-type-check`](test-runner.md#what---type-check-actually-checks) in CI, which
turns that warning into a non-zero exit -- so the drift is caught the next time it happens rather
than quietly returning to a green-but-unchecked run.

> **A second cause, fixed in 0.2.0.** Before 0.2.0, `--type-check` reported *no* type errors at
> all on `--target browser` and `--target worker` -- the run printed
> `Skipping pre-run no-emit compile for browser/worker`, which described skipping a duplicate
> project walk but in fact skipped the diagnostics too. A file with a real type error ran green
> on those targets while the identical file failed on `--target node`. If you are on an older
> version and rely on `--type-check` in a browser/worker script, it is not checking anything;
> upgrade, or add a `--target node` run alongside it.

---

## Type errors are being reported when I did not ask for them

**Symptom** -- a run fails with `TypeScript compile failed with N error(s)` on a project where
you expected type errors to be tolerated.

**Cause** -- something turned `--type-check` on. Either a config file sets `typeCheck: true`, or
`--strict-type-check` was passed (which implies `--type-check`), or a `--compile` alias is on the
command line.

**Fix** -- pass `--transpile-only`. It is the exact opposite of `--type-check` and wins over a
config-file `typeCheck`, so it turns checking off for a single run without editing the config:

```bash
tripwire --transpile-only "test/**/*.test.ts"
```

If both flags appear on one command line, the **last** one wins.

---

## An error printed a wall of `at yo (tripwire.js:2:143518)`

**Symptom** -- a failure was followed by ten or more frames pointing into a single minified file,
burying the message that said what to do.

**Cause** -- fixed. The CLI no longer prints a stack trace by default; it prints the message plus
actionable hints, and says explicitly when a failure was unexpected rather than something you
did.

**Fix** -- nothing to do. If you *want* the stack (you are debugging tripwire itself), pass
[`--debug-stack`](test-runner.md#errors-and---debug-stack), or set `TRIPWIRE_DEBUG_STACK=1` when
the command line isn't yours to change. Frames are mapped back through the bundle's source map,
so they name real files: `at _executeNodeOnce (internal/runner/src/execute/execute.ts:324:23)`.

---

## Another framework's globals win at runtime

**Symptom** -- tests behave as though a different runner is interpreting them (suites that never
run, hooks that never fire, options that appear to be ignored) when tripwire is run inside
another test framework, or another framework is loaded inside a tripwire run -- for example a
Karma/Mocha harness that also loads tripwire's runner.

**Cause** -- `describe`, `it`, the hooks, `assert` and `expect` are single global names.
Whichever framework installs them last owns them for the rest of the process; tripwire's runner
assigns them when the run starts and does not restore the previous values afterward. A
side-effect `import "@nevware21/tripwire/globals"` (or of `@nevware21/tripwire-globals`) assigns
them the same way, at the moment the module is first loaded.

**Fix** -- run one framework per process. Give each its own npm script rather than nesting them,
and do not import the globals entry from a file that another framework will load. If a file
genuinely needs to work under both, import the API explicitly
(`import { describe, it } from "@nevware21/tripwire"`) instead of relying on the globals -- an
explicit import always wins over whatever is on `global`, and importing the main entry never
touches the global object.

---

## A custom reporter was rejected or ignored

**Symptom** -- one of:

```
Invalid --reporter 'my-reporter'. Expected one of: spec, dot, tap, ... -- or a custom reporter module (a path such as ./my-reporter.js, a scoped package, or module:<package>).
```

```
Unable to load reporter module './reporters/mine.js'. Cannot find module './reporters/mine.js'
```

```
Invalid reporter module './reporters/mine.js': it exported no onStart, onDone or onAssert.
```

```
Custom reporter module './reporters/mine.js' is not supported for the browser target.
```

**Cause** -- in order: a **bare** name is validated against the built-in reporters, because it
cannot be told apart from a mistyped one; the specifier did not resolve from the working
directory; the module resolved but exported something that is not a listener; or a module was
selected for the `browser`/`worker` target, which builds its reporters inside the page/worker
where a node module cannot be loaded.

**Fix** -- for a bare package name, say so explicitly: `--reporter module:my-reporter`. For a
local file, use a path that resolves from the directory you run in (`./reporters/mine.js`, not
`reporters/mine.js` -- the leading `./` is what makes it a path rather than a package). Export a
listener, a `{ listener }` object, or a `createReporter(options)` factory returning either. For
the browser and worker targets, use a built-in name. See
[Custom reporters](reporters.md#custom-reporters).

---

## Related guides

- [Test Runner, CLI & Configuration](test-runner.md) - every flag and config field
- [Migrating from Mocha](migration/migrating-from-mocha.md) - flag/config/API mapping
- [Test Execution Flow](test-execution-flow.md) - execution model, timeouts, hook failures
- [Test Suite API](https://github.com/nevware21/tripwire/blob/main/core/src/suite/README.md) -
  the `describe`/`it`/hook definition API
