# Migrating from Karma to the Tripwire Test Runner

Karma is deprecated -- the Angular team [retired it in 2023](https://github.com/karma-runner/karma)
-- and most projects still on it are running a browser launcher, a test framework, a TypeScript
preprocessor, a bundler and a coverage plugin that all have to agree with each other. Tripwire
replaces the whole stack with one CLI and no plugins.

If your suite is Karma **plus Mocha**, read this guide for the browser half and
[Migrating from Mocha](migrating-from-mocha.md) for the test-file and assertion half. If your
assertions are Chai, add [Migrating from Chai](migrating-from-chai.md). Nothing in your test files
has to change to move off Karma itself.

## 1. Overview

| | Karma | Tripwire |
|---|---|---|
| Browser launch | `karma-chrome-launcher` + `CHROME_BIN` | built in, via puppeteer |
| Test framework | `karma-mocha` / `karma-jasmine` / `karma-qunit` | built in |
| TypeScript | `karma-typescript` or `karma-webpack` | built in |
| Bundling | `karma-typescript`'s bundler, webpack, browserify | built in |
| Coverage | `karma-coverage` / `karma-typescript` reports | `--coverage` |
| Reporters | `karma-spec-reporter` and friends | 14 built in |
| Worker tests | adapter files you write yourself | `--target worker` |
| Config | `karma.conf.js` returning `config.set({...})` | `.tripwirerc` or CLI flags |
| Watch | `autoWatch` | `--watch` |

The practical difference is that Karma is a plugin host: the browser, the framework, the compiler
and the reporter are separate packages you assemble. Tripwire ships them as one runner, so most of a
`karma.conf.js` has no counterpart -- not because the feature is missing, but because there is no
plugin to configure.

## 2. Install and switch the command

```bash
npm uninstall karma karma-chrome-launcher karma-mocha karma-typescript \
  karma-spec-reporter karma-coverage
npm install --save-dev @nevware21/tripwire
```

Keep `puppeteer` if you had it; tripwire uses it to launch the browser. Keep `mocha`/`chai` only if
something else still needs them -- the runner does not.

```diff
 "scripts": {
-  "test": "karma start karma.conf.js --single-run",
-  "test:watch": "karma start karma.conf.js"
+  "test": "tripwire --target browser -p tsconfig.json \"test/**/*.test.ts\"",
+  "test:watch": "tripwire --target browser --watch -p tsconfig.json \"test/**/*.test.ts\""
 }
```

Then delete `karma.conf.js`.

## 3. `karma.conf.js` field mapping

Working from a real Karma config -- the one this repository itself used before the runner existed,
still kept in `internal/benchmark/karma/` for the benchmark:

| `karma.conf.js` | Tripwire |
|---|---|
| `frameworks: ["mocha"]` | nothing -- `describe`/`it` are built in |
| `frameworks: ["karma-typescript"]` | nothing -- TypeScript is compiled by the runner |
| `files: [{ pattern: "test/**/*.ts" }]` | the file glob argument, eg. `"test/**/*.test.ts"` |
| `files` entries with `included: false, served: true` | `--server-root <dir>`, which serves a directory as-is |
| `exclude` | `--ignore <glob>` |
| `preprocessors` | nothing -- there is no preprocessor stage |
| `karmaTypescriptConfig.tsconfig` | `--project` / `-p` (alias `--ts-project`) |
| `karmaTypescriptConfig.compilerOptions` | `tsconfig` as an **object** in `.tripwirerc`, layered over the project |
| `karmaTypescriptConfig.bundlerOptions` | nothing -- bundling is built in; `--no-bundle` serves one request per module instead |
| `karmaTypescriptConfig.coverageOptions.instrumentation` | `--coverage` |
| `karmaTypescriptConfig.coverageOptions.exclude` | `--coverage-src <glob>` to say where sources are; `--ignore` for files |
| `karmaTypescriptConfig.reports` | `--coverage-reporter <name>` |
| `browsers: ["ChromeHeadless"]` | the default -- `--target browser` launches headless via puppeteer |
| `customLaunchers` with Chrome `flags` | built in; the runner already passes `--disable-web-security`, `--disable-site-isolation-trials`, `--no-sandbox` and proxy bypasses |
| `CHROME_BIN` / resolving puppeteer's Chrome | automatic |
| `browsers: []` + manual capture | `--browser-launch open` (opens your browser) or `manual` (prints a URL) |
| `reporters: ["spec"]` | `--reporter spec` (the default) |
| `reporters: ["progress", "dots"]` | `--reporter progress` / `--reporter dot` |
| `autoWatch: true`, `singleRun: false` | `--watch` |
| `singleRun: true` | the default |
| `listenAddress`, `hostname` | `--bind-address <address>` |
| `port` | nothing -- the server listens on a free port chosen at startup and prints the URL |
| `basePath` | run the CLI from that directory, or make the glob relative to it |
| `logLevel` | `--verbose` (HTTP request log only -- it prints each request the embedded server answers; there is no general log level) |
| `captureTimeout`, `browserNoActivityTimeout` | no equivalent needed -- there is no separate browser to capture |
| `plugins: [...]` | nothing -- there are no plugins |
| `client.mocha` options | `--timeout`, `--slow`, `--retries`, `--grep`, `--bail` |
| `proxies` | `--server-root` for static files |

## 4. Targets: browser and worker

Karma has one browser context. Tripwire has two targets, and the worker one needs no adapter files:

```bash
tripwire --target browser -p tsconfig.json "test/**/*.test.ts"
tripwire --target worker  -p tsconfig.json "test/**/*.test.ts"
```

If you tested Web Workers under Karma you almost certainly hand-wrote an adapter that posted results
back to the page, and served the worker entry with `included: false, served: true`. Delete both:
`--target worker` runs the same test files inside a real `Worker`, and reports back over the
runner's own channel.

### Browser launch modes

| Mode | Flag | What it does |
|---|---|---|
| Headless (default) | `--target browser` | launches Chrome via puppeteer, runs, exits |
| Visible browser | `--browser-launch open` | opens your default browser at the runner page |
| Manual | `--browser-launch manual` | prints a URL; open it in any browser, including a phone |

Manual mode is the replacement for Karma's "capture a browser by visiting a URL" model, including
cross-device testing. Both interactive modes serve a UI where you can filter and re-run tests
without restarting the process -- see [the interactive page](../test-runner.md#the-interactive-page)
for every control. In Karma terms: the **Scope** box and each result's **run again** control replace
`fit`/`fdescribe` edits (nothing in the test files changes); **Auto-reload** replaces `autoWatch`
re-runs; the **Target** picker replaces a second Karma config for workers; **Finish & Stop Server**
is how an interactive session ends with an exit code, where Karma's `singleRun: false` never ends.

## 5. Coverage

```diff
- karmaTypescriptConfig: {
-   coverageOptions: { instrumentation: true, exclude: [/\.test\.ts$/] },
-   reports: { json: { directory: "coverage" }, text: "" }
- }
+ tripwire --target browser --coverage --coverage-reporter text,json "test/**/*.test.ts"
```

Coverage is collected on puppeteer launches. Use `--coverage-src` to point at your sources so files
that no test imported still appear in the report at zero, which is what `karma-typescript`'s
whole-program instrumentation gave you by default.

## 6. What has no equivalent

- **Other browsers.** Tripwire launches Chrome via puppeteer. For Firefox, Safari or a real device,
  use `--browser-launch manual` and open the printed URL there; the run reports back the same way.
  There is no Sauce Labs or BrowserStack launcher.
- **Plugins.** There is no plugin API. Reporters are the extension point (`--reporter <module>`,
  node target), along with `--ux-provider` for the browser UI.
- **Jasmine and QUnit frameworks.** Test files use `describe`/`it` (Mocha or TDD style). Jasmine's
  `describe`/`it`/`beforeEach` are already compatible; its matchers (`expect().toBe()`) are not --
  see [Migrating from Mocha §11](migrating-from-mocha.md#11-coming-from-jasmine-or-jest-instead).
- **`karma-webpack` / `karma-rollup`.** The runner builds its own module graph from your entry
  files. A suite that depended on webpack loaders (importing CSS, images, or aliases resolved by
  webpack) has no direct replacement.
- **`config.set()` logic.** `.tripwirerc.js` can compute config in JavaScript, but there is no
  `config` object with Karma's constants.

## 7. Behaviour differences worth knowing

- **No browser capture step.** Karma starts a server, launches a browser, waits for it to connect,
  then runs. Tripwire launches, navigates and runs, so `captureTimeout` has nothing to time out.
- **Type errors do not fail the run by default.** `karma-typescript` reported them; tripwire
  transpiles only unless you pass `--type-check`. Add it to keep the old behaviour.
- **The same files run on every target.** One glob, three targets. Under Karma the browser and
  worker suites usually had separate configs and separate globs.
- **The browser and worker targets compile on every run.** The compile cache under
  `node_modules/.cache/tripwire` applies to `--target node` only; a browser or worker run builds its
  module graph afresh each time, as Karma did. See [compile caching](../test-runner.md#compile-caching).

## 8. Migration checklist

1. Uninstall Karma and its plugins; install `@nevware21/tripwire`.
2. Replace the `karma start` scripts with `tripwire --target browser` (and `--target worker` if you
   tested workers).
3. Move `karmaTypescriptConfig.tsconfig` to `--project`.
4. Move `files` patterns to the CLI glob, and `exclude` to `--ignore`.
5. Delete any hand-written worker adapter and its `served: true` entry.
6. Add `--coverage` if you had instrumentation on, plus `--coverage-src` for your source glob.
7. Add `--type-check` if you relied on `karma-typescript` failing the build on type errors.
8. Delete `karma.conf.js` and any `tsconfig` written only for it.
9. Run once with `--show-files` to confirm the glob matches what Karma's `files` did.

## 9. Machine-readable summary

For automated migrations. Every entry is derived from the tables above.

```json
{
  "package": "@nevware21/tripwire",
  "cliCommand": "tripwire",
  "replacesCommands": ["karma start", "karma run"],
  "removeDependencies": ["karma", "karma-chrome-launcher", "karma-firefox-launcher", "karma-mocha", "karma-jasmine", "karma-qunit", "karma-typescript", "karma-webpack", "karma-coverage", "karma-spec-reporter", "karma-sourcemap-loader"],
  "keepDependencies": ["puppeteer"],
  "configFile": { "from": ["karma.conf.js", "karma.conf.ts"], "to": [".tripwirerc", ".tripwirerc.json", ".tripwirerc.js", ".tripwirerc.cjs", "tripwire.config.json", "tripwire.config.js", "tripwire.config.cjs"] },
  "targets": { "browser": "--target browser", "worker": "--target worker", "node": "--target node (default)" },
  "workerAdapterFilesNoLongerNeeded": true,
  "configMapping": {
    "frameworks": null,
    "plugins": null,
    "preprocessors": null,
    "files": "the CLI file glob argument",
    "exclude": "--ignore",
    "basePath": "the directory the CLI is run from",
    "browsers": "--target browser (headless by default)",
    "customLaunchers": null,
    "autoWatch": "--watch",
    "singleRun": "the default",
    "reporters": "--reporter",
    "port": null,
    "listenAddress": "--bind-address",
    "hostname": "--bind-address",
    "logLevel": "--verbose (HTTP request log only; there is no general log level)",
    "captureTimeout": null,
    "browserNoActivityTimeout": null,
    "proxies": "--server-root",
    "karmaTypescriptConfig.tsconfig": "--project",
    "karmaTypescriptConfig.compilerOptions": "the tsconfig object field in .tripwirerc",
    "karmaTypescriptConfig.bundlerOptions": null,
    "karmaTypescriptConfig.coverageOptions.instrumentation": "--coverage",
    "karmaTypescriptConfig.coverageOptions.exclude": "--coverage-src and --ignore",
    "karmaTypescriptConfig.reports": "--coverage-reporter"
  },
  "browserLaunchModes": { "puppeteer": "default, headless", "open": "--browser-launch open", "manual": "--browser-launch manual, prints a URL for any browser or device" },
  "typeCheck": { "default": false, "flag": "--type-check", "note": "karma-typescript reported type errors; tripwire transpiles only unless asked" },
  "unsupported": ["non-Chrome launchers", "Sauce Labs and BrowserStack launchers", "the plugin API", "karma-webpack and karma-rollup loaders", "Jasmine and QUnit matchers"],
  "relatedGuides": {
    "testFilesAndFlags": "docs/migration/migrating-from-mocha.md",
    "assertions": "docs/migration/migrating-from-chai.md",
    "runnerReference": "docs/test-runner.md"
  }
}
```
