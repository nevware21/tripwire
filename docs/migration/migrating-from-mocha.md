# Migrating from Mocha to the Tripwire Test Runner

This guide helps you move a [Mocha](https://mochajs.org/) test suite to the
[Tripwire](https://github.com/nevware21/tripwire) CLI test runner (`tripwire`), which runs the
same `describe`/`it` suites against **node**, **browser** and **worker** targets. It is written
for both human readers and AI-assisted migrations (Copilot, Claude, and similar) -- section 9 is
a deterministic checklist and section 10 a machine-readable summary of every mapping below.

Related guides:

- [Test Runner, CLI & Configuration](../test-runner.md) - the full CLI/config reference
- [Runner Troubleshooting](../runner-troubleshooting.md) - **read this if you hit TypeScript
  `Duplicate identifier`/`Subsequent variable declarations` errors after installing tripwire**
- [Migrating from Chai](migrating-from-chai.md) / [from node assert](migrating-from-node-assert.md)
  - for the assertions *inside* your tests, which this guide does not cover

---

## 1. Overview

Mocha and tripwire share the same test-definition vocabulary, so the test files themselves
usually need **no changes at all**. What changes is the runner: the command you invoke, the
config file it reads, and a handful of Mocha features that have no tripwire equivalent.

| Area | Effort |
|---|---|
| Test files (`describe`/`it`/hooks) | **None** in most suites -- see section 3 for the exceptions (`context()`, `specify()`) |
| Assertions | None if you already use tripwire/chai-shim; otherwise see the assertion guides above |
| npm scripts / CLI flags | **Low** - mostly a 1:1 flag rename, see section 4 |
| `.mocharc.*` config | **Low** - rewrite as `.tripwirerc`, see section 5 |
| `--parallel`, root hook plugins, reporter options | **Not supported** - see section 7 |
| TypeScript `@types/mocha` in the same project (or `@types/jest`/`@types/jasmine`) | **None** - installing tripwire declares no globals, so nothing breaks. Its global names are opt-in, and opting in *while* the other package is present is the one combination that clashes -- see [section 2](#2-install-and-switch-the-command) |

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
        "test": "mocha \"test/**/*.test.js\"",
        "test:ts": "ts-mocha -p ./test/tsconfig.json \"test/**/*.test.ts\""
    }
}
```

**After**:

```jsonc
{
    "scripts": {
        "test": "tripwire \"test/**/*.test.js\"",
        "test:ts": "tripwire -p ./test/tsconfig.json \"test/**/*.test.ts\""
    }
}
```

TypeScript needs no separate runner: tripwire transpiles `.ts` test files on load through its own
require hook (no `ts-node`/`ts-mocha` dependency). `--project`/`-p` selects the tsconfig, exactly
as `ts-mocha`'s `-p` did; `--tsProject`/`--ts-project` are accepted as aliases so an existing
`ts-mocha` command line usually works unchanged. Add `--type-check` to fail the run on type
errors; `--transpile-only` is the default and turns checking back off. They are exact opposites
writing one setting, so the last one on the command line wins, and either beats a config-file
`typeCheck`. `ts-mocha`'s own `--type-check` and `--transpile-only` therefore carry across with
the same meaning.

`--type-check` checks the **tsconfig project**, while the run executes whatever the **glob**
matched -- and during a migration those two are unusually likely to disagree, since the glob came
from the Mocha command line and the tsconfig did not. A file outside the project's
`include`/`files` still runs, just unchecked; tripwire warns and names the files when that
happens. Add `--strict-type-check` in CI to make it a failure instead of a warning. See
[what `--type-check` actually checks](../test-runner.md#what---type-check-actually-checks).

> **Quote your globs.** As with Mocha, let the runner expand the pattern rather than the shell.

### TypeScript: the global `describe`/`it` names

The runner installs the globals itself, so nothing changes at runtime. TypeScript is the part
that needs a decision, because installing tripwire declares no ambient globals -- deliberately,
so that it can sit next to `@types/mocha` (or `@types/jest`/`@types/jasmine`) during the
migration without breaking the build.

**While `@types/mocha` is still installed**, leave the globals alone. The bare `describe`/`it` in
your existing files keep resolving to mocha's declarations and keep compiling; tripwire's runner
supplies the matching functions at runtime. Nothing to configure.

**Once `@types/mocha` is gone** (`npm uninstall @types/mocha`), the bare names have no
declaration, so opt in to tripwire's:

```jsonc
// tsconfig.json -- keep every other entry the project relies on
{ "compilerOptions": { "types": ["node", "@nevware21/tripwire/globals"] } }
```

Adding `@nevware21/tripwire-globals` as a dependency and listing that instead is equivalent, as is
a `/// <reference types="@nevware21/tripwire/globals" />` in any single file. Alternatively, skip
the globals and import the names per file -- `import { describe, it } from "@nevware21/tripwire"`
-- which works with or without the other `@types` package present.

Opting in *before* removing the other package is the one combination that fails; see
[Runner Troubleshooting](../runner-troubleshooting.md#typescript-duplicate-global-declarations).

Run the same suite in a real browser or a Web Worker -- the main reason to adopt the runner:

```bash
tripwire --target browser "test/**/*.test.ts"
tripwire --target worker  "test/**/*.test.ts"
```

---

## 3. Test file API

Every one of these works exactly as it does in Mocha, as a global (installed by the runner, typed
via the [opt-in globals entry](#typescript-the-global-describeit-names)) or as a named import
from `@nevware21/tripwire`:

| Mocha | Tripwire | Notes |
|---|---|---|
| `describe` / `it` | ✅ same | |
| `describe.only` / `it.only` | ✅ same | Also `fdescribe`/`fit` (Jasmine style) |
| `describe.skip` / `it.skip` | ✅ same | Also `xdescribe`/`xit` |
| `it("pending")` (no callback) | ✅ same | Reported as pending |
| `before` / `after` / `beforeEach` / `afterEach` | ✅ same | Also `beforeAll`/`afterAll` (Jasmine style) |
| Named hooks (`before("name", fn)`) | ✅ same | The name is used in hook-failure reports |
| `suite` / `test` (TDD interface) | ✅ same | Available without a `--ui` flag |
| `done` callback (`it("x", (done) => ...)`) | ✅ same | Detected by function arity, as in Mocha |
| `done(err)` / `done.fail(err)` | ✅ same | |
| Returning a `Promise` / `async` test | ✅ same | |
| `this.timeout(ms)` | ✅ same | Also settable per run with `--timeout` |
| `this.slow(ms)` / `this.retries(n)` | ✅ same | |
| `this.skip()` | ✅ same | In a test or a hook |
| `this.currentTest` | ⚠️ different shape | Exists in hooks, but is tripwire's `ITestCase` (`id`, `description`, `fn`, `only`, `skip`, `timeout`, `slow`, `retries`) -- Mocha's `.title`, `.state`, `.fullTitle()` and `.parent` are `undefined`. Use `.description` for the title |
| **`context()` / `specify()`** | ❌ **not available** | Rename to `describe()` / `it()` |
| **`xcontext()` / `xspecify()`** | ❌ **not available** | Rename to `xdescribe()` / `xit()` |
| **Root hook plugins (`mochaHooks`)** | ❌ **not available** | Declare the hook at the top level of a test file -- see below |

`context`/`specify` are the only commonly used Mocha aliases with no tripwire equivalent, and
they fail loudly (the file fails to load with `ReferenceError: context is not defined`), so a
find/replace before the first run is enough:

```bash
# context( -> describe(   and   specify( -> it(
```

### Replacing root hook plugins

Every test file in a run is loaded into the **same root suite**, so a hook declared at the top
level of any loaded file -- outside every `describe` -- applies to the entire run, which is what
Mocha's `mochaHooks` root hook plugin provided:

```js
// test/root-hooks.test.js -- matched by the same glob as every other test file
beforeEach(function () {
    resetTestDatabase();
});
```

Do **not** put these in a `--file`/`--require` preload. On the `node` target a preload is
`require()`d before the runner installs the globals and before the root suite exists, so
`beforeEach` is not defined there and the file fails to load. (The `browser`/`worker` targets
happen to load preloads as the first modules of the suite, after the globals exist, so a hook
declared there does register -- but relying on that makes the file break the moment it runs under
`--target node`.) Preloads are for setup that does not touch the tripwire API (polyfills,
environment variables, `jsdom`, and similar); a hook belongs in a file the run's glob matches.

---

## 4. CLI flag mapping

Flags tripwire accepts with the same name and meaning as Mocha:

| Mocha | Tripwire | Notes |
|---|---|---|
| `--spec <glob>` | `--spec <glob>` | Or just pass the glob positionally |
| `--file <path>` | `--file <path>` | Preloaded before the suite |
| `--require <mod>`, `-r` | `--require <mod>`, `-r` | `node` target: a module name or a path, as in Mocha. **`browser`/`worker`: file paths only** (`./setup.ts`) -- see below |
| `--grep <re>`, `-g` | `--grep <re>`, `-g` | |
| `--fgrep <str>`, `-f` | `--fgrep <str>`, `-f` | |
| `--invert` | `--invert` | |
| `--bail`, `-b` | `--bail`, `-b` | |
| `--timeout <ms>`, `-t` | `--timeout <ms>`, `-t` | |
| `--slow <ms>`, `-s` | `--slow <ms>`, `-s` | |
| `--retries <n>` | `--retries <n>` | |
| `--reporter <name>` | `--reporter <name>` | **No `-R` short form.** Repeatable/comma-separated for several at once. A custom reporter module is also accepted, `node` target only -- see below |
| `--watch` | `--watch` | **No `-w` short form.** See the CLI guide for which targets it applies to |
| `--ignore <glob>` / `--exclude <glob>` | `--ignore <glob>` | Only the `--ignore` spelling |
| `--help`, `-h` | `--help`, `-h` | |

**Preloads on the browser/worker targets.** `--require`/`--file` values are resolved exactly as
Mocha's are on the `node` target (a package name such as `jsdom-global/register`, or a path). The
`browser` and `worker` targets bundle the preload into the served module graph instead, and that
currently accepts **file paths only**: a bare module name fails the run with
`Browser/worker preload currently supports file paths only`. Write a small `./test/setup.ts` that
imports the package and pass that path instead.

List-valued flags (`--spec`, `--ignore`, `--grep`/`--fgrep`, `--require`/`--file`) **add to** the
matching `.tripwirerc` list rather than replacing it; `--reporter` is the exception and replaces
the file's `reporters`. See [section 5](#5-mocharc--tripwirerc).

Renamed or replaced:

| Mocha | Tripwire | Notes |
|---|---|---|
| `--recursive` | *(none)* | Use a recursive glob instead: `"test/**/*.test.js"` |
| `--extension <ext>` | *(none)* | Put the extension in the glob: `"test/**/*.{js,ts}"` |
| `--config <path>` / `--package <path>` | *(none)* | Config is discovered as `.tripwirerc` -- see section 5 |
| `--ui bdd\|tdd` | *(none needed)* | Both interfaces are always available |
| `--list-reporters` | `--help` | The help output lists every built-in reporter name |
| `ts-mocha -p <tsconfig>` | `--project <tsconfig>`, `-p` | `--tsProject`/`--ts-project` also accepted |

Tripwire additions with no Mocha equivalent -- see [the CLI reference](../test-runner.md) for the
full list:

| Flag | Purpose |
|---|---|
| `--target <node\|browser\|worker>` | Run the same suite in a browser or Web Worker |
| `--fail-on-hook` | Fail the run when a lifecycle hook fails -- see [Hook failures](../test-runner.md#hook-failures) |
| `--coverage`, `--coverage-reporter` | Browser/worker coverage collection and reporting |
| `--trace` | Print each test *and assertion* as it executes |
| `--show-files` | Print the matched file list before running |

Reporter names match Mocha's built-in set, so `--reporter` values usually carry over unchanged:
`spec`, `dot`, `tap`, `json`, `json-stream`, `min`, `list`, `progress`, `landing`, `nyan`, `doc`,
`markdown`, `xunit`.

**Custom reporters.** As in Mocha, `--reporter` also takes a module -- a path
(`./reporters/mine.js`), a scoped package, or `module:<package>` for a bare package name (Mocha
resolves bare names by trying the built-ins first; tripwire requires the prefix instead, so a
mistyped built-in stays a typo). The module exports a listener, a `{ listener }` object, or a
`createReporter(options)` factory returning either -- **not** a Mocha reporter class, whose
`runner.on("pass", ...)` event names have no equivalent here. See
[Custom reporters](../reporters.md#custom-reporters). Applies to the `node` target; the browser
and worker targets build their reporters inside the page/worker and take built-in names only.

> **Unrecognized flags are an error, not a warning.** Anything starting with `-` that tripwire
> does not know fails the run with `Unsupported option: --x` and prints the usage. This is
> deliberate -- a silently ignored `--parallel` would be worse -- but it means leftover Mocha
> flags surface on the very first run rather than at some later point.

Note also that a bare `--` does **not** introduce a passthrough argument list as it does for some
runners: everything after it is treated as an additional file pattern (useful when a glob starts
with `-`).

---

## 5. `.mocharc.*` → `.tripwirerc`

Tripwire does not read `.mocharc.*`. It looks for `.tripwirerc`, `.tripwirerc.json`,
`.tripwirerc.js`/`.cjs`, `tripwire.config.json`, or `tripwire.config.js`/`.cjs` in every
directory from the cwd up to the filesystem root, plus a `~/.tripwirerc`-style file in the home
directory, and merges them with the file closest to the cwd winning -- so a monorepo can set
shared defaults once at the root. Where several of those names exist in one directory, the one
listed last wins. The list-valued fields `spec`, `ignore`, `grep` and `require` are concatenated
across levels instead of replaced, and the matching CLI flags append to them too; every other
setting is replaced by a CLI flag, as is `reporters` (`--reporter` replaces rather than adds). See
[Config Files](../test-runner.md#config-files-tripwirerc) for the full rules.

**Before** (`.mocharc.json`):

```jsonc
{
    "spec": ["test/**/*.test.ts"],
    "require": ["ts-node/register"],
    "timeout": 10000,
    "slow": 200,
    "retries": 1,
    "bail": false,
    "reporter": "spec",
    "ignore": ["**/fixtures/**"]
}
```

**After** (`.tripwirerc`):

```jsonc
// JSONC-style // comments are allowed
{
    "spec": ["test/**/*.test.ts"],
    // no ts-node/register -- tripwire transpiles .ts itself
    "project": "./test/tsconfig.json",
    "timeout": 10000,
    "slow": 200,
    "retries": 1,
    "bail": false,
    "failOnHook": true,
    "reporters": ["spec"],
    "ignore": ["**/fixtures/**"]
}
```

Field notes:

- `reporter` is accepted, but `reporters` (an array) is the documented name.
- Mocha's `.mocharc` `fgrep` has no field of its own: `grep` (an array of regex strings, compiled
  case-insensitive) is the only pattern field, so escape a literal string yourself when moving an
  `fgrep` value into it. Every other setting has a config field; see the
  [full field reference](../test-runner.md#full-field-reference).

---

## 6. Assertions

The runner is independent of the assertion library your tests use -- migrating the runner does
not require migrating assertions in the same change. When you are ready:

- Coming from Chai: [Migrating from Chai](migrating-from-chai.md) (a Chai 5 `assert` shim exists)
- Coming from `node:assert`: [Migrating from node assert](migrating-from-node-assert.md)

Tripwire's own `assert`/`expect` are installed as globals by the runner as well, so a migrated
test file can drop the import entirely if you prefer -- in TypeScript that needs the
[globals opt-in](#typescript-the-global-describeit-names), and note that `expect` is one of the
names `@types/jest` also declares.

---

## 7. Mocha features with no tripwire equivalent

Each of these fails the run with `Unsupported option` if left on the command line:

| Mocha feature | Status | Suggested approach |
|---|---|---|
| `--parallel`, `--jobs`/`-j` | ❌ Not supported | Runs are single-process. **Note `--target worker` is unrelated** -- it means "run the suite inside a Web Worker", not "run tests in parallel worker processes" |
| Root hook plugins (`mochaHooks` export) | ❌ Not supported | Declare the hook at the top level of a loaded test file -- see [section 3](#replacing-root-hook-plugins). A `--file`/`--require` preload will *not* work on the `node` target: it runs before the globals exist |
| `--reporter-option`/`-O` | ❌ Not supported | Reporter options are set programmatically; the CLI exposes `--slow`/`--trace` only |
| `--forbid-only`, `--forbid-pending` | ❌ Not supported | Enforce with a lint rule or a review check |
| `--check-leaks`, `--global` | ❌ Not supported | |
| `--delay` | ❌ Not supported | |
| `--dry-run` | ❌ Not supported | Use `--grep` with a non-matching pattern plus `--show-files` to inspect discovery |
| `--sort` | ❌ Not supported | Files run in glob-resolution order |
| `--async-only`, `--allow-uncaught` | ❌ Not supported | |
| `--color`/`--no-color`, `--inline-diffs` | ❌ Not supported | Color follows terminal/TTY detection |
| `--full-trace` | ❌ Not supported | Test failures already carry their own stack. For a stack from the *runner*, which is otherwise hidden, use `--debug-stack` |
| `--exit`/`--no-exit` | ❌ Not supported | |
| `--inspect`, `--node-option` | ❌ Not supported | Invoke node directly: `node --inspect ./node_modules/.bin/tripwire ...` |

---

## 8. Behavior differences worth knowing

1. **Hook failures.** A `before`/`after` hook that throws stops its own suite and no more -- the
   sibling suites run normally, as they do under Mocha. What differs is how it is *counted*: Mocha
   reports a broken hook as a failure, while tripwire records it separately on the run summary, so
   by default the run's exit code still reflects test results alone and the suite's own tests are
   reported as **skipped** rather than failed. Add
   [`--fail-on-hook`](../test-runner.md#hook-failures) to get Mocha-like "a broken hook fails the
   build" behavior (recommended in CI). Note it fails the run without *stopping* it -- every suite
   still executes, unlike Mocha's `--bail`.
2. **Globals are installed by the runner**, not by importing the package. Files loaded outside a
   `tripwire` run (a plain `node file.js`) see no `describe`; import from `@nevware21/tripwire`
   for that case, or `import "@nevware21/tripwire/globals"` to install the bare names. In
   TypeScript the bare names also need the
   [globals opt-in](#typescript-the-global-describeit-names) to type-check.
   On the `node` target, `--file`/`--require` preloads run *before* the globals are installed, so
   they cannot call `describe`/`it`/hooks there (see [section 3](#replacing-root-hook-plugins));
   on `browser`/`worker` they must be file paths, not package names.
3. **The `worker` target is a Web Worker**, and the `browser` target drives a real (headless
   Puppeteer, or manually opened) browser. Node-only APIs in shared test files need guarding.
4. **`--type-check` is opt-in, and checks the project rather than the glob.** By default `.ts`
   files are transpiled without type checking, so a type error that Mocha + `ts-node` would have
   surfaced only appears with `--type-check`. Even then, it checks the files the *tsconfig*
   resolves to -- a matched file outside that project runs unchecked. Tripwire warns and names
   those files; `--strict-type-check` fails the run on them instead, which is what you want in CI.

---

## 9. Migration checklist

Deterministic order, safe to follow step by step (by a person or an agent):

1. `npm install @nevware21/tripwire --save-dev`
2. Replace `mocha`/`ts-mocha` with `tripwire` in every `package.json` script; keep the glob.
3. Map each remaining CLI flag using section 4. Delete unsupported ones (section 7).
4. If a `.mocharc.*` exists, rewrite it as `.tripwirerc` using section 5, then delete it.
5. `grep` the test tree for `context(`, `specify(`, `xcontext(`, `xspecify(` and rename them to
   `describe(`, `it(`, `xdescribe(`, `xit(`.
6. `grep` for `mochaHooks` and move any root hooks to the top level of a test file that the run's
   glob already matches (not a `--file` preload -- see [section 3](#replacing-root-hook-plugins)).
7. If the project is TypeScript, decide how the bare `describe`/`it` names are typed. While
   `@types/mocha` (or `@types/jest`/`@types/jasmine`) is still installed, leave it as-is -- the
   existing declarations keep working. After uninstalling it, add
   `"@nevware21/tripwire/globals"` to `compilerOptions.types` (or depend on
   `@nevware21/tripwire-globals`), or import the names per file. Do not do both at once -- see
   [section 2](#typescript-the-global-describeit-names) and
   [Runner Troubleshooting](../runner-troubleshooting.md#typescript-duplicate-global-declarations).
8. Run the suite. Fix any `Unsupported option: --x` errors reported by step 3.
9. Add `--fail-on-hook` (or `"failOnHook": true`) to the CI script.
10. If the project is TypeScript and the CI script type-checks, add `--strict-type-check` too.
    The glob came from Mocha and the tsconfig did not, so any file the two disagree about runs
    unchecked -- this is the step that catches it rather than warning about it. Fix whatever it
    reports by widening the tsconfig's `include`, then leave the flag on.
11. Optional: add `--target browser` / `--target worker` scripts to run the same suite in a
    browser and a Web Worker.

---

## 10. Machine-readable summary

For automated migrations. Every entry is derived from the tables above.

```json
{
  "package": "@nevware21/tripwire",
  "cliCommand": "tripwire",
  "replacesCommands": ["mocha", "ts-mocha"],
  "configFile": {
    "from": [".mocharc", ".mocharc.json", ".mocharc.yml", ".mocharc.js", ".mocharc.cjs"],
    "to": [".tripwirerc", ".tripwirerc.json", ".tripwirerc.js", ".tripwirerc.cjs", "tripwire.config.json", "tripwire.config.js", "tripwire.config.cjs"]
  },
  "flagsUnchanged": ["--spec", "--file", "--require", "-r", "--grep", "-g", "--fgrep", "-f", "--invert", "--bail", "-b", "--timeout", "-t", "--slow", "-s", "--retries", "--reporter", "--watch", "--ignore", "--help", "-h"],
  "flagsUnchangedNotes": {
    "--require": "node target: a module name or a path, as in Mocha; browser/worker targets accept file paths only (./setup.ts) -- a bare module name fails with 'Browser/worker preload currently supports file paths only'",
    "--file": "same path-only rule as --require on the browser/worker targets",
    "--fgrep": "no config field of its own; config files have only the grep array (regex strings)"
  },
  "configPrecedence": {
    "listValuedFlagsAppendToConfig": ["--spec", "--ignore", "--grep", "--fgrep", "--require", "--file", "--coverage-reporter", "--coverage-src"],
    "replacesConfigList": ["--reporter"],
    "replacesOnlyTheConfigPartsItNames": ["--browser-theme"],
    "configKeysConcatenatedAcrossDirectories": ["grep", "ignore", "spec", "require"],
    "otherSettings": "the CLI flag replaces the config value; a config file closer to the cwd replaces one higher up"
  },
  "flagsRenamed": {
    "--exclude": "--ignore",
    "-R": "--reporter",
    "-w": "--watch",
    "-p (ts-mocha)": "--project",
    "--list-reporters": "--help"
  },
  "flagsRemovedUseGlobInstead": ["--recursive", "--extension"],
  "flagsUnsupported": ["--parallel", "-j", "--jobs", "--config", "--package", "--ui", "-u", "--reporter-option", "-O", "--forbid-only", "--forbid-pending", "--check-leaks", "--global", "--globals", "--delay", "--dry-run", "--sort", "--async-only", "-A", "--allow-uncaught", "--color", "--no-color", "-c", "--inline-diffs", "--diff", "--no-diff", "--full-trace", "--exit", "--no-exit", "--inspect", "--inspect-brk", "--node-option", "--growl"],
  "unsupportedFlagBehavior": "run fails with 'Unsupported option: <flag>' and prints usage",
  "globalsUnchanged": ["describe", "it", "before", "after", "beforeEach", "afterEach", "beforeAll", "afterAll", "suite", "test", "fdescribe", "fit", "xdescribe", "xit", "assert", "expect"],
  "globalsRenamed": { "context": "describe", "specify": "it", "xcontext": "xdescribe", "xspecify": "xit" },
  "reporterNames": ["spec", "dot", "tap", "json", "json-stream", "min", "list", "progress", "landing", "nyan", "doc", "markdown", "xunit", "cargo"],
  "typescript": {
    "transpilesTestFilesItself": true,
    "dropDependencies": ["ts-node/register", "ts-mocha"],
    "projectFlag": "--project",
    "typeCheckFlag": "--type-check",
    "transpileOnlyFlag": "--transpile-only",
    "typeCheckDefault": false,
    "typeCheckConfigField": "typeCheck",
    "typeCheckFlagPrecedence": "--type-check and --transpile-only are opposites writing one setting; the last flag on the command line wins, and any CLI flag beats the config file typeCheck value",
    "typeCheckTargets": ["node", "browser", "worker"],
    "typeCheckScope": "the tsconfig project, not the run's glob -- a matched file outside the project's include/files runs unchecked and is warned about",
    "typeCheckScopeFlag": "--type-check-scope",
    "typeCheckScopeValues": ["project", "run"],
    "typeCheckScopeDefault": "project",
    "typeCheckScopeConfigField": "typeCheckScope",
    "strictTypeCheckFlag": "--strict-type-check",
    "compileCache": {
      "note": "tripwire has no mocha equivalent for these -- they are additions, not mappings, and nothing needs changing to adopt them",
      "targets": ["node"],
      "targetNote": "--emit-cache, --isolated-transpile, --incremental and --type-check-scope apply to the node target only; browser and worker compile their module graph every run and check the whole project",
      "location": "node_modules/.cache/tripwire, or a per-project temp directory when there is no node_modules; never inside the project tree",
      "reportedEveryRun": "a 'Compile cache: reused/rebuilt/isolated' line on every node run, naming what changed when it rebuilt",
      "flags": {
        "--emit-cache": { "configField": "emitCache", "default": true, "does": "reuse compiled output, and a clean type-check, between runs when no program input changed" },
        "--isolated-transpile": { "configField": "isolatedTranspile", "default": false, "does": "compile each file on its own rather than through a whole program when not type-checking", "cannot": "resolve an ambient 'declare const enum' from a dependency -- such a project fails at load with 'Cannot read properties of undefined'" },
        "--incremental": { "configField": "incremental", "default": false, "does": "keep TypeScript's own .tsbuildinfo state between runs", "note": "measured no benefit; --emit-cache supersedes it" },
        "--graph-thread": { "configField": "graphThread", "default": false, "does": "build the browser/worker module graph on a worker thread", "note": "measured no benefit; the build then competes for the CPU the browser needs to start" }
      }
    },
    "ambientGlobals": {
      "declaredByMainEntry": false,
      "note": "importing @nevware21/tripwire declares no globals, so it never clashes with @types/mocha, @types/jest or @types/jasmine",
      "optInForms": [
        "compilerOptions.types += \"@nevware21/tripwire/globals\"",
        "/// <reference types=\"@nevware21/tripwire/globals\" />",
        "import \"@nevware21/tripwire/globals\" (also installs the names at runtime)",
        "depend on @nevware21/tripwire-globals and use any of the three forms with that name"
      ],
      "alternative": "import { describe, it, assert, expect } from \"@nevware21/tripwire\" -- never clashes",
      "guide": "docs/runner-troubleshooting.md#cannot-find-name-describe"
    },
    "globalTypeClash": {
      "occursWhen": "the project opts in to tripwire's globals while @types/mocha, @types/jest or @types/jasmine is still in the program",
      "conflictsWith": ["@types/mocha", "@types/jest", "@types/jasmine"],
      "errors": ["TS2403 (mocha, jest)", "TS6200 (jasmine)"],
      "fixes": ["do not opt in -- import the names from @nevware21/tripwire instead", "uninstall the other @types package", "set compilerOptions.types to an allow-list excluding it", "set compilerOptions.skipLibCheck true"],
      "jestFollowUp": "once jest's types are gone, expect() is tripwire's -- jest matchers fail with TS2339 'Property toBe does not exist on type IAssertInst' and must be rewritten",
      "guide": "docs/runner-troubleshooting.md#typescript-duplicate-global-declarations"
    }
  },
  "rootHookPlugins": {
    "mochaHooksSupported": false,
    "replacement": "declare the hook at the top level of any test file matched by the run's glob -- all files share one root suite",
    "doNotUse": "--file / --require preloads: on the node target they run before the globals are installed and before the root suite exists, so a hook there fails to load (browser/worker load preloads after the globals exist, but a hook there breaks under --target node)"
  },
  "behaviorDifferences": [
    "hook failures are non-fatal unless --fail-on-hook is set",
    "--target worker means Web Worker, not parallel worker processes",
    "type checking of .ts test files is opt-in via --type-check",
    "--type-check covers the tsconfig project, not the run's glob -- use --strict-type-check to fail on the difference",
    "a failing run prints its message and hints, not a stack trace -- pass --debug-stack (or set TRIPWIRE_DEBUG_STACK=1) for the runner's own stack",
    "'--' starts additional file patterns, it is not a passthrough separator",
    "this.currentTest in a hook is tripwire's ITestCase (id, description, fn, only, skip, timeout, slow, retries) -- Mocha's .title, .state, .fullTitle() and .parent are undefined; use .description for the title",
    "--file/--require preloads cannot use describe/it/hooks on the node target (they load before the globals are installed); on browser/worker they must be file paths, not package names"
  ]
}
```

---

## 11. Coming from Jasmine or Jest instead

**Jasmine.** The suite/test/hook vocabulary is supported natively -- `beforeAll`, `afterAll`,
`fdescribe`, `fit`, `xdescribe`, `xit` are all available -- so the migration follows the same
steps above, with the CLI mapping being the only real work.

**Jest.** The `describe`/`it`/`test`/hook layer carries over unchanged, but everything built on
jest's `expect` and module system does not:

| Jest API | Status |
|---|---|
| `describe`, `it`, `test`, `beforeAll`/`afterAll`/`beforeEach`/`afterEach`, `.only`/`.skip`, `fit`/`xit`/`fdescribe`/`xdescribe` | ✅ Available as-is |
| `expect(x).toBe(y)` and every other matcher | ❌ Different API -- rewrite as `expect(x).to.strictly.equal(y)` / `assert.strictEqual(x, y)` (tripwire's plain `equal` is loose `==`); see the [Jest guide](migrating-from-jest.md) for the full matcher mapping |
| `jest.fn()`, `jest.mock()`, `jest.spyOn()`, automatic mocking | ❌ No equivalent -- use a standalone mocking library (eg. sinon) |
| Snapshots (`toMatchSnapshot`) | ❌ No equivalent |
| `jest.useFakeTimers()` | ❌ No equivalent -- use a standalone fake-timer library |

Two jest-specific gotchas, both covered in
[Runner Troubleshooting](../runner-troubleshooting.md#typescript-duplicate-global-declarations):

1. `@types/jest` declares **12** of the same global names -- more than `@types/mocha`'s 6 --
   because it also declares `test` and `expect`. Installing tripwire alongside it is still fine;
   what conflicts is opting in to tripwire's globals while jest's types are loaded. Migrating
   jest suites is therefore easiest without the opt-in: import
   `{ describe, it, expect } from "@nevware21/tripwire"` in each converted file and leave jest's
   declarations in place for the rest.
2. In a converted file `expect(x).toBe(y)` fails to compile with
   `TS2339: Property 'toBe' does not exist on type 'IAssertInst'`, since `expect` now resolves to
   tripwire's. That guide describes how to stage the rewrite per suite rather than all at once.

See the [assertion guides](migrating-from-chai.md) for tripwire's `expect`/`assert` vocabulary.
