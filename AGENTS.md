# AGENTS.md

Guidance for AI agents working on, or with, `@nevware21/tripwire`. Humans want
[docs/README.md](docs/README.md) instead.

Tripwire is a TypeScript assertion library **and** a test runner CLI that runs the same suite on
node, in a browser and in a worker, without Karma, ts-node, webpack or any plugins.

## Migrating a project to tripwire

This is the most common thing an agent is asked to do here. The Mocha and Karma guides each end
with a **machine-readable JSON block** stating flags, config fields, renames and what has no
equivalent -- read that block rather than inferring the mapping from prose. Those two blocks are
checked against the code by tests, so they do not drift. The Chai and node-assert guides are
assertion-mapping tables with no JSON block.

| The user is coming from | Guide | What it covers |
|---|---|---|
| Mocha, ts-mocha | [migrating-from-mocha.md](docs/migration/migrating-from-mocha.md) | CLI flags, `.mocharc` to `.tripwirerc`, globals, what has no equivalent. §10 is the JSON block |
| Karma (any framework) | [migrating-from-karma.md](docs/migration/migrating-from-karma.md) | `karma.conf.js` field mapping, browser and worker targets, coverage, launch modes. §9 is the JSON block |
| Jest, Vitest | [migrating-from-jest.md](docs/migration/migrating-from-jest.md) | matcher mapping (`toBe` to `to.equal` ...), config mapping, what has no equivalent (mocking, snapshots). Ends with a JSON block |
| Chai | [migrating-from-chai.md](docs/migration/migrating-from-chai.md) | assertion mapping, and the `@nevware21/tripwire-chai` shim as a staged option |
| Node's `assert` | [migrating-from-node-assert.md](docs/migration/migrating-from-node-assert.md) | assertion mapping, including the `deepStrictEqual` difference |

A Karma **plus** Mocha suite needs both the Karma guide (the browser half) and the Mocha guide (the
test files and flags). Karma migrations rarely require changing test files at all.

Two things that catch agents out:

- **Globals are opt-in.** Importing `@nevware21/tripwire` declares no `describe`/`it` types, so it
  never clashes with `@types/mocha` or `@types/jest`. Either import the names, or opt in as
  described in [runner-troubleshooting.md](docs/runner-troubleshooting.md#cannot-find-name-describe).
- **`deepStrictEqual` differs from node's.** It requires the same instances; `deepEqual` is the
  structural comparison. See the node assert guide.

## Reference for using the runner

- [docs/test-runner.md](docs/test-runner.md) -- every CLI flag and every `.tripwirerc` field, in two
  tables, plus file discovery, targets, coverage and compile caching.
- [docs/reporters.md](docs/reporters.md) -- all 14 reporters with sample output.
- [docs/test-execution-flow.md](docs/test-execution-flow.md) -- execution order, hook failures, and
  the opt-in runner metrics.
- [docs/runner-troubleshooting.md](docs/runner-troubleshooting.md) -- known issues and their fixes.
- `npx tripwire --help` -- maintained alongside the flag tables; a test fails if a flag in the
  doc's CLI tables is missing from the help text.
- [docs/why-tripwire.md](docs/why-tripwire.md) -- what is automatic across the three targets,
  what is fast, comparison with Mocha, Karma, Jest and Vitest, and when not to recommend it.
- [docs/performance.md](docs/performance.md) -- mechanisms and measured benchmark results.
- [docs/llms.txt](docs/llms.txt) -- the same map as this file, in the `llms.txt` convention,
  with published URLs.

## Working on this repository

`.github/copilot-instructions.md` is the full contributor guide: repository layout, build and test
commands, code style, review requirements and release process. **Read it before changing code**, not
just this file. The points most often missed:

- **A CLI flag change touches four places**, and the docs tests fail if it does not: both tables in
  `docs/test-runner.md`, the `--help` text in `internal/runner/src/tripwire.ts`, and the JSON block
  in `docs/migration/migrating-from-mocha.md` §10.
- **`core` and `shim/chai` target ES5.** No optional chaining, no nullish coalescing, no
  `Symbol.x` without `getKnownSymbol`, no `Map`/`Set` without a guard. `internal/runner` targets
  ES2018 and is node-only, so it has none of those limits.
- **The CLI is a built artifact.** `core/bin/tripwire.js` is bundled from `internal/runner`; source
  changes have no effect until `npm run build` in `internal/runner`. Measuring or testing against a
  stale bundle is the most common way to reach a wrong conclusion here.
- **Performance claims need interleaved measurements.** Machine load drifts enough to reverse an
  A/B comparison run as two blocks. Alternate the arms. Measure with `npm run bench -- --record` in
  `internal/benchmark`, against puppeteer's bundled Chrome (no `PUPPETEER_EXECUTABLE_PATH`), and
  commit the record it writes under `docs/performance/results/`; the history page charts it and
  the performance page cites it.

## Repository layout

| Path | Package | What it is |
|---|---|---|
| `core/` | `@nevware21/tripwire` | assertions, the suite API, and the published `tripwire` CLI binary |
| `internal/runner/` | `@nevware21/tripwire-runner` | the runner's source; bundled into `core/bin` |
| `shim/chai/` | `@nevware21/tripwire-chai` | Chai-compatible `assert.*` for staged migrations |
| `globals/` | `@nevware21/tripwire-globals` | opt-in ambient `describe`/`it` declarations |
| `internal/benchmark/` | unpublished | measures the runner against mocha and karma; the only place Karma is still configured |
