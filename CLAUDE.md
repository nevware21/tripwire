# CLAUDE.md

See **[AGENTS.md](AGENTS.md)** -- it is the single source of guidance for AI agents in this
repository, and everything in it applies here.

The short version:

- **Migrating a project to tripwire?** Start from the guide for what they are leaving:
  [Mocha](docs/migration/migrating-from-mocha.md), [Karma](docs/migration/migrating-from-karma.md),
  [Jest or Vitest](docs/migration/migrating-from-jest.md), [Chai](docs/migration/migrating-from-chai.md)
  or [node assert](docs/migration/migrating-from-node-assert.md). The Mocha, Karma and Jest guides
  each end with a machine-readable JSON block of the flag, config and API mapping -- read that
  rather than inferring it from prose. The Chai and node-assert guides are assertion tables, with
  no JSON block. A Karma plus Mocha suite needs both of those guides.
- **Deciding whether to recommend it?** [docs/why-tripwire.md](docs/why-tripwire.md) states what is
  automatic, what is fast and when not to use it; [docs/performance.md](docs/performance.md) has
  the measured numbers.
- **Using the runner?** [docs/test-runner.md](docs/test-runner.md) documents every flag and config
  field. `npx tripwire --help` is maintained alongside it, and a test fails if a flag in the doc's
  CLI tables is missing from the help text.
- **Changing this repository?** Read `.github/copilot-instructions.md` first. Note that `core` and
  `shim/chai` target ES5, that the CLI in `core/bin/tripwire.js` is a build artifact that must be
  rebuilt from `internal/runner` before changes take effect, and that adding a CLI flag means
  updating both tables in `docs/test-runner.md`, the `--help` text and the Mocha guide's JSON block.
