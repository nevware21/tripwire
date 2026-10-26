# internal/

Rush projects that are part of building, testing or measuring **tripwire**, rather than being the
library itself. **Nothing in here is published to npm.** The packages the repository is *about* stay
at the repository root: [`core/`](../core), the assertion library and test framework,
[`globals/`](../globals), the opt-in ambient global names, and [`shim/chai/`](../shim/chai), the
chai-compatible surface — everything in here supports those.

| Project | Package | Published to npm? | What it is |
|---|---|---|---|
| [`runner/`](./runner/README.md) | `@nevware21/tripwire-runner` | No — but its build output ships | The `tripwire` CLI test runner: arg parsing, targets, reporters, coverage, dev server, browser UI |
| [`benchmark/`](./benchmark/README.md) | `@nevware21/tripwire-benchmark` | No | Harness measuring the tripwire runner against mocha and karma over the `core` and `shim/chai` suites |

The first row carries a caveat worth stating up front, because "unpublished" invites the wrong
conclusion about it:

- **`runner` is not published, but its build output is.** The bundle it produces is copied into
  [`core/bin/`](../core/bin) by [`core/scripts/copyRunnerBin.js`](../core/scripts/copyRunnerBin.js)
  and ships *inside* `@nevware21/tripwire`, which is what makes `npx tripwire` work. So "unpublished"
  means the package is not on npm — not that its code is unshipped, and not that it is unimportant.

---

## [`runner/`](./runner/README.md) — `@nevware21/tripwire-runner`

The CLI. It compiles the test files, runs them against the `node`, `browser` or `worker` target,
reports the results through one of fourteen built-in reporters (or a custom one), and collects
coverage. For the browser and worker targets it also runs a loopback dev server and an interactive
page with the live results tree and the suite/test pickers.

- **Read:** [runner/README.md](./runner/README.md)
- **Build:** lint → `tsc` → three `rollup` bundles → `api-extractor` → copy into `core/bin`
- **Test:** its own suite, run *by the CLI it just built*

Its user-facing documentation lives on the documentation site,
[https://nevware21.github.io/tripwire](https://nevware21.github.io/tripwire):

- [Test Runner, CLI & Configuration Guide](https://nevware21.github.io/tripwire/test-runner.html) —
  the primary reference: every CLI flag and `.tripwirerc` field, the three targets, file discovery,
  type-checking, coverage, and
  [hook failures](https://nevware21.github.io/tripwire/test-runner.html#hook-failures)
- [Test Reporters](https://nevware21.github.io/tripwire/reporters.html) — all fourteen built-in
  reporters with generated sample output, selecting and combining them, per-reporter options, and
  writing a custom one
- [Migrating from Mocha](https://nevware21.github.io/tripwire/migration/migrating-from-mocha.html) —
  flag and config mapping, what is deliberately unsupported, and a machine-readable summary the
  runner's own tests assert against
- [Runner Troubleshooting](https://nevware21.github.io/tripwire/runner-troubleshooting.html) — known
  issues and fixes, including opting in to the global `describe`/`it` names and the duplicate-global
  clash with `@types/mocha`/`jest`/`jasmine`
- [Test Execution Flow](https://nevware21.github.io/tripwire/test-execution-flow.html) — how suites,
  tests and hooks execute, timeouts, hook-failure handling, and runner metrics

Source of interest: [`src/cli/`](./runner/src/cli) (argument parsing and error reporting),
[`src/execute/`](./runner/src/execute) (orchestration and the three targets),
[`src/reporters/`](./runner/src/reporters), [`src/server/`](./runner/src/server) (the dev server),
[`src/ux/browser/`](./runner/src/ux/browser) (the interactive page) and
[`src/shared/`](./runner/src/shared) (the dependency-light modules every target loads).

## [`benchmark/`](./benchmark/README.md) — `@nevware21/tripwire-benchmark`

A 12-arm matrix comparing the tripwire runner against the runners it replaced, over this
repository's own real suites: `node` against **mocha** (`ts-mocha`), `browser` and `worker` against
**karma**. This is the only place karma and ts-mocha are configured — they are deliberately kept out
of the shipped packages.

- **Read:** [benchmark/README.md](./benchmark/README.md)
- **Build and test:** both run [`scripts/validate.js`](./benchmark/scripts/validate.js) — a
  one-second check that every path, spec pattern, karma config and tsconfig the harness reaches into
  still resolves. It runs no suite, and exists because these configs previously rotted unnoticed:
  nothing ever loaded them.
- **Benchmark:** `npm run bench` (or `npm run test:bench` from the repository root). It is
  deliberately not wired to `test`: it takes minutes and has no pass/fail of its own, so `rush test`
  never runs it. CI runs it in one gated step on a single Node version, because this package pins
  karma 6 and its tree does not tolerate every version in the matrix — see
  [Pinned toolchain](./benchmark/README.md#pinned-toolchain). `npm run test:full` at the repository
  root is `rush test` plus the benchmark, for when you do want both.

---

## Working in here

Everything is driven by [Rush](https://rushjs.io) from the repository root — see
[CONTRIBUTING.md](../CONTRIBUTING.md):

```bash
rush update      # install and link
rush build       # builds all six projects in dependency order
rush test        # runs every project's tests -- not the benchmark, see `benchmark` above
```

Two ordering facts that bite if you do not know them:

- **`runner` builds after `core`** (it depends on `@nevware21/tripwire`), and **`core`'s own tests
  run through the artifact `runner` produces**. On a fresh clone, `cd core && npm test` fails until
  `runner` has been built at least once. `rush build` orders this correctly; running a package's
  tests directly does not.
- **A change to `runner/src` needs a build before it is being tested.** The runner's own suite
  asserts against the built bundle in `core/bin`, so `npm test` alone will happily test the previous
  build. `rush build` first.

`benchmark` builds last, after `runner`, via a `@nevware21/tripwire-runner` devDependency declared
for exactly that reason — it measures the bundle, so the bundle has to exist.
