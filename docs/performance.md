# Runner Performance

Tripwire's test runner is built to spend its time running tests rather than getting ready to. It
builds one TypeScript `Program` per run and emits only the files the run actually loads; it answers
`--type-check` with a checker walk over that same `Program` instead of a `tsc` child process; on the
node target it caches the whole compile between runs so an unchanged tree compiles and type-checks
nothing; and on the browser and worker targets it launches Chrome before it has even looked for test
files, so the browser's slow first navigation overlaps the compile. Measured on this repository's own
suites on 2026-10-18, and recorded in [`results/`](results/index.json) (details and caveats in
[Measured](#measured)): on the node target tripwire ran the 2,734-test `core` suite in **6.07 s**
against **9.13 s** for `ts-mocha`, and the `shim/chai` suite in **1.06 s** against **2.70 s**; on the
browser target **14.00 s** against **19.42 s** for karma on `core`, and **10.07 s** against
**11.19 s** on `shim/chai`; on the worker target **12.57 s** against **19.24 s**, and **9.69 s**
against **10.98 s**. Every browser and worker arm ran Chrome 155.0.8059.79, the build bundled with
puppeteer 25.14.0, launched by puppeteer with no executable-path override. The compile cache took a
type-checked `core` node run from **9.3 s** with the cache off to **5.2 s** over an unchanged tree,
with the remaining time almost entirely the tests themselves. With coverage instrumentation on,
tripwire's own browser and worker coverage added **3.43 s (+24.5%)** to the `core` browser run and
**3.00 s (+23.9%)** to the `core` worker run, while on the node target, where both runners sit under
the same `nyc` wrapper, coverage added **3.49 s (+57.5%)** to tripwire's `core` run and **4.60 s
(+50.4%)** to mocha's; tripwire stayed ahead of the alternate runner in all six instrumented
comparisons.

- [What the runner does](#what-the-runner-does)
  - [Node target](#node-target)
  - [Browser and worker targets](#browser-and-worker-targets)
  - [Mechanisms by target](#mechanisms-by-target)
- [Measured](#measured)
  - [Node target: tripwire vs mocha](#node-target-tripwire-vs-mocha)
  - [Browser target: tripwire vs karma](#browser-target-tripwire-vs-karma)
  - [Worker target: tripwire vs karma](#worker-target-tripwire-vs-karma)
  - [Measured: with coverage](#measured-with-coverage)
  - [Compile cache: cold, warm and off](#compile-cache-cold-warm-and-off)
  - [Caveats](#caveats)
  - [Machine](#machine)
- [Reproduce](#reproduce)
  - [Recording a run](#recording-a-run)
- [What it does not do](#what-it-does-not-do)

## What the runner does

The flags and config fields mentioned below are all documented in
[test-runner.md](./test-runner.md); this page explains what they are for and what they cost or save.

### Node target

**A first run.** The runner resolves your tsconfig, matches the test globs and builds a single
TypeScript `Program` for the project. That one `Program` is used for everything: when
`--type-check` is on, `ts.getPreEmitDiagnostics` is asked of it, which is the checker walk and
nothing else -- no second parse, no second compile and no `tsc` child process. The same `Program`
then backs a `require` hook, and each file is emitted individually, in memory, at the moment the
run first requires it. Nothing is emitted up front and nothing is written next to your sources. A
test project whose tsconfig covers more files than any one run loads (this repository's
`test/tsconfig.test.json` covers the node, browser and worker test directories together) pays the
one-time parse for all of them but the emit for only the ones that load.

That is why `--type-check` costs so little relative to transpile-only: transpiling and type-checking
are two questions asked of the same `Program`, which has to be built either way so that `const enum`
values from dependencies resolve. On this repository's suite the check moves work from the compile
phase to the prep phase and lands within noise of the transpile-only total.

When the run ends, the compile cache (`--emit-cache`, on by default) records a manifest of the whole
program -- every source file it used, the roots it was built from, the compiler version and options,
and the lock files that decide how imports resolve -- together with the emitted output, in a cache
directory inside the project's `node_modules` (see [compile caching](./test-runner.md#compile-caching)
for where, and for the no-`node_modules` fallback). It also records whether this run type-checked.

**A repeat run over an unchanged tree.** The runner verifies the manifest, which costs about 50 ms,
finds that nothing changed, and reuses last run's output. If last run type-checked cleanly, so has
this one -- same inputs, same verdict -- so no `Program` is built and no checker runs. The run prints
`Compile cache: reused -- nothing changed, type-check skipped`, and what remains is the tests. In the
[measurements below](#compile-cache-cold-warm-and-off) the type-check phase was 3501 ms with the
cache off and 249-273 ms with it reused, and the whole run 9304 ms against 5168-5232 ms, of which
about 4.6 s was the tests themselves. A run that only transpiled records that it did not check, so
it can never let a later `--type-check` run skip checking on its behalf.

**A run after an edit.** Any change to any recorded input turns the whole cache over at once: the
next run is a full one and prints `Compile cache: rebuilt -- <the first thing found to have
changed>`, and the run after that is fast again. The coarseness is deliberate. A whole-program emit
can inline a `const enum` member from another file, or elide an import whose binding turns out to be
a type, so an unrelated-looking edit really can change what a file compiles to. Entries nothing has
read for a week are swept, at most once a day, so an edit-and-run loop cannot grow the cache without
bound, and the directory is always safe to delete.

Three further node-only options trade something for speed, and are off by default for that reason:

- **`--type-check-scope run`** roots the check at the files the run matched (plus everything they
  import and anything declaring globals) rather than the whole tsconfig project. It is faster on a
  project much larger than any one run, at the cost of what a green run proves.
- **`--isolated-transpile`** compiles each file on its own with `transpileModule`, cached by the
  file's own text, when not type-checking. On a 60-module fixture project, whole-program emit was
  ~1.1 s, isolated transpile ~0.65 s and isolated transpile with a warm cache ~0.09 s. It cannot
  resolve an *ambient* `declare const enum` from a dependency, which is why it is opt-in -- tripwire's
  own core cannot use it, because `@nevware21/ts-utils` declares `WellKnownSymbols` that way.
- **`--incremental`** keeps TypeScript's own `.tsbuildinfo` state under the cache directory. It works
  but measured no benefit: emitting a file needs much of the work the check does, so what the warm
  check saves the emit pays back, and `--emit-cache` supersedes it for the unchanged-tree case.

### Browser and worker targets

The browser and worker targets never read or write the compile cache; they compile their module graph
afresh on every run. What they optimise instead is the one thing that takes longer than the compile:
starting the browser.

Chrome initialises its network stack on its first real navigation rather than at launch, and that
first navigation is slow -- around six seconds on Windows, against about twenty milliseconds for
every one after it. Three things have to happen before the first test runs: Chrome must launch, Chrome
must get that first-navigation initialisation over with, and the module graph must be built (about
four seconds on this repository's suite). They are independent, so the runner launches the browser
*before* file discovery and sends it to a dead port *before* building the module graph, so the
initialisation happens inside Chrome's own process while the compile runs here. The run then takes
as long as the slowest of the three rather than the sum. Nothing needs configuring, and a platform
where the first navigation is already cheap simply sees the warm-up finish during the build.

The graph build itself follows the same discipline as the node path: one `Program` per tsconfig per
process, cached and reused for every file in the graph, with per-file emit on demand for only the
files reachable from the target's entry points, and -- under `--type-check` -- a single checker walk
over that `Program` at the moment it is created, with no second parse. By default (`--bundle`) the
graph is then served to the browser as one concatenated bundle rather than one network request per
module; `--no-bundle` switches to per-module requests, which is useful for debugging a single file but
is not the fast path.

Coverage on these targets is part of the runner rather than a wrapper around it: `--coverage`
instruments the module graph as it is built, explicitly loads the project's own sources
(`--coverage-src`, default `src/**/*.ts`) so that a file **no test imported** is still executed and
counted rather than silently dropped, and writes `coverage/<target>/coverage-final.json` before
running `nyc report` for each `--coverage-reporter`. Karma gets the equivalent only through plugins
(karma-typescript's instrumentation, or karma-coverage), and Mocha only through an external `nyc`
wrapper. On the **node** target tripwire relies on that same external `nyc` wrapper
(`nyc node ./bin/tripwire.js ...`), so the node-target coverage comparison in
[Measured: with coverage](#measured-with-coverage) is `nyc` against `nyc`, and the overhead measured
there is `nyc`'s on both sides.

`--graph-thread` moves the synchronous graph build onto a worker thread so the event loop stays free
for the browser launch to settle. Measured, it is not a win: the build then competes for the CPU the
browser needs to start, and the launch stretched from about 1.9 s to 3.5 s in exchange, with the
main-thread build ahead in three interleaved A/B pairs. It is off by default and kept because that
result is machine-specific.

One optimisation applies only to the interactive browser UI (`--browser-launch open|manual`), not to
headless runs: the live results view used to re-apply its "Failed only" filter to every node in the
tree on every status change and read the results list's scroll position for every node added, both
quadratic in the number of tests. On this repository's ~2,700-test suite that blocked the main
thread for seconds, delaying the timers the tests themselves were waiting on. The filter is now
applied to just the changed test and its ancestors, and a batch of events reads and writes the scroll
position once; the worst delay to a 5 ms timer during a run fell from seconds to ~100 ms, and the
slowest test from ~5 s to ~0.8 s.

### Mechanisms by target

| Mechanism | node | browser / worker |
|---|---|---|
| One `ts.Program` per tsconfig per process, reused for every file | yes | yes |
| Per-file emit on demand, only for files the run loads | yes (on `require`) | yes (graph walk) |
| `--type-check` as a checker walk over that `Program`, no `tsc` process | yes | yes |
| Compile cache (`--emit-cache`, default on) | yes | no -- never read or written |
| `--type-check-scope run` | yes | no -- always the whole project |
| `--isolated-transpile` (opt-in) | yes | no |
| `--incremental` (opt-in, measured no benefit) | yes | no |
| Browser launched before file discovery; warm-up navigation overlaps graph build | -- | yes |
| Graph served as one bundle (`--bundle`, default on) | -- | yes |
| `--graph-thread` (opt-in, measured no benefit) | -- | yes |
| Coverage | external `nyc` wrapper (same as mocha) | built in (`--coverage`, `--coverage-src`); karma needs karma-typescript / karma-coverage plugins |
| Live results view filter/scroll fix | -- | interactive UI only |

## Measured

All numbers in this section were produced on the machine described under [Machine](#machine) on
2026-10-18 by the repository's own benchmark harness, `internal/benchmark`, and are the two records
it wrote with `--record` into `docs/performance/results/`:

- [`results/2026-10-18T193006-256efc4.json`](results/2026-10-18T193006-256efc4.json) -- every arm,
  uninstrumented (the three per-target tables below)
- [`results/2026-10-18T193947-256efc4-coverage.json`](results/2026-10-18T193947-256efc4-coverage.json)
  -- every arm, with `--coverage` ([Measured: with coverage](#measured-with-coverage))

The exception is the compile-cache table, which is the runner's own console output rather than a
harness arm. Nothing here is estimated or carried over from elsewhere; the records hold every
individual duration in milliseconds, and the tables print them as the harness does, to two decimals.

The harness spawns each arm directly (not through `npm run`), discards its output, and times it with
`process.hrtime`; "Avg", "Median", "Min" and "Max" are its own columns. Every arm was run once
unmeasured (`--warmup`) and then three measured times (`--runs=3`); warmup durations are not in the
records and are quoted from the console. All arms were type-checked. The three per-target tables
immediately below are **without** coverage instrumentation; the whole matrix was then run a second
time with `--coverage`, and those results are under
[Measured: with coverage](#measured-with-coverage). The tripwire and mocha arms are given each suite's own test
project and globs, byte-identical to its `test:node` script; the karma arms use the karma-only
tsconfigs under `internal/benchmark/tsconfig/`, because karma-typescript's bundler needs
`module: commonjs` -- see the [harness README](https://github.com/nevware21/tripwire/blob/main/internal/benchmark/README.md) for exactly what is
and is not held constant. The exact commands each arm ran are listed under [Reproduce](#reproduce).

All twelve arms ran and exited zero, both without and with coverage; no arm failed and none was
excluded.

### Node target: tripwire vs mocha

Both runners were passed `--type-check`. `core` is 2,734 tests (2 skipped); `shim/chai` is the Chai
compatibility shim's suite.

| Suite | Runner | Avg | Median | Min | Max | Runs | Harness verdict |
|---|---|---|---|---|---|---|---|
| core | tripwire | 6.07 s | 6.05 s | 6.01 s | 6.14 s | 3 (+1 warmup) | |
| core | mocha (`ts-mocha`) | 9.13 s | 9.28 s | 8.79 s | 9.31 s | 3 (+1 warmup) | tripwire faster by 33.5% (-3.06 s) |
| shim/chai | tripwire | 1.06 s | 1.04 s | 1.03 s | 1.10 s | 3 (+1 warmup) | |
| shim/chai | mocha (`ts-mocha`) | 2.70 s | 2.72 s | 2.64 s | 2.75 s | 3 (+1 warmup) | tripwire faster by 60.9% (-1.65 s) |

Individual measured runs: core tripwire 6.05 / 6.01 / 6.14 s; core mocha 9.28 / 9.31 / 8.79 s;
chai tripwire 1.10 / 1.03 / 1.04 s; chai mocha 2.72 / 2.64 / 2.75 s. The unmeasured warmup runs
were 5.71 s, 9.53 s, 1.09 s and 2.62 s respectively, and are not part of any statistic above.

The harness does not pass `--no-emit-cache`, so after the warmup every *measured* tripwire node run
was a `Compile cache: reused` run; `ts-mocha` has no equivalent cache. That is the steady state a
developer re-running a suite sees, but it means this table compares tripwire's repeat run against
mocha's every run. For the uncached figure, see the [compile-cache table](#compile-cache-cold-warm-and-off):
tripwire's own clock put a type-checked `core` run with the cache off at 9.3 s.

### Browser target: tripwire vs karma

Tripwire ran `--target browser --type-check` headless through puppeteer; karma ran
`karma start <conf> --single-run` with karma-mocha, karma-typescript and karma-chrome-launcher.
Both ran Chrome 155.0.8059.79, the build bundled with puppeteer 25.14.0, launched by puppeteer with
no executable-path override (see [Machine](#machine) and [Reproduce](#reproduce)).

| Suite | Runner | Avg | Median | Min | Max | Runs | Harness verdict |
|---|---|---|---|---|---|---|---|
| core | tripwire | 14.00 s | 13.60 s | 13.39 s | 15.01 s | 3 (+1 warmup) | |
| core | karma | 19.42 s | 19.37 s | 19.28 s | 19.61 s | 3 (+1 warmup) | tripwire faster by 27.9% (-5.42 s) |
| shim/chai | tripwire | 10.07 s | 9.87 s | 9.65 s | 10.69 s | 3 (+1 warmup) | |
| shim/chai | karma | 11.19 s | 10.88 s | 10.86 s | 11.83 s | 3 (+1 warmup) | tripwire faster by 10.0% (-1.12 s) |

Individual measured runs: core tripwire 15.01 / 13.39 / 13.60 s; core karma 19.37 / 19.28 / 19.61 s;
chai tripwire 9.87 / 10.69 / 9.65 s; chai karma 11.83 / 10.86 / 10.88 s. Warmups: 11.97 s, 19.04 s,
9.15 s and 10.99 s respectively. The core tripwire arm's first run (15.01 s) is 1.4 s above its other
two, which is why its median (13.60 s) sits below its average.

### Worker target: tripwire vs karma

Tripwire ran `--target worker --type-check`; karma ran its worker configs, which use the worker
adapter in `common/test/`. Same browser build as the browser target.

| Suite | Runner | Avg | Median | Min | Max | Runs | Harness verdict |
|---|---|---|---|---|---|---|---|
| core | tripwire | 12.57 s | 12.68 s | 12.31 s | 12.71 s | 3 (+1 warmup) | |
| core | karma | 19.24 s | 19.21 s | 18.89 s | 19.63 s | 3 (+1 warmup) | tripwire faster by 34.7% (-6.67 s) |
| shim/chai | tripwire | 9.69 s | 9.59 s | 9.49 s | 10.00 s | 3 (+1 warmup) | |
| shim/chai | karma | 10.98 s | 10.54 s | 10.03 s | 12.38 s | 3 (+1 warmup) | tripwire faster by 11.8% (-1.29 s) |

Individual measured runs: core tripwire 12.31 / 12.71 / 12.68 s; core karma 19.63 / 19.21 /
18.89 s; chai tripwire 10.00 / 9.59 / 9.49 s; chai karma 10.03 / 10.54 / 12.38 s. Warmups: 13.10 s,
19.55 s, 9.40 s and 10.49 s respectively. The `shim/chai` karma arm's third run (12.38 s) is 1.8 s
above its other two; on medians that comparison is 9.59 s against 10.54 s.

### Measured: with coverage

The whole matrix was run a second time with the harness's `--coverage` option, which instruments
every arm at once so the comparison stays like for like. Same settings otherwise: `--runs=3 --warmup`,
type-checked, the whole matrix in one invocation started after the uninstrumented one had finished.
The harness labels these runs "instrumented"; the record is
[`results/2026-10-18T193947-256efc4-coverage.json`](results/2026-10-18T193947-256efc4-coverage.json).
How each arm was instrumented, read from the commands and configuration the harness resolved
(`npm run bench -- --list --coverage` and `internal/benchmark/karma/createConfig.js`):

| Arm | Instrumentation |
|---|---|
| tripwire, node | External: the whole CLI is wrapped in `nyc --cache --reporter=json` (the repository-root `nyc`), so `nyc` spawns a second Node process around tripwire |
| mocha, node | External: the same `nyc --cache --reporter=json` wrapper around `ts-mocha` |
| tripwire, browser / worker | Built in: the CLI's own `--coverage` flag, with no wrapper or plugin |
| karma, browser / worker | karma-typescript's `coverageOptions.instrumentation` plus its `karma-typescript` reporter (json + text), switched on by `TRIPWIRE_BENCH_COVERAGE=1` in the arm's environment; off, the config leaves `instrumentation: false` and the reporter out |

"Without" is the Avg from the matching table above; "With" is the Avg of the instrumented run.
Overhead is `With - Without`, absolute and as a percentage of "Without", computed from the two-decimal
averages the harness printed, so the last digit carries up to 0.01 s of rounding.

**Node target** (both arms under `nyc`):

| Suite | Runner | Without | With coverage | Overhead | Harness verdict (instrumented) |
|---|---|---|---|---|---|
| core | tripwire | 6.07 s | 9.56 s | +3.49 s (+57.5%) | |
| core | mocha (`ts-mocha`) | 9.13 s | 13.73 s | +4.60 s (+50.4%) | tripwire faster by 30.4% (-4.17 s) |
| shim/chai | tripwire | 1.06 s | 1.98 s | +0.92 s (+86.8%) | |
| shim/chai | mocha (`ts-mocha`) | 2.70 s | 4.17 s | +1.47 s (+54.4%) | tripwire faster by 52.5% (-2.19 s) |

Instrumented runs: core tripwire 9.77 / 9.51 / 9.41 s (median 9.51, warmup 9.75); core mocha
14.25 / 13.49 / 13.46 s (median 13.49, warmup 14.14); chai tripwire 1.96 / 2.01 / 1.98 s (median
1.98, warmup 1.99); chai mocha 4.03 / 4.29 / 4.19 s (median 4.19, warmup 3.88).

**Browser target:**

| Suite | Runner | Without | With coverage | Overhead | Harness verdict (instrumented) |
|---|---|---|---|---|---|
| core | tripwire | 14.00 s | 17.43 s | +3.43 s (+24.5%) | |
| core | karma | 19.42 s | 20.33 s | +0.91 s (+4.7%) | tripwire faster by 14.3% (-2.90 s) |
| shim/chai | tripwire | 10.07 s | 9.48 s | -0.59 s (-5.9%) | |
| shim/chai | karma | 11.19 s | 11.54 s | +0.35 s (+3.1%) | tripwire faster by 17.8% (-2.06 s) |

Instrumented runs: core tripwire 17.50 / 17.49 / 17.31 s (median 17.49, warmup 16.82); core karma
21.29 / 20.72 / 18.98 s (median 20.72, warmup 20.86); chai tripwire 9.16 / 9.55 / 9.75 s (median
9.55, warmup 9.14); chai karma 11.23 / 11.45 / 11.94 s (median 11.45, warmup 10.64).

**Worker target:**

| Suite | Runner | Without | With coverage | Overhead | Harness verdict (instrumented) |
|---|---|---|---|---|---|
| core | tripwire | 12.57 s | 15.57 s | +3.00 s (+23.9%) | |
| core | karma | 19.24 s | 20.81 s | +1.57 s (+8.2%) | tripwire faster by 25.2% (-5.24 s) |
| shim/chai | tripwire | 9.69 s | 10.26 s | +0.57 s (+5.9%) | |
| shim/chai | karma | 10.98 s | 11.28 s | +0.30 s (+2.7%) | tripwire faster by 9.0% (-1.02 s) |

Instrumented runs: core tripwire 14.71 / 16.11 / 15.89 s (median 15.89, warmup 14.73); core karma
20.47 / 21.32 / 20.64 s (median 20.64, warmup 18.90); chai tripwire 9.66 / 10.94 / 10.17 s (median
10.17, warmup 10.12); chai karma 10.96 / 11.44 / 11.43 s (median 11.43, warmup 9.87).

What the tables show, and no more than they show:

- **On the node target the comparison is `nyc` vs `nyc`**, and `nyc` is where the cost is: it added
  3.5-4.6 s to a `core` run on either runner and 0.9-1.5 s to a `shim/chai` run. The absolute cost is
  of the same order on both, so as a percentage it is larger on tripwire's shorter runs (+57.5% and
  +86.8%, against +50.4% and +54.4% for mocha). Tripwire remained faster on both suites (30.4% and
  52.5%).
- **Tripwire's built-in browser/worker coverage cost 3.0-3.4 s on `core`**: +3.43 s (+24.5%) on the
  browser run and +3.00 s (+23.9%) on the worker run, each well outside the arm's uninstrumented
  spread (core/browser 13.39-15.01 s, core/worker 12.31-12.71 s), so those are real costs. On the
  much smaller `shim/chai` suite it did not register: +0.57 s (+5.9%) on the worker run is inside the
  two runs' combined spread (9.49-10.00 s uninstrumented, 9.66-10.94 s instrumented), and the browser
  run came out 0.59 s *faster* instrumented, inside its uninstrumented spread (9.65-10.69 s) -- noise,
  not a saving.
- **karma-typescript's instrumentation cost less in absolute terms on the same suites**: +1.57 s
  (+8.2%) on `core` worker, which clears both of that arm's spreads (18.89-19.63 s and
  20.47-21.32 s); +0.91 s (+4.7%) on `core` browser, inside its instrumented spread (18.98-21.29 s);
  and +0.35 s / +0.30 s on `shim/chai`, inside the spreads too (10.86-11.83 s; 10.03-12.38 s). Only
  the `core` worker figure is resolved by three runs. karma-typescript bundles and type-checks every
  file either way, which is the bulk of its time; it has less to add.
- **Tripwire was ahead in all six instrumented comparisons**: 30.4% / 52.5% (node), 14.3% / 17.8%
  (browser) and 25.2% / 9.0% (worker). On `core` the browser and worker margins narrowed relative to
  the uninstrumented runs (27.9% to 14.3%, 34.7% to 25.2%) because tripwire's instrumentation cost
  more seconds than karma-typescript's on the same suite (3.0-3.4 s against 0.9-1.6 s); on `shim/chai`
  the margins moved by less than the arms' spreads and should be read as unchanged.

### Compile cache: cold, warm and off

This table is not a harness arm and is not in the recorded results. It was run directly with the
CLI from the `core` package directory in an earlier session on 2026-10-18, on the same machine, Node
and `core/bin/tripwire.js` build as the recorded runs, with no other load on the machine. The
command is the `core-node-tripwire` arm's, without the harness's `-- --trace-uncaught`.
These are the runner's own `Total elapsed` lines, whose clock starts after Node has loaded the CLI
bundle, so they are not directly comparable with the harness wall times above (which include process
start-up). All four runs reported `2734 passing  2 skipped` and exited 0.

| Run | Flags | `Compile cache:` line | Type-check | Total elapsed | prep | compile | tests |
|---|---|---|---|---|---|---|---|
| 1 | `--type-check` | `reused -- nothing changed, type-check skipped` | 249 ms | **5168 ms** | 274 ms | 300 ms | 4591 ms |
| 2 | `--type-check` | `reused -- nothing changed, type-check skipped` | 273 ms | **5232 ms** | 298 ms | 308 ms | 4623 ms |
| 3 | `--type-check` | `reused -- nothing changed, type-check skipped` | 269 ms | **5179 ms** | 295 ms | 273 ms | 4608 ms |
| 4 | `--no-emit-cache --type-check` | *(none printed -- caching off)* | 3501 ms | **9304 ms** | 3529 ms | 1199 ms | 4572 ms |

"Type-check" is the `Type-check completed in N ms` line the runner prints; "prep", "compile" and
"tests" are the three components of the `Total elapsed` line. In runs 1-3 the TypeScript work
(prep + compile) is 574 ms, 606 ms and 568 ms against 4728 ms in run 4; the tests themselves are
4.57-4.62 s in every run, and in the cached runs they are about 89% of the total.

All three cached runs reported `reused` rather than a first `rebuilt`: the harness's node arms, which
run the same command over the same tree, had already populated the cache minutes earlier, and nothing
had changed since. This session therefore has no `rebuilt` run to show; run 4, with caching turned
off, is its uncached figure, and the difference between it and runs 1-3 (about 4.1 s) is what the
cache saves on this suite.

### Caveats

- **Type-checking is not perfectly symmetric.** `--type-check` was passed to tripwire and to
  `ts-mocha`; karma-typescript always runs the checker and cannot be told not to. All arms were
  type-checked, but the karma arms were checked against the karma-only tsconfigs, not the suites'
  own.
- **The node comparison is tripwire-warm vs mocha-every-time**, as explained under the node table.
  Tripwire's uncached run on its own clock (9.3 s) and mocha's harness wall time (9.13 s) are
  measured by different clocks and should not be subtracted from each other.
- **Three runs is a small sample.** Uninstrumented, most arms spread by less than 0.6 s between runs,
  but the `core` browser tripwire arm spread by 1.6 s (13.39-15.01 s) and the `shim/chai` worker
  karma arm by 2.4 s (10.03-12.38 s); instrumented, the `core` browser karma arm spread by 2.3 s
  (18.98-21.29 s) and the `core` worker tripwire arm by 1.4 s. Treat the deltas as the direction and
  rough size of the difference on this machine, not as a constant, and prefer the median where the
  two disagree. The records hold every individual duration, so any other statistic can be computed
  from them.
- **One machine, one Node version, one browser build.** Everything here ran Node v20.19.5 and Chrome
  155.0.8059.79 as bundled with puppeteer 25.14.0. The browser warm-up in particular is sized for
  Windows, where Chrome's first navigation is slowest; the harness README notes CI measures on a
  single Node version for the same reason. A different browser build can move the karma arms as much
  as the tripwire ones, since both launch the same executable.
- **These are this repository's suites.** `core` is assertion-heavy and synchronous; a suite with
  long asynchronous tests will be dominated by its tests on every runner, and the runner overhead
  measured here will be a smaller share of it.

### Machine

| | |
|---|---|
| Date | 2026-10-18 |
| OS | Windows 11 |
| CPU | AMD Ryzen 9 5900X, 12 cores / 24 logical processors |
| Memory | 128 GB |
| Node | v20.19.5 |
| puppeteer | 25.14.0 |
| Browser | Chrome 155.0.8059.79, the build bundled with puppeteer 25.14.0, launched by puppeteer with no executable-path override -- for the tripwire arms directly, and for the karma arms via the harness's karma config, which asks puppeteer for the same executable |
| TypeScript | 5.2.2 as resolved in `internal/benchmark` |
| karma / karma-typescript / ts-mocha / mocha / nyc | 6.4.4 / 5.5.4 / 10.1.0 / 11.8.0 / 18.0.0 (karma, its plugins and ts-mocha are pinned; see the harness README) |
| tripwire | 0.1.8, `core/bin/tripwire.js` as built from `internal/runner` at commit `256efc4` on branch `nev21/testSuite` (working tree dirty) |
| Records | [`results/2026-10-18T193006-256efc4.json`](results/2026-10-18T193006-256efc4.json) (uninstrumented) and [`results/2026-10-18T193947-256efc4-coverage.json`](results/2026-10-18T193947-256efc4-coverage.json) (with coverage). Every row above is what those records carry in their `machine` and `versions` fields, the CPU core count aside (a record holds the 24 logical processors only) |

## Reproduce

The harness is `internal/benchmark`; `npm run bench -- --list` prints the resolved matrix and the
exact command of every arm without running anything. The benchmark needs `core/bin/tripwire.js` to
have been built (`rush build`), and needs the browser puppeteer bundles. Every browser and worker arm
below ran Chrome 155.0.8059.79, the build bundled with puppeteer 25.14.0, launched by puppeteer with
no executable-path override: the tripwire arms ask puppeteer for it directly, and the harness's karma
config (`internal/benchmark/karma/createConfig.js`) resolves `require("puppeteer").executablePath()`
and hands karma-chrome-launcher the same executable. For that to hold, `PUPPETEER_EXECUTABLE_PATH`
and `CHROME_BIN` must both be **unset** so puppeteer uses its own browser rather than a system one;
if puppeteer's cache is empty, `node node_modules/puppeteer/install.mjs` fetches it.

The tables under [Measured](#measured) are two complete runs of the twelve-arm matrix recorded with
`--record` -- one uninstrumented, one with `--coverage` -- produced by exactly the two commands in
[Recording a run](#recording-a-run) below, run one after the other so no arm competed with another
for the CPU. The arms, as `--list` resolves them without coverage (`<node>` is the Node executable
running the harness, and paths are shown relative to the repository root):

```text
core-node-tripwire     (cwd core)      <node> core/bin/tripwire.js --type-check -p ./test/tsconfig.test.json ./test/src/!(browser|worker)/**/*.test.ts -- --trace-uncaught
core-node-mocha        (cwd core)      <node> common/temp/node_modules/ts-mocha/bin/ts-mocha --type-check -p ./test/tsconfig.test.json ./test/src/!(browser|worker)/**/*.test.ts --trace-uncaught
core-browser-tripwire  (cwd core)      <node> core/bin/tripwire.js --target browser --type-check -p ./test/tsconfig.test.json ./test/src/!(node|worker)/**/*.test.ts
core-browser-karma     (cwd benchmark) <node> common/temp/node_modules/karma/bin/karma start internal/benchmark/karma/core.browser.conf.js --single-run
core-worker-tripwire   (cwd core)      <node> core/bin/tripwire.js --target worker --type-check -p ./test/tsconfig.test.json ./test/src/!(node|browser)/**/*.test.ts
core-worker-karma      (cwd benchmark) <node> common/temp/node_modules/karma/bin/karma start internal/benchmark/karma/core.worker.conf.js --single-run
chai-node-tripwire     (cwd shim/chai) <node> core/bin/tripwire.js --type-check -p ./test/tsconfig.test.json ./test/src/!(browser|worker)/**/*.test.ts -- --trace-uncaught
chai-node-mocha        (cwd shim/chai) <node> common/temp/node_modules/ts-mocha/bin/ts-mocha --type-check -p ./test/tsconfig.test.json ./test/src/!(browser|worker)/**/*.test.ts --trace-uncaught
chai-browser-tripwire  (cwd shim/chai) <node> core/bin/tripwire.js --target browser --type-check -p ./test/tsconfig.test.json ./test/src/!(node|worker)/**/*.test.ts
chai-browser-karma     (cwd benchmark) <node> common/temp/node_modules/karma/bin/karma start internal/benchmark/karma/chai.browser.conf.js --single-run
chai-worker-tripwire   (cwd shim/chai) <node> core/bin/tripwire.js --target worker --type-check -p ./test/tsconfig.test.json ./test/src/!(node|browser)/**/*.test.ts
chai-worker-karma      (cwd benchmark) <node> common/temp/node_modules/karma/bin/karma start internal/benchmark/karma/chai.worker.conf.js --single-run
```

Under `--coverage` (`npm run bench -- --list --coverage`), the four node arms are prefixed with
`<node> node_modules/nyc/bin/nyc.js --cache --temp-dir internal/benchmark/.benchmark/nyc/<arm> --report-dir internal/benchmark/.benchmark/coverage/<arm> --reporter=json`,
the four tripwire browser/worker arms gain `--coverage` after `--type-check`, and the four karma
commands are unchanged but run with `TRIPWIRE_BENCH_COVERAGE=1` in their environment, which
`internal/benchmark/karma/createConfig.js` turns into karma-typescript instrumentation and reporting.

The compile-cache table is not a harness arm. It came from the CLI directly, run from the `core`
package directory in an earlier session on the same machine, with the same Node and the same
`core/bin/tripwire.js` build:

```powershell
cd core
# three times -- the first prints "rebuilt" if the cache is cold, the later ones "reused":
node ./bin/tripwire.js --type-check -p ./test/tsconfig.test.json "./test/src/!(browser|worker)/**/*.test.ts"
# once with the cache off:
node ./bin/tripwire.js --no-emit-cache --type-check -p ./test/tsconfig.test.json "./test/src/!(browser|worker)/**/*.test.ts"
```

Read the `Compile cache:`, `Type-check completed in` and `Total elapsed:` lines of each run. (In that
session the cache was already warm from the harness's node arms, so all three printed `reused`; to
see a `rebuilt` first run, delete the cache directory named in
[compile caching](./test-runner.md#compile-caching) first.)

### Recording a run

Add `--record` to any benchmark command and the run is written, scrubbed, to
`docs/performance/results/<UTC date>T<hhmmss>-<commit>[-coverage].json`, with the directory's
`index.json` rebuilt. The [history page](performance/history.md) charts every record over time --
per target, suite, runner and coverage setting -- and lists the latest run, so the tables above can be
read against what came before them. A record holds the measurements, options, commit, tool versions
(including the Chrome build puppeteer resolved) and the machine class; it never holds a file-system
path, a host or user name, or an OS build number, and `validate.js` checks the directory on every
`rush test`. Commit the new file together with the index. The two commands that produce a complete
pair of records, run one after the other:

```bash
npm run bench -- --runs=3 --warmup --record              # every arm, uninstrumented
npm run bench -- --runs=3 --warmup --coverage --record   # every arm, instrumented
```

## What it does not do

- **It runs tests in a single process.** There is no parallel worker pool and no sharding of a suite
  across processes or machines; a run is as long as its tests. In the cached-run figures above the
  tests are about 89% of the total, and nothing here makes them shorter.
- **It does not cache browser or worker compiles.** The compile cache, `--type-check-scope run`,
  `--isolated-transpile` and `--incremental` are node-only. Browser and worker runs rebuild their
  module graph every time; what they save is the browser start-up they overlap with it.
- **It does not skip or reorder tests to look faster.** Every arm above ran the full suite with
  type-checking on, and the compile cache never lets a transpile-only run stand in for a type-checked
  one.
- **The numbers are this machine's.** `--graph-thread` and the warm-up both encode measurements that
  could land differently on other hardware; `--graph-thread` exists so that can be checked.
