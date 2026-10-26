# @nevware21/tripwire-benchmark

Internal, unpublished harness that measures the **tripwire** test runner against the runners it
replaced — **mocha** (via `ts-mocha`) and **karma** — over this repository's two real test suites,
`core` and `shim/chai`.

Nothing here ships. The package exists so that the alternate runners have exactly one home: before
this package, `core` and `shim/chai` each carried four karma config files, five karma
devDependencies and a `ts-mocha` devDependency behind `test:*x` scripts that nothing in CI or the
default `test` script ever reached.

## Running it

```bash
cd internal/benchmark
npm run bench                      # every arm, one run each
npm run bench -- --runs=3 --warmup # three measured runs after one throwaway
npm run bench:core                 # just the core suite
npm run bench -- --targets=node    # just the node arms
npm run bench -- --list            # print the resolved matrix and exact commands, run nothing
```

From the repository root, `npm run test:bench` runs the whole matrix.

Which command runs what:

| Command | Runs |
|---|---|
| `rush test`, `npm test` | every project's tests, and **`scripts/validate.js`** for this one — never the benchmark |
| `npm run test:bench` (root) | this package's benchmark, and nothing else |
| `npm run test:full` (root) | both of the above, in that order |

`rush build` and `rush test` deliberately stop at [`scripts/validate.js`](scripts/validate.js) here:
the benchmark is minutes of work with no pass/fail of its own, so wiring it to `test` would slow
every CI leg down for a number nobody reads. See [Validation](#validation). CI runs the full matrix
once, on a single Node version; see [Pinned toolchain](#pinned-toolchain).

### Options

| Option | Meaning |
|---|---|
| `--runs=<n>` | Measured runs per arm (default `1`). A bare number works too: `-- 3`. |
| `--warmup` | One unmeasured run per arm first, so the first measured run is not paying for a cold filesystem cache. |
| `--suites=<a,b>` | `core`, `chai`. |
| `--targets=<a,b>` | `node`, `browser`, `worker`. |
| `--runners=<a,b>` | `tripwire`, `mocha`, `karma`. |
| `--coverage` | Instrument every arm. Off by default — see [Coverage](#coverage). |
| `--no-type-check` | Transpile only, on the arms that can be told to. |
| `--json=<file>` | Also write the raw per-run measurements as JSON -- includes every arm's command and working directory, so it is for a one-off investigation, not for checking in. |
| `--record` | Record the run for the repository: a scrubbed JSON file under `docs/performance/results/` plus a rebuilt `index.json`. See [Recording results](#recording-results). |
| `--record-dir=<dir>` | Record somewhere else (implies `--record`). |
| `--verbose` | Let each run print its own output rather than discarding it. |

## The matrix

Twelve arms — two suites × the combinations that actually exist:

| Target | tripwire | mocha | karma |
|---|---|---|---|
| `node` | `core/bin/tripwire.js` | `ts-mocha` | — |
| `browser` | `--target browser` | — | karma + karma-mocha + karma-typescript |
| `worker` | `--target worker` | — | karma, plus the worker adapter in `common/test/` |

The holes are real rather than missing work. Mocha has no browser or worker story of its own; in a
browser it *is* the karma arm, driven by `karma-mocha`. Karma is browser-only. So `node` compares
tripwire against mocha, and `browser`/`worker` compare tripwire against karma, which is exactly the
migration each target actually made.

Every non-baseline arm is compared against the **tripwire arm for the same suite and target**, the
only comparison that holds everything else constant.

## What is held constant, and what cannot be

The tripwire and mocha arms are handed the suite's *own* test project and globs — byte-identical to
what its `test:node` script passes — so they measure the run a developer actually gets.

The karma arms cannot use that project: karma-typescript's bundler requires `module: commonjs`, and
its instrumentation needs the source and test trees in a single program. Those karma-only projects
live in [`tsconfig/`](tsconfig/) and are the one place the arms genuinely differ. Type checking is
the other asymmetry worth knowing about: `--type-check` is passed to tripwire and ts-mocha (both
transpile without checking otherwise), while karma-typescript always runs the checker and cannot be
told not to.

Arms are spawned **directly**, not through `npm run <script>`. The scripts this replaced measured
`npm run` on both sides, which cancels out of the delta but inflates both figures — and the
percentages with them — by npm's own start-up cost.

A run that exits non-zero measured how long the arm took to *fail*, which is not a benchmark of
anything. Failed runs are excluded from the statistics and block the comparison rather than feeding
it; the driver then prints the failing command and its working directory. This is the `BENCH-NODEX`
lesson: a crashing `ts-mocha` once read as *"ts-mocha faster by 198.1%"*.

## Coverage

Coverage is **off by default**. The benchmark measures runner overhead; instrumentation is a
separate axis, and `--coverage` applies it to every arm at once so the comparison stays like for
like.

No benchmark run writes into a measured package's coverage artifacts — those are what the real
`npm test` pipelines produce and CI uploads to Codecov. The nyc arms get `--temp-dir`/`--report-dir`
pointed inside `.benchmark/`, the karma arms have their report directory pointed there too, and
tripwire's browser/worker `--coverage` reports to stdout without writing files. Everything this
package produces lands in `internal/benchmark/.benchmark/`, which is git-ignored.

## Recording results

`--record` writes one JSON file per run into `docs/performance/results/`, named
`<UTC date>T<hhmmss>-<commit>[-coverage].json`, and rebuilds `index.json` there. GitHub Pages
serves that directory, so [docs/performance/history.md](https://nevware21.github.io/tripwire/performance/history.html) charts
every record over time and the [performance page](https://nevware21.github.io/tripwire/performance.html) can cite the file its
numbers came from. Commit the new file and the index together.

A record is deliberately less than `--json` writes. It keeps the measurements (every duration,
average, median, min, max, failures) per arm, the options, the commit and branch, the versions of
what was measured (tripwire, node, puppeteer and the Chrome build it resolved, typescript, karma,
ts-mocha, nyc), and the machine class: OS *name*, architecture, CPU model, logical processors,
memory. It never holds a file-system path, a host or user name, a branch name (those routinely carry
a person's handle), an OS build number, or the text of an error -- `recordResults.js` refuses to write a record containing a path, and `validate.js`
checks every file in the directory and that the index lists exactly the valid ones.

`--record` wants puppeteer's bundled Chrome, which is what the performance page documents; the
record notes the source of the browser it resolved, and the console warns when it was an
`PUPPETEER_EXECUTABLE_PATH` override instead. Recommended recording commands, run sequentially so
nothing competes for the machine:

```bash
npm run bench -- --runs=3 --warmup --record              # every arm, uninstrumented
npm run bench -- --runs=3 --warmup --coverage --record   # every arm, instrumented
```

## Validation

`npm run build` and `npm test` in this package both run [`scripts/validate.js`](scripts/validate.js),
which runs **no suite** and finishes in about a second. The benchmark itself is `npm run bench` —
every arm, and a non-zero exit if any of them fails — and is deliberately not wired to `test`: it
takes minutes and has no pass/fail of its own, so `rush test` would only make every CI leg slow.
`npm run test:full` in this package is the pair, for when you want both without remembering which
is which.

The build-time check exists because it is fast enough to run every time, and because it fails with a
precise reason (*this* pattern matched nothing, *this* tsconfig resolved to an empty file list)
where a failed arm only tells you an arm failed. It checks every assumption the harness makes about
the rest of the repository: that each
suite directory, test project, spec pattern, karma config, karma project and tool binary still
resolves, that each spec pattern still matches test files, and that each karma project still parses
to a non-empty file list. That is the failure mode this package exists to prevent — the karma
configs it now owns rotted quietly inside `core` precisely because nothing ever loaded them.

## Debugging a karma arm

```bash
npm run debug:karma:core:browser   # headful Chrome, watch mode, no instrumentation
npm run debug:karma:core:worker
npm run debug:karma:chai:browser
npm run debug:karma:chai:worker
```

These replace the old `debug:browserx` script and the `karma.debug.*.conf.js` files. They exist for
debugging the *karma arm itself*; to debug the suites, use each package's own `debug:browser` /
`debug:worker`, which go through the tripwire CLI.

## Dependencies

`karma` and its four plugins, `ts-mocha`, `puppeteer` and `typescript` are declared here and nowhere
else. `nyc` is deliberately **not** among them: it is declared once at the repository root and every
suite already invokes it from there, so the harness resolves it the same way rather than
introducing a second copy.

`@nevware21/tripwire-runner` is a devDependency purely for build ordering — it produces
`core/bin/tripwire.js`, the bundle the tripwire arms measure, so rush has to build it first.

### Pinned toolchain

`karma`, its four plugins, `ts-mocha` and `@types/node` are declared as **exact versions**, not
ranges, and `mocha` is held at an exact version repo-wide. Karma 6 is the last line of a dependency tree that is no longer maintained in step with
the rest of this repository's toolchain, and a routine minor bump anywhere in it — including the
`@types/node` that karma-typescript compiles against — breaks arms that have nothing to do with the
change being tested. Since the harness exists to produce comparable numbers over time, a toolchain
that moves underneath it is a defect rather than an improvement.

| Pinned | Why |
|---|---|
| `karma`, `karma-chrome-launcher`, `karma-mocha`, `karma-spec-reporter`, `karma-typescript` | karma 6's tree is what actually breaks; pinning `karma` alone would leave the plugins free to drag it there |
| `ts-mocha` | the `node` arms' runner, and the only thing the tripwire `node` arms are compared against |
| `mocha` | pinned as a Rush `preferredVersions` entry, not here — see below |
| `@types/node` | karma-typescript 5.x fails to compile against the newer versions the rest of the repo is free to track |

Two consequences follow:

- **Two of the pins live in Rush's config, not here.**
  [`common/config/rush/common-versions.json`](../../common/config/rush/common-versions.json) carries
  both. `@types/node` is listed under `allowedAlternativeVersions`, because every other project
  shares one range for it and `rush check` would otherwise reject this one — the entry must match
  the version string in `package.json` character for character, so changing the pin means changing
  both. `mocha` is listed under `preferredVersions`, because it reaches the repo only as a peer of
  `ts-mocha` and `karma-mocha`: declaring it here as a direct dependency instead breaks `rush
  update`'s linker outright (`ERROR: Child already exists: string-width`, on a clean install), and
  holding an indirect dependency at a known version is what `preferredVersions` is for.
- **CI measures on one Node version.** `rush test` runs `validate.js` on every version in the
  matrix, which is what keeps these configs from rotting unnoticed; the benchmark itself runs in a
  single `if: matrix.node == 22` step in
  [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml), because karma 6's tree does not
  tolerate every version in that matrix.

`puppeteer` and `typescript` are deliberately *not* pinned here: both are shared with the rest of
the repository, and pinning them would fork the browser and the compiler away from what the suites
under test actually use — which is the one thing a benchmark must not do.

## Related

There is no benchmark-specific guide in `docs/` — the harness is internal and has no consumer-facing
behaviour. What is documented is the thing it measures:

- [Test Runner, CLI & Configuration Guide](https://nevware21.github.io/tripwire/test-runner.html) —
  every flag the tripwire arms pass (`--target`, `--type-check`, `--project`, `--coverage`), so the
  exact command each arm runs can be read rather than guessed
- [Migrating from Mocha](https://nevware21.github.io/tripwire/migration/migrating-from-mocha.html) —
  the mapping between the mocha invocation in the `node` arms and the tripwire one they are compared
  against

Within the repository:

- [`internal/README.md`](../README.md) — what the `internal/` folder is, and the other projects in it
- [`internal/runner/README.md`](../runner/README.md) — the runner these arms measure
