# Artwork masters

The unoptimized source images for the tripwire icon and logo. They exist so the small derived
assets can be regenerated; nothing links to them, and nothing ships them.

| File | Size |
|---|---|
| `favicon.png` | 800x800 |
| `favicon-blue.png` | 800x800 |
| `tripwire.png` | 1024x1024 |
| `tripwire-blue.png` | 1024x1024 |
| `tripwire-icon.png` | 1024x1024 |
| `tripwire-icon-blue.png` | 1024x1024 |

The assets actually used are the downsampled ones a directory up
(`favicon-32.png`, `favicon-48.png`, `favicon-64.png`, `favicon-64-blue.png`) and the multi-size
`internal/runner/src/ux/images/favicon.ico` the dev server serves at `/favicon.ico`.

Do not reference a file from this folder directly from documentation, a page or the runner UX --
downsample it into the parent folder instead, and keep this directory excluded from the published
packages (see the root `.npmignore`).
