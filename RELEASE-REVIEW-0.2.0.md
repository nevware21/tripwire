# v0.2.0 release review findings

Review of the five commits `7e4edb7..f5ccc5e` on `nev21/testSuite` (27174c5, 1e737d0, fdec769,
87b375f, f5ccc5e) that will be published as v0.2.0. Previous release tag: `v0.1.8`.

State at review time (2026-09-09): `rush build` and `rush test` pass on all six projects and leave
no tracked file modified. Each item is self-contained so it can be picked up on its own; when a fix
lands, delete its section from this document (so what remains is exactly the open work) and note
it in the "Landed or dismissed" list at the end. A finding judged not to be a problem goes there
too.

Severity key: **Blocker** = must land before `npm publish`; **Should** = land before publish if
practical, otherwise first patch; **Nice** = polish, no release impact.

Version numbers in the package.json files and the recommended ranges in the READMEs stay at 0.1.8
until the release PR; they are not findings.

## C. CHANGELIST.md



### C2. Release-time header and comparison link -- Blocker (release step)

- [ ] Fixed in: ______
- Retitle `# v0.2.0 (Unreleased)` to `# v0.2.0 <Month Day, Year>` and append
  `For full details see [v0.1.8...v0.2.0](https://github.com/nevware21/tripwire/compare/v0.1.8...v0.2.0)`
  as every earlier section does (see [CHANGELIST.md:313](CHANGELIST.md#L313)).

---

## E. Code hygiene in the runner





### E5. Behaviour notes to confirm are intended -- Nice

- [ ] Reviewed: ______
- Op instances no longer own their functions after 87b375f (shared prototype). Anything that
  enumerates an assertion instance changes. Intended; needs the CHANGELIST entry (C1).
- Under `run` scope the `.tsbuildinfo` name includes the roots ([tsCompile.ts:594](internal/runner/src/compile/tsCompile.ts#L594))
  but the manifest path does not ([cacheStore.ts:456-460](internal/runner/src/compile/cacheStore.ts#L456-L460)),
  so alternating globs under `--type-check-scope run` always report "rebuilt". Perf only.
- Per-run validation hashes every program file including `lib.*.d.ts` and every `node_modules`
  `.d.ts` ([cacheStore.ts:447-451](internal/runner/src/compile/cacheStore.ts#L447-L451)); the
  documented "~50 ms" is this repo's figure and will grow with large `@types` trees.
- `cacheStore.ts:437` / `:448` index `recordedLocks[lp][0]` outside a `try`; a hand-edited manifest
  with a malformed entry would throw out of `registerTypeScriptHook` rather than miss.
- Windows drive-letter case (`d:\proj` vs `D:\proj`) produces separate caches; harmless miss.
- `core/package.json` `engines.node >= 0.8.0` is now misleading for a package whose `bin` needs a
  modern Node; the library itself still runs on old engines. Decide whether to document rather
  than change.

---

## G. Follow-ups from the second documentation pass

### G13. API decisions from the third pass to confirm -- Nice

- [ ] Reviewed: ______
- **Expression-adapter `{name}`:** the G4 fix made a braced non-integer a *literal string* (the code's
  evident intent, and what `{string}` was documented as), where the pre-0.2.0 docs described `{name}`
  as a context lookup. The context lookup is the bare token (`equal(expected)`). No in-repo caller
  used the braced form; it is documented and tested either way, but it is an API choice.
- **`or()` is synchronous only.** A clause returning a promise is an `AssertionFatal` rather than a
  pass; supporting async clauses would need `or` to return a promise. Documented in the jsdoc,
  CHANGELIST and Jest guide.
- **Implemented in 0.2.0 but described only in CHANGELIST / TypeDoc, not in a guide:** the
  `ICompileHookOptions` argument to `ICompileProvider.registerHook`; the reporter summary splitting
  skipped and pending; the `root` prefix removal from reporter titles and `--grep` parity across
  targets (`docs/reporters.md` not updated); `TestStatus.Aborted` reserved for the aborted test;
  `createReporter`'s warn-and-fall-back on an unknown name. None blocks the release; the first
  three belong in `docs/reporters.md` and `docs/test-runner.md` for 0.2.1. (The interactive page
  itself is now documented -- see the 2026-10-20 entry below.)
- **Interactive page follow-ups (from writing its tests), 0.2.1:** a way to hold the page's first
  automatic run (a query flag) so "before any result" is directly observable instead of needing a
  MutationObserver trace; a programmatic way to start an interactive session without the CLI's
  argument plumbing (`_startBrowserRunnerSession` needs `IGraphBuilders` that only `execute.ts`
  can build); `scopeSelect` rows carry no `aria-selected` (an `.active` class only); a
  synchronous throw inside `logging.ts`'s `_drainLogSendQueue` would wedge its flush chain
  (unreachable in a browser or worker, both of which have `location`); `_shouldShowTestNode(null)`
  returns `null` rather than `false`; Stop mid-run is untested (the fixture is too fast to catch).

---

## F. Verified clean (no action)

- ES5: `core/src`, `shim/chai/src` and the built ES5 bundle are free of ES2015+
  APIs/syntax (`includes`/`startsWith`/`find`, `Object.assign`, `Number.isInteger`, bare `Symbol`,
  `Promise`, spread/for-of over iterables). `Symbol.iterator`/`hasInstance` go through
  `getKnownSymbol`; `globalThis` is behind a `typeof` guard in `core/globals.js`.
- fdec769 is mechanically correct (for-of to `arrForEach` with `-1` early exit, `?.` removed,
  `strStartsWith`).
- Dependency floors: installed `ts-utils` 0.16.0 / `ts-async` 0.6.1 equal the declared minimums
  and everything newly used exists there.
- Packaging: `rush.json` marks globals `shouldPublish`; `publish-groups.json` lists core, globals,
  shim/chai; `core/.npmignore` includes `bin/**`, `globals.js`, `globals.d.ts`; all three packages
  have `license`, `repository`, `keywords`, `bugs`, README and a tracked LICENSE;
  `@nevware21/tripwire/globals` resolves by file (core has no `exports` map) and every spelling
  agrees; `globals` `types: index.d.ts` at the root works for `"types": ["@nevware21/tripwire-globals"]`.
- Both migration JSON blocks parse; every flag named in the Karma guide exists in `parseArgs.ts`
  and `docs/test-runner.md` (D1's port mapping, now fixed, was the exception); all relative links and anchors in the 21 changed `.md`
  files resolve; no links remain to the deleted `docs/performance-improvements.md`.
- Every parsed flag appears in both `docs/test-runner.md` tables and all 40 `ITripwireConfig`
  fields are in the config table; the five new flags are also in the Mocha guide JSON.
- Cache key includes `ts.version`, every merged compiler option including `tsconfigOverrides` and
  the forced source-map settings; nyc instrumentation is applied after `module._compile`, so it is
  correctly outside the cache; `--no-emit-cache` short-circuits every store function; writes are
  temp-then-rename and reads require the completion marker, so concurrent runs and unwritable
  dirs degrade to misses; a transpile-only run records `checked: false`, so it can never let a
  `--type-check` run skip; diagnostics run once per program; `--strict-type-check` still works
  after a skipped check.
- 87b375f touched nothing under `internal/runner/src`; the runner never calls `getMetrics()`, so
  metrics-off-by-default does not regress it.
- No `TODO`/`FIXME`/`debugger`/`console.debug` added; the added `console.log`s are the cache
  status line and `--help`.

---

## Suggested order

1. Release PR: version bumps, README ranges to `>= 0.2.0`, C2; rebuild; `rush test`;
   `npm run readme-link-check`; `npm pack` each package.
2. E5 (behaviour notes to confirm) as a follow-up or 0.2.1.

---

## Landed or dismissed

- **Interactive page: tests, docs and three fixes** -- 2026-10-20, uncommitted.
  - **Docs:** `docs/test-runner.md` "The interactive page" (every control, run-again rows, URL-hash
    scope, keyboard); Karma guide maps the controls onto Karma concepts; `llms.txt` updated.
  - **Puppeteer suite:** `interactivePage.test.ts` + `test/fixtures/interactive/` -- 18 scenarios on
    browser and worker (start-up states via a MutationObserver trace, Scope picker, full/scoped runs,
    hash restore on reload, run-again + All tests, Failed only, the ARIA menu by keyboard, Clear
    Results/Logs, Target switch keeping the hash, Auto-reload, Finish ending the CLI with exit 1 and
    the expected summary); `this.skip()` when Chrome is unavailable (verified).
  - **Unit tests:** 134 across nine page modules via a stub `document` loader (`urlState`,
    `filtering`, `state`, `autocomplete`, `logging`, `utils`, `selection`, `ui-control`,
    `assertions`).
  - **Fixes the tests exposed:** assertions stopped rendering after Clear Results raced a pending
    frame (`ui-rendering.ts`: flag released on the empty-queue early return and in `clearResults`;
    regression test); a failing test rendered its assertion twice (`test-execution.ts`: queued
    assertions now count before adding the synthetic row; the page test asserts exactly one row);
    the Scope combobox's `aria-expanded` now follows the list (`autocomplete.ts`).
  - **Verified:** runner suite green including the puppeteer scenarios; runner rebuilt into
    `core/bin`; core browser/worker suites re-run on the rebuilt client bundle.

- **Third pass (and/or, runner, benchmark recording, new docs)** -- 2026-10-19, uncommitted. Three
  read-only audits; every finding verified before fixing.
  - **`or()` (two confirmed defects):** a clause returning a promise was treated as passed and its
    rejection left unhandled -- now an `AssertionFatal` (`or() clauses must be synchronous`), with the
    promise's rejection absorbed first; and a failing clause reached assertion listeners and, under a
    Continue listener, was deferred onto the running test, so a *satisfied* `or` failed the test and
    every clause inflated failure counts -- clause scopes now carry an `eval` override that fails
    without notifying, so only the combined verdict is evaluated through the real context. Also:
    `AssertionFailure` subclasses are recoverable (`instanceof`, with the `name` check kept for a
    second library copy), and the message reads correctly under `not` (`(failures: [...])`).
    New `expect.or.listener.test.ts`: promise clause, `not` wording, and two nested-runner tests with
    a Continue listener (passes once / fails once, one notification each).
  - **Benchmark records carried the branch name** (`nev21/testSuite`, a GitHub handle) despite the
    "no user names" claim -- removed from records, index and the history table; the two seeded
    records migrated and renamed to the new seconds-based name
    (`<date>T<hhmmss>-<commit>[-coverage].json`, so two recordings a minute apart cannot
    overwrite). The path regex no longer rejects a branch such as `feature/home/page` and now catches
    forward-slash drive paths, UNC and `file://`. `runBenchmark` reports a failure inside the
    success path (`.then().catch()`).
  - **History page:** the `prefers-color-scheme: light` override would have put dark text on the
    dark-only hacker theme -- removed.
  - **Watch loop:** `_checkTypeCheckScope` under `--strict-type-check` now sits inside the same
    guard as the build, so an out-of-project file is reported and watched rather than ending the
    session.
  - **Docs:** Jest guide `toHaveProperty(name, value)` rows no longer claim deep equality (they
    point at `.that.deep.equal(v)` / `assert.deepNestedProperty`), the extra-timeout-argument rows
    say "ignored at runtime" rather than "not accepted", and the zero-match message lists the three
    real messages; `core/README.md` Quick Start's `to.be.a.string;` (asserted nothing) is
    `.string()`; "every flag has a config field" qualified (`--fgrep`); node coverage wording names
    `tripwire coverage-report`; `performance.md`'s `results/` link points at `index.json` (Pages
    has no directory listing); CHANGELIST no longer claims *every* `*Func`/`*Op` is exported
    (`oneOfFunc`, the keys funcs, `isOp`, `toOp`, `nestedOp`, `noopOp` are not); link checker
    ignores `_`-prefixed paths Jekyll never publishes.
  - **Verified clean by the audits:** the `_handleResult` root fix (nothing depended on the old
    wrapper; `assert.*` now really returns an instance; all modifiers persist; no hot-path cost),
    ES5 output, bundle freshness, `and`/`at` collisions, cache prune/touch races, manifest
    re-record, watch rebuild after a failed `prepare`, every history-page field name, kramdown
    handling of the embedded script, XSS (textContent only).

- **G12, plus `and` and `or`** -- 2026-10-16, uncommitted.
  - **Root fix (G12):** `_createResultAdapter` now sets `scope.that = scope.newInst()` before
    invoking a scope function, so every `return this.that` (all built-ins, all docs examples, custom
    instance functions) yields a real instance and the chain continues:
    `expect(5).is.number().is.above(1)` and `expect(x).myFn().to.equal(x)` both work. The chain's
    context is kept, so a `not` before the call still applies after it (Chai semantics); two `not`s
    compose as a double negation, as before.
  - **`and`:** a decorative word on `IAssertInst` (`noopOp`, `and: this`, `@since 0.2.0`), so
    `expect(5).is.number().and.is.above(1)` reads as two assertions on one value. Same shape as the
    existing `and` on a `property(...)` result, which also continues on the object (`that`/`value`
    switch to the property) -- the docs row that implied otherwise is corrected.
  - **`or(...clauses)`:** `orFunc` in `core/src/assert/funcs/or.ts`, registered on `IAssertInst` and
    exported. Each clause runs on a fresh *root* scope (`createAssertScope(createContext(value, ..., opts))`)
    rather than a child, because a child context proxies `eval` through its parent and would apply
    an outer `not` to every clause and then again to the combined result. Catches only
    `AssertionFailure` by `name` -- `AssertionFatal` inherits from it and must propagate, as must
    ordinary errors. Stops at the first passing clause; when all fail the message lists every reason;
    `not.or(...)` passes only when every clause fails; the chain's config is carried into clauses.
  - **Tests:** `core/test/src/assert/expect.and.or.test.ts`, 17 tests across the three behaviours,
    including the fatal / plain-error propagation and the clean-clause guarantee.
  - **Docs:** `IAssertInst` jsdoc for both; CHANGELIST New Features bullets and a Bug Fixes bullet for
    the root cause; expression-adapter chain table rows; a Chai-guide row for `.and`.
  - **Verified:** `rush build` and `rush test` pass on all six projects (browser and worker included,
    with `PUPPETEER_EXECUTABLE_PATH` pointed at system Chrome); core node 2734/0 (2 skipped,
    pre-existing), runner 637/0.

- **C1, C3, E1-E4, G11** -- 2026-10-16, uncommitted.
  - **C1:** CHANGELIST gains sub-bullets under the CLI entry for the compile cache (`--emit-cache`,
    status line, eviction), `--type-check-scope`, `--isolated-transpile`, `--incremental`,
    `--graph-thread`, the browser warm-up and `ICompileProvider.registerHook(options)` /
    `ICompileHookOptions`, plus a new "Documentation" section for the Karma guide, AGENTS.md /
    CLAUDE.md and the removal of `docs/performance-improvements.md`. The ES5 restoration and the
    perf commit were left out as asked.
  - **C3:** the "Breaking Changes" section is gone; `@nevware21/tripwire-globals` is described under
    "New Packages" with both configuration snippets. The "Internal & Tooling" entry now speaks from
    0.1.8's point of view (`nyc ts-mocha` / `karma start` scripts replaced by the runner) and no
    longer names the never-published `*x` scripts, `benchmarkTests.js` or `time-npm-script.js`.
  - **E1:** the orphaned doc block sits on `setGraphTypeCheck`; `_createIncrementalChecker`'s
    doc says *not* `noEmit`; `_createCheckedProgram`'s says incremental is off by default;
    `compileTypeScript` is documented as the `ICompileProvider.compile` contract entry the CLI no
    longer calls (it cannot be deleted: `provider.ts` wires it into the published interface).
  - **E2:** `readEmitCache` touches an entry's mtime on every hit, and `pruneEmitCache` removes
    entries not read for seven days, at most once a day per cache directory (stamp file), called from
    `registerTypeScriptHook`. Age rather than manifest reachability, because isolated and
    whole-program entries from several projects share one directory and only whole-program ones have
    a manifest. Four tests in `cacheStore.test.ts`; documented in `test-runner.md`,
    `ITripwireConfig.emitCache` and CHANGELIST.
  - **E3:** `_emitWithProgram` re-records the manifest when the extra-root program used a file the
    recorded manifest does not list (`_hasUnrecordedFiles`: one set lookup per source file, so a
    program that merely re-parsed the recorded set costs nothing), keeping the recorded check status.
    Verified with a scratch project: a `const enum` in an out-of-project import went 10 -> 20 and
    the next run reported `rebuilt -- helper.ts changed` and printed 20; before, it was served stale.
  - **E4:** the config file's `typeCheckScope` is lower-cased and validated exactly as the flag is;
    `"Run"` is accepted, `"everything"` is an error naming the value and the config. Two tests.
  - **G11:** `_runOp` only treats a trailing function as "call it with the adapter's arguments" when
    the step was written without parentheses (`args === null`); an explicitly-called step is never
    invoked twice. The docs' `return this.that` convention stands (every built-in does the same) and
    the "Instance Custom Assertions" section now says what each return value means. Two tests pin
    both behaviours. The probe that found this also found G12.
  - **Verified:** core rebuilt, core node 2717/0 (2 skipped, pre-existing); runner rebuilt into
    `core/bin`, runner 637/0. Note for anyone re-running: `--timeout` must not be passed to the
    core suite -- `timeout.test.ts` asserts the 2000ms default.

- **G1-G10** (documented but not implemented) -- 2026-10-09, uncommitted.
  - **G1:** `assert.notDeepStrictEqual` / `notDeepStrictEquals` added to core
    (`createNotAdapter(deepStrictEqualsFunc)`, declared in `IAssertClass.ts`, `@since 0.2.0`);
    three tests in `assert.equals.test.ts`. The node-assert guide now lists `match` as identical,
    `doesNotMatch` -> `notMatch`, and its troubleshooting sample no longer uses `assert.rejects`.
  - **G2:** `at` added to the `is`/`be` op as a decorative chain word (`noopOp`, like `a`/`an`),
    so `expect(x).to.be.at.least(n)` works as the Chai guide shows; test in `expect.to.test.ts`.
  - **G3:** the browser/worker `--watch` loop now calls `_setGraphTypeCheck` once and
    `_checkTypeCheckScope` per iteration, and builds the graph eagerly through a new
    `IBrowserRunnerSession.prepare(target)` before visiting the page, so a compile/type error is
    printed and the loop keeps watching (served lazily it was a bare HTTP 500 and a hung run).
    Verified with Chrome against a scratch project: `TS2322` reported, "Watching 1 file(s)",
    file fixed mid-run, `1 passing`.
  - **G4:** `_parseStepArg` excludes `NaN` (`{text}` is a literal), `_runOp` tests
    `arg.idx !== undefined` (`{0}` is index zero); three tests replace the file's "requires
    careful handling" note. `docs/expression-adapter.md` rewritten to the real forms (`{N}`,
    `{text}`, bare token = context lookup), real chain structure, `is.*`/`has.all.keys` steps,
    real error format, `$deep` workaround removed.
  - **G5:** `core/src/suite/README.md` uses `createTestRunner`/`ITestRunner`, the real type names
    (`TestFn`, `HookFn`, `IDoneFn`, `ISuiteDefinitionFn`, ...), `skip` not `skipped`, status/error
    on `ITestResult`, and "skipped" after a failed `before`.
  - **G6:** `docs/test-runner.md` and the Mocha guide document the append rule for list-valued
    flags (`--reporter` the exception), array concatenation across config levels, last-name-wins
    within a directory, the real home-directory candidates, the walk to the filesystem root, and
    that `--fgrep` has no config field.
  - **G7:** `this.currentTest` marked as a different shape with its fields listed; the
    preload-before-globals mechanism scoped to node; browser/worker `--require` documented as
    file paths only (table rows, config row, JSON note).
  - **G8:** `manual` mode lazy build, `--source-maps` + `--coverage`, `coverage-report` ignoring
    unknown options, `common/temp` skip (also CHANGELIST), `--`, `--flag=value`, no-args/`help`
    behaviour, Karma `logLevel` -> `--verbose` (HTTP log only).
  - **G9:** shim README drops `sizeOf`; core README says headless Chrome; `change-assertions.md`
    lists `notChangesBy`/`notIncreasesBy`/`notDecreasesBy`.
  - **G10:** CHANGELIST "New core exports" bullet grouping the new public API; bullets also added
    for `notDeepStrictEqual`, `at`, the adapter fix and the watch type-check fix.
  - **Verified:** core rebuilt, core node 2715/0 (2 skipped, pre-existing); runner rebuilt into
    `core/bin`, runner 631/0 (two runs at the default 2s timeout each had one *different* test
    time out at ~3s while other work ran on the machine; clean with `--timeout 10000`). Both
    migration JSON blocks still parse; the DOC-HELPDRIFT and Karma drift tests pass.

- **Second-pass doc fixes** -- 2026-10-09, uncommitted. The Karma guide's §7 claimed browser runs
  reuse the compile cache (a gap in the D3 fix); it now says browser/worker compile every run.
  CLAUDE.md and AGENTS.md claimed all four migration guides end in a JSON block and that `--help` is
  "generated from the same source" as `docs/test-runner.md`; both now say only the Mocha and Karma
  guides carry a block, and that help is maintained alongside the doc with a one-way drift test.

- **D1-D4, D6-D8** (documentation accuracy) -- 2026-09-14, uncommitted.
  - **D1:** the Karma guide maps `listenAddress`/`hostname` to `--bind-address <address>`, and
    `port` to nothing, since a free port is chosen. The JSON block has `"port": null` and all seven
    config file names.
  - **D2:** `--help` gains `--bind-address` and `-p -s -t -g -f -b`. A new DOC-HELPDRIFT test in
    `docDrift.test.ts` fails if a flag named in a `docs/test-runner.md` CLI table row is missing
    from `_printUsage`.
  - **D3:** documented rather than implemented. "Node target only" now appears on the four flags in
    `--help`, both `test-runner.md` tables, the compile-caching and narrowing sections, the
    `ITripwireConfig` comments and the Mocha guide's `compileCache` JSON.
  - **D4:** a new `"isolated"` state in `ICompileCacheStatus`, printed as
    `Compile cache: isolated -- each file is compiled on its own, and reused while its text is unchanged`.
    Per-file counts are not possible because the line prints before any file is required.
  - **D6:** `core/README.md` has a "Running Tests" section linking the runner guide and the globals
    package.
  - **D7:** `--no-emit-cache` help and `test-runner.md` now say `--incremental` state is still kept.
  - **D8:** `copilot-instructions.md` gives Node 18-24, all seven package.json files plus the five
    exact pins, and all five README range files. `jekyll-gh-pages.yml` pins Node 22.
  - **Verified:** runner rebuilt into `core/bin`, runner suite 631/0, `--help` output checked, and
    two consecutive `--isolated-transpile` runs both print the `isolated` line.

- **B2, B4** (`@since` tags on `FormatResult` and `ITripwireConfig`) -- dismissed 2026-09-12: the
  existing tagging is expected. Nothing to change.
- **A1** (CLI bundle had no shebang) -- 2026-09-10, uncommitted on `nev21/testSuite`. The CLI
  bundle's uglify preamble is now `#!/usr/bin/env node` plus the banner, so the source map
  accounts for both lines; `binGuard.test.ts` gained a BIN-SHEBANG group asserting the shebang is
  the first bytes (bare LF, no BOM), that the browser/worker bundles carry none, and that neither
  preamble line is mapped. Verified: `./bin/tripwire.js --help` runs from a POSIX shell.
- **A2** (`new Map` in `core/src/suite/runner.ts`, present in the ES5 bundle) -- dismissed
  2026-09-10: the runner using `Map` is accepted; `createTestRunner()` requires a `Map`-capable
  engine. Nothing to change.
- **A3** (same-named sibling suites from separate `useSuite()` calls shared an id, so the hook-chain
  cache ran the wrong `beforeEach`) -- 2026-09-10, uncommitted on `nev21/testSuite`. Fixed at the
  source of the ids rather than in the runner: `_generateId` no longer keeps an occurrence table,
  and `useSuite()` / `createSuite()` no longer swap generator state. The occurrence index is now
  counted from the parent's actual children (`_childOccurrence`), so an id is a pure function of
  (parent id, description, index among same-named siblings) and the same tree shape always yields
  the same ids. Tests: pure-function contract in `idGenerator.test.ts`, tree-level guarantees in
  `idGeneration.test.ts`, and the hook-order repro in `runner.test.ts`. Core node suite 2695/0,
  runner suite 574/0.
- **Interactive selection ran every suite's hooks** (not in the original review; reported 2026-09-10,
  fixed the same day, uncommitted). The shared `--grep` and suite/test-selection filters only
  implemented `canRunTest`, so the runner still entered every suite, ran its `before`/`after` hooks
  and emitted its events; only the `it` bodies were skipped, which made a selection look ignored.
  `_pruneEmptySuites` in `shared/filters.ts` now derives `canRunSuite` from `canRunTest` (root never
  pruned; Mocha parity). Seven tests in `filters.test.ts`; CHANGELIST bullet added. Verified with
  puppeteer against the browser and worker UIs: only the selected suite renders.
  Follow-up the same day: a selected suite matched by exact title, so one whose tests all sit in
  nested `describe`s ran nothing; `isSuiteOrDescendant` now includes nested suites. Runner suite
  584/0.
- **One Scope picker** (not a review finding; requested 2026-09-11, uncommitted). The interactive
  page`s separate Suite and Test boxes are now a single searchable Scope box listing every suite
  and test together, each row badged with its kind. The model behind it is
  `src/shared/scopeOptions.ts`, pure and node-testable, with `ux/browser/ui/selection.ts` reduced
  to the part that touches the input. 25 tests in `scopeOptions.test.ts`; CHANGELIST bullet added.
  Verified with puppeteer on the browser and worker targets: 15 UI checks, runner suite 609/0,
  core node 2695/0.
- **One row of controls, an actions menu and a Target switch** (not review findings; requested
  2026-09-11, uncommitted). Reload Tests, Clear Results, Clear Logs and Finish & Stop Server moved
  into a `...` menu built to the WAI-ARIA menu button pattern (`ux/browser/ui/menu.ts`), so the
  controls are a single row. A Target picker (`ux/browser/ui/target.ts`) switches the page between
  the browser and worker targets, carrying the scope in the URL hash; both targets are served by
  one session, so it is a navigation rather than a CLI restart. 19 unit tests for the two pure
  helpers; verified with puppeteer from both targets, 25 UI checks each. Runner suite 628/0, core
  node 2695/0.
- **No visible way back from a scoped run** (not a review finding; reported 2026-09-12,
  uncommitted). Clicking a result's "run again" button scopes the run to one test, and the only
  ways out were the dropdown's "All tests" row or selecting the box's text and deleting it. An
  "All tests" button now sits beside the Scope box, disabled when there is nothing to clear.
  Clears without running, and moves focus to Run since it disables itself. Verified with puppeteer
  on both targets, 11 checks each, walking the exact scenario: rerun one test, reset, run
  everything again.
- **Live results view made browser-target tests fail** (not a review finding; reported 2026-09-11,
  uncommitted). `applyFailedOnlyFilter` ran a full sweep of every test and suite node on every
  status change, and each node added forced a layout by reading the results list's scroll
  position -- both quadratic. On core's own suite the main thread blocked for seconds, delaying
  the timers tests wait on: "should execute async hooks in correct order" took 2184-2763ms against
  a 2000ms budget and failed. Now incremental per test, and one scroll read/write per lifecycle
  batch. Same test: 405-456ms, passing; slowest test in the run 5865ms -> 833ms; worst 5ms-timer
  delay during a run seconds -> ~100ms. Verified: core browser 2694/0, worker 2694/0, node 2695/0,
  runner 628/0, plus 6 puppeteer checks that the Failed-only filter still behaves.
- **A4** (`this.timeout(0)` failed an async test instantly) -- 2026-09-11, uncommitted. `_armTimeout`
  now treats a non-positive budget as "no limit" rather than clamping it to a 0ms timer, matching the
  synchronous path and Mocha, and `this.timeout(0)` set part-way through an already-timed function
  cancels the armed timer instead of restarting it at zero. Five tests in `timeout.test.ts`; docs
  updated in `test-execution-flow.md` and both `timeout` rows of `test-runner.md`.
- **A5** (`withHost(cb)` passed `null`) -- 2026-09-11, uncommitted. `useHost` passes `theHost`, the
  host it actually installs, rather than echoing its `host` argument back. New
  `core/test/src/internal/configHost.test.ts`, six tests covering both entry points.
- **A6** (a never-settling promise hung `run()`) -- 2026-09-11, uncommitted. The promise path no
  longer returns the derived promise; both asynchronous paths now return the same completion promise,
  which `_complete` resolves from whichever of the settlement or the timer arrives first, discarding
  the loser. Two tests in `timeout.test.ts`.
- **A7** (emit-cache key omitted the file path) -- 2026-09-11, uncommitted. `emitCacheKey` takes the
  normalized file name as its first argument and both call sites pass it; the doc comment now
  explains that the emit is not a pure function of the source text because the forced inline map
  names the file. Four tests in `cacheStore.test.ts`; verified the cache still reports `rebuilt`
  then `reused` across consecutive runs.
- **A8** (`--graph-thread` unhandled rejection on a failed browser launch) -- 2026-09-11,
  uncommitted. The warm-up promise gets a rejection handler as soon as it is created, so the later
  `await` still reports the error the normal way and an abandoned launch no longer kills the
  process. Verified: `PUPPETEER_EXECUTABLE_PATH` pointed at a path with no Chrome prints
  `Error: Tried to find the browser at the configured path ...` and exits 1.

  Verification for A4-A8 together: core node 2708/0, browser 2707/0, worker 2707/0, runner 630/0.
  The A4 and A6 tests were each confirmed to fail with only their own fix reverted -- A4 with
  "timeout(0) disables the limit, it does not expire instantly", A6 by hanging until the outer 2s
  budget expired.

- **D5** (`docs/test-execution-flow.md` timeout claims) -- 2026-09-11, uncommitted, closed out with
  A4 and A6 since both required edits to the same passages. All four "5000ms" defaults now say
  2000ms, the async/await and "handler created before execution to prevent hangs" claims are
  replaced by what the code actually does (armed once the function is known to be asynchronous;
  first of settlement or timer decides, loser discarded), and `timeout(0)` and the synchronous
  overrun check are both documented.

  Note: when puppeteer in `common/temp` is updated its expected Chrome build is often missing from the
  cache and browser/worker runs fail with `Could not find Chrome (ver. X)`. Fix it with
  `node common/temp/node_modules/puppeteer/install.mjs` (done 2026-10-18 for 155.0.8059.79). Do not
  point `PUPPETEER_EXECUTABLE_PATH` at a system Chrome: the test and benchmark runs that did so had to
  be repeated on puppeteer's own browser.
