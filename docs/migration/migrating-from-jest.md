# Migrating from Jest to the Tripwire Test Runner

This guide helps you move a [Jest](https://jestjs.io/) test suite to the
[Tripwire](https://github.com/nevware21/tripwire) CLI test runner (`tripwire`), which runs the
same `describe`/`it`/`test` suites against **node**, **browser** and **worker** targets. It is
written for both human readers and AI-assisted migrations (Copilot, Claude, and similar) --
section 10 is a deterministic checklist and section 11 a machine-readable summary of every
mapping below.

[Vitest](https://vitest.dev/) exposes a Jest-compatible API, so nearly everything here applies to
a Vitest suite as well; section 9 covers the places where Vitest differs.

Related guides:

- [Test Runner, CLI & Configuration](../test-runner.md) - the full CLI/config reference
- [Runner Troubleshooting](../runner-troubleshooting.md) - **read this if you hit TypeScript
  `Duplicate identifier`/`Subsequent variable declarations` errors after installing tripwire**,
  or `Property 'toBe' does not exist on type 'IAssertInst'`
- [Migrating from Mocha](migrating-from-mocha.md) / [from Karma](migrating-from-karma.md) - the
  runner-side guides this one is modelled on; the Mocha guide's flag tables go into more depth on
  a few flags Jest and Mocha share
- [Migrating from Chai](migrating-from-chai.md) / [from node assert](migrating-from-node-assert.md)
  - tripwire's full `expect`/`assert` vocabulary, beyond the Jest matchers mapped here

---

## 1. Overview

Jest is three things in one package: a test-definition API (`describe`/`it`/hooks), an assertion
API (`expect(x).toBe(y)` and friends), and an execution environment (module registry, mocking,
fake timers, snapshots, jsdom, parallel workers). Tripwire replaces the first two and the runner,
but it deliberately does **not** reimplement Jest's module system -- there is no mocking, no
snapshot store and no simulated DOM. Whether the migration is a morning or a sprint depends almost
entirely on how much of that third part your suite leans on.

| Area | Effort |
|---|---|
| Test files (`describe`/`it`/`test`/hooks, `.only`/`.skip`) | **None** -- see section 3 for the exceptions (`test.each`, `test.todo`, timeout arguments) |
| `expect(...)` matchers | **Mechanical** -- every common matcher has a one-line equivalent, see section 4. Function-style terminators: `to.be.true()`, not `.toBe(true)` |
| `jest.fn()`, `jest.mock()`, `jest.spyOn()`, fake timers | **Not supported** -- use a standalone library (eg. sinon), see section 7 |
| Snapshots | **Not supported** -- see section 7 |
| `jest.config.*` | **Low** -- rewrite as `.tripwirerc`, see section 6 |
| npm scripts / CLI flags | **Low** -- see section 5 (and mind `-t`, which means something else) |
| `testEnvironment: "jsdom"` | **Different model** -- `--target browser` runs a real browser instead, see section 8 |
| TypeScript `@types/jest` | **A decision** -- `expect` is one of the 12 globals it declares, see section 2 |

---

## 2. Install and switch the command

```bash
npm install @nevware21/tripwire --save-dev
```

The `tripwire` CLI is exposed through the package's `bin` entry, so it is available to npm
scripts (and `npx`) immediately.

**Before** (`package.json`):

```jsonc
{
    "scripts": {
        "test": "jest",
        "test:watch": "jest --watch",
        "test:coverage": "jest --coverage"
    }
}
```

**After**:

```jsonc
{
    "scripts": {
        "test": "tripwire \"test/**/*.test.ts\"",
        "test:watch": "tripwire --watch \"test/**/*.test.ts\"",
        "test:coverage": "tripwire --target browser --coverage \"test/**/*.test.ts\""
    }
}
```

Two things changed beyond the command name. Jest discovers files from `testMatch` in its config,
so a bare `jest` works; tripwire requires a file glob, from the command line or from a config
file's `spec` list (section 6). And coverage moved to `--target browser`: tripwire's own
`--coverage` collects on the browser and worker targets, while the `node` target is covered by
wrapping the run with `nyc` (`nyc tripwire "test/**/*.test.ts"`) -- see
[Coverage](../test-runner.md#coverage).

TypeScript needs no `ts-jest`, `babel-jest` or `transform` entry: tripwire transpiles `.ts` test
files on load through its own require hook. `--project`/`-p` selects the tsconfig. Type checking
is **opt-in** (`--type-check`), where `ts-jest` reported type errors by default -- add the flag
to keep that behaviour, and `--strict-type-check` in CI to also fail when a matched file sits
outside the tsconfig's `include`.

> **Quote your globs.** Let the runner expand the pattern rather than the shell.

### TypeScript: `@types/jest` and the global names

Jest injects `describe`, `it`, `test`, `expect`, the hooks and `jest` itself as globals, and
`@types/jest` declares them. Tripwire's runner installs `describe`, `it`, `test`, the hooks,
`assert` and `expect` as globals at the start of every run too, so the **runtime** side needs
nothing. TypeScript is the part that needs a decision, because installing `@nevware21/tripwire`
declares **no** ambient globals -- deliberately, so that it can sit next to `@types/jest` during
the migration without breaking the build.

`@types/jest` declares 12 of the same names, two more than Jasmine's set: `test` and, the one
that matters, **`expect`**. Jest's `expect(x).toBe(y)` and tripwire's `expect(value, msg?)` are
unrelated APIs, so whichever declaration wins decides which matcher chain compiles. That gives you
two sensible staging strategies:

**File by file, while `@types/jest` stays installed.** Do not opt in to tripwire's globals.
In each converted file import the names explicitly:

```ts
import { describe, it, expect } from "@nevware21/tripwire";
```

The import shadows the globals, so `expect` is tripwire's in converted files and jest's
everywhere else; the two coexist indefinitely. Suites already written against
`import { ... } from "@jest/globals"` are the same case -- change the module specifier.

**All at once, once `@types/jest` is gone** (`npm uninstall jest @types/jest ts-jest`), opt in
to tripwire's declarations:

```bash
npm install @nevware21/tripwire-globals --save-dev
```

```jsonc
// tsconfig.json -- keep every other entry the project relies on
{ "compilerOptions": { "types": ["node", "@nevware21/tripwire-globals"] } }
```

`"@nevware21/tripwire/globals"` (the same entry published from the core package) or a
`/// <reference types="@nevware21/tripwire-globals" />` in any one file are equivalent -- see the
[globals package README](../../globals/README.md). From this point every un-migrated
`expect(x).toBe(y)` fails to compile with
`TS2339: Property 'toBe' does not exist on type 'IAssertInst'`, which is exactly the to-do list
for section 4.

Opting in *while* `@types/jest` is still in the program is the one combination that fails
(`TS2403: Subsequent variable declarations must have the same type`); see
[Runner Troubleshooting](../runner-troubleshooting.md#typescript-duplicate-global-declarations)
for the four ways out, including scoping `types` per tsconfig so two runners can share a project.

---

## 3. Test file API

Every one of these works exactly as it does in Jest, as a global (installed by the runner, typed
via the [opt-in globals](#typescript-typesjest-and-the-global-names)) or as a named import from
`@nevware21/tripwire`:

| Jest | Tripwire | Notes |
|---|---|---|
| `describe` / `it` / `test` | ✅ same | |
| `describe.only` / `it.only` / `test.only` | ✅ same | Also `fdescribe`/`fit` |
| `describe.skip` / `it.skip` / `test.skip` | ✅ same | Also `xdescribe`/`xit` |
| `test.todo("name")` | ⚠️ `it("name")` | A test with no function is reported as **pending**, which is what `todo` reported |
| `beforeAll` / `afterAll` / `beforeEach` / `afterEach` | ✅ same | Also `before`/`after` (Mocha style). Named hooks (`beforeEach("name", fn)`) are accepted; the name appears in hook-failure reports |
| `done` callback (`it("x", (done) => ...)`) | ✅ same | Detected by function arity, as in Jest |
| Returning a `Promise` / `async` test | ✅ same | |
| `it("x", fn, 10000)` (timeout as third argument) | ❌ **not accepted** | The definition takes `(description, fn)` only. Use `this.timeout(10000)` inside the test (needs `function`, not an arrow), or `--timeout` for the whole run |
| `beforeAll(fn, 10000)` (hook timeout argument) | ❌ **not accepted** | The second argument is the hook function when the first is a name. Same replacements as above |
| `jest.setTimeout(ms)` | `--timeout <ms>` / config `timeout` | Or `this.timeout(ms)` in a `describe` body for one suite. Note the **default is 2000 ms**, not Jest's 5000 -- see section 8 |
| `jest.retryTimes(n)` | `--retries <n>` / config `retries` | Or `this.retries(n)` in a suite or test |
| `describe.each` / `it.each` / `test.each` (and the tagged-template form) | ❌ **not available** | Write the loop: `for (const [a, b] of cases) { it(\`adds ${a}\`, () => ...) }` |
| `test.concurrent` | ❌ **not available** | Tests run sequentially; the name is not defined |
| `test.failing` | ❌ **not available** | Assert the failure explicitly with `expect(fn).toThrow()` |
| `jest.fn()`, `jest.mock()`, `jest.spyOn()`, `jest.requireActual()`, `jest.isolateModules()` | ❌ **not available** | See section 7 |
| `jest.useFakeTimers()` / `jest.advanceTimersByTime()` | ❌ **not available** | Use a standalone fake-timer library (eg. sinon's) |

Tripwire additions Jest does not have: `this.skip()` to skip from inside a test or hook,
`this.slow(ms)`, and `this.currentTest` inside hooks (tripwire's `ITestCase`: `id`,
`description`, `fn`, `only`, `skip`, `timeout`, `slow`, `retries`).

### Replacing `setupFilesAfterEach` and `globalSetup`

Every test file in a run is loaded into the **same root suite**, so a hook declared at the top
level of any loaded file -- outside every `describe` -- applies to the entire run. That is the
replacement for a `setupFilesAfterEach` file that registered hooks, and for
`globalSetup`/`globalTeardown`:

```js
// test/setup.test.js -- matched by the same glob as every other test file
beforeAll(async function () {
    await startTestDatabase();
});
afterAll(async function () {
    await stopTestDatabase();
});
```

Do **not** put these in a `--require`/`--file` preload. On the `node` target a preload is
`require()`d before the runner installs the globals and before the root suite exists, so
`beforeAll` is not defined there and the file fails to load. (The `browser`/`worker` targets load
preloads as the first modules of the suite, after the globals exist, so a hook declared there does
register -- but relying on that makes the file break the moment it runs under `--target node`.)
Preloads are for `setupFiles`-style work that does not touch the test API: polyfills,
environment variables, registering `jsdom-global`, and similar.

---

## 4. `expect` matcher mapping

Tripwire's `expect` is a Chai-style chain with **function-call terminators**: `expect(x).to.be.true()`
with parentheses, not Jest's `.toBe(true)` and not Chai's property form `.to.be.true`. Every
mapping below also has an `assert.*` form (`assert.strictEqual(x, y)`, `assert.isNull(x)`, ...)
if you prefer that style; both are installed as globals by the runner. `not` can be inserted
anywhere in a chain (`expect(x).to.not.be.null()`), and `and` continues one
(`expect(x).is.number().and.is.above(1)`).

### 4.1 Equality

| Jest | Tripwire | Notes |
|---|---|---|
| `expect(x).toBe(y)` | `expect(x).to.strictly.equal(y)` | `===`; `assert.strictEqual(x, y)`. **Not** `to.equal(y)`, which is loose `==` in tripwire (unlike Chai). Jest's `toBe` is `Object.is`: for `toBe(NaN)` use `to.be.nan()`; `+0`/`-0` are equal under `===` where `Object.is` told them apart |
| `expect(x).toEqual(y)` | `expect(x).to.deep.equal(y)` | `assert.deepEqual(x, y)`. Jest ignores properties whose value is `undefined`; tripwire compares the key sets, so `{ a: undefined }` is **not** equal to `{}` -- see section 8 |
| `expect(x).toStrictEqual(y)` | `expect(x).to.deep.strictly.equal(y)` | `assert.deepStrictEqual(x, y)` |
| `expect(x).not.toBe(y)` | `expect(x).to.not.strictly.equal(y)` | `assert.notStrictEqual(x, y)` |
| `expect(x).not.toEqual(y)` | `expect(x).to.not.deep.equal(y)` | `assert.notDeepEqual(x, y)` |
| `expect(x).not.toStrictEqual(y)` | `expect(x).to.not.deep.strictly.equal(y)` | `assert.notDeepStrictEqual(x, y)` |

### 4.2 Truthiness, `null`, `undefined`

| Jest | Tripwire | Notes |
|---|---|---|
| `expect(x).toBeTruthy()` | `expect(x).to.be.truthy()` | Also `.is.ok()`; `assert.isOk(x)` |
| `expect(x).toBeFalsy()` | `expect(x).to.not.be.truthy()` | `assert.isNotOk(x)` |
| `expect(x).toBe(true)` / `toBe(false)` | `expect(x).to.be.true()` / `expect(x).to.be.false()` | Strict; `assert.isTrue(x)` / `assert.isFalse(x)` |
| `expect(x).toBeNull()` | `expect(x).to.be.null()` | `assert.isNull(x)` |
| `expect(x).toBeUndefined()` | `expect(x).to.be.undefined()` | `assert.isUndefined(x)` |
| `expect(x).toBeDefined()` | `expect(x).to.not.be.undefined()` | `assert.isDefined(x)` |
| `expect(x).toBeNaN()` | `expect(x).to.be.nan()` | `assert.isNaN(x)` |

### 4.3 Numbers

| Jest | Tripwire | Notes |
|---|---|---|
| `expect(x).toBeGreaterThan(y)` | `expect(x).to.be.above(y)` | Also `gt`/`greaterThan`; `assert.isAbove(x, y)` |
| `expect(x).toBeGreaterThanOrEqual(y)` | `expect(x).to.be.at.least(y)` | Also `gte`/`greaterThanOrEqual`; `assert.isAtLeast(x, y)` |
| `expect(x).toBeLessThan(y)` | `expect(x).to.be.below(y)` | Also `lt`/`lessThan`; `assert.isBelow(x, y)` |
| `expect(x).toBeLessThanOrEqual(y)` | `expect(x).to.be.at.most(y)` | Also `lte`/`lessThanOrEqual`; `assert.isAtMost(x, y)` |
| `expect(x).toBeCloseTo(y, digits)` | `expect(x).to.be.closeTo(y, delta)` | Tripwire takes an **absolute delta**, Jest a digit count: Jest passes when `|x - y| < 10^-digits / 2`, so `toBeCloseTo(y)` (default 2 digits) becomes `closeTo(y, 0.005)`. `assert.closeTo(x, y, delta)`; `approximately` is an alias |

### 4.4 Strings, collections and objects

| Jest | Tripwire | Notes |
|---|---|---|
| `expect(s).toMatch(/re/)` | `expect(s).to.match(/re/)` | `assert.match(s, /re/)` |
| `expect(s).toMatch("sub")` | `expect(s).to.include("sub")` | `match()` takes a `RegExp` only; a string is a substring check, which is `include` |
| `expect(x).toContain(item)` | `expect(x).to.include(item)` | Strings, arrays, Sets and Maps; `contain`/`contains`/`includes` are aliases. `assert.includes(x, item)` |
| `expect(arr).toContainEqual(item)` | `expect(arr).to.deep.include(item)` | Deep equality against each element |
| `expect(x).toHaveLength(n)` | `expect(x).to.have.lengthOf(n)` | `assert.lengthOf(x, n)` |
| `expect(o).toHaveProperty("a")` | `expect(o).to.have.property("a")` | `assert.hasProperty(o, "a")` |
| `expect(o).toHaveProperty("a", v)` | `expect(o).to.have.property("a", v)` | Value compared with deep equality |
| `expect(o).toHaveProperty("a.b.c", v)` | `expect(o).to.have.nested.property("a.b.c", v)` | `assert.nestedProperty(o, "a.b.c", v)`. Jest's array-path form `["a", "b"]` has no equivalent -- join it with `.` |
| `expect(o).toMatchObject(subset)` | `expect(o).to.deep.include(subset)` | ⚠️ Shallower than Jest: each key of `subset` must exist on `o` with a deep-equal value, but a nested object is compared **whole**, not as a subset. Spell nested subsets out with `nested.property` |
| `expect(x).toBeInstanceOf(C)` | `expect(x).to.be.instanceOf(C)` | `assert.isInstanceOf(x, C)` |
| `expect(arr).toEqual(expect.arrayContaining(items))` | `expect(arr).to.include.members(items)` | `assert.includeMembers(arr, items)` |
| `expect(typeof x).toBe("string")` | `expect(x).to.be.a.string()` | Also `number()`, `boolean()`, `function()`, `object()`, `array()`, or `is.typeOf("string")`; `assert.isString(x)` |

### 4.5 Exceptions and async

`toThrow` and `toThrowError` exist on tripwire's chain **by those names**, with Jest's argument
shapes, so these lines usually carry over unchanged:

| Jest | Tripwire | Notes |
|---|---|---|
| `expect(fn).toThrow()` | `expect(fn).toThrow()` | Also `expect(fn).to.throw()`; `assert.throws(fn)` |
| `expect(fn).toThrow("message")` / `toThrow(/re/)` | `expect(fn).toThrow("message")` / `expect(fn).toThrow(/re/)` | String or `RegExp` message match |
| `expect(fn).toThrow(TypeError)` | `expect(fn).toThrow(TypeError)` | An optional message match follows: `toThrow(TypeError, /re/)` |
| `expect(fn).toThrowError(...)` | `expect(fn).toThrowError(...)` | Alias, as in Jest |
| `expect(fn).not.toThrow()` | `expect(fn).to.not.throw()` | `assert.doesNotThrow(fn)` |
| `await expect(p).resolves.toBe(v)` | ❌ no equivalent | `await` the promise, then assert the value: `const value = await p; expect(value).to.strictly.equal(v);` |
| `await expect(p).rejects.toThrow()` | ❌ no equivalent | Tripwire does not currently provide a direct equivalent for asserting Promise rejections; use `async`/`await` with `try`/`catch` and normal assertions on the caught error, calling `assert.fail("expected rejection")` after the `await` so a resolution fails the test |

```ts
// rejects.toThrow(/not found/) becomes:
it("rejects a missing id", async () => {
    try {
        await repo.load("missing");
        assert.fail("expected load() to reject");
    } catch (e) {
        expect(e).to.be.instanceOf(NotFoundError);
        expect((e as Error).message).to.match(/not found/);
    }
});
```

### 4.6 Matchers with no equivalent

| Jest | Status | Suggested approach |
|---|---|---|
| `expect.any(C)`, `expect.anything()`, `expect.stringContaining()`, `expect.stringMatching()`, `expect.objectContaining()`, `expect.closeTo()` (asymmetric matchers) | ❌ None | Assert the field on its own: `expect(o).to.have.property("id").that.is.a.string()` -- `that`/`value` after `property()` switch the chain to the property's value. `objectContaining` at the top level is `to.deep.include(...)` |
| `toHaveBeenCalled`, `toHaveBeenCalledTimes`, `toHaveBeenCalledWith`, `toHaveBeenLastCalledWith`, `toHaveReturned*`, `toHaveBeenNthCalledWith` | ❌ None | Tripwire has no mocking. Use sinon (or similar) and assert on its properties: `expect(spy.calledOnce).to.be.true()`, `expect(spy.firstCall.args).to.deep.equal([...])` |
| `toMatchSnapshot`, `toMatchInlineSnapshot`, `toThrowErrorMatchingSnapshot` | ❌ None | Replace with an explicit `to.deep.equal(fixture)` against a checked-in fixture |
| `expect.assertions(n)`, `expect.hasAssertions()` | ❌ None | Make the assertion unconditional: `await` the promise instead of asserting inside `.then`/`.catch` (section 4.5) |
| `expect.extend({ ... })` | ⚠️ Different API | `addAssertInstFunc`/`addAssertInstFuncDefs` from `@nevware21/tripwire` add chain words -- see [Creating custom assertions](../expression-adapter.md#creating-custom-assertions) |
| `toBeInstanceOf` with `expect.any` | ❌ None | `to.be.instanceOf(C)` on the value itself |

---

## 5. CLI flag mapping

Jest flags with a tripwire equivalent:

| Jest | Tripwire | Notes |
|---|---|---|
| *(positional)* `jest path/pattern` | *(positional)* `tripwire "test/**/*.test.ts"` | Jest's positional is a **regex** matched against paths; tripwire's is a **glob**. Required -- `tripwire` with no glob and no config `spec` prints help |
| `--testPathPattern <re>` | the positional glob | |
| `--testPathIgnorePatterns <re>` | `--ignore <glob>` | Repeatable |
| `--testNamePattern <re>`, **`-t`** | `--grep <re>`, `-g` | ⚠️ **Tripwire's `-t` is `--timeout`.** A leftover `jest -t "name"` becomes `tripwire -t "name"`, which fails with `Invalid value for --timeout`. `--fgrep`/`-f` matches literally; `--invert` negates |
| `--testTimeout <ms>` | `--timeout <ms>`, `-t` | |
| `--bail`, `-b` | `--bail`, `-b` | Boolean only -- Jest's `--bail=3` (fail after *n* suites) has no equivalent |
| `--watch`, `--watchAll` | `--watch` | Watches the matched files (and, on `node`, what they `require`). No interactive key menu -- see section 8 |
| `--coverage`, `--collectCoverage` | `--coverage` | **Browser and worker targets** (Puppeteer launches). For `node`, wrap the run: `nyc tripwire ...` |
| `--coverageReporters <names>` | `--coverage-reporter <name>` | `nyc` reporter names: `text`, `html`, `lcov`, ... Repeatable/comma-separated |
| `--collectCoverageFrom <glob>` | `--coverage-src <glob>` | Where your sources live, so unimported files are still reported (default `src/**/*.ts`) |
| `--env <jsdom\|node>`, `--testEnvironment` | `--target <node\|browser\|worker>` | `jsdom` → `browser` (a real browser, see section 8). Tripwire also accepts `--env` as an alias of `--target`, but only with those three values -- `--env jsdom` is rejected |
| `--reporters <name>` | `--reporter <name>` | Built-in names: `spec` (default), `dot`, `tap`, `json`, `json-stream`, `min`, `list`, `progress`, `landing`, `nyan`, `doc`, `markdown`, `xunit`, `cargo`; or a custom module (`node` target). Repeatable |
| `--json` | `--reporter json` | Written to stdout; there is no `--outputFile` |
| `--verbose` | `--reporter spec` (already the default) | Lists every test by name, which is what Jest's `--verbose` did. ⚠️ Tripwire *has* a `--verbose`, but it logs the embedded server's HTTP requests on the browser/worker targets -- not this |
| `--listTests` | `--show-files` | Prints the matched files, then still runs them. Pair with a `--grep` that matches nothing to stop there (the zero-test run exits non-zero, which is fine for inspection) |
| `--rootDir`, `--roots` | the positional glob | Root the glob there: `"packages/*/test/**/*.test.ts"` |
| `--help`, `-h` | `--help`, `-h` | |

Tripwire additions with no Jest counterpart -- see [the CLI reference](../test-runner.md) for the
full list:

| Flag | Purpose |
|---|---|
| `--target <node\|browser\|worker>` | Run the same suite in a browser or Web Worker |
| `--browser-launch <puppeteer\|open\|manual>` | Headless, your own browser, or a printed URL for any browser or device |
| `--project <tsconfig>`, `-p` | Which tsconfig compiles the tests (replaces `ts-jest`'s `tsconfig` option) |
| `--type-check`, `--strict-type-check` | Fail the run on type errors (`ts-jest` did this by default; tripwire does not) |
| `--fail-on-hook` | Fail the run when a lifecycle hook fails -- see section 8 |
| `--trace` | Print each test *and assertion* as it executes |
| `--slow <ms>`, `--retries <n>` | Slow-test threshold and retry count for the whole run |

> **Unrecognized flags are an error, not a warning.** Anything starting with `-` that tripwire
> does not know fails the run with `Unsupported option: --x` and prints the usage. Leftover Jest
> flags (`--runInBand`, `--ci`, `--silent`, `-u`) therefore surface on the very first run. The
> complete list of Jest flags with no equivalent is in section 7.

---

## 6. `jest.config.*` → `.tripwirerc`

Tripwire does not read `jest.config.js`/`.ts`/`.mjs`, `jest.config.json`, a `"jest"` key in
`package.json`, or `vitest.config.*`. It looks for `.tripwirerc`, `.tripwirerc.json`,
`.tripwirerc.js`/`.cjs`, `tripwire.config.json`, or `tripwire.config.js`/`.cjs` in every
directory from the cwd up to the filesystem root, plus a `~/.tripwirerc`-style file in the home
directory, and merges them with the file closest to the cwd winning. The list-valued fields
`spec`, `ignore`, `grep` and `require` are concatenated across levels, and the matching CLI
flags append to them too; every other setting is replaced by a CLI flag, as is `reporters`
(`--reporter` replaces rather than adds). See
[Config Files](../test-runner.md#config-files-tripwirerc) for the full rules.

**Before** (`jest.config.js`):

```js
module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    roots: ["<rootDir>/test"],
    testMatch: ["**/*.test.ts"],
    testPathIgnorePatterns: ["/node_modules/", "/fixtures/"],
    setupFiles: ["./test/polyfills.ts"],
    setupFilesAfterEach: ["./test/hooks.ts"],
    testTimeout: 10000,
    bail: true,
    verbose: true,
    collectCoverage: true,
    collectCoverageFrom: ["src/**/*.ts"],
    coverageReporters: ["text", "lcov"],
    globals: { "ts-jest": { tsconfig: "./test/tsconfig.json" } }
};
```

**After** (`.tripwirerc`):

```jsonc
// JSONC-style // comments are allowed
{
    "spec": ["test/**/*.test.ts"],
    "ignore": ["**/fixtures/**"],
    // no preset / transform -- tripwire transpiles .ts itself
    "project": "./test/tsconfig.json",
    "target": "node",
    // setupFiles: a preload is fine for polyfills...
    "require": ["./test/polyfills.ts"],
    // ...but the hooks in setupFilesAfterEach move to a test file the glob matches (section 3)
    "timeout": 10000,
    "bail": true,
    "failOnHook": true,
    "reporters": ["spec"],
    "coverage": true,
    "coverageSrc": ["src/**/*.ts"],
    "coverageReporters": ["text", "lcov"]
}
```

Field mapping:

| `jest.config` field | Tripwire | Notes |
|---|---|---|
| `testMatch` | `spec` | Globs, as before. `**/*.test.ts` works unchanged; `node_modules` is never walked |
| `testRegex` | `spec` | Convert the regex to a glob: `\\.test\\.ts$` → `"**/*.test.ts"` |
| `testPathIgnorePatterns` | `ignore` | Globs, not regexes |
| `rootDir`, `roots` | prefix the `spec` globs | There is no `<rootDir>` token |
| `moduleFileExtensions` | the glob's extension list | `"test/**/*.{js,ts}"` |
| `testTimeout` | `timeout` | ms. **Default 2000**, where Jest's was 5000 |
| `slowTestThreshold` | `slow` | ⚠️ Jest's is in **seconds**, tripwire's in **ms** |
| `bail` | `bail` | Boolean; a number is not accepted |
| `verbose` | `reporters: ["spec"]` | The default reporter already names every test |
| `reporters` | `reporters` | Built-in names (section 5) or a custom module specifier -- **not** a Jest reporter class |
| `collectCoverage` | `coverage` | Browser/worker targets; `nyc` for node |
| `collectCoverageFrom` | `coverageSrc` | |
| `coverageReporters` | `coverageReporters` | `nyc` reporter names |
| `coverageDirectory` | *(none)* | Always `coverage/<target>/` |
| `coverageThreshold` | *(none)* | Enforce with `nyc check-coverage` on the written `coverage-final.json` |
| `coveragePathIgnorePatterns`, `coverageProvider` | *(none)* | |
| `testEnvironment` | `target` | `"jsdom"` → `"browser"` (a real browser), `"node"` → `"node"`. `jsdom` *on the node target* is still possible as a preload: `"require": ["jsdom-global/register"]` |
| `testEnvironmentOptions` | *(none)* | |
| `setupFiles` | `require` | Preloaded before the suite. **Browser/worker: file paths only** (`./test/setup.ts`), not package names |
| `setupFilesAfterEach` | `require` *or* a test file | A preload for setup that does not call `beforeEach`/`describe`; hooks move to the top level of a file the glob matches -- see [section 3](#replacing-setupfilesaftereach-and-globalsetup) |
| `globalSetup`, `globalTeardown` | a `beforeAll`/`afterAll` at the top level of a matched test file | Same section |
| `preset`, `transform` (`ts-jest`, `babel-jest`) | *(none needed)* | Tripwire compiles TypeScript itself |
| `globals["ts-jest"].tsconfig` | `project` | |
| `globals["ts-jest"].diagnostics` | `typeCheck` | Off by default; `true` reports type errors and fails the run |
| `globals` (injected values) | *(none)* | Set them in a `require` preload: `globalThis.API_URL = "..."` |
| `injectGlobals` | *(none needed)* | The runner always installs the globals |
| `moduleNameMapper` | *(none)* | No module aliasing. Use relative imports, or tsconfig `paths` only if your build already resolves them at runtime |
| `moduleDirectories`, `modulePaths`, `resolver` | *(none)* | Standard node resolution |
| `cache` | `emitCache` | `node` target compile cache, on by default; `cache: false` → `"emitCache": false` or `--no-emit-cache` |
| `cacheDirectory` | *(none)* | Always `node_modules/.cache/tripwire` |
| `watchPathIgnorePatterns`, `watchman` | *(none)* | |
| `maxWorkers`, `maxConcurrency`, `workerIdleMemoryLimit` | *(none)* | Runs are single-process |
| `projects`, `displayName` | *(none)* | Run `tripwire` once per project; `.tripwirerc` files merge directory-wise, so a monorepo root can hold the shared defaults |
| `testSequencer`, `randomize` | *(none)* | Files run in glob-resolution order |
| `snapshotSerializers`, `snapshotFormat`, `snapshotResolver` | *(none)* | No snapshots |
| `clearMocks`, `resetMocks`, `restoreMocks`, `resetModules`, `automock`, `unmockedModulePathPatterns` | *(none)* | No mocking |
| `fakeTimers` | *(none)* | |
| `passWithNoTests` | *(none)* | A run that matches no tests always exits non-zero |
| `detectOpenHandles`, `forceExit`, `openHandlesTimeout` | *(none)* | |
| `testFailureExitCode`, `errorOnDeprecated`, `notify`, `silent`, `testResultsProcessor`, `extensionsToTreatAsEsm` | *(none)* | |

---

## 7. Jest features with no tripwire equivalent

The honest list. Each CLI flag here fails the run with `Unsupported option` if left on the
command line; the config fields are simply not read.

| Jest feature | Status | Suggested approach |
|---|---|---|
| **Mocking** -- `jest.fn()`, `jest.mock()`, `jest.spyOn()`, automock, `toHaveBeenCalled*` | ❌ Not supported | Use a standalone library (sinon, testdouble). Module-level mocking (`jest.mock("./dep")`) has no drop-in replacement: inject the dependency, or use proxyquire-style tooling on the `node` target |
| **Snapshots** -- `toMatchSnapshot`, `-u`/`--updateSnapshot`, `--ci` | ❌ Not supported | Assert against explicit fixtures |
| **Fake timers** -- `jest.useFakeTimers()` | ❌ Not supported | sinon's fake timers or similar |
| **Parallel workers** -- `--maxWorkers`/`-w`, `--runInBand`/`-i`, `--shard` | ❌ Not supported | Runs are single-process. **`--target worker` is unrelated** -- it means "run the suite inside a Web Worker", not "run tests in parallel worker processes" |
| **Per-file module isolation** | ❌ Not supported | Jest gives each test file a fresh module registry; tripwire's `node` target `require()`s every file into one process, so module state is shared -- see section 8 |
| **jsdom / happy-dom simulation** | ❌ Not supported | `--target browser` runs a **real** browser instead (section 8). `jsdom-global/register` as a `--require` preload still works on the `node` target if you prefer the simulation |
| **Interactive watch menu** -- `p`/`t`/`a`/`q`/`f` keys, `--onlyChanged`/`-o`, `--changedSince`, `--lastCommit`, `--findRelatedTests` | ❌ Not supported | `--watch` re-runs the matched suite on change. For interactive filtering use `--target browser --browser-launch open`: the runner page has a **scope** box that searches suites and tests and re-runs the selection without restarting -- see section 8 |
| **Coverage thresholds** -- `coverageThreshold` | ❌ Not supported | `nyc check-coverage` on the written report |
| `test.each` / `describe.each`, `test.concurrent`, `test.failing` | ❌ Not supported | Loops; sequential tests; explicit `toThrow` |
| Asymmetric matchers (`expect.any`, `expect.objectContaining`, ...) | ❌ Not supported | Section 4.6 |
| `expect.assertions(n)` | ❌ Not supported | Section 4.6 |
| `moduleNameMapper`, custom `resolver` | ❌ Not supported | Standard resolution only |
| `--config`/`-c <path>` | ❌ Not supported | Config is discovered as `.tripwirerc` (section 6) |
| `--passWithNoTests` | ❌ Not supported | Zero tests is a failed run |
| `--silent`, `--noStackTrace`, `--expand`, `--useStderr` | ❌ Not supported | Output is the reporter's; `--debug-stack` adds the runner's own stack beneath a failure |
| `--detectOpenHandles`, `--forceExit`, `--logHeapUsage` | ❌ Not supported | |
| `--randomize`, `--seed` | ❌ Not supported | Glob-resolution order |
| `--selectProjects`, `--projects` | ❌ Not supported | One run per project |
| `--outputFile`, `--testLocationInResults` | ❌ Not supported | `--reporter json` writes to stdout; redirect it |
| `--notify`, `--showConfig`, `--debug`, `--errorOnDeprecated`, `--injectGlobals`, `--init`, `--version` | ❌ Not supported | |

---

## 8. Behaviour differences worth knowing

1. **The default timeout is 2000 ms, not 5000.** A test that took 3 s under Jest fails under
   tripwire until you set `--timeout 5000` (or `"timeout": 5000` in `.tripwirerc`). Do this in
   the first run rather than hunting for "slow" tests.
2. **`-t` means `--timeout`.** Jest's `-t` is `--testNamePattern`. The replacement is `--grep`/`-g`.
3. **`to.equal` is loose.** Tripwire's `equal`/`equals`/`eq` is `==`, so `expect(1).to.equal("1")`
   passes. Jest's `toBe` is `to.strictly.equal` (or `assert.strictEqual`); nothing in the Jest
   vocabulary maps to the loose form.
4. **`deep.equal` does not ignore `undefined` properties.** Jest's `toEqual` treats
   `{ a: 1, b: undefined }` and `{ a: 1 }` as equal; tripwire's `deep.equal` (and
   `assert.deepEqual`) compares the enumerable key sets and reports them as different. Suites
   that relied on the leniency -- typically serializer output with optional fields -- need the
   expected object to spell the `undefined` out, or to delete the key before comparing. On this
   point tripwire's `deep.equal` behaves like Jest's `toStrictEqual`.
5. **One process, one module registry.** Jest runs each test file in its own module registry (a
   fresh `require` cache per file, and worker processes on top). Tripwire's `node` target
   `require()`s every matched file into one process and one root suite, in glob-resolution order:
   a module-level singleton initialised by `a.test.ts` is still initialised when `b.test.ts`
   runs, and `process.env` edits leak across files. Reset shared state in `beforeEach`/`afterEach`
   rather than relying on isolation. The browser and worker targets bundle the files into one
   module graph with the same consequence.
6. **`--target browser` is a real browser, not jsdom.** The suite is bundled, served from an
   embedded HTTP server and executed in headless Chrome via Puppeteer (installed in the project
   being tested), so `window`, `document`, `fetch`, `localStorage` and layout are the real thing
   -- which also means a test that used jsdom's gaps (no layout, no `fetch`) as a feature now
   behaves differently. Node-only APIs (`fs`, `process`) are unavailable there; guard shared
   files. The `worker` target is a Web Worker with no DOM at all.
7. **Hook failures do not fail the run by default.** Jest fails every test in a `describe`
   whose `beforeAll` threw. Tripwire stops that suite, records the hook failure separately, and
   reports the suite's tests as **skipped** -- the exit code reflects test results alone. Add
   [`--fail-on-hook`](../test-runner.md#hook-failures) (`"failOnHook": true`) to restore Jest's
   "a broken hook fails the build" behaviour; recommended in CI.
8. **Watch mode has no key menu.** `--watch` re-runs the matched suite whenever a matched file
   (or, on `node`, anything it transitively requires) changes; there is no `p`/`t` prompt to
   narrow the run. The interactive replacement is the browser runner page
   (`--target browser --browser-launch open` or `manual`): its **scope** box searches every suite
   and test and re-runs just the selection, and it reloads on change from its own toggle. From
   the terminal, narrow with `--grep` and restart.
9. **Zero matched tests is a failure.** Jest fails with "No tests found" unless
   `--passWithNoTests`; tripwire always exits non-zero with `No tests matched ...`. There is no
   opt-out.
10. **Type checking is opt-in.** `ts-jest` reported type errors in test files by default; tripwire
    transpiles only unless you pass `--type-check`. Add it (and `--strict-type-check` in CI) to
    keep that safety net. The Mocha guide explains
    [what `--type-check` actually checks](../test-runner.md#what---type-check-actually-checks).
11. **Globals are installed by the runner**, not by importing the package. A file loaded outside a
    `tripwire` run (a plain `node file.js`) sees no `describe`; import from `@nevware21/tripwire`,
    or `import "@nevware21/tripwire-globals"` to install the bare names. `--require`/`--file`
    preloads on the `node` target run *before* the globals exist (section 3).
12. **Unrecognized flags are errors**, and a bare `--` does **not** start a passthrough list: what
    follows is treated as more file patterns.

---

## 9. Coming from Vitest

Vitest's API is Jest-compatible, so sections 3, 4 and 7 apply as written: the same `describe`/
`it`/`test`/hooks carry over, the same matchers need the same rewrite, and `vi.fn()`,
`vi.mock()`, `vi.spyOn()`, `vi.useFakeTimers()`, `toMatchSnapshot` and `expect.assertions` have
no equivalent, exactly as their `jest.*` counterparts do not. The differences:

- **Commands.** `vitest run` → `tripwire "<glob>"`; a bare `vitest` (watch mode by default) →
  `tripwire --watch "<glob>"`. `vitest bench` has no equivalent.
- **Chai-style chains already work.** Vitest's `expect` also exposes Chai's API, so a suite
  written as `expect(x).to.equal(y)` / `expect(x).to.deep.equal(y)` / `expect(fn).to.throw()` is
  most of the way there. Two things still change: property terminators become calls
  (`to.be.true` → `to.be.true()`, `to.be.undefined` → `to.be.undefined()`, `to.exist` →
  `to.exist()`), and `to.equal` in Chai is strict where tripwire's is loose -- use
  `to.strictly.equal`. See [Migrating from Chai](migrating-from-chai.md) for the full table.
- **Vitest-only matchers.** `toBeTypeOf("string")` → `expect(x).is.typeOf("string")` (or
  `is.string()`); `toSatisfy(fn)` → `expect(fn(x)).to.be.true()`; `toHaveResolved`/
  `toHaveBeenCalled*` → none (no mocking).
- **Environments.** `environment: "jsdom"` or `"happy-dom"` → `--target browser` (a real browser);
  `environment: "node"` → `--target node`; a browser-mode config (`test.browser.enabled`) →
  `--target browser` too, with `--browser-launch open`/`manual` for a visible browser. There is no
  `// @vitest-environment` per-file pragma: one target per run, so split the globs if a suite
  mixes them.
- **Config.** `vitest.config.ts` is not read. Field mapping, where the Jest table in section 6 does
  not already cover the same name:

| `vitest.config` (`test.*`) | Tripwire | Notes |
|---|---|---|
| `include` | `spec` | |
| `exclude` | `ignore` | |
| `environment` | `target` | See above |
| `globals: true` | *(none needed)* | The runner always installs the globals; TypeScript opts in via `@nevware21/tripwire-globals` (section 2) |
| `setupFiles` | `require` | Browser/worker: file paths only. Hooks move to a matched test file (section 3) |
| `globalSetup` | a top-level `beforeAll`/`afterAll` in a matched test file | |
| `testTimeout`, `hookTimeout` | `timeout` | One value covers tests and hooks |
| `slowTestThreshold` | `slow` | Both in ms |
| `retry` | `retries` | |
| `bail` | `bail` | Boolean |
| `reporters` | `reporters` | Built-in names (section 5) |
| `outputFile` | *(none)* | Redirect `--reporter json` |
| `coverage.enabled` | `coverage` | Browser/worker; `nyc` for node |
| `coverage.include` | `coverageSrc` | |
| `coverage.reporter` | `coverageReporters` | |
| `coverage.thresholds`, `coverage.provider`, `coverage.reportsDirectory` | *(none)* | |
| `watch` | `watch` | |
| `alias` / `resolve.alias` | *(none)* | No module aliasing |
| `pool`, `poolOptions`, `isolate`, `fileParallelism`, `maxConcurrency` | *(none)* | Single process, shared module registry |
| `sequence.shuffle`, `sequence.seed` | *(none)* | |
| `typecheck` | *(none)* | Vitest's `typecheck` runs `*.test-d.ts` type tests; tripwire's `--type-check` type-checks the ordinary test files instead. They are different features |
| `browser.*` | `--target browser`, `--browser-launch` | Chrome via Puppeteer only; other browsers via `--browser-launch manual` |
| `benchmark.*` | *(none)* | |

---

## 10. Migration checklist

Deterministic order, safe to follow step by step (by a person or an agent):

1. `npm install @nevware21/tripwire --save-dev`.
2. Replace `jest`/`vitest` in every `package.json` script with `tripwire "<glob>"`, converting
   `testMatch`/`testRegex`/`include` to a quoted glob. Add `--timeout 5000` if the suite relied on
   Jest's default.
3. Map each remaining CLI flag using section 5 -- `-t` → `-g` first. Delete unsupported ones
   (section 7).
4. If a `jest.config.*`, `package.json#jest` or `vitest.config.*` exists, rewrite it as
   `.tripwirerc` using section 6 (and section 9), then delete it and the `ts-jest`/`babel-jest`
   `transform` configuration with it.
5. `grep` the test tree for `setupFilesAfterEach`/`globalSetup` content that registers hooks and
   move it to the top level of a test file the glob matches (not a `--require` preload -- see
   [section 3](#replacing-setupfilesaftereach-and-globalsetup)). Keep polyfill-style setup as
   `"require"` entries.
6. `grep` for `test.each(`, `it.each(`, `describe.each(`, `test.todo(`, `test.concurrent(` and a
   numeric third argument to `it(`/`test(`/hook calls; rewrite per section 3.
7. `grep` for `jest.fn`, `jest.mock`, `jest.spyOn`, `jest.useFakeTimers`, `vi.fn`, `vi.mock`,
   `vi.spyOn`, `vi.useFakeTimers`, `toMatchSnapshot`, `toMatchInlineSnapshot`,
   `toHaveBeenCalled`, `expect.any(`, `expect.objectContaining(`, `expect.assertions(`, `.resolves.`,
   `.rejects.` -- this is the list of tests that need redesign (sections 4.5, 4.6, 7), so size
   the work before touching matchers.
8. Decide the TypeScript staging from section 2. **File by file**: keep `@types/jest`, add
   `import { describe, it, expect } from "@nevware21/tripwire"` to each file as you convert it.
   **All at once**: `npm uninstall jest @types/jest ts-jest` (`vitest` and its `@vitest/*`
   packages), `npm install @nevware21/tripwire-globals --save-dev`, add it to
   `compilerOptions.types`, and let `TS2339: Property 'toBe' does not exist` list the remaining
   matchers for you. Do not do both at once -- see
   [Runner Troubleshooting](../runner-troubleshooting.md#typescript-duplicate-global-declarations).
9. Rewrite the matchers using section 4. `toBe` → `to.strictly.equal` (never `to.equal`),
   `toEqual` → `to.deep.equal`, `toStrictEqual` → `to.deep.strictly.equal`, property terminators
   get parentheses. `toThrow`/`toThrowError` usually need no change.
10. Run the suite. Fix any `Unsupported option: --x` from step 3, any `Invalid value for --timeout`
    from a leftover `-t`, and any `deep.equal` failure on an object with `undefined` fields
    (section 8, item 4).
11. Add `--fail-on-hook` (or `"failOnHook": true`) to the CI script, and `--type-check` (plus
    `--strict-type-check`) if `ts-jest` used to type-check for you.
12. If the suite used `testEnvironment: "jsdom"` or `environment: "happy-dom"`, add
    `--target browser` to the script (and `puppeteer` to devDependencies). Guard any node-only
    API the shared test files touch.
13. Optional: add `--target worker` for a Web Worker run of the same suite, and `--coverage
    --coverage-src "<your sources>"` to the browser/worker script in place of `collectCoverage`.

---

## 11. Machine-readable summary

For automated migrations. Every entry is derived from the tables above. Keys of the mapping
objects are the Jest/Vitest names; values are the tripwire replacement, or `null` for "no
equivalent". Every `--flag` that appears in a value is accepted by the current CLI, every entry
in `matcherMapping` is a chain that exists on tripwire's `expect`, and every entry in
`suiteApiExports` is exported from `@nevware21/tripwire` -- a test in this repository checks each
of those claims against the code.

```json
{
  "package": "@nevware21/tripwire",
  "cliCommand": "tripwire",
  "replacesCommands": ["jest", "vitest", "vitest run"],
  "removeDependencies": ["jest", "@types/jest", "ts-jest", "babel-jest", "@jest/globals", "jest-environment-jsdom", "jest-environment-node", "vitest", "@vitest/coverage-v8", "@vitest/coverage-istanbul", "@vitest/browser", "@vitest/ui"],
  "removeDependenciesIfOnlyUsedAsTestEnvironment": ["jsdom", "happy-dom"],
  "addDependencies": ["@nevware21/tripwire", "@nevware21/tripwire-globals"],
  "addDependenciesForBrowserTarget": ["puppeteer"],
  "addDependenciesForNodeCoverage": ["nyc"],
  "configFile": {
    "from": ["jest.config.js", "jest.config.ts", "jest.config.mjs", "jest.config.cjs", "jest.config.json", "package.json#jest", "vitest.config.ts", "vitest.config.js", "vitest.config.mts", "vite.config.ts#test"],
    "to": [".tripwirerc", ".tripwirerc.json", ".tripwirerc.js", ".tripwirerc.cjs", "tripwire.config.json", "tripwire.config.js", "tripwire.config.cjs"]
  },
  "targets": { "node": "--target node (default)", "browser": "--target browser (a real browser via puppeteer)", "worker": "--target worker (a Web Worker)" },
  "testEnvironmentToTarget": { "node": "node", "jsdom": "browser", "happy-dom": "browser", "jest-environment-jsdom": "browser", "jest-environment-node": "node" },
  "defaults": { "timeoutMs": 2000, "jestTimeoutMs": 5000, "vitestTimeoutMs": 5000, "typeCheck": false, "reporter": "spec", "coverageSrc": ["src/**/*.ts"] },
  "cliFlagMapping": {
    "<positional path regex>": "the positional file glob (required unless a config file sets spec)",
    "--testPathPattern": "the positional file glob",
    "--testPathIgnorePatterns": "--ignore",
    "--testNamePattern": "--grep or -g (never -t: tripwire's -t is --timeout)",
    "-t": "--grep or -g",
    "--testTimeout": "--timeout or -t",
    "--bail": "--bail (boolean; no failure-count argument)",
    "-b": "--bail",
    "--watch": "--watch",
    "--watchAll": "--watch",
    "--coverage": "--coverage (browser and worker targets); wrap the node target in nyc",
    "--collectCoverage": "--coverage (browser and worker targets); wrap the node target in nyc",
    "--coverageReporters": "--coverage-reporter",
    "--collectCoverageFrom": "--coverage-src",
    "--env": "--target (node, browser or worker; jsdom becomes browser). Tripwire's own --env is an alias of --target and takes only those three values",
    "--testEnvironment": "--target",
    "--reporters": "--reporter",
    "--json": "--reporter json (stdout)",
    "--verbose": "--reporter spec, the default (tripwire's own --verbose is the embedded server's HTTP request log)",
    "--listTests": "--show-files (then the run proceeds; add a --grep that matches nothing to stop there)",
    "--rootDir": "the positional file glob",
    "--roots": "the positional file glob",
    "--help": "--help",
    "-h": "--help",
    "--config": null,
    "-c": null,
    "--runInBand": null,
    "-i": null,
    "--maxWorkers": null,
    "-w": null,
    "--maxConcurrency": null,
    "--shard": null,
    "--updateSnapshot": null,
    "-u": null,
    "--ci": null,
    "--onlyChanged": null,
    "-o": null,
    "--changedSince": null,
    "--lastCommit": null,
    "--findRelatedTests": null,
    "--passWithNoTests": null,
    "--silent": null,
    "--noStackTrace": null,
    "--expand": null,
    "--useStderr": null,
    "--outputFile": null,
    "--testLocationInResults": null,
    "--detectOpenHandles": null,
    "--forceExit": null,
    "--logHeapUsage": null,
    "--coverageThreshold": null,
    "--coverageDirectory": null,
    "--clearMocks": null,
    "--resetMocks": null,
    "--restoreMocks": null,
    "--randomize": null,
    "--seed": null,
    "--selectProjects": null,
    "--projects": null,
    "--injectGlobals": null,
    "--notify": null,
    "--showConfig": null,
    "--debug": null,
    "--errorOnDeprecated": null,
    "--init": null,
    "--version": null
  },
  "unsupportedFlagBehavior": "run fails with 'Unsupported option: <flag>' and prints usage; a leftover -t <name> fails with 'Invalid value for --timeout'",
  "configMapping": {
    "testMatch": "spec",
    "testRegex": "spec (convert the regex to a glob)",
    "testPathIgnorePatterns": "ignore (globs, not regexes)",
    "rootDir": "prefix the spec globs; there is no <rootDir> token",
    "roots": "prefix the spec globs",
    "moduleFileExtensions": "the glob's extension list",
    "testTimeout": "timeout (ms; default 2000 where Jest's was 5000)",
    "slowTestThreshold": "slow (ms; Jest's value is in seconds)",
    "bail": "bail (boolean only)",
    "verbose": "reporters: [\"spec\"] (the default)",
    "reporters": "reporters (built-in names or a custom module specifier, not a Jest reporter class)",
    "collectCoverage": "coverage (browser and worker targets; nyc for node)",
    "collectCoverageFrom": "coverageSrc",
    "coverageReporters": "coverageReporters",
    "coverageDirectory": null,
    "coverageThreshold": null,
    "coveragePathIgnorePatterns": null,
    "coverageProvider": null,
    "testEnvironment": "target (jsdom -> browser, node -> node); or keep jsdom on the node target with require: [\"jsdom-global/register\"]",
    "testEnvironmentOptions": null,
    "setupFiles": "require (browser and worker targets accept file paths only)",
    "setupFilesAfterEach": "require for setup that does not call the test API; hooks move to the top level of a test file the spec glob matches",
    "globalSetup": "a top-level beforeAll in a test file the spec glob matches",
    "globalTeardown": "a top-level afterAll in a test file the spec glob matches",
    "preset": null,
    "transform": null,
    "globals.ts-jest.tsconfig": "project",
    "globals.ts-jest.diagnostics": "typeCheck (default false)",
    "globals": "set injected values in a require preload",
    "injectGlobals": "nothing -- the runner always installs the globals",
    "moduleNameMapper": null,
    "moduleDirectories": null,
    "modulePaths": null,
    "resolver": null,
    "cache": "emitCache (node target compile cache; default true)",
    "cacheDirectory": null,
    "watchPathIgnorePatterns": null,
    "watchman": null,
    "maxWorkers": null,
    "maxConcurrency": null,
    "workerIdleMemoryLimit": null,
    "projects": null,
    "displayName": null,
    "testSequencer": null,
    "randomize": null,
    "snapshotSerializers": null,
    "snapshotFormat": null,
    "snapshotResolver": null,
    "clearMocks": null,
    "resetMocks": null,
    "restoreMocks": null,
    "resetModules": null,
    "automock": null,
    "unmockedModulePathPatterns": null,
    "fakeTimers": null,
    "passWithNoTests": null,
    "detectOpenHandles": null,
    "forceExit": null,
    "openHandlesTimeout": null,
    "testFailureExitCode": null,
    "errorOnDeprecated": null,
    "notify": null,
    "silent": null,
    "testResultsProcessor": null,
    "extensionsToTreatAsEsm": null
  },
  "vitestConfigMapping": {
    "test.include": "spec",
    "test.exclude": "ignore",
    "test.environment": "target (jsdom and happy-dom -> browser, node -> node)",
    "test.globals": "nothing at runtime; TypeScript opts in via @nevware21/tripwire-globals",
    "test.setupFiles": "require (browser and worker targets accept file paths only; hooks move to a matched test file)",
    "test.globalSetup": "a top-level beforeAll/afterAll in a test file the spec glob matches",
    "test.testTimeout": "timeout",
    "test.hookTimeout": "timeout (one value covers tests and hooks)",
    "test.slowTestThreshold": "slow",
    "test.retry": "retries",
    "test.bail": "bail (boolean)",
    "test.reporters": "reporters",
    "test.outputFile": null,
    "test.coverage.enabled": "coverage (browser and worker targets; nyc for node)",
    "test.coverage.include": "coverageSrc",
    "test.coverage.reporter": "coverageReporters",
    "test.coverage.thresholds": null,
    "test.coverage.provider": null,
    "test.coverage.reportsDirectory": null,
    "test.watch": "watch",
    "test.alias": null,
    "resolve.alias": null,
    "test.pool": null,
    "test.poolOptions": null,
    "test.isolate": null,
    "test.fileParallelism": null,
    "test.maxConcurrency": null,
    "test.sequence.shuffle": null,
    "test.sequence.seed": null,
    "test.typecheck": null,
    "test.browser.enabled": "--target browser",
    "test.browser.headless": "--browser-launch puppeteer (default) for headless, --browser-launch open or manual for a visible browser",
    "test.benchmark": null
  },
  "matcherMapping": {
    "toBe": "expect(x).to.strictly.equal(y)",
    "toEqual": "expect(x).to.deep.equal(y)",
    "toStrictEqual": "expect(x).to.deep.strictly.equal(y)",
    "not.toBe": "expect(x).to.not.strictly.equal(y)",
    "not.toEqual": "expect(x).to.not.deep.equal(y)",
    "not.toStrictEqual": "expect(x).to.not.deep.strictly.equal(y)",
    "toBeTruthy": "expect(x).to.be.truthy()",
    "toBeFalsy": "expect(x).to.not.be.truthy()",
    "toBe(true)": "expect(x).to.be.true()",
    "toBe(false)": "expect(x).to.be.false()",
    "toBe(NaN)": "expect(x).to.be.nan()",
    "toBeNull": "expect(x).to.be.null()",
    "toBeUndefined": "expect(x).to.be.undefined()",
    "toBeDefined": "expect(x).to.not.be.undefined()",
    "toBeNaN": "expect(x).to.be.nan()",
    "toBeGreaterThan": "expect(x).to.be.above(y)",
    "toBeGreaterThanOrEqual": "expect(x).to.be.at.least(y)",
    "toBeLessThan": "expect(x).to.be.below(y)",
    "toBeLessThanOrEqual": "expect(x).to.be.at.most(y)",
    "toBeCloseTo": "expect(x).to.be.closeTo(y, delta)",
    "toMatch(regexp)": "expect(x).to.match(re)",
    "toMatch(string)": "expect(x).to.include(sub)",
    "toContain": "expect(x).to.include(item)",
    "toContainEqual": "expect(x).to.deep.include(item)",
    "toHaveLength": "expect(x).to.have.lengthOf(n)",
    "toHaveProperty(name)": "expect(x).to.have.property(name)",
    "toHaveProperty(name, value)": "expect(x).to.have.property(name, value)",
    "toHaveProperty(path, value)": "expect(x).to.have.nested.property(path, value)",
    "toMatchObject": "expect(x).to.deep.include(subset)",
    "toBeInstanceOf": "expect(x).to.be.instanceOf(C)",
    "toEqual(expect.arrayContaining)": "expect(x).to.include.members(items)",
    "toBeTypeOf": "expect(x).is.typeOf(type)",
    "toThrow": "expect(fn).toThrow()",
    "toThrow(message)": "expect(fn).toThrow(message)",
    "toThrow(ErrorClass)": "expect(fn).toThrow(ErrorClass)",
    "toThrowError": "expect(fn).toThrowError()",
    "not.toThrow": "expect(fn).to.not.throw()",
    "resolves": null,
    "rejects": null,
    "toHaveBeenCalled": null,
    "toHaveBeenCalledTimes": null,
    "toHaveBeenCalledWith": null,
    "toHaveBeenLastCalledWith": null,
    "toHaveBeenNthCalledWith": null,
    "toHaveReturned": null,
    "toHaveReturnedWith": null,
    "toMatchSnapshot": null,
    "toMatchInlineSnapshot": null,
    "toThrowErrorMatchingSnapshot": null,
    "toSatisfy": null,
    "expect.any": null,
    "expect.anything": null,
    "expect.stringContaining": null,
    "expect.stringMatching": null,
    "expect.objectContaining": null,
    "expect.closeTo": null,
    "expect.assertions": null,
    "expect.hasAssertions": null,
    "expect.extend": null
  },
  "matcherMappingNotes": {
    "toBe": "=== rather than Object.is: NaN needs to.be.nan(); +0 and -0 compare equal. Never to.equal, which is loose == in tripwire",
    "toEqual": "deep.equal compares enumerable key sets, so { a: undefined } is not equal to {} -- Jest's toEqual ignored undefined-valued properties",
    "toBeCloseTo": "closeTo takes an absolute delta; Jest's digit count n means |x - y| < 10^-n / 2, so the default (2) becomes 0.005",
    "toMatchObject": "deep.include checks each key of the subset with deep equality on the whole nested value; it is not a recursive subset match",
    "toHaveProperty(path, value)": "array paths ([\"a\", \"b\"]) are not accepted; join them with a dot",
    "resolves": "await the promise and assert on the value",
    "rejects": "await in try/catch, assert on the caught error, and call assert.fail after the await so a resolution fails the test",
    "expect.extend": "addAssertInstFunc / addAssertInstFuncDefs from @nevware21/tripwire add chain words; see docs/expression-adapter.md#creating-custom-assertions",
    "assertStyleEquivalents": "every mapped matcher also has an assert.* form (strictEqual, deepEqual, deepStrictEqual, notDeepStrictEqual, isTrue, isNull, isUndefined, isDefined, isNaN, isAbove, isAtLeast, isBelow, isAtMost, closeTo, match, includes, lengthOf, hasProperty, nestedProperty, isInstanceOf, includeMembers, throws, doesNotThrow)"
  },
  "matchersUnsupported": ["resolves", "rejects", "toHaveBeenCalled", "toHaveBeenCalledTimes", "toHaveBeenCalledWith", "toHaveBeenLastCalledWith", "toHaveBeenNthCalledWith", "toHaveReturned", "toHaveReturnedWith", "toMatchSnapshot", "toMatchInlineSnapshot", "toThrowErrorMatchingSnapshot", "toSatisfy", "expect.any", "expect.anything", "expect.stringContaining", "expect.stringMatching", "expect.objectContaining", "expect.closeTo", "expect.assertions", "expect.hasAssertions"],
  "suiteApi": {
    "describe": "describe",
    "it": "it",
    "test": "test",
    "describe.only": "describe.only (also fdescribe)",
    "it.only": "it.only (also fit)",
    "test.only": "test.only",
    "describe.skip": "describe.skip (also xdescribe)",
    "it.skip": "it.skip (also xit)",
    "test.skip": "test.skip",
    "test.todo": "it(name) with no function -- reported as pending",
    "beforeAll": "beforeAll (also before)",
    "afterAll": "afterAll (also after)",
    "beforeEach": "beforeEach",
    "afterEach": "afterEach",
    "done callback": "same, detected by function arity",
    "async / returned promise": "same",
    "it(name, fn, timeoutMs)": "not accepted -- this.timeout(ms) inside a function-style test, or --timeout",
    "beforeAll(fn, timeoutMs)": "not accepted -- this.timeout(ms) inside the hook, or --timeout",
    "jest.setTimeout": "--timeout / config timeout / this.timeout(ms) in a describe body",
    "jest.retryTimes": "--retries / config retries / this.retries(n)",
    "describe.each": null,
    "it.each": null,
    "test.each": null,
    "test.concurrent": null,
    "test.failing": null,
    "jest.fn": null,
    "jest.mock": null,
    "jest.spyOn": null,
    "jest.requireActual": null,
    "jest.isolateModules": null,
    "jest.useFakeTimers": null,
    "vi.fn": null,
    "vi.mock": null,
    "vi.spyOn": null,
    "vi.useFakeTimers": null
  },
  "suiteApiExports": ["describe", "it", "test", "describe.only", "describe.skip", "it.only", "it.skip", "test.only", "test.skip", "fdescribe", "xdescribe", "fit", "xit", "beforeAll", "afterAll", "beforeEach", "afterEach", "before", "after", "assert", "expect"],
  "globals": {
    "installedByRunnerAtRuntime": ["describe", "it", "test", "before", "after", "beforeEach", "afterEach", "beforeAll", "afterAll", "fdescribe", "fit", "xdescribe", "xit", "assert", "expect"],
    "typescriptOptIn": ["compilerOptions.types += \"@nevware21/tripwire-globals\"", "compilerOptions.types += \"@nevware21/tripwire/globals\"", "/// <reference types=\"@nevware21/tripwire-globals\" />", "import \"@nevware21/tripwire-globals\" (also installs the names at runtime)"],
    "alternative": "import { describe, it, expect } from \"@nevware21/tripwire\" -- never clashes; the replacement for import from \"@jest/globals\"",
    "typesJestClash": {
      "globalsDeclaredByTypesJest": 12,
      "occursWhen": "the project opts in to tripwire's globals while @types/jest is still in the program",
      "error": "TS2403 Subsequent variable declarations must have the same type",
      "fix": "uninstall @types/jest first, or do not opt in and import the names per file",
      "afterRemoval": "expect() is tripwire's everywhere; un-migrated matchers fail with TS2339 Property 'toBe' does not exist on type 'IAssertInst' -- that error list is the remaining matcher work",
      "guide": "docs/runner-troubleshooting.md#typescript-duplicate-global-declarations"
    }
  },
  "unsupported": ["mocking and spies (jest.fn, jest.mock, jest.spyOn, vi.fn, vi.mock, toHaveBeenCalled*)", "module mocking and per-file module isolation", "snapshots", "fake timers", "parallel worker processes", "jsdom or happy-dom simulation (a real browser runs instead)", "interactive watch-mode key filtering (the browser runner page has a scope box instead)", "coverage thresholds", "asymmetric matchers", "expect.assertions", "test.each and describe.each", "test.concurrent and test.failing", "per-test and per-hook timeout arguments", "moduleNameMapper and custom resolvers", "a config file path flag (config is discovered as .tripwirerc)"],
  "behaviorDifferences": [
    "the default timeout is 2000 ms, not 5000 -- set --timeout 5000 to keep Jest's",
    "-t is --timeout, not a test-name pattern; use --grep or -g",
    "to.equal is loose ==; toBe maps to to.strictly.equal (or assert.strictEqual)",
    "deep.equal does not ignore undefined-valued properties the way toEqual did",
    "one process and one module registry: module state and process.env edits are shared across test files",
    "--target browser is a real browser via puppeteer, not jsdom; the worker target is a Web Worker with no DOM",
    "hook failures are non-fatal unless --fail-on-hook is set; a suite whose beforeAll threw is reported as skipped",
    "--watch re-runs on change but has no key menu; the interactive browser page filters by a scope box",
    "a run that matches no tests always exits non-zero",
    "type checking of .ts test files is opt-in via --type-check, where ts-jest checked by default",
    "globals are installed by the runner, not by importing the package; node-target preloads run before they exist",
    "unrecognized flags fail the run, and '--' starts additional file patterns rather than a passthrough list"
  ],
  "relatedGuides": {
    "runnerFlagsInDepth": "docs/migration/migrating-from-mocha.md",
    "browserTarget": "docs/migration/migrating-from-karma.md",
    "assertions": "docs/migration/migrating-from-chai.md",
    "assertStyle": "docs/migration/migrating-from-node-assert.md",
    "runnerReference": "docs/test-runner.md",
    "troubleshooting": "docs/runner-troubleshooting.md",
    "globalsPackage": "globals/README.md",
    "customAssertions": "docs/expression-adapter.md#creating-custom-assertions"
  }
}
```
