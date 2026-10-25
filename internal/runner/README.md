# @nevware21/tripwire-runner

The **`tripwire` CLI test runner** — the thing that finds your test files, compiles them, runs them
against `node`, `browser` or `worker`, reports the results and collects coverage.

This package is **not published to npm**, but its output is. The build bundles it into
[`core/bin/`](../../core/bin) via
[`core/scripts/copyRunnerBin.js`](../../core/scripts/copyRunnerBin.js), and those bundles ship
*inside* `@nevware21/tripwire`. That is what makes this work with no second install:

```bash
npx tripwire --target browser --reporter spec,xunit "test/**/*.test.ts"
```

So "internal" and "unpublished" describe the package, not the code — every line here reaches
consumers through the core package.

## Documentation

The user-facing guides live on the documentation site,
[https://nevware21.github.io/tripwire](https://nevware21.github.io/tripwire). They are the reference
for anything about *using* the runner; this README is about the package that implements it.

- **[Test Runner, CLI & Configuration Guide](https://github.com/nevware21/tripwire/blob/main/docs/test-runner.md)**
  — the primary reference. Every CLI flag and every `.tripwirerc` config field, in two tables;
  running against the `node`/`browser`/`worker` targets; file discovery and glob handling;
  TypeScript project selection and type-checking; coverage; and
  [hook failures](https://github.com/nevware21/tripwire/blob/main/docs/test-runner.md#hook-failures)
  (`--fail-on-hook`) — a `before`/`after` failure belongs to no test, so without that flag it never
  reaches the pass/fail counts.

- **[Test Reporters](https://github.com/nevware21/tripwire/blob/main/docs/reporters.md)** — all fourteen built-in
  reporters (`spec`, `list`, `min`, `dot`, `progress`, `landing`, `nyan`, `tap`, `xunit`, `json`,
  `json-stream`, `doc`, `markdown`, `cargo`) with generated sample output for each, how to select
  and combine them (`--reporter spec,xunit`), the per-reporter options, and how to write and load a
  **custom** reporter module. Implemented in [`src/reporters/`](./src/reporters).

- **[Migrating from Mocha](https://github.com/nevware21/tripwire/blob/main/docs/migration/migrating-from-mocha.md)**
  — moving a Mocha or `ts-mocha` suite across: flag-by-flag and config-by-config mapping, what has
  no equivalent and why, a step-by-step checklist, and a machine-readable summary block that
  automated migrations can read. That block is not decoration — it is asserted against the actual
  parser by [`test/src/docs/docDrift.test.ts`](https://github.com/nevware21/tripwire/blob/main/internal/runner/test/src/docs/docDrift.test.ts), so a documented
  flag list cannot quietly fall behind the code.

- **[Migrating from Karma](https://github.com/nevware21/tripwire/blob/main/docs/migration/migrating-from-karma.md)**
  — replacing the whole Karma plugin stack (launcher, framework, `karma-typescript`, bundler,
  coverage) with this runner: `karma.conf.js` field mapping, the browser and worker targets, the
  launch modes that replace browser capture, and its own machine-readable summary. A Karma **plus**
  Mocha suite needs that guide for the browser half and the Mocha one above for the test files.

- **[Runner Troubleshooting](https://github.com/nevware21/tripwire/blob/main/docs/runner-troubleshooting.md)** —
  known issues and their fixes, most importantly
  [opting in to the global `describe`/`it` names](https://github.com/nevware21/tripwire/blob/main/docs/runner-troubleshooting.md#cannot-find-name-describe)
  and the
  [duplicate-global TypeScript errors](https://github.com/nevware21/tripwire/blob/main/docs/runner-troubleshooting.md#typescript-duplicate-global-declarations)
  you get from opting in while `@types/mocha`, `@types/jest` or `@types/jasmine` are still in the
  program.

- **[Test Execution Flow](https://github.com/nevware21/tripwire/blob/main/docs/test-execution-flow.md)** — what
  the runner is actually driving: how suites, tests and hooks execute, when promises are created,
  timeout and
  [hook failure handling](https://github.com/nevware21/tripwire/blob/main/docs/test-execution-flow.md#hook-failure-handling),
  and the runner metrics.

- **[Test Suite API](https://nevware21.github.io/tripwire/typedoc/core/index.html)** — the
  `describe`/`it`/hook API the runner executes. It lives in `core`, not here.

`tripwire --help` prints the same flag list the first guide documents.

## Layout

| Directory | What is in it |
|---|---|
| [`src/cli/`](./src/cli) | Argument parsing, error reporting, and stack mapping back to TypeScript sources |
| [`src/config/`](./src/config) | `.tripwirerc` discovery and merge, and its precedence against CLI flags |
| [`src/compile/`](./src/compile) | The TypeScript compile provider and the module graph the targets are built from |
| [`src/execute/`](./src/execute) | Orchestration — the three targets, watch mode, the session cache, and coverage wiring |
| [`src/reporters/`](./src/reporters) | The fourteen built-in reporters and the factory that resolves a name or a custom module |
| [`src/server/`](./src/server) | The loopback dev server that compiles, bundles and serves each target, plus its request handlers |
| [`src/ux/browser/`](./src/ux/browser) | The interactive page: live results tree, log panel, Scope picker, Target switch and actions menu |
| [`src/client/`](./src/client) | Code that runs *inside* the worker or the served page — the worker runner and the runner host |
| [`src/codecov/`](./src/codecov) | Instrumentation, the nyc report, and the erased-file modes |
| [`src/shared/`](./src/shared) | Dependency-light modules every target loads — filters, suite naming, discovery, the module loader |
| [`src/internal/`](./src/internal) | Small helpers with no outward contract |

`src/shared/` has a rule worth knowing before adding to it: **no node builtins, nothing from
`src/ux/`, and no barrel file**. It is the only directory the minimal worker bundle can pull from,
so anything in it must load in node, a browser page and a `Worker` alike.

## Building and testing

Driven by [Rush](https://rushjs.io) from the repository root:

```bash
rush build       # builds every project in dependency order
rush test        # runs every project's tests
```

`build` here is five steps: lint → `tsc` → `rollup` (three bundles: the CLI, the browser client, the
worker) → `api-extractor` → copy into `core/bin`.

Two ordering facts that will bite otherwise:

- **This package's tests are run by the CLI it builds.** `test:node` invokes
  `../../core/bin/tripwire.js` — the runner tests itself. That works because `rush build` orders
  `core` before `runner`, but it means a fresh clone has to build before this suite can run at all.
- **A change to `src/` needs a build before it is being tested.** The suite asserts against the
  *built* bundle in `core/bin` (see [`test/src/artifacts/binGuard.test.ts`](./test/src/artifacts/binGuard.test.ts)),
  so `npm test` alone will cheerfully test the previous build. Run `rush build` first.

Two guards in the suite exist because the thing they check shipped broken once and nothing noticed:

- **`binGuard.test.ts`** — that the CLI bundle starts with a `#!/usr/bin/env node` shebang (without
  it the POSIX `bin` symlink is run by the shell and dies on a syntax error), that the three shipped
  bundles require only node builtins (a bundle that
  eagerly required a private dependency once killed `npx tripwire` on a clean install), and that
  their source maps resolve to real `src/**.ts` files that exist on disk.
- **`docDrift.test.ts`** — that the reporter and flag lists in the documentation match what the code
  actually accepts, in both directions, so a removed flag fails the suite rather than the reader.

## Related

- [`internal/README.md`](https://github.com/nevware21/tripwire/blob/main/internal/README.md) — what the `internal/` folder is, and the other projects in it
- [`internal/benchmark/`](https://github.com/nevware21/tripwire/blob/main/internal/benchmark/README.md) — measures this runner against mocha and karma
- [`CONTRIBUTING.md`](../../CONTRIBUTING.md) — repository-wide setup
