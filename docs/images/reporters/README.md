# Reporter output images

Generated terminal-output samples used by [`docs/reporters.md`](../../reporters.md). **Do not edit
these by hand** — regenerate them:

```bash
npm run docs-reporter-images        # or: node docs/scripts/genReporterImages.js
```

Each file is real output, not a screenshot or a mock-up: the generator runs the built CLI
(`core/bin/tripwire.js`) once per reporter against a fixed four-test fixture with `FORCE_COLOR=1`,
captures the ANSI it prints, and translates that to SVG. A sample therefore cannot drift from what
the reporter actually does — **re-run the generator after changing any reporter**, and commit the
result alongside the code change.

The build must be current first (`cd runner && npm run build`), since the generator drives the
built CLI rather than the sources.

Note that regenerating always produces a small diff even when nothing changed: the durations
(`4ms`, `(11ms)`) are whatever that run actually took. They are deliberately left real rather than
normalised to fixed values — these images are the literal output, and inventing stable numbers
would quietly make them mock-ups. Regenerate when a reporter changes, not routinely.

| File | Reporter | Notes |
|---|---|---|
| `spec.svg` | `spec` | The default indented tree |
| `list.svg` | `list` | Flat, fully-titled lines |
| `min.svg` | `min` | Summary and failures only |
| `dot.svg` | `dot` | One character per test |
| `progress.svg` | `progress` | Piped (non-TTY) fallback form |
| `landing.svg` | `landing` | Piped (non-TTY) fallback form |
| `nyan.svg` | `nyan` | Piped (non-TTY) fallback form |
| `cargo.svg` | `cargo` | Run with a failure, showing the rustc-style diagnostic |
| `cargo-clean.svg` | `cargo` | All-passing run — the only way to show the `Finished` verb, so it uses its own fixture |
| `cargo-progress.svg` | `cargo` | The in-place progress bar, captured through a faked TTY (see `_ttyShim.js`) — the four frames are successive redraws of one line, not four lines |

## Why images

Neither a Markdown code block nor inline HTML can carry colour: GitHub and npm both strip `style`
attributes when they sanitize rendered Markdown, so `<span style="color:...">` degrades to plain
text everywhere except a self-hosted Jekyll site. An SVG is the only form that shows the real
colours in every place these docs are read.

Colours use GitHub's dark-theme ANSI palette, chosen to stay legible against the dark card the
images draw. `docs/reporters.md` also carries a written **Colours** line beside each sample, which
is what screen readers and alt-text readers get.
