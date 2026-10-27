# v0.2.0 (Unreleased)

## New Packages

- **`@nevware21/tripwire-globals`** -- the opt-in way to use `describe`, `it`, the lifecycle
  hooks, `assert` and `expect` as bare global names: the ambient TypeScript declarations plus a
  runtime installer. `@nevware21/tripwire` itself declares no ambient globals, deliberately:
  `@types/mocha`, `@types/jest` and `@types/jasmine` declare those same names with their own
  types, TypeScript merges every ambient declaration in a program, and two declarations of one global
  that disagree is a compile error -- so the main package can be installed next to any of them, and
  this package is how you ask for the globals when you want them. Depends on the exact matching
  version of `@nevware21/tripwire`. Either of two ways:

  ```jsonc
  // tsconfig.json -- no import needed in any file
  { "compilerOptions": { "types": ["@nevware21/tripwire-globals"] } }
  ```

  ```ts
  // or a single import per file, which also installs the names onto globalThis at runtime
  import "@nevware21/tripwire-globals";
  ```

  Code that imports what it uses from `@nevware21/tripwire` needs neither. Runs driven by the
  `tripwire` CLI get the runtime globals installed automatically, whichever option you pick.

## New Features

- **`assert.rejects` / `assert.doesNotReject`**, matching Node's `assert` API. Each takes a promise or a
  function returning one, accepts the same error criteria as `throws`, and returns a promise that
  must be awaited.
- **`assert.notDeepStrictEqual` / `notDeepStrictEquals`**, the negation of `deepStrictEqual`, so
  Node's `assert` API maps across completely for equality checks. Values differing only in type
  (`{ a: 1 }` vs `{ a: "1" }`) are not strictly equal, so they pass.
- **`expect(x).to.be.at.least(n)` / `.at.most(n)`**: `at` is a decorative chain word, like `a`
  and `an`, so Chai's spelling of the bounds assertions works unchanged.
- **`and` continues a chain after a called assertion**, so `expect(5).is.number().and.is.above(1)`
  reads as two assertions on one value. It performs no check and keeps the chain's modifiers: a
  `not` before it still applies to what follows, as in Chai. (`and` on a `property(...)` result
  is unchanged.)
- **`or(...clauses)`** passes when any clause passes: `expect(5).or(e => e.is.string(), e => e.is.number())`.
  Each clause is a function given a fresh instance for the same value, free of the outer chain's
  modifiers; clauses stop at the first that passes, and when all fail the message lists what each
  reported. `expect(x).not.or(...)` negates the `or` as a whole. Clauses must be synchronous
  (a clause returning a promise is an `AssertionFatal`), a clause's own failures are never
  reported to assertion listeners or deferred onto the test -- only the combined verdict is -- and
  an `AssertionFatal` or any non-assertion error from a clause propagates unchanged.
- **The expression adapter's documented argument forms now work.** `createExprAdapter("fn({0})")`
  passed `undefined` for the first argument -- the index was tested for truthiness, and zero is
  not truthy -- and `{text}` was parsed as a (NaN) index rather than the literal string the docs
  describe. `{N}` is positional, `{text}` is a literal, and a bare token is a context lookup.
- **New core exports.** The public entry now exports the error classes (`TripwireError`,
  `AbortError`, `TimeoutError`, and the `*Constructor` / `I*Props` types for those and `SkipError`), the
  assertion-listener API (`IListener*`, `ListenerEvent`, `ListenerEventEnum`,
  `INotificationManager`, `createNotifyMgr`, `addAssertionListener`, `removeAssertionListener`),
  the runner and metrics types (`ITestRunner`, `ITestRunnerOptions`, `ITestResult`,
  `IRunnerMetrics` and the `IRunnerMetric*` family, `IModuleGraph`, `ICompileProvider`,
  `ICompileHookOptions`, `IServerManager`, `TestTarget`, `BrowserLaunchMode`), the config/host
  seam (`IConfigHost`, `useHost`, `getCurrentHost`, `createFormatMgr`, `createServerMgr`,
  `DEFAULT_CONFIG`, `FormatResult`, `parseStack`), and the assertion functions (`*Func`) and
  operation builders (`*Op`) the `assert`/`expect` APIs are composed from, so custom assertions
  can reuse them. The TypeDoc reference documents them.

