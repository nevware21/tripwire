# Why tripwire

Tripwire is an assertion library **and** a test runner in one package. You write `describe`/`it`
suites in TypeScript or JavaScript, and the same files run on **node**, in a **real browser**, and
inside a **web worker** -- from one command, with nothing else to assemble:

```bash
npx tripwire "test/**/*.test.ts"                      # node
npx tripwire --target browser "test/**/*.test.ts"     # headless Chrome
npx tripwire --target worker  "test/**/*.test.ts"     # a real Worker inside Chrome
```

This page says what that buys you, what it costs, and when another tool is the better choice.
[Tripwire in action](tour.md) shows it on tripwire's own suite, with screenshots of each target,
coverage and the interactive browser page.

## What is automatic

The point of the runner is that the steps a browser-and-worker test setup usually needs are not
steps at all:

| You would normally | With tripwire |
|---|---|
| Choose and configure a TypeScript loader (`ts-node`, `ts-jest`, `karma-typescript`) | Nothing. The runner reads your `tsconfig.json` and compiles test files and whatever they import, on every target. `--type-check` adds a real type-check over the same program; `--transpile-only` is the default. |
| Bundle browser tests (webpack, rollup, karma plugins) | Nothing. The runner builds the module graph itself and serves it to the browser from its own loopback server. |
| Write a worker adapter that posts results back to the page | Nothing. `--target worker` runs the same files inside a real `Worker` and reports back over the runner's own channel. |
| Install a browser launcher and manage `CHROME_BIN` | Nothing beyond `puppeteer` (or `puppeteer-core`) in your project. `--browser-launch open` uses your own browser; `manual` prints a URL for any browser or device. |
| Keep separate configs and globs for node, browser and worker | One glob, one config file (`.tripwirerc`), three targets. |
| Wire up coverage instrumentation for browser tests (`karma-coverage`, `karma-typescript` reports, a bundler plugin) | `--coverage`. On the browser and worker targets the runner instruments the module graph itself, loads the sources no test imported (`--coverage-src`, default `src/**/*.ts`) so they are reported rather than silently absent, writes `coverage/<target>/coverage-final.json` and runs the `nyc` report for each `--coverage-reporter`. On the node target collection is the standard `nyc tripwire ...` wrapper; `tripwire coverage-report` then re-prints nyc's report with tripwire's handling of files TypeScript erased entirely. |
| Declare `describe`/`it` globals yourself | The runner installs them before any test file loads. For TypeScript they are opt-in through `@nevware21/tripwire-globals`, so installing tripwire cannot clash with `@types/mocha`, `@types/jest` or `@types/jasmine`. |

Everything in the right-hand column is covered flag by flag in the
[runner reference](test-runner.md).

## What is fast, without asking

- **Repeat runs skip compiling.** The node target keeps compiled output under
  `node_modules/.cache/tripwire`, keyed by the identity of the whole program; a repeat run over an
  unchanged tree compiles and type-checks nothing, and every run prints what the cache did
  (`Compile cache: reused -- nothing changed, type-check skipped`). See
  [compile caching](test-runner.md#compile-caching).
- **Type-checking is nearly free.** `--type-check` is a checker walk over the `ts.Program` the run
  has to build anyway -- not a second compile and not a `tsc` process -- so it lands within noise
  of a transpile-only run.
- **Only what runs is compiled.** Files are emitted lazily as they are required, so a run over a
  subset of a large test project does not pay for the rest.
- **The browser warms up while the graph builds.** Chrome's slow first navigation overlaps the
  compile instead of following it.

Numbers, how they were measured, and how to reproduce them are on the
[performance page](performance.md).

## Compared with the usual stacks

Columns describe tripwire's design; check the other tools' own documentation for their current
feature set.

| | tripwire | Mocha + ts-node | Karma (+ karma-typescript) | Jest / Vitest |
|---|---|---|---|---|
| Node target | yes | yes | no | yes |
| Browser target | yes, real Chrome | no | yes, real browsers via launcher plugins | Jest: jsdom simulation by default |
| Web Worker target | yes, same files | no | adapter you write | no |
| TypeScript | built in, reads your tsconfig | separate register hook | bundler plugin with its own compiler options | transform plugin |
| Type-check in the run | `--type-check`, same program | depends on hook settings | plugin | plugin |
| Assertions | built in (`assert` + `expect`), Chai-style chains, Chai shim available | bring your own | bring your own | built in |
| Mocking / spies / snapshots | **none** | bring your own | bring your own | built in |
| Parallel test processes | **no** | yes | one per browser | yes |
| Reporters | 14 built in, plus custom modules | plugins | plugins | built in |
| Coverage | `--coverage` built in for browser and worker, including never-imported sources; `nyc` wrapper on node | `nyc` wrapper | `karma-coverage` plugin | built in |
| Config | one `.tripwirerc`; every setting has a field (`--fgrep` folds into `grep`) | `.mocharc` | `karma.conf.js` | `jest.config` / `vitest.config` |
| Browser engine choice | Chrome via puppeteer; any browser or device through `--browser-launch manual` | n/a | launchers | n/a |

## When not to use it

Be honest with yourself about these before migrating; each is a deliberate omission, not a gap
waiting to be filled:

- **You rely on mocking, spies or module mocking** (`jest.fn`, `jest.mock`, `vi.mock`, Sinon as a
  framework feature). Tripwire has no mocking API. Sinon or a hand-written stub still works, but
  nothing in the runner knows about it.
- **You use snapshot testing.** There is no `toMatchSnapshot`.
- **You need parallel test processes.** Runs are single-process; the suite's own speed and the
  compile cache are what the runner optimises.
- **You must run Firefox, Safari or a device farm headlessly.** The launcher drives Chrome. Other
  browsers run through `--browser-launch manual` (open the printed URL anywhere), not unattended.
- **You need a plugin ecosystem.** Reporters are the extension point (a module path or package),
  plus `--ux-provider` for the browser page. There is no preprocessor or framework plugin API.

The assertion library itself is independent of all of this: it targets ES5, has three small
dependencies, and can be used under any runner.

## Where to go next

- See it run: [Tripwire in action](tour.md) -- tripwire's own suite on all three targets, coverage
  and the interactive page, with screenshots.
- Coming from somewhere else: [Mocha](migration/migrating-from-mocha.md),
  [Karma](migration/migrating-from-karma.md), [Jest or Vitest](migration/migrating-from-jest.md),
  [Chai](migration/migrating-from-chai.md), [node's `assert`](migration/migrating-from-node-assert.md).
  The Mocha, Karma and Jest guides end with a machine-readable JSON block for automated migrations.
- Using the runner: [Test Runner, CLI & Configuration](test-runner.md), [Reporters](reporters.md),
  [Troubleshooting](runner-troubleshooting.md).
- Writing tests: the [Test Suite API](https://github.com/nevware21/tripwire/blob/main/core/src/suite/README.md),
  the [core API reference](typedoc/core/index.html), and the
  [expression adapter](expression-adapter.md) for custom assertions.
- For AI agents: [AGENTS.md](https://github.com/nevware21/tripwire/blob/main/AGENTS.md) and
  [llms.txt](llms.txt).
