# Test Runner, CLI & Configuration

Tripwire ships a CLI test runner (`tripwire`) that can execute the same test files against
three different targets -- **node**, **browser**, and **worker** -- using the same
`describe`/`it` suite definitions. This guide covers the CLI, the `.tripwirerc` config file,
and the built-in test-result reporters.

- [Quick Start](#quick-start)
- [Test Targets](#test-targets)
- [CLI Reference](#cli-reference)
- [Config Files (`.tripwirerc`)](#config-files-tripwirerc)
- [Hook failures](#hook-failures)
- [Reporters](#reporters)
- [Coverage](#coverage)

## Quick Start

Install the package (the `tripwire` CLI is exposed via its `bin` entry, so it works with
`npx` immediately after install):

```bash
npm install @nevware21/tripwire --save-dev
```

Run all test files matching a glob against the default (`node`) target:

```bash
npx tripwire "test/**/*.test.ts"
```

Run the same suite in a real (headless, Puppeteer-driven) browser instead:

```bash
npx tripwire --target browser "test/**/*.test.ts"
```

Show full CLI help (always reflects the current build, including the list of built-in
reporter names):

```bash
npx tripwire --help
```

## Test Targets

Selected with `--target <node|browser|worker>` (`--env` is an accepted alias). Default: `node`.

| Target | What it does |
|---|---|
| `node` | Runs test files directly in-process via `require()`. No browser/server involved for the tests themselves, though an optional shared HTTP server is available to tests via the runner host (see `--no-server`/`--server` below). |
| `browser` | Bundles/transpiles the module graph and serves it from an embedded HTTP server, then runs the suite inside a real browser page. |
| `worker` | Same serving pipeline as `browser`, but the suite executes inside a Web Worker (bridged back to a host page via `postMessage`). |

For `browser`/`worker`, `--browser-launch <mode[:style]>` controls **how** the browser is
opened (default: `puppeteer`):

| Mode | Behavior |
|---|---|
| `puppeteer` | Launches headless Chrome automatically via the `puppeteer` (or `puppeteer-core`) package -- **requires one of those to be installed** in the project being tested. Chrome's console output is forwarded back to the CLI's own stdout. |
| `open` | Starts the embedded server and opens it in the OS's default browser (`start`/`open`/`xdg-open`). Requires the server to stay running, so `--no-server` is ignored (with a warning) in this mode. |
| `manual` | Starts the server and prints its URL; you open it yourself. Useful for switching between the `browser`/`worker` tabs from the same session: nothing is built up front -- each target's module graph is built the first time that target is requested from the page, and rebuilt on a later request if its sources have changed. |

An optional `:style` suffix (`classic` or `slate`, default `classic`) picks the UI theme for
`open`/`manual` sessions -- `--browser-style` sets the same thing independently.

### The interactive page

`open` and `manual` launches serve a page from which you run and re-run tests without restarting
the CLI. One session serves both targets -- `/browser` and `/worker` -- and the page is the same
on each. Everything on it is keyboard-reachable; the controls, left to right:

| Control | What it does |
|---|---|
| **Scope** box | Type to search every suite and test at once; terms match in any order, and each row says whether it is a suite or a test. Pick a row (click, or ArrowUp/ArrowDown then Enter; Escape closes the list) to stage it as the scope for the next run. Blank, or text naming no suite or test, means run everything. |
| **All tests** | Clears the scope without running, then moves focus to Run. Disabled when there is nothing to clear. |
| **Target** | Switches the page between the browser and worker targets. It is a navigation to the other target's page, not a CLI restart, and the current scope travels with it. |
| **Failed only** | Hides passing results. A test that is running stays visible until it passes; a suite stays visible while anything inside it does. |
| **Auto-reload** | On by default. The page asks the server whether the current target's test modules have changed on disk and, when they have, reloads the test frame and re-runs with the current scope. Turn it off to run on demand only; it is a per-page setting, not saved. (`--watch` has no effect on these launches -- this is what replaces it.) |
| **Run** | Runs the staged scope. The status line reports progress and the assertion count updates live. |
| **…** (More actions) | A menu: **Reload Tests** discards and reloads the test frame, then re-runs; **Clear Results**; **Clear Logs**; **Finish & Stop Server** sends the last run's result back to the CLI, which prints its report, exits with that run's exit code and stops the server (the page then says it can be closed). Finish is disabled until a run has produced a result. Keyboard: ArrowUp/ArrowDown move and wrap, Home/End jump to the ends, Escape closes and returns focus to the button, and the whole menu is one tab stop. |

Below the controls: the status line and assertion count, the results tree, and a collapsible
**Runner Log** panel. Every suite and test row in the results has a **run again** control that
scopes the page to that node and runs it immediately -- the quickest way to iterate on one failing
test. To get back, use **All tests**.

The scope lives in the URL hash (`#suite=<id>&test=<id>`, as short hashed ids rather than the
titles), so a scoped page can be bookmarked, shared, or simply reloaded, and the scope is restored
once the page has discovered the suite. The hash is replaced in place rather than pushed, so
picking scopes does not fill the browser's history.

## CLI Reference

```
tripwire [options] <glob...>
```

Every option below can also be set as a default in a `.tripwirerc` config file -- see
[Config Files](#config-files-tripwirerc). For a single-valued setting, an explicit CLI flag
replaces whatever the config file set. For a **list-valued** setting -- the positional globs and
`--spec`, `--ignore`, `--grep`/`--fgrep`, `--file`/`--require`, `--coverage-reporter` and
`--coverage-src` -- a CLI value is **appended** to the config file's list rather than replacing
it. The one exception is `--reporter`, which replaces the config file's `reporters` list (see
[Reporters](#reporters) for why).

Every value-taking long flag also accepts the `--flag=value` spelling (`--timeout=5000`). A bare
`--` ends option parsing: everything after it is taken as a file glob, even when it starts with
`-`. Running `tripwire` with no arguments at all, or with `help` (or `-h`/`--help`) as any
argument before a `--`, prints the help text and exits 0.

### Project / target

| Flag | Description |
|---|---|
| `--project <tsconfig.json>`, `-p`, `--tsProject`, `--ts-project` | TypeScript project file. Default: `./tsconfig.json`. |
| `--target <node\|browser\|worker>`, `--env` | Runtime target. Default: `node`. |
| `--browser-launch <mode[:style]>` | Browser launch mode + optional style for `browser`/`worker` targets. See [Test Targets](#test-targets). |
| `--browser-style <classic\|slate>` | Browser UI style for interactive sessions. Default: `classic`. |
| `--open-browser` | Alias for `--browser-launch open`. |
| `--manual-browser` | Alias for `--browser-launch manual`. |
| `--ux-provider <module>` | Custom browser UX provider module, overriding the built-in one. |
| `--type-check` | Report TypeScript type errors and fail the run on any, on **all three targets**. Default: off. Adds the type-checker walk over a `ts.Program` the run builds anyway -- not a second compile, and not a `tsc` process. |
| `--transpile-only` | Transpile without reporting type errors. **This is the default.** The exact opposite of `--type-check`: whichever appears last on the command line wins, and either beats a config-file `typeCheck`. |
| `--no-type-check` / `--no-transpile-only` | Aliases for `--transpile-only` / `--type-check`. |
| `--compile` / `--no-compile` | Aliases for `--type-check` / `--transpile-only`. |
| `--strict-type-check` / `--no-strict-type-check` | Fail the run when the type-check did not cover every matched file, instead of warning. Implies `--type-check` unless `--transpile-only` was passed explicitly. Default: off (warn). See [what `--type-check` actually checks](#what---type-check-actually-checks). |
| `--type-check-scope <run\|project>` | Whether `--type-check` checks the whole tsconfig project or only the files this run can reach. Default: `project`. **Node target only** -- browser and worker always check the whole project. See [narrowing the type-check](#narrowing-the-type-check). |
| `--emit-cache` / `--no-emit-cache` | Reuse compiled output (and a clean type-check) between runs when nothing has changed. Default: on. **Node target only.** See [compile caching](#compile-caching). |
| `--isolated-transpile` / `--no-isolated-transpile` | Compile each file on its own instead of through a whole program, when not type-checking. Faster, but cannot resolve an ambient `declare const enum`. Default: off. **Node target only.** |
| `--incremental` / `--no-incremental` | Keep TypeScript's own incremental type-check state between runs. Default: off -- it measured no benefit; `--emit-cache` supersedes it. **Node target only.** |
| `--graph-thread` / `--no-graph-thread` | Build the browser/worker module graph on a worker thread. Default: off -- it measured no benefit; see [browser and worker startup](#browser-and-worker-startup). |

#### Type-checking vs transpile-only

Tripwire **transpiles** TypeScript on every run and **type-checks** only when asked.
`--transpile-only` is the default; `--type-check` is the opt-in. They are two spellings of one
setting, so they can be combined freely and the last one wins:

```bash
tripwire "test/**/*.test.ts"                          # transpile-only (default)
tripwire --type-check "test/**/*.test.ts"             # type errors fail the run
tripwire --type-check --transpile-only "test/**/*"    # transpile-only -- last flag wins
```

Set `typeCheck: true` in a config file to make checking a project's default, then turn it off for
a single run from the command line. A CLI flag always beats the config file, in either direction:

```jsonc
// .tripwirerc.json
{ "typeCheck": true }
```

```bash
tripwire "test/**/*.test.ts"                    # checks -- config says so
tripwire --transpile-only "test/**/*.test.ts"   # skips the check for this run
```

**Enabling it costs very little.** Transpiling and type-checking are two questions asked of the
same TypeScript `Program`, and that `Program` is built either way -- it has to be, so `const enum`
values from project dependencies resolve. `program.emit()` deliberately does not report semantic
diagnostics (TypeScript emits despite type errors by design), so the checker walk has to be asked
for separately -- but it is *not* a second parse, a second compile, or a `tsc` child process.
Measured on this repo's own suite, `--type-check` moves work from the compile phase to the prep
phase and lands within noise of the transpile-only total on every target.

#### Compile caching

Running the same tests again over an unchanged tree does not compile or type-check anything a second
time. On this repo's own suite that is the difference between 8.7 s and 4.5 s: the TypeScript work
falls from ~4.7 s to ~0.5 s, and what remains is the tests themselves.

Caching, and the three flags below, apply to the **node target only**. The browser and worker
targets compile their module graph afresh on every run and never read or write the cache.

Everything kept between runs lives in `node_modules/.cache/tripwire` (or a per-project temp directory
when there is no `node_modules`). Nothing is ever written into the project tree, so none of it can be
committed or published by accident, and deleting the directory is always safe -- the next run simply
rebuilds it. It also does not grow without bound: an edit orphans the previous run's whole emit set,
so entries that nothing has read for a week are removed, by a sweep that runs at most once a day.

**`--emit-cache` (on by default)** records the identity of the whole program: every source file it
used, the roots it was built from, the compiler version, its options, and the lock files that decide
how imports resolve. If all of that is unchanged, the compiled output from last time is still
correct, and so is last time's verdict on the types -- so a `--type-check` run whose recorded inputs
still match does not build or check a program at all. Verifying the inputs costs about 50 ms.

Any change to any input turns the whole cache over at once. That is deliberately coarse: a
whole-program emit can inline a `const enum` member from another file, or elide an import whose
binding turns out to be a type, so an unrelated edit really can change what a file compiles to. After
an edit the next run is a full one, and the run after that is fast again.

A run that only transpiled records that it did **not** type-check, so it can never let a later
`--type-check` run skip checking on its behalf.

**`--isolated-transpile` (off by default)** compiles each required file on its own with TypeScript's
`transpileModule` instead of building a program to emit from, and caches by the file's own text. On a
60-module fixture project: whole-program emit ~1.1 s, isolated transpile ~0.65 s, isolated transpile
with a warm cache ~0.09 s.

It is **opt-in because it cannot be made correct for every project**. An *ambient*
`declare const enum` -- one declared in a `.d.ts`, typically by a dependency -- has no emitted object
for a member access to resolve against, and no file that could produce one, so a project using one
fails at load with `Cannot read properties of undefined`. This is not exotic: `@nevware21/ts-utils`
declares `WellKnownSymbols` that way, so tripwire's own core cannot use this mode. A project's *own*
`const enum` is fine (the enum object is emitted rather than inlined). `emitDecoratorMetadata` is
also unsupported here and falls back automatically -- the metadata *is* type information.

**`--incremental` (off by default)** keeps TypeScript's own `.tsbuildinfo` state so a warm check
re-checks only affected files. It works, but it does not make a run faster: emitting a file needs much
of the work the check does, so what the warm check saves the emit pays back. `--emit-cache` supersedes
it for the unchanged-tree case. Turn it on for a project whose type-check covers far more than any one
run loads.

Every node run says what the cache did, so there is no need to infer it from the clock:

```text
Compile cache: rebuilt -- nothing cached for this project yet
Compile cache: reused -- nothing changed, type-check skipped
Compile cache: rebuilt -- /path/to/src/thing.ts changed
Compile cache: reused -- nothing changed, but the cached compile came from a run that did not type-check
Compile cache: isolated -- each file is compiled on its own, and reused while its text is unchanged
```

A `rebuilt` line always names the first thing found to have changed, which is usually enough to
explain an unexpectedly slow run: an editor that rewrites a file on save, a generated file, or an
install that changed how imports resolve. Under `--isolated-transpile` the line says `isolated`
instead: the cache is consulted file by file as each one loads, after the line is printed. Nothing
is printed when caching is turned off.

```bash
tripwire --type-check "test/**/*.test.ts"     # second run reuses everything, if nothing changed
tripwire --no-emit-cache --type-check "..."   # reuse no cached output; compile and check every time
```

`--no-emit-cache` does not turn off `--incremental`: when both are given, TypeScript's
`.tsbuildinfo` state is still read and written under the cache directory.

#### Browser and worker startup

Chrome initialises its network stack on its first real navigation rather than at launch, and that
first navigation can be slow -- around six seconds on Windows, against twenty milliseconds for every
one after it. The runner therefore launches the browser before file discovery *and* sends it to a
dead port before building the module graph, so that initialisation happens inside Chrome's own
process while the compile runs here. Nothing needs configuring, and a platform where the first
navigation is already cheap simply sees the warm-up finish during the build.

**`--graph-thread` (off by default)** builds the module graph on a worker thread instead of the main
one. The module graph build is synchronous and holds the event loop for seconds, which stops the
browser launch completing alongside it, so moving it off-thread sounds like the obvious win. Measured,
it is not: the build then competes for the CPU the browser needs to start, and the launch stretched
from about 1.9s to 3.5s in exchange. The browser's startup is the longer pole either way, and the
build already hides inside it. Three interleaved A/B pairs had the main-thread build ahead every time.

It is kept because that result is machine-specific -- more cores, or a slower compile against a
faster browser, could land the other way -- and turning it on is the only way to find out for a given
machine.

#### Narrowing the type-check

`--type-check` checks the whole tsconfig project. `--type-check-scope run` instead roots the check
at the files the run matched, which covers those and everything they import, transitively, plus
anything declaring globals (an `ambientGlobals.ts` that nothing imports still has to be kept, or
every test file loses `describe`). Files in the project that no test reaches are then not checked.
This applies to the **node target only**; browser and worker runs always check the whole project.

That last sentence is why it is not the default: it narrows what a green run proves. Use it when a
project's tsconfig deliberately covers much more than one run executes -- a combined node, browser
and worker test project, say.

Either way, a matched file the project does **not** contain is still reported as unchecked, and
still fails the run under `--strict-type-check`, so a mistyped `--project` cannot pass silently.

#### What `--type-check` actually checks

`--type-check` checks the **tsconfig project** -- the files that project's `include`/`files`
resolve to. The run executes whatever the **file glob** matched. Nothing forces those two sets to
be the same, and they drift apart in ordinary ways: a new test directory, a moved package, a glob
widened without the tsconfig following it.

When they drift, the files that ran were never checked. A test file with a real type error can
execute, pass, and leave the run green.

The runner reconciles the two after the check and reports the difference:

```
$ tripwire --type-check -p ./test/tsconfig.test.json "./probe/**/*.test.ts"
Matched 1 file(s)
Type-checking TypeScript project: .../test/tsconfig.test.json

Warning: 1 of 1 matched TypeScript file(s) are outside test/tsconfig.test.json and were not type-checked:
  probe/typeerr.probe.test.ts
Add them to the project's "include"/"files", or point --project at a tsconfig that covers them.
Use --strict-type-check to fail the run instead of warning.
```

`--strict-type-check` turns exactly that warning into a non-zero exit, which is what you want in
CI, where `--type-check` passing is supposed to *mean* something:

```
$ tripwire --strict-type-check -p ./test/tsconfig.test.json "./probe/**/*.test.ts"
Error: Type-check scope: 1 of 1 matched TypeScript file(s) are outside test/tsconfig.test.json and were not type-checked:
  probe/typeerr.probe.test.ts
Add them to the project's "include"/"files", or point --project at a tsconfig that covers them.
```

The same reconciliation catches a project that resolves to **no** files at all -- a mistyped
`--project`, or `include` patterns that match nothing. That case used to print
`Type-check completed` after checking nothing; it now says so, and `Type-check completed` is
printed only when files were actually checked.

Warning (not failing) is the default because the mismatch is sometimes deliberate -- a shared
helper compiled by a different project. Only `.ts`/`.tsx` files are counted; a `.js` test is not
something `--type-check` ever claimed to cover.

> Both the scope reconciliation above and the type errors themselves apply to the `node`,
> `browser` and `worker` targets alike. Earlier versions skipped the diagnostics on
> `browser`/`worker` -- `--type-check --target browser` reported scope but never a type error,
> so a file with a real type error could run green. Fixed in 0.2.0.

### Selecting/filtering tests

| Flag | Description |
|---|---|
| `<glob...>` (positional) | One or more file globs to match test files. At least one is required, from the command line or a config file's `spec` list (with no arguments at all the CLI prints help instead). Added to any config-file `spec` patterns. |
| `--spec <glob>` | Adds an additional glob pattern (Mocha-style, equivalent to a positional arg). |
| `--ignore <glob>` | Exclude files matching glob. Repeatable; added to the config file's `ignore` list. |
| `--grep <pattern>`, `-g` | Only run tests whose title matches the regex (case-insensitive). Repeatable; added to the config file's `grep` list. |
| `--fgrep <text>`, `-f` | Same as `--grep`, but the text is matched literally (escaped) rather than as a regex. No config field of its own -- it is added to the same `grep` list. |
| `--invert` | Invert the grep/fgrep match. |
| `--file <path>` | Preload a setup file before tests run. Repeatable; added to the config file's `require` list. For `browser`/`worker` the value must be a file path (`./setup.ts`). |
| `--require <module>`, `-r` | Preload a module before tests run. Repeatable; added to the config file's `require` list. On the `node` target the value is resolved as a module name first (`jsdom-global/register`), then as a path relative to the cwd. **`browser`/`worker` accept file paths only** -- a bare module name fails with `Browser/worker preload currently supports file paths only`. |

Tests these patterns exclude are left out of the run entirely -- they are not reported and are
not counted in any total, so a reporter's counts always describe the tests it actually saw. A
pattern that matches **nothing** is therefore a run of zero tests, which the CLI reports as an
error and exits non-zero on, rather than passing silently:

```
$ tripwire --grep "zzz-no-such-test" "./test/**/*.test.ts"
Run summary: total=0 passed=0 failed=0 skipped=0 pending=0 duration=3ms
No tests matched --grep zzz-no-such-test. Check the pattern, or drop it to run the full suite.
```

A typo'd pattern in CI fails the build instead of reporting a green run of nothing.

#### Which directories are searched

A glob pattern is matched against a filesystem walk rooted at the pattern's own leading literal
segments -- `./test/src/**/*.test.ts` only ever walks `test/src`, not the whole project. Two kinds
of directory are left out of that walk:

| Skipped | When |
|---|---|
| `node_modules`, `.git` | **Always.** Neither can hold a file you meant to match. |
| `common/temp` | **Always**, when it sits directly under the directory the walk is rooted at (Rush's install scratch directory). |
| `dist`, `build`, `bundle`, `coverage`, `.nyc_output` | Only when your pattern does **not** name them. |

The second group is skipped so a broad pattern (`"**/*.test.ts"`) does not sweep through build
output that can dwarf the real source tree. It is not a ban: a pattern that spells the directory
out is followed normally, which is what makes running an already-compiled suite work.

```bash
npx tripwire "test/**/*.test.ts"            # a build/ under test/ is skipped
npx tripwire "test/build/**/*.test.js"      # ...but this runs it
npx tripwire "test/*/dist/*.test.js"        # named mid-pattern works too
```

Only exact directory names count, so a `build-es5/` or `dist-esm/` is never skipped. Use
`--ignore` to exclude anything else.

### Run behavior

| Flag | Description |
|---|---|
| `--slow <ms>`, `-s` | Duration threshold above which a passing test is flagged "slow" in reporter output. |
| `--timeout <ms>`, `-t` | Per-test/hook timeout. `0` disables it. |
| `--retries <count>` | Retry count for failing tests. |
| `--bail`, `-b` | Stop the run after the first test failure. |
| `--fail-on-hook` / `--no-fail-on-hook` | Fail the run when a lifecycle hook (`before`/`beforeEach`/`afterEach`/`after`) fails or times out, even if every test itself passed: each failing hook is reported and the process exits non-zero. Off by default, where a failing hook is only summarized as a warning line. See [Hook failures](#hook-failures). |
| `--trace` | Print each test and assertion as it executes (verbose). |
| `--watch` | Keep running after the first run and re-run automatically on change, until interrupted (Ctrl+C). Watches the resolved test files -- for the `node` target, also everything they transitively `require`. Applies to `node` and to `browser`/`worker` with `--browser-launch puppeteer` (the default); no effect on `open`/`manual` launches, which already reload on change from the page's own toggle. `--type-check` applies on every iteration; on `browser`/`worker` a compile or type error is printed and the loop keeps watching, so fixing the file re-runs the suite. |
| `--reporter <name>` | Test-result reporter to use. Repeatable/comma-separated for multiple at once. Also takes a **custom reporter module** -- a path (`./mine.js`), a scoped package, or `module:<package>` for a bare package name (`node` target only). See [Reporters](#reporters). Default: `spec`. |

### Coverage (browser/worker)

| Flag | Description |
|---|---|
| `--coverage` / `--no-coverage` | Collect and write browser/worker coverage (Puppeteer launches only). Default: off. |
| `--coverage-instrumenter <module\|none>` | Coverage instrumenter module. Default: `istanbul-lib-instrument`. |
| `--erased-coverage-mode <zero\|full\|ignore>` | How to report a source file whose content is fully erased by TypeScript (a pure `interface`/type-only file). `zero` (default) reports it as computed/0%; `full` reports 100%; `ignore` omits it from the report. |
| `--coverage-reporter <name>` | `nyc` reporter for tripwire's own coverage summary (eg. `text`, `html`, `lcov`). Repeatable/comma-separated. Default: `text`. |
| `--coverage-src <glob>` | Where this project's own sources live, so files **no test imported** are still counted. Repeatable/comma-separated. Default: `src/**/*.ts`. Set this if your sources are not under `src/` — see the note below. |
| `--source-maps` / `--no-source-maps` | Generate per-module source maps for browser/worker so DevTools can show/step through real `.ts` source. Adds processing time; off by default, and this flag is ignored for a `puppeteer` launch (nobody's DevTools is attached). `--coverage` always generates maps, on every launch mode, because the coverage report needs them to attribute lines back to the `.ts` source. |

### Server / serving

| Flag | Description |
|---|---|
| `--server-root <path>` | Root folder the server's filesystem fallback serves directly at its root (eg. `/README.md` → `<path>/README.md`) for any request that doesn't match a registered action or served asset -- there is no dedicated `/fs/...` prefix. Default: cwd. |
| `--bind-address <address>` | Network interface the server binds to, and the host every URL handed to a browser/worker/puppeteer instance is built from. Default: `127.0.0.1` (loopback only -- not reachable from the network). Use `0.0.0.0` to bind every interface, or name one interface's address, when the browser is not on the same host as the runner (a container, a VM, a device pointed at `--browser-launch manual`). A wildcard bind is not something a client can connect *to*, so the reported URL falls back to loopback and the addresses that **are** reachable are logged alongside it. See the note below. |
| `--no-server` | Disable the embedded HTTP server. Only meaningful for the `node` target (an optional shared background API server available to tests); rejected outright for `browser`/`worker` with `puppeteer`/`manual` launches (which need the server unconditionally), and silently ignored (with a warning) for `--browser-launch open`. |
| `--server` | Force-enable the embedded server (overrides a config file's `noServer: true`). |
| `--bundle` / `--no-bundle` | Serve the browser/worker module graph as one concatenated bundle (default) vs. one network request per module. |

> **On `--bind-address` and exposure.** The default loopback bind is what keeps the dev server
> off the network. It serves your compiled test files and, through the filesystem fallback,
> everything under `--server-root` (the working directory by default). Binding it anywhere else
> makes all of that readable by anything that can reach that address, so treat it as you would
> any other development server: use it on a network you trust, and prefer naming one interface
> over `0.0.0.0` when you can.

### Misc

| Flag | Description |
|---|---|
| `--show-files` | Print matched files before running. |
| `--verbose` | Log each HTTP request/response status served by the browser runner. |
| `--debug-stack` | Print tripwire's own stack trace beneath a failure, mapped back to its TypeScript sources. Default: off. Also enabled by `TRIPWIRE_DEBUG_STACK=1`. |
| `-h`, `--help` | Show CLI help and exit. |

Any unrecognized `-`/`--` option fails the run with an error rather than being silently ignored
(the `coverage-report` subcommand below is the exception -- see [Commands](#commands)).

#### Errors, and `--debug-stack`

A failing run prints the message and what to do about it -- not a stack trace:

```
$ tripwire "./probe/zzz-*.test.ts"
Error: No files matched: ./probe/zzz-*.test.ts

  Quote the pattern so the shell doesn't expand it first: tripwire "test/**/*.test.ts"
  Patterns are resolved relative to /home/me/project

Run again with --debug-stack for the runner stack trace.
```

The CLI ships as a single minified bundle, so its stack is a wall of
`at yo (tripwire.js:2:143518)` -- it buries the one line worth reading, and on a first run it
reads as "this tool is broken" rather than "install puppeteer". An error tripwire raises
deliberately therefore prints its message and hints alone; anything unexpected prints its message
and says that it *was* unexpected, with a link to report it.

`--debug-stack` opts back in, and maps every frame through the bundle's source map first, so what
you get is in terms of the runner's real TypeScript:

```
$ tripwire "./probe/zzz-*.test.ts" --debug-stack
Error: No files matched: ./probe/zzz-*.test.ts
...
    at _noFilesMatchedError (internal/runner/src/execute/execute.ts:370:15)
    at _executeNodeOnce (internal/runner/src/execute/execute.ts:324:23)
    at runCli (internal/runner/src/tripwire.ts:315:32)
```

Set `TRIPWIRE_DEBUG_STACK=1` instead when the command line isn't yours to change (a CI job, an
npm script). Exit codes are unchanged either way -- a failure is still a non-zero exit.

### Commands

Besides the default "run tests" behavior, one subcommand is available:

```
tripwire coverage-report [--erased-coverage-mode <zero|full|ignore>] [--nyc-output-dir <dir>]
```

Reprints the node-target's `nyc` coverage report from an existing `.nyc_output` directory with
`--erased-coverage-mode` applied -- needed because that flag has no effect during the main
`nyc node ./bin/tripwire.js ...` run itself (for the `node` target, `nyc` instruments and
reports entirely on its own).

| Flag | Description |
|---|---|
| `--erased-coverage-mode <zero\|full\|ignore>` | As in the CLI table above, applied while reprinting. |
| `--nyc-output-dir <dir>` | Directory holding the `nyc` JSON coverage data to reprint, resolved against the cwd. Default: `.nyc_output`. |
| `--coverage-reporter <name>` | `nyc` reporter(s) to render the reprinted report with. Repeatable/comma-separated. Default: `text`. |

`coverage-report` also reads `erasedCoverageMode` and `coverageReporters` from a config file, so
a project that sets them there does not need to repeat them on this command.

Unlike the main run, this subcommand's parser **ignores any option it does not recognize** rather
than failing on it -- a mistyped flag here is silently dropped, so check the spelling against the
three flags above if the report does not change.

## Config Files (`.tripwirerc`)

Any CLI flag can be given a project-wide default in a config file instead. How a CLI flag
combines with the file depends on the kind of setting:

- **Single-valued** settings (`timeout`, `target`, `typeCheck`, ...): the CLI flag replaces the
  config value.
- **List-valued** settings (`spec`, `ignore`, `grep`, `require`, `coverageReporters`,
  `coverageSrc`): the CLI value is **appended** to the config file's list. There is no CLI way
  to drop an entry a config file added.
- `reporters`/`reporter` is the exception: a CLI `--reporter` *replaces* the file's list rather
  than appending to it (see [Reporters](#reporters) below for why).

### Search order

Config files are collected from the user's home directory first, then from every directory on
the walk from the **filesystem root** down to the current working directory (the walk does not
stop at a repository root). They are merged in that order, so a file closer to `cwd` wins over
one higher up the tree, and both win over the home-directory file. For most keys "wins" means
*replaces*; the four list-valued keys `grep`, `ignore`, `spec` and `require` are instead
**concatenated** across every level, so a root file's `ignore` patterns stay in force in every
package beneath it. A monorepo can therefore set shared defaults in a root `.tripwirerc` that
every package inherits, while still letting an individual package override single-valued
settings -- or add to the list-valued ones -- with its own file.

Recognized file names in each directory on the walk:

```
.tripwirerc
.tripwirerc.json
.tripwirerc.js / .tripwirerc.cjs
tripwire.config.json
tripwire.config.js / tripwire.config.cjs
```

Only one file is used per directory. When several are present, the one listed **last** above
wins (`tripwire.config.cjs` beats `.tripwirerc`); they are not merged with each other.

The home directory is searched for a smaller set, and the **first** one found is used:
`~/.tripwirerc`, `~/.tripwirerc.json`, `~/.tripwirerc.js`, then
`~/.config/tripwire/.tripwirerc`, `~/.config/tripwire/tripwire.config.json` and
`~/.config/tripwire/tripwire.config.js`. A `.cjs` file or a `~/tripwire.config.*` is not read
from the home directory.

JSON files may use JSONC-style `// line comments`. `.js`/`.cjs` files must export the config
object via `module.exports`. An extension-less `.tripwirerc` is parsed as JSON when its content
starts with `{` (or `[`); otherwise it is loaded as JavaScript via `require()`, so it may also be
written as a CommonJS module.

### Example

```jsonc
// .tripwirerc
{
    "target": "node",
    "reporters": ["spec"],
    "slow": 200,
    "bail": false,
    "strictTypeCheck": true,
    "erasedCoverageMode": "full",
    "ignore": ["**/fixtures/**"]
}
```

### Full field reference

All fields are optional; every default matches the CLI defaults documented above.

| Field | Type | Notes |
|---|---|---|
| `target` | `"node" \| "browser" \| "worker"` | Default runtime target. |
| `browserLaunch` | `"puppeteer" \| "open" \| "manual"` | Default browser launch mode. |
| `browserStyle` | `"classic" \| "slate"` | Default browser UI style. |
| `uxProvider` | `string` | Browser UX provider module name. |
| `project` | `string` | Path to the TypeScript project file. |
| `tsconfig` | `string \| object` | As a string: an alternate way to set `project` from config (still loses to an explicit CLI `--project`). As an object: compiler-option overrides layered on top of whichever project loads, applied even when `project` came from the CLI. |
| `typeCheck` | `boolean` | Report TypeScript type errors and fail the run on any. Default: `false` (transpile-only). Set this to make type-checking a project's default and override it per-run with `--transpile-only`; any CLI flag wins over this value. |
| `strictTypeCheck` | `boolean` | Fail the run when the type-check did not cover every matched file. Implies `--type-check`. Default: `false` (warn). See [what `--type-check` actually checks](#what---type-check-actually-checks). |
| `typeCheckScope` | `"project" \| "run"` | What `typeCheck` covers: the whole tsconfig project, or only the files this run can reach. Default: `"project"`. Node target only. See [narrowing the type-check](#narrowing-the-type-check). |
| `emitCache` | `boolean` | Reuse compiled output, and a clean type-check, between runs when nothing has changed. Default: `true`. Node target only. See [compile caching](#compile-caching). |
| `isolatedTranspile` | `boolean` | Compile each file on its own rather than through a whole program, when `typeCheck` is off. Faster, but cannot resolve an ambient `declare const enum`. Default: `false`. Node target only. See [compile caching](#compile-caching). |
| `incremental` | `boolean` | Keep TypeScript's own incremental type-check state between runs. Default: `false` -- it measured no benefit, and `emitCache` supersedes it. Node target only. See [compile caching](#compile-caching). |
| `graphThread` | `boolean` | Build the browser/worker module graph on a worker thread. Default: `false` -- it measured no benefit. See [browser and worker startup](#browser-and-worker-startup). |
| `debugStack` | `boolean` | Print tripwire's own (source-mapped) stack trace beneath a failure. Default: `false`. See [`--debug-stack`](#errors-and---debug-stack). |
| `slow` | `number` | Slow-test threshold (ms). |
| `timeout` | `number` | Default per-test/hook timeout (ms). `0` disables it. |
| `retries` | `number` | Default retry count. |
| `grep` | `string[]` | Patterns compiled to `RegExp` with the `i` flag. CLI `--grep` patterns are appended after these. |
| `invert` | `boolean` | Invert grep/fgrep matching. |
| `ignore` | `string[]` | Glob patterns to exclude. CLI `--ignore` patterns are appended. |
| `bail` | `boolean` | Abort on first failure. |
| `failOnHook` | `boolean` | Fail the run on a failing lifecycle hook. See CLI table. |
| `trace` | `boolean` | Verbose per-test/assertion output. |
| `coverage` | `boolean` | Collect browser/worker coverage. |
| `coverageInstrumenter` | `string` | Coverage instrumenter module, or `"none"`. |
| `erasedCoverageMode` | `"zero" \| "full" \| "ignore"` | See CLI table above. |
| `coverageReporters` | `string[]` | `nyc` reporter name(s) for the coverage summary. CLI `--coverage-reporter` names are appended. |
| `coverageSrc` | `string[]` | Glob(s) locating this project's own sources, so unimported files are still counted. Default: `["src/**/*.ts"]`. See CLI table. |
| `reporters` (or `reporter`) | `string[]` | Test-result reporter name(s), or custom reporter module specifier(s). See [Reporters](#reporters) -- **CLI `--reporter` replaces this list, not merges with it.** |
| `sourceMaps` | `boolean` | Per-module source maps for browser/worker DevTools debugging. |
| `showFiles` | `boolean` | Print matched files before running. |
| `verbose` | `boolean` | Log HTTP requests served by the browser runner. |
| `watch` | `boolean` | Re-run automatically on file change until interrupted. See CLI table. |
| `serverRoot` | `string` | Root folder the server's filesystem fallback serves directly at its root (no `/fs/...` prefix). See CLI table. |
| `bindAddress` | `string` | Interface the server binds to and the host its URLs are built from. Default: `127.0.0.1`. See CLI table. |
| `noServer` | `boolean` | Disable the embedded server (node target; see CLI table). |
| `spec` | `string[]` | Glob patterns for test files (equivalent to positional CLI args). CLI globs and `--spec` patterns are appended. |
| `require` | `string[]` | Modules/files to preload before tests. CLI `--require`/`--file` values are appended. On the `node` target entries may be module names or paths; for `browser`/`worker` they must be file paths (a bare module name fails the run). |
| `bundle` | `boolean` | Serve the browser/worker module graph as one bundle vs. per-module requests. Default: `true`. |

## Hook failures

A lifecycle hook (`before`/`beforeEach`/`afterEach`/`after`) that throws or times out belongs to
no single test, so it can easily leave no trace in the pass/fail counts:

- a `before`/`after` (`beforeAll`/`afterAll`) failure has no test to attribute to -- it stops the
  suite it belongs to, whose tests are then reported and counted as skipped. The rest of the run is
  unaffected: sibling suites have their own fixtures and continue normally,
- an `afterEach` failure after its test had *already* failed has nothing left to mark.

Every hook failure is recorded on the run summary regardless (`ITestSummary.hookFailures` -- one
entry per failure, carrying the hook's lifecycle group and name, its suite path, the owning test
where there is one, whether it timed out, and the error's message/stack). See
[Test Execution Flow](test-execution-flow.md#hook-failure-handling) for what each hook group does
to the run itself.

### Default: reported, but not fatal

A failing hook does **not** by itself fail the run. The exit code still reflects the test results
alone, and the run ends with a single line naming the flag that would change that:

```
Run summary: total=12 passed=12 failed=0 skipped=0 pending=0 duration=61ms
Total elapsed: 254ms (prep: 17ms, compile: 176ms, tests: 61ms)

1 hook failed during this run -- run with --fail-on-hook to fail the run on them.
```

### `--fail-on-hook`

Promotes hook failures to a run failure:

```bash
tripwire --fail-on-hook "./test/**/*.test.ts"
```

Each failing hook is printed in its own numbered block -- group, suite path, owning test,
message, and abbreviated stack, the same shape the reporters use for failed tests -- the run is
reported as failed, and the process exits **non-zero even when every test itself passed**:

```
Run summary: total=12 passed=12 failed=0 skipped=0 pending=0 duration=61ms
Total elapsed: 254ms (prep: 17ms, compile: 176ms, tests: 61ms)

  Hook failures (1 hook):

  1) afterAll in root > Database
     connection still open
         at Object.<anonymous> (test/db.test.ts:14:15)

Run failed: 1 hook failed (--fail-on-hook).
```

Recommended for CI, where a teardown that quietly fails is a real failure. Set it as a project
default with `failOnHook` in a [config file](#config-files-tripwirerc) (and override it back off
for a single run with `--no-fail-on-hook`):

```jsonc
// .tripwirerc
{
    "failOnHook": true
}
```

The flag changes reporting and the exit code only -- it does not stop the run early (that is
[`--bail`](#run-behavior)) or change which tests execute. Both behaviors apply to every target:
`browser` and `worker` runs return their hook failures to the CLI on the run summary, which
reports them exactly as the `node` target does.

## Reporters

A reporter turns a run's lifecycle events into output. Tripwire ships 14 built-in reporters --
Mocha's own built-in set, plus `cargo` -- and any number of them can observe the same run.

| | |
|---|---|
| **Human-readable** | `spec` (default), `list`, `min`, `dot` |
| **Progress animations** | `progress`, `landing`, `nyan` |
| **Machine-readable** | `tap`, `xunit`, `json`, `json-stream` |
| **Documentation** | `doc`, `markdown` |
| **Cross-ecosystem** | `cargo` |

```bash
npx tripwire --reporter dot "test/**/*.test.ts"
npx tripwire --reporter spec,xunit "test/**/*.test.ts"     # several at once
```

```jsonc
// .tripwirerc
{ "reporters": ["dot"] }
```

**Precedence:** unlike every other config-file setting (which CLI flags layer on top of), any
`--reporter` flag on the CLI **replaces** the config file's list rather than adding to it --
otherwise there would be no way to select a single reporter once a config file already lists one.

**Custom reporters.** `--reporter` (and `reporters`) also accepts a module of your own -- a path
(`./reporters/mine.js`), a scoped package, or `module:<package>` for a bare package name. The
module exports a listener, a `{ listener }` object, or a `createReporter(options)` factory
returning either. `node` target only: the browser and worker targets build their reporters inside
the page/worker, so selecting a module there fails the run with a message saying so.

```bash
npx tripwire --reporter ./reporters/mine.js "test/**/*.test.ts"
```

> **See the [Reporters guide](reporters.md)** for what each one actually prints (sample output for
> all 14), the per-reporter options, in-place terminal redraw, and writing a custom reporter.

## Coverage

`--coverage` (browser/worker, Puppeteer launches only) instruments the module graph and writes
`coverage/<target>/coverage-final.json`, then runs `nyc report --reporter <name>` for each
configured `--coverage-reporter`. For the `node` target, coverage is handled entirely by
wrapping the run with `nyc` externally (eg. `nyc node ./bin/tripwire.js ...`) rather than
anything tripwire's own pipeline does -- `--erased-coverage-mode` only takes effect for that
target via the separate `tripwire coverage-report` command (see [Commands](#commands) above),
since the main `nyc`-wrapped run reports before tripwire gets a chance to adjust it.

### `--coverage-src`: telling tripwire where your sources are

A file that **no test imports** is the one that most needs reporting, and the one a naive
instrumenter never sees. So for the browser/worker targets tripwire loads your sources explicitly
(to get real execution-based coverage of anything unreferenced) and zero-fills whatever is still
missing, rather than letting it drop out of the report.

Both steps need to know where the sources are, and the default is `src/**/*.ts`. **If your code is
not under `src/`, set `--coverage-src`** (or `coverageSrc` in a config file):

```bash
npx tripwire --target browser --coverage --coverage-src "lib/**/*.ts" "test/**/*.test.ts"
```

Getting this wrong does not fail — it inflates. Coverage is then computed over only the files your
tests happened to reach, dropping exactly the untested files the report exists to surface:

```
# sources in lib/, default src/**/*.ts -- never-imported.ts is silently absent
All files          |     100 |       50 |     100 |     100 |

# --coverage-src "lib/**/*.ts"
All files          |      50 |       25 |      50 |      50 |
 never-imported.ts |      25 |        0 |       0 |   33.33 | 2-3
 used.ts           |     100 |       50 |     100 |     100 | 1
```

This applies to the browser and worker targets only. The `node` target's coverage comes from
wrapping the run in `nyc`, which has its own `include`/`exclude` in `.nycrc`.