- **`--transpile-only` and `--type-check` are now a documented, symmetric pair, with a
  `typeCheck` config field behind them.** Transpiling and type-checking are separate questions
  asked of the same TypeScript `Program`: the Program is built on every run either way (it has
  to be, so `const enum` values from project dependencies resolve), and `program.emit()`
  deliberately does not surface semantic diagnostics, so the checker walk has to be requested.
  `--transpile-only` is the default and `--type-check` opts in; they write one setting, so the
  last flag on the command line wins. `typeCheck: true` in a config file makes checking a
  project's default, and any CLI flag beats it -- so `--transpile-only` turns it off for a single
  run without editing the config. `--no-type-check`/`--no-transpile-only` are accepted as
  aliases, as are the existing `--compile`/`--no-compile`. `--strict-type-check` still implies
  `--type-check`, but no longer overrides an explicit `--transpile-only`.

- **A `tripwire` test-runner CLI**, shipped as the `bin` of `@nevware21/tripwire`. It discovers,
  type-checks, compiles and runs TypeScript test files with no `ts-node`/`mocha` layer in between.
  See [`docs/test-runner.md`](./docs/test-runner.md) for every flag and config field.
  - **Three targets:** `--target node` (default), `--target browser` and `--target worker`. The
    browser and worker targets are served by the runner's own loopback dev server -- test modules
    are compiled, bundled and served as real, individually-fetchable script resources -- and run
    either headless through puppeteer or interactively via `--browser-launch open|manual`.
    `puppeteer` (or `puppeteer-core`) is resolved from your own project and is now declared as an
    optional `peerDependency`, so npm can tell you which versions are expected instead of leaving
    it to a runtime error.
  - **One Scope box** on the interactive page, in place of the separate Suite and Test pickers:
    type to search every suite and every test at once, pick a row, and that is what runs. Rows
    say whether they are a suite or a test, terms match in any order (`inner gamma` finds
    `outer > inner > gamma`), and reopening the list shows everything again so the scope can be
    changed or cleared from where it stands. Text naming no suite or test means "run everything"
    rather than a scope that would run nothing. The scope is still mirrored into the URL hash, so
    a scoped run stays bookmarkable and survives a reload.
  - **One row of controls**, with everything that is not "what do I run" and "run it" moved into
    an actions menu behind a "..." button: Reload Tests, Clear Results, Clear Logs and, last,
    Finish & Stop Server. The menu follows the WAI-ARIA menu button pattern -- arrow keys move
    and wrap, Home/End jump to the ends, Escape closes and returns focus to the button, and the
    whole menu is a single tab stop. "Finish & Stop Server" is `aria-disabled` rather than
    natively disabled while there is no result to send, so it keeps its place in the key order
    instead of vanishing for keyboard users.
  - **A Target picker** switches the page between the browser and worker targets and back. Both
    are served by the same session whatever `--target` named on the command line, so switching is
    a page navigation rather than a CLI restart -- and the current scope rides along in the URL
    hash, so it is the same suite or test that runs on the other side.
  - **An "All tests" reset** beside the Scope box clears the scope in one click, and is disabled
    when there is nothing to clear -- so the controls also say at a glance whether the run is
    scoped to something. Clicking a result's "run again" button previously left the box holding a
    title with no visible way back to running everything short of selecting the text and deleting
    it. It clears without starting a run, the same as every other way of changing the scope.
  - **The live results view no longer changes the result.** Every test status change re-applied
    the "Failed only" filter to every node in the tree, and every node added read the results
    list's scroll position, forcing a synchronous layout. Both are quadratic in the number of
    tests: on this project's own ~2700-test suite they blocked the main thread for seconds at a
    time, which delayed the `setTimeout` calls the tests themselves were waiting on and failed
    tests on their 2000ms budget that pass everywhere else. The filter is now applied to just the
    test that changed and the suites above it, and a batch of lifecycle events reads and writes
    the scroll position once rather than once per node. Measured on that suite: the worst delay
    to a 5ms timer during a run fell from seconds to ~100ms, and its slowest test from ~5s to
    ~0.8s.
  - **Fourteen reporters** via `--reporter` (repeatable): `spec`, `dot`, `tap`, `json`,
    `json-stream`, `min`, `list`, `progress`, `landing`, `nyan`, `doc`, `markdown`, `xunit`, and
    `cargo` — Rust's `cargo test` output, with right-aligned status verbs,
    `test path::to::test ... ok` lines, rustc-style `error:`/`-->` diagnostics, an in-place
    `Testing [===>   ] 2/4: <test>` progress bar on a TTY, and a
    `test result: ok. N passed; ...` verdict. See
    [the cargo reporter](./docs/reporters.md#cargo) for how the two runners' concepts
    map onto each other.
  - **Custom reporters** are selectable the same way: `--reporter ./reporters/mine.js` (or a
    scoped package, or `module:<package>` for a bare package name) loads a module of your own,
    which exports a listener, a `{ listener }` object, or a `createReporter(options)` factory
    returning either. A bare word is still validated against the built-in names, so a mistyped
    reporter stays a typo rather than becoming a failed package lookup. `node` target only -- the
    browser and worker targets build their reporters inside the page/worker. See
    [Custom reporters](./docs/reporters.md#custom-reporters).
  - **Filtering and control:** `--grep`/`--fgrep`/`--invert`, `--bail`, `--timeout`, `--slow`,
    `--retries`, `--watch`.
  - **Coverage:** `--coverage`, with real per-module coverage on the browser and worker targets,
    not just node. `--coverage-src <glob>` (config: `coverageSrc`) says where the project's own
    sources live so files no test imported are still reported; it defaults to `src/**/*.ts`, which
    was previously hardcoded — for any other layout, coverage silently narrowed to whatever the
    tests reached and reported a higher percentage than the truth.
  - **A compile cache**, on by default, so running the same tests again over an unchanged tree
    compiles and type-checks nothing a second time -- on this repo's own suite the difference between
    8.7 s and 4.5 s. `--emit-cache` / `emitCache` records the identity of the whole program (every
    source file it used, its roots, the compiler version and options, and the lock files that decide
    how imports resolve) under `node_modules/.cache/tripwire`, never inside the project tree; while
    all of that is unchanged the previous run's output is reused and a clean type-check is not
    repeated. Any change turns the whole cache over at once, which is deliberately coarse: a
    whole-program emit can inline a `const enum` from another file or elide an import whose binding
    turns out to be a type. Every node run prints a `Compile cache: reused | rebuilt | isolated`
    line naming what changed when it rebuilt. Entries nothing has read for a week are swept, at most
    once a day, so an edit-and-run loop cannot grow the directory without bound. Node target only.
  - **`--type-check-scope run`** / `typeCheckScope` roots the type-check at the files the run
    matched -- those, everything they import, and anything declaring globals -- instead of the whole
    tsconfig project. Faster on a project far larger than one run, at the cost of what a green run
    proves, which is why `project` stays the default. A matched file outside the project is still
    reported as unchecked either way. Node target only; the config value is normalised and validated
    the same way as the flag.
  - **`--isolated-transpile`** / `isolatedTranspile` compiles each file on its own with
    `transpileModule` and caches it by its own text, when not type-checking. Opt-in because it cannot
    resolve an ambient `declare const enum` from a dependency (`@nevware21/ts-utils` declares
    `WellKnownSymbols` that way); such a project fails at load with
    `Cannot read properties of undefined`. Node target only.
  - **`--incremental`** / `incremental` keeps TypeScript's own `.tsbuildinfo` state between runs,
    under the cache directory rather than next to the tsconfig. Off by default: it measured no
    benefit, since emitting a file needs much of the work the check does, and the compile cache
    supersedes it for the unchanged-tree case. Node target only.
  - **`--graph-thread`** / `graphThread` builds the browser/worker module graph on a worker thread.
    Off by default: measured, the build then competes for the CPU the browser needs to start, and the
    main-thread build was ahead every time. Kept because the result is machine-specific.
  - **The browser warms up while the graph builds.** Chrome initialises its network stack on its
    first real navigation, which can take seconds on Windows; the runner launches the browser before
    file discovery and sends it to a dead port before building the module graph, so that
    initialisation overlaps the compile instead of following it.
  - **`ICompileProvider.registerHook(projectPath, cwd, checkDiagnostics, tsconfigOverrides, options)`**
    takes a new `ICompileHookOptions` argument carrying the matched files and the cache, scope,
    isolated-transpile and incremental settings above, so a custom compile provider sees the same
    inputs the built-in TypeScript provider does.
  - **Configuration files** are discovered and merged, so the flags above can be set once per
    project rather than repeated on every invocation.
  - **`--bind-address <address>`** chooses the interface the dev server binds to, and the host
    every URL handed to a browser/worker/puppeteer instance is built from. The default stays
    `127.0.0.1` -- loopback only, so the server is not reachable from the network. Set it when the
    browser is not on the same host as the runner (a container, a VM, a device pointed at
    `--browser-launch manual`); a wildcard bind logs the addresses that are actually reachable,
    since a wildcard is not something a client can connect *to*.
  - `--fail-on-hook` fails the run when a lifecycle hook throws or times out. Hook failures are
    recorded on the run summary and reported either way -- previously a failing `before`/`after`
    hook could leave no trace in the pass/fail counts at all, since it belongs to no test.

## Bug Fixes

- **`--type-check` now reports type errors on the `browser` and `worker` targets.** It only ever
  reported them on `--target node`. The other two printed
  `Skipping pre-run no-emit compile for browser/worker; module graph transpilation uses project:`,
  which was true of the duplicated project *walk* and false of the diagnostics -- so
  `--type-check --target browser` type-checked nothing while reading like an optimisation. A file
  containing a plain `TS2322` failed on `--target node` with exit 1 and passed on `--target
  browser` and `--target worker` with exit 0, the offending test itself reporting green. This
  repo's own `test:browser` and `test:worker` scripts both pass `--type-check`, so they were
  relying on a check that never ran. The diagnostics now run against the same `ts.Program` the
  module graph already builds to emit from, once, when that Program is created: no second parse,
  no second compile, and no `tsc` child process. Measured on this repo's browser suite, enabling
  it moves work from the compile phase to the prep phase and lands within noise of the
  transpile-only total.

- **An assertion chain can continue after a called assertion.** `expect(5).is.number().is.above(1)`
  threw `Cannot read properties of undefined (reading 'above')`, and so did chaining after any
  custom instance function, although the interfaces declared the chain valid. Every scope function
  returns `this.that`, and by the time it ran `scope.that` was the callable wrapper built for that
  same function, so a call returned a bare function. A scope function now runs with `this.that` set
  to a real instance for the current value, so what it returns can be chained from; the chain's
  context -- including a `not` -- is kept, as in Chai.
- **The interactive page kept rendering assertions after Clear Results.** Clearing while a render
  frame was pending emptied the queue but left the "flush scheduled" flag set, and the frame then
  returned early on the empty queue without clearing it -- so no assertion reported afterwards ever
  asked for another frame, and none rendered until the page was reloaded. Both paths now release
  the flag.
- **A failing test no longer shows its assertion twice on the interactive page.** Assertions render
  on the next animation frame, so when a test finished its failed assertion was usually still
  queued; the page counted only rendered ones, found none, and added a synthetic "Test failed" row
  under the real one. Queued assertions now count.
- **The Scope box reports whether its list is open.** It is a combobox, but `aria-expanded` was a
  static `"false"`; it now follows the list.
- **The expression adapter no longer calls an explicitly-called custom function twice.**
  `createExprAdapter("myFunc({0})")` invoked `myFunc` with the parsed arguments, and then -- because
  a function that returns `this.that` hands back its own callable wrapper -- invoked the result again
  with the adapter's own arguments. Only a step written without parentheses now leaves a trailing
  function for the adapter to call, which is the documented `createExprAdapter("equal")` form.
- **A matched file outside the tsconfig no longer leaves the compile cache blind to its imports.**
  Such a file is added to the program as an extra root, bringing its own out-of-project imports with
  it, but the cache manifest was recorded once from the project program and never widened -- so an
  edit to one of those imports (a `const enum` value, an import-elision flip) was served stale. The
  manifest is now re-recorded when the wider program genuinely added files, at the cost of one hash
  pass over the program's files in that run only.
- **A mistyped `typeCheckScope` in a config file is an error, not `"project"`.** Any value other
  than exactly `"run"` fell back to the whole-project check silently; the config value is now
  lower-cased and validated exactly as the `--type-check-scope` flag is.
- **`--type-check` is honoured by `--watch` on the `browser` and `worker` targets.** The watch loop
  never enabled the module graph's diagnostics or ran the scope reconciliation, so
  `--type-check --watch --target browser` reported no type errors and `--strict-type-check` could
  not fail -- the same false green the one-shot path was fixed for, surviving in the loop. Both
  now run on every iteration, and the module graph is built before the page is visited, so a
  compile or type error is printed to the console and the loop keeps watching -- served lazily,
  the same failure reached the page as a bare HTTP 500 and the run never finished.
- **`--type-check` no longer reports success over files it never checked.** It checks the tsconfig
  *project*; the run executes whatever the file glob matched, and nothing forced those two sets to
  agree. When they drifted apart -- a new test directory, a moved package, a glob widened without
  the tsconfig following -- the files that ran were never checked, and the run still printed
  `Type-check completed`. A test file containing a real type error could execute, pass, and leave
  the run green. The runner now reconciles the two sets after the check and reports the difference,
  naming the files; `--strict-type-check` (config: `strictTypeCheck`) turns that warning into a
  non-zero exit for CI. The same check covers a project that resolves to no files at all -- a
  mistyped `--project`, or `include` patterns matching nothing -- and `Type-check completed` is now
  printed only when files were actually checked.
- **Errors no longer bury their message under a minified stack trace.** Every failure after
  argument parsing printed `error.stack` unconditionally, which for the CLI's single uglified
  bundle meant ten or more frames of `at yo (tripwire.js:2:143518)` wrapped around the one line
  that said what to do -- and, for the first-run cases ("install puppeteer", "install typescript"),
  read as though the tool were broken. Deliberate, user-facing errors now print their message plus
  actionable hints and nothing else; an unexpected failure prints its message and says that it was
  unexpected. `--debug-stack` (config: `debugStack`; environment: `TRIPWIRE_DEBUG_STACK=1`) opts
  the stack back in for debugging the runner itself. Exit codes are unchanged.
- **Every source map the package ships was off by one line.** The `/*! ... */` banner was
  concatenated onto each bundle *after* minification, so every mapping pointed one line above
  where the code actually was -- and since the minified code is a single line, "line 2" simply did
  not exist in the map, making the maps unusable rather than merely inaccurate. The banner now goes
  through uglify, which accounts for it. Two related fixes land with it: rollup now chains
  TypeScript's own per-file maps, so a map resolves through to `internal/runner/src/**.ts` rather than
  stopping at the intermediate build output; and copying the `bin` artifacts into `core/bin`
  rewrites each map's `sources`, which are relative to the map's own location and were silently
  repointed at a directory that does not exist by the copy. Together these are what let
  `--debug-stack` print real file names and line numbers.
- **`--watch` now picks up test files created after it started.** The filesystem walk behind glob
  matching was cached for the life of the process, and the watch loops re-resolve inside a single
  long-lived process -- so every iteration after the first replayed the original file list. Writing
  a new test and saving it, the thing watch mode exists for, re-ran the suite without it and
  reported a smaller green run; deleting one left it in the list just as long. The cache is now
  scoped to a single resolve pass and dropped before each re-resolve, covering `--watch` on all
  three targets and the `--browser-launch open|manual` rebuild.
- **Build-output directories no longer swallow a pattern aimed at them.** `dist`, `build`,
  `bundle`, `coverage` and `.nyc_output` were skipped unconditionally while walking for test files,
  so a project whose compiled suite lives in one of them matched *nothing*, with no message -- even
  though naming the same file literally worked. They are still skipped for a broad pattern that
  merely sweeps past them, but a pattern that names the directory (`"test/build/**/*.test.js"`) is
  now followed. `node_modules`, `.git` and a Rush repo's `common/temp` remain unconditional. Documented under
  [file discovery](./docs/test-runner.md#which-directories-are-searched).
- **A failing `beforeAll`/`afterAll` no longer ends the run.** It stopped the suite it belonged to
  *and* silently unwound everything queued behind it: sibling suites with entirely unrelated
  fixtures never ran, their tests were counted but never reported (a TAP plan of `1..3` followed by
  one result line), and the run still exited `0` -- a partially-executed suite reported as success.
  A broken hook now stops only its own suite, whose tests are reported and counted as **skipped**,
  and the run carries on. Whether that fails the build stays
  [`--fail-on-hook`](./docs/test-runner.md#hook-failures)'s decision, and `--bail` is unchanged: it
  reacts to failing tests and ignores hooks. A listener returning `eListenerAction.Abort` from a
  `Hook` event still stops a run, and the suites left behind are reported as un-run rather than
  dropped.
- **`this.timeout(0)` disables the timeout instead of failing instantly.** A non-positive budget
  has always meant "no limit" for a synchronous test or hook, but the asynchronous path clamped the
  remaining time to zero and armed a 0ms timer, so the documented way to say "this one takes as long
  as it takes" failed with `Timeout of 0ms exceeded` before the body could do anything. It is now
  honoured on every path, including when set part-way through a test that is already being timed.
- **A timeout can now end the wait on its own.** A test that returned a promise was awaited
  directly, so the run waited on precisely what the timeout was meant to protect it from: a promise
  that never settled hung the whole run however short the budget was, and one that settled late made
  the run wait for a settlement it had already given up on. Whichever comes first -- the settlement
  or the timer -- now decides the result, and the loser is discarded.
- **`withHost(cb)` passes the current host to its callback.** It passed the `null` it forwards
  internally, so every caller of the one function whose whole purpose is to hand over the current
  host received nothing.
- **A hook failure a listener aborts from is still recorded on the run summary.** The failure was
  recorded *after* the `Hook` end event was notified, so an abort raised from that event
  short-circuited past it -- losing precisely the failure the listener had reacted to.
- **Every test counted in a run's totals is now reported to every reporter.** The two had disagreed
  in both directions, which made `totalTests` unreachable: the TAP plan line promised results that
  never arrived, and the `progress`/`landing`/`nyan` bars never reached 100%.
  - Tests excluded by an active filter (`--grep`, an interactive selection) are no longer counted
    in any total -- they are not part of the run, so they are neither counted nor reported. A
    `--grep` matching nothing now reports that no tests ran and exits non-zero instead of passing
    silently, so a typo'd pattern in CI is a build failure rather than a green run of nothing.
  - A suite that a filter leaves with no runnable test is now skipped entirely: its `before` /
    `after` hooks do not run and it emits no events. Previously only the `it` bodies were
    skipped, so picking one suite or one test in the interactive UI still lit up every suite in
    the results tree and ran every unrelated `before` hook -- indistinguishable from the
    selection being ignored. This matches Mocha, whose `--grep` never runs the hooks of a suite
    with no matching tests.
  - Selecting a suite in the interactive UI now runs its nested suites too, as running that one
    `describe` on its own would. It used to run only the suite's direct tests, so a suite whose
    tests all sit in nested `describe` blocks -- the usual shape of a file-level suite -- ran
    nothing.
  - Tests that are counted but never run -- `it.skip`, `describe.skip`, a suite whose `beforeAll`
    skips, a listener that skips or aborts, and everything left behind by `--bail` -- now emit
    their lifecycle events, so reporters list them.
- **`--bail` no longer reports every remaining test as a failure.** A test that never ran is
  reported as skipped rather than failed, so bailing on a suite of three whose first test fails
  reports `1 failing  2 skipped` instead of `3 failing`. The results still carry `aborted` and the
  abort reason. `TestStatus.Aborted` is now reserved for the test that was actually running when
  the abort happened.
- **The compile cache no longer confuses two files with identical text.** The entry key covered the
  source text and the compiler options but not the file's name, while the emitted output names the
  file it came from (the hook forces inline source maps). Two identical-text files -- an empty
  `export {}`, a re-export barrel, a fixture skeleton -- therefore shared one entry, and the second
  one reported the first one's name in every source-mapped stack frame and coverage record.
  `foo.ts` and `foo.tsx` were conflated the same way.
- **A browser launch that fails under `--graph-thread` is reported as a CLI error.** Nothing awaited
  the warm-up until after the module graph had been built -- seconds away on another thread, and
  never at all if the build threw first -- so Chrome being missing or crashing surfaced as an
  `unhandledRejection` that killed the process with a raw stack instead of the actionable error.
- `--bail` now works for the browser target. It was parsed, stored and shipped to the client, then
  never read, so `--target browser --bail` ran the whole suite to completion with no warning.
- The TAP reporter closes its YAML diagnostic block with `...` rather than a second `---` (which
  parsers read as an unterminated new document), and escapes `#` in test descriptions, which TAP
  otherwise treats as the start of a directive.
- The reporter summary line reports `skipped` and `pending` as separate counts, matching the CLI's
  own `Run summary:` line printed directly beneath it. The two previously disagreed on every run
  that skipped anything.
- **The xunit reporter strips control characters that XML cannot represent.** They are invalid in
  XML 1.0 even as a numeric character reference, so an assertion message carrying an ANSI colour
  escape -- routine -- produced a document Jenkins/JUnit parsers reject outright. Tab, newline and
  carriage return are kept, as are astral characters such as emoji.
- **The spec reporter no longer prints a header for a suite with nothing left to run.** A `--grep`
  excluding every test in a suite still printed that suite's title with nothing underneath it.
  Suite titles are now printed on the first line that actually appears beneath them. A suite whose
  tests are `it.skip`ped still prints -- a skipped test is part of the run and is reported.
- **`createReporter` warns before falling back to `spec`** when given a name it does not know,
  instead of quietly handing back different output than was asked for. The CLI already rejected an
  unknown `--reporter` outright; this covers programmatic callers.
- **Reporter output no longer prefixes every test title with `root`.** The full titles the `tap`,
  `xunit`, `json`, `json-stream`, `list`, `doc` and `markdown` reporters build included the
  synthetic root suite's own name, so TAP printed `ok 1 - root my suite my test` and xunit emitted
  `classname="root my suite"`. Titles a reporter prints and titles `--grep` matches against are now
  the same string, so a pattern copied out of TAP output selects the test it came from.
- `--grep`/`--fgrep` now match the same title on every target. The node target included the
  synthetic root suite's own name ("root") in the title it matched against, while the browser and
  worker targets stripped it, so an anchored pattern like `--grep "^my suite"` matched on browser
  and worker and matched nothing on node. All three targets now share one filter implementation
  and strip it.
- Fixed nested suite abort propagation, test ID generation, and stale per-test/per-suite result
  state leaking from one `run()` into the next (watch-mode reruns after an abort).

## Documentation

- **The interactive page is documented**, in
  [`docs/test-runner.md`](./docs/test-runner.md#the-interactive-page): every control (Scope box,
  All tests, Target, Failed only, Auto-reload, Run, the actions menu and what Finish & Stop Server
  does), the per-row run-again control, the URL-hash scope and the keyboard behaviour; the Karma
  guide maps the controls onto `fit`/`fdescribe`, `autoWatch` and `singleRun`.
- **[`docs/why-tripwire.md`](./docs/why-tripwire.md)** answers the question the READMEs used to
  bury: what is automatic across the node, browser and worker targets, what is fast without asking,
  how the runner compares with Mocha + ts-node, Karma, Jest and Vitest, and -- in plain terms --
  when not to use it (no mocking, no snapshots, no parallel processes, Chrome launcher only). The
  root and npm READMEs now lead with the runner and link to it, and the package metadata describes
  and tags the runner (`test-runner`, `browser`, `web-worker`, `typescript`, `mocha`,
  `karma`, `jest`) so it can be found as one.
- **[`docs/performance.md`](./docs/performance.md)** explains the runner's mechanisms (one Program
  per run, lazy per-file emit, the checker walk, the compile cache, the browser warm-up) and
  publishes benchmark results measured with `internal/benchmark` against ts-mocha and karma on
  this repository's own suites, both without and with coverage instrumentation on every arm, with
  the exact commands to reproduce them and the caveats that apply (the node comparison measures
  cache-reuse runs, since the harness never passes `--no-emit-cache`, and node coverage is the
  external `nyc` wrapper on both sides). Runs are measured against the Chrome build bundled with
  the installed puppeteer, launched with no executable-path override.
- **Benchmark runs can be recorded and are charted.** `npm run bench -- --record` writes a
  scrubbed JSON record of the run into `docs/performance/results/` (measurements, options, commit,
  tool versions and machine class; never a path, host, user or branch name, or OS build number) and rebuilds the
  directory's `index.json`; `validate.js` checks the directory on every `rush test`.
  [`docs/performance/history.md`](./docs/performance/history.md) charts every record over time
  with per-target, per-suite, per-runner and coverage filters and a table of the latest run, so the
  numbers on the performance page can be read against their history.
- **A Jest and Vitest migration guide**, [`docs/migration/migrating-from-jest.md`](./docs/migration/migrating-from-jest.md):
  matcher mapping (`toBe` is `to.strictly.equal`, since tripwire's plain `equal` is loose),
  suite API, CLI and `jest.config` / `vitest.config` mapping, what has no equivalent (mocking,
  snapshots, fake timers, parallel workers, jsdom), behaviour differences, a checklist, and a
  machine-readable JSON block that `docDrift.test.ts` checks against the parser and against a real
  assertion instance. The Mocha guide's Jest section and the Chai guide now give the same strict
  mapping; both previously pointed `toBe` / Chai's `equal` at the loose `equal`.
- **[`docs/llms.txt`](./docs/llms.txt)**, published at the site root in the `llms.txt` convention,
  maps every guide for AI agents, alongside AGENTS.md; both READMEs and the docs index link to them.
- **A Karma migration guide**, [`docs/migration/migrating-from-karma.md`](./docs/migration/migrating-from-karma.md):
  the `karma.conf.js` field mapping, the browser and worker targets, coverage and launch modes, with
  a machine-readable JSON block that the runner's tests check against the parser so it cannot drift.
  A Karma plus Mocha suite uses it together with the existing Mocha guide.
- **`AGENTS.md` and `CLAUDE.md`** at the repository root give AI agents the entry points for the
  three things they are most often asked to do here: migrate a project, use the runner, change the
  repository.
- **`docs/performance-improvements.md` is gone**; what it described is now the compile cache and
  the flags above, documented in [`docs/test-runner.md`](./docs/test-runner.md#compile-caching).

## Internal & Tooling

- **The interactive page has tests.** A puppeteer-driven suite (`internal/runner/test/src/ux/interactivePage.test.ts`)
  starts a `--browser-launch manual` session against a fixture project and drives the page on both
  the browser and worker targets: Scope picker contents and badges, full and scoped runs, the URL-hash
  scope surviving a reload, run-again and All tests, Failed only, the actions menu by mouse and
  keyboard with its ARIA contract, Target switching, Auto-reload, and Finish & Stop Server ending the
  CLI with the run's exit code -- 18 scenarios in about 12 s, skipping cleanly when puppeteer cannot
  launch Chrome. Alongside it, 134 unit tests cover the page's previously untested modules
  (`urlState`, `filtering`, `state`, `autocomplete`, `logging`, `utils`, `selection`,
  `ui-control`, `assertions`) through a stub `document`, including an incremental-vs-full-sweep
  equivalence check for the Failed-only filter.
- **The repository's own suites run on the tripwire runner, and Karma and ts-mocha no longer live
  in the published packages.** Through 0.1.8 `@nevware21/tripwire` and `@nevware21/tripwire-chai`
  ran `test:node` through `nyc ts-mocha` and `test:browser` / `test:worker` / `debug:worker`
  through `karma start`. Those scripts now invoke `tripwire` directly, and each package dropped six
  devDependencies (`karma`, `karma-chrome-launcher`, `karma-mocha`, `karma-spec-reporter`,
  `karma-typescript` and `ts-mocha`) along with its `karma.*.conf.js` files and the Karma-only
  test projects.

  Karma and mocha moved to a new unpublished `internal/benchmark/` package
  (`@nevware21/tripwire-benchmark`), which is now the only place those runners are configured. It
  measures the tripwire runner against **mocha** (node) and **karma** (browser and worker) over
  both real suites -- twelve arms in all. Arms are spawned directly instead
  of through `npm run`, so the figures no longer carry npm's start-up cost; coverage is off by
  default and, when requested, is applied to every arm and written only inside `internal/benchmark/`, so a
  benchmark can never overwrite the coverage artifacts CI uploads. `rush test` runs the package's
  `validate.js`, which checks every path, project and binary the harness depends on without
  running a suite. See `internal/benchmark/README.md`.

- **The benchmark harness pins its karma/mocha toolchain, and CI measures on one Node version.**
  `karma`, its four plugins, `ts-mocha` and `@types/node` are declared in
  `internal/benchmark/package.json` as exact versions rather than ranges: karma 6's dependency tree
  is no longer maintained in step with the rest of the repository's toolchain, so a routine minor
  bump anywhere in it -- including the `@types/node` karma-typescript compiles against -- breaks
  arms that have nothing to do with the change being tested, and a benchmark whose toolchain moves
  underneath it stops producing comparable numbers. `puppeteer` and `typescript` are deliberately
  left shared with the rest of the repo, since forking the browser or the compiler away from what
  the measured suites use is the one thing a benchmark must not do.

  A new `common/config/rush/common-versions.json` carries the two pins that cannot live in that
  package.json. `@types/node` is listed under `allowedAlternativeVersions`, because every other
  project shares one range for it and `rush check` rejects the pin otherwise -- which is what lets
  the rest of the repository move `@types/node` forward while the harness stays behind. `mocha` is
  listed under `preferredVersions`, because it reaches the repo only as a peer of `ts-mocha` and
  `karma-mocha`; declaring it as a direct dependency of the benchmark instead makes `rush update`
  fail to link on a clean install (`ERROR: Child already exists: string-width`), while
  `preferredVersions` holds it at an exact version with no such effect.

  The benchmark now runs in a single `if: matrix.node == 22` step in CI rather than on every version
  in the matrix: `rush test` still runs the harness's `validate.js` on all of them, which is the
  check that keeps the karma configs from rotting, but the karma arms themselves run once.
  `internal/benchmark`'s `test` script is `validate.js` accordingly -- the benchmark is
  `npm run bench`, as its README and `validate.js` already described. A new `npm run test:full` at
  the repository root (and in `internal/benchmark`) runs both, so "everything, benchmark included"
  is a command with a name rather than something you have to know to do in two steps.

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

## Documentation & Maintenance

- [#309](https://github.com/nevware21/tripwire/pull/309) ci: Drop Node.js 16 from CI matrix — Node.js 16 is End-of-Life and no longer supported by dependencies such as puppeteer

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
